

import { useState, useRef, useCallback, useEffect } from 'react'

const T = {
  bg:'#07070c', panel:'#0d0d16', card:'#11111e', border:'#1a1a2e',
  gold:'#f5c542', goldD:'rgba(245,197,66,.1)',
  blue:'#4f9cf9', blueD:'rgba(79,156,249,.1)',
  green:'#34d399', greenD:'rgba(52,211,153,.1)',
  red:'#f87171', redD:'rgba(248,113,113,.1)',
  orange:'#fb923c', orangeD:'rgba(251,146,60,.1)',
  purple:'#a78bfa',
  text:'#ece8e0', sub:'#5a5a72', dim:'#1e1e30',
}

const DETAIL_LABELS = ['','Minimal','Light','Medium','Detailed','Maximum']
const SPEED_LABELS  = ['','Slowest','Slow','Normal','Medium','Fast','Faster','Quick','Rapid','Max']

export default function VideoTab({ onSketchReady, canvasRef, onAnimationStart, onAnimationReset }) {
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

  useEffect(() => () => {
    wsRef.current?.close()
    playingRef.current = false
  }, [])

  const reset = useCallback(() => {
    wsRef.current?.close(); wsRef.current = null
    playingRef.current = false
    frameQueueRef.current = []
    nextFrameRef.current  = 0
    totalRef.current      = 0
    canvasRef?.current?.reset()
    onAnimationReset?.()
    setPhase('idle'); setProgress(0)
    setStatusMsg(''); setFrameNum(0); setTotalFrames(0); setErrorMsg('')
  }, [canvasRef, onAnimationReset])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('video/')) { setVideoFile(f); reset() }
    else alert('Please drop a video file (MP4, MOV, AVI, WEBM)')
  }, [reset])

  const drawNextFrame = useCallback(() => {
    if (!playingRef.current) return
    const idx   = nextFrameRef.current
    const frame = frameQueueRef.current[idx]

    if (!frame) {
      if (totalRef.current > 0 && idx >= totalRef.current) {
        playingRef.current = false
        setPhase('done')
        setStatusMsg('Video sketch complete!')
        return
      }
      setTimeout(drawNextFrame, 100)
      return
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
        if (cv && onSketchReady) {
          onSketchReady(cv.toDataURL('image/jpeg', 0.7).split(',')[1])
        }
      }, 800)
    }
  }, [canvasRef, onSketchReady])

  const onFrameComplete = useCallback(() => {
    if (!playingRef.current) return
    setTimeout(drawNextFrame, 50)
  }, [drawNextFrame])

  const startAnimation = useCallback(async () => {
    if (!videoFile) return
    reset()

    setPhase('reading')
    setStatusMsg(`Uploading ${(videoFile.size/1024/1024).toFixed(1)}MB...`)

    const form = new FormData()
    form.append('file', videoFile)
    const params = new URLSearchParams({
      use_hed:         useHed ? 'true' : 'false',
      detail_level:    detailLevel,
      frame_skip:      frameSkip,
      temporal_smooth: smooth,
      output_format:   'mp4',
    })

    let jobId
    try {
      const xhr = new XMLHttpRequest()
      await new Promise((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.total) {
            const pct = Math.round(e.loaded / e.total * 100)
            setStatusMsg(`Uploading... ${pct}%`)
            setProgress(pct)
          }
        }
        xhr.onload = () => {
          if (xhr.status === 200) {
            jobId = JSON.parse(xhr.responseText).job_id
            resolve()
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('POST', `/api/video/process?${params}`)
        xhr.send(form)
      })
    } catch(e) {
      setPhase('error')
      setErrorMsg(e.message || 'Upload failed — is backend running?')
      return
    }

    setPhase('connecting')
    setStatusMsg('Connecting to stream...')
    setProgress(0)

    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws    = new WebSocket(`${proto}://${location.host}/api/video/stream/${jobId}`)
    wsRef.current      = ws
    playingRef.current = true

    ws.onopen = () => {
      setStatusMsg('Starting frame stream...')
      setPhase('streaming')
      onAnimationStart?.()
    }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'status') {
        setStatusMsg(msg.message)
      } else if (msg.type === 'meta') {
        totalRef.current = msg.total_frames
        setTotalFrames(msg.total_frames)
        setStatusMsg(`Drawing ${msg.total_frames} frames...`)
      } else if (msg.type === 'frame') {
        frameQueueRef.current.push(msg)
        if (msg.frame_index === 0) {
          canvasRef?.current?.setup(msg.width, msg.height)
          setTimeout(drawNextFrame, 100)
        }
      } else if (msg.type === 'done') {
        totalRef.current = msg.total_frames
        setTotalFrames(msg.total_frames)
        setStatusMsg('Finishing animation...')
      } else if (msg.type === 'error') {
        setPhase('error')
        setErrorMsg(msg.message)
        playingRef.current = false
      }
    }

    ws.onclose = () => {
      if (playingRef.current) setStatusMsg('Finishing remaining frames...')
    }

    ws.onerror = () => {
      setPhase('error')
      setErrorMsg('WebSocket failed — check vite.config.js has /api/video/stream proxy')
      playingRef.current = false
    }
  }, [videoFile, useHed, detailLevel, frameSkip, smooth,
      drawNextFrame, reset, canvasRef, onAnimationStart])

  const stopAnimation = useCallback(() => {
    playingRef.current = false
    wsRef.current?.close()
    setPhase('idle')
    setStatusMsg('Stopped')
    onAnimationReset?.()
  }, [onAnimationReset])

  const est = () => {
    if (!videoFile) return '?'
    const mb = videoFile.size / 1024 / 1024
    const s  = Math.round(mb * (useHed ? 25 : 4) / frameSkip)
    return s > 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`
  }

  const busy = ['reading','connecting','streaming'].includes(phase)

  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column',
      minHeight:0, overflow:'hidden',
    }}>
      {/* Scrollable content area */}
      <div style={{
        flex:1, overflowY:'auto', overflowX:'hidden',
        padding:'8px', display:'flex', flexDirection:'column', gap:5,
        minHeight:0,
      }}>

        {/* Header */}
        <div style={{padding:'8px 10px',borderRadius:9,flexShrink:0,
                     background:'linear-gradient(135deg,rgba(79,156,249,.1),rgba(167,139,250,.08))',
                     border:`1px solid ${T.blue}33`}}>
          <div style={{fontSize:11,fontWeight:800,marginBottom:2}}>🎬 Video to Sketch</div>
          <div style={{fontSize:8,color:T.sub,lineHeight:1.7}}>
            Each frame draws stroke-by-stroke on the right canvas live.
          </div>
        </div>

        {/* Drop zone — compact */}
        <div onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)} onDrop={onDrop}
          onClick={()=>!videoFile&&fileInputRef.current?.click()}
          style={{border:`2px dashed ${dragging?T.gold:T.border}`,
                  borderRadius:9,background:dragging?T.goldD:'#080810',
                  cursor:videoFile?'default':'pointer',
                  padding:'10px 12px',flexShrink:0,
                  display:'flex',alignItems:'center',gap:10,
                  transition:'all .18s'}}>
          {videoFile ? (
            <>
              <span style={{fontSize:20,flexShrink:0}}>🎬</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:9,color:T.text,fontWeight:600,
                             overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {videoFile.name}
                </div>
                <div style={{fontSize:8,color:T.sub,fontFamily:'monospace',marginTop:1}}>
                  {(videoFile.size/1024/1024).toFixed(1)} MB · ~{est()}
                </div>
              </div>
              <button onClick={e=>{e.stopPropagation();setVideoFile(null);reset()}}
                style={{background:'rgba(255,255,255,.1)',color:'#aaa',border:'none',
                        borderRadius:5,padding:'3px 8px',fontSize:8,cursor:'pointer',
                        flexShrink:0}}>
                ✕
              </button>
            </>
          ):(
            <div style={{width:'100%',textAlign:'center',padding:'8px 0'}}>
              <div style={{fontSize:20,opacity:.12,marginBottom:3}}>🎬</div>
              <div style={{fontSize:10,color:'#333'}}>Drop video or click to browse</div>
              <div style={{fontSize:8,color:'#222',marginTop:1}}>MP4 · MOV · AVI · WEBM · max 500MB</div>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
          style={{display:'none'}}
          onChange={e=>{if(e.target.files[0]){setVideoFile(e.target.files[0]);reset()}}}/>

        {/* Edge Settings */}
        <VCard title="Edge Settings">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <div>
              <div style={{fontSize:10,color:useHed?T.blue:T.sub,fontWeight:useHed?600:400}}>
                🧠 HED Neural
              </div>
              <div style={{fontSize:8,color:useHed?T.orange:T.dim}}>
                {useHed?'WARNING: Very slow for video':'Fast classical — recommended'}
              </div>
            </div>
            <Toggle value={useHed} onChange={setUseHed} color={T.blue}/>
          </div>
          <SliderRow label="Edge Detail" value={detailLevel} min={1} max={5} step={1}
            display={DETAIL_LABELS[detailLevel]+` (${detailLevel})`}
            hint="Lower = cleaner for video (2 recommended)"
            color={useHed?T.blue:T.gold} onChange={setDetailLevel}/>
        </VCard>

        {/* Performance */}
        <VCard title="Performance">
          <SliderRow label="Frame Skip" value={frameSkip} min={1} max={8} step={1}
            display={frameSkip===1?'Every frame':`Every ${frameSkip} frames`}
            hint={`Processes ~${Math.round(100/frameSkip)}% of frames`}
            color={T.orange} onChange={setFrameSkip}/>
          <SliderRow label="Temporal Smooth" value={smooth} min={0} max={1} step={0.1}
            display={`${Math.round(smooth*100)}%`}
            hint="Higher = less flicker between frames"
            color={T.purple} onChange={setSmooth}/>
          <SliderRow label="Draw Speed" value={drawSpeed} min={3} max={9} step={1}
            display={SPEED_LABELS[drawSpeed]}
            hint="Speed of stroke animation per frame"
            color={T.gold} onChange={setDrawSpeed}/>
        </VCard>

        {/* Pen Style */}
        <VCard title="Pen Style">
          <div style={{display:'flex',gap:3}}>
            {[['pencil','✏️','Pencil'],['charcoal','🖤','Charcoal'],
              ['ink','🖊️','Ink'],['brush','🖌️','Brush']].map(([id,em,lbl])=>(
              <button key={id} onClick={()=>setPenStyle(id)} style={{
                flex:1,padding:'5px 2px',borderRadius:7,fontSize:8,
                border:`1px solid ${penStyle===id?T.gold:T.border}`,
                background:penStyle===id?T.goldD:'#0a0a0f',
                color:penStyle===id?T.gold:T.sub,
                cursor:'pointer',fontFamily:'inherit',
                display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
                <span style={{fontSize:11}}>{em}</span>{lbl}
              </button>
            ))}
          </div>
        </VCard>

        {/* Status */}
        {busy && (
          <VCard>
            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
              <Spinner color={phase==='reading'?T.gold:T.blue}/>
              <span style={{fontSize:10,color:T.blue,fontWeight:600,
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {statusMsg || 'Processing...'}
              </span>
            </div>
            <ProgressBar pct={progress} color={phase==='reading'?T.gold:T.blue}/>
            {totalFrames>0 && (
              <div style={{fontSize:8,color:T.sub,marginTop:3,fontFamily:'monospace'}}>
                Frame {frameNum} / {totalFrames}
              </div>
            )}
          </VCard>
        )}

        {phase==='done' && (
          <VCard>
            <div style={{color:T.green,fontWeight:700,fontSize:11,marginBottom:5}}>
              ✓ {frameNum} frames animated!
            </div>
            <button onClick={reset} style={{
              width:'100%',padding:6,borderRadius:7,
              border:`1px solid ${T.border}`,background:'transparent',
              color:T.sub,fontSize:9,cursor:'pointer'}}>
              Process another video
            </button>
          </VCard>
        )}

        {phase==='error' && (
          <VCard>
            <div style={{color:T.red,fontWeight:700,fontSize:10,marginBottom:4}}>⚠️ Error</div>
            <div style={{fontSize:8,color:'#cc5555',lineHeight:1.7,marginBottom:6,
                         wordBreak:'break-word'}}>{errorMsg}</div>
            <button onClick={reset} style={{
              width:'100%',padding:6,borderRadius:7,
              border:`1px solid ${T.red}44`,background:T.redD,
              color:T.red,fontSize:9,cursor:'pointer'}}>Try Again</button>
          </VCard>
        )}

        {phase==='idle' && (
          <VCard title="Tips for best results">
            <div style={{fontSize:8,color:T.sub,lineHeight:1.9}}>
              ✓ Use <strong style={{color:T.gold}}>Canny</strong> — 5x faster than HED<br/>
              ✓ <strong style={{color:T.gold}}>Detail Level 2</strong> — less noise<br/>
              ✓ <strong style={{color:T.gold}}>Frame Skip 3</strong> — 3x faster<br/>
              ✓ <strong style={{color:T.gold}}>Smooth 50%+</strong> — less flicker<br/>
              ✓ 720p video = best quality + speed<br/>
              ✓ Person walking = great test<br/>
              ✓ Keep under 30 seconds
            </div>
          </VCard>
        )}
      </div>

      {/* Action button — fixed at bottom, never scrolls away */}
      <div style={{padding:'9px',borderTop:`1px solid ${T.border}`,
                   background:T.panel,flexShrink:0}}>
        {busy ? (
          <button onClick={stopAnimation} style={{
            width:'100%',padding:11,borderRadius:9,
            border:`1px solid ${T.red}44`,background:T.redD,
            color:T.red,fontSize:12,fontWeight:700,cursor:'pointer'}}>
            ⏹ Stop
          </button>
        ):(
          <button onClick={startAnimation} disabled={!videoFile} style={{
            width:'100%',padding:11,borderRadius:9,border:'none',
            background:videoFile?`linear-gradient(135deg,${T.blue},#2563eb)`:'#0e0e18',
            color:videoFile?'#fff':'#2a2a3a',fontSize:12,fontWeight:800,
            cursor:videoFile?'pointer':'not-allowed',
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            boxShadow:videoFile?`0 4px 20px ${T.blue}55`:'none',
            transition:'all .25s'}}>
            {videoFile?'🎬 Animate Sketch':'Upload a video first'}
          </button>
        )}
        <div style={{textAlign:'center',marginTop:3,fontSize:7,color:T.sub,fontFamily:'monospace'}}>
          HTTP upload + WebSocket frame stream
        </div>
      </div>
    </div>
  )
}

