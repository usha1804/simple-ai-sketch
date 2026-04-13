import { useState, useRef, useCallback, useEffect } from 'react'

const T = {
  bg:'#07070c', panel:'#0d0d16', card:'#11111e', border:'#1a1a2e',
  gold:'#f5c542', goldD:'rgba(245,197,66,.1)',
  blue:'#4f9cf9', blueD:'rgba(79,156,249,.1)',
  green:'#34d399', greenD:'rgba(52,211,153,.1)',
  red:'#f87171',   redD:'rgba(248,113,113,.1)',
  text:'#ece8e0', sub:'#5a5a72', dim:'#1e1e30',
}

export default function WebcamTab({ canvasRef, onAnimationStart, onAnimationReset }) {
  const videoRef = useRef(null)
  const captureRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const processingRef = useRef(false)
  const sketchCountRef = useRef(0)

  const [phase, setPhase] = useState('idle')
  const [useHed, setUseHed] = useState(true)
  const [detailLevel, setDetailLevel] = useState(3)
  const [captureInterval, setCaptureInterval] = useState(2000)   // default 2 seconds
  const [statusMsg, setStatusMsg] = useState('')
  const [sketchCount, setSketchCount] = useState(0)
  const [capturedImage, setCapturedImage] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [facingMode, setFacingMode] = useState('user')

  // Cleanup
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

  const doCapture = useCallback(async () => {
    if (processingRef.current) return

    const video = videoRef.current
    const cap = captureRef.current
    if (!video || !cap || video.readyState < 2) return

    processingRef.current = true
    setPhase('sketching')
    setStatusMsg('Capturing frame...')

    try {
      const vw = video.videoWidth || 640
      const vh = video.videoHeight || 480
      cap.width = vw
      cap.height = vh
      const ctx = cap.getContext('2d')
      ctx.drawImage(video, 0, 0, vw, vh)

      const blob = await new Promise(res => cap.toBlob(res, 'image/jpeg', 0.92))
      const form = new FormData()
      form.append('file', new File([blob], 'webcam.jpg', { type: 'image/jpeg' }))

      const params = new URLSearchParams({
        detail_level: detailLevel,
        max_strokes: 900,
        use_hed: useHed ? 'true' : 'false',
      })

      const resp = await fetch(`/api/process?${params}`, { method: 'POST', body: form })
      if (!resp.ok) throw new Error(`Error ${resp.status}`)

      const data = await resp.json()

      if (canvasRef?.current && data.paths?.length > 0) {
        canvasRef.current.reset()
        canvasRef.current.setup(data.width, data.height)
        canvasRef.current.addPaths(data.paths)
        canvasRef.current.start()
      }

      const imgUrl = cap.toDataURL('image/jpeg', 0.85)
      setCapturedImage(imgUrl)

      sketchCountRef.current += 1
      setSketchCount(sketchCountRef.current)
      setPhase('live')
      setStatusMsg(`Sketch #${sketchCountRef.current} — ${data.total} strokes`)

    } catch (e) {
      console.error(e)
      setStatusMsg(`Error: ${e.message}`)
      setPhase('live')
    } finally {
      processingRef.current = false
    }
  }, [detailLevel, useHed, canvasRef])

  const startWebcam = useCallback(async () => {
    setPhase('requesting')
    setStatusMsg('Requesting camera access...')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      video.srcObject = stream
      video.onloadedmetadata = () => {
        video.play()
        setPhase('live')
        setStatusMsg('Camera is live — Click Capture Now')
        onAnimationStart?.()
      }
    } catch (e) {
      setPhase('error')
      setErrorMsg(e.name === 'NotAllowedError' ? 'Camera permission denied' : e.message)
    }
  }, [facingMode, onAnimationStart])

  const stopWebcamHandler = useCallback(() => {
    stopWebcam()
  }, [stopWebcam])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'row', height: '100%', overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{
        width: 280,
        background: T.panel,
        borderRight: `1px solid ${T.border}`,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        flexShrink: 0,
      }}>

        <div style={{ fontSize: 15, fontWeight: 700, color: T.gold }}>📷 Live Webcam Sketch</div>

        {/* Last Captured Photo - Top of Sidebar */}
        {capturedImage && (
          <div>
            <div style={{ fontSize: 10, color: T.sub, marginBottom: 6 }}>Last Captured</div>
            <img
              src={capturedImage}
              alt="last captured"
              style={{
                width: '100%',
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                maxHeight: 140,
                objectFit: 'cover',
                transform: 'scaleX(-1)',
              }}
            />
          </div>
        )}

        {/* Capture Now Button */}
        <button
          onClick={doCapture}
          disabled={phase !== 'live'}
          style={{
            padding: 14,
            borderRadius: 10,
            border: 'none',
            background: `linear-gradient(135deg, ${T.gold}, #e05510)`,
            color: '#08060a',
            fontWeight: 800,
            cursor: phase === 'live' ? 'pointer' : 'not-allowed',
          }}
        >
          📸 Capture Now
        </button>

        {/* Start / Stop Button */}
        <button
          onClick={phase === 'live' ? stopWebcamHandler : startWebcam}
          style={{
            padding: 13,
            borderRadius: 10,
            border: `1px solid ${phase === 'live' ? T.red : T.green}44`,
            background: phase === 'live' ? T.redD : T.greenD,
            color: phase === 'live' ? T.red : T.green,
            fontWeight: 700,
          }}
        >
          {phase === 'live' ? '⏹ Stop Live Sketch' : '▶ Start Live Sketch'}
        </button>

        {/* Capture Interval Timer Buttons */}
        <div>
          <div style={{ fontSize: 10, color: T.sub, marginBottom: 6 }}>Capture Timer</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[1000, 2000, 3000, 4000, 5000].map((ms) => (
              <button
                key={ms}
                onClick={() => setCaptureInterval(ms)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 6,
                  fontSize: 9,
                  border: `1px solid ${captureInterval === ms ? T.gold : T.border}`,
                  background: captureInterval === ms ? T.goldD : '#0a0a0f',
                  color: captureInterval === ms ? T.gold : T.sub,
                  cursor: 'pointer',
                }}
              >
                {ms / 1000}s
              </button>
            ))}
          </div>
        </div>

        {/* Detail Level with Labels */}
        <div>
          <div style={{ fontSize: 10, color: T.sub, marginBottom: 6 }}>Detail Level</div>
          <input
            type="range"
            min={1} max={5} step={1}
            value={detailLevel}
            onChange={e => setDetailLevel(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 9, color: T.dim, textAlign: 'center', marginTop: 4 }}>
            {['Very Light', 'Light', 'Medium', 'Detailed', 'Maximum'][detailLevel - 1]}
          </div>
        </div>

        {/* HED Neural Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: T.sub }}>HED Neural (Better Faces)</span>
          <div
            onClick={() => setUseHed(!useHed)}
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              background: useHed ? T.blue : '#1e1e2a',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 2,
              left: useHed ? 19 : 2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
            }} />
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', gap: 12 }}>

        {/* Video Preview */}
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', flexShrink: 0 }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              display: 'block',
              maxHeight: 260,
              objectFit: 'cover',
              transform: 'scaleX(-1)',
            }}
          />
          {phase === 'live' && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.7)', padding: '4px 12px', borderRadius: 20, fontSize: 11, color: T.green }}>
              ● LIVE
            </div>
          )}
        </div>

        {/* Hidden Capture Canvas */}
        <canvas ref={captureRef} style={{ display: 'none' }} />

        {/* Centered Sketch Canvas */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: T.panel,
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          position: 'relative',
          minHeight: 340,
        }}>
          {canvasRef?.current ? (
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: 10,
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              }}
            />
          ) : (
            <div style={{ color: T.sub, textAlign: 'center', fontSize: 14 }}>
              Your sketch will appear here after capturing
            </div>
          )}
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: T.card,
            border: `1px solid ${T.border}`,
            fontSize: 12,
            color: T.text,
            textAlign: 'center',
          }}>
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  )
}