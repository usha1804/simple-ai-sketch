
import { useState, useRef, useCallback, useEffect } from 'react'

// VideoTab uses its own internal theme because it may render 
// before App.jsx passes T, but we also accept T as a prop.
const DEFAULT_T = {
  bg:'#07070c', panel:'#0d0d16', card:'#11111e', border:'#1a1a2e',
  gold:'#f5c542', goldBg:'rgba(245,197,66,.1)', goldBdr:'rgba(245,197,66,.25)',
  blue:'#4f9cf9', blueBg:'rgba(79,156,249,.1)', blueBdr:'rgba(79,156,249,.25)',
  green:'#34d399', greenBg:'rgba(52,211,153,.1)', greenBdr:'rgba(52,211,153,.25)',
  red:'#f87171', redBg:'rgba(248,113,113,.1)', redBdr:'rgba(248,113,113,.25)',
  orange:'#fb923c', orangeBg:'rgba(251,146,60,.1)', orangeBdr:'rgba(251,146,60,.25)',
  purple:'#a78bfa', purpleBg:'rgba(167,139,250,.1)', purpleBdr:'rgba(167,139,250,.25)',
  text:'#ece8e0', sub:'#5a5a72', dim:'#1e1e30',
}

const DETAIL_LABELS = ['','Minimal','Light','Medium','Detailed','Maximum']
const SPEED_LABELS  = ['','Slowest','Slow','Normal','Medium','Fast','Faster','Quick','Rapid','Max']

