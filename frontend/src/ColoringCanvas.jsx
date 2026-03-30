import { useRef, useState, useCallback, useEffect } from 'react'

// ─── Pastel palette ───────────────────────────────────────────────────────────
const PALETTE = [
  [255,179,186],[255,223,186],[255,255,186],[186,255,201],
  [186,225,255],[218,186,255],[255,186,239],[186,255,255],
  [255,214,165],[197,255,186],[186,197,255],[255,186,186],
  [220,255,186],[186,255,230],[255,240,186],[230,186,255],
]

const W = 600, H = 600
const STROKE_THR   = 100   // pixel is a stroke if any channel < this
const DILATE_R     = 2     // dilation radius to close small gaps
const MIN_REGION   = 80    // ignore regions smaller than this (noise)
const PX_PER_FRAME = 3000  // pixels processed per animation frame
const BRUSH_R      = 6     // radius of each circular brush dab

export default function ColoringCanvas() {
  const canvasRef  = useRef(null)
  const drawing    = useRef(false)
  const lastPt     = useRef(null)
  const rafRef     = useRef(null)

  // fill state
  const regionsRef    = useRef([])   // array of Uint32Array pixel-index sets
  const regionIdxRef  = useRef(0)
  const regionPxRef   = useRef([])   // pixels of current region not yet painted
  const fillDataRef   = useRef(null) // ImageData being mutated
  const fillCtxRef    = useRef(null)

  const [status, setStatus] = useState('Draw shapes, then click Fill Regions')
  const [filling, setFilling] = useState(false)

  // ── helpers ──────────────────────────────────────────────────────────────────
  const getCtx = () => canvasRef.current?.getContext('2d', { willReadFrequently: true })

  // White canvas on mount
  useEffect(() => {
    const ctx = getCtx(); if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
  }, [])

  // ── Drawing ──────────────────────────────────────────────────────────────────
  const pt = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return [
      (e.clientX - r.left) * (W / r.width),
      (e.clientY - r.top)  * (H / r.height),
    ]
  }

  const onMouseDown = useCallback((e) => {
    if (filling) return
    drawing.current = true
    lastPt.current  = pt(e)
    const ctx = getCtx()
    ctx.beginPath()
    ctx.moveTo(...lastPt.current)
  }, [filling])

  const onMouseMove = useCallback((e) => {
    if (!drawing.current) return
    const ctx = getCtx()
    const cur = pt(e)
    ctx.strokeStyle = '#111111'
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.globalAlpha = 1
    // smooth quadratic curve
    const mx = (lastPt.current[0] + cur[0]) / 2
    const my = (lastPt.current[1] + cur[1]) / 2
    ctx.quadraticCurveTo(lastPt.current[0], lastPt.current[1], mx, my)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(mx, my)
    lastPt.current = cur
  }, [])

  const onMouseUp = useCallback(() => { drawing.current = false }, [])

  // ── Region detection ─────────────────────────────────────────────────────────
  /**
   * 1. Read pixel data
   * 2. Mark stroke pixels (dark) in a Uint8Array
   * 3. Dilate stroke mask to close tiny gaps
   * 4. BFS over non-stroke pixels to find connected white regions
   * 5. Filter out tiny regions (noise)
   */
  const detectRegions = (imageData) => {
    const { data, width: cw, height: ch } = imageData
    const total = cw * ch

    // Step 1 — stroke mask
    const stroke = new Uint8Array(total)
    for (let i = 0; i < total; i++) {
      const d = i * 4
      if (data[d] < STROKE_THR || data[d+1] < STROKE_THR || data[d+2] < STROKE_THR)
        stroke[i] = 1
    }

    // Step 2 — dilate stroke mask
    const dilated = new Uint8Array(stroke)
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        if (!stroke[y * cw + x]) continue
        for (let dy = -DILATE_R; dy <= DILATE_R; dy++) {
          for (let dx = -DILATE_R; dx <= DILATE_R; dx++) {
            const nx = x + dx, ny = y + dy
            if (nx >= 0 && ny >= 0 && nx < cw && ny < ch)
              dilated[ny * cw + nx] = 1
          }
        }
      }
    }

    // Step 3 — BFS region segmentation on non-stroke pixels
    const visited = new Uint8Array(total)
    // pre-mark dilated strokes as visited so BFS never enters them
    for (let i = 0; i < total; i++) if (dilated[i]) visited[i] = 1

    const regions = []
    const queue   = new Int32Array(total) // reusable BFS queue

    for (let seed = 0; seed < total; seed++) {
      if (visited[seed]) continue
      visited[seed] = 1

      // BFS
      let head = 0, tail = 0
      queue[tail++] = seed
      const region = []

      while (head < tail) {
        const pos = queue[head++]
        region.push(pos)
        const x = pos % cw, y = (pos / cw) | 0

        const neighbors = [
          x > 0    ? pos - 1  : -1,
          x < cw-1 ? pos + 1  : -1,
          y > 0    ? pos - cw : -1,
          y < ch-1 ? pos + cw : -1,
        ]
        for (const n of neighbors) {
          if (n >= 0 && !visited[n]) {
            visited[n] = 1
            queue[tail++] = n
          }
        }
      }

      if (region.length >= MIN_REGION) regions.push(region)
    }

    return regions
  }

  // ── Human-like brush fill animation ─────────────────────────────────────────
  /**
   * For each region:
   *  - Shuffle pixels so fill order looks organic (not flood-wave)
   *  - Each frame: paint BRUSH_R-radius soft circles at random positions
   *    within the region, using the assigned pastel color
   *  - Only paint pixels that belong to the region (boundary-safe)
   */
  const startFill = useCallback(() => {
    if (filling) return
    const ctx = getCtx(); if (!ctx) return

    const imageData = ctx.getImageData(0, 0, W, H)
    const regions   = detectRegions(imageData)

    if (!regions.length) {
      setStatus('No enclosed regions found. Draw closed shapes first.')
      return
    }

    // Build a pixel→regionId lookup for boundary-safe painting
    const pixelRegion = new Int32Array(W * H).fill(-1)
    regions.forEach((region, id) => region.forEach(px => { pixelRegion[px] = id }))

    // Shuffle each region for organic fill order
    const shuffled = regions.map(region => {
      const arr = region.slice()
      for (let i = arr.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    })

    regionsRef.current   = shuffled
    regionIdxRef.current = 0
    regionPxRef.current  = shuffled[0] ? [...shuffled[0]] : []
    fillDataRef.current  = imageData
    fillCtxRef.current   = ctx

    setFilling(true)
    setStatus(`Coloring ${regions.length} region${regions.length > 1 ? 's' : ''}…`)

    const tick = () => {
      const idata      = fillDataRef.current
      const dat        = idata.data
      const regionIdx  = regionIdxRef.current
      const pixels     = regionPxRef.current

      if (regionIdx >= regionsRef.current.length) {
        ctx.putImageData(idata, 0, 0)
        setFilling(false)
        setStatus('Done! Draw more shapes or clear to start over.')
        rafRef.current = null
        return
      }

      const [r, g, b] = PALETTE[regionIdx % PALETTE.length]
      let processed = 0

      while (processed < PX_PER_FRAME && pixels.length > 0) {
        // Pick a random remaining pixel as brush center
        const randIdx  = (Math.random() * pixels.length) | 0
        const centerPx = pixels[randIdx]
        // Remove it (swap with last for O(1))
        pixels[randIdx] = pixels[pixels.length - 1]
        pixels.pop()

        const cx = centerPx % W
        const cy = (centerPx / W) | 0

        // Paint a soft circular dab — only pixels in the same region
        for (let dy = -BRUSH_R; dy <= BRUSH_R; dy++) {
          for (let dx = -BRUSH_R; dx <= BRUSH_R; dx++) {
            if (dx*dx + dy*dy > BRUSH_R*BRUSH_R) continue
            const nx = cx + dx, ny = cy + dy
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
            const ni = ny * W + nx
            if (pixelRegion[ni] !== regionIdx) continue  // strict boundary check

            // Soft alpha blend for watercolor feel
            const di   = ni * 4
            const dist = Math.sqrt(dx*dx + dy*dy)
            const alpha = 0.75 * (1 - dist / (BRUSH_R + 1))
            dat[di]   = Math.round(r * alpha + dat[di]   * (1 - alpha))
            dat[di+1] = Math.round(g * alpha + dat[di+1] * (1 - alpha))
            dat[di+2] = Math.round(b * alpha + dat[di+2] * (1 - alpha))
            dat[di+3] = 255
          }
        }
        processed++
      }

      ctx.putImageData(idata, 0, 0)

      if (pixels.length === 0) {
        // Move to next region
        regionIdxRef.current++
        const next = regionsRef.current[regionIdxRef.current]
        regionPxRef.current = next ? [...next] : []
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [filling])

  // ── Clear ────────────────────────────────────────────────────────────────────
  const clear = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    const ctx = getCtx(); if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    setFilling(false)
    setStatus('Draw shapes, then click Fill Regions')
  }, [])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>🎨 Smart Coloring Canvas</h2>
      <p style={styles.hint}>{status}</p>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={styles.canvas}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />

      <div style={styles.btnRow}>
        <button
          style={{ ...styles.btn, ...styles.btnFill, opacity: filling ? 0.5 : 1 }}
          onClick={startFill}
          disabled={filling}
        >
          🖌️ Fill Regions
        </button>
        <button
          style={{ ...styles.btn, ...styles.btnClear }}
          onClick={clear}
        >
          🗑️ Clear
        </button>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  wrapper: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 14, padding: 24, fontFamily: 'sans-serif',
    background: '#f8f8f8', minHeight: '100vh',
  },
  title: { margin: 0, fontSize: 22, color: '#333' },
  hint:  { margin: 0, fontSize: 13, color: '#666', minHeight: 18 },
  canvas: {
    border: '2px solid #ccc', borderRadius: 8, cursor: 'crosshair',
    background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,.12)',
    touchAction: 'none',
  },
  btnRow: { display: 'flex', gap: 12 },
  btn: {
    padding: '10px 28px', fontSize: 14, fontWeight: 600,
    border: 'none', borderRadius: 8, cursor: 'pointer',
    transition: 'transform .1s, box-shadow .1s',
  },
  btnFill: {
    background: 'linear-gradient(135deg,#667eea,#764ba2)',
    color: '#fff', boxShadow: '0 4px 14px rgba(102,126,234,.45)',
  },
  btnClear: {
    background: '#fff', color: '#555',
    border: '1.5px solid #ddd', boxShadow: '0 2px 8px rgba(0,0,0,.08)',
  },
}