function VCard({title,children}){
  return(
    <div style={{borderRadius:9,background:T.card,border:`1px solid ${T.border}`,
                 overflow:'hidden',flexShrink:0}}>
      {title&&<div style={{padding:'5px 10px',borderBottom:`1px solid ${T.border}`,
                           fontSize:8,color:T.sub,letterSpacing:'.12em',
                           textTransform:'uppercase',fontFamily:'monospace'}}>{title}</div>}
      <div style={{padding:'9px 10px'}}>{children}</div>
    </div>
  )
}

function SliderRow({label,value,min,max,step,display,hint,color,onChange}){
  return(
    <div style={{marginBottom:9}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontSize:9,color:T.sub}}>{label}</span>
        <span style={{fontSize:9,color:color||T.gold,fontFamily:'monospace'}}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(Number(e.target.value))} style={{width:'100%'}}/>
      {hint&&<div style={{fontSize:7,color:T.dim,marginTop:1}}>{hint}</div>}
    </div>
  )
}

function Toggle({value,onChange,color}){
  return(
    <div onClick={()=>onChange(!value)} style={{width:36,height:20,borderRadius:10,
      flexShrink:0,background:value?color:'#1e1e2a',cursor:'pointer',position:'relative',
      transition:'background .2s',boxShadow:value?`0 0 8px ${color}66`:'none'}}>
      <div style={{position:'absolute',top:2,left:value?17:2,width:16,height:16,
                   borderRadius:'50%',background:'#fff',transition:'left .2s',
                   boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
    </div>
  )
}

function ProgressBar({pct,color}){
  return(
    <div style={{height:4,borderRadius:2,background:T.dim,overflow:'hidden'}}>
      <div style={{width:`${pct}%`,height:'100%',borderRadius:2,
                   background:color,transition:'width .3s'}}/>
    </div>
  )
}

function Spinner({color}){
  return(
    <div style={{width:10,height:10,borderRadius:'50%',flexShrink:0,
                 border:'2px solid #1e1e2a',borderTopColor:color||T.gold,
                 animation:'spin .65s linear infinite'}}/>
  )
}







// import { useState, useRef, useCallback, useEffect } from 'react'

// const T = {
//   bg:'#07070c', panel:'#0d0d16', card:'#11111e', border:'#1a1a2e',
//   gold:'#f5c542', goldD:'rgba(245,197,66,.1)',
//   blue:'#4f9cf9', blueD:'rgba(79,156,249,.1)',
//   green:'#34d399', greenD:'rgba(52,211,153,.1)',
//   red:'#f87171', redD:'rgba(248,113,113,.1)',
//   orange:'#fb923c', orangeD:'rgba(251,146,60,.1)',
//   purple:'#a78bfa',
//   text:'#ece8e0', sub:'#5a5a72', dim:'#1e1e30',
// }

// const DETAIL_LABELS = ['','Minimal','Light','Medium','Detailed','Maximum']
// const SPEED_LABELS  = ['','Slowest','Slow','Normal','Medium','Fast','Faster','Quick','Rapid','Max']

// export default function VideoTab({ onSketchReady, canvasRef, onAnimationStart, onAnimationReset }) {
//   const fileInputRef  = useRef(null)
//   const wsRef         = useRef(null)
//   const frameQueueRef = useRef([])
//   const playingRef    = useRef(false)
//   const nextFrameRef  = useRef(0)
//   const totalRef      = useRef(0)
//   const wsClosedRef   = useRef(false)  // true when backend sent all frames

//   const [videoFile,   setVideoFile]   = useState(null)
//   const [dragging,    setDragging]    = useState(false)
//   const [useHed,      setUseHed]      = useState(false)
//   const [detailLevel, setDetailLevel] = useState(2)
//   const [frameSkip,   setFrameSkip]   = useState(3)
//   const [smooth,      setSmooth]      = useState(0.5)
//   const [drawSpeed,   setDrawSpeed]   = useState(7)
//   const [penStyle,    setPenStyle]    = useState('pencil')
//   const [phase,       setPhase]       = useState('idle')
//   const [progress,    setProgress]    = useState(0)
//   const [statusMsg,   setStatusMsg]   = useState('')
//   const [frameNum,    setFrameNum]    = useState(0)
//   const [totalFrames, setTotalFrames] = useState(0)
//   const [errorMsg,    setErrorMsg]    = useState('')

//   useEffect(() => () => {
//     wsRef.current?.close()
//     playingRef.current = false
//   }, [])

//   const reset = useCallback(() => {
//     wsRef.current?.close(); wsRef.current = null
//     playingRef.current = false
//     frameQueueRef.current = []
//     nextFrameRef.current  = 0
//     totalRef.current      = 0
//     wsClosedRef.current   = false
//     canvasRef?.current?.reset()
//     onAnimationReset?.()
//     setPhase('idle'); setProgress(0)
//     setStatusMsg(''); setFrameNum(0); setTotalFrames(0); setErrorMsg('')
//   }, [canvasRef, onAnimationReset])

//   const onDrop = useCallback((e) => {
//     e.preventDefault(); setDragging(false)
//     const f = e.dataTransfer.files[0]
//     if (f && f.type.startsWith('video/')) { setVideoFile(f); reset() }
//     else alert('Please drop a video file (MP4, MOV, AVI, WEBM)')
//   }, [reset])

//   const drawNextFrame = useCallback(() => {
//     if (!playingRef.current) return
//     const idx   = nextFrameRef.current
//     const queue = frameQueueRef.current
//     const frame = queue[idx]

//     if (!frame) {
//       // No frame at this index yet
//       const allReceived = wsClosedRef.current
//       const noMore      = totalRef.current > 0 && idx >= totalRef.current

//       if (allReceived || noMore) {
//         // All frames drawn — mark complete
//         playingRef.current = false
//         setPhase('done')
//         setStatusMsg('')
//         setProgress(100)
//         return
//       }
//       // Still waiting for more frames from backend
//       setTimeout(drawNextFrame, 120)
//       return
//     }

//     const { width, height, paths, frame_index } = frame
//     canvasRef?.current?.reset()
//     canvasRef?.current?.setup(width, height)
//     canvasRef?.current?.addPaths(paths)
//     canvasRef?.current?.start()
//     nextFrameRef.current = idx + 1

//     const total = Math.max(totalRef.current, queue.length, 1)
//     setFrameNum(frame_index + 1)
//     setProgress(Math.round((frame_index + 1) / total * 100))

//     if (frame_index === 0) {
//       setTimeout(() => {
//         const cv = document.querySelector('canvas')
//         if (cv && onSketchReady) {
//           onSketchReady(cv.toDataURL('image/jpeg', 0.7).split(',')[1])
//         }
//       }, 800)
//     }

//     // Poll until this frame finishes drawing, then draw next frame
//     const waitForFrameDone = () => {
//       if (!playingRef.current) return
//       const done = canvasRef?.current?.isDone?.()
//       if (done) {
//         setTimeout(drawNextFrame, 40)
//       } else {
//         setTimeout(waitForFrameDone, 50)
//       }
//     }
//     setTimeout(waitForFrameDone, 100)

//   }, [canvasRef, onSketchReady])

//   // Legacy — kept for compatibility
//   const onFrameComplete = useCallback(() => {
//     if (!playingRef.current) return
//     setTimeout(drawNextFrame, 40)
//   }, [drawNextFrame])

//   const startAnimation = useCallback(async () => {
//     if (!videoFile) return
//     reset()

//     setPhase('reading')
//     setStatusMsg(`Uploading ${(videoFile.size/1024/1024).toFixed(1)}MB...`)

//     const form = new FormData()
//     form.append('file', videoFile)
//     const params = new URLSearchParams({
//       use_hed:         useHed ? 'true' : 'false',
//       detail_level:    detailLevel,
//       frame_skip:      frameSkip,
//       temporal_smooth: smooth,
//       output_format:   'mp4',
//     })

//     let jobId
//     try {
//       const xhr = new XMLHttpRequest()
//       await new Promise((resolve, reject) => {
//         xhr.upload.onprogress = (e) => {
//           if (e.total) {
//             const pct = Math.round(e.loaded / e.total * 100)
//             setStatusMsg(`Uploading... ${pct}%`)
//             setProgress(pct)
//           }
//         }
//         xhr.onload = () => {
//           if (xhr.status === 200) {
//             jobId = JSON.parse(xhr.responseText).job_id
//             resolve()
//           } else {
//             reject(new Error(`Upload failed: ${xhr.status}`))
//           }
//         }
//         xhr.onerror = () => reject(new Error('Upload failed'))
//         xhr.open('POST', `/api/video/process?${params}`)
//         xhr.send(form)
//       })
//     } catch(e) {
//       setPhase('error')
//       setErrorMsg(e.message || 'Upload failed — is backend running?')
//       return
//     }

//     setPhase('connecting')
//     setStatusMsg('Connecting to stream...')
//     setProgress(0)

//     const proto = location.protocol === 'https:' ? 'wss' : 'ws'
//     const ws    = new WebSocket(`${proto}://${location.host}/api/video/stream/${jobId}`)
//     wsRef.current      = ws
//     playingRef.current = true

//     ws.onopen = () => {
//       setStatusMsg('Starting frame stream...')
//       setPhase('streaming')
//       onAnimationStart?.()
//     }

//     ws.onmessage = (e) => {
//       const msg = JSON.parse(e.data)
//       if (msg.type === 'status') {
//         setStatusMsg(msg.message)
//       } else if (msg.type === 'meta') {
//         totalRef.current = msg.total_frames
//         setTotalFrames(msg.total_frames)
//         setStatusMsg(`Drawing ${msg.total_frames} frames...`)
//       } else if (msg.type === 'frame') {
//         frameQueueRef.current.push(msg)
//         if (msg.frame_index === 0) {
//           canvasRef?.current?.setup(msg.width, msg.height)
//           setTimeout(drawNextFrame, 100)
//         }
//       } else if (msg.type === 'done') {
//         totalRef.current = msg.total_frames
//         setTotalFrames(msg.total_frames)
//         wsClosedRef.current = true
//         setStatusMsg('Drawing remaining frames...')
//       } else if (msg.type === 'error') {
//         setPhase('error')
//         setErrorMsg(msg.message)
//         playingRef.current = false
//       }
//     }

//     ws.onclose = () => {
//       wsClosedRef.current = true
//       if (playingRef.current) setStatusMsg('Drawing remaining frames...')
//     }

//     ws.onerror = () => {
//       setPhase('error')
//       setErrorMsg('WebSocket failed — check vite.config.js has /api/video/stream proxy')
//       playingRef.current = false
//     }
//   }, [videoFile, useHed, detailLevel, frameSkip, smooth,
//       drawNextFrame, reset, canvasRef, onAnimationStart])

//   const stopAnimation = useCallback(() => {
//     playingRef.current = false
//     wsRef.current?.close()
//     setPhase('idle')
//     setStatusMsg('Stopped')
//     onAnimationReset?.()
//   }, [onAnimationReset])

//   const est = () => {
//     if (!videoFile) return '?'
//     const mb = videoFile.size / 1024 / 1024
//     const s  = Math.round(mb * (useHed ? 25 : 4) / frameSkip)
//     return s > 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`
//   }

//   const busy = ['reading','connecting','streaming'].includes(phase)

//   return (
//     <div style={{
//       flex:1, display:'flex', flexDirection:'column',
//       minHeight:0, overflow:'hidden',
//     }}>
//       {/* Scrollable content area */}
//       <div style={{
//         flex:1, overflowY:'auto', overflowX:'hidden',
//         padding:'8px', display:'flex', flexDirection:'column', gap:5,
//         minHeight:0,
//       }}>

//         {/* Header */}
//         <div style={{padding:'8px 10px',borderRadius:9,flexShrink:0,
//                      background:'linear-gradient(135deg,rgba(79,156,249,.1),rgba(167,139,250,.08))',
//                      border:`1px solid ${T.blue}33`}}>
//           <div style={{fontSize:11,fontWeight:800,marginBottom:2}}>🎬 Video to Sketch</div>
//           <div style={{fontSize:8,color:T.sub,lineHeight:1.7}}>
//             Each frame draws stroke-by-stroke on the right canvas live.
//           </div>
//         </div>

//         {/* Drop zone — compact */}
//         <div onDragOver={e=>{e.preventDefault();setDragging(true)}}
//           onDragLeave={()=>setDragging(false)} onDrop={onDrop}
//           onClick={()=>!videoFile&&fileInputRef.current?.click()}
//           style={{border:`2px dashed ${dragging?T.gold:T.border}`,
//                   borderRadius:9,background:dragging?T.goldD:'#080810',
//                   cursor:videoFile?'default':'pointer',
//                   padding:'10px 12px',flexShrink:0,
//                   display:'flex',alignItems:'center',gap:10,
//                   transition:'all .18s'}}>
//           {videoFile ? (
//             <>
//               <span style={{fontSize:20,flexShrink:0}}>🎬</span>
//               <div style={{flex:1,minWidth:0}}>
//                 <div style={{fontSize:9,color:T.text,fontWeight:600,
//                              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
//                   {videoFile.name}
//                 </div>
//                 <div style={{fontSize:8,color:T.sub,fontFamily:'monospace',marginTop:1}}>
//                   {(videoFile.size/1024/1024).toFixed(1)} MB · ~{est()}
//                 </div>
//               </div>
//               <button onClick={e=>{e.stopPropagation();setVideoFile(null);reset()}}
//                 style={{background:'rgba(255,255,255,.1)',color:'#aaa',border:'none',
//                         borderRadius:5,padding:'3px 8px',fontSize:8,cursor:'pointer',
//                         flexShrink:0}}>
//                 ✕
//               </button>
//             </>
//           ):(
//             <div style={{width:'100%',textAlign:'center',padding:'8px 0'}}>
//               <div style={{fontSize:20,opacity:.12,marginBottom:3}}>🎬</div>
//               <div style={{fontSize:10,color:'#333'}}>Drop video or click to browse</div>
//               <div style={{fontSize:8,color:'#222',marginTop:1}}>MP4 · MOV · AVI · WEBM · max 500MB</div>
//             </div>
//           )}
//         </div>
//         <input ref={fileInputRef} type="file"
//           accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
//           style={{display:'none'}}
//           onChange={e=>{if(e.target.files[0]){setVideoFile(e.target.files[0]);reset()}}}/>

//         {/* Edge Settings */}
//         <VCard title="Edge Settings">
//           <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
//             <div>
//               <div style={{fontSize:10,color:useHed?T.blue:T.sub,fontWeight:useHed?600:400}}>
//                 🧠 HED Neural
//               </div>
//               <div style={{fontSize:8,color:useHed?T.orange:T.dim}}>
//                 {useHed?'WARNING: Very slow for video':'Fast classical — recommended'}
//               </div>
//             </div>
//             <Toggle value={useHed} onChange={setUseHed} color={T.blue}/>
//           </div>
//           <SliderRow label="Edge Detail" value={detailLevel} min={1} max={5} step={1}
//             display={DETAIL_LABELS[detailLevel]+` (${detailLevel})`}
//             hint="Lower = cleaner for video (2 recommended)"
//             color={useHed?T.blue:T.gold} onChange={setDetailLevel}/>
//         </VCard>

//         {/* Performance */}
//         <VCard title="Performance">
//           <SliderRow label="Frame Skip" value={frameSkip} min={1} max={8} step={1}
//             display={frameSkip===1?'Every frame':`Every ${frameSkip} frames`}
//             hint={`Processes ~${Math.round(100/frameSkip)}% of frames`}
//             color={T.orange} onChange={setFrameSkip}/>
//           <SliderRow label="Temporal Smooth" value={smooth} min={0} max={1} step={0.1}
//             display={`${Math.round(smooth*100)}%`}
//             hint="Higher = less flicker between frames"
//             color={T.purple} onChange={setSmooth}/>
//           <SliderRow label="Draw Speed" value={drawSpeed} min={3} max={9} step={1}
//             display={SPEED_LABELS[drawSpeed]}
//             hint="Speed of stroke animation per frame"
//             color={T.gold} onChange={setDrawSpeed}/>
//         </VCard>

//         {/* Pen Style */}
//         <VCard title="Pen Style">
//           <div style={{display:'flex',gap:3}}>
//             {[['pencil','✏️','Pencil'],['charcoal','🖤','Charcoal'],
//               ['ink','🖊️','Ink'],['brush','🖌️','Brush']].map(([id,em,lbl])=>(
//               <button key={id} onClick={()=>setPenStyle(id)} style={{
//                 flex:1,padding:'5px 2px',borderRadius:7,fontSize:8,
//                 border:`1px solid ${penStyle===id?T.gold:T.border}`,
//                 background:penStyle===id?T.goldD:'#0a0a0f',
//                 color:penStyle===id?T.gold:T.sub,
//                 cursor:'pointer',fontFamily:'inherit',
//                 display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
//                 <span style={{fontSize:11}}>{em}</span>{lbl}
//               </button>
//             ))}
//           </div>
//         </VCard>

//         {/* Status */}
//         {busy && (
//           <VCard>
//             <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
//               <Spinner color={phase==='reading'?T.gold:T.blue}/>
//               <span style={{fontSize:10,color:T.blue,fontWeight:600,
//                             overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
//                 {statusMsg || 'Processing...'}
//               </span>
//             </div>
//             <ProgressBar pct={progress} color={phase==='reading'?T.gold:T.blue}/>
//             {totalFrames>0 && (
//               <div style={{fontSize:8,color:T.sub,marginTop:3,fontFamily:'monospace'}}>
//                 Frame {frameNum} / {totalFrames}
//               </div>
//             )}
//           </VCard>
//         )}

//         {phase==='done' && (
//           <VCard>
//             <div style={{color:T.green,fontWeight:700,fontSize:12,marginBottom:6,
//                          display:'flex',alignItems:'center',gap:6}}>
//               <span style={{fontSize:16}}>✓</span>
//               Video sketch complete!
//             </div>
//             <div style={{fontSize:9,color:T.sub,marginBottom:8,fontFamily:'monospace'}}>
//               {frameNum} frames animated successfully
//             </div>
//             <ProgressBar pct={100} color={T.green}/>
//             <div style={{marginTop:8}}>
//               <button onClick={reset} style={{
//                 width:'100%',padding:7,borderRadius:7,
//                 border:`1px solid ${T.border}`,background:'transparent',
//                 color:T.sub,fontSize:9,cursor:'pointer'}}>
//                 Process another video
//               </button>
//             </div>
//           </VCard>
//         )}

//         {phase==='error' && (
//           <VCard>
//             <div style={{color:T.red,fontWeight:700,fontSize:10,marginBottom:4}}>⚠️ Error</div>
//             <div style={{fontSize:8,color:'#cc5555',lineHeight:1.7,marginBottom:6,
//                          wordBreak:'break-word'}}>{errorMsg}</div>
//             <button onClick={reset} style={{
//               width:'100%',padding:6,borderRadius:7,
//               border:`1px solid ${T.red}44`,background:T.redD,
//               color:T.red,fontSize:9,cursor:'pointer'}}>Try Again</button>
//           </VCard>
//         )}

//         {phase==='idle' && (
//           <VCard title="Tips for best results">
//             <div style={{fontSize:8,color:T.sub,lineHeight:1.9}}>
//               ✓ Use <strong style={{color:T.gold}}>Canny</strong> — 5x faster than HED<br/>
//               ✓ <strong style={{color:T.gold}}>Detail Level 2</strong> — less noise<br/>
//               ✓ <strong style={{color:T.gold}}>Frame Skip 3</strong> — 3x faster<br/>
//               ✓ <strong style={{color:T.gold}}>Smooth 50%+</strong> — less flicker<br/>
//               ✓ 720p video = best quality + speed<br/>
//               ✓ Person walking = great test<br/>
//               ✓ Keep under 30 seconds
//             </div>
//           </VCard>
//         )}
//       </div>

//       {/* Action button — fixed at bottom, never scrolls away */}
//       <div style={{padding:'9px',borderTop:`1px solid ${T.border}`,
//                    background:T.panel,flexShrink:0}}>
//         {busy ? (
//           <button onClick={stopAnimation} style={{
//             width:'100%',padding:11,borderRadius:9,
//             border:`1px solid ${T.red}44`,background:T.redD,
//             color:T.red,fontSize:12,fontWeight:700,cursor:'pointer'}}>
//             ⏹ Stop
//           </button>
//         ):(
//           <button onClick={startAnimation} disabled={!videoFile} style={{
//             width:'100%',padding:11,borderRadius:9,border:'none',
//             background:videoFile?`linear-gradient(135deg,${T.blue},#2563eb)`:'#0e0e18',
//             color:videoFile?'#fff':'#2a2a3a',fontSize:12,fontWeight:800,
//             cursor:videoFile?'pointer':'not-allowed',
//             display:'flex',alignItems:'center',justifyContent:'center',gap:8,
//             boxShadow:videoFile?`0 4px 20px ${T.blue}55`:'none',
//             transition:'all .25s'}}>
//             {videoFile?'🎬 Animate Sketch':'Upload a video first'}
//           </button>
//         )}
//         <div style={{textAlign:'center',marginTop:3,fontSize:7,color:T.sub,fontFamily:'monospace'}}>
//           HTTP upload + WebSocket frame stream
//         </div>
//       </div>
//     </div>
//   )
// }

// function VCard({title,children}){
//   return(
//     <div style={{borderRadius:9,background:T.card,border:`1px solid ${T.border}`,
//                  overflow:'hidden',flexShrink:0}}>
//       {title&&<div style={{padding:'5px 10px',borderBottom:`1px solid ${T.border}`,
//                            fontSize:8,color:T.sub,letterSpacing:'.12em',
//                            textTransform:'uppercase',fontFamily:'monospace'}}>{title}</div>}
//       <div style={{padding:'9px 10px'}}>{children}</div>
//     </div>
//   )
// }

// function SliderRow({label,value,min,max,step,display,hint,color,onChange}){
//   return(
//     <div style={{marginBottom:9}}>
//       <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
//         <span style={{fontSize:9,color:T.sub}}>{label}</span>
//         <span style={{fontSize:9,color:color||T.gold,fontFamily:'monospace'}}>{display}</span>
//       </div>
//       <input type="range" min={min} max={max} step={step} value={value}
//         onChange={e=>onChange(Number(e.target.value))} style={{width:'100%'}}/>
//       {hint&&<div style={{fontSize:7,color:T.dim,marginTop:1}}>{hint}</div>}
//     </div>
//   )
// }

// function Toggle({value,onChange,color}){
//   return(
//     <div onClick={()=>onChange(!value)} style={{width:36,height:20,borderRadius:10,
//       flexShrink:0,background:value?color:'#1e1e2a',cursor:'pointer',position:'relative',
//       transition:'background .2s',boxShadow:value?`0 0 8px ${color}66`:'none'}}>
//       <div style={{position:'absolute',top:2,left:value?17:2,width:16,height:16,
//                    borderRadius:'50%',background:'#fff',transition:'left .2s',
//                    boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
//     </div>
//   )
// }

// function ProgressBar({pct,color}){
//   return(
//     <div style={{height:4,borderRadius:2,background:T.dim,overflow:'hidden'}}>
//       <div style={{width:`${pct}%`,height:'100%',borderRadius:2,
//                    background:color,transition:'width .3s'}}/>
//     </div>
//   )
// }

// function Spinner({color}){
//   return(
//     <div style={{width:10,height:10,borderRadius:'50%',flexShrink:0,
//                  border:'2px solid #1e1e2a',borderTopColor:color||T.gold,
//                  animation:'spin .65s linear infinite'}}/>
//   )
// }





// import { useState, useRef, useCallback, useEffect } from 'react'

// const T = {
//   bg:'#07070c', panel:'#0d0d16', card:'#11111e', border:'#1a1a2e',
//   gold:'#f5c542', goldD:'rgba(245,197,66,.1)',
//   blue:'#4f9cf9', blueD:'rgba(79,156,249,.1)',
//   green:'#34d399', greenD:'rgba(52,211,153,.1)',
//   red:'#f87171', redD:'rgba(248,113,113,.1)',
//   orange:'#fb923c', orangeD:'rgba(251,146,60,.1)',
//   purple:'#a78bfa',
//   text:'#ece8e0', sub:'#5a5a72', dim:'#1e1e30',
// }

// const DETAIL_LABELS = ['','Minimal','Light','Medium','Detailed','Maximum']
// const SPEED_LABELS  = ['','Slowest','Slow','Normal','Medium','Fast','Faster','Quick','Rapid','Max']

// export default function VideoTab({ onSketchReady, canvasRef, onAnimationStart, onAnimationReset }) {
//   const fileInputRef  = useRef(null)
//   const wsRef         = useRef(null)
//   const frameQueueRef = useRef([])
//   const playingRef    = useRef(false)
//   const nextFrameRef  = useRef(0)
//   const totalRef      = useRef(0)
//   const wsClosedRef   = useRef(false)  // true when backend sent all frames

//   const [videoFile,   setVideoFile]   = useState(null)
//   const [dragging,    setDragging]    = useState(false)
//   const [useHed,      setUseHed]      = useState(false)
//   const [detailLevel, setDetailLevel] = useState(2)
//   const [frameSkip,   setFrameSkip]   = useState(3)
//   const [smooth,      setSmooth]      = useState(0.5)
//   const [drawSpeed,   setDrawSpeed]   = useState(7)
//   const [penStyle,    setPenStyle]    = useState('pencil')
//   const [phase,       setPhase]       = useState('idle')
//   const [progress,    setProgress]    = useState(0)
//   const [statusMsg,   setStatusMsg]   = useState('')
//   const [frameNum,    setFrameNum]    = useState(0)
//   const [totalFrames, setTotalFrames] = useState(0)
//   const [errorMsg,    setErrorMsg]    = useState('')

//   useEffect(() => () => {
//     wsRef.current?.close()
//     playingRef.current = false
//   }, [])

//   const reset = useCallback(() => {
//     wsRef.current?.close(); wsRef.current = null
//     playingRef.current = false
//     frameQueueRef.current = []
//     nextFrameRef.current  = 0
//     totalRef.current      = 0
//     wsClosedRef.current   = false
//     canvasRef?.current?.reset()
//     onAnimationReset?.()
//     setPhase('idle'); setProgress(0)
//     setStatusMsg(''); setFrameNum(0); setTotalFrames(0); setErrorMsg('')
//   }, [canvasRef, onAnimationReset])

//   const onDrop = useCallback((e) => {
//     e.preventDefault(); setDragging(false)
//     const f = e.dataTransfer.files[0]
//     if (f && f.type.startsWith('video/')) { setVideoFile(f); reset() }
//     else alert('Please drop a video file (MP4, MOV, AVI, WEBM)')
//   }, [reset])

//   // Collect all paths then draw ONCE as a single sketch
//   const drawAllAtOnce = useCallback((allPaths) => {
//     if (!allPaths.length) return
//     // Find the canvas dimensions from first frame
//     const firstFrame = frameQueueRef.current[0]
//     if (!firstFrame) return
//     canvasRef?.current?.reset()
//     canvasRef?.current?.setup(firstFrame.width, firstFrame.height)
//     // Add ALL paths from ALL frames at once
//     canvasRef?.current?.addPaths(allPaths)
//     canvasRef?.current?.start()
//     setProgress(100)
//     playingRef.current = false
//     setPhase('done')
//     setStatusMsg('')
//   }, [canvasRef])

//   // Called when a new frame arrives — just buffer it
//   // When all frames received, draw everything at once
//   const checkAndDrawAll = useCallback(() => {
//     if (!wsClosedRef.current) return  // still receiving frames
//     const allPaths = []
//     for (const frame of frameQueueRef.current) {
//       for (const path of frame.paths) {
//         allPaths.push(path)
//       }
//     }
//     if (allPaths.length > 0) {
//       // Deduplicate and limit total strokes
//       const maxStrokes = 1200
//       let finalPaths = allPaths
//       if (finalPaths.length > maxStrokes) {
//         const step = finalPaths.length / maxStrokes
//         finalPaths = Array.from({length: maxStrokes},
//           (_, i) => finalPaths[Math.floor(i * step)])
//       }
//       setStatusMsg(`Drawing ${finalPaths.length} strokes from ${frameQueueRef.current.length} frames...`)
//       setTimeout(() => drawAllAtOnce(finalPaths), 100)
//     }
//   }, [drawAllAtOnce])

//   const startAnimation = useCallback(async () => {
//     if (!videoFile) return
//     reset()

//     setPhase('reading')
//     setStatusMsg(`Uploading ${(videoFile.size/1024/1024).toFixed(1)}MB...`)

//     const form = new FormData()
//     form.append('file', videoFile)
//     const params = new URLSearchParams({
//       use_hed:         useHed ? 'true' : 'false',
//       detail_level:    detailLevel,
//       frame_skip:      frameSkip,
//       temporal_smooth: smooth,
//       output_format:   'mp4',
//     })

//     let jobId
//     try {
//       const xhr = new XMLHttpRequest()
//       await new Promise((resolve, reject) => {
//         xhr.upload.onprogress = (e) => {
//           if (e.total) {
//             const pct = Math.round(e.loaded / e.total * 100)
//             setStatusMsg(`Uploading... ${pct}%`)
//             setProgress(pct)
//           }
//         }
//         xhr.onload = () => {
//           if (xhr.status === 200) {
//             jobId = JSON.parse(xhr.responseText).job_id
//             resolve()
//           } else {
//             reject(new Error(`Upload failed: ${xhr.status}`))
//           }
//         }
//         xhr.onerror = () => reject(new Error('Upload failed'))
//         xhr.open('POST', `/api/video/process?${params}`)
//         xhr.send(form)
//       })
//     } catch(e) {
//       setPhase('error')
//       setErrorMsg(e.message || 'Upload failed — is backend running?')
//       return
//     }

//     setPhase('connecting')
//     setStatusMsg('Connecting to stream...')
//     setProgress(0)

//     const proto = location.protocol === 'https:' ? 'wss' : 'ws'
//     const ws    = new WebSocket(`${proto}://${location.host}/api/video/stream/${jobId}`)
//     wsRef.current      = ws
//     playingRef.current = true

//     ws.onopen = () => {
//       setStatusMsg('Collecting frames from backend...')
//       setPhase('streaming')
//       onAnimationStart?.()  // show canvas
//     }

//     ws.onmessage = (e) => {
//       const msg = JSON.parse(e.data)
//       if (msg.type === 'status') {
//         setStatusMsg(msg.message)
//       } else if (msg.type === 'meta') {
//         totalRef.current = msg.total_frames
//         setTotalFrames(msg.total_frames)
//         setStatusMsg(`Drawing ${msg.total_frames} frames...`)
//       } else if (msg.type === 'frame') {
//         frameQueueRef.current.push(msg)
//         const collected = frameQueueRef.current.length
//         const tot       = totalRef.current || '?'
//         setFrameNum(collected)
//         setStatusMsg(`Collecting frames... ${collected}/${tot}`)
//         if (totalRef.current > 0) {
//           setProgress(Math.round(collected / totalRef.current * 90))
//         }
//       } else if (msg.type === 'done') {
//         totalRef.current = msg.total_frames
//         setTotalFrames(msg.total_frames)
//         wsClosedRef.current = true
//         setStatusMsg('Preparing sketch from all frames...')
//         checkAndDrawAll()
//       } else if (msg.type === 'error') {
//         setPhase('error')
//         setErrorMsg(msg.message)
//         playingRef.current = false
//       }
//     }

//     ws.onclose = () => {
//       wsClosedRef.current = true
//       if (playingRef.current) {
//         setStatusMsg('Preparing sketch...')
//         checkAndDrawAll()
//       }
//     }

//     ws.onerror = () => {
//       setPhase('error')
//       setErrorMsg('WebSocket failed — check vite.config.js has /api/video/stream proxy')
//       playingRef.current = false
//     }
//   }, [videoFile, useHed, detailLevel, frameSkip, smooth,
//       reset, canvasRef, onAnimationStart, checkAndDrawAll])

//   const stopAnimation = useCallback(() => {
//     playingRef.current = false
//     wsRef.current?.close()
//     setPhase('idle')
//     setStatusMsg('Stopped')
//     onAnimationReset?.()
//   }, [onAnimationReset])

//   const est = () => {
//     if (!videoFile) return '?'
//     const mb = videoFile.size / 1024 / 1024
//     const s  = Math.round(mb * (useHed ? 25 : 4) / frameSkip)
//     return s > 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`
//   }

//   const busy = ['reading','connecting','streaming'].includes(phase)

//   return (
//     <div style={{
//       flex:1, display:'flex', flexDirection:'column',
//       minHeight:0, overflow:'hidden',
//     }}>
//       {/* Scrollable content area */}
//       <div style={{
//         flex:1, overflowY:'auto', overflowX:'hidden',
//         padding:'8px', display:'flex', flexDirection:'column', gap:5,
//         minHeight:0,
//       }}>

//         {/* Header */}
//         <div style={{padding:'8px 10px',borderRadius:9,flexShrink:0,
//                      background:'linear-gradient(135deg,rgba(79,156,249,.1),rgba(167,139,250,.08))',
//                      border:`1px solid ${T.blue}33`}}>
//           <div style={{fontSize:11,fontWeight:800,marginBottom:2}}>🎬 Video to Sketch</div>
//           <div style={{fontSize:8,color:T.sub,lineHeight:1.7}}>
//             Each frame draws stroke-by-stroke on the right canvas live.
//           </div>
//         </div>

//         {/* Drop zone — compact */}
//         <div onDragOver={e=>{e.preventDefault();setDragging(true)}}
//           onDragLeave={()=>setDragging(false)} onDrop={onDrop}
//           onClick={()=>!videoFile&&fileInputRef.current?.click()}
//           style={{border:`2px dashed ${dragging?T.gold:T.border}`,
//                   borderRadius:9,background:dragging?T.goldD:'#080810',
//                   cursor:videoFile?'default':'pointer',
//                   padding:'10px 12px',flexShrink:0,
//                   display:'flex',alignItems:'center',gap:10,
//                   transition:'all .18s'}}>
//           {videoFile ? (
//             <>
//               <span style={{fontSize:20,flexShrink:0}}>🎬</span>
//               <div style={{flex:1,minWidth:0}}>
//                 <div style={{fontSize:9,color:T.text,fontWeight:600,
//                              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
//                   {videoFile.name}
//                 </div>
//                 <div style={{fontSize:8,color:T.sub,fontFamily:'monospace',marginTop:1}}>
//                   {(videoFile.size/1024/1024).toFixed(1)} MB · ~{est()}
//                 </div>
//               </div>
//               <button onClick={e=>{e.stopPropagation();setVideoFile(null);reset()}}
//                 style={{background:'rgba(255,255,255,.1)',color:'#aaa',border:'none',
//                         borderRadius:5,padding:'3px 8px',fontSize:8,cursor:'pointer',
//                         flexShrink:0}}>
//                 ✕
//               </button>
//             </>
//           ):(
//             <div style={{width:'100%',textAlign:'center',padding:'8px 0'}}>
//               <div style={{fontSize:20,opacity:.12,marginBottom:3}}>🎬</div>
//               <div style={{fontSize:10,color:'#333'}}>Drop video or click to browse</div>
//               <div style={{fontSize:8,color:'#222',marginTop:1}}>MP4 · MOV · AVI · WEBM · max 500MB</div>
//             </div>
//           )}
//         </div>
//         <input ref={fileInputRef} type="file"
//           accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
//           style={{display:'none'}}
//           onChange={e=>{if(e.target.files[0]){setVideoFile(e.target.files[0]);reset()}}}/>

//         {/* Edge Settings */}
//         <VCard title="Edge Settings">
//           <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
//             <div>
//               <div style={{fontSize:10,color:useHed?T.blue:T.sub,fontWeight:useHed?600:400}}>
//                 🧠 HED Neural
//               </div>
//               <div style={{fontSize:8,color:useHed?T.orange:T.dim}}>
//                 {useHed?'WARNING: Very slow for video':'Fast classical — recommended'}
//               </div>
//             </div>
//             <Toggle value={useHed} onChange={setUseHed} color={T.blue}/>
//           </div>
//           <SliderRow label="Edge Detail" value={detailLevel} min={1} max={5} step={1}
//             display={DETAIL_LABELS[detailLevel]+` (${detailLevel})`}
//             hint="Lower = cleaner for video (2 recommended)"
//             color={useHed?T.blue:T.gold} onChange={setDetailLevel}/>
//         </VCard>

//         {/* Performance */}
//         <VCard title="Performance">
//           <SliderRow label="Frame Skip" value={frameSkip} min={1} max={8} step={1}
//             display={frameSkip===1?'Every frame':`Every ${frameSkip} frames`}
//             hint={`Processes ~${Math.round(100/frameSkip)}% of frames`}
//             color={T.orange} onChange={setFrameSkip}/>
//           <SliderRow label="Temporal Smooth" value={smooth} min={0} max={1} step={0.1}
//             display={`${Math.round(smooth*100)}%`}
//             hint="Higher = less flicker between frames"
//             color={T.purple} onChange={setSmooth}/>
//           <SliderRow label="Draw Speed" value={drawSpeed} min={3} max={9} step={1}
//             display={SPEED_LABELS[drawSpeed]}
//             hint="Speed of stroke animation per frame"
//             color={T.gold} onChange={setDrawSpeed}/>
//         </VCard>

//         {/* Pen Style */}
//         <VCard title="Pen Style">
//           <div style={{display:'flex',gap:3}}>
//             {[['pencil','✏️','Pencil'],['charcoal','🖤','Charcoal'],
//               ['ink','🖊️','Ink'],['brush','🖌️','Brush']].map(([id,em,lbl])=>(
//               <button key={id} onClick={()=>setPenStyle(id)} style={{
//                 flex:1,padding:'5px 2px',borderRadius:7,fontSize:8,
//                 border:`1px solid ${penStyle===id?T.gold:T.border}`,
//                 background:penStyle===id?T.goldD:'#0a0a0f',
//                 color:penStyle===id?T.gold:T.sub,
//                 cursor:'pointer',fontFamily:'inherit',
//                 display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
//                 <span style={{fontSize:11}}>{em}</span>{lbl}
//               </button>
//             ))}
//           </div>
//         </VCard>

//         {/* Status */}
//         {busy && (
//           <VCard>
//             <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
//               <Spinner color={phase==='reading'?T.gold:T.blue}/>
//               <span style={{fontSize:10,color:T.blue,fontWeight:600,
//                             overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
//                 {statusMsg || 'Processing...'}
//               </span>
//             </div>
//             <ProgressBar pct={progress} color={phase==='reading'?T.gold:T.blue}/>
//             {totalFrames>0 && phase==='streaming' && (
//               <div style={{fontSize:8,color:T.sub,marginTop:3,fontFamily:'monospace'}}>
//                 Collected {frameNum} / {totalFrames} frames
//               </div>
//             )}
//           </VCard>
//         )}

//         {phase==='done' && (
//           <VCard>
//             <div style={{color:T.green,fontWeight:700,fontSize:12,marginBottom:6,
//                          display:'flex',alignItems:'center',gap:6}}>
//               <span style={{fontSize:16}}>✓</span>
//               Video sketch complete!
//             </div>
//             <div style={{fontSize:9,color:T.sub,marginBottom:8,fontFamily:'monospace'}}>
//               {frameNum} frames animated successfully
//             </div>
//             <ProgressBar pct={100} color={T.green}/>
//             <div style={{marginTop:8}}>
//               <button onClick={reset} style={{
//                 width:'100%',padding:7,borderRadius:7,
//                 border:`1px solid ${T.border}`,background:'transparent',
//                 color:T.sub,fontSize:9,cursor:'pointer'}}>
//                 Process another video
//               </button>
//             </div>
//           </VCard>
//         )}

//         {phase==='error' && (
//           <VCard>
//             <div style={{color:T.red,fontWeight:700,fontSize:10,marginBottom:4}}>⚠️ Error</div>
//             <div style={{fontSize:8,color:'#cc5555',lineHeight:1.7,marginBottom:6,
//                          wordBreak:'break-word'}}>{errorMsg}</div>
//             <button onClick={reset} style={{
//               width:'100%',padding:6,borderRadius:7,
//               border:`1px solid ${T.red}44`,background:T.redD,
//               color:T.red,fontSize:9,cursor:'pointer'}}>Try Again</button>
//           </VCard>
//         )}

//         {phase==='idle' && (
//           <VCard title="Tips for best results">
//             <div style={{fontSize:8,color:T.sub,lineHeight:1.9}}>
//               ✓ Use <strong style={{color:T.gold}}>Canny</strong> — 5x faster than HED<br/>
//               ✓ <strong style={{color:T.gold}}>Detail Level 2</strong> — less noise<br/>
//               ✓ <strong style={{color:T.gold}}>Frame Skip 3</strong> — 3x faster<br/>
//               ✓ <strong style={{color:T.gold}}>Smooth 50%+</strong> — less flicker<br/>
//               ✓ 720p video = best quality + speed<br/>
//               ✓ Person walking = great test<br/>
//               ✓ Keep under 30 seconds
//             </div>
//           </VCard>
//         )}
//       </div>

//       {/* Action button — fixed at bottom, never scrolls away */}
//       <div style={{padding:'9px',borderTop:`1px solid ${T.border}`,
//                    background:T.panel,flexShrink:0}}>
//         {busy ? (
//           <button onClick={stopAnimation} style={{
//             width:'100%',padding:11,borderRadius:9,
//             border:`1px solid ${T.red}44`,background:T.redD,
//             color:T.red,fontSize:12,fontWeight:700,cursor:'pointer'}}>
//             ⏹ Stop
//           </button>
//         ):(
//           <button onClick={startAnimation} disabled={!videoFile} style={{
//             width:'100%',padding:11,borderRadius:9,border:'none',
//             background:videoFile?`linear-gradient(135deg,${T.blue},#2563eb)`:'#0e0e18',
//             color:videoFile?'#fff':'#2a2a3a',fontSize:12,fontWeight:800,
//             cursor:videoFile?'pointer':'not-allowed',
//             display:'flex',alignItems:'center',justifyContent:'center',gap:8,
//             boxShadow:videoFile?`0 4px 20px ${T.blue}55`:'none',
//             transition:'all .25s'}}>
//             {videoFile?'🎬 Animate Sketch':'Upload a video first'}
//           </button>
//         )}
//         <div style={{textAlign:'center',marginTop:3,fontSize:7,color:T.sub,fontFamily:'monospace'}}>
//           HTTP upload + WebSocket frame stream
//         </div>
//       </div>
//     </div>
//   )
// }

// function VCard({title,children}){
//   return(
//     <div style={{borderRadius:9,background:T.card,border:`1px solid ${T.border}`,
//                  overflow:'hidden',flexShrink:0}}>
//       {title&&<div style={{padding:'5px 10px',borderBottom:`1px solid ${T.border}`,
//                            fontSize:8,color:T.sub,letterSpacing:'.12em',
//                            textTransform:'uppercase',fontFamily:'monospace'}}>{title}</div>}
//       <div style={{padding:'9px 10px'}}>{children}</div>
//     </div>
//   )
// }

// function SliderRow({label,value,min,max,step,display,hint,color,onChange}){
//   return(
//     <div style={{marginBottom:9}}>
//       <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
//         <span style={{fontSize:9,color:T.sub}}>{label}</span>
//         <span style={{fontSize:9,color:color||T.gold,fontFamily:'monospace'}}>{display}</span>
//       </div>
//       <input type="range" min={min} max={max} step={step} value={value}
//         onChange={e=>onChange(Number(e.target.value))} style={{width:'100%'}}/>
//       {hint&&<div style={{fontSize:7,color:T.dim,marginTop:1}}>{hint}</div>}
//     </div>
//   )
// }

// function Toggle({value,onChange,color}){
//   return(
//     <div onClick={()=>onChange(!value)} style={{width:36,height:20,borderRadius:10,
//       flexShrink:0,background:value?color:'#1e1e2a',cursor:'pointer',position:'relative',
//       transition:'background .2s',boxShadow:value?`0 0 8px ${color}66`:'none'}}>
//       <div style={{position:'absolute',top:2,left:value?17:2,width:16,height:16,
//                    borderRadius:'50%',background:'#fff',transition:'left .2s',
//                    boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
//     </div>
//   )
// }

// function ProgressBar({pct,color}){
//   return(
//     <div style={{height:4,borderRadius:2,background:T.dim,overflow:'hidden'}}>
//       <div style={{width:`${pct}%`,height:'100%',borderRadius:2,
//                    background:color,transition:'width .3s'}}/>
//     </div>
//   )
// }

// function Spinner({color}){
//   return(
//     <div style={{width:10,height:10,borderRadius:'50%',flexShrink:0,
//                  border:'2px solid #1e1e2a',borderTopColor:color||T.gold,
//                  animation:'spin .65s linear infinite'}}/>
//   )
// }








// import { useState, useRef, useCallback, useEffect } from 'react'

// const T = {
//   bg:'#07070c', panel:'#0d0d16', card:'#11111e', border:'#1a1a2e',
//   gold:'#f5c542', goldD:'rgba(245,197,66,.1)',
//   blue:'#4f9cf9', blueD:'rgba(79,156,249,.1)',
//   green:'#34d399', greenD:'rgba(52,211,153,.1)',
//   red:'#f87171', redD:'rgba(248,113,113,.1)',
//   orange:'#fb923c', orangeD:'rgba(251,146,60,.1)',
//   purple:'#a78bfa',
//   text:'#ece8e0', sub:'#5a5a72', dim:'#1e1e30',
// }

// const DETAIL_LABELS = ['','Minimal','Light','Medium','Detailed','Maximum']
// const SPEED_LABELS  = ['','Slowest','Slow','Normal','Medium','Fast','Faster','Quick','Rapid','Max']

// export default function VideoTab({ onSketchReady, canvasRef, onAnimationStart, onAnimationReset }) {
//   const fileInputRef  = useRef(null)
//   const wsRef         = useRef(null)
//   const frameQueueRef = useRef([])
//   const playingRef    = useRef(false)
//   const nextFrameRef  = useRef(0)
//   const totalRef      = useRef(0)
//   const wsClosedRef   = useRef(false)  // true when backend sent all frames

//   const [videoFile,   setVideoFile]   = useState(null)
//   const [dragging,    setDragging]    = useState(false)
//   const [useHed,      setUseHed]      = useState(false)
//   const [detailLevel, setDetailLevel] = useState(2)
//   const [frameSkip,   setFrameSkip]   = useState(3)
//   const [smooth,      setSmooth]      = useState(0.5)
//   const [drawSpeed,   setDrawSpeed]   = useState(7)
//   const [penStyle,    setPenStyle]    = useState('pencil')
//   const [phase,       setPhase]       = useState('idle')
//   const [progress,    setProgress]    = useState(0)
//   const [statusMsg,   setStatusMsg]   = useState('')
//   const [frameNum,    setFrameNum]    = useState(0)
//   const [totalFrames, setTotalFrames] = useState(0)
//   const [errorMsg,    setErrorMsg]    = useState('')

//   useEffect(() => () => {
//     wsRef.current?.close()
//     playingRef.current = false
//   }, [])

//   const reset = useCallback(() => {
//     wsRef.current?.close(); wsRef.current = null
//     playingRef.current = false
//     frameQueueRef.current = []
//     nextFrameRef.current  = 0
//     totalRef.current      = 0
//     wsClosedRef.current   = false
//     canvasRef?.current?.reset()
//     onAnimationReset?.()
//     setPhase('idle'); setProgress(0)
//     setStatusMsg(''); setFrameNum(0); setTotalFrames(0); setErrorMsg('')
//   }, [canvasRef, onAnimationReset])

//   const onDrop = useCallback((e) => {
//     e.preventDefault(); setDragging(false)
//     const f = e.dataTransfer.files[0]
//     if (f && f.type.startsWith('video/')) { setVideoFile(f); reset() }
//     else alert('Please drop a video file (MP4, MOV, AVI, WEBM)')
//   }, [reset])

//   // Draw a single frame — clean sketch like a normal image
//   const drawSingleFrame = useCallback((frame) => {
//     if (!frame || !frame.paths?.length) return
//     canvasRef?.current?.reset()
//     canvasRef?.current?.setup(frame.width, frame.height)
//     canvasRef?.current?.addPaths(frame.paths)
//     canvasRef?.current?.start()
//     setProgress(100)
//     playingRef.current = false
//     setPhase('done')
//     setStatusMsg('')
//     // Send thumbnail
//     setTimeout(() => {
//       const cv = document.querySelector('canvas')
//       if (cv && onSketchReady) {
//         onSketchReady(cv.toDataURL('image/jpeg', 0.7).split(',')[1])
//       }
//     }, 800)
//   }, [canvasRef, onSketchReady])

//   // Pick the best frame to display as final sketch
//   // "Best" = frame with most paths (richest detail) from middle of video
//   const checkAndDrawAll = useCallback(() => {
//     if (!wsClosedRef.current) return
//     const queue = frameQueueRef.current
//     if (!queue.length) return

//     // Strategy: pick frame with most paths from middle third of video
//     // Middle frames have the subject most centered and in motion
//     const start = Math.floor(queue.length * 0.3)
//     const end   = Math.floor(queue.length * 0.7)
//     const candidates = queue.slice(start, end)

//     // Pick the one with most paths = most detail
//     const bestFrame = candidates.reduce((best, frame) =>
//       (frame.paths?.length || 0) > (best.paths?.length || 0) ? frame : best
//     , candidates[0] || queue[Math.floor(queue.length / 2)])

//     if (bestFrame) {
//       setStatusMsg(`Drawing best frame (${bestFrame.paths?.length || 0} strokes)...`)
//       setTimeout(() => drawSingleFrame(bestFrame), 100)
//     }
//   }, [drawSingleFrame])

//   const startAnimation = useCallback(async () => {
//     if (!videoFile) return
//     reset()

//     setPhase('reading')
//     setStatusMsg(`Uploading ${(videoFile.size/1024/1024).toFixed(1)}MB...`)

//     const form = new FormData()
//     form.append('file', videoFile)
//     const params = new URLSearchParams({
//       use_hed:         useHed ? 'true' : 'false',
//       detail_level:    detailLevel,
//       frame_skip:      frameSkip,
//       temporal_smooth: smooth,
//       output_format:   'mp4',
//     })

//     let jobId
//     try {
//       const xhr = new XMLHttpRequest()
//       await new Promise((resolve, reject) => {
//         xhr.upload.onprogress = (e) => {
//           if (e.total) {
//             const pct = Math.round(e.loaded / e.total * 100)
//             setStatusMsg(`Uploading... ${pct}%`)
//             setProgress(pct)
//           }
//         }
//         xhr.onload = () => {
//           if (xhr.status === 200) {
//             jobId = JSON.parse(xhr.responseText).job_id
//             resolve()
//           } else {
//             reject(new Error(`Upload failed: ${xhr.status}`))
//           }
//         }
//         xhr.onerror = () => reject(new Error('Upload failed'))
//         xhr.open('POST', `/api/video/process?${params}`)
//         xhr.send(form)
//       })
//     } catch(e) {
//       setPhase('error')
//       setErrorMsg(e.message || 'Upload failed — is backend running?')
//       return
//     }

//     setPhase('connecting')
//     setStatusMsg('Connecting to stream...')
//     setProgress(0)

//     const proto = location.protocol === 'https:' ? 'wss' : 'ws'
//     const ws    = new WebSocket(`${proto}://${location.host}/api/video/stream/${jobId}`)
//     wsRef.current      = ws
//     playingRef.current = true

//     ws.onopen = () => {
//       setStatusMsg('Collecting frames from backend...')
//       setPhase('streaming')
//       onAnimationStart?.()  // show canvas
//     }

//     ws.onmessage = (e) => {
//       const msg = JSON.parse(e.data)
//       if (msg.type === 'status') {
//         setStatusMsg(msg.message)
//       } else if (msg.type === 'meta') {
//         totalRef.current = msg.total_frames
//         setTotalFrames(msg.total_frames)
//         setStatusMsg(`Drawing ${msg.total_frames} frames...`)
//       } else if (msg.type === 'frame') {
//         frameQueueRef.current.push(msg)
//         const collected = frameQueueRef.current.length
//         const tot       = totalRef.current || '?'
//         setFrameNum(collected)
//         setStatusMsg(`Collecting frames... ${collected}/${tot}`)
//         if (totalRef.current > 0) {
//           setProgress(Math.round(collected / totalRef.current * 90))
//         }
//       } else if (msg.type === 'done') {
//         totalRef.current = msg.total_frames
//         setTotalFrames(msg.total_frames)
//         wsClosedRef.current = true
//         setStatusMsg('Preparing sketch from all frames...')
//         checkAndDrawAll()
//       } else if (msg.type === 'error') {
//         setPhase('error')
//         setErrorMsg(msg.message)
//         playingRef.current = false
//       }
//     }

//     ws.onclose = () => {
//       wsClosedRef.current = true
//       if (playingRef.current) {
//         setStatusMsg('Preparing sketch...')
//         checkAndDrawAll()
//       }
//     }

//     ws.onerror = () => {
//       setPhase('error')
//       setErrorMsg('WebSocket failed — check vite.config.js has /api/video/stream proxy')
//       playingRef.current = false
//     }
//   }, [videoFile, useHed, detailLevel, frameSkip, smooth,
//       reset, canvasRef, onAnimationStart, checkAndDrawAll])

//   const stopAnimation = useCallback(() => {
//     playingRef.current = false
//     wsRef.current?.close()
//     setPhase('idle')
//     setStatusMsg('Stopped')
//     onAnimationReset?.()
//   }, [onAnimationReset])

//   const est = () => {
//     if (!videoFile) return '?'
//     const mb = videoFile.size / 1024 / 1024
//     const s  = Math.round(mb * (useHed ? 25 : 4) / frameSkip)
//     return s > 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`
//   }

//   const busy = ['reading','connecting','streaming'].includes(phase)

//   return (
//     <div style={{
//       flex:1, display:'flex', flexDirection:'column',
//       minHeight:0, overflow:'hidden',
//     }}>
//       {/* Scrollable content area */}
//       <div style={{
//         flex:1, overflowY:'auto', overflowX:'hidden',
//         padding:'8px', display:'flex', flexDirection:'column', gap:5,
//         minHeight:0,
//       }}>

//         {/* Header */}
//         <div style={{padding:'8px 10px',borderRadius:9,flexShrink:0,
//                      background:'linear-gradient(135deg,rgba(79,156,249,.1),rgba(167,139,250,.08))',
//                      border:`1px solid ${T.blue}33`}}>
//           <div style={{fontSize:11,fontWeight:800,marginBottom:2}}>🎬 Video to Sketch</div>
//           <div style={{fontSize:8,color:T.sub,lineHeight:1.7}}>
//             Each frame draws stroke-by-stroke on the right canvas live.
//           </div>
//         </div>

//         {/* Drop zone — compact */}
//         <div onDragOver={e=>{e.preventDefault();setDragging(true)}}
//           onDragLeave={()=>setDragging(false)} onDrop={onDrop}
//           onClick={()=>!videoFile&&fileInputRef.current?.click()}
//           style={{border:`2px dashed ${dragging?T.gold:T.border}`,
//                   borderRadius:9,background:dragging?T.goldD:'#080810',
//                   cursor:videoFile?'default':'pointer',
//                   padding:'10px 12px',flexShrink:0,
//                   display:'flex',alignItems:'center',gap:10,
//                   transition:'all .18s'}}>
//           {videoFile ? (
//             <>
//               <span style={{fontSize:20,flexShrink:0}}>🎬</span>
//               <div style={{flex:1,minWidth:0}}>
//                 <div style={{fontSize:9,color:T.text,fontWeight:600,
//                              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
//                   {videoFile.name}
//                 </div>
//                 <div style={{fontSize:8,color:T.sub,fontFamily:'monospace',marginTop:1}}>
//                   {(videoFile.size/1024/1024).toFixed(1)} MB · ~{est()}
//                 </div>
//               </div>
//               <button onClick={e=>{e.stopPropagation();setVideoFile(null);reset()}}
//                 style={{background:'rgba(255,255,255,.1)',color:'#aaa',border:'none',
//                         borderRadius:5,padding:'3px 8px',fontSize:8,cursor:'pointer',
//                         flexShrink:0}}>
//                 ✕
//               </button>
//             </>
//           ):(
//             <div style={{width:'100%',textAlign:'center',padding:'8px 0'}}>
//               <div style={{fontSize:20,opacity:.12,marginBottom:3}}>🎬</div>
//               <div style={{fontSize:10,color:'#333'}}>Drop video or click to browse</div>
//               <div style={{fontSize:8,color:'#222',marginTop:1}}>MP4 · MOV · AVI · WEBM · max 500MB</div>
//             </div>
//           )}
//         </div>
//         <input ref={fileInputRef} type="file"
//           accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
//           style={{display:'none'}}
//           onChange={e=>{if(e.target.files[0]){setVideoFile(e.target.files[0]);reset()}}}/>

//         {/* Edge Settings */}
//         <VCard title="Edge Settings">
//           <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
//             <div>
//               <div style={{fontSize:10,color:useHed?T.blue:T.sub,fontWeight:useHed?600:400}}>
//                 🧠 HED Neural
//               </div>
//               <div style={{fontSize:8,color:useHed?T.orange:T.dim}}>
//                 {useHed?'WARNING: Very slow for video':'Fast classical — recommended'}
//               </div>
//             </div>
//             <Toggle value={useHed} onChange={setUseHed} color={T.blue}/>
//           </div>
//           <SliderRow label="Edge Detail" value={detailLevel} min={1} max={5} step={1}
//             display={DETAIL_LABELS[detailLevel]+` (${detailLevel})`}
//             hint="Lower = cleaner for video (2 recommended)"
//             color={useHed?T.blue:T.gold} onChange={setDetailLevel}/>
//         </VCard>

//         {/* Performance */}
//         <VCard title="Performance">
//           <SliderRow label="Frame Skip" value={frameSkip} min={1} max={8} step={1}
//             display={frameSkip===1?'Every frame':`Every ${frameSkip} frames`}
//             hint={`Processes ~${Math.round(100/frameSkip)}% of frames`}
//             color={T.orange} onChange={setFrameSkip}/>
//           <SliderRow label="Temporal Smooth" value={smooth} min={0} max={1} step={0.1}
//             display={`${Math.round(smooth*100)}%`}
//             hint="Higher = less flicker between frames"
//             color={T.purple} onChange={setSmooth}/>
//           <SliderRow label="Draw Speed" value={drawSpeed} min={3} max={9} step={1}
//             display={SPEED_LABELS[drawSpeed]}
//             hint="Speed of stroke animation per frame"
//             color={T.gold} onChange={setDrawSpeed}/>
//         </VCard>

//         {/* Pen Style */}
//         <VCard title="Pen Style">
//           <div style={{display:'flex',gap:3}}>
//             {[['pencil','✏️','Pencil'],['charcoal','🖤','Charcoal'],
//               ['ink','🖊️','Ink'],['brush','🖌️','Brush']].map(([id,em,lbl])=>(
//               <button key={id} onClick={()=>setPenStyle(id)} style={{
//                 flex:1,padding:'5px 2px',borderRadius:7,fontSize:8,
//                 border:`1px solid ${penStyle===id?T.gold:T.border}`,
//                 background:penStyle===id?T.goldD:'#0a0a0f',
//                 color:penStyle===id?T.gold:T.sub,
//                 cursor:'pointer',fontFamily:'inherit',
//                 display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
//                 <span style={{fontSize:11}}>{em}</span>{lbl}
//               </button>
//             ))}
//           </div>
//         </VCard>

//         {/* Status */}
//         {busy && (
//           <VCard>
//             <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
//               <Spinner color={phase==='reading'?T.gold:T.blue}/>
//               <span style={{fontSize:10,color:T.blue,fontWeight:600,
//                             overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
//                 {statusMsg || 'Processing...'}
//               </span>
//             </div>
//             <ProgressBar pct={progress} color={phase==='reading'?T.gold:T.blue}/>
//             {totalFrames>0 && phase==='streaming' && (
//               <div style={{fontSize:8,color:T.sub,marginTop:3,fontFamily:'monospace'}}>
//                 Collected {frameNum} / {totalFrames} frames
//               </div>
//             )}
//           </VCard>
//         )}

//         {phase==='done' && (
//           <VCard>
//             <div style={{color:T.green,fontWeight:700,fontSize:12,marginBottom:6,
//                          display:'flex',alignItems:'center',gap:6}}>
//               <span style={{fontSize:16}}>✓</span>
//               Video sketch complete!
//             </div>
//             <div style={{fontSize:9,color:T.sub,marginBottom:8,fontFamily:'monospace'}}>
//               {frameNum} frames animated successfully
//             </div>
//             <ProgressBar pct={100} color={T.green}/>
//             <div style={{marginTop:8}}>
//               <button onClick={reset} style={{
//                 width:'100%',padding:7,borderRadius:7,
//                 border:`1px solid ${T.border}`,background:'transparent',
//                 color:T.sub,fontSize:9,cursor:'pointer'}}>
//                 Process another video
//               </button>
//             </div>
//           </VCard>
//         )}

//         {phase==='error' && (
//           <VCard>
//             <div style={{color:T.red,fontWeight:700,fontSize:10,marginBottom:4}}>⚠️ Error</div>
//             <div style={{fontSize:8,color:'#cc5555',lineHeight:1.7,marginBottom:6,
//                          wordBreak:'break-word'}}>{errorMsg}</div>
//             <button onClick={reset} style={{
//               width:'100%',padding:6,borderRadius:7,
//               border:`1px solid ${T.red}44`,background:T.redD,
//               color:T.red,fontSize:9,cursor:'pointer'}}>Try Again</button>
//           </VCard>
//         )}

//         {phase==='idle' && (
//           <VCard title="Tips for best results">
//             <div style={{fontSize:8,color:T.sub,lineHeight:1.9}}>
//               ✓ Use <strong style={{color:T.gold}}>Canny</strong> — 5x faster than HED<br/>
//               ✓ <strong style={{color:T.gold}}>Detail Level 2</strong> — less noise<br/>
//               ✓ <strong style={{color:T.gold}}>Frame Skip 3</strong> — 3x faster<br/>
//               ✓ <strong style={{color:T.gold}}>Smooth 50%+</strong> — less flicker<br/>
//               ✓ 720p video = best quality + speed<br/>
//               ✓ Person walking = great test<br/>
//               ✓ Keep under 30 seconds
//             </div>
//           </VCard>
//         )}
//       </div>

//       {/* Action button — fixed at bottom, never scrolls away */}
//       <div style={{padding:'9px',borderTop:`1px solid ${T.border}`,
//                    background:T.panel,flexShrink:0}}>
//         {busy ? (
//           <button onClick={stopAnimation} style={{
//             width:'100%',padding:11,borderRadius:9,
//             border:`1px solid ${T.red}44`,background:T.redD,
//             color:T.red,fontSize:12,fontWeight:700,cursor:'pointer'}}>
//             ⏹ Stop
//           </button>
//         ):(
//           <button onClick={startAnimation} disabled={!videoFile} style={{
//             width:'100%',padding:11,borderRadius:9,border:'none',
//             background:videoFile?`linear-gradient(135deg,${T.blue},#2563eb)`:'#0e0e18',
//             color:videoFile?'#fff':'#2a2a3a',fontSize:12,fontWeight:800,
//             cursor:videoFile?'pointer':'not-allowed',
//             display:'flex',alignItems:'center',justifyContent:'center',gap:8,
//             boxShadow:videoFile?`0 4px 20px ${T.blue}55`:'none',
//             transition:'all .25s'}}>
//             {videoFile?'🎬 Animate Sketch':'Upload a video first'}
//           </button>
//         )}
//         <div style={{textAlign:'center',marginTop:3,fontSize:7,color:T.sub,fontFamily:'monospace'}}>
//           HTTP upload + WebSocket frame stream
//         </div>
//       </div>
//     </div>
//   )
// }

// function VCard({title,children}){
//   return(
//     <div style={{borderRadius:9,background:T.card,border:`1px solid ${T.border}`,
//                  overflow:'hidden',flexShrink:0}}>
//       {title&&<div style={{padding:'5px 10px',borderBottom:`1px solid ${T.border}`,
//                            fontSize:8,color:T.sub,letterSpacing:'.12em',
//                            textTransform:'uppercase',fontFamily:'monospace'}}>{title}</div>}
//       <div style={{padding:'9px 10px'}}>{children}</div>
//     </div>
//   )
// }

// function SliderRow({label,value,min,max,step,display,hint,color,onChange}){
//   return(
//     <div style={{marginBottom:9}}>
//       <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
//         <span style={{fontSize:9,color:T.sub}}>{label}</span>
//         <span style={{fontSize:9,color:color||T.gold,fontFamily:'monospace'}}>{display}</span>
//       </div>
//       <input type="range" min={min} max={max} step={step} value={value}
//         onChange={e=>onChange(Number(e.target.value))} style={{width:'100%'}}/>
//       {hint&&<div style={{fontSize:7,color:T.dim,marginTop:1}}>{hint}</div>}
//     </div>
//   )
// }

// function Toggle({value,onChange,color}){
//   return(
//     <div onClick={()=>onChange(!value)} style={{width:36,height:20,borderRadius:10,
//       flexShrink:0,background:value?color:'#1e1e2a',cursor:'pointer',position:'relative',
//       transition:'background .2s',boxShadow:value?`0 0 8px ${color}66`:'none'}}>
//       <div style={{position:'absolute',top:2,left:value?17:2,width:16,height:16,
//                    borderRadius:'50%',background:'#fff',transition:'left .2s',
//                    boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
//     </div>
//   )
// }

// function ProgressBar({pct,color}){
//   return(
//     <div style={{height:4,borderRadius:2,background:T.dim,overflow:'hidden'}}>
//       <div style={{width:`${pct}%`,height:'100%',borderRadius:2,
//                    background:color,transition:'width .3s'}}/>
//     </div>
//   )
// }

// function Spinner({color}){
//   return(
//     <div style={{width:10,height:10,borderRadius:'50%',flexShrink:0,
//                  border:'2px solid #1e1e2a',borderTopColor:color||T.gold,
//                  animation:'spin .65s linear infinite'}}/>
//   )
// }