
// import { useState, useRef, useCallback, useEffect } from 'react'
// import DrawingCanvas from './DrawingCanvas.jsx'
// import ColoringCanvas from './ColoringCanvas.jsx'
// import VideoTab from './VideoTab.jsx'
// import WebcamTab from './WebcamTab.jsx'
// import TextToSketchTab from './TextToSketchTab.jsx'
// import {
//   uploadImage, streamImage, analyseImage,
//   exportPDF, batchProcess,
//   register, login, getGallery, saveSketch, deleteSketch,
//   streamTextToSketch,
// } from './api.js'

// /* ─── Fonts ──────────────────────────────────────────────── */
// const FONT_IMPORT = `
//   @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
// `

// const PENS = [
//   { id:'pencil',   emoji:'✏️', label:'Pencil'   },
//   { id:'charcoal', emoji:'🪨', label:'Charcoal' },
//   { id:'ink',      emoji:'🖊️', label:'Ink'      },
//   { id:'brush',    emoji:'🖌️', label:'Brush'    },
//   { id:'marker',   emoji:'🖍️', label:'Marker'   },
//   { id:'neon',     emoji:'⚡', label:'Neon'     },
// ]

// const DETAIL_LABELS = ['', 'Minimal', 'Light', 'Medium', 'Detailed', 'Maximum']
// const TABS = [
//   { id:'Draw',    icon:'✏️', label:'Draw'    },
//   { id:'Text',    icon:'✨', label:'Text'    },
//   { id:'Color',   icon:'🎨', label:'Color'   },
//   { id:'Video',   icon:'🎬', label:'Video'   },
//   { id:'Webcam',  icon:'📷', label:'Webcam'  },
//   { id:'Batch',   icon:'📦', label:'Batch'   },
//   { id:'Gallery', icon:'🖼️', label:'Gallery' },
//   { id:'Export',  icon:'📤', label:'Export'  },
// ]

// /* ─── Theme helper ───────────────────────────────────────── */
// function makeTheme(lightMode) {
//   if (lightMode) return {
//     app:'#f5f5fa', panel:'#ffffff', border:'#e0e0ee', accent:'#7c3aed',
//     text:'#1a1a2e', sub:'#6b6b8a', dim:'#ebebf5', muted:'#d8d8ee',
//     gold:'#b45309', goldBg:'rgba(180,83,9,.1)', goldBdr:'rgba(180,83,9,.25)',
//     blue:'#1d4ed8', blueBg:'rgba(29,78,216,.1)', blueBdr:'rgba(29,78,216,.25)',
//     green:'#15803d', greenBg:'rgba(21,128,61,.1)', greenBdr:'rgba(21,128,61,.25)',
//     red:'#dc2626', redBg:'rgba(220,38,38,.1)', redBdr:'rgba(220,38,38,.25)',
//     orange:'#c2410c', orangeBg:'rgba(194,65,12,.1)',
//     purple:'#7c3aed', purpleBg:'rgba(124,58,237,.1)', purpleBdr:'rgba(124,58,237,.25)',
//     pink:'#be185d', pinkBg:'rgba(190,24,93,.1)', pinkBdr:'rgba(190,24,93,.25)',
//     cyan:'#0e7490',
//   }
//   return {
//     app:'#08080f', panel:'#0d0d18', border:'#1a1a2e', accent:'#a78bfa',
//     text:'#eceaf4', sub:'#5a5a78', dim:'#2a2a3e', muted:'#3a3a52',
//     gold:'#f5c542',
//     goldBg:  'rgba(245,197,66,.1)',
//     goldBdr: 'rgba(245,197,66,.25)',
//     blue:    '#4f9cf9',
//     blueBg:  'rgba(79,156,249,.1)',
//     blueBdr: 'rgba(79,156,249,.25)',
//     green:   '#34d399',
//     greenBg: 'rgba(52,211,153,.1)',
//     greenBdr:'rgba(52,211,153,.25)',
//     red:     '#f87171',
//     redBg:   'rgba(248,113,113,.1)',
//     redBdr:  'rgba(248,113,113,.25)',
//     orange:  '#fb923c',
//     orangeBg:'rgba(251,146,60,.1)',
//     purple:  '#a78bfa',
//     purpleBg:'rgba(167,139,250,.1)',
//     purpleBdr:'rgba(167,139,250,.25)',
//     pink:    '#f472b6',
//     pinkBg:  'rgba(244,114,182,.1)',
//     pinkBdr: 'rgba(244,114,182,.25)',
//     cyan:    '#22d3ee',
//   }
// }

// export default function App() {
//   const canvasRef     = useRef(null)
//   const wsStopRef     = useRef(null)
//   const fileInputRef  = useRef(null)
//   const batchInputRef = useRef(null)

//   const [file,          setFile]          = useState(null)
//   const [colorFillMode, setColorFillMode] = useState(false)
//   const [preview,       setPreview]       = useState(null)
//   const [detail,        setDetail]        = useState(3)
//   const [maxPaths,      setMaxPaths]      = useState(600)
//   const [penStyle,      setPenStyle]      = useState('pencil')
//   const [useWS,         setUseWS]         = useState(false)
//   const [dragging,      setDragging]      = useState(false)
//   const [activeTab,     setActiveTab]     = useState('Draw')

//   const [useHed,        setUseHed]        = useState(false)
//   const [removeBg,      setRemoveBg]      = useState(false)
//   const [coloringBook,  setColoringBook]  = useState(false)
//   const [crosshatch,    setCrosshatch]    = useState(false)
//   const [paperTexture,  setPaperTexture]  = useState(false)
//   const [watercolour,   setWatercolour]   = useState(false)

//   const [lightMode,     setLightMode]     = useState(false)
//   const [strokeOpacity, setStrokeOpacity] = useState(92)
//   const [strokeWidth,   setStrokeWidth]   = useState(100)

//   const [phase,         setPhase]         = useState('idle')
//   const [statusMsg,     setStatusMsg]     = useState('')
//   const [showCanvas,    setShowCanvas]    = useState(false)
//   const [backendOk,     setBackendOk]     = useState(null)
//   const [hedReady,      setHedReady]      = useState(false)
//   const [engineUsed,    setEngineUsed]    = useState(null)
//   const [strokeCount,   setStrokeCount]   = useState(0)
//   const [processingMs,  setProcessingMs]  = useState(null)
//   const [quality,       setQuality]       = useState(null)
//   const [svgData,       setSvgData]       = useState(null)
//   const [wcColors,      setWcColors]      = useState([])
//   const [paperB64,      setPaperB64]      = useState(null)
//   const [warnings,      setWarnings]      = useState([])
//   const [autoResult,    setAutoResult]    = useState(null)

//   const [batchFiles,    setBatchFiles]    = useState([])
//   const [batchPhase,    setBatchPhase]    = useState('idle')
//   const [batchProg,     setBatchProg]     = useState(0)

//   const [authMode,      setAuthMode]      = useState('login')
//   const [authUser,      setAuthUser]      = useState('')
//   const [authPw,        setAuthPw]        = useState('')
//   const [authErr,       setAuthErr]       = useState('')
//   const [token,         setToken]         = useState(() => localStorage.getItem('sketch_token') || '')
//   const [currentUser,   setCurrentUser]   = useState(() => localStorage.getItem('sketch_user')  || '')
//   const [gallery,       setGallery]       = useState([])
//   const [saveNameVal,   setSaveNameVal]   = useState('')

//   /* ─── Text-to-sketch state ────────────────────────── */
//   const [t2sPrompt,     setT2sPrompt]     = useState('')
//   const [t2sPhase,      setT2sPhase]      = useState('idle')
//   const [t2sGenB64,     setT2sGenB64]     = useState(null)
//   const [t2sMeta,       setT2sMeta]       = useState(null)
//   const t2sAbortRef  = useRef(null)
//   const t2sPromptRef = useRef('')   // always up-to-date, safe to read in callbacks
//   const t2sBusy = ['generating','processing','drawing'].includes(t2sPhase)

//   const T = makeTheme(lightMode)
//   const strokeColors = ['#1a1a1a']  // color-fill mode overrides this
//   const engineColor  = activeTab === 'Text'
//     ? T.purple
//     : coloringBook ? T.pink : useHed ? T.blue : T.gold
//   const engineLabel  = coloringBook ? 'Colouring Book' : useHed ? 'HED Neural' : 'Canny'
//   const busy         = ['connecting','processing','drawing'].includes(phase)
//   const canDraw      = !!file && !busy && backendOk !== false

//   /* ─── Health ping ─────────────────────────────── */
//   useEffect(() => {
//     const ping = () =>
//       fetch('/api/health', { signal: AbortSignal.timeout(3000) })
//         .then(r => r.json())
//         .then(d => { setBackendOk(true); setHedReady(d.hed_ready) })
//         .catch(() => setBackendOk(false))
//     ping(); const t = setInterval(ping, 8000); return () => clearInterval(t)
//   }, [])

//   useEffect(() => {
//     if (activeTab === 'Gallery' && token)
//       getGallery(token).then(d => setGallery(d.sketches || [])).catch(() => {})
//   }, [activeTab, token])

//   /* ─── File pick ───────────────────────────────── */
//   const pickFile = useCallback(async (f) => {
//     if (!f || !f.type.startsWith('image/')) return
//     if (preview) URL.revokeObjectURL(preview)
//     setFile(f); setPreview(URL.createObjectURL(f))
//     setPhase('idle'); setStatusMsg(''); setShowCanvas(false)
//     setEngineUsed(null); setStrokeCount(0); setProcessingMs(null)
//     setQuality(null); setSvgData(null); setWarnings([])
//     setAutoResult(null); setWcColors([]); setPaperB64(null)
//     canvasRef.current?.reset(); setActiveTab('Draw')
//     try {
//       setStatusMsg('Analysing...')
//       const r = await analyseImage(f)
//       setAutoResult(r)
//       setDetail(r.detail_level); setMaxPaths(r.max_strokes); setPenStyle(r.pen_style || 'pencil')
//       if (r.use_hed && hedReady) setUseHed(true)
//       if (r.screen_photo?.detected)
//         setWarnings([{ type:'screen_photo', confidence:r.screen_photo.confidence,
//           message:'Screen photo detected — right-click image → Save As → upload that file.' }])
//       setStatusMsg('')
//     } catch (_) { setStatusMsg('') }
//   }, [preview, hedReady])

//   // Keep ref in sync so generateFromText always reads latest prompt
//   const handleT2sPromptChange = useCallback((val) => {
//     setT2sPrompt(val)
//     t2sPromptRef.current = val
//   }, [])

//   const onDrop = useCallback((e) => {
//     e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0])
//   }, [pickFile])

//   /* ─── Draw ────────────────────────────────────── */
//   const draw = useCallback(async () => {
//     if (!file || busy) return
//     wsStopRef.current?.(); canvasRef.current?.reset()
//     setShowCanvas(true); setEngineUsed(null); setWarnings([])
//     setSvgData(null); setQuality(null); setWcColors([]); setPaperB64(null)
//     const opts = { useHed, removeBg, coloringBook, crosshatch, paperTexture, watercolour }
//     const t0 = Date.now()
//     try {
//       if (useWS) {
//         setPhase('connecting'); setStatusMsg('Connecting...')
//         await new Promise((resolve, reject) => {
//           wsStopRef.current = streamImage(file, detail, maxPaths, {
//             onStatus:  m  => { setPhase('processing'); setStatusMsg(m) },
//             onWarning: w  => setWarnings(p => [...p, w]),
//             onMeta:    m  => {
//               canvasRef.current?.setup(m.width, m.height)
//               setEngineUsed(m.engine); setStrokeCount(m.total)
//               setProcessingMs(Date.now() - t0)
//               setPhase('drawing'); setStatusMsg(`Drawing ${m.total} strokes...`)
//               setTimeout(() => canvasRef.current?.start(), 60)
//             },
//             onChunk: paths => canvasRef.current?.addPaths(paths),
//             onDone:  msg  => {
//               setPhase('done'); setStatusMsg('')
//               if (msg?.svg)       setSvgData(msg.svg)
//               if (msg?.quality)   setQuality(msg.quality)
//               if (msg?.wc_colors) setWcColors(msg.wc_colors)
//               if (msg?.paper_b64) setPaperB64(msg.paper_b64)
//               resolve()
//             },
//             onError: msg => { setPhase('error'); setStatusMsg(msg); reject(new Error(msg)) },
//           }, opts)
//         })
//       } else {
//         setPhase('processing')
//         setStatusMsg(coloringBook ? 'Colouring-book mode...' : useHed ? 'Running HED neural network...' : 'Detecting edges...')
//         const data = await uploadImage(file, detail, maxPaths, pct => {
//           if (pct === 100) setStatusMsg('Tracing paths...')
//         }, opts)
//         if (data.warnings?.length) setWarnings(data.warnings)
//         if (data.svg)       setSvgData(data.svg)
//         if (data.quality)   setQuality(data.quality)
//         if (data.wc_colors) setWcColors(data.wc_colors)
//         if (data.paper_b64) setPaperB64(data.paper_b64)
//         setEngineUsed(data.engine); setStrokeCount(data.total)
//         setProcessingMs(Date.now() - t0)
//         canvasRef.current?.setup(data.width, data.height)
//         canvasRef.current?.addPaths(data.paths)
//         setPhase('drawing'); setStatusMsg(`Drawing ${data.total} strokes...`)
//         setTimeout(() => canvasRef.current?.start(), 60)
//       }
//     } catch (e) { setPhase('error'); setStatusMsg(e?.message || 'Error — is python main.py running?') }
//   }, [file, busy, useWS, detail, maxPaths, useHed, removeBg, coloringBook, crosshatch, paperTexture, watercolour])

//   /* ─── Export helpers ──────────────────────────── */
//   const dlSVG = useCallback(() => {
//     if (!svgData) return
//     const a = Object.assign(document.createElement('a'), {
//       href: URL.createObjectURL(new Blob([svgData], { type:'image/svg+xml' })), download:'sketch.svg'
//     }); a.click(); URL.revokeObjectURL(a.href)
//   }, [svgData])

//   const dlPNG = useCallback(() => {
//     const c = document.querySelector('canvas'); if (!c) return
//     Object.assign(document.createElement('a'), { href:c.toDataURL('image/png'), download:'sketch.png' }).click()
//   }, [])

//   const dlPDF = useCallback(async () => {
//     if (!file) return; setStatusMsg('Generating PDF...')
//     try { await exportPDF(file, { detailLevel:detail, maxStrokes:maxPaths, useHed }) }
//     catch (_) { alert('PDF failed — pip install reportlab') }
//     setStatusMsg('')
//   }, [file, detail, maxPaths, useHed])

//   const runBatch = useCallback(async () => {
//     if (!batchFiles.length) return
//     setBatchPhase('processing'); setBatchProg(0)
//     try {
//       await batchProcess(batchFiles, { detailLevel:detail, maxStrokes:maxPaths, useHed, onProgress:p => setBatchProg(p) })
//       setBatchPhase('done')
//     } catch (_) { setBatchPhase('error') }
//   }, [batchFiles, detail, maxPaths, useHed])

//   const doAuth = useCallback(async () => {
//     setAuthErr('')
//     try {
//       const res = authMode === 'register' ? await register(authUser, authPw) : await login(authUser, authPw)
//       setToken(res.access_token); setCurrentUser(res.username)
//       localStorage.setItem('sketch_token', res.access_token)
//       localStorage.setItem('sketch_user',  res.username)
//       setAuthMode('login')
//     } catch (e) { setAuthErr(e.response?.data?.detail || 'Auth failed') }
//   }, [authMode, authUser, authPw])

//   const doLogout = useCallback(() => {
//     setToken(''); setCurrentUser(''); setGallery([])
//     localStorage.removeItem('sketch_token'); localStorage.removeItem('sketch_user')
//   }, [])

//   const doSave = useCallback(async () => {
//     if (!token || !svgData) return
//     try {
//       await saveSketch(token, saveNameVal || `Sketch ${new Date().toLocaleDateString()}`, svgData, engineUsed || 'canny', strokeCount)
//       setSaveNameVal(''); alert('Saved!')
//     } catch (_) { alert('Save failed') }
//   }, [token, svgData, saveNameVal, engineUsed, strokeCount])

