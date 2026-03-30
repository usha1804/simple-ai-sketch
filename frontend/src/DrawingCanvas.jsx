
import {
  useRef, useState, useCallback, useEffect,
  forwardRef, useImperativeHandle,
} from 'react'

/*
  DrawingCanvas v5 — Production Quality
  ══════════════════════════════════════════════════════════════
  Combines v3 correctness + v4 watercolor quality, all bugs fixed.

  COLORING ALGORITHM:
  ─────────────────────────────────────────────────────────────
  Phase 1: Draw black strokes (animated)

  Phase 2: Region detection (chunked, non-blocking)
    • Build strokeMask: ANY channel < STROKE_THR → dilate by DILATE_R
    • Scan every pixel — BFS each white island into a region
    • BFS stops at: strokeMask OR colorDiff > COLOR_THR
    • COLOR_THR prevents body/face/background merging
    • Chunked 10ms slices → UI never freezes

  Phase 3: Watercolor fill (region by region)
    • Real BFS from region centroid → fills outward ring-by-ring
    • Per-pixel image color (not flat average) → natural gradients
    • Position-based paper grain (consistent, no Math.random jitter)
    • Wet-edge bleed effect near stroke boundaries
    • Strokes re-drawn on top after fill → crisp ink lines preserved
    • One-frame pause between regions = brush-lift feel

  BUGS FIXED vs v4 (document 8):
    • detectChunk used stale cW/cH state → now uses detectRef.current.cw/ch
    • seedRegion used q.indexOf() O(n) → now uses pixelSet.has() O(1)
    • front.shift() O(n) → now uses index pointer O(1)
    • Double pixelSet construction removed
    • REST mode image poll: retries 25× at 200ms = 5s max wait
  ══════════════════════════════════════════════════════════════
*/

const PENS = {
  pencil:   { lw: 1.8, alpha: 0.95 },
  charcoal: { lw: 3.2, alpha: 0.88 },
  ink:      { lw: 1.4, alpha: 1.00 },
  brush:    { lw: 4.5, alpha: 0.78 },
  marker:   { lw: 5.5, alpha: 0.70 },
  neon:     { lw: 2.0, alpha: 1.00 },
}
const SPEED_PTS    = [0,1,2,4,7,12,20,35,60,100]
const SPEED_LABELS = ['','Slowest','Slow','Normal','Medium','Fast','Faster','Quick','Rapid','Max']

// ── Fill constants ─────────────────────────────────────────────
const STROKE_THR  = 55    // min(R,G,B) < this → raw stroke pixel
const DILATE_R    = 2     // dilation to cover anti-alias grey fringe + close gaps
const COLOR_THR   = 45    // max color diff from seed; stops BFS at color boundaries
const MIN_REGION  = 60    // ignore regions < this size (noise)
const BG_THR      = 235   // image pixel is background if ALL channels > this
const BG_VAR_THR  = 18    // AND max channel variance < this
const PX_PER_FRAME= 1200  // pixels colored per rAF tick
const BUILD_MS    = 10    // max ms per chunk during detection (keeps UI live)
const IMG_POLL_MS = 200   // ms between image-ready polls
const IMG_POLL_MAX= 25    // max polls = 5 seconds

// Watercolor layers (applied cumulatively per pixel)
const WC_LAYERS = [
  { alpha: 0.28, noise: 6  },  // wash: light base coat
  { alpha: 0.42, noise: 10 },  // body: main color
  { alpha: 0.18, noise: 4  },  // detail: final deepen
]
const BLEED_ALPHA = 0.15  // soft color bleed past ink line

