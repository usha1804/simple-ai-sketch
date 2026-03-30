import { useState, useRef, useCallback, useEffect } from 'react'

const T = {
  bg:'#07070c', panel:'#0d0d16', card:'#11111e', border:'#1a1a2e',
  gold:'#f5c542', goldD:'rgba(245,197,66,.1)',
  blue:'#4f9cf9', blueD:'rgba(79,156,249,.1)',
  green:'#34d399', greenD:'rgba(52,211,153,.1)',
  red:'#f87171',   redD:'rgba(248,113,113,.1)',
  orange:'#fb923c',
  text:'#ece8e0', sub:'#5a5a72', dim:'#1e1e30',
}

const INTERVALS = [
  {label:'0.5s',value:500},
  {label:'1s',  value:1000},
  {label:'2s',  value:2000},
  {label:'3s',  value:3000},
  {label:'5s',  value:5000},
]

export default function WebcamTab({ canvasRef, onAnimationStart, onAnimationReset }) {
  const videoRef    = useRef(null)
  const captureRef  = useRef(null)
  const streamRef   = useRef(null)
  const intervalRef = useRef(null)
  const processingRef = useRef(false)  // prevent concurrent requests
  const sketchCountRef = useRef(0)     // use ref not state to avoid stale closure

  const [phase,       setPhase]       = useState('idle')
  const [useHed,      setUseHed]      = useState(false)
  const [detailLevel, setDetailLevel] = useState(2)  // low = better for webcam
  const [captureMs,   setCaptureMs]   = useState(1000)
  const [penStyle,    setPenStyle]    = useState('pencil')
  const [statusMsg,   setStatusMsg]   = useState('')
  const [sketchCount,    setSketchCount]    = useState(0)
  const [capturedImage,  setCapturedImage]  = useState(null)  // base64 of last capture
  const [errorMsg,    setErrorMsg]    = useState('')
  const [facingMode,  setFacingMode]  = useState('user')
  const [drawSpeed,   setDrawSpeed]   = useState(8)   // fast for webcam

  // cleanup
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const stopWebcam = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    processingRef.current = false
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    onAnimationReset?.()
    setCapturedImage(null)
    setPhase('idle')
    setStatusMsg('')
  }, [onAnimationReset])

  // Core capture function — uses refs only, no state deps to avoid stale closures
  const doCapture = useCallback(async () => {
    if (processingRef.current) {
      setStatusMsg('Still processing...')
      return
    }
    const video = videoRef.current
    const cap   = captureRef.current
    if (!video || !cap) {
      setStatusMsg('Camera not ready — try restarting')
      return
    }
    if (video.readyState < 2) {
      setStatusMsg('Camera loading... wait 2 seconds and try again')
      return
    }

    processingRef.current = true
    setPhase('sketching')
    setStatusMsg('Capturing frame...')

    try {
      const vw = video.videoWidth  || 640
      const vh = video.videoHeight || 480
      cap.width  = vw
      cap.height = vh
      const ctx = cap.getContext('2d')
      ctx.clearRect(0, 0, vw, vh)
      ctx.drawImage(video, 0, 0, vw, vh)

      setStatusMsg('Sending to backend...')
      const blob = await new Promise(res => cap.toBlob(res, 'image/jpeg', 0.9))
      if (!blob) throw new Error('Frame capture failed')

      const form = new FormData()
      form.append('file', new File([blob], 'webcam.jpg', {type:'image/jpeg'}))
      const params = new URLSearchParams({
        detail_level: detailLevel,
        max_strokes:  400,
        use_hed:      useHed ? 'true' : 'false',
      })

      // Try webcam-optimised endpoint first, fall back to standard
      let resp = await fetch(`/api/webcam?${params}`, {
        method: 'POST', body: form,
      })
      if (resp.status === 404) {
        // Webcam endpoint not available — fall back to standard process
        const fallbackParams = new URLSearchParams({
          detail_level:  detailLevel,
          max_strokes:   400,
          use_hed:       useHed ? 'true' : 'false',
          remove_bg:     'false',
          coloring_book: 'false',
          crosshatch:    'false',
          paper_texture: 'false',
          watercolour:   'false',
        })
        resp = await fetch(`/api/process?${fallbackParams}`, {
          method: 'POST', body: form,
        })
      }
      if (!resp.ok) throw new Error(`Backend error ${resp.status}`)
      const data = await resp.json()

      if (!data.paths || data.paths.length === 0) {
        setStatusMsg('No edges detected — try better lighting or move closer')
        setPhase('live')
        processingRef.current = false
        return
      }

      if (!canvasRef?.current) {
        setStatusMsg('Canvas error — switch to Draw tab and back, then try again')
        setPhase('live')
        processingRef.current = false
        return
      }

      canvasRef.current.reset()
      canvasRef.current.setup(data.width, data.height)
      canvasRef.current.addPaths(data.paths)
      canvasRef.current.start()

      // Save captured image thumbnail for display
      const imgUrl = cap.toDataURL('image/jpeg', 0.8)
      setCapturedImage(imgUrl)

      sketchCountRef.current += 1
      setSketchCount(sketchCountRef.current)
      setPhase('live')
      setStatusMsg(`Sketch #${sketchCountRef.current} — ${data.total} strokes`)

    } catch(e) {
      console.error('[Webcam]', e)
      setStatusMsg(`Error: ${e.message}`)
      setPhase('live')
    } finally {
      processingRef.current = false
    }
  }, [detailLevel, useHed, canvasRef])

  const startWebcam = useCallback(async () => {
    setPhase('requesting')
    setStatusMsg('Requesting camera...')
    setErrorMsg('')
    sketchCountRef.current = 0
    setSketchCount(0)
    processingRef.current = false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width:{ideal:640}, height:{ideal:480} },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) throw new Error('Video element not found')

      video.srcObject = stream
      video.onloadedmetadata = () => {
        video.play().then(() => {
          setPhase('live')
          setStatusMsg('Camera live — click Capture Now or auto-captures every ' +
            INTERVALS.find(i=>i.value===captureMs)?.label)
          onAnimationStart?.()

          // Start auto capture interval
          clearInterval(intervalRef.current)
          intervalRef.current = setInterval(() => {
            doCapture()
          }, captureMs)

        }).catch(e => {
          setPhase('error')
          setErrorMsg('Could not start video: ' + e.message)
        })
      }

    } catch(e) {
      setPhase('error')
      if (e.name === 'NotAllowedError')
        setErrorMsg('Camera permission denied. Click the camera icon in browser address bar to allow.')
      else if (e.name === 'NotFoundError')
        setErrorMsg('No camera found. Connect a webcam and try again.')
      else
        setErrorMsg(`Camera error: ${e.message}`)
    }
  }, [facingMode, captureMs, onAnimationStart, doCapture])

  const running = phase === 'live' || phase === 'sketching'
  const busy    = phase === 'requesting'

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',
                 height:'100%',overflow:'hidden'}}>

      <div style={{flex:1,overflowY:'auto',padding:'8px',
                   display:'flex',flexDirection:'column',gap:5}}>

        {/* Header */}
        <div style={{padding:'8px 10px',borderRadius:9,flexShrink:0,
                     background:'linear-gradient(135deg,rgba(52,211,153,.1),rgba(79,156,249,.08))',
                     border:`1px solid ${T.green}33`}}>
          <div style={{fontSize:11,fontWeight:800,marginBottom:2}}>📷 Live Webcam Sketch</div>
          <div style={{fontSize:8,color:T.sub,lineHeight:1.7}}>
            Auto-captures every {INTERVALS.find(i=>i.value===captureMs)?.label}<br/>
            Sketch draws stroke-by-stroke on the right canvas.
          </div>
        </div>

        {/* Video preview — always in DOM so ref works */}
        <div style={{position:'relative',borderRadius:9,overflow:'hidden',
                     border:`1px solid ${running?T.green+'44':T.border}`,
                     background:'#000',flexShrink:0,minHeight:140}}>
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{
              width:'100%', display:'block',
              maxHeight:180, objectFit:'cover',
              transform:'scaleX(-1)',  // mirror
              opacity: running ? 1 : 0.3,
            }}
          />
          {!running && (
            <div style={{position:'absolute',inset:0,display:'flex',
                         alignItems:'center',justifyContent:'center',
                         flexDirection:'column',gap:6}}>
              <span style={{fontSize:28,opacity:.2}}>📷</span>
              <span style={{fontSize:9,color:T.sub}}>Camera preview</span>
            </div>
          )}
          {running && (
            <>
              <div style={{position:'absolute',top:6,left:8,display:'flex',
                           alignItems:'center',gap:4,background:'rgba(0,0,0,.7)',
                           borderRadius:10,padding:'2px 8px'}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:T.red,
                             animation:'pulse 1s infinite'}}/>
                <span style={{fontSize:8,color:'#fff',fontWeight:700}}>LIVE</span>
              </div>
              {sketchCount > 0 && (
                <div style={{position:'absolute',bottom:6,right:8,
                             background:'rgba(0,0,0,.7)',borderRadius:8,
                             padding:'2px 8px',fontSize:8,color:T.green}}>
                  {sketchCount} sketches
                </div>
              )}
              {phase === 'sketching' && (
                <div style={{position:'absolute',inset:0,display:'flex',
                             alignItems:'center',justifyContent:'center',
                             background:'rgba(0,0,0,.3)'}}>
                  <div style={{background:'rgba(0,0,0,.8)',borderRadius:8,
                               padding:'6px 12px',fontSize:10,color:T.green,
                               display:'flex',alignItems:'center',gap:6}}>
                    <Spinner color={T.green}/>
                    Sketching...
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Hidden capture canvas */}
        <canvas ref={captureRef} style={{display:'none'}}/>

        {/* Last captured image */}
        {capturedImage && (
          <div style={{borderRadius:9,overflow:'hidden',flexShrink:0,
                       border:`1px solid ${T.gold}44`}}>
            <div style={{padding:'4px 8px',background:T.card,
                         fontSize:8,color:T.gold,fontFamily:'monospace',
                         borderBottom:`1px solid ${T.border}`}}>
              📸 Last captured frame
            </div>
            <img src={capturedImage} alt="captured"
              style={{width:'100%',display:'block',maxHeight:140,
                      objectFit:'cover',transform:'scaleX(-1)'}}/>
          </div>
        )}

        {/* Status */}
        {statusMsg !== '' && (
          <div style={{padding:'6px 10px',borderRadius:7,
                       background:phase==='error'?T.redD:T.greenD,
                       border:`1px solid ${phase==='error'?T.red:T.green}33`,
                       fontSize:9,color:phase==='error'?T.red:T.green,
                       lineHeight:1.7}}>
            {statusMsg}
          </div>
        )}

        {/* Error */}
        {phase === 'error' && errorMsg && (
          <VCard>
            <div style={{color:T.red,fontWeight:700,fontSize:10,marginBottom:4}}>
              ⚠️ Camera Error
            </div>
            <div style={{fontSize:8,color:'#cc5555',lineHeight:1.7,marginBottom:6}}>
              {errorMsg}
            </div>
            <button onClick={()=>{setPhase('idle');setErrorMsg('')}} style={{
              width:'100%',padding:6,borderRadius:6,border:`1px solid ${T.red}44`,
              background:T.redD,color:T.red,fontSize:9,cursor:'pointer'}}>
              Dismiss
            </button>
          </VCard>
        )}

        {/* Capture interval */}
        <VCard title="Capture Interval">
          <div style={{display:'flex',gap:3,marginBottom:4}}>
            {INTERVALS.map(i=>(
              <button key={i.value} onClick={()=>setCaptureMs(i.value)} style={{
                flex:1,padding:'6px 2px',borderRadius:6,fontSize:9,
                border:`1px solid ${captureMs===i.value?T.gold:T.border}`,
                background:captureMs===i.value?T.goldD:'#0a0a0f',
                color:captureMs===i.value?T.gold:T.sub,
                cursor:'pointer',fontFamily:'inherit',fontWeight:captureMs===i.value?700:400}}>
                {i.label}
              </button>
            ))}
          </div>
          <div style={{fontSize:7,color:T.dim}}>
            How often to auto-capture. 1s = smooth live feel.
          </div>
        </VCard>

        {/* Edge settings */}
        <VCard title="Edge Settings">
          <SliderRow label="Detail Level" value={detailLevel} min={1} max={5} step={1}
            display={['','Minimal','Light','Medium','Detailed','Maximum'][detailLevel]}
            hint="2-3 recommended for speed"
            color={T.gold} onChange={setDetailLevel}/>
          <SliderRow label="Draw Speed" value={drawSpeed} min={3} max={9} step={1}
            display={['','Slowest','Slow','Normal','Medium','Fast','Faster','Quick','Rapid','Max'][drawSpeed]}
            hint="Higher = faster stroke animation"
            color={T.gold} onChange={(v)=>{setDrawSpeed(v); canvasRef?.current?.setSpeed?.(v)}}/>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:10,color:useHed?T.blue:T.sub}}>🧠 HED Neural</div>
              <div style={{fontSize:8,color:T.dim}}>
                {useHed?'~3s per frame — slow for webcam':'~0.3s — recommended'}
              </div>
            </div>
            <Toggle value={useHed} onChange={setUseHed} color={T.blue}/>
          </div>
        </VCard>

        {/* Camera selection */}
        <VCard title="Camera">
          <div style={{display:'flex',gap:4,marginBottom:6}}>
            {[['user','🤳 Front'],['environment','📷 Back']].map(([v,lbl])=>(
              <button key={v} onClick={()=>setFacingMode(v)} style={{
                flex:1,padding:'7px 4px',borderRadius:7,fontSize:9,
                border:`1px solid ${facingMode===v?T.green:T.border}`,
                background:facingMode===v?T.greenD:'#0a0a0f',
                color:facingMode===v?T.green:T.sub,
                cursor:'pointer',fontFamily:'inherit'}}>
                {lbl}
              </button>
            ))}
          </div>
          <div style={{fontSize:8,color:T.dim,lineHeight:1.7}}>
            💡 Back camera = phones only.<br/>
            Laptop users: front camera only.
          </div>
        </VCard>

        {/* Tips */}
        {!running && (
          <VCard title="Tips">
            <div style={{fontSize:8,color:T.sub,lineHeight:2}}>
              ⚠️ Point camera at YOUR FACE<br/>
              ✓ Good lighting = better sketch<br/>
              ✓ Plain wall background = cleaner result<br/>
              ✓ Hold still when capturing<br/>
              ✓ Use Canny (HED off) for real-time<br/>
              ✓ Detail Level 2 = fastest response
            </div>
          </VCard>
        )}
      </div>

      {/* Bottom buttons */}
      <div style={{padding:'9px',borderTop:`1px solid ${T.border}`,
                   background:T.panel,flexShrink:0,display:'flex',
                   flexDirection:'column',gap:6}}>

        {/* Capture Now — always visible when running */}
        {running && (
          <button
            onClick={doCapture}
            style={{
              width:'100%',padding:10,borderRadius:9,border:'none',
              background:`linear-gradient(135deg,${T.gold},#e05510)`,
              color:'#08060a',fontSize:12,fontWeight:800,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:7,
              boxShadow:'0 4px 16px rgba(245,197,66,.4)',
            }}>
            📸 Capture Now
          </button>
        )}

        {/* Start / Stop */}
        {!running ? (
          <button onClick={startWebcam} disabled={busy} style={{
            width:'100%',padding:12,borderRadius:10,border:'none',
            background:busy?'#0e0e18':`linear-gradient(135deg,${T.green},#059669)`,
            color:busy?'#2a2a3a':'#fff',fontSize:12,fontWeight:800,
            cursor:busy?'not-allowed':'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            boxShadow:busy?'none':`0 4px 20px ${T.green}55`,
            transition:'all .25s'}}>
            {busy?<><Spinner color={T.green}/> Starting...</>:'📷 Start Live Sketch'}
          </button>
        ) : (
          <button onClick={stopWebcam} style={{
            width:'100%',padding:11,borderRadius:9,
            border:`1px solid ${T.red}44`,background:T.redD,
            color:T.red,fontSize:11,fontWeight:700,cursor:'pointer'}}>
            ⏹ Stop Webcam
          </button>
        )}

        <div style={{textAlign:'center',fontSize:7,color:T.sub,fontFamily:'monospace'}}>
          {running
            ? `● auto-capture every ${INTERVALS.find(i=>i.value===captureMs)?.label} · ${sketchCount} done`
            : 'browser camera permission required'}
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
      flexShrink:0,background:value?color:'#1e1e2a',cursor:'pointer',
      position:'relative',transition:'background .2s',
      boxShadow:value?`0 0 8px ${color}66`:'none'}}>
      <div style={{position:'absolute',top:2,left:value?17:2,width:16,height:16,
                   borderRadius:'50%',background:'#fff',transition:'left .2s',
                   boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
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