//   const doDelete = useCallback(async (id) => {
//     try { await deleteSketch(token, id); setGallery(p => p.filter(s => s.id !== id)) }
//     catch (_) {}
//   }, [token])

//   /* ─── Text-to-sketch generate ─────────────────────── */
//   const generateFromText = useCallback(() => {
//     if (!t2sPromptRef.current.trim() || t2sBusy) return
//     if (backendOk === false) {
//       setT2sPhase('error')
//       setStatusMsg('Backend offline — run: cd backend && python main.py')
//       return
//     }
//     t2sAbortRef.current?.()
//     canvasRef.current?.reset()
//     setShowCanvas(true)
//     setT2sPhase('generating')
//     setT2sGenB64(null)
//     setT2sMeta(null)
//     setSvgData(null)
//     setQuality(null)
//     setStatusMsg('Generating image…')

//     t2sAbortRef.current = streamTextToSketch(
//       {
//         prompt:      t2sPromptRef.current,
//         penStyle,
//         detailLevel: detail,
//         maxStrokes:  maxPaths,
//         useHed,
//         coloringBook,
//         crosshatch,
//         generator:   'auto',
//       },
//       {
//         onStatus: m => setStatusMsg(m),
//         onImageReady: (b64) => {
//           setT2sGenB64(b64)
//           setT2sPhase('processing')
//           setStatusMsg('Extracting sketch paths…')
//         },
//         onMeta: m => {
//           canvasRef.current?.setup(m.width, m.height)
//           setT2sMeta(m)
//           setT2sPhase('drawing')
//           setStatusMsg(`Animating ${m.total} strokes…`)
//         },
//         onChunk: paths => canvasRef.current?.addPaths(paths),
//         onStartDraw: () => setTimeout(() => canvasRef.current?.start(), 60),
//         onDone: msg => {
//           setT2sPhase('done')
//           setStatusMsg('')
//           setPhase('done')
//           setEngineUsed(msg.engine || 't2s')
//           setStrokeCount(msg.total || 0)
//           if (msg.svg)     setSvgData(msg.svg)
//           if (msg.quality) setQuality(msg.quality)
//         },
//         onError: msg => {
//           setT2sPhase('error')
//           setStatusMsg(msg || 'Generation failed — check backend is running with text_to_sketch.py')
//           setPhase('error')
//           t2sAbortRef.current = null
//         },
//       }
//     )
//   }, [t2sBusy, penStyle, detail, maxPaths, useHed, coloringBook, crosshatch, canvasRef, backendOk])

//   const cancelT2S = useCallback(() => {
//     try { t2sAbortRef.current?.() } catch (_) {}
//     t2sAbortRef.current = null
//     setT2sPhase('idle')
//     setPhase('idle')
//     setStatusMsg('')
//     canvasRef.current?.reset()
//     setShowCanvas(false)
//   }, [canvasRef])

//   const isDone = phase === 'done' || t2sPhase === 'done'

//   /* ─── Render ──────────────────────────────────── */
//   return (
//     <>
//       <style>{`
//         ${FONT_IMPORT}
//         *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
//         :root { color-scheme: dark; }
//         body { overflow: hidden; background: var(--app-bg, #08080f); }
//         ::-webkit-scrollbar { width: 4px; height: 4px; }
//         ::-webkit-scrollbar-track { background: transparent; }
//         ::-webkit-scrollbar-thumb { background: rgba(128,128,128,.25); border-radius: 4px; }
//         ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,.45); }
//         input[type=range] { -webkit-appearance: none; appearance: none; height: 3px; border-radius: 2px; outline: none; cursor: pointer; background: rgba(255,255,255,.1); }
//         input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #f5c542; border: 2px solid rgba(255,255,255,.2); cursor: pointer; box-shadow: 0 0 8px rgba(245,197,66,.4); }
//         @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
//         @keyframes spin { to { transform:rotate(360deg); } }
//         @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
//         @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
//         .tab-btn:hover { background: rgba(255,255,255,.05) !important; }
//         .icon-btn:hover { opacity: 0.8; transform: scale(1.05); }
//         .draw-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 32px rgba(245,197,66,.4) !important; }
//         .draw-btn:active:not(:disabled) { transform: translateY(0); }
//       `}</style>

//       <div style={{
//         width:'100vw', height:'100vh', display:'flex', flexDirection:'column',
//         background:T.app, color:T.text, overflow:'hidden',
//         fontFamily:'"Syne", -apple-system, sans-serif',
//         transition:'background .4s ease',
//       }}>

//         {/* ══ TOPBAR ══════════════════════════════════════════ */}
//         <header style={{
//           height:58, flexShrink:0, display:'flex', alignItems:'center',
//           justifyContent:'space-between', padding:'0 16px',
//           background:T.panel,
//           borderBottom:`1px solid ${T.border}`,
//           transition:'background .4s',
//           zIndex:10,
//         }}>
//           {/* Logo */}
//           <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
//             <div style={{
//               width:36, height:36, borderRadius:10,
//               background:'linear-gradient(135deg,#f5c542 0%,#f97316 50%,#ef4444 100%)',
//               display:'flex', alignItems:'center', justifyContent:'center',
//               fontSize:18, boxShadow:'0 0 20px rgba(245,197,66,.35)', flexShrink:0,
//             }}>✏️</div>
//             <div>
//               <div style={{ fontSize:15, fontWeight:800, letterSpacing:'-.03em', lineHeight:1.1 }}>
//                 Sketch Studio
//               </div>
//               <div style={{ fontSize:8, color:T.sub, letterSpacing:'.12em', textTransform:'uppercase', fontFamily:'"JetBrains Mono",monospace' }}>
//                 AI · v6
//               </div>
//             </div>
//           </div>

//           {/* Engine Switcher */}
//           <div style={{ display:'flex', alignItems:'center', gap:8 }}>
//             <div style={{
//               display:'flex', borderRadius:10, overflow:'hidden',
//               border:`1px solid ${T.border}`,
//               background:T.dim,
//             }}>
//               {[
//                 [false,false,'⚡ Canny', T.gold],
//                 [true, false,'🧠 HED',   T.blue],
//                 [false,true, '📖 Color', T.pink],
//               ].map(([hed,cb,lbl,col]) => {
//                 const on = useHed===hed && coloringBook===cb
//                 return (
//                   <button key={lbl} onClick={() => { setUseHed(hed); setColoringBook(cb) }}
//                     style={{
//                       padding:'6px 14px', border:'none', cursor:'pointer',
//                       background: on ? col+'20' : 'transparent',
//                       color: on ? col : T.sub,
//                       fontSize:11, fontWeight: on ? 700 : 400,
//                       transition:'all .18s', fontFamily:'inherit',
//                       borderRight:`1px solid ${T.border}`,
//                     }}>{lbl}</button>
//                 )
//               })}
//             </div>

//             {/* Engine status pill */}
//             {engineUsed && (
//               <div style={{
//                 padding:'5px 12px', borderRadius:20,
//                 background: engineColor + '18',
//                 border:`1px solid ${engineColor}40`,
//                 fontSize:10, color:engineColor,
//                 fontFamily:'"JetBrains Mono",monospace',
//                 display:'flex', alignItems:'center', gap:6,
//                 animation:'fadeIn .3s ease',
//               }}>
//                 <PulseDot color={engineColor} />
//                 {engineUsed.toUpperCase()}
//                 {strokeCount > 0 && <span style={{ color:T.sub }}>· {strokeCount}</span>}
//                 {processingMs > 0 && <span style={{ color:T.sub }}>· {(processingMs/1000).toFixed(1)}s</span>}
//                 {quality?.grade && <span style={{ color:T.gold, fontWeight:700 }}>· {quality.grade}</span>}
//               </div>
//             )}
//           </div>

//           {/* Right side controls */}
//           <div style={{ display:'flex', alignItems:'center', gap:10 }}>
//             {/* Light/Dark toggle */}
//             <button
//               onClick={() => setLightMode(v => !v)}
//               title={lightMode ? 'Switch to Dark' : 'Switch to Light'}
//               style={{
//                 width:32, height:32, borderRadius:8, border:`1px solid ${T.border}`,
//                 background: lightMode ? '#f5c542' : 'rgba(255,255,255,.08)',
//                 color: lightMode ? '#08060a' : '#f5c542',
//                 cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
//                 fontSize:15, flexShrink:0, transition:'all .2s',
//               }}
//             >{lightMode ? '☀️' : '🌙'}</button>

//             <Divider />

//             {/* Status */}
//             {(busy || t2sBusy || statusMsg) && (
//               <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:11, color: phase==='error' ? T.red : T.sub }}>
//                 {(busy || t2sBusy) && <Spinner color={engineColor} />}
//                 <span style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{statusMsg}</span>
//               </div>
//             )}

//             {/* Export buttons */}
//             {isDone && (
//               <div style={{ display:'flex', gap:5, animation:'fadeIn .3s ease' }}>
//                 {svgData && <ExportBtn onClick={dlSVG} color={T.green}>SVG</ExportBtn>}
//                 <ExportBtn onClick={dlPNG} color={T.gold}>PNG</ExportBtn>
//                 <ExportBtn onClick={dlPDF} color={T.orange}>PDF</ExportBtn>
//                 {token && svgData && <ExportBtn onClick={doSave} color={T.purple}>Save</ExportBtn>}
//               </div>
//             )}

//             <Divider />

//             {/* Backend status */}
//             <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10 }}>
//               <PulseDot color={backendOk===true ? T.green : backendOk===false ? T.red : T.sub} glow={backendOk===true} />
//               <span style={{ color: backendOk===true ? T.green : backendOk===false ? T.red : T.sub, fontFamily:'"JetBrains Mono",monospace', fontSize:9 }}>
//                 {backendOk===true ? 'Online' : backendOk===false ? 'Offline' : '…'}
//               </span>
//             </div>

//             {/* Auth */}
//             {currentUser
//               ? <div style={{ display:'flex', alignItems:'center', gap:7 }}>
//                   <div style={{
//                     padding:'4px 10px', borderRadius:8,
//                     background:T.purpleBg, border:`1px solid ${T.purpleBdr}`,
//                     fontSize:10, color:T.purple, display:'flex', alignItems:'center', gap:5
//                   }}>
//                     <span>👤</span><span>{currentUser}</span>
//                   </div>
//                   <button onClick={doLogout} style={{
//                     fontSize:9, color:T.sub, background:'transparent',
//                     border:`1px solid ${T.border}`, borderRadius:7, padding:'4px 9px', cursor:'pointer',
//                     fontFamily:'inherit',
//                   }}>Logout</button>
//                 </div>
//               : <button onClick={() => setActiveTab('Gallery')} style={{
//                   fontSize:10, color:T.purple, background:T.purpleBg,
//                   border:`1px solid ${T.purpleBdr}`, borderRadius:8,
//                   padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', fontWeight:600,
//                 }}>Sign In</button>
//             }
//           </div>
//         </header>

//         {/* ══ BODY ════════════════════════════════════════════ */}
//         <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

//           {/* ── SIDEBAR ─────────────────────────────────────── */}
//           <aside style={{
//             width:286, flexShrink:0, display:'flex', flexDirection:'column',
//             background:T.panel, borderRight:`1px solid ${T.border}`,
//             transition:'background .4s',
//             overflow:'hidden',
//           }}>
//             {/* Tab nav */}
//             <div style={{ display:'flex', borderBottom:`1px solid ${T.border}`, flexShrink:0, padding:'6px 6px 0' }}>
//               {TABS.map(t => (
//                 <button key={t.id} onClick={() => setActiveTab(t.id)} className="tab-btn"
//                   style={{
//                     flex:1, padding:'7px 2px 8px', border:'none', cursor:'pointer',
//                     background:'transparent',
//                     color: activeTab===t.id ? T.text : T.sub,
//                     fontSize:8, fontFamily:'inherit', fontWeight: activeTab===t.id ? 700 : 400,
//                     borderBottom: `2px solid ${activeTab===t.id ? T.accent : 'transparent'}`,
//                     transition:'all .15s',
//                     display:'flex', flexDirection:'column', alignItems:'center', gap:2,
//                   }}>
//                   <span style={{ fontSize:12 }}>{t.icon}</span>
//                   <span style={{ letterSpacing:'.04em' }}>{t.label}</span>
//                 </button>
//               ))}
//             </div>

//             {/* ── DRAW TAB ─── */}
//             {activeTab==='Draw' && (
//               <div style={{ flex:1, display:'flex', flexDirection:'column', gap:0, overflowY:'auto', minHeight:0 }}>

//                 {/* Warnings */}
//                 {warnings.filter(w => w.type==='screen_photo').map((w,i) => (
//                   <div key={i} style={{
//                     margin:'10px 10px 0',
//                     padding:'10px 12px', borderRadius:10,
//                     background:T.redBg, border:`1px solid ${T.redBdr}`,
//                     fontSize:9, lineHeight:1.7, animation:'slideIn .3s ease',
//                   }}>
//                     <div style={{ color:T.red, fontWeight:700, marginBottom:3, fontSize:10 }}>
//                       ⚠️ Screen Photo ({Math.round(w.confidence*100)}% confident)
//                     </div>
//                     <div style={{ color:'rgba(248,113,113,.7)', fontSize:8 }}>{w.message}</div>
//                   </div>
//                 ))}

//                 {/* Auto-detect result */}
//                 {autoResult && !warnings.find(w => w.type==='screen_photo') && (
//                   <div style={{
//                     margin:'10px 10px 0',
//                     padding:'9px 12px', borderRadius:10,
//                     background:T.greenBg, border:`1px solid ${T.greenBdr}`,
//                     fontSize:9, lineHeight:1.7, animation:'slideIn .3s ease',
//                   }}>
//                     <div style={{ color:T.green, fontWeight:700, marginBottom:2 }}>
//                       ✓ Auto-detected: {autoResult.label}
//                     </div>
//                     <div style={{ color:T.sub, fontSize:8 }}>
//                       Settings applied · {autoResult.use_hed && hedReady ? 'HED recommended' : 'Canny mode'}
//                     </div>
//                   </div>
//                 )}

//                 {/* Sections */}
//                 <div style={{ display:'flex', flexDirection:'column', gap:0, padding:'10px 10px 6px' }}>

//                   {/* ── Image Upload ── */}
//                   <Section title="Image" T={T}>
//                     <DropZone
//                       preview={preview} file={file} dragging={dragging} T={T}
//                       onDragOver={e => { e.preventDefault(); setDragging(true) }}
//                       onDragLeave={() => setDragging(false)}
//                       onDrop={onDrop}
//                       onClick={() => !preview && fileInputRef.current?.click()}
//                       onClear={() => {
//                         setFile(null); setPreview(null); setShowCanvas(false)
//                         setPhase('idle'); setStatusMsg(''); setEngineUsed(null)
//                         setWarnings([]); setAutoResult(null); setSvgData(null)
//                         setWcColors([]); setPaperB64(null); canvasRef.current?.reset()
//                       }}
//                     />
//                     <input ref={fileInputRef} type="file" accept="image/*"
//                       style={{ display:'none' }} onChange={e => pickFile(e.target.files[0])} />
//                     {preview && (
//                       <SmBtn T={T} style={{ marginTop:6 }} onClick={() => fileInputRef.current?.click()}>
//                         ⇄ Change Image
//                       </SmBtn>
//                     )}
//                   </Section>

//                   {/* ── Settings ── */}
//                   <Section title="Parameters" T={T} faded={busy}>
//                     <SliderField
//                       label="Edge Detail" value={detail} min={1} max={5} step={1}
//                       display={`${DETAIL_LABELS[detail]}`} color={engineColor} T={T}
//                       onChange={setDetail}
//                     />
//                     <SliderField
//                       label="Max Strokes" value={maxPaths} min={100} max={2000} step={100}
//                       display={maxPaths.toLocaleString()} color={T.gold} T={T}
//                       onChange={setMaxPaths}
//                     />