const DrawingCanvas = forwardRef(function DrawingCanvas({
  penStyle = 'pencil', onComplete,
  strokeOpacity = 0.92, strokeWidthMultiplier = 1.0,
  colorFillImage = null, fillAfterDone = false,
}, ref) {

  const canvasRef   = useRef(null)
  const ctxRef      = useRef(null)
  const imgDataRef  = useRef(null)
  const imgReadyRef = useRef(false)

  const allPathsRef = useRef([])
  const queueRef    = useRef([])
  const queuePosRef = useRef(0)
  const ptPosRef    = useRef(0)
  const rafRef      = useRef(null)
  const runningRef  = useRef(false)
  const speedRef    = useRef(5)
  const penStyleRef = useRef(penStyle)

  // Fill refs
  const fillRafRef     = useRef(null)
  const fillPollRef    = useRef(0)
  const detectRef      = useRef(null)   // detection phase state
  const paintRef       = useRef(null)   // paint phase state
  const strokeSnapRef  = useRef(null)   // snapshot of strokes before fill

  const [drawn,     setDrawn]    = useState(0)
  const [total,     setTotal]    = useState(0)
  const [speed,     setSpeed]    = useState(5)
  const [isPaused,  setIsPaused] = useState(false)
  const [isDone,    setIsDone]   = useState(false)
  const [isFilling, setIsFilling]= useState(false)
  const [fillDone,  setFillDone] = useState(false)
  const [fillPct,   setFillPct]  = useState(0)
  const [fillStage, setFillStage]= useState('')
  const [cW, setCW] = useState(800)
  const [cH, setCH] = useState(600)

  useEffect(() => { penStyleRef.current = penStyle }, [penStyle])

  const getCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current
    const c = canvasRef.current; if (!c) return null
    ctxRef.current = c.getContext('2d', { willReadFrequently: true })
    return ctxRef.current
  }, [])

  // ── Load reference image at exact canvas size ─────────────────
  const buildImgData = useCallback((dw, dh) => {
    if (!colorFillImage || !dw || !dh) {
      imgDataRef.current = null; imgReadyRef.current = false; return
    }
    imgReadyRef.current = false
    const img = new Image()
    const doLoad = () => {
      const off = document.createElement('canvas')
      off.width = dw; off.height = dh
      const c2  = off.getContext('2d', { willReadFrequently: true })
      c2.imageSmoothingEnabled = true
      c2.imageSmoothingQuality = 'high'
      c2.drawImage(img, 0, 0, dw, dh)
      imgDataRef.current  = c2.getImageData(0, 0, dw, dh)
      imgReadyRef.current = true
    }
    img.onload = doLoad
    if (typeof colorFillImage === 'string') {
      img.src = colorFillImage
    } else {
      const url = URL.createObjectURL(colorFillImage)
      img.onload = () => { doLoad(); URL.revokeObjectURL(url) }
      img.src = url
    }
  }, [colorFillImage])

  useEffect(() => { buildImgData(cW, cH) }, [colorFillImage, cW, cH, buildImgData])

  const fillBg = useCallback(() => {
    const c = canvasRef.current; if (!c) return
    const ctx = getCtx(); if (!ctx) return
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
  }, [getCtx])
  useEffect(() => { if (canvasRef.current) fillBg() }, [fillBg])

  // ── Build dilated stroke mask ────────────────────────────────
  const buildStrokeMask = (cdat, cw, ch) => {
    const raw  = new Uint8Array(cw * ch)
    const mask = new Uint8Array(cw * ch)
    for (let i = 0; i < cw * ch; i++) {
      const d = i * 4
      if (Math.min(cdat[d], cdat[d+1], cdat[d+2]) < STROKE_THR) raw[i] = 1
    }
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        if (!raw[y*cw+x]) continue
        const y0=Math.max(0,y-DILATE_R), y1=Math.min(ch-1,y+DILATE_R)
        const x0=Math.max(0,x-DILATE_R), x1=Math.min(cw-1,x+DILATE_R)
        for (let dy=y0; dy<=y1; dy++)
          for (let dx=x0; dx<=x1; dx++)
            mask[dy*cw+dx]=1
      }
    }
    return mask
  }

  // ── Color diff from fixed seed ───────────────────────────────
  const colorDiffSeed = (idat, n, seed) => {
    const d = n*4
    return Math.abs(idat[d]-seed.r) + Math.abs(idat[d+1]-seed.g) + Math.abs(idat[d+2]-seed.b)
  }

  // ── Position-based paper grain (stable, no random flicker) ──
  const grain = (pos, cw, amp) => {
    const x=pos%cw, y=Math.floor(pos/cw)
    const h = ((x*1664525 + y*1013904223) & 0xffffffff) >>> 0
    return ((h & 0xff) / 255 - 0.5) * amp * 2
  }

  // ── isBackground ─────────────────────────────────────────────
  const isBg = (idat, i) => {
    const d=i*4, r=idat[d], g=idat[d+1], b=idat[d+2]
    const avg=(r+g+b)/3
    return r>BG_THR && g>BG_THR && b>BG_THR
      && Math.abs(r-avg)+Math.abs(g-avg)+Math.abs(b-avg) < BG_VAR_THR*2
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 1: REGION DETECTION — chunked BFS across full canvas
  // BFS stops at strokeMask OR colorDiff > COLOR_THR from seed
  // Uses detectRef.current.cw/ch (NOT stale React state)
  // ══════════════════════════════════════════════════════════════
  const detectChunk = useCallback(() => {
    const st = detectRef.current; if (!st) return
    // ↓ Use values stored in ref — NOT cW/cH state (avoids stale closure)
    const { vis, strokeMask, cdat, idat, cw, ch } = st
    const t0 = performance.now()

    while (st.scanPos < cw * ch) {
      if (performance.now() - t0 > BUILD_MS) break

      const i = st.scanPos++
      if (vis[i] || strokeMask[i]) continue

      // Seed color — fixed at region birth
      const di0  = i*4
      const seed = { r:idat[di0], g:idat[di0+1], b:idat[di0+2] }

      // BFS collect island
      const q = [i]; vis[i] = 1
      let qi=0, sumR=0,sumG=0,sumB=0,colorN=0
      let bx0=cw,bx1=0,by0=ch,by1=0
      let hasColor = false

      while (qi < q.length) {
        const pos = q[qi++]
        const px=pos%cw, py=Math.floor(pos/cw)
        if(px<bx0)bx0=px; if(px>bx1)bx1=px
        if(py<by0)by0=py; if(py>by1)by1=py

        const di=pos*4
        const ir=idat[di],ig=idat[di+1],ib=idat[di+2]
        if (!(ir>BG_THR && ig>BG_THR && ib>BG_THR)) {
          sumR+=ir; sumG+=ig; sumB+=ib; colorN++; hasColor=true
        }

        const L=px>0?pos-1:-1, R=px<cw-1?pos+1:-1
        const U=py>0?pos-cw:-1, D=py<ch-1?pos+cw:-1
        for (const n of [L,R,U,D]) {
          if (n<0||vis[n]||strokeMask[n]) continue
          if (colorDiffSeed(idat, n, seed) > COLOR_THR) continue
          vis[n]=1; q.push(n)
        }
      }

      if (q.length < MIN_REGION || !hasColor) continue

      // Build pixelSet once per region (O(1) lookup in paint phase)
      const pixelSet = new Set(q)

      // Find centroid seed for paint BFS
      const cx=Math.round((bx0+bx1)/2), cy=Math.round((by0+by1)/2)
      let seedIdx = cy*cw+cx
      if (!pixelSet.has(seedIdx)) {
        // Spiral to find a pixel actually in region near centroid
        let found=false
        outer: for(let r=0;r<=20;r++){
          for(let dy=-r;dy<=r;dy++){
            for(let dx=-r;dx<=r;dx++){
              if(Math.abs(dx)!==r&&Math.abs(dy)!==r) continue
              const nx=cx+dx,ny=cy+dy
              if(nx<0||ny<0||nx>=cw||ny>=ch) continue
              const ni=ny*cw+nx
              if(pixelSet.has(ni)){seedIdx=ni;found=true;break outer}
            }
          }
        }
        if(!found) seedIdx=q[0]
      }

      st.regions.push({
        pixelSet, seedIdx,
        avgR: colorN>0 ? Math.round(sumR/colorN) : 200,
        avgG: colorN>0 ? Math.round(sumG/colorN) : 200,
        avgB: colorN>0 ? Math.round(sumB/colorN) : 200,
        bx0,bx1,by0,by1, size:q.length,
      })
    }

    setFillPct(Math.round(st.scanPos/(cw*ch)*40))

    if (st.scanPos < cw*ch) {
      fillRafRef.current = requestAnimationFrame(detectChunk)
      return
    }

    st.regions.sort((a,b) => b.size-a.size)

    if (!st.regions.length) {
      setIsFilling(false); setFillDone(true); setFillPct(100); return
    }

    // Build paint vis array (separate from detection vis)
    const paintVis = new Uint8Array(cw*ch)
    for(let i=0;i<cw*ch;i++) { if(st.strokeMask[i]) paintVis[i]=1 }

    paintRef.current = {
      regions: st.regions,
      regIdx: 0,
      frontArr: [],     // array acting as queue
      frontIdx: 0,      // index pointer — O(1) dequeue instead of shift()
      vis: paintVis,
      strokeMask: st.strokeMask,
      cdat: st.cdat,
      idat: st.idat,
      snap: st.snap,
      cw, ch,
    }
    detectRef.current = null

    // Seed first region
    _seedRegion(0)
    setFillStage('Painting…')
    setFillPct(42)
    fillRafRef.current = requestAnimationFrame(paintTick)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Seed paint BFS for region[regIdx] ──────────────────────
  // Uses pixelSet.has() — O(1), not indexOf() O(n)
  const _seedRegion = (regIdx) => {
    const pt = paintRef.current; if (!pt) return
    const { regions, vis } = pt
    if (regIdx >= regions.length) return
    const reg = regions[regIdx]
    const front = []
    const s = reg.seedIdx
    if (!vis[s] && reg.pixelSet.has(s)) { vis[s]=1; front.push(s) }
    else {
      for (const p of reg.pixelSet) {
        if (!vis[p]) { vis[p]=1; front.push(p); break }
      }
    }
    pt.frontArr = front
    pt.frontIdx = 0
    pt.regIdx   = regIdx
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 2: WATERCOLOR PAINT — PX_PER_FRAME per rAF
  // Expands BFS outward from region centroid.
  // Uses index pointer (O(1)) instead of shift() (O(n)).
  // Per-pixel image color + paper grain + wet-edge bleed.
  // ══════════════════════════════════════════════════════════════
  const paintTick = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return
    const pt  = paintRef.current; if (!pt) return
    const { regions, strokeMask, cdat, idat, snap, cw, ch } = pt

    let done = 0

    while (done < PX_PER_FRAME) {
      // Region exhausted?
      if (pt.frontIdx >= pt.frontArr.length) {
        ctx.putImageData(snap, 0, 0)

        const next = pt.regIdx + 1
        const pct  = 42 + Math.min(55, Math.round(next/regions.length*55))
        setFillPct(pct)

        if (next >= regions.length) {
          // All done — redraw strokes on top
          setFillStage('Finishing…')
          setFillPct(98)
          fillRafRef.current = requestAnimationFrame(finalizeStrokes)
          return
        }

        _seedRegion(next)
        fillRafRef.current = requestAnimationFrame(paintTick)
        return
      }

      const pos = pt.frontArr[pt.frontIdx++]   // O(1) — index pointer
      const di  = pos*4
      const reg = regions[pt.regIdx]

      // Per-pixel image color
      const ir = idat[di], ig = idat[di+1], ib = idat[di+2]

      // Background check
      const avg=(ir+ig+ib)/3
      const isBackground = ir>BG_THR && ig>BG_THR && ib>BG_THR
        && Math.abs(ir-avg)+Math.abs(ig-avg)+Math.abs(ib-avg) < BG_VAR_THR*2

      if (!isBackground) {
        const px=pos%cw, py=Math.floor(pos/cw)
        const nearStroke =
          (px>0    && strokeMask[pos-1])  ||
          (px<cw-1 && strokeMask[pos+1])  ||
          (py>0    && strokeMask[pos-cw]) ||
          (py<ch-1 && strokeMask[pos+cw])

        if (nearStroke) {
          // Soft bleed: light color wash just past the ink line
          const g = grain(pos, cw, 3)
          const a = BLEED_ALPHA
          cdat[di]   = Math.round(Math.min(255,Math.max(0, ir*a + cdat[di]*(1-a)   + g)))
          cdat[di+1] = Math.round(Math.min(255,Math.max(0, ig*a + cdat[di+1]*(1-a) + g)))
          cdat[di+2] = Math.round(Math.min(255,Math.max(0, ib*a + cdat[di+2]*(1-a) + g)))
          cdat[di+3] = 255
        } else {
          // Watercolor layers — each blends over previous result
          for (const layer of WC_LAYERS) {
            const g = grain(pos, cw, layer.noise)
            const a = layer.alpha
            const cr=cdat[di], cg=cdat[di+1], cb=cdat[di+2]
            cdat[di]   = Math.round(Math.min(255,Math.max(0, ir*a + cr*(1-a) + g)))
            cdat[di+1] = Math.round(Math.min(255,Math.max(0, ig*a + cg*(1-a) + g)))
            cdat[di+2] = Math.round(Math.min(255,Math.max(0, ib*a + cb*(1-a) + g)))
            cdat[di+3] = 255
          }
        }
      }
      done++

      // Expand BFS — only within this region's pixelSet
      const px=pos%cw, py=Math.floor(pos/cw)
      const vis=pt.vis, pset=reg.pixelSet
      const L=px>0?pos-1:-1, R=px<cw-1?pos+1:-1
      const U=py>0?pos-cw:-1, D=py<ch-1?pos+cw:-1
      for (const n of [L,R,U,D]) {
        if (n<0||vis[n]||strokeMask[n]) continue
        if (!pset.has(n)) continue   // stay in this region only
        vis[n]=1; pt.frontArr.push(n)
      }
    }

    ctx.putImageData(snap, 0, 0)
    fillRafRef.current = requestAnimationFrame(paintTick)
  }, [getCtx])

  // ── Finalize: re-draw strokes on top of watercolor ──────────
  const finalizeStrokes = useCallback(() => {
    const ctx = getCtx(); if (!ctx) return
    if (strokeSnapRef.current && paintRef.current?.cdat) {
      const sdat = strokeSnapRef.current.data
      const cdat = paintRef.current.cdat
      const len  = sdat.length
      for (let i=0; i<len/4; i++) {
        const d = i*4
        const minC = Math.min(sdat[d], sdat[d+1], sdat[d+2])
        if (minC < 80) {
          const a = (1 - minC/80) * 0.92
          cdat[d]   = Math.round(sdat[d]   * a + cdat[d]   * (1-a))
          cdat[d+1] = Math.round(sdat[d+1] * a + cdat[d+1] * (1-a))
          cdat[d+2] = Math.round(sdat[d+2] * a + cdat[d+2] * (1-a))
          cdat[d+3] = 255
        }
      }
      ctx.putImageData(paintRef.current.snap, 0, 0)
    }
    setIsFilling(false); setFillDone(true); setFillPct(100); setFillStage('')
    fillRafRef.current = null
  }, [getCtx])

  // ── Fill entry — polls until image ready (REST fix) ─────────
  const startFillAnimation = useCallback(() => {
    const c = canvasRef.current; if (!c) return
    if (colorFillImage && !imgReadyRef.current) {
      if (fillPollRef.current >= IMG_POLL_MAX) {
        console.warn('[Fill] image not ready — proceeding without')
      } else {
        fillPollRef.current++
        setTimeout(startFillAnimation, IMG_POLL_MS)
        return
      }
    }
    fillPollRef.current = 0
    if (fillRafRef.current) cancelAnimationFrame(fillRafRef.current)
    paintRef.current = null

    const ctx  = getCtx()
    const cw   = c.width, ch = c.height
    const snap = ctx.getImageData(0, 0, cw, ch)
    const cdat = snap.data

    strokeSnapRef.current = ctx.getImageData(0, 0, cw, ch)  // save for finalize

    const idat = imgReadyRef.current && imgDataRef.current
      ? imgDataRef.current.data
      : new Uint8ClampedArray(cw*ch*4).fill(255)  // fallback: use white

    const strokeMask = buildStrokeMask(cdat, cw, ch)
    const vis        = new Uint8Array(cw*ch)
    for (let i=0; i<cw*ch; i++) { if(strokeMask[i]) vis[i]=1 }

    // Store cw/ch IN the ref so detectChunk never uses stale React state
    detectRef.current = {
      vis, strokeMask, cdat, idat, snap,
      cw, ch,   // ← critical: stored in ref, not closure over state
      scanPos: 0, regions: [],
    }

    setIsFilling(true); setFillDone(false); setFillPct(0)
    setFillStage('Detecting…')
    fillRafRef.current = requestAnimationFrame(detectChunk)
  }, [colorFillImage, getCtx, detectChunk])

  // ── Stroke drawing tick ──────────────────────────────────────
  const tick = useCallback(() => {
    const c = canvasRef.current; if (!c) { rafRef.current=null; return }
    const ctx = getCtx()
    const pen = PENS[penStyleRef.current] || PENS.pencil
    const ppf = SPEED_PTS[speedRef.current] || 12

    ctx.strokeStyle='#1a1a1a'; ctx.lineCap='round'; ctx.lineJoin='round'
    ctx.globalAlpha = typeof strokeOpacity==='number'
      ? Math.min(1,Math.max(0,strokeOpacity)) : pen.alpha
    ctx.lineWidth   = pen.lw*(typeof strokeWidthMultiplier==='number'?strokeWidthMultiplier:1)
    ctx.globalCompositeOperation='source-over'
    ctx.shadowBlur  = penStyleRef.current==='neon'?14:0
    ctx.shadowColor = penStyleRef.current==='neon'?'#aaaaff':'transparent'

    let d=0
    while(d<ppf){
      const qi=queuePosRef.current
      if(qi>=queueRef.current.length){
        ctx.shadowBlur=0; rafRef.current=null; runningRef.current=false
        setIsDone(true); setDrawn(queueRef.current.length)
        if(fillAfterDone){ fillPollRef.current=0; setTimeout(startFillAnimation,600) }
        onComplete?.(); return
      }
      const{pts}=queueRef.current[qi]; const pi=ptPosRef.current
      if(pi===0){
        ctx.beginPath(); if(pts.length>0) ctx.moveTo(pts[0][0],pts[0][1])
        ptPosRef.current=1; d++; continue
      }
      if(pi<pts.length){
        if(pi<pts.length-1){
          const mx=(pts[pi][0]+pts[pi+1][0])/2,my=(pts[pi][1]+pts[pi+1][1])/2
          ctx.quadraticCurveTo(pts[pi][0],pts[pi][1],mx,my)
        } else ctx.lineTo(pts[pi][0],pts[pi][1])
        ctx.stroke(); ctx.beginPath(); ctx.moveTo(pts[pi][0],pts[pi][1])
        ptPosRef.current=pi+1; d++
      }
      if(ptPosRef.current>=pts.length){
        ctx.stroke(); queuePosRef.current++; ptPosRef.current=0
        setDrawn(queuePosRef.current)
      }
    }
    rafRef.current=requestAnimationFrame(tick)
  },[onComplete,strokeOpacity,strokeWidthMultiplier,fillAfterDone,startFillAnimation,getCtx])

  const resetFill = useCallback(() => {
    if(fillRafRef.current) cancelAnimationFrame(fillRafRef.current)
    fillRafRef.current=null; detectRef.current=null
    paintRef.current=null; strokeSnapRef.current=null
    fillPollRef.current=0
  },[])

  useImperativeHandle(ref,()=>({
    setup(w,h){
      const c=canvasRef.current; if(!c) return
      ctxRef.current=null
      c.width=w; c.height=h; setCW(w); setCH(h); fillBg()
      buildImgData(w,h)
    },
    addPaths(arr){ allPathsRef.current.push(...arr); setTotal(t=>t+arr.length) },
    start(){
      if(rafRef.current) cancelAnimationFrame(rafRef.current)
      resetFill()
      queueRef.current=allPathsRef.current.map((pts,i)=>({pts,pathIdx:i}))
      queuePosRef.current=0; ptPosRef.current=0; runningRef.current=true
      setDrawn(0); setIsDone(false); setIsPaused(false)
      setIsFilling(false); setFillDone(false); setFillPct(0); setFillStage('')
      rafRef.current=requestAnimationFrame(tick)
    },
    reset(){
      if(rafRef.current) cancelAnimationFrame(rafRef.current)
      resetFill()
      rafRef.current=null; runningRef.current=false
      ctxRef.current=null; imgReadyRef.current=false
      allPathsRef.current=[]; queueRef.current=[]
      queuePosRef.current=0; ptPosRef.current=0
      setDrawn(0); setTotal(0); setIsDone(false); setIsPaused(false)
      setIsFilling(false); setFillDone(false); setFillPct(0); setFillStage('')
      fillBg()
    },
    isDone:()=>!runningRef.current&&queueRef.current.length>0
      &&queuePosRef.current>=queueRef.current.length,
    setSpeed(v){speedRef.current=+v;setSpeed(+v)},
    startFill:()=>{ fillPollRef.current=0; startFillAnimation() },
  }),[tick,fillBg,startFillAnimation,buildImgData,getCtx,resetFill])

  const togglePause=useCallback(()=>{
    if(runningRef.current){
      cancelAnimationFrame(rafRef.current); rafRef.current=null
      runningRef.current=false; setIsPaused(true)
    }else if(isPaused){
      runningRef.current=true; setIsPaused(false)
      rafRef.current=requestAnimationFrame(tick)
    }
  },[isPaused,tick])

  const replay=useCallback(()=>{
    if(rafRef.current) cancelAnimationFrame(rafRef.current)
    resetFill()
    queuePosRef.current=0; ptPosRef.current=0; runningRef.current=true
    setDrawn(0); setIsDone(false); setIsPaused(false)
    setIsFilling(false); setFillDone(false); setFillPct(0); setFillStage('')
    fillBg(); rafRef.current=requestAnimationFrame(tick)
  },[tick,fillBg,resetFill])

  const download=useCallback(()=>{
    const a=document.createElement('a')
    a.download=`sketch-${Date.now()}.png`
    a.href=canvasRef.current?.toDataURL('image/png')||''; a.click()
  },[])

  useEffect(()=>()=>{
    if(rafRef.current)    cancelAnimationFrame(rafRef.current)
    if(fillRafRef.current) cancelAnimationFrame(fillRafRef.current)
  },[])

  const avH=typeof window!=='undefined'?window.innerHeight-220:600
  const avW=typeof window!=='undefined'?window.innerWidth-340:800
  const rat=cW>0&&cH>0?cW/cH:4/3
  let dW=Math.min(avW,cW),dH=dW/rat
  if(dH>avH){dH=avH;dW=dH*rat}
  dW=Math.max(dW,100); dH=Math.max(dH,100)
  const prog=total>0?Math.round(drawn/total*100):0

  return(
    <div style={{display:'flex',flexDirection:'column',gap:12,alignItems:'center',
      justifyContent:'center',width:'100%',height:'100%'}}>

      <div style={{
        position:'relative',borderRadius:4,overflow:'hidden',flexShrink:0,
        width:`${dW}px`,height:`${dH}px`,background:'#ffffff',
        boxShadow:'0 2px 4px rgba(0,0,0,.08),0 12px 40px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.07)',
      }}>
        <canvas ref={canvasRef}
          style={{display:'block',width:'100%',height:'100%',background:'#ffffff'}}/>

        {(total>0||isFilling)&&(
          <div style={{
            position:'absolute',bottom:0,left:0,right:0,
            background:'rgba(8,8,14,.94)',backdropFilter:'blur(10px)',
            borderTop:'1px solid rgba(255,255,255,.05)',
            padding:'6px 14px',display:'flex',alignItems:'center',gap:10,
            fontFamily:'"JetBrains Mono",monospace',fontSize:11,
          }}>
            {isFilling?(
              <>
                <span style={{color:'rgba(255,255,255,.5)',minWidth:150,flexShrink:0}}>
                  <span style={{color:'#22d3ee',fontWeight:700}}>{fillStage} </span>{fillPct}%
                </span>
                <div style={{flex:1,height:3,background:'rgba(255,255,255,.08)',borderRadius:2,overflow:'hidden'}}>
                  <div style={{width:`${fillPct}%`,height:'100%',borderRadius:2,
                    background:'linear-gradient(90deg,#22d3ee,#a78bfa,#f472b6)',
                    transition:'width .15s'}}/>
                </div>
              </>
            ):(
              <>
                <span style={{color:'rgba(255,255,255,.4)',minWidth:112,flexShrink:0}}>
                  <span style={{color:'#f5c542',fontWeight:700}}>{drawn}</span>{' '}/ {total} strokes
                </span>
                <div style={{flex:1,height:3,background:'rgba(255,255,255,.08)',borderRadius:2,overflow:'hidden'}}>
                  <div style={{width:`${prog}%`,height:'100%',borderRadius:2,
                    background:'linear-gradient(90deg,#f5c542,#f97316)',transition:'width .08s'}}/>
                </div>
                <span style={{fontWeight:800,minWidth:36,textAlign:'right',fontSize:12,color:'#f5c542'}}>{prog}%</span>
              </>
            )}
          </div>
        )}

        {(isDone||fillDone)&&!isFilling&&(
          <div style={{
            position:'absolute',top:12,right:12,
            background:'rgba(0,0,0,.88)',backdropFilter:'blur(8px)',
            color:fillDone?'#a78bfa':'#34d399',fontSize:11,
            padding:'5px 14px',borderRadius:20,fontFamily:'"JetBrains Mono",monospace',
            border:`1px solid ${fillDone?'rgba(167,139,250,.4)':'rgba(52,211,153,.4)'}`,
            display:'flex',alignItems:'center',gap:6,
          }}>
            <span style={{width:6,height:6,borderRadius:'50%',
              background:fillDone?'#a78bfa':'#34d399',display:'inline-block',
              boxShadow:`0 0 6px ${fillDone?'#a78bfa':'#34d399'}`}}/>
            {fillDone?'Colored ✓':'Drawn ✓'}
          </div>
        )}
      </div>

      {total>0&&(
        <div style={{
          display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',justifyContent:'center',
          background:'rgba(8,8,14,.92)',backdropFilter:'blur(16px)',
          border:'1px solid rgba(255,255,255,.07)',borderRadius:14,
          padding:'8px 16px',boxShadow:'0 4px 24px rgba(0,0,0,.4)',
        }}>
          {!isFilling&&(
            <>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:11,color:'rgba(255,255,255,.3)',letterSpacing:'.08em',textTransform:'uppercase'}}>Speed</span>
                <input type="range" min={1} max={9} step={1} value={speed}
                  onChange={e=>{speedRef.current=+e.target.value;setSpeed(+e.target.value)}}
                  style={{width:90,accentColor:'#f5c542'}}/>
                <span style={{fontFamily:'"JetBrains Mono",monospace',fontSize:11,color:'#f5c542',
                  minWidth:52,background:'rgba(245,197,66,.1)',border:'1px solid rgba(245,197,66,.2)',
                  borderRadius:6,padding:'2px 7px',textAlign:'center'}}>{SPEED_LABELS[speed]}</span>
              </div>
              <div style={{width:1,height:18,background:'rgba(255,255,255,.07)'}}/>
              <CB onClick={togglePause} active={!isPaused&&!isDone&&total>0}>
                {runningRef.current?'⏸ Pause':isPaused?'▶ Resume':'▶ Play'}
              </CB>
            </>
          )}
          {isDone&&!isFilling&&<CB onClick={replay}>↩ Replay</CB>}
          {isDone&&!isFilling&&!fillDone&&colorFillImage&&(
            <CB onClick={()=>{fillPollRef.current=0;startFillAnimation()}} c="cyan">
              🎨 Watercolor Fill
            </CB>
          )}
          {fillDone&&!isFilling&&colorFillImage&&(
            <CB onClick={()=>{fillPollRef.current=0;startFillAnimation()}} c="purple">
              ↩ Recolor
            </CB>
          )}
          {isDone&&!isFilling&&<CB onClick={download} c="green">⬇ Save PNG</CB>}
        </div>
      )}
    </div>
  )
})

function CB({children,onClick,active,c,disabled}){
  const M={
    green: ['rgba(52,211,153,.12)','rgba(52,211,153,.35)','#34d399'],
    cyan:  ['rgba(34,211,238,.12)','rgba(34,211,238,.35)','#22d3ee'],
    purple:['rgba(167,139,250,.12)','rgba(167,139,250,.35)','#a78bfa'],
    active:['rgba(245,197,66,.12)', 'rgba(245,197,66,.40)', '#f5c542'],
    def:   ['rgba(255,255,255,.04)','rgba(255,255,255,.10)','rgba(255,255,255,.5)'],
  }
  const[bg,border,color]=M[c||(active?'active':'def')]||M.def
  return(
    <button onClick={onClick} disabled={disabled} style={{
      background:bg,border:`1px solid ${border}`,color,borderRadius:8,
      padding:'6px 16px',fontSize:12,cursor:disabled?'not-allowed':'pointer',
      transition:'all .15s',fontFamily:'inherit',fontWeight:600,opacity:disabled?.35:1,
    }}>{children}</button>
  )
}

export default DrawingCanvas