export default function VideoTab({ onSketchReady, canvasRef, onAnimationStart, onAnimationReset, T: propT }) {
  const T = propT || DEFAULT_T

  const fileInputRef  = useRef(null)
  const wsRef         = useRef(null)
  const frameQueueRef = useRef([])
  const playingRef    = useRef(false)
  const nextFrameRef  = useRef(0)
  const totalRef      = useRef(0)

  const [videoFile,   setVideoFile]   = useState(null)
  const [dragging,    setDragging]    = useState(false)
  const [useHed,      setUseHed]      = useState(false)
  const [detailLevel, setDetailLevel] = useState(2)
  const [frameSkip,   setFrameSkip]   = useState(3)
  const [smooth,      setSmooth]      = useState(0.5)
  const [drawSpeed,   setDrawSpeed]   = useState(7)
  const [penStyle,    setPenStyle]    = useState('pencil')
  const [phase,       setPhase]       = useState('idle')
  const [progress,    setProgress]    = useState(0)
  const [statusMsg,   setStatusMsg]   = useState('')
  const [frameNum,    setFrameNum]    = useState(0)
  const [totalFrames, setTotalFrames] = useState(0)
  const [errorMsg,    setErrorMsg]    = useState('')

  useEffect(() => () => { wsRef.current?.close(); playingRef.current = false }, [])

  const reset = useCallback(() => {
    wsRef.current?.close(); wsRef.current = null
    playingRef.current = false
    frameQueueRef.current = []; nextFrameRef.current = 0; totalRef.current = 0
    canvasRef?.current?.reset(); onAnimationReset?.()
    setPhase('idle'); setProgress(0); setStatusMsg(''); setFrameNum(0); setTotalFrames(0); setErrorMsg('')
  }, [canvasRef, onAnimationReset])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('video/')) { setVideoFile(f); reset() }
    else alert('Please drop a video file (MP4, MOV, AVI, WEBM)')
  }, [reset])

  const drawNextFrame = useCallback(() => {
    if (!playingRef.current) return
    const idx = nextFrameRef.current
    const frame = frameQueueRef.current[idx]
    if (!frame) {
      if (totalRef.current > 0 && idx >= totalRef.current) {
        playingRef.current = false; setPhase('done'); setStatusMsg('Video sketch complete!'); return
      }
      setTimeout(drawNextFrame, 100); return
    }
    const { width, height, paths, frame_index } = frame
    canvasRef?.current?.reset()
    canvasRef?.current?.setup(width, height)
    canvasRef?.current?.addPaths(paths)
    canvasRef?.current?.start()
    nextFrameRef.current = idx + 1
    setFrameNum(frame_index + 1)
    setProgress(Math.round((frame_index + 1) / Math.max(totalRef.current, 1) * 100))
    if (frame_index === 0) {
      setTimeout(() => {
        const cv = document.querySelector('canvas')
        if (cv && onSketchReady) onSketchReady(cv.toDataURL('image/jpeg', 0.7).split(',')[1])
      }, 800)
    }
  }, [canvasRef, onSketchReady])

  const startAnimation = useCallback(async () => {
    if (!videoFile) return
    reset()
    setPhase('reading'); setStatusMsg(`Uploading ${(videoFile.size/1024/1024).toFixed(1)}MB...`)
    const form = new FormData()
    form.append('file', videoFile)
    const params = new URLSearchParams({ use_hed: useHed?'true':'false', detail_level: detailLevel, frame_skip: frameSkip, temporal_smooth: smooth, output_format: 'mp4' })
    let jobId
    try {
      const xhr = new XMLHttpRequest()
      await new Promise((resolve, reject) => {
        xhr.upload.onprogress = (e) => { if (e.total) { setStatusMsg(`Uploading... ${Math.round(e.loaded/e.total*100)}%`); setProgress(Math.round(e.loaded/e.total*100)) } }
        xhr.onload = () => { if (xhr.status === 200) { jobId = JSON.parse(xhr.responseText).job_id; resolve() } else reject(new Error(`Upload failed: ${xhr.status}`)) }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('POST', `/api/video/process?${params}`)
        xhr.send(form)
      })
    } catch(e) { setPhase('error'); setErrorMsg(e.message || 'Upload failed'); return }

    setPhase('connecting'); setStatusMsg('Connecting to stream...'); setProgress(0)
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws    = new WebSocket(`${proto}://${location.host}/api/video/stream/${jobId}`)
    wsRef.current = ws; playingRef.current = true

    ws.onopen = () => { setStatusMsg('Starting frame stream...'); setPhase('streaming'); onAnimationStart?.() }
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'status') { setStatusMsg(msg.message) }
      else if (msg.type === 'meta') { totalRef.current = msg.total_frames; setTotalFrames(msg.total_frames); setStatusMsg(`Drawing ${msg.total_frames} frames...`) }
      else if (msg.type === 'frame') {
        frameQueueRef.current.push(msg)
        if (msg.frame_index === 0) { canvasRef?.current?.setup(msg.width, msg.height); setTimeout(drawNextFrame, 100) }
      }
      else if (msg.type === 'done') { totalRef.current = msg.total_frames; setTotalFrames(msg.total_frames); setStatusMsg('Finishing...') }
      else if (msg.type === 'error') { setPhase('error'); setErrorMsg(msg.message); playingRef.current = false }
    }
    ws.onclose = () => { if (playingRef.current) setStatusMsg('Finishing remaining frames...') }
    ws.onerror = () => { setPhase('error'); setErrorMsg('WebSocket failed — check vite.config.js proxy'); playingRef.current = false }
  }, [videoFile, useHed, detailLevel, frameSkip, smooth, drawNextFrame, reset, canvasRef, onAnimationStart])

  const stopAnimation = useCallback(() => {
    playingRef.current = false; wsRef.current?.close()
    setPhase('idle'); setStatusMsg('Stopped'); onAnimationReset?.()
  }, [onAnimationReset])

  const est = () => {
    if (!videoFile) return '?'
    const mb = videoFile.size / 1024 / 1024
    const s  = Math.round(mb * (useHed ? 25 : 4) / frameSkip)
    return s > 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`
  }

  const busy = ['reading','connecting','streaming'].includes(phase)

  /* ── Shared card styles with LARGER fonts ── */
  const card = { borderRadius:11, background:T.card||T.cardBg||'#11111e', border:`1px solid ${T.border}`, overflow:'hidden', flexShrink:0, marginBottom:8 }
  const chdr = { padding:'8px 13px', borderBottom:`1px solid ${T.border}`, fontSize:11, color:T.sub, letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'"JetBrains Mono",monospace', fontWeight:600 }
  const cbody= { padding:'11px 13px' }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflow:'hidden' }}>

      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'8px', display:'flex', flexDirection:'column', gap:0, minHeight:0 }}>

        {/* Header */}
        <div style={{ padding:'10px 12px', borderRadius:10, marginBottom:8, flexShrink:0, background:'linear-gradient(135deg,rgba(79,156,249,.1),rgba(167,139,250,.08))', border:`1px solid ${T.blue}33` }}>
          <div style={{ fontSize:13, fontWeight:800, marginBottom:3 }}>🎬 Video to Sketch</div>  {/* was 11 */}
          <div style={{ fontSize:11, color:T.sub, lineHeight:1.7 }}>Each frame draws stroke-by-stroke on the right canvas live.</div>  {/* was 8 */}
        </div>

        {/* Drop zone */}
        <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
          onClick={()=>!videoFile&&fileInputRef.current?.click()}
          style={{ border:`2px dashed ${dragging?T.gold:T.border}`, borderRadius:10, background:dragging?T.goldBg:T.dim||'#1e1e30', cursor:videoFile?'default':'pointer', padding:'11px 13px', flexShrink:0, display:'flex', alignItems:'center', gap:11, transition:'all .18s', marginBottom:8 }}>
          {videoFile ? (
            <>
              <span style={{ fontSize:24, flexShrink:0 }}>🎬</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:T.text, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{videoFile.name}</div>  {/* was 9 */}
                <div style={{ fontSize:11, color:T.sub, fontFamily:'monospace', marginTop:2 }}>{(videoFile.size/1024/1024).toFixed(1)} MB · ~{est()}</div>  {/* was 8 */}
              </div>
              <button onClick={e=>{e.stopPropagation();setVideoFile(null);reset()}}
                style={{ background:'rgba(255,255,255,.1)', color:'#aaa', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', flexShrink:0 }}>✕</button>
            </>
          ):(
            <div style={{ width:'100%', textAlign:'center', padding:'10px 0' }}>
              <div style={{ fontSize:24, opacity:.12, marginBottom:5 }}>🎬</div>
              <div style={{ fontSize:12, color:T.sub, marginBottom:2 }}>Drop video or click to browse</div>  {/* was 10 */}
              <div style={{ fontSize:10, color:T.sub, opacity:.5 }}>MP4 · MOV · AVI · WEBM · max 500MB</div>  {/* was 8 */}
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/x-msvideo,video/webm" style={{ display:'none' }}
          onChange={e=>{ if(e.target.files[0]){setVideoFile(e.target.files[0]);reset()} }}/>

        {/* Edge Settings */}
        <div style={card}>
          <div style={chdr}>Edge Settings</div>
          <div style={cbody}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:12, color:useHed?T.blue:T.text, fontWeight:useHed?600:400, marginBottom:2 }}>🧠 HED Neural</div>  {/* was 10 */}
                <div style={{ fontSize:10, color:useHed?T.orange:T.sub }}>{useHed?'⚠ Very slow for video':'Fast Canny — recommended'}</div>  {/* was 8 */}
              </div>
              <Toggle value={useHed} onChange={setUseHed} color={T.blue}/>
            </div>
            <SliderRow label="Edge Detail" value={detailLevel} min={1} max={5} step={1}
              display={`${DETAIL_LABELS[detailLevel]} (${detailLevel})`}
              hint="Lower = cleaner for video (2 recommended)"
              color={useHed?T.blue:T.gold} onChange={setDetailLevel} T={T}/>
          </div>
        </div>

        {/* Performance */}
        <div style={card}>
          <div style={chdr}>Performance</div>
          <div style={cbody}>
            <SliderRow label="Frame Skip" value={frameSkip} min={1} max={8} step={1}
              display={frameSkip===1?'Every frame':`Every ${frameSkip} frames`}
              hint={`Processes ~${Math.round(100/frameSkip)}% of frames`}
              color={T.orange} onChange={setFrameSkip} T={T}/>
            <SliderRow label="Temporal Smooth" value={smooth} min={0} max={1} step={0.1}
              display={`${Math.round(smooth*100)}%`}
              hint="Higher = less flicker between frames"
              color={T.purple} onChange={setSmooth} T={T}/>
            <SliderRow label="Draw Speed" value={drawSpeed} min={3} max={9} step={1}
              display={SPEED_LABELS[drawSpeed]}
              hint="Speed of stroke animation per frame"
              color={T.gold} onChange={setDrawSpeed} last T={T}/>
          </div>
        </div>

        {/* Pen Style */}
        <div style={card}>
          <div style={chdr}>Pen Style</div>
          <div style={cbody}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5 }}>
              {[['pencil','✏️','Pencil'],['charcoal','🖤','Charcoal'],['ink','🖊️','Ink'],['brush','🖌️','Brush']].map(([id,em,lbl])=>(
                <button key={id} onClick={()=>setPenStyle(id)}
                  style={{ padding:'7px 4px', borderRadius:8, fontSize:10, border:`1.5px solid ${penStyle===id?T.gold:T.border}`, background:penStyle===id?T.goldBg:T.dim||'#1e1e30', color:penStyle===id?T.gold:T.sub, cursor:'pointer', fontFamily:'inherit', display:'flex', flexDirection:'column', alignItems:'center', gap:3, transition:'all .15s' }}>
                  <span style={{ fontSize:14 }}>{em}</span>  {/* was 11 */}
                  <span style={{ fontSize:10, fontWeight:penStyle===id?700:400 }}>{lbl}</span>  {/* was 8 */}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status */}
        {busy && (
          <div style={card}>
            <div style={cbody}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                <Spinner color={phase==='reading'?T.gold:T.blue}/>
                <span style={{ fontSize:12, color:T.blue, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{statusMsg || 'Processing...'}</span>  {/* was 10 */}
              </div>
              <ProgressBar pct={progress} color={phase==='reading'?T.gold:T.blue} T={T}/>
              {totalFrames>0 && <div style={{ fontSize:10, color:T.sub, marginTop:4, fontFamily:'monospace' }}>Frame {frameNum} / {totalFrames}</div>}  {/* was 8 */}
            </div>
          </div>
        )}

        {phase==='done' && (
          <div style={card}>
            <div style={cbody}>
              <div style={{ color:T.green, fontWeight:700, fontSize:13, marginBottom:6 }}>✓ {frameNum} frames animated!</div>  {/* was 11 */}
              <button onClick={reset} style={{ width:'100%', padding:8, borderRadius:8, border:`1px solid ${T.border}`, background:'transparent', color:T.sub, fontSize:12, cursor:'pointer' }}>Process another video</button>  {/* was 9 */}
            </div>
          </div>
        )}

        {phase==='error' && (
          <div style={card}>
            <div style={cbody}>
              <div style={{ color:T.red, fontWeight:700, fontSize:12, marginBottom:5 }}>⚠️ Error</div>  {/* was 10 */}
              <div style={{ fontSize:11, color:T.red, lineHeight:1.7, marginBottom:8, wordBreak:'break-word', opacity:.85 }}>{errorMsg}</div>  {/* was 8 */}
              <button onClick={reset} style={{ width:'100%', padding:7, borderRadius:8, border:`1px solid ${T.redBdr}`, background:T.redBg, color:T.red, fontSize:12, cursor:'pointer' }}>Try Again</button>
            </div>
          </div>
        )}

        {phase==='idle' && (
          <div style={card}>
            <div style={chdr}>Tips for best results</div>
            <div style={{ padding:'11px 13px', fontSize:11, color:T.sub, lineHeight:2 }}>  {/* was 8 */}
              ✓ Use <strong style={{ color:T.gold }}>Canny</strong> — 5× faster than HED<br/>
              ✓ <strong style={{ color:T.gold }}>Detail Level 2</strong> — less noise<br/>
              ✓ <strong style={{ color:T.gold }}>Frame Skip 3</strong> — 3× faster<br/>
              ✓ <strong style={{ color:T.gold }}>Smooth 50%+</strong> — less flicker<br/>
              ✓ 720p video = best quality + speed<br/>
              ✓ Keep under 30 seconds
            </div>
          </div>
        )}

        <div style={{ height:6 }} />
      </div>

      {/* Action button — fixed bottom */}
      <div style={{ padding:'10px', borderTop:`1px solid ${T.border}`, background:T.panel||T.bg||'#0d0d16', flexShrink:0, boxShadow:'0 -4px 20px rgba(0,0,0,.3)' }}>
        {busy ? (
          <button onClick={stopAnimation} style={{ width:'100%', padding:12, borderRadius:10, border:`1px solid ${T.redBdr}`, background:T.redBg, color:T.red, fontSize:13, fontWeight:700, cursor:'pointer' }}>⏹ Stop</button>
        ):(
          <button onClick={startAnimation} disabled={!videoFile}
            style={{ width:'100%', padding:12, borderRadius:10, border:'none', background:videoFile?`linear-gradient(135deg,${T.blue},#2563eb)`:T.dim||'#1e1e30', color:videoFile?'#fff':T.sub, fontSize:13, fontWeight:800, cursor:videoFile?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:9, boxShadow:videoFile?`0 4px 22px ${T.blue}50`:'none', transition:'all .25s', fontFamily:'inherit' }}>
            {videoFile ? '🎬 Animate Sketch' : 'Upload a video first'}
          </button>
        )}
        <div style={{ textAlign:'center', marginTop:4, fontSize:10, color:T.sub, fontFamily:'monospace' }}>HTTP upload + WebSocket stream</div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */
function SliderRow({ label, value, min, max, step, display, hint, color, onChange, last, T }) {
  return (
    <div style={{ marginBottom: last ? 0 : 11 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:12, color:T.sub, fontWeight:500 }}>{label}</span>  {/* was 9 */}
        <span style={{ fontSize:11, color:color||T.gold, fontFamily:'"JetBrains Mono",monospace', background:`${color||T.gold}18`, border:`1px solid ${color||T.gold}30`, borderRadius:5, padding:'1px 7px', fontWeight:600 }}>{display}</span>  {/* was 9 */}
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(Number(e.target.value))} style={{ width:'100%', accentColor:color||T.gold }}/>
      {hint && <div style={{ fontSize:10, color:T.sub, marginTop:2, opacity:.7 }}>{hint}</div>}  {/* was 7 */}
    </div>
  )
}

function Toggle({ value, onChange, color }) {
  return (
    <div onClick={() => onChange(!value)}
      style={{ width:40, height:22, borderRadius:11, flexShrink:0, cursor:'pointer', background:value?color:'rgba(128,128,128,.18)', position:'relative', transition:'background .2s', boxShadow:value?`0 0 8px ${color}55`:'none' }}>
      <div style={{ position:'absolute', top:3, left:value?20:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.3)' }}/>
    </div>
  )
}

function ProgressBar({ pct, color, T }) {
  return (
    <div style={{ height:5, borderRadius:3, background:T.dim||'#1e1e30', overflow:'hidden' }}>  {/* was 4 */}
      <div style={{ width:`${pct}%`, height:'100%', borderRadius:3, background:color, transition:'width .3s' }}/>
    </div>
  )
}

function Spinner({ color }) {
  return (
    <div style={{ width:13, height:13, borderRadius:'50%', flexShrink:0, border:'2px solid rgba(30,30,48,1)', borderTopColor:color, animation:'v-spin .65s linear infinite' }}/>
  )
}

// Inline keyframes
if (typeof document !== 'undefined' && !document.getElementById('video-tab-spin')) {
  const s = document.createElement('style')
  s.id = 'video-tab-spin'
  s.textContent = '@keyframes v-spin { to { transform:rotate(360deg); } }'
  document.head.appendChild(s)
}