//                     {/* Pen grid */}
//                     <FieldLabel T={T}>Pen Style</FieldLabel>
//                     <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5, marginBottom:12 }}>
//                       {PENS.map(p => (
//                         <button key={p.id} onClick={() => setPenStyle(p.id)} style={{
//                           padding:'8px 4px', borderRadius:9, fontSize:8,
//                           border:`1px solid ${penStyle===p.id ? T.gold : T.border}`,
//                           background: penStyle===p.id ? T.goldBg : 'rgba(255,255,255,.02)',
//                           color: penStyle===p.id ? T.gold : T.sub,
//                           cursor:'pointer', transition:'all .15s', fontFamily:'inherit',
//                           display:'flex', flexDirection:'column', alignItems:'center', gap:3,
//                         }}>
//                           <span style={{ fontSize:14 }}>{p.emoji}</span>
//                           <span style={{ fontWeight: penStyle===p.id ? 700 : 400 }}>{p.label}</span>
//                         </button>
//                       ))}
//                     </div>

//                     {/* Transfer mode */}
//                     <FieldLabel T={T}>Transfer Mode</FieldLabel>
//                     <div style={{ display:'flex', gap:5, marginBottom:4 }}>
//                       {[[false,'REST API'],[true,'WebSocket']].map(([v,lbl]) => (
//                         <button key={lbl} onClick={() => setUseWS(v)} style={{
//                           flex:1, padding:'7px 4px', borderRadius:8, fontSize:9,
//                           border:`1px solid ${useWS===v ? T.purple : T.border}`,
//                           background: useWS===v ? T.purpleBg : 'rgba(255,255,255,.02)',
//                           color: useWS===v ? T.purple : T.sub,
//                           cursor:'pointer', transition:'all .15s', fontFamily:'inherit', fontWeight: useWS===v ? 700 : 400,
//                         }}>{lbl}</button>
//                       ))}
//                     </div>
//                   </Section>

//                   {/* ── AI Features ── */}
//                   <Section title="AI Features" T={T} faded={busy}>
//                     {[
//                       { key:'removeBg',     val:removeBg,     set:setRemoveBg,     color:T.green,  icon:'✂️', label:'Background Removal', sub:'rembg / U2-Net AI' },
//                       { key:'crosshatch',   val:crosshatch,   set:setCrosshatch,   color:T.orange, icon:'⊞',  label:'Cross-Hatch',         sub:'Shading effect' },
//                       { key:'paperTexture', val:paperTexture, set:setPaperTexture, color:T.orange, icon:'📄', label:'Paper Texture',        sub:'Realistic feel' },
//                       { key:'watercolour',  val:watercolour,  set:setWatercolour,  color:T.cyan,   icon:'🎨', label:'Watercolour',          sub:'Colour from pixels' },
//                       { key:'colorFill',    val:colorFillMode,set:setColorFillMode,color:T.orange, icon:'🎨', label:'Color Fill',             sub:'Fill with original image colors' },
//                     ].map(f => (
//                       <div key={f.key} style={{
//                         display:'flex', alignItems:'center', justifyContent:'space-between',
//                         padding:'8px 0', borderBottom:`1px solid ${T.border}`,
//                       }}>
//                         <div style={{ display:'flex', alignItems:'center', gap:8 }}>
//                           <div style={{
//                             width:30, height:30, borderRadius:8, flexShrink:0,
//                             background: f.val ? f.color+'18' : T.dim,
//                             border:`1px solid ${f.val ? f.color+'40' : T.border}`,
//                             display:'flex', alignItems:'center', justifyContent:'center', fontSize:13,
//                             transition:'all .2s',
//                           }}>{f.icon}</div>
//                           <div>
//                             <div style={{ fontSize:10, color: f.val ? f.color : T.text, fontWeight: f.val ? 600 : 400, marginBottom:1 }}>
//                               {f.label}
//                             </div>
//                             <div style={{ fontSize:8, color:T.sub }}>{f.sub}</div>
//                           </div>
//                         </div>
//                         <Toggle value={f.val} onChange={f.set} color={f.color} />
//                       </div>
//                     ))}
//                   </Section>

//                   {/* ── Stroke Color ── */}
//                   <Section title="Stroke Opacity & Width" T={T}>
//                     <SliderField label="Opacity" value={strokeOpacity} min={10} max={100} step={5} display={`${strokeOpacity}%`} color={T.purple} T={T} onChange={setStrokeOpacity} />
//                     <SliderField label="Width"   value={strokeWidth}   min={50} max={300} step={10} display={`${strokeWidth}%`}  color={T.purple} T={T} onChange={setStrokeWidth}   />
//                   </Section>

//                   {/* ── Sketch Quality ── */}
//                   {quality && (
//                     <Section title="Quality" T={T}>
//                       <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
//                         <div style={{ flex:1, height:6, borderRadius:3, background:T.dim, overflow:'hidden' }}>
//                           <div style={{
//                             width:`${quality.score}%`, height:'100%', borderRadius:3,
//                             background: quality.score>70 ? T.green : quality.score>40 ? T.gold : T.red,
//                             transition:'width .6s ease', boxShadow:`0 0 8px currentColor`,
//                           }} />
//                         </div>
//                         <span style={{
//                           fontSize:15, fontWeight:800, fontFamily:'"JetBrains Mono",monospace',
//                           color: quality.score>70 ? T.green : quality.score>40 ? T.gold : T.red,
//                         }}>{quality.score}%</span>
//                         <span style={{ fontSize:11, color:T.gold, fontWeight:700 }}>{quality.grade}</span>
//                       </div>
//                       {quality.issues?.map((iss,i) => (
//                         <div key={i} style={{ fontSize:8, color:T.red, lineHeight:1.8, padding:'2px 0' }}>⚠ {iss}</div>
//                       ))}
//                     </Section>
//                   )}

//                   {/* ── Gallery save ── */}
//                   {phase==='done' && token && svgData && (
//                     <Section T={T}>
//                       <FieldLabel T={T}>Save to Gallery</FieldLabel>
//                       <input
//                         value={saveNameVal} onChange={e => setSaveNameVal(e.target.value)}
//                         placeholder={`Sketch ${new Date().toLocaleDateString()}`}
//                         style={{
//                           width:'100%', background:'rgba(255,255,255,.04)',
//                           border:`1px solid ${T.border}`, borderRadius:8,
//                           padding:'7px 10px', color:T.text, fontSize:10,
//                           fontFamily:'inherit', outline:'none', marginBottom:7,
//                           transition:'border .2s',
//                         }}
//                       />
//                       <SmBtn T={T} onClick={doSave} accent={T.purple}>💾 Save to Gallery</SmBtn>
//                     </Section>
//                   )}

//                 </div>{/* end sections */}
//               </div>
//             )}

//             {/* ── COLOR TAB ─── */}
//             {activeTab==='Color' && (
//               <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:8, overflowY:'auto', minHeight:0 }}>
//                 <div style={{ fontSize:9, color:T.sub, textAlign:'center', lineHeight:1.9 }}>
//                   <div style={{ fontSize:20, marginBottom:6 }}>🎨</div>
//                   Draw closed shapes on the canvas,<br />then click <strong style={{ color:T.text }}>Fill Regions</strong>.
//                 </div>
//               </div>
//             )}

//             {/* ── VIDEO / WEBCAM TABS ─── */}
//             {activeTab==='Video'  && <VideoTab  canvasRef={canvasRef} onAnimationStart={()=>setShowCanvas(true)} onAnimationReset={()=>setShowCanvas(false)} onSketchReady={()=>{}} />}
//             {activeTab==='Webcam' && <WebcamTab canvasRef={canvasRef} onAnimationStart={()=>setShowCanvas(true)} onAnimationReset={()=>setShowCanvas(false)} />}

//             {/* ══ TEXT-TO-SKETCH TAB ══ */}
//             {activeTab==='Text' && (
//               <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflow:'hidden' }}>
//                 <TextToSketchTab
//                   canvasRef={canvasRef}
//                   onAnimationStart={() => setShowCanvas(true)}
//                   onAnimationReset={() => setShowCanvas(false)}
//                   T={T}
//                   externalPrompt={t2sPrompt}
//                   onPromptChange={handleT2sPromptChange}
//                   phase={t2sPhase}
//                   genImageB64={t2sGenB64}
//                   onGenerate={generateFromText}
//                   onCancel={cancelT2S}
//                   busy={t2sBusy}
//                 />
//               </div>
//             )}

//             {/* ── BATCH TAB ─── */}
//             {activeTab==='Batch' && (
//               <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:0, padding:'10px 10px 0', minHeight:0 }}>
//                 <Section title="Batch Processing" T={T}>
//                   <p style={{ fontSize:10, color:T.sub, lineHeight:1.8, marginBottom:10 }}>
//                     Upload multiple images and download all as SVG files in a ZIP archive.
//                   </p>
//                   <input ref={batchInputRef} type="file" accept="image/*" multiple
//                     style={{ display:'none' }} onChange={e => setBatchFiles(Array.from(e.target.files))} />
//                   <SmBtn T={T} onClick={() => batchInputRef.current?.click()} style={{ marginBottom:8 }}>
//                     📂 Select Images ({batchFiles.length} selected)
//                   </SmBtn>
//                   {batchFiles.length > 0 && (
//                     <div style={{ maxHeight:110, overflowY:'auto', marginBottom:8 }}>
//                       {batchFiles.map((f,i) => (
//                         <div key={i} style={{
//                           fontSize:8, color:T.sub, padding:'3px 6px', fontFamily:'"JetBrains Mono",monospace',
//                           overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
//                           borderBottom:`1px solid ${T.border}`,
//                         }}>{i+1}. {f.name}</div>
//                       ))}
//                     </div>
//                   )}
//                   {batchPhase==='processing' && (
//                     <div style={{ marginBottom:10 }}>
//                       <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
//                         <Spinner color={T.gold} />
//                         <span style={{ fontSize:10, color:T.sub }}>Processing… {batchProg}%</span>
//                       </div>
//                       <ProgressBar value={batchProg} color={T.gold} T={T} />
//                     </div>
//                   )}
//                   {batchPhase==='done' && (
//                     <div style={{
//                       marginBottom:8, padding:'8px 10px', borderRadius:8,
//                       background:T.greenBg, border:`1px solid ${T.greenBdr}`,
//                       fontSize:9, color:T.green,
//                     }}>✓ Complete — ZIP downloaded.</div>
//                   )}
//                   <button onClick={runBatch} disabled={!batchFiles.length || batchPhase==='processing'} style={{
//                     width:'100%', padding:12, borderRadius:10, border:'none',
//                     background: batchFiles.length ? 'linear-gradient(135deg,#f5c542,#e05510)' : T.dim,
//                     color: batchFiles.length ? '#08060a' : T.sub,
//                     fontSize:12, fontWeight:700, cursor: batchFiles.length ? 'pointer' : 'not-allowed',
//                     display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit',
//                   }}>
//                     {batchPhase==='processing' ? <><Spinner color={T.gold} /> Processing…</> : `📦 Process ${batchFiles.length} Images`}
//                   </button>
//                 </Section>
//                 <Section title="Settings" T={T}>
//                   <SliderField label="Edge Detail" value={detail} min={1} max={5} step={1} display={DETAIL_LABELS[detail]} color={T.gold} T={T} onChange={setDetail} />
//                   <SliderField label="Max Strokes" value={maxPaths} min={100} max={2000} step={100} display={maxPaths.toLocaleString()} color={T.gold} T={T} onChange={setMaxPaths} />
//                   <ToggleRow label="HED Neural Mode" sub="Apply to all" value={useHed} onChange={setUseHed} color={T.blue} T={T} />
//                 </Section>
//               </div>
//             )}

//             {/* ── GALLERY TAB ─── */}
//             {activeTab==='Gallery' && (
//               <div style={{ flex:1, overflowY:'auto', padding:'10px 10px 0', minHeight:0 }}>
//                 {!currentUser ? (
//                   <Section title={authMode==='login' ? 'Sign In' : 'Create Account'} T={T}>
//                     <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
//                       <StyledInput value={authUser} onChange={e => setAuthUser(e.target.value)} placeholder="Username" T={T} />
//                       <StyledInput value={authPw} onChange={e => setAuthPw(e.target.value)} placeholder="Password" type="password"
//                         onKeyDown={e => e.key==='Enter' && doAuth()} T={T} />
//                       {authErr && <div style={{ fontSize:9, color:T.red }}>{authErr}</div>}
//                       <button onClick={doAuth} style={{
//                         padding:10, borderRadius:9, border:'none',
//                         background:'linear-gradient(135deg,#a78bfa,#7c3aed)',
//                         color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
//                       }}>{authMode==='login' ? 'Sign In' : 'Create Account'}</button>
//                       <button onClick={() => setAuthMode(authMode==='login' ? 'register' : 'login')} style={{
//                         background:'transparent', border:'none', color:T.sub, fontSize:9, cursor:'pointer', fontFamily:'inherit',
//                       }}>{authMode==='login' ? 'Need an account? Register' : '← Back to sign in'}</button>
//                     </div>
//                   </Section>
//                 ) : (
//                   <>
//                     <Section T={T}>
//                       <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
//                         <div>
//                           <div style={{ fontSize:12, color:T.purple, fontWeight:700 }}>👤 {currentUser}</div>
//                           <div style={{ fontSize:9, color:T.sub, marginTop:2 }}>{gallery.length} saved sketches</div>
//                         </div>
//                       </div>
//                     </Section>
//                     {gallery.length === 0 && (
//                       <div style={{ textAlign:'center', padding:30, color:T.sub, fontSize:11, lineHeight:1.9 }}>
//                         No saved sketches yet.<br />Draw something and save it!
//                       </div>
//                     )}
//                     {gallery.map(s => (
//                       <div key={s.id} style={{
//                         margin:'0 0 8px',
//                         padding:'10px 12px', borderRadius:10,
//                         background:'rgba(255,255,255,.02)', border:`1px solid ${T.border}`,
//                         animation:'slideIn .3s ease',
//                       }}>
//                         <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
//                           <div>
//                             <div style={{ fontSize:11, fontWeight:600, marginBottom:4 }}>{s.name}</div>
//                             <div style={{ fontSize:8, color:T.sub, fontFamily:'"JetBrains Mono",monospace', lineHeight:1.8 }}>
//                               {s.engine} · {s.paths} strokes<br />
//                               {new Date(s.created_at).toLocaleDateString()}
//                             </div>
//                           </div>
//                           <button onClick={() => doDelete(s.id)} style={{
//                             background:T.redBg, border:`1px solid ${T.redBdr}`, color:T.red,
//                             borderRadius:7, padding:'4px 9px', fontSize:9, cursor:'pointer', fontFamily:'inherit',
//                           }}>Delete</button>
//                         </div>
//                       </div>
//                     ))}
//                   </>
//                 )}
//               </div>
//             )}

//             {/* ── EXPORT TAB ─── */}
//             {activeTab==='Export' && (
//               <div style={{ flex:1, overflowY:'auto', padding:'10px 10px 0', minHeight:0 }}>
//                 <Section title="Export Formats" T={T}>
//                   {[
//                     { fmt:'SVG Vector',   icon:'📐', color:T.green,  desc:'Scalable — Figma, Illustrator, laser cutting', action:dlSVG, disabled:!svgData,    note:!svgData?'Complete a drawing first':null },
//                     { fmt:'PNG Image',    icon:'🖼️', color:T.gold,   desc:'High-res raster export from canvas',            action:dlPNG, disabled:!showCanvas, note:!showCanvas?'Complete a drawing first':null },
//                     { fmt:'PDF Document', icon:'📄', color:T.orange, desc:'Print-ready PDF — requires reportlab',           action:dlPDF, disabled:!file,        note:!file?'Upload an image first':null },
//                   ].map(e => (
//                     <div key={e.fmt} style={{
//                       marginBottom:10, padding:'12px 12px', borderRadius:10,
//                       background:'rgba(255,255,255,.02)', border:`1px solid ${T.border}`,
//                     }}>
//                       <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
//                         <div style={{ fontSize:12, fontWeight:700, color:e.color, display:'flex', alignItems:'center', gap:6 }}>
//                           {e.icon} {e.fmt}
//                         </div>
//                         <button onClick={e.action} disabled={e.disabled} style={{
//                           padding:'5px 14px', borderRadius:7,
//                           border:`1px solid ${e.disabled ? T.border : e.color+'60'}`,
//                           background: e.disabled ? 'transparent' : e.color+'18',
//                           color: e.disabled ? T.sub : e.color,
//                           fontSize:9, cursor: e.disabled ? 'not-allowed' : 'pointer',
//                           fontWeight:600, fontFamily:'inherit',
//                         }}>Download</button>
//                       </div>
//                       <div style={{ fontSize:8, color:T.sub, lineHeight:1.7 }}>{e.desc}</div>
//                       {e.note && <div style={{ fontSize:8, color:T.orange, marginTop:3 }}>↑ {e.note}</div>}
//                     </div>
//                   ))}
//                 </Section>
//                 <Section title="Setup" T={T}>
//                   <div style={{ padding:'8px 10px', borderRadius:8, background:T.dim, border:`1px solid ${T.border}` }}>
//                     <div style={{ fontSize:8, color:T.sub, marginBottom:3 }}>For PDF export, install:</div>
//                     <div style={{ fontSize:9, color:T.text, fontFamily:'"JetBrains Mono",monospace' }}>pip install reportlab</div>
//                   </div>
//                 </Section>
//               </div>
//             )}

//             {/* ── DRAW BUTTON (sticky bottom) ─── */}
//             {activeTab==='Draw' && (
//               <div style={{
//                 padding:'12px 10px', flexShrink:0,
//                 background:T.panel, borderTop:`1px solid ${T.border}`,
//                 transition:'background .4s',
//               }}>
//                 {backendOk===false && (
//                   <div style={{
//                     marginBottom:8, padding:'8px 10px', borderRadius:8,
//                     background:T.redBg, border:`1px solid ${T.redBdr}`,
//                     fontSize:8, color:T.red, fontFamily:'"JetBrains Mono",monospace', lineHeight:1.9,
//                   }}>
//                     Backend offline<br />
//                     <span style={{ color:'rgba(248,113,113,.6)' }}>cd backend && python main.py</span>
//                   </div>
//                 )}
//                 <button
//                   onClick={draw} disabled={!canDraw}
//                   className="draw-btn"
//                   style={{
//                     width:'100%', padding:14, borderRadius:12, border:'none',
//                     background: canDraw
//                       ? coloringBook ? `linear-gradient(135deg,${T.pink},#be185d)`
//                         : useHed    ? `linear-gradient(135deg,${T.blue},#1d4ed8)`
//                         :             'linear-gradient(135deg,#f5c542 0%,#f97316 60%,#ef4444 100%)'
//                       : T.dim,
//                     color: canDraw ? (coloringBook||useHed ? '#fff' : '#08060a') : T.sub,
//                     fontSize:13, fontWeight:800, cursor: canDraw ? 'pointer' : 'not-allowed',
//                     display:'flex', alignItems:'center', justifyContent:'center', gap:8,
//                     boxShadow: canDraw
//                       ? coloringBook ? `0 4px 24px ${T.pink}50` : useHed ? `0 4px 24px ${T.blue}50` : '0 4px 24px rgba(245,197,66,.35)'
//                       : 'none',
//                     transition:'all .25s',
//                     fontFamily:'inherit', letterSpacing:'-.01em',
//                   }}>
//                   {busy
//                     ? <><Spinner color={canDraw?'#fff':T.sub} /> Processing…</>
//                     : coloringBook ? '📖 Colouring Book'
//                     : useHed      ? '🧠 Neural Sketch'
//                     :               '✏️ Generate Sketch'}
//                 </button>
//                 <div style={{
//                   textAlign:'center', marginTop:6, fontSize:8, color:T.sub,
//                   fontFamily:'"JetBrains Mono",monospace', letterSpacing:'.04em',
//                 }}>
//                   {coloringBook ? 'thick outlines · print-ready'
//                     : useHed    ? `HED · ${hedReady ? 'model ready' : 'model missing'}`
//                     : `Canny · lo=${[30,20,12,7,4][detail-1]} hi=${[90,65,40,25,15][detail-1]}`}
//                 </div>
//               </div>
//             )}
//           </aside>

//           {/* ══ CANVAS AREA ═════════════════════════════════════ */}
//           <main style={{
//             flex:1, overflow:'hidden',
//             display:'flex', flexDirection:'column',
//             background:T.app,
//             position:'relative',
//             transition:'background .4s',
//           }}>
//             {/* Top accent line */}
//             <div style={{
//               height:2, flexShrink:0,
//               background:`linear-gradient(90deg, transparent 0%, ${engineColor}80 30%, ${engineColor} 50%, ${engineColor}80 70%, transparent 100%)`,
//               transition:'background .4s',
//             }} />

//             {/* Empty state for Video/Webcam tabs */}
//             {(activeTab==='Video'||activeTab==='Webcam') && !showCanvas && (
//               <div style={{
//                 flex:1, display:'flex', alignItems:'center', justifyContent:'center',
//                 flexDirection:'column', gap:16, textAlign:'center',
//               }}>
//                 <div style={{
//                   width:72, height:72, borderRadius:20,
//                   background:`${activeTab==='Video' ? T.orange : T.cyan}12`,
//                   border:`1px solid ${activeTab==='Video' ? T.orange : T.cyan}30`,
//                   display:'flex', alignItems:'center', justifyContent:'center', fontSize:32,
//                 }}>
//                   {activeTab==='Video' ? '🎬' : '📷'}
//                 </div>
//                 <div>
//                   <div style={{ fontSize:18, fontWeight:800, color:T.text, opacity:.2, marginBottom:6 }}>
//                     {activeTab==='Video' ? 'Video to Sketch' : 'Live Webcam Sketch'}
//                   </div>
//                   <div style={{ fontSize:11, color:T.sub, opacity:.4, lineHeight:1.9 }}>
//                     {activeTab==='Video' ? 'Upload a video → click Animate Sketch' : 'Click Start Live Sketch in the sidebar'}
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Text tab welcome */}
//             {!showCanvas && activeTab==='Text' && (
//               <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
//                 <div style={{ textAlign:'center', maxWidth:460 }}>
//                   <div style={{ width:88, height:88, borderRadius:24, background:`${T.purple}12`, border:`1px solid ${T.purple}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:38, margin:'0 auto 20px' }}>✨</div>
//                   <div style={{ fontSize:22, fontWeight:800, letterSpacing:'-.03em', color:T.text, opacity:.18, marginBottom:8 }}>Text to Sketch</div>
//                   <p style={{ fontSize:12, color:T.sub, lineHeight:1.9, opacity:.4 }}>Type any description and watch it become an animated sketch — no image upload needed.</p>
//                   <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:20, opacity:.35 }}>
//                     {['a cat on a desk','lighthouse at sunset','steaming coffee cup','dragon on a mountain'].map(ex => (
//                       <div key={ex} onClick={() => setT2sPrompt(ex)} style={{ padding:'8px 10px', borderRadius:8, background:`${T.purple}08`, border:`1px solid ${T.purple}18`, fontSize:10, color:T.purple, cursor:'pointer' }}>{ex}</div>
//                     ))}
//                   </div>
//                   <p style={{ fontSize:9, color:T.sub, opacity:.25, marginTop:16, fontFamily:'"JetBrains Mono",monospace' }}>← Type a prompt in the sidebar</p>
//                 </div>
//               </div>
//             )}

//             {/* Color tab — full canvas */}
//             {activeTab==='Color' && (
//               <div style={{ flex:1, overflow:'auto', display:'flex', alignItems:'flex-start', justifyContent:'center' }}>
//                 <ColoringCanvas />
//               </div>
//             )}

//             {/* Welcome / empty draw state */}
//             {!showCanvas && activeTab==='Draw' && (
//               <div style={{
//                 flex:1, display:'flex', alignItems:'center', justifyContent:'center',
//                 padding:24, overflow:'hidden',
//               }}>
//                 <WelcomeScreen backendOk={backendOk} useHed={useHed} coloringBook={coloringBook} T={T} />
//               </div>
//             )}

//             {/* Canvas — centered in remaining space */}
//             <div style={{
//               flex:1, overflow:'hidden',
//               display: activeTab==='Color' ? 'none' : (showCanvas || activeTab==='Video' || activeTab==='Webcam' || (activeTab==='Text' && showCanvas)) ? 'flex' : 'none',
//               alignItems:'center',
//               justifyContent:'center',
//               padding:20,
//               position:'relative',
//             }}>
//               {/* Paper texture overlay */}
//               {paperTexture && paperB64 && (
//                 <div style={{
//                   position:'absolute', inset:0,
//                   backgroundImage:`url(data:image/png;base64,${paperB64})`,
//                   backgroundSize:'cover', opacity:.12,
//                   pointerEvents:'none', zIndex:1,
//                 }} />
//               )}
//               {/* Generated image preview for Text tab */}
//               {activeTab==='Text' && t2sGenB64 && t2sPhase !== 'idle' && (
//                 <div style={{ position:'absolute', top:16, right:16, zIndex:5, animation:'fadeIn .3s ease' }}>
//                   <div style={{ fontSize:7, color:T.sub, marginBottom:4, letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'"JetBrains Mono",monospace' }}>Generated</div>
//                   <img src={`data:image/jpeg;base64,${t2sGenB64}`} alt="Generated" style={{ width:110, borderRadius:8, border:`1px solid ${T.border}`, display:'block', boxShadow:'0 4px 20px rgba(0,0,0,.4)' }} />
//                 </div>
//               )}
//               <DrawingCanvas
//                 ref={canvasRef}
//                 penStyle={penStyle}
//                 strokeOpacity={strokeOpacity / 100}
//                 strokeWidthMultiplier={strokeWidth / 100}
//                 colorFillImage={colorFillMode ? file : null}
//                 fillAfterDone={colorFillMode && !!file}
//                 onComplete={() => {
//                   setPhase('done')
//                   if (activeTab === 'Text') setT2sPhase('done')
//                 }}
//               />
//             </div>
//           </main>
//         </div>
//       </div>
//     </>
//   )
// }

// /* ══════════════════════════════════════════════════════════
//    Small Components
// ═══════════════════════════════════════════════════════════ */

// function WelcomeScreen({ backendOk, useHed, coloringBook, T }) {
//   const col  = coloringBook ? T.pink : useHed ? T.blue : T.gold
//   const icon = coloringBook ? '📖' : useHed ? '🧠' : '✏️'
//   const ttl  = coloringBook ? 'Colouring Book Mode' : useHed ? 'HED Neural Mode' : 'AI Sketch Studio'
//   return (
//     <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, textAlign:'center', maxWidth:520 }}>
//       <div style={{
//         width:88, height:88, borderRadius:24,
//         background:`${col}12`, border:`1px solid ${col}25`,
//         display:'flex', alignItems:'center', justifyContent:'center', fontSize:38,
//         boxShadow:`0 0 60px ${col}18`,
//         transition:'all .4s',
//       }}>{icon}</div>

//       <div>
//         <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-.03em', color:T.text, opacity:.18, marginBottom:8 }}>
//           {ttl}
//         </h1>
//         <p style={{ fontSize:12, color:T.sub, lineHeight:1.9, opacity:.4, maxWidth:380 }}>
//           {coloringBook ? 'Generates thick, clean outlines — perfect for printing & colouring.'
//            : useHed     ? 'HED neural network detects semantically meaningful edges in photos.'
//            :              'Upload any image and watch it transform into a hand-drawn sketch.'}
//         </p>
//       </div>

//       <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, width:'100%' }}>
//         {[
//           { icon:'🧠', title:'HED Neural',      color:T.blue,  desc:'Best for portraits & photos' },
//           { icon:'⚡', title:'Canny Edge',       color:T.gold,  desc:'Best for anime & illustrations' },
//           { icon:'📖', title:'Colouring Book',   color:T.pink,  desc:'Thick outlines for printing' },
//         ].map(c => (
//           <div key={c.title} style={{
//             padding:'14px 10px', borderRadius:12,
//             background:`${c.color}08`, border:`1px solid ${c.color}18`,
//             opacity:.6,
//           }}>
//             <div style={{ fontSize:20, marginBottom:6 }}>{c.icon}</div>
//             <div style={{ fontSize:10, fontWeight:700, color:c.color, marginBottom:4 }}>{c.title}</div>
//             <div style={{ fontSize:8, color:T.sub, lineHeight:1.6 }}>{c.desc}</div>
//           </div>
//         ))}
//       </div>

//       {backendOk===false && (
//         <div style={{
//           padding:'10px 16px', borderRadius:10, width:'100%',
//           background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.2)',
//           fontSize:9, color:'#f87171', fontFamily:'"JetBrains Mono",monospace', lineHeight:2,
//           textAlign:'left',
//         }}>
//           Backend not running → cd backend && python main.py
//         </div>
//       )}

//       <p style={{ fontSize:10, color:T.sub, opacity:.3, letterSpacing:'.02em' }}>
//         ← Upload an image in the sidebar to begin
//       </p>
//     </div>
//   )
// }

// function Section({ title, children, faded, T }) {
//   return (
//     <div style={{
//       borderRadius:12, overflow:'hidden',
//       border:`1px solid ${T.border}`,
//       opacity: faded ? 0.4 : 1, pointerEvents: faded ? 'none' : 'auto',
//       marginBottom:8,
//       transition:'opacity .2s',
//     }}>
//       {title && (
//         <div style={{
//           padding:'7px 12px', borderBottom:`1px solid ${T.border}`,
//           fontSize:8, color:T.sub, letterSpacing:'.14em', textTransform:'uppercase',
//           fontFamily:'"JetBrains Mono",monospace', fontWeight:600,
//           background:'rgba(255,255,255,.015)',
//         }}>{title}</div>
//       )}
//       <div style={{ padding:'12px' }}>{children}</div>
//     </div>
//   )
// }

// function DropZone({ preview, file, dragging, onDragOver, onDragLeave, onDrop, onClick, onClear, T }) {
//   return (
//     <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={onClick}
//       style={{
//         border:`2px dashed ${dragging ? T.gold : T.border}`, borderRadius:10, overflow:'hidden',
//         cursor: preview ? 'default' : 'pointer',
//         background: dragging ? T.goldBg : 'rgba(255,255,255,.015)',
//         minHeight: preview ? 0 : 100,
//         display:'flex', alignItems:'center', justifyContent:'center',
//         transition:'all .18s',
//       }}>
//       {preview ? (
//         <div style={{ position:'relative', width:'100%' }}>
//           <img src={preview} alt="preview"
//             style={{ width:'100%', maxHeight:140, objectFit:'contain', display:'block' }} />
//           <div style={{
//             position:'absolute', bottom:0, left:0, right:0,
//             background:'linear-gradient(transparent, rgba(0,0,0,.9))',
//             padding:'20px 10px 8px',
//             display:'flex', justifyContent:'space-between', alignItems:'flex-end',
//           }}>
//             <span style={{ fontSize:8, color:'rgba(255,255,255,.5)', fontFamily:'"JetBrains Mono",monospace',
//                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>
//               {file?.name}
//             </span>
//             <button onClick={e => { e.stopPropagation(); onClear() }} style={{
//               background:'rgba(255,255,255,.12)', color:'rgba(255,255,255,.7)', border:'none',
//               borderRadius:5, padding:'3px 8px', fontSize:9, cursor:'pointer',
//             }}>✕</button>
//           </div>
//         </div>
//       ) : (
//         <div style={{ textAlign:'center', padding:20 }}>
//           <div style={{ fontSize:28, opacity:.1, marginBottom:8 }}>🖼️</div>
//           <div style={{ fontSize:10, color:T.sub, fontWeight:600, marginBottom:3 }}>Drop image here</div>
//           <div style={{ fontSize:8, color:T.sub, opacity:.5 }}>JPG · PNG · WEBP · AVIF</div>
//         </div>
//       )}
//     </div>
//   )
// }

// function SliderField({ label, value, min, max, step, display, color, T, onChange }) {
//   return (
//     <div style={{ marginBottom:12 }}>
//       <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
//         <span style={{ fontSize:9, color:T.sub, letterSpacing:'.02em' }}>{label}</span>
//         <span style={{
//           fontSize:9, color:color||T.gold, fontFamily:'"JetBrains Mono",monospace',
//           background:`${color||T.gold}15`, border:`1px solid ${color||T.gold}30`,
//           borderRadius:5, padding:'1px 7px',
//         }}>{display}</span>
//       </div>
//       <input type="range" min={min} max={max} step={step} value={value}
//         onChange={e => onChange(Number(e.target.value))} style={{ width:'100%', accentColor:color||T.gold }} />
//     </div>
//   )
// }

// function Toggle({ value, onChange, color }) {
//   return (
//     <div onClick={() => onChange(!value)} style={{
//       width:40, height:22, borderRadius:11, flexShrink:0, cursor:'pointer',
//       background: value ? color : 'rgba(255,255,255,.08)',
//       position:'relative', transition:'background .2s',
//       boxShadow: value ? `0 0 10px ${color}55` : 'none',
//     }}>
//       <div style={{
//         position:'absolute', top:3, left: value ? 21 : 3, width:16, height:16,
//         borderRadius:'50%', background:'#fff', transition:'left .2s',
//         boxShadow:'0 1px 4px rgba(0,0,0,.4)',
//       }} />
//     </div>
//   )
// }

// function ToggleRow({ label, sub, value, onChange, color, T }) {
//   return (
//     <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0' }}>
//       <div>
//         <div style={{ fontSize:10, color: value ? color : T.sub, fontWeight: value ? 600 : 400 }}>{label}</div>
//         {sub && <div style={{ fontSize:8, color:T.sub, marginTop:1 }}>{sub}</div>}
//       </div>
//       <Toggle value={value} onChange={onChange} color={color} />
//     </div>
//   )
// }

// function SmBtn({ children, onClick, T, style, accent }) {
//   const col = accent || T.sub
//   return (
//     <button onClick={onClick} style={{
//       width:'100%', padding:'7px 0', background:'rgba(255,255,255,.03)',
//       border:`1px solid ${accent ? col+'50' : T.border}`, borderRadius:8,
//       color: accent ? col : T.sub, fontSize:9, cursor:'pointer', fontFamily:'inherit',
//       fontWeight: accent ? 600 : 400, transition:'all .15s',
//       ...style,
//     }}>{children}</button>
//   )
// }

// function ExportBtn({ onClick, children, color }) {
//   return (
//     <button onClick={onClick} style={{
//       padding:'4px 10px', borderRadius:7, border:`1px solid ${color}45`,
//       background:`${color}18`, color, fontSize:9, cursor:'pointer',
//       fontFamily:'inherit', fontWeight:600, transition:'all .15s',
//     }}>{children}</button>
//   )
// }

// function FieldLabel({ children, T }) {
//   return (
//     <div style={{ fontSize:8, color:T.sub, marginBottom:6, letterSpacing:'.08em', textTransform:'uppercase', fontFamily:'"JetBrains Mono",monospace' }}>
//       {children}
//     </div>
//   )
// }

// function StyledInput({ T, ...props }) {
//   return (
//     <input {...props} style={{
//       background:'rgba(255,255,255,.04)', border:`1px solid ${T.border}`,
//       borderRadius:8, padding:'8px 10px', color:T.text, fontSize:10,
//       fontFamily:'inherit', outline:'none', width:'100%',
//       transition:'border .2s',
//     }} />
//   )
// }

// function PulseDot({ color, glow }) {
//   return (
//     <div style={{
//       width:7, height:7, borderRadius:'50%', flexShrink:0, background:color,
//       boxShadow: glow ? `0 0 8px ${color}` : 'none',
//       animation: glow ? 'pulse 2s infinite' : 'none',
//     }} />
//   )
// }

// function Spinner({ color }) {
//   return (
//     <div style={{
//       width:12, height:12, borderRadius:'50%', flexShrink:0,
//       border:'2px solid rgba(255,255,255,.07)',
//       borderTopColor: color || '#f5c542',
//       animation:'spin .65s linear infinite',
//     }} />
//   )
// }

// function ProgressBar({ value, color, T }) {
//   return (
//     <div style={{ height:4, borderRadius:2, background:T.dim, overflow:'hidden' }}>
//       <div style={{ width:`${value}%`, height:'100%', background:color, borderRadius:2, transition:'width .3s' }} />
//     </div>
//   )
// }

// function Divider() {
//   return <div style={{ width:1, height:20, background:'rgba(255,255,255,.07)', flexShrink:0 }} />
// }












import { useState, useRef, useCallback, useEffect } from 'react'
import DrawingCanvas from './DrawingCanvas.jsx'
import VideoTab from './VideoTab.jsx'
import WebcamTab from './WebcamTab.jsx'
import TextToSketchTab from './TextToSketchTab.jsx'
import {
  uploadImage, streamImage, analyseImage,
  exportPDF, batchProcess,
  register, login, getGallery, saveSketch, deleteSketch,
  streamTextToSketch,
} from './api.js'

/* ─── Fonts ──────────────────────────────────────────────── */
const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
`

const PENS = [
  { id:'pencil',   emoji:'✏️', label:'Pencil'   },
  { id:'charcoal', emoji:'🪨', label:'Charcoal' },
  { id:'ink',      emoji:'🖊️', label:'Ink'      },
  { id:'brush',    emoji:'🖌️', label:'Brush'    },
  { id:'marker',   emoji:'🖍️', label:'Marker'   },
  { id:'neon',     emoji:'⚡', label:'Neon'     },
]

const DETAIL_LABELS = ['', 'Minimal', 'Light', 'Medium', 'Detailed', 'Maximum']
const TABS = [
  { id:'Draw',    icon:'✏️', label:'Draw'    },
  { id:'Text',    icon:'✨', label:'Text'    },
  { id:'Video',   icon:'🎬', label:'Video'   },
  { id:'Webcam',  icon:'📷', label:'Webcam'  },
  { id:'Batch',   icon:'📦', label:'Batch'   },
  { id:'Gallery', icon:'🖼️', label:'Gallery' },
  { id:'Export',  icon:'📤', label:'Export'  },
]

/* ─── Theme helper ───────────────────────────────────────── */
function makeTheme(lightMode) {
  if (lightMode) return {
    app:'#f5f5fa', panel:'#ffffff', border:'#e0e0ee', accent:'#7c3aed',
    text:'#1a1a2e', sub:'#6b6b8a', dim:'#ebebf5', muted:'#d8d8ee',
    gold:'#b45309', goldBg:'rgba(180,83,9,.1)', goldBdr:'rgba(180,83,9,.25)',
    blue:'#1d4ed8', blueBg:'rgba(29,78,216,.1)', blueBdr:'rgba(29,78,216,.25)',
    green:'#15803d', greenBg:'rgba(21,128,61,.1)', greenBdr:'rgba(21,128,61,.25)',
    red:'#dc2626', redBg:'rgba(220,38,38,.1)', redBdr:'rgba(220,38,38,.25)',
    orange:'#c2410c', orangeBg:'rgba(194,65,12,.1)',
    purple:'#7c3aed', purpleBg:'rgba(124,58,237,.1)', purpleBdr:'rgba(124,58,237,.25)',
    pink:'#be185d', pinkBg:'rgba(190,24,93,.1)', pinkBdr:'rgba(190,24,93,.25)',
    cyan:'#0e7490',
  }
  return {
    app:'#08080f', panel:'#0d0d18', border:'#1a1a2e', accent:'#a78bfa',
    text:'#eceaf4', sub:'#5a5a78', dim:'#2a2a3e', muted:'#3a3a52',
    gold:'#f5c542',
    goldBg:  'rgba(245,197,66,.1)',
    goldBdr: 'rgba(245,197,66,.25)',
    blue:    '#4f9cf9',
    blueBg:  'rgba(79,156,249,.1)',
    blueBdr: 'rgba(79,156,249,.25)',
    green:   '#34d399',
    greenBg: 'rgba(52,211,153,.1)',
    greenBdr:'rgba(52,211,153,.25)',
    red:     '#f87171',
    redBg:   'rgba(248,113,113,.1)',
    redBdr:  'rgba(248,113,113,.25)',
    orange:  '#fb923c',
    orangeBg:'rgba(251,146,60,.1)',
    purple:  '#a78bfa',
    purpleBg:'rgba(167,139,250,.1)',
    purpleBdr:'rgba(167,139,250,.25)',
    pink:    '#f472b6',
    pinkBg:  'rgba(244,114,182,.1)',
    pinkBdr: 'rgba(244,114,182,.25)',
    cyan:    '#22d3ee',
  }
}

export default function App() {
  const canvasRef     = useRef(null)
  const wsStopRef     = useRef(null)
  const fileInputRef  = useRef(null)
  const batchInputRef = useRef(null)

  const [file,          setFile]          = useState(null)
  const [colorFillMode, setColorFillMode] = useState(false)
  const [preview,       setPreview]       = useState(null)
  const [detail,        setDetail]        = useState(3)
  const [maxPaths,      setMaxPaths]      = useState(600)
  const [penStyle,      setPenStyle]      = useState('pencil')
  const [useWS,         setUseWS]         = useState(false)
  const [dragging,      setDragging]      = useState(false)
  const [activeTab,     setActiveTab]     = useState('Draw')

  const [useHed,        setUseHed]        = useState(false)
  const [removeBg,      setRemoveBg]      = useState(false)
  const [coloringBook,  setColoringBook]  = useState(false)
  const [crosshatch,    setCrosshatch]    = useState(false)
  const [paperTexture,  setPaperTexture]  = useState(false)
  const [watercolour,   setWatercolour]   = useState(false)

  const [lightMode,     setLightMode]     = useState(false)
  const [strokeOpacity, setStrokeOpacity] = useState(92)
  const [strokeWidth,   setStrokeWidth]   = useState(100)

  const [phase,         setPhase]         = useState('idle')
  const [statusMsg,     setStatusMsg]     = useState('')
  const [showCanvas,    setShowCanvas]    = useState(false)
  const [backendOk,     setBackendOk]     = useState(null)
  const [hedReady,      setHedReady]      = useState(false)
  const [engineUsed,    setEngineUsed]    = useState(null)
  const [strokeCount,   setStrokeCount]   = useState(0)
  const [processingMs,  setProcessingMs]  = useState(null)
  const [quality,       setQuality]       = useState(null)
  const [svgData,       setSvgData]       = useState(null)
  const [wcColors,      setWcColors]      = useState([])
  const [paperB64,      setPaperB64]      = useState(null)
  const [warnings,      setWarnings]      = useState([])
  const [autoResult,    setAutoResult]    = useState(null)

  const [batchFiles,    setBatchFiles]    = useState([])
  const [batchPhase,    setBatchPhase]    = useState('idle')
  const [batchProg,     setBatchProg]     = useState(0)

  const [authMode,      setAuthMode]      = useState('login')
  const [authUser,      setAuthUser]      = useState('')
  const [authPw,        setAuthPw]        = useState('')
  const [authErr,       setAuthErr]       = useState('')
  const [token,         setToken]         = useState(() => localStorage.getItem('sketch_token') || '')
  const [currentUser,   setCurrentUser]   = useState(() => localStorage.getItem('sketch_user')  || '')
  const [gallery,       setGallery]       = useState([])
  const [saveNameVal,   setSaveNameVal]   = useState('')

  /* ─── Text-to-sketch state ────────────────────────── */
  const [t2sPrompt,     setT2sPrompt]     = useState('')
  const [t2sPhase,      setT2sPhase]      = useState('idle')
  const [t2sGenB64,     setT2sGenB64]     = useState(null)
  const [t2sMeta,       setT2sMeta]       = useState(null)
  const t2sAbortRef  = useRef(null)
  const t2sPromptRef = useRef('')   // always up-to-date, safe to read in callbacks
  const t2sBusy = ['generating','processing','drawing'].includes(t2sPhase)

  const T = makeTheme(lightMode)
  const strokeColors = ['#1a1a1a']  // color-fill mode overrides this
  const engineColor  = activeTab === 'Text'
    ? T.purple
    : coloringBook ? T.pink : useHed ? T.blue : T.gold
  const engineLabel  = coloringBook ? 'Colouring Book' : useHed ? 'HED Neural' : 'Canny'
  const busy         = ['connecting','processing','drawing'].includes(phase)
  const canDraw      = !!file && !busy && backendOk !== false

  /* ─── Health ping ─────────────────────────────── */
  useEffect(() => {
    const ping = () =>
      fetch('/api/health', { signal: AbortSignal.timeout(3000) })
        .then(r => r.json())
        .then(d => { setBackendOk(true); setHedReady(d.hed_ready) })
        .catch(() => setBackendOk(false))
    ping(); const t = setInterval(ping, 8000); return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (activeTab === 'Gallery' && token)
      getGallery(token).then(d => setGallery(d.sketches || [])).catch(() => {})
  }, [activeTab, token])

  /* ─── File pick ───────────────────────────────── */
  const pickFile = useCallback(async (f) => {
    if (!f || !f.type.startsWith('image/')) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f); setPreview(URL.createObjectURL(f))
    setPhase('idle'); setStatusMsg(''); setShowCanvas(false)
    setEngineUsed(null); setStrokeCount(0); setProcessingMs(null)
    setQuality(null); setSvgData(null); setWarnings([])
    setAutoResult(null); setWcColors([]); setPaperB64(null)
    canvasRef.current?.reset(); setActiveTab('Draw')
    try {
      setStatusMsg('Analysing...')
      const r = await analyseImage(f)
      setAutoResult(r)
      setDetail(r.detail_level); setMaxPaths(r.max_strokes); setPenStyle(r.pen_style || 'pencil')
      if (r.use_hed && hedReady) setUseHed(true)
      if (r.screen_photo?.detected)
        setWarnings([{ type:'screen_photo', confidence:r.screen_photo.confidence,
          message:'Screen photo detected — right-click image → Save As → upload that file.' }])
      setStatusMsg('')
    } catch (_) { setStatusMsg('') }
  }, [preview, hedReady])

  // Keep ref in sync so generateFromText always reads latest prompt
  const handleT2sPromptChange = useCallback((val) => {
    setT2sPrompt(val)
    t2sPromptRef.current = val
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0])
  }, [pickFile])

  /* ─── Draw ────────────────────────────────────── */
  const draw = useCallback(async () => {
    if (!file || busy) return
    wsStopRef.current?.(); canvasRef.current?.reset()
    setShowCanvas(true); setEngineUsed(null); setWarnings([])
    setSvgData(null); setQuality(null); setWcColors([]); setPaperB64(null)
    const opts = { useHed, removeBg, coloringBook, crosshatch, paperTexture, watercolour }
    const t0 = Date.now()
    try {
      if (useWS) {
        setPhase('connecting'); setStatusMsg('Connecting...')
        await new Promise((resolve, reject) => {
          wsStopRef.current = streamImage(file, detail, maxPaths, {
            onStatus:  m  => { setPhase('processing'); setStatusMsg(m) },
            onWarning: w  => setWarnings(p => [...p, w]),
            onMeta:    m  => {
              canvasRef.current?.setup(m.width, m.height)
              setEngineUsed(m.engine); setStrokeCount(m.total)
              setProcessingMs(Date.now() - t0)
              setPhase('drawing'); setStatusMsg(`Drawing ${m.total} strokes...`)
              setTimeout(() => canvasRef.current?.start(), 60)
            },
            onChunk: paths => canvasRef.current?.addPaths(paths),
            onDone:  msg  => {
              setPhase('done'); setStatusMsg('')
              if (msg?.svg)       setSvgData(msg.svg)
              if (msg?.quality)   setQuality(msg.quality)
              if (msg?.wc_colors) setWcColors(msg.wc_colors)
              if (msg?.paper_b64) setPaperB64(msg.paper_b64)
              resolve()
            },
            onError: msg => { setPhase('error'); setStatusMsg(msg); reject(new Error(msg)) },
          }, opts)
        })
      } else {
        setPhase('processing')
        setStatusMsg(coloringBook ? 'Colouring-book mode...' : useHed ? 'Running HED neural network...' : 'Detecting edges...')
        const data = await uploadImage(file, detail, maxPaths, pct => {
          if (pct === 100) setStatusMsg('Tracing paths...')
        }, opts)
        if (data.warnings?.length) setWarnings(data.warnings)
        if (data.svg)       setSvgData(data.svg)
        if (data.quality)   setQuality(data.quality)
        if (data.wc_colors) setWcColors(data.wc_colors)
        if (data.paper_b64) setPaperB64(data.paper_b64)
        setEngineUsed(data.engine); setStrokeCount(data.total)
        setProcessingMs(Date.now() - t0)
        canvasRef.current?.setup(data.width, data.height)
        canvasRef.current?.addPaths(data.paths)
        setPhase('drawing'); setStatusMsg(`Drawing ${data.total} strokes...`)
        setTimeout(() => canvasRef.current?.start(), 60)
      }
    } catch (e) { setPhase('error'); setStatusMsg(e?.message || 'Error — is python main.py running?') }
  }, [file, busy, useWS, detail, maxPaths, useHed, removeBg, coloringBook, crosshatch, paperTexture, watercolour])

  /* ─── Export helpers ──────────────────────────── */
  const dlSVG = useCallback(() => {
    if (!svgData) return
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([svgData], { type:'image/svg+xml' })), download:'sketch.svg'
    }); a.click(); URL.revokeObjectURL(a.href)
  }, [svgData])

  const dlPNG = useCallback(() => {
    const c = document.querySelector('canvas'); if (!c) return
    Object.assign(document.createElement('a'), { href:c.toDataURL('image/png'), download:'sketch.png' }).click()
  }, [])

  const dlPDF = useCallback(async () => {
    if (!file) return; setStatusMsg('Generating PDF...')
    try { await exportPDF(file, { detailLevel:detail, maxStrokes:maxPaths, useHed }) }
    catch (_) { alert('PDF failed — pip install reportlab') }
    setStatusMsg('')
  }, [file, detail, maxPaths, useHed])

  const runBatch = useCallback(async () => {
    if (!batchFiles.length) return
    setBatchPhase('processing'); setBatchProg(0)
    try {
      await batchProcess(batchFiles, { detailLevel:detail, maxStrokes:maxPaths, useHed, onProgress:p => setBatchProg(p) })
      setBatchPhase('done')
    } catch (_) { setBatchPhase('error') }
  }, [batchFiles, detail, maxPaths, useHed])

  const doAuth = useCallback(async () => {
    setAuthErr('')
    try {
      const res = authMode === 'register' ? await register(authUser, authPw) : await login(authUser, authPw)
      setToken(res.access_token); setCurrentUser(res.username)
      localStorage.setItem('sketch_token', res.access_token)
      localStorage.setItem('sketch_user',  res.username)
      setAuthMode('login')
    } catch (e) { setAuthErr(e.response?.data?.detail || 'Auth failed') }
  }, [authMode, authUser, authPw])

  const doLogout = useCallback(() => {
    setToken(''); setCurrentUser(''); setGallery([])
    localStorage.removeItem('sketch_token'); localStorage.removeItem('sketch_user')
  }, [])

  const doSave = useCallback(async () => {
    if (!token || !svgData) return
    try {
      await saveSketch(token, saveNameVal || `Sketch ${new Date().toLocaleDateString()}`, svgData, engineUsed || 'canny', strokeCount)
      setSaveNameVal(''); alert('Saved!')
    } catch (_) { alert('Save failed') }
  }, [token, svgData, saveNameVal, engineUsed, strokeCount])

  const doDelete = useCallback(async (id) => {
    try { await deleteSketch(token, id); setGallery(p => p.filter(s => s.id !== id)) }
    catch (_) {}
  }, [token])

  /* ─── Text-to-sketch generate ─────────────────────── */
  const generateFromText = useCallback(() => {
    if (!t2sPromptRef.current.trim() || t2sBusy) return
    if (backendOk === false) {
      setT2sPhase('error')
      setStatusMsg('Backend offline — run: cd backend && python main.py')
      return
    }
    t2sAbortRef.current?.()
    canvasRef.current?.reset()
    setShowCanvas(true)
    setT2sPhase('generating')
    setT2sGenB64(null)
    setT2sMeta(null)
    setSvgData(null)
    setQuality(null)
    setStatusMsg('Generating image…')

    t2sAbortRef.current = streamTextToSketch(
      {
        prompt:      t2sPromptRef.current,
        penStyle,
        detailLevel: detail,
        maxStrokes:  maxPaths,
        useHed,
        coloringBook,
        crosshatch,
        generator:   'auto',
      },
      {
        onStatus: m => setStatusMsg(m),
        onImageReady: (b64) => {
          setT2sGenB64(b64)
          setT2sPhase('processing')
          setStatusMsg('Extracting sketch paths…')
        },
        onMeta: m => {
          canvasRef.current?.setup(m.width, m.height)
          setT2sMeta(m)
          setT2sPhase('drawing')
          setStatusMsg(`Animating ${m.total} strokes…`)
        },
        onChunk: paths => canvasRef.current?.addPaths(paths),
        onStartDraw: () => setTimeout(() => canvasRef.current?.start(), 60),
        onDone: msg => {
          setT2sPhase('done')
          setStatusMsg('')
          setPhase('done')
          setEngineUsed(msg.engine || 't2s')
          setStrokeCount(msg.total || 0)
          if (msg.svg)     setSvgData(msg.svg)
          if (msg.quality) setQuality(msg.quality)
        },
        onError: msg => {
          setT2sPhase('error')
          setStatusMsg(msg || 'Generation failed — check backend is running with text_to_sketch.py')
          setPhase('error')
          t2sAbortRef.current = null
        },
      }
    )
  }, [t2sBusy, penStyle, detail, maxPaths, useHed, coloringBook, crosshatch, canvasRef, backendOk])

  const cancelT2S = useCallback(() => {
    try { t2sAbortRef.current?.() } catch (_) {}
    t2sAbortRef.current = null
    setT2sPhase('idle')
    setPhase('idle')
    setStatusMsg('')
    canvasRef.current?.reset()
    setShowCanvas(false)
  }, [canvasRef])

  const isDone = phase === 'done' || t2sPhase === 'done'

  /* ─── Render ──────────────────────────────────── */
  return (
    <>
      <style>{`
        ${FONT_IMPORT}
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { color-scheme: dark; }
        body { overflow: hidden; background: var(--app-bg, #08080f); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,.25); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,.45); }
        input[type=range] { -webkit-appearance: none; appearance: none; height: 3px; border-radius: 2px; outline: none; cursor: pointer; background: rgba(255,255,255,.1); }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #f5c542; border: 2px solid rgba(255,255,255,.2); cursor: pointer; box-shadow: 0 0 8px rgba(245,197,66,.4); }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        .tab-btn:hover { background: rgba(255,255,255,.05) !important; }
        .icon-btn:hover { opacity: 0.8; transform: scale(1.05); }
        .draw-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 32px rgba(245,197,66,.4) !important; }
        .draw-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      <div style={{
        width:'100vw', height:'100vh', display:'flex', flexDirection:'column',
        background:T.app, color:T.text, overflow:'hidden',
        fontFamily:'"Syne", -apple-system, sans-serif',
        transition:'background .4s ease',
      }}>

        {/* ══ TOPBAR ══════════════════════════════════════════ */}
        <header style={{
          height:58, flexShrink:0, display:'flex', alignItems:'center',
          justifyContent:'space-between', padding:'0 16px',
          background:T.panel,
          borderBottom:`1px solid ${T.border}`,
          transition:'background .4s',
          zIndex:10,
        }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:'linear-gradient(135deg,#f5c542 0%,#f97316 50%,#ef4444 100%)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, boxShadow:'0 0 20px rgba(245,197,66,.35)', flexShrink:0,
            }}>✏️</div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, letterSpacing:'-.03em', lineHeight:1.1 }}>
                Sketch Studio
              </div>
              <div style={{ fontSize:11, color:T.sub, letterSpacing:'.12em', textTransform:'uppercase', fontFamily:'"JetBrains Mono",monospace' }}>
                AI · v6
              </div>
            </div>
          </div>

          {/* Engine Switcher */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{
              display:'flex', borderRadius:10, overflow:'hidden',
              border:`1px solid ${T.border}`,
              background:T.dim,
            }}>
              {[
                [false,false,'⚡ Canny', T.gold],
                [true, false,'🧠 HED',   T.blue],
                [false,true, '📖 Color', T.pink],
              ].map(([hed,cb,lbl,col]) => {
                const on = useHed===hed && coloringBook===cb
                return (
                  <button key={lbl} onClick={() => { setUseHed(hed); setColoringBook(cb) }}
                    style={{
                      padding:'6px 14px', border:'none', cursor:'pointer',
                      background: on ? col+'20' : 'transparent',
                      color: on ? col : T.sub,
                      fontSize:11, fontWeight: on ? 700 : 400,
                      transition:'all .18s', fontFamily:'inherit',
                      borderRight:`1px solid ${T.border}`,
                    }}>{lbl}</button>
                )
              })}
            </div>

            {/* Engine status pill */}
            {engineUsed && (
              <div style={{
                padding:'5px 12px', borderRadius:20,
                background: engineColor + '18',
                border:`1px solid ${engineColor}40`,
                fontSize:10, color:engineColor,
                fontFamily:'"JetBrains Mono",monospace',
                display:'flex', alignItems:'center', gap:6,
                animation:'fadeIn .3s ease',
              }}>
                <PulseDot color={engineColor} />
                {engineUsed.toUpperCase()}
                {strokeCount > 0 && <span style={{ color:T.sub }}>· {strokeCount}</span>}
                {processingMs > 0 && <span style={{ color:T.sub }}>· {(processingMs/1000).toFixed(1)}s</span>}
                {quality?.grade && <span style={{ color:T.gold, fontWeight:700 }}>· {quality.grade}</span>}
              </div>
            )}
          </div>

          {/* Right side controls */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Light/Dark toggle */}
            <button
              onClick={() => setLightMode(v => !v)}
              title={lightMode ? 'Switch to Dark' : 'Switch to Light'}
              style={{
                width:32, height:32, borderRadius:8, border:`1px solid ${T.border}`,
                background: lightMode ? '#f5c542' : 'rgba(255,255,255,.08)',
                color: lightMode ? '#08060a' : '#f5c542',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:15, flexShrink:0, transition:'all .2s',
              }}
            >{lightMode ? '☀️' : '🌙'}</button>

            <Divider />

            {/* Status */}
            {(busy || t2sBusy || statusMsg) && (
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:11, color: phase==='error' ? T.red : T.sub }}>
                {(busy || t2sBusy) && <Spinner color={engineColor} />}
                <span style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{statusMsg}</span>
              </div>
            )}

            {/* Export buttons */}
            {isDone && (
              <div style={{ display:'flex', gap:5, animation:'fadeIn .3s ease' }}>
                {svgData && <ExportBtn onClick={dlSVG} color={T.green}>SVG</ExportBtn>}
                <ExportBtn onClick={dlPNG} color={T.gold}>PNG</ExportBtn>
                <ExportBtn onClick={dlPDF} color={T.orange}>PDF</ExportBtn>
                {token && svgData && <ExportBtn onClick={doSave} color={T.purple}>Save</ExportBtn>}
              </div>
            )}

            <Divider />

            {/* Backend status */}
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10 }}>
              <PulseDot color={backendOk===true ? T.green : backendOk===false ? T.red : T.sub} glow={backendOk===true} />
              <span style={{ color: backendOk===true ? T.green : backendOk===false ? T.red : T.sub, fontFamily:'"JetBrains Mono",monospace', fontSize:9 }}>
                {backendOk===true ? 'Online' : backendOk===false ? 'Offline' : '…'}
              </span>
            </div>

            {/* Auth */}
            {currentUser
              ? <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{
                    padding:'4px 10px', borderRadius:8,
                    background:T.purpleBg, border:`1px solid ${T.purpleBdr}`,
                    fontSize:10, color:T.purple, display:'flex', alignItems:'center', gap:5
                  }}>
                    <span>👤</span><span>{currentUser}</span>
                  </div>
                  <button onClick={doLogout} style={{
                    fontSize:12, color:T.sub, background:'transparent',
                    border:`1px solid ${T.border}`, borderRadius:7, padding:'4px 9px', cursor:'pointer',
                    fontFamily:'inherit',
                  }}>Logout</button>
                </div>
              : <button onClick={() => setActiveTab('Gallery')} style={{
                  fontSize:10, color:T.purple, background:T.purpleBg,
                  border:`1px solid ${T.purpleBdr}`, borderRadius:8,
                  padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', fontWeight:600,
                }}>Sign In</button>
            }
          </div>
        </header>

        {/* ══ BODY ════════════════════════════════════════════ */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* ── SIDEBAR ─────────────────────────────────────── */}
          <aside style={{
            width:286, flexShrink:0, display:'flex', flexDirection:'column',
            background:T.panel, borderRight:`1px solid ${T.border}`,
            transition:'background .4s',
            overflow:'hidden',
          }}>
            {/* Tab nav */}
            <div style={{ display:'flex', borderBottom:`1px solid ${T.border}`, flexShrink:0, padding:'6px 6px 0' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className="tab-btn"
                  style={{
                    flex:1, padding:'7px 2px 8px', border:'none', cursor:'pointer',
                    background:'transparent',
                    color: activeTab===t.id ? T.text : T.sub,
                    fontSize:11, fontFamily:'inherit', fontWeight: activeTab===t.id ? 700 : 400,
                    borderBottom: `2px solid ${activeTab===t.id ? T.accent : 'transparent'}`,
                    transition:'all .15s',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                  }}>
                  <span style={{ fontSize:12 }}>{t.icon}</span>
                  <span style={{ letterSpacing:'.04em' }}>{t.label}</span>
                </button>
              ))}
            </div>

            {/* ── DRAW TAB ─── */}
            {activeTab==='Draw' && (
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:0, overflowY:'auto', minHeight:0 }}>

                {/* Warnings */}
                {warnings.filter(w => w.type==='screen_photo').map((w,i) => (
                  <div key={i} style={{
                    margin:'10px 10px 0',
                    padding:'10px 12px', borderRadius:10,
                    background:T.redBg, border:`1px solid ${T.redBdr}`,
                    fontSize:12, lineHeight:1.7, animation:'slideIn .3s ease',
                  }}>
                    <div style={{ color:T.red, fontWeight:700, marginBottom:3, fontSize:10 }}>
                      ⚠️ Screen Photo ({Math.round(w.confidence*100)}% confident)
                    </div>
                    <div style={{ color:'rgba(248,113,113,.7)', fontSize:8 }}>{w.message}</div>
                  </div>
                ))}

                {/* Auto-detect result */}
                {autoResult && !warnings.find(w => w.type==='screen_photo') && (
                  <div style={{
                    margin:'10px 10px 0',
                    padding:'9px 12px', borderRadius:10,
                    background:T.greenBg, border:`1px solid ${T.greenBdr}`,
                    fontSize:12, lineHeight:1.7, animation:'slideIn .3s ease',
                  }}>
                    <div style={{ color:T.green, fontWeight:700, marginBottom:2 }}>
                      ✓ Auto-detected: {autoResult.label}
                    </div>
                    <div style={{ color:T.sub, fontSize:8 }}>
                      Settings applied · {autoResult.use_hed && hedReady ? 'HED recommended' : 'Canny mode'}
                    </div>
                  </div>
                )}

                {/* Sections */}
                <div style={{ display:'flex', flexDirection:'column', gap:0, padding:'10px 10px 6px' }}>

                  {/* ── Image Upload ── */}
                  <Section title="Image" T={T}>
                    <DropZone
                      preview={preview} file={file} dragging={dragging} T={T}
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                      onClick={() => !preview && fileInputRef.current?.click()}
                      onClear={() => {
                        setFile(null); setPreview(null); setShowCanvas(false)
                        setPhase('idle'); setStatusMsg(''); setEngineUsed(null)
                        setWarnings([]); setAutoResult(null); setSvgData(null)
                        setWcColors([]); setPaperB64(null); canvasRef.current?.reset()
                      }}
                    />
                    <input ref={fileInputRef} type="file" accept="image/*"
                      style={{ display:'none' }} onChange={e => pickFile(e.target.files[0])} />
                    {preview && (
                      <SmBtn T={T} style={{ marginTop:6 }} onClick={() => fileInputRef.current?.click()}>
                        ⇄ Change Image
                      </SmBtn>
                    )}
                  </Section>

                  {/* ── Settings ── */}
                  <Section title="Parameters" T={T} faded={busy}>
                    <SliderField
                      label="Edge Detail" value={detail} min={1} max={5} step={1}
                      display={`${DETAIL_LABELS[detail]}`} color={engineColor} T={T}
                      onChange={setDetail}
                    />
                    <SliderField
                      label="Max Strokes" value={maxPaths} min={100} max={2000} step={100}
                      display={maxPaths.toLocaleString()} color={T.gold} T={T}
                      onChange={setMaxPaths}
                    />

                    {/* Pen grid */}
                    <FieldLabel T={T}>Pen Style</FieldLabel>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5, marginBottom:12 }}>
                      {PENS.map(p => (
                        <button key={p.id} onClick={() => setPenStyle(p.id)} style={{
                          padding:'8px 4px', borderRadius:9, fontSize:11,
                          border:`1px solid ${penStyle===p.id ? T.gold : T.border}`,
                          background: penStyle===p.id ? T.goldBg : 'rgba(255,255,255,.02)',
                          color: penStyle===p.id ? T.gold : T.sub,
                          cursor:'pointer', transition:'all .15s', fontFamily:'inherit',
                          display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                        }}>
                          <span style={{ fontSize:14 }}>{p.emoji}</span>
                          <span style={{ fontWeight: penStyle===p.id ? 700 : 400 }}>{p.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Transfer mode */}
                    <FieldLabel T={T}>Transfer Mode</FieldLabel>
                    <div style={{ display:'flex', gap:5, marginBottom:4 }}>
                      {[[false,'REST API'],[true,'WebSocket']].map(([v,lbl]) => (
                        <button key={lbl} onClick={() => setUseWS(v)} style={{
                          flex:1, padding:'7px 4px', borderRadius:8, fontSize:12,
                          border:`1px solid ${useWS===v ? T.purple : T.border}`,
                          background: useWS===v ? T.purpleBg : 'rgba(255,255,255,.02)',
                          color: useWS===v ? T.purple : T.sub,
                          cursor:'pointer', transition:'all .15s', fontFamily:'inherit', fontWeight: useWS===v ? 700 : 400,
                        }}>{lbl}</button>
                      ))}
                    </div>
                  </Section>

                  {/* ── AI Features ── */}
                  <Section title="AI Features" T={T} faded={busy}>
                    {[
                      { key:'removeBg',     val:removeBg,     set:setRemoveBg,     color:T.green,  icon:'✂️', label:'Background Removal', sub:'rembg / U2-Net AI' },
                      { key:'crosshatch',   val:crosshatch,   set:setCrosshatch,   color:T.orange, icon:'⊞',  label:'Cross-Hatch',         sub:'Shading effect' },
                      { key:'paperTexture', val:paperTexture, set:setPaperTexture, color:T.orange, icon:'📄', label:'Paper Texture',        sub:'Realistic feel' },
                      { key:'watercolour',  val:watercolour,  set:setWatercolour,  color:T.cyan,   icon:'🎨', label:'Watercolour',          sub:'Colour from pixels' },
                      { key:'colorFill',    val:colorFillMode,set:setColorFillMode,color:T.orange, icon:'🎨', label:'Color Fill',             sub:'Fill with original image colors' },
                    ].map(f => (
                      <div key={f.key} style={{
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'8px 0', borderBottom:`1px solid ${T.border}`,
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{
                            width:30, height:30, borderRadius:8, flexShrink:0,
                            background: f.val ? f.color+'18' : T.dim,
                            border:`1px solid ${f.val ? f.color+'40' : T.border}`,
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:13,
                            transition:'all .2s',
                          }}>{f.icon}</div>
                          <div>
                            <div style={{ fontSize:10, color: f.val ? f.color : T.text, fontWeight: f.val ? 600 : 400, marginBottom:1 }}>
                              {f.label}
                            </div>
                            <div style={{ fontSize:11, color:T.sub }}>{f.sub}</div>
                          </div>
                        </div>
                        <Toggle value={f.val} onChange={f.set} color={f.color} />
                      </div>
                    ))}
                  </Section>

                  {/* ── Stroke Color ── */}
                  <Section title="Stroke Opacity & Width" T={T}>
                    <SliderField label="Opacity" value={strokeOpacity} min={10} max={100} step={5} display={`${strokeOpacity}%`} color={T.purple} T={T} onChange={setStrokeOpacity} />
                    <SliderField label="Width"   value={strokeWidth}   min={50} max={300} step={10} display={`${strokeWidth}%`}  color={T.purple} T={T} onChange={setStrokeWidth}   />
                  </Section>

                  {/* ── Sketch Quality ── */}
                  {quality && (
                    <Section title="Quality" T={T}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                        <div style={{ flex:1, height:6, borderRadius:3, background:T.dim, overflow:'hidden' }}>
                          <div style={{
                            width:`${quality.score}%`, height:'100%', borderRadius:3,
                            background: quality.score>70 ? T.green : quality.score>40 ? T.gold : T.red,
                            transition:'width .6s ease', boxShadow:`0 0 8px currentColor`,
                          }} />
                        </div>
                        <span style={{
                          fontSize:15, fontWeight:800, fontFamily:'"JetBrains Mono",monospace',
                          color: quality.score>70 ? T.green : quality.score>40 ? T.gold : T.red,
                        }}>{quality.score}%</span>
                        <span style={{ fontSize:11, color:T.gold, fontWeight:700 }}>{quality.grade}</span>
                      </div>
                      {quality.issues?.map((iss,i) => (
                        <div key={i} style={{ fontSize:11, color:T.red, lineHeight:1.8, padding:'2px 0' }}>⚠ {iss}</div>
                      ))}
                    </Section>
                  )}

                  {/* ── Gallery save ── */}
                  {phase==='done' && token && svgData && (
                    <Section T={T}>
                      <FieldLabel T={T}>Save to Gallery</FieldLabel>
                      <input
                        value={saveNameVal} onChange={e => setSaveNameVal(e.target.value)}
                        placeholder={`Sketch ${new Date().toLocaleDateString()}`}
                        style={{
                          width:'100%', background:'rgba(255,255,255,.04)',
                          border:`1px solid ${T.border}`, borderRadius:8,
                          padding:'7px 10px', color:T.text, fontSize:10,
                          fontFamily:'inherit', outline:'none', marginBottom:7,
                          transition:'border .2s',
                        }}
                      />
                      <SmBtn T={T} onClick={doSave} accent={T.purple}>💾 Save to Gallery</SmBtn>
                    </Section>
                  )}

                </div>{/* end sections */}
              </div>
            )}

            {/* ── VIDEO / WEBCAM TABS ─── */}
            {activeTab==='Video'  && <VideoTab  canvasRef={canvasRef} onAnimationStart={()=>setShowCanvas(true)} onAnimationReset={()=>setShowCanvas(false)} onSketchReady={()=>{}} />}
            {activeTab==='Webcam' && <WebcamTab canvasRef={canvasRef} onAnimationStart={()=>setShowCanvas(true)} onAnimationReset={()=>setShowCanvas(false)} />}

            {/* ══ TEXT-TO-SKETCH TAB ══ */}
            {activeTab==='Text' && (
              <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflow:'hidden' }}>
                <TextToSketchTab
                  canvasRef={canvasRef}
                  onAnimationStart={() => setShowCanvas(true)}
                  onAnimationReset={() => setShowCanvas(false)}
                  T={T}
                  externalPrompt={t2sPrompt}
                  onPromptChange={handleT2sPromptChange}
                  phase={t2sPhase}
                  genImageB64={t2sGenB64}
                  onGenerate={generateFromText}
                  onCancel={cancelT2S}
                  busy={t2sBusy}
                />
              </div>
            )}

            {/* ── BATCH TAB ─── */}
            {activeTab==='Batch' && (
              <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:0, padding:'10px 10px 0', minHeight:0 }}>
                <Section title="Batch Processing" T={T}>
                  <p style={{ fontSize:10, color:T.sub, lineHeight:1.8, marginBottom:10 }}>
                    Upload multiple images and download all as SVG files in a ZIP archive.
                  </p>
                  <input ref={batchInputRef} type="file" accept="image/*" multiple
                    style={{ display:'none' }} onChange={e => setBatchFiles(Array.from(e.target.files))} />
                  <SmBtn T={T} onClick={() => batchInputRef.current?.click()} style={{ marginBottom:8 }}>
                    📂 Select Images ({batchFiles.length} selected)
                  </SmBtn>
                  {batchFiles.length > 0 && (
                    <div style={{ maxHeight:110, overflowY:'auto', marginBottom:8 }}>
                      {batchFiles.map((f,i) => (
                        <div key={i} style={{
                          fontSize:11, color:T.sub, padding:'3px 6px', fontFamily:'"JetBrains Mono",monospace',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          borderBottom:`1px solid ${T.border}`,
                        }}>{i+1}. {f.name}</div>
                      ))}
                    </div>
                  )}
                  {batchPhase==='processing' && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                        <Spinner color={T.gold} />
                        <span style={{ fontSize:10, color:T.sub }}>Processing… {batchProg}%</span>
                      </div>
                      <ProgressBar value={batchProg} color={T.gold} T={T} />
                    </div>
                  )}
                  {batchPhase==='done' && (
                    <div style={{
                      marginBottom:8, padding:'8px 10px', borderRadius:8,
                      background:T.greenBg, border:`1px solid ${T.greenBdr}`,
                      fontSize:12, color:T.green,
                    }}>✓ Complete — ZIP downloaded.</div>
                  )}
                  <button onClick={runBatch} disabled={!batchFiles.length || batchPhase==='processing'} style={{
                    width:'100%', padding:12, borderRadius:10, border:'none',
                    background: batchFiles.length ? 'linear-gradient(135deg,#f5c542,#e05510)' : T.dim,
                    color: batchFiles.length ? '#08060a' : T.sub,
                    fontSize:12, fontWeight:700, cursor: batchFiles.length ? 'pointer' : 'not-allowed',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit',
                  }}>
                    {batchPhase==='processing' ? <><Spinner color={T.gold} /> Processing…</> : `📦 Process ${batchFiles.length} Images`}
                  </button>
                </Section>
                <Section title="Settings" T={T}>
                  <SliderField label="Edge Detail" value={detail} min={1} max={5} step={1} display={DETAIL_LABELS[detail]} color={T.gold} T={T} onChange={setDetail} />
                  <SliderField label="Max Strokes" value={maxPaths} min={100} max={2000} step={100} display={maxPaths.toLocaleString()} color={T.gold} T={T} onChange={setMaxPaths} />
                  <ToggleRow label="HED Neural Mode" sub="Apply to all" value={useHed} onChange={setUseHed} color={T.blue} T={T} />
                </Section>
              </div>
            )}

            {/* ── GALLERY TAB ─── */}
            {activeTab==='Gallery' && (
              <div style={{ flex:1, overflowY:'auto', padding:'10px 10px 0', minHeight:0 }}>
                {!currentUser ? (
                  <Section title={authMode==='login' ? 'Sign In' : 'Create Account'} T={T}>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <StyledInput value={authUser} onChange={e => setAuthUser(e.target.value)} placeholder="Username" T={T} />
                      <StyledInput value={authPw} onChange={e => setAuthPw(e.target.value)} placeholder="Password" type="password"
                        onKeyDown={e => e.key==='Enter' && doAuth()} T={T} />
                      {authErr && <div style={{ fontSize:12, color:T.red }}>{authErr}</div>}
                      <button onClick={doAuth} style={{
                        padding:10, borderRadius:9, border:'none',
                        background:'linear-gradient(135deg,#a78bfa,#7c3aed)',
                        color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                      }}>{authMode==='login' ? 'Sign In' : 'Create Account'}</button>
                      <button onClick={() => setAuthMode(authMode==='login' ? 'register' : 'login')} style={{
                        background:'transparent', border:'none', color:T.sub, fontSize:12, cursor:'pointer', fontFamily:'inherit',
                      }}>{authMode==='login' ? 'Need an account? Register' : '← Back to sign in'}</button>
                    </div>
                  </Section>
                ) : (
                  <>
                    <Section T={T}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div>
                          <div style={{ fontSize:12, color:T.purple, fontWeight:700 }}>👤 {currentUser}</div>
                          <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>{gallery.length} saved sketches</div>
                        </div>
                      </div>
                    </Section>
                    {gallery.length === 0 && (
                      <div style={{ textAlign:'center', padding:30, color:T.sub, fontSize:11, lineHeight:1.9 }}>
                        No saved sketches yet.<br />Draw something and save it!
                      </div>
                    )}
                    {gallery.map(s => (
                      <div key={s.id} style={{
                        margin:'0 0 8px',
                        padding:'10px 12px', borderRadius:10,
                        background:'rgba(255,255,255,.02)', border:`1px solid ${T.border}`,
                        animation:'slideIn .3s ease',
                      }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                          <div>
                            <div style={{ fontSize:11, fontWeight:600, marginBottom:4 }}>{s.name}</div>
                            <div style={{ fontSize:11, color:T.sub, fontFamily:'"JetBrains Mono",monospace', lineHeight:1.8 }}>
                              {s.engine} · {s.paths} strokes<br />
                              {new Date(s.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <button onClick={() => doDelete(s.id)} style={{
                            background:T.redBg, border:`1px solid ${T.redBdr}`, color:T.red,
                            borderRadius:7, padding:'4px 9px', fontSize:12, cursor:'pointer', fontFamily:'inherit',
                          }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── EXPORT TAB ─── */}
            {activeTab==='Export' && (
              <div style={{ flex:1, overflowY:'auto', padding:'10px 10px 0', minHeight:0 }}>
                <Section title="Export Formats" T={T}>
                  {[
                    { fmt:'SVG Vector',   icon:'📐', color:T.green,  desc:'Scalable — Figma, Illustrator, laser cutting', action:dlSVG, disabled:!svgData,    note:!svgData?'Complete a drawing first':null },
                    { fmt:'PNG Image',    icon:'🖼️', color:T.gold,   desc:'High-res raster export from canvas',            action:dlPNG, disabled:!showCanvas, note:!showCanvas?'Complete a drawing first':null },
                    { fmt:'PDF Document', icon:'📄', color:T.orange, desc:'Print-ready PDF — requires reportlab',           action:dlPDF, disabled:!file,        note:!file?'Upload an image first':null },
                  ].map(e => (
                    <div key={e.fmt} style={{
                      marginBottom:10, padding:'12px 12px', borderRadius:10,
                      background:'rgba(255,255,255,.02)', border:`1px solid ${T.border}`,
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:e.color, display:'flex', alignItems:'center', gap:6 }}>
                          {e.icon} {e.fmt}
                        </div>
                        <button onClick={e.action} disabled={e.disabled} style={{
                          padding:'5px 14px', borderRadius:7,
                          border:`1px solid ${e.disabled ? T.border : e.color+'60'}`,
                          background: e.disabled ? 'transparent' : e.color+'18',
                          color: e.disabled ? T.sub : e.color,
                          fontSize:12, cursor: e.disabled ? 'not-allowed' : 'pointer',
                          fontWeight:600, fontFamily:'inherit',
                        }}>Download</button>
                      </div>
                      <div style={{ fontSize:11, color:T.sub, lineHeight:1.7 }}>{e.desc}</div>
                      {e.note && <div style={{ fontSize:11, color:T.orange, marginTop:3 }}>↑ {e.note}</div>}
                    </div>
                  ))}
                </Section>
                <Section title="Setup" T={T}>
                  <div style={{ padding:'8px 10px', borderRadius:8, background:T.dim, border:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:11, color:T.sub, marginBottom:3 }}>For PDF export, install:</div>
                    <div style={{ fontSize:12, color:T.text, fontFamily:'"JetBrains Mono",monospace' }}>pip install reportlab</div>
                  </div>
                </Section>
              </div>
            )}

            {/* ── DRAW BUTTON (sticky bottom) ─── */}
            {activeTab==='Draw' && (
              <div style={{
                padding:'12px 10px', flexShrink:0,
                background:T.panel, borderTop:`1px solid ${T.border}`,
                transition:'background .4s',
              }}>
                {backendOk===false && (
                  <div style={{
                    marginBottom:8, padding:'8px 10px', borderRadius:8,
                    background:T.redBg, border:`1px solid ${T.redBdr}`,
                    fontSize:11, color:T.red, fontFamily:'"JetBrains Mono",monospace', lineHeight:1.9,
                  }}>
                    Backend offline<br />
                    <span style={{ color:'rgba(248,113,113,.6)' }}>cd backend && python main.py</span>
                  </div>
                )}
                <button
                  onClick={draw} disabled={!canDraw}
                  className="draw-btn"
                  style={{
                    width:'100%', padding:14, borderRadius:12, border:'none',
                    background: canDraw
                      ? coloringBook ? `linear-gradient(135deg,${T.pink},#be185d)`
                        : useHed    ? `linear-gradient(135deg,${T.blue},#1d4ed8)`
                        :             'linear-gradient(135deg,#f5c542 0%,#f97316 60%,#ef4444 100%)'
                      : T.dim,
                    color: canDraw ? (coloringBook||useHed ? '#fff' : '#08060a') : T.sub,
                    fontSize:13, fontWeight:800, cursor: canDraw ? 'pointer' : 'not-allowed',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    boxShadow: canDraw
                      ? coloringBook ? `0 4px 24px ${T.pink}50` : useHed ? `0 4px 24px ${T.blue}50` : '0 4px 24px rgba(245,197,66,.35)'
                      : 'none',
                    transition:'all .25s',
                    fontFamily:'inherit', letterSpacing:'-.01em',
                  }}>
                  {busy
                    ? <><Spinner color={canDraw?'#fff':T.sub} /> Processing…</>
                    : coloringBook ? '📖 Colouring Book'
                    : useHed      ? '🧠 Neural Sketch'
                    :               '✏️ Generate Sketch'}
                </button>
                <div style={{
                  textAlign:'center', marginTop:6, fontSize:11, color:T.sub,
                  fontFamily:'"JetBrains Mono",monospace', letterSpacing:'.04em',
                }}>
                  {coloringBook ? 'thick outlines · print-ready'
                    : useHed    ? `HED · ${hedReady ? 'model ready' : 'model missing'}`
                    : `Canny · lo=${[30,20,12,7,4][detail-1]} hi=${[90,65,40,25,15][detail-1]}`}
                </div>
              </div>
            )}
          </aside>

          {/* ══ CANVAS AREA ═════════════════════════════════════ */}
          <main style={{
            flex:1, overflow:'hidden',
            display:'flex', flexDirection:'column',
            background:T.app,
            position:'relative',
          }}>
            {/* Top accent line */}
            <div style={{
              height:2, flexShrink:0,
              background:`linear-gradient(90deg, transparent 0%, ${engineColor}80 30%, ${engineColor} 50%, ${engineColor}80 70%, transparent 100%)`,
              transition:'background .4s',
            }} />

            {/* Empty state for Video/Webcam tabs */}
            {(activeTab==='Video'||activeTab==='Webcam') && !showCanvas && (
              <div style={{
                flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                flexDirection:'column', gap:16, textAlign:'center',
              }}>
                <div style={{
                  width:72, height:72, borderRadius:20,
                  background:`${activeTab==='Video' ? T.orange : T.cyan}12`,
                  border:`1px solid ${activeTab==='Video' ? T.orange : T.cyan}30`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:32,
                }}>
                  {activeTab==='Video' ? '🎬' : '📷'}
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:T.text, opacity:.2, marginBottom:6 }}>
                    {activeTab==='Video' ? 'Video to Sketch' : 'Live Webcam Sketch'}
                  </div>
                  <div style={{ fontSize:11, color:T.sub, opacity:.4, lineHeight:1.9 }}>
                    {activeTab==='Video' ? 'Upload a video → click Animate Sketch' : 'Click Start Live Sketch in the sidebar'}
                  </div>
                </div>
              </div>
            )}

            {/* Text tab welcome */}
            {!showCanvas && activeTab==='Text' && (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
                <div style={{ textAlign:'center', maxWidth:460 }}>
                  <div style={{ width:88, height:88, borderRadius:24, background:`${T.purple}12`, border:`1px solid ${T.purple}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:38, margin:'0 auto 20px' }}>✨</div>
                  <div style={{ fontSize:22, fontWeight:800, letterSpacing:'-.03em', color:T.text, opacity:.18, marginBottom:8 }}>Text to Sketch</div>
                  <p style={{ fontSize:12, color:T.sub, lineHeight:1.9, opacity:.4 }}>Type any description and watch it become an animated sketch — no image upload needed.</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:20, opacity:.35 }}>
                    {['a cat on a desk','lighthouse at sunset','steaming coffee cup','dragon on a mountain'].map(ex => (
                      <div key={ex} onClick={() => setT2sPrompt(ex)} style={{ padding:'8px 10px', borderRadius:8, background:`${T.purple}08`, border:`1px solid ${T.purple}18`, fontSize:10, color:T.purple, cursor:'pointer' }}>{ex}</div>
                    ))}
                  </div>
                  <p style={{ fontSize:9, color:T.sub, opacity:.25, marginTop:16, fontFamily:'"JetBrains Mono",monospace' }}>← Type a prompt in the sidebar</p>
                </div>
              </div>
            )}

            {/* Welcome / empty draw state */}
            {!showCanvas && activeTab==='Draw' && (
              <div style={{
                flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                padding:24, overflow:'hidden',
              }}>
                <WelcomeScreen backendOk={backendOk} useHed={useHed} coloringBook={coloringBook} T={T} />
              </div>
            )}

            {/* Canvas — centered in remaining space */}
            <div style={{
              flex:1, overflow:'hidden',
              display: (showCanvas || activeTab==='Video' || activeTab==='Webcam' || (activeTab==='Text' && showCanvas)) ? 'flex' : 'none',
              alignItems:'center',
              justifyContent:'center',
              padding:20,
              position:'relative',
              background: T.app,
            }}>
              {/* Paper texture overlay */}
              {/* Paper texture disabled — was causing diagonal line artifacts */}
              {false && paperTexture && paperB64 && (
                <div style={{
                  position:'absolute', inset:0,
                  backgroundImage:`url(data:image/png;base64,${paperB64})`,
                  backgroundSize:'cover', opacity:0.06,
                  mixBlendMode:'multiply',
                  pointerEvents:'none', zIndex:1,
                }} />
              )}
              {/* Generated image preview for Text tab */}
              {activeTab==='Text' && t2sGenB64 && t2sPhase !== 'idle' && (
                <div style={{ position:'absolute', top:16, right:16, zIndex:5, animation:'fadeIn .3s ease' }}>
                  <div style={{ fontSize:7, color:T.sub, marginBottom:4, letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'"JetBrains Mono",monospace' }}>Generated</div>
                  <img src={`data:image/jpeg;base64,${t2sGenB64}`} alt="Generated" style={{ width:110, borderRadius:8, border:`1px solid ${T.border}`, display:'block', boxShadow:'0 4px 20px rgba(0,0,0,.4)' }} />
                </div>
              )}
              <DrawingCanvas
                ref={canvasRef}
                penStyle={penStyle}
                strokeOpacity={strokeOpacity / 100}
                strokeWidthMultiplier={strokeWidth / 100}
                colorFillImage={colorFillMode ? file : null}
                fillAfterDone={colorFillMode && !!file}
                onComplete={() => {
                  setPhase('done')
                  if (activeTab === 'Text') setT2sPhase('done')
                }}
              />
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════
   Small Components
═══════════════════════════════════════════════════════════ */

function WelcomeScreen({ backendOk, useHed, coloringBook, T }) {
  const col  = coloringBook ? T.pink : useHed ? T.blue : T.gold
  const icon = coloringBook ? '📖' : useHed ? '🧠' : '✏️'
  const ttl  = coloringBook ? 'Colouring Book Mode' : useHed ? 'HED Neural Mode' : 'AI Sketch Studio'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, textAlign:'center', maxWidth:520 }}>
      <div style={{
        width:88, height:88, borderRadius:24,
        background:`${col}12`, border:`1px solid ${col}25`,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:38,
        boxShadow:`0 0 60px ${col}18`,
        transition:'all .4s',
      }}>{icon}</div>

      <div>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-.03em', color:T.text, opacity:.18, marginBottom:8 }}>
          {ttl}
        </h1>
        <p style={{ fontSize:12, color:T.sub, lineHeight:1.9, opacity:.4, maxWidth:380 }}>
          {coloringBook ? 'Generates thick, clean outlines — perfect for printing & colouring.'
           : useHed     ? 'HED neural network detects semantically meaningful edges in photos.'
           :              'Upload any image and watch it transform into a hand-drawn sketch.'}
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, width:'100%' }}>
        {[
          { icon:'🧠', title:'HED Neural',      color:T.blue,  desc:'Best for portraits & photos' },
          { icon:'⚡', title:'Canny Edge',       color:T.gold,  desc:'Best for anime & illustrations' },
          { icon:'📖', title:'Colouring Book',   color:T.pink,  desc:'Thick outlines for printing' },
        ].map(c => (
          <div key={c.title} style={{
            padding:'14px 10px', borderRadius:12,
            background:`${c.color}08`, border:`1px solid ${c.color}18`,
            opacity:.6,
          }}>
            <div style={{ fontSize:20, marginBottom:6 }}>{c.icon}</div>
            <div style={{ fontSize:10, fontWeight:700, color:c.color, marginBottom:4 }}>{c.title}</div>
            <div style={{ fontSize:8, color:T.sub, lineHeight:1.6 }}>{c.desc}</div>
          </div>
        ))}
      </div>

      {backendOk===false && (
        <div style={{
          padding:'10px 16px', borderRadius:10, width:'100%',
          background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.2)',
          fontSize:9, color:'#f87171', fontFamily:'"JetBrains Mono",monospace', lineHeight:2,
          textAlign:'left',
        }}>
          Backend not running → cd backend && python main.py
        </div>
      )}

      <p style={{ fontSize:10, color:T.sub, opacity:.3, letterSpacing:'.02em' }}>
        ← Upload an image in the sidebar to begin
      </p>
    </div>
  )
}

function Section({ title, children, faded, T }) {
  return (
    <div style={{
      borderRadius:12, overflow:'hidden',
      border:`1px solid ${T.border}`,
      opacity: faded ? 0.4 : 1, pointerEvents: faded ? 'none' : 'auto',
      marginBottom:8,
      transition:'opacity .2s',
    }}>
      {title && (
        <div style={{
          padding:'7px 12px', borderBottom:`1px solid ${T.border}`,
          fontSize:8, color:T.sub, letterSpacing:'.14em', textTransform:'uppercase',
          fontFamily:'"JetBrains Mono",monospace', fontWeight:600,
          background:'rgba(255,255,255,.015)',
        }}>{title}</div>
      )}
      <div style={{ padding:'12px' }}>{children}</div>
    </div>
  )
}

function DropZone({ preview, file, dragging, onDragOver, onDragLeave, onDrop, onClick, onClear, T }) {
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={onClick}
      style={{
        border:`2px dashed ${dragging ? T.gold : T.border}`, borderRadius:10, overflow:'hidden',
        cursor: preview ? 'default' : 'pointer',
        background: dragging ? T.goldBg : 'rgba(255,255,255,.015)',
        minHeight: preview ? 0 : 100,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all .18s',
      }}>
      {preview ? (
        <div style={{ position:'relative', width:'100%' }}>
          <img src={preview} alt="preview"
            style={{ width:'100%', maxHeight:140, objectFit:'contain', display:'block' }} />
          <div style={{
            position:'absolute', bottom:0, left:0, right:0,
            background:'linear-gradient(transparent, rgba(0,0,0,.9))',
            padding:'20px 10px 8px',
            display:'flex', justifyContent:'space-between', alignItems:'flex-end',
          }}>
            <span style={{ fontSize:8, color:'rgba(255,255,255,.5)', fontFamily:'"JetBrains Mono",monospace',
                           overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>
              {file?.name}
            </span>
            <button onClick={e => { e.stopPropagation(); onClear() }} style={{
              background:'rgba(255,255,255,.12)', color:'rgba(255,255,255,.7)', border:'none',
              borderRadius:5, padding:'3px 8px', fontSize:9, cursor:'pointer',
            }}>✕</button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:20 }}>
          <div style={{ fontSize:28, opacity:.1, marginBottom:8 }}>🖼️</div>
          <div style={{ fontSize:10, color:T.sub, fontWeight:600, marginBottom:3 }}>Drop image here</div>
          <div style={{ fontSize:8, color:T.sub, opacity:.5 }}>JPG · PNG · WEBP · AVIF</div>
        </div>
      )}
    </div>
  )
}

function SliderField({ label, value, min, max, step, display, color, T, onChange }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <span style={{ fontSize:9, color:T.sub, letterSpacing:'.02em' }}>{label}</span>
        <span style={{
          fontSize:9, color:color||T.gold, fontFamily:'"JetBrains Mono",monospace',
          background:`${color||T.gold}15`, border:`1px solid ${color||T.gold}30`,
          borderRadius:5, padding:'1px 7px',
        }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} style={{ width:'100%', accentColor:color||T.gold }} />
    </div>
  )
}

function Toggle({ value, onChange, color }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width:40, height:22, borderRadius:11, flexShrink:0, cursor:'pointer',
      background: value ? color : 'rgba(255,255,255,.08)',
      position:'relative', transition:'background .2s',
      boxShadow: value ? `0 0 10px ${color}55` : 'none',
    }}>
      <div style={{
        position:'absolute', top:3, left: value ? 21 : 3, width:16, height:16,
        borderRadius:'50%', background:'#fff', transition:'left .2s',
        boxShadow:'0 1px 4px rgba(0,0,0,.4)',
      }} />
    </div>
  )
}

function ToggleRow({ label, sub, value, onChange, color, T }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0' }}>
      <div>
        <div style={{ fontSize:10, color: value ? color : T.sub, fontWeight: value ? 600 : 400 }}>{label}</div>
        {sub && <div style={{ fontSize:8, color:T.sub, marginTop:1 }}>{sub}</div>}
      </div>
      <Toggle value={value} onChange={onChange} color={color} />
    </div>
  )
}

function SmBtn({ children, onClick, T, style, accent }) {
  const col = accent || T.sub
  return (
    <button onClick={onClick} style={{
      width:'100%', padding:'7px 0', background:'rgba(255,255,255,.03)',
      border:`1px solid ${accent ? col+'50' : T.border}`, borderRadius:8,
      color: accent ? col : T.sub, fontSize:9, cursor:'pointer', fontFamily:'inherit',
      fontWeight: accent ? 600 : 400, transition:'all .15s',
      ...style,
    }}>{children}</button>
  )
}

function ExportBtn({ onClick, children, color }) {
  return (
    <button onClick={onClick} style={{
      padding:'4px 10px', borderRadius:7, border:`1px solid ${color}45`,
      background:`${color}18`, color, fontSize:9, cursor:'pointer',
      fontFamily:'inherit', fontWeight:600, transition:'all .15s',
    }}>{children}</button>
  )
}

function FieldLabel({ children, T }) {
  return (
    <div style={{ fontSize:8, color:T.sub, marginBottom:6, letterSpacing:'.08em', textTransform:'uppercase', fontFamily:'"JetBrains Mono",monospace' }}>
      {children}
    </div>
  )
}

function StyledInput({ T, ...props }) {
  return (
    <input {...props} style={{
      background:'rgba(255,255,255,.04)', border:`1px solid ${T.border}`,
      borderRadius:8, padding:'8px 10px', color:T.text, fontSize:10,
      fontFamily:'inherit', outline:'none', width:'100%',
      transition:'border .2s',
    }} />
  )
}

function PulseDot({ color, glow }) {
  return (
    <div style={{
      width:7, height:7, borderRadius:'50%', flexShrink:0, background:color,
      boxShadow: glow ? `0 0 8px ${color}` : 'none',
      animation: glow ? 'pulse 2s infinite' : 'none',
    }} />
  )
}

function Spinner({ color }) {
  return (
    <div style={{
      width:12, height:12, borderRadius:'50%', flexShrink:0,
      border:'2px solid rgba(255,255,255,.07)',
      borderTopColor: color || '#f5c542',
      animation:'spin .65s linear infinite',
    }} />
  )
}

function ProgressBar({ value, color, T }) {
  return (
    <div style={{ height:4, borderRadius:2, background:T.dim, overflow:'hidden' }}>
      <div style={{ width:`${value}%`, height:'100%', background:color, borderRadius:2, transition:'width .3s' }} />
    </div>
  )
}

function Divider() {
  return <div style={{ width:1, height:20, background:'rgba(255,255,255,.07)', flexShrink:0 }} />
}