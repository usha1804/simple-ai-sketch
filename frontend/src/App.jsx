
// import { useState, useRef, useCallback, useEffect } from 'react'
// import DrawingCanvas from './DrawingCanvas.jsx'
// import VideoTab from './VideoTab.jsx'
// import WebcamTab from './WebcamTab.jsx'
// import TextToSketchTab from './TextToSketchTab.jsx'
// import {
//   uploadImage, streamImage, analyseImage,
//   exportPDF, batchProcess,
//   register, login, getGallery, saveSketch, deleteSketch,
//   streamTextToSketch,
// } from './api.js'

// /* ─── Fonts ─────────────────────────────────────────────────── */
// const FONT_IMPORT = `
//   @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
// `

// /* ─── Pen Styles with visual descriptors ──────────────────── */
// const PEN_STYLES = [
//   { id:'pencil',    emoji:'✏️', label:'Pencil',    desc:'HB graphite',     color:'#9ca3af', preview:'thin grey wobble'   },
//   { id:'charcoal',  emoji:'🪨', label:'Charcoal',  desc:'Smudge & shade',  color:'#4b5563', preview:'thick soft dark'     },
//   { id:'ink',       emoji:'🖊️', label:'Ink',       desc:'Sharp precise',   color:'#111827', preview:'crisp black'        },
//   { id:'brush',     emoji:'🖌️', label:'Brush',     desc:'Wet paint flow',  color:'#1e3a5f', preview:'wide tapered'       },
//   { id:'marker',    emoji:'🖍️', label:'Marker',    desc:'Bold flat',       color:'#1f2937', preview:'opaque flat wide'   },
//   { id:'neon',      emoji:'⚡',  label:'Neon',      desc:'Electric glow',   color:'#7c3aed', preview:'glowing cyan'       },
//   { id:'classic',   emoji:'🎨', label:'Classic',   desc:'Sepia sketch',    color:'#92400e', preview:'warm brown hatch'   },
//   { id:'paper',     emoji:'📜', label:'Paper',     desc:'Rough texture',   color:'#78350f', preview:'broken grainy'      },
//   { id:'precision', emoji:'📐', label:'Precision', desc:'Technical line',  color:'#1e3a5f', preview:'thin uniform blue'  },
// ]

// const NAV_ITEMS = [
//   { id:'Draw',    icon:'✏️',  label:'Draw'    },
//   { id:'Text',    icon:'✨',  label:'Text'    },
//   { id:'Video',   icon:'🎬',  label:'Video'   },
//   { id:'Webcam',  icon:'📷',  label:'Webcam'  },
//   { id:'Batch',   icon:'📦',  label:'Batch'   },
//   { id:'Gallery', icon:'🖼️', label:'Gallery' },
//   { id:'Export',  icon:'📤',  label:'Export'  },
// ]

// const DETAIL_LABELS = ['','Minimal','Light','Medium','Detailed','Maximum']

// /* ─── Theme ─────────────────────────────────────────────────── */
// function makeTheme(light) {
//   if (light) return {
//     app:'#f4f3f8', panel:'#ffffff', panel2:'#fafaf9',
//     border:'#e8e6f0', accent:'#6d28d9',
//     text:'#0f0e17', sub:'#6b6580', dim:'#ede9f9', muted:'#ddd9f0',
//     gold:'#b45309', goldBg:'rgba(180,83,9,.08)', goldBdr:'rgba(180,83,9,.2)',
//     blue:'#1d4ed8', blueBg:'rgba(29,78,216,.08)', blueBdr:'rgba(29,78,216,.2)',
//     green:'#15803d', greenBg:'rgba(21,128,61,.08)', greenBdr:'rgba(21,128,61,.2)',
//     red:'#dc2626', redBg:'rgba(220,38,38,.08)', redBdr:'rgba(220,38,38,.2)',
//     orange:'#c2410c', orangeBg:'rgba(194,65,12,.08)',
//     purple:'#6d28d9', purpleBg:'rgba(109,40,217,.08)', purpleBdr:'rgba(109,40,217,.2)',
//     pink:'#be185d', pinkBg:'rgba(190,24,93,.08)', pinkBdr:'rgba(190,24,93,.2)',
//     cyan:'#0e7490', cardBg:'#ffffff', cardHover:'#f5f3ff',
//     rail:'#ffffff', navActive:'rgba(109,40,217,.1)',
//   }
//   return {
//     app:'#0a0914', panel:'#0f0d1c', panel2:'#120f20',
//     border:'#1c1830', accent:'#a78bfa',
//     text:'#f0eeff', sub:'#6e6a84', dim:'#191528', muted:'#2a2445',
//     gold:'#f5c542', goldBg:'rgba(245,197,66,.08)', goldBdr:'rgba(245,197,66,.2)',
//     blue:'#4f9cf9', blueBg:'rgba(79,156,249,.08)', blueBdr:'rgba(79,156,249,.2)',
//     green:'#34d399', greenBg:'rgba(52,211,153,.08)', greenBdr:'rgba(52,211,153,.2)',
//     red:'#f87171', redBg:'rgba(248,113,113,.08)', redBdr:'rgba(248,113,113,.2)',
//     orange:'#fb923c', orangeBg:'rgba(251,146,60,.08)',
//     purple:'#a78bfa', purpleBg:'rgba(167,139,250,.08)', purpleBdr:'rgba(167,139,250,.2)',
//     pink:'#f472b6', pinkBg:'rgba(244,114,182,.08)', pinkBdr:'rgba(244,114,182,.2)',
//     cyan:'#22d3ee', cardBg:'#14112a', cardHover:'#1e1a35',
//     rail:'#0d0b1a', navActive:'rgba(167,139,250,.12)',
//   }
// }

// export default function App() {
//   const canvasRef     = useRef(null)
//   const wsStopRef     = useRef(null)
//   const fileInputRef  = useRef(null)
//   const batchInputRef = useRef(null)

//   const [file,setFile]                       = useState(null)
//   const [colorFillMode,setColorFillMode]     = useState(false)
//   const [preview,setPreview]                 = useState(null)
//   const [detail,setDetail]                   = useState(3)
//   const [maxPaths,setMaxPaths]               = useState(900)
//   const [penStyle,setPenStyle]               = useState('pencil')
//   const [useWS,setUseWS]                     = useState(false)
//   const [dragging,setDragging]               = useState(false)
//   const [activeTab,setActiveTab]             = useState('Draw')
//   const [useHed,setUseHed]                   = useState(false)
//   const [removeBg,setRemoveBg]               = useState(false)
//   const [coloringBook,setColoringBook]       = useState(false)
//   const [crosshatch,setCrosshatch]           = useState(false)
//   const [paperTexture,setPaperTexture]       = useState(false)
//   const [watercolour,setWatercolour]         = useState(false)
//   const [lightMode,setLightMode]             = useState(false)
//   const [strokeOpacity,setStrokeOpacity]     = useState(92)
//   const [strokeWidth,setStrokeWidth]         = useState(100)
//   const [phase,setPhase]                     = useState('idle')
//   const [statusMsg,setStatusMsg]             = useState('')
//   const [showCanvas,setShowCanvas]           = useState(false)
//   const [backendOk,setBackendOk]             = useState(null)
//   const [hedReady,setHedReady]               = useState(false)
//   const [engineUsed,setEngineUsed]           = useState(null)
//   const [strokeCount,setStrokeCount]         = useState(0)
//   const [processingMs,setProcessingMs]       = useState(null)
//   const [quality,setQuality]                 = useState(null)
//   const [svgData,setSvgData]                 = useState(null)
//   const [wcColors,setWcColors]               = useState([])
//   const [paperB64,setPaperB64]               = useState(null)
//   const [warnings,setWarnings]               = useState([])
//   const [autoResult,setAutoResult]           = useState(null)
//   const [batchFiles,setBatchFiles]           = useState([])
//   const [batchPhase,setBatchPhase]           = useState('idle')
//   const [batchProg,setBatchProg]             = useState(0)
//   const [authMode,setAuthMode]               = useState('login')
//   const [authUser,setAuthUser]               = useState('')
//   const [authPw,setAuthPw]                   = useState('')
//   const [authErr,setAuthErr]                 = useState('')
//   const [token,setToken]                     = useState(()=>localStorage.getItem('sketch_token')||'')
//   const [currentUser,setCurrentUser]         = useState(()=>localStorage.getItem('sketch_user')||'')
//   const [gallery,setGallery]                 = useState([])
//   const [saveNameVal,setSaveNameVal]         = useState('')
//   const [t2sPrompt,setT2sPrompt]             = useState('')
//   const [t2sPhase,setT2sPhase]               = useState('idle')
//   const [t2sGenB64,setT2sGenB64]             = useState(null)
//   const [t2sMeta,setT2sMeta]                 = useState(null)
//   const t2sAbortRef  = useRef(null)
//   const t2sPromptRef = useRef('')
//   const t2sBusy = ['generating','processing','drawing'].includes(t2sPhase)

//   const T = makeTheme(lightMode)
//   const engineColor = activeTab==='Text' ? T.purple
//     : coloringBook ? T.pink : useHed ? T.blue : T.gold
//   const busy = ['connecting','processing','drawing'].includes(phase)
//   const canDraw = !!file && !busy && backendOk !== false
//   const isDone = phase==='done' || t2sPhase==='done'

//   /* ─── Health ping ─────────────────────────────────────────── */
//   useEffect(()=>{
//     const ping=()=>fetch('/api/health',{signal:AbortSignal.timeout(3000)})
//       .then(r=>r.json()).then(d=>{setBackendOk(true);setHedReady(d.hed_ready)})
//       .catch(()=>setBackendOk(false))
//     ping(); const t=setInterval(ping,8000); return()=>clearInterval(t)
//   },[])

//   useEffect(()=>{
//     if(activeTab==='Gallery'&&token)
//       getGallery(token).then(d=>setGallery(d.sketches||[])).catch(()=>{})
//   },[activeTab,token])

//   /* ─── File pick ───────────────────────────────────────────── */
//   const pickFile=useCallback(async(f)=>{
//     if(!f||!f.type.startsWith('image/')) return
//     if(preview) URL.revokeObjectURL(preview)
//     setFile(f); setPreview(URL.createObjectURL(f))
//     setPhase('idle'); setStatusMsg(''); setShowCanvas(false)
//     setEngineUsed(null); setStrokeCount(0); setProcessingMs(null)
//     setQuality(null); setSvgData(null); setWarnings([])
//     setAutoResult(null); setWcColors([]); setPaperB64(null)
//     canvasRef.current?.reset(); setActiveTab('Draw')
//     try{
//       setStatusMsg('Analysing...')
//       const r=await analyseImage(f)
//       setAutoResult(r)
//       setDetail(r.detail_level); setMaxPaths(r.max_strokes); 
//       if(r.pen_style) setPenStyle(r.pen_style)
//       if(r.use_hed&&hedReady) setUseHed(true)
//       if(r.screen_photo?.detected)
//         setWarnings([{type:'screen_photo',confidence:r.screen_photo.confidence,
//           message:'Screen photo — right-click → Save As → upload that file.'}])
//       setStatusMsg('')
//     }catch(_){setStatusMsg('')}
//   },[preview,hedReady])

//   const handleT2sPromptChange=useCallback((val)=>{setT2sPrompt(val);t2sPromptRef.current=val},[])
//   const onDrop=useCallback((e)=>{e.preventDefault();setDragging(false);pickFile(e.dataTransfer.files[0])},[pickFile])

//   /* ─── Draw ────────────────────────────────────────────────── */
//   const draw=useCallback(async()=>{
//     if(!file||busy) return
//     wsStopRef.current?.(); canvasRef.current?.reset()
//     setShowCanvas(true); setEngineUsed(null); setWarnings([])
//     setSvgData(null); setQuality(null); setWcColors([]); setPaperB64(null)
//     const opts={useHed,removeBg,coloringBook,crosshatch,paperTexture,watercolour}
//     const t0=Date.now()
//     try{
//       if(useWS){
//         setPhase('connecting'); setStatusMsg('Connecting...')
//         await new Promise((resolve,reject)=>{
//           wsStopRef.current=streamImage(file,detail,maxPaths,{
//             onStatus:m=>{setPhase('processing');setStatusMsg(m)},
//             onWarning:w=>setWarnings(p=>[...p,w]),
//             onMeta:m=>{
//               canvasRef.current?.setup(m.width,m.height)
//               setEngineUsed(m.engine); setStrokeCount(m.total)
//               setProcessingMs(Date.now()-t0)
//               setPhase('drawing'); setStatusMsg(`Drawing ${m.total} strokes...`)
//               setTimeout(()=>canvasRef.current?.start(),60)
//             },
//             onChunk:paths=>canvasRef.current?.addPaths(paths),
//             onDone:msg=>{
//               setPhase('done'); setStatusMsg('')
//               if(msg?.svg) setSvgData(msg.svg)
//               if(msg?.quality) setQuality(msg.quality)
//               if(msg?.wc_colors) setWcColors(msg.wc_colors)
//               if(msg?.paper_b64) setPaperB64(msg.paper_b64)
//               resolve()
//             },
//             onError:msg=>{setPhase('error');setStatusMsg(msg);reject(new Error(msg))},
//           },opts)
//         })
//       } else {
//         setPhase('processing')
//         setStatusMsg(coloringBook?'Colouring-book...':useHed?'Running HED neural net...':'Detecting edges...')
//         const data=await uploadImage(file,detail,maxPaths,pct=>{if(pct===100)setStatusMsg('Tracing paths...')},opts)
//         if(data.warnings?.length) setWarnings(data.warnings)
//         if(data.svg) setSvgData(data.svg)
//         if(data.quality) setQuality(data.quality)
//         if(data.wc_colors) setWcColors(data.wc_colors)
//         if(data.paper_b64) setPaperB64(data.paper_b64)
//         setEngineUsed(data.engine); setStrokeCount(data.total)
//         setProcessingMs(Date.now()-t0)
//         canvasRef.current?.setup(data.width,data.height)
//         canvasRef.current?.addPaths(data.paths)
//         setPhase('drawing'); setStatusMsg(`Drawing ${data.total} strokes...`)
//         setTimeout(()=>canvasRef.current?.start(),60)
//       }
//     }catch(e){setPhase('error');setStatusMsg(e?.message||'Error — is python main.py running?')}
//   },[file,busy,useWS,detail,maxPaths,useHed,removeBg,coloringBook,crosshatch,paperTexture,watercolour])

//   /* ─── Exports ─────────────────────────────────────────────── */
//   const dlSVG=useCallback(()=>{
//     if(!svgData) return
//     const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([svgData],{type:'image/svg+xml'})),download:'sketch.svg'})
//     a.click(); URL.revokeObjectURL(a.href)
//   },[svgData])
//   const dlPNG=useCallback(()=>{
//     const c=document.querySelector('canvas'); if(!c) return
//     Object.assign(document.createElement('a'),{href:c.toDataURL('image/png'),download:'sketch.png'}).click()
//   },[])
//   const dlPDF=useCallback(async()=>{
//     if(!file) return; setStatusMsg('Generating PDF...')
//     try{await exportPDF(file,{detailLevel:detail,maxStrokes:maxPaths,useHed})}
//     catch(_){alert('PDF failed — pip install reportlab')}
//     setStatusMsg('')
//   },[file,detail,maxPaths,useHed])

//   /* ─── Batch ───────────────────────────────────────────────── */
//   const runBatch=useCallback(async()=>{
//     if(!batchFiles.length) return
//     setBatchPhase('processing'); setBatchProg(0)
//     try{await batchProcess(batchFiles,{detailLevel:detail,maxStrokes:maxPaths,useHed,onProgress:p=>setBatchProg(p)});setBatchPhase('done')}
//     catch(_){setBatchPhase('error')}
//   },[batchFiles,detail,maxPaths,useHed])

//   /* ─── Auth ────────────────────────────────────────────────── */
//   const doAuth=useCallback(async()=>{
//     setAuthErr('')
//     try{
//       const res=authMode==='register'?await register(authUser,authPw):await login(authUser,authPw)
//       setToken(res.access_token); setCurrentUser(res.username)
//       localStorage.setItem('sketch_token',res.access_token)
//       localStorage.setItem('sketch_user',res.username)
//     }catch(e){setAuthErr(e.response?.data?.detail||'Auth failed')}
//   },[authMode,authUser,authPw])

//   const doLogout=useCallback(()=>{
//     setToken(''); setCurrentUser(''); setGallery([])
//     localStorage.removeItem('sketch_token'); localStorage.removeItem('sketch_user')
//   },[])

//   const doSave=useCallback(async()=>{
//     if(!token||!svgData) return
//     try{await saveSketch(token,saveNameVal||`Sketch ${new Date().toLocaleDateString()}`,svgData,engineUsed||'canny',strokeCount);setSaveNameVal('');alert('Saved!')}
//     catch(_){alert('Save failed')}
//   },[token,svgData,saveNameVal,engineUsed,strokeCount])

//   const doDelete=useCallback(async(id)=>{
//     try{await deleteSketch(token,id);setGallery(p=>p.filter(s=>s.id!==id))}catch(_){}
//   },[token])

//   /* ─── Text to Sketch ──────────────────────────────────────── */
//   const generateFromText=useCallback(()=>{
//     if(!t2sPromptRef.current.trim()||t2sBusy) return
//     if(backendOk===false){setT2sPhase('error');setStatusMsg('Backend offline');return}
//     t2sAbortRef.current?.()
//     canvasRef.current?.reset()
//     setShowCanvas(true); setT2sPhase('generating'); setT2sGenB64(null); setT2sMeta(null)
//     setSvgData(null); setQuality(null); setStatusMsg('Generating image…')
//     t2sAbortRef.current=streamTextToSketch(
//       {prompt:t2sPromptRef.current,penStyle,detailLevel:detail,maxStrokes:maxPaths,useHed,coloringBook,crosshatch,generator:'auto'},
//       {
//         onStatus:m=>setStatusMsg(m),
//         onImageReady:(b64)=>{setT2sGenB64(b64);setT2sPhase('processing');setStatusMsg('Extracting sketch paths…')},
//         onMeta:m=>{canvasRef.current?.setup(m.width,m.height);setT2sMeta(m);setT2sPhase('drawing');setStatusMsg(`Animating ${m.total} strokes…`)},
//         onChunk:paths=>canvasRef.current?.addPaths(paths),
//         onStartDraw:()=>setTimeout(()=>canvasRef.current?.start(),60),
//         onDone:msg=>{
//           setT2sPhase('done');setStatusMsg('');setPhase('done')
//           setEngineUsed(msg.engine||'t2s');setStrokeCount(msg.total||0)
//           if(msg.svg)setSvgData(msg.svg);if(msg.quality)setQuality(msg.quality)
//         },
//         onError:msg=>{setT2sPhase('error');setStatusMsg(msg||'Generation failed');setPhase('error');t2sAbortRef.current=null},
//       }
//     )
//   },[t2sBusy,penStyle,detail,maxPaths,useHed,coloringBook,crosshatch,canvasRef,backendOk])

//   const cancelT2S=useCallback(()=>{
//     try{t2sAbortRef.current?.()}catch(_){}
//     t2sAbortRef.current=null;setT2sPhase('idle');setPhase('idle');setStatusMsg('')
//     canvasRef.current?.reset();setShowCanvas(false)
//   },[])

//   const currentPen = PEN_STYLES.find(p=>p.id===penStyle)||PEN_STYLES[0]

//   return (
//     <>
//       <style>{`
//         ${FONT_IMPORT}
//         *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
//         :root{color-scheme:dark}
//         body{overflow:hidden}
//         ::-webkit-scrollbar{width:4px}
//         ::-webkit-scrollbar-track{background:transparent}
//         ::-webkit-scrollbar-thumb{background:rgba(128,128,128,.15);border-radius:4px}
//         input[type=range]{-webkit-appearance:none;height:3px;border-radius:2px;outline:none;cursor:pointer}
//         input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.3)}
//         @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
//         @keyframes spin{to{transform:rotate(360deg)}}
//         @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
//         @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(167,139,250,.3)}50%{box-shadow:0 0 40px rgba(167,139,250,.6)}}
//         .nav-btn:hover{background:rgba(167,139,250,.1)!important;color:inherit!important}
//         .pen-card:hover{transform:translateY(-1px);border-color:rgba(167,139,250,.5)!important}
//         .toggle-row:hover{background:rgba(255,255,255,.03)!important}
//         .draw-btn:hover:not(:disabled){filter:brightness(1.08);transform:translateY(-1px)}
//         .draw-btn:active:not(:disabled){transform:translateY(0)}
//       `}</style>

//       <div style={{
//         width:'100vw',height:'100vh',display:'flex',flexDirection:'column',
//         background:T.app,color:T.text,overflow:'hidden',
//         fontFamily:'"DM Sans",-apple-system,sans-serif',
//       }}>

//         {/* ══ TOPBAR ══════════════════════════════════════════════ */}
//         <header style={{
//           height:56,flexShrink:0,display:'flex',alignItems:'center',
//           justifyContent:'space-between',padding:'0 16px 0 12px',
//           background:T.panel,borderBottom:`1px solid ${T.border}`,
//           zIndex:20,gap:12,
//         }}>
//           {/* Logo */}
//           <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
//             <div style={{
//               width:36,height:36,borderRadius:10,
//               background:'linear-gradient(135deg,#f5c542,#f97316 60%,#a855f7)',
//               display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,
//               boxShadow:'0 3px 12px rgba(245,197,66,.3)',
//             }}>✏️</div>
//             <div>
//               <div style={{fontSize:16,fontWeight:700,letterSpacing:'-.03em',lineHeight:1.1}}>Sketch Studio</div>
//               <div style={{fontSize:10,color:T.sub,letterSpacing:'.1em',fontFamily:'"DM Mono",monospace'}}>AI POWERED · v8</div>
//             </div>
//           </div>

//           {/* Engine switcher */}
//           <div style={{
//             display:'flex',borderRadius:10,border:`1px solid ${T.border}`,
//             background:T.dim,padding:2,gap:1,
//           }}>
//             {[
//               {hed:false,cb:false,label:'⚡ Canny',col:T.gold},
//               {hed:true, cb:false,label:'🧠 HED',  col:T.blue},
//               {hed:false,cb:true, label:'📖 Book',  col:T.pink},
//             ].map(({hed,cb,label,col})=>{
//               const on=useHed===hed&&coloringBook===cb
//               return(
//                 <button key={label} onClick={()=>{setUseHed(hed);setColoringBook(cb)}}
//                   style={{
//                     padding:'6px 14px',border:'none',cursor:'pointer',borderRadius:8,
//                     background:on?col+'20':'transparent',
//                     color:on?col:T.sub,fontSize:13,fontWeight:on?700:500,
//                     fontFamily:'inherit',transition:'all .15s',
//                   }}>{label}</button>
//               )
//             })}
//           </div>

//           {/* Status + engine badge */}
//           <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
//             {(busy||t2sBusy||statusMsg)&&(
//               <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:phase==='error'?T.red:T.sub}}>
//                 {(busy||t2sBusy)&&<Spinner color={engineColor}/>}
//                 <span style={{maxWidth:260,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{statusMsg}</span>
//               </div>
//             )}
//             {engineUsed&&(
//               <div style={{
//                 padding:'4px 12px',borderRadius:16,
//                 background:engineColor+'15',border:`1px solid ${engineColor}30`,
//                 fontSize:11,color:engineColor,fontFamily:'"DM Mono",monospace',
//                 display:'flex',alignItems:'center',gap:6,animation:'fadeUp .3s ease',
//               }}>
//                 <PulseDot color={engineColor} glow/>
//                 {engineUsed.toUpperCase()}
//                 {strokeCount>0&&<span style={{color:T.sub}}>· {strokeCount}</span>}
//                 {processingMs>0&&<span style={{color:T.sub}}>· {(processingMs/1000).toFixed(1)}s</span>}
//                 {quality?.grade&&<span style={{color:T.gold,fontWeight:700}}>· {quality.grade}</span>}
//               </div>
//             )}
//           </div>

//           {/* Right controls */}
//           <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
//             {isDone&&(
//               <div style={{display:'flex',gap:5,animation:'fadeUp .3s ease'}}>
//                 {svgData&&<XBtn onClick={dlSVG} col={T.green}>SVG</XBtn>}
//                 <XBtn onClick={dlPNG} col={T.gold}>PNG</XBtn>
//                 <XBtn onClick={dlPDF} col={T.orange}>PDF</XBtn>
//                 {token&&svgData&&<XBtn onClick={doSave} col={T.purple}>Save</XBtn>}
//               </div>
//             )}
//             <div style={{width:1,height:20,background:T.border}}/>
//             <div style={{display:'flex',alignItems:'center',gap:5}}>
//               <PulseDot color={backendOk===true?T.green:backendOk===false?T.red:T.sub} glow={backendOk===true}/>
//               <span style={{fontSize:11,color:backendOk===true?T.green:backendOk===false?T.red:T.sub,fontFamily:'"DM Mono",monospace',fontWeight:600}}>
//                 {backendOk===true?'Online':backendOk===false?'Offline':'…'}
//               </span>
//             </div>
//             <button onClick={()=>setLightMode(v=>!v)} style={{
//               width:32,height:32,borderRadius:8,border:`1px solid ${T.border}`,
//               background:T.dim,color:lightMode?'#92400e':'#a78bfa',
//               cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,
//             }}>{lightMode?'☀️':'🌙'}</button>
//             {currentUser
//               ?<div style={{display:'flex',alignItems:'center',gap:6}}>
//                 <span style={{fontSize:13,color:T.purple,fontWeight:600}}>👤 {currentUser}</span>
//                 <button onClick={doLogout} style={{fontSize:12,color:T.sub,background:'transparent',border:`1px solid ${T.border}`,borderRadius:7,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}>Out</button>
//               </div>
//               :<button onClick={()=>setActiveTab('Gallery')} style={{fontSize:13,color:T.purple,background:T.purpleBg,border:`1px solid ${T.purpleBdr}`,borderRadius:8,padding:'5px 12px',cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>Sign In</button>
//             }
//           </div>
//         </header>

//         {/* ══ BODY — 3-panel layout ════════════════════════════════ */}
//         <div style={{flex:1,display:'flex',overflow:'hidden'}}>

//           {/* ── LEFT RAIL + PANEL ────────────────────────────────── */}
//           <div style={{display:'flex',flexShrink:0}}>
//             {/* Vertical nav rail */}
//             <div style={{
//               width:60,background:T.rail,borderRight:`1px solid ${T.border}`,
//               display:'flex',flexDirection:'column',alignItems:'center',
//               paddingTop:8,paddingBottom:8,gap:2,zIndex:10,
//             }}>
//               {NAV_ITEMS.map(t=>{
//                 const active=activeTab===t.id
//                 return(
//                   <button key={t.id} className="nav-btn" onClick={()=>setActiveTab(t.id)}
//                     style={{
//                       width:44,height:44,borderRadius:10,border:'none',cursor:'pointer',
//                       background:active?T.navActive:'transparent',
//                       color:active?T.accent:T.sub,
//                       display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
//                       gap:2,transition:'all .15s',fontSize:10,fontFamily:'inherit',fontWeight:active?700:500,
//                     }}>
//                     <span style={{fontSize:16}}>{t.icon}</span>
//                     <span style={{letterSpacing:'.02em',fontSize:9}}>{t.label}</span>
//                   </button>
//                 )
//               })}
//               <div style={{flex:1}}/>
//               {/* Bottom: transfer mode */}
//               <div style={{padding:'4px 0',display:'flex',flexDirection:'column',gap:3,alignItems:'center'}}>
//                 <button onClick={()=>setUseWS(v=>!v)} title={useWS?'WebSocket':'REST'} style={{
//                   width:36,height:36,borderRadius:8,border:`1px solid ${useWS?T.purpleBdr:T.border}`,
//                   background:useWS?T.purpleBg:T.dim,color:useWS?T.purple:T.sub,
//                   cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,
//                 }}>{useWS?'⚡':'🔗'}</button>
//               </div>
//             </div>

//             {/* Settings panel */}
//             <div style={{
//               width:280,background:T.panel,borderRight:`1px solid ${T.border}`,
//               display:'flex',flexDirection:'column',overflow:'hidden',
//             }}>
//               {/* ── DRAW TAB ─────────────────────────────────────── */}
//               {activeTab==='Draw'&&(
//                 <div style={{flex:1,overflowY:'auto',padding:'14px 12px 100px'}}>
//                   {/* Warnings */}
//                   {warnings.filter(w=>w.type==='screen_photo').map((w,i)=>(
//                     <div key={i} style={{marginBottom:10,padding:'10px 12px',borderRadius:10,background:T.redBg,border:`1px solid ${T.redBdr}`,fontSize:12,lineHeight:1.7,color:T.red}}>
//                       ⚠️ Screen Photo ({Math.round(w.confidence*100)}%) — {w.message}
//                     </div>
//                   ))}
//                   {autoResult&&!warnings.find(w=>w.type==='screen_photo')&&(
//                     <div style={{marginBottom:10,padding:'8px 12px',borderRadius:10,background:T.greenBg,border:`1px solid ${T.greenBdr}`,fontSize:12,animation:'fadeUp .3s ease',color:T.green}}>
//                       ✓ Auto-detected: {autoResult.label}
//                     </div>
//                   )}

//                   {/* Upload */}
//                   <PanelLabel T={T} icon="📁">Image</PanelLabel>
//                   <div onDragOver={e=>{e.preventDefault();setDragging(true)}}
//                     onDragLeave={()=>setDragging(false)} onDrop={onDrop}
//                     onClick={()=>!preview&&fileInputRef.current?.click()}
//                     style={{
//                       border:`2px dashed ${dragging?T.gold:T.border}`,
//                       borderRadius:12,overflow:'hidden',
//                       cursor:preview?'default':'pointer',
//                       background:dragging?T.goldBg:'rgba(255,255,255,.015)',
//                       minHeight:preview?0:96,transition:'all .2s',marginBottom:8,
//                       display:'flex',alignItems:'center',justifyContent:'center',
//                     }}>
//                     {preview?(
//                       <div style={{position:'relative',width:'100%'}}>
//                         <img src={preview} alt="preview" style={{width:'100%',maxHeight:150,objectFit:'contain',display:'block'}}/>
//                         <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,.8))',padding:'20px 10px 8px',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
//                           <span style={{fontSize:10,color:'rgba(255,255,255,.5)',fontFamily:'"DM Mono",monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:160}}>{file?.name}</span>
//                           <button onClick={e=>{e.stopPropagation();setFile(null);setPreview(null);setShowCanvas(false);setPhase('idle');setStatusMsg('');setEngineUsed(null);setWarnings([]);setAutoResult(null);setSvgData(null);canvasRef.current?.reset()}}
//                             style={{background:'rgba(255,255,255,.15)',color:'#fff',border:'none',borderRadius:5,padding:'2px 8px',fontSize:11,cursor:'pointer'}}>✕</button>
//                         </div>
//                       </div>
//                     ):(
//                       <div style={{textAlign:'center',padding:20}}>
//                         <div style={{fontSize:28,opacity:.15,marginBottom:6}}>🖼️</div>
//                         <div style={{fontSize:13,color:T.sub,fontWeight:600,marginBottom:3}}>Drop image here</div>
//                         <div style={{fontSize:11,color:T.sub,opacity:.5}}>JPG · PNG · WEBP · AVIF</div>
//                       </div>
//                     )}
//                   </div>
//                   <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>pickFile(e.target.files[0])}/>
//                   {preview&&<button onClick={()=>fileInputRef.current?.click()} style={{width:'100%',padding:'7px',borderRadius:8,border:`1px solid ${T.border}`,background:T.dim,color:T.sub,fontSize:12,cursor:'pointer',fontFamily:'inherit',marginBottom:12}}>⇄ Change Image</button>}

//                   {/* Parameters */}
//                   <PanelLabel T={T} icon="⚙️">Parameters</PanelLabel>
//                   <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:12,padding:'12px',marginBottom:12}}>
//                     <Slider label="Detail" value={detail} min={1} max={5} step={1} display={DETAIL_LABELS[detail]} color={engineColor} T={T} onChange={setDetail}/>
//                     <Slider label="Strokes" value={maxPaths} min={100} max={2500} step={100} display={maxPaths.toLocaleString()} color={T.gold} T={T} onChange={setMaxPaths}/>
//                     <Slider label="Opacity" value={strokeOpacity} min={10} max={100} step={5} display={`${strokeOpacity}%`} color={T.purple} T={T} onChange={setStrokeOpacity}/>
//                     <Slider label="Width" value={strokeWidth} min={50} max={300} step={10} display={`${strokeWidth}%`} color={T.purple} T={T} onChange={setStrokeWidth} last/>
//                   </div>

//                   {/* AI Features */}
//                   <PanelLabel T={T} icon="🤖">AI Features</PanelLabel>
//                   <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden',marginBottom:12}}>
//                     {[
//                       {val:removeBg,set:setRemoveBg,col:T.green,icon:'✂️',lbl:'Remove Background',sub:'U2-Net AI'},
//                       {val:crosshatch,set:setCrosshatch,col:T.orange,icon:'⊞',lbl:'Cross-Hatch',sub:'Shading effect'},
//                       {val:paperTexture,set:setPaperTexture,col:T.orange,icon:'📄',lbl:'Paper Texture',sub:'Grain overlay'},
//                       {val:watercolour,set:setWatercolour,col:T.cyan,icon:'🎨',lbl:'Watercolour Fill',sub:'Image color sampling'},
//                       {val:colorFillMode,set:setColorFillMode,col:T.gold,icon:'🖌️',lbl:'Color Overlay',sub:'Region fill'},
//                     ].map((f,i,arr)=>(
//                       <div key={f.lbl} className="toggle-row" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',borderBottom:i<arr.length-1?`1px solid ${T.border}`:'none',transition:'background .15s'}}>
//                         <div style={{display:'flex',alignItems:'center',gap:9}}>
//                           <div style={{width:28,height:28,borderRadius:7,flexShrink:0,background:f.val?f.col+'18':T.dim,border:`1px solid ${f.val?f.col+'40':T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,transition:'all .2s'}}>{f.icon}</div>
//                           <div>
//                             <div style={{fontSize:12,color:f.val?f.col:T.text,fontWeight:f.val?600:500,marginBottom:1}}>{f.lbl}</div>
//                             <div style={{fontSize:10,color:T.sub}}>{f.sub}</div>
//                           </div>
//                         </div>
//                         <Toggle value={f.val} onChange={f.set} color={f.col}/>
//                       </div>
//                     ))}
//                   </div>

//                   {/* Quality */}
//                   {quality&&(
//                     <>
//                       <PanelLabel T={T} icon="📊">Quality</PanelLabel>
//                       <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:12,padding:12,marginBottom:12}}>
//                         <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
//                           <div style={{flex:1,height:5,borderRadius:3,background:T.dim,overflow:'hidden'}}>
//                             <div style={{width:`${quality.score}%`,height:'100%',borderRadius:3,background:quality.score>70?T.green:quality.score>40?T.gold:T.red,transition:'width .6s ease'}}/>
//                           </div>
//                           <span style={{fontSize:15,fontWeight:800,fontFamily:'"DM Mono",monospace',color:quality.score>70?T.green:quality.score>40?T.gold:T.red}}>{quality.score}%</span>
//                           <span style={{fontSize:13,color:T.gold,fontWeight:700}}>{quality.grade}</span>
//                         </div>
//                         {quality.issues?.map((iss,i)=><div key={i} style={{fontSize:11,color:T.red,lineHeight:1.8}}>⚠ {iss}</div>)}
//                       </div>
//                     </>
//                   )}

//                   {/* Save */}
//                   {phase==='done'&&token&&svgData&&(
//                     <>
//                       <PanelLabel T={T} icon="💾">Save</PanelLabel>
//                       <input value={saveNameVal} onChange={e=>setSaveNameVal(e.target.value)} placeholder="Sketch name..."
//                         style={{width:'100%',background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:8,padding:'7px 10px',color:T.text,fontSize:12,fontFamily:'inherit',outline:'none',marginBottom:7}}/>
//                       <button onClick={doSave} style={{width:'100%',padding:'8px',borderRadius:8,border:`1px solid ${T.purpleBdr}`,background:T.purpleBg,color:T.purple,fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>💾 Save to Gallery</button>
//                     </>
//                   )}
//                 </div>
//               )}

//               {/* Other tabs in left panel */}
//               {activeTab==='Video'&&<VideoTab canvasRef={canvasRef} onAnimationStart={()=>setShowCanvas(true)} onAnimationReset={()=>setShowCanvas(false)} onSketchReady={()=>{}}/>}
//               {activeTab==='Webcam'&&<WebcamTab canvasRef={canvasRef} onAnimationStart={()=>setShowCanvas(true)} onAnimationReset={()=>setShowCanvas(false)}/>}
//               {activeTab==='Text'&&(
//                 <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,overflow:'hidden'}}>
//                   <TextToSketchTab canvasRef={canvasRef} onAnimationStart={()=>setShowCanvas(true)} onAnimationReset={()=>setShowCanvas(false)}
//                     T={T} externalPrompt={t2sPrompt} onPromptChange={handleT2sPromptChange}
//                     phase={t2sPhase} genImageB64={t2sGenB64} onGenerate={generateFromText} onCancel={cancelT2S} busy={t2sBusy}/>
//                 </div>
//               )}
//               {activeTab==='Batch'&&(
//                 <div style={{flex:1,overflowY:'auto',padding:'14px',minHeight:0}}>
//                   <PanelLabel T={T} icon="📦">Batch Processing</PanelLabel>
//                   <p style={{fontSize:12,color:T.sub,lineHeight:1.8,marginBottom:10}}>Upload multiple images → download all as SVG ZIP.</p>
//                   <input ref={batchInputRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>setBatchFiles(Array.from(e.target.files))}/>
//                   <button onClick={()=>batchInputRef.current?.click()} style={{width:'100%',padding:'8px',borderRadius:9,border:`1px solid ${T.border}`,background:T.cardBg,color:T.sub,fontSize:12,cursor:'pointer',fontFamily:'inherit',marginBottom:7}}>📂 Select Images ({batchFiles.length})</button>
//                   {batchPhase==='processing'&&<div style={{fontSize:12,color:T.sub,marginBottom:8}}>Processing… {batchProg}%</div>}
//                   {batchPhase==='done'&&<div style={{marginBottom:8,padding:'8px 10px',borderRadius:8,background:T.greenBg,border:`1px solid ${T.greenBdr}`,fontSize:12,color:T.green}}>✓ ZIP downloaded.</div>}
//                   <button onClick={runBatch} disabled={!batchFiles.length||batchPhase==='processing'} style={{width:'100%',padding:10,borderRadius:10,border:'none',background:batchFiles.length?'linear-gradient(135deg,#f5c542,#e05510)':T.dim,color:batchFiles.length?'#08060a':T.sub,fontSize:13,fontWeight:700,cursor:batchFiles.length?'pointer':'not-allowed',fontFamily:'inherit'}}>
//                     {batchPhase==='processing'?'Processing…':`📦 Process ${batchFiles.length}`}
//                   </button>
//                 </div>
//               )}
//               {activeTab==='Gallery'&&(
//                 <div style={{flex:1,overflowY:'auto',padding:'14px',minHeight:0}}>
//                   {!currentUser?(
//                     <>
//                       <PanelLabel T={T} icon="🔐">{authMode==='login'?'Sign In':'Register'}</PanelLabel>
//                       <div style={{display:'flex',flexDirection:'column',gap:7}}>
//                         <input value={authUser} onChange={e=>setAuthUser(e.target.value)} placeholder="Username" style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:8,padding:'8px 10px',color:T.text,fontSize:12,fontFamily:'inherit',outline:'none',width:'100%'}}/>
//                         <input value={authPw} onChange={e=>setAuthPw(e.target.value)} placeholder="Password" type="password" onKeyDown={e=>e.key==='Enter'&&doAuth()} style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:8,padding:'8px 10px',color:T.text,fontSize:12,fontFamily:'inherit',outline:'none',width:'100%'}}/>
//                         {authErr&&<div style={{fontSize:12,color:T.red}}>{authErr}</div>}
//                         <button onClick={doAuth} style={{padding:10,borderRadius:9,border:'none',background:'linear-gradient(135deg,#a78bfa,#7c3aed)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{authMode==='login'?'Sign In':'Register'}</button>
//                         <button onClick={()=>setAuthMode(m=>m==='login'?'register':'login')} style={{background:'transparent',border:'none',color:T.sub,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{authMode==='login'?'Need account? Register':'← Sign in'}</button>
//                       </div>
//                     </>
//                   ):(
//                     <>
//                       <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
//                         <div style={{fontSize:13,color:T.purple,fontWeight:700}}>👤 {currentUser}</div>
//                         <span style={{fontSize:11,color:T.sub}}>{gallery.length} sketches</span>
//                       </div>
//                       {gallery.map(s=>(
//                         <div key={s.id} style={{marginBottom:8,padding:'10px 12px',borderRadius:10,background:T.cardBg,border:`1px solid ${T.border}`}}>
//                           <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
//                             <div>
//                               <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>{s.name}</div>
//                               <div style={{fontSize:10,color:T.sub,fontFamily:'"DM Mono",monospace'}}>{s.engine} · {s.paths} strokes</div>
//                             </div>
//                             <button onClick={()=>doDelete(s.id)} style={{background:T.redBg,border:`1px solid ${T.redBdr}`,color:T.red,borderRadius:6,padding:'3px 8px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Del</button>
//                           </div>
//                         </div>
//                       ))}
//                     </>
//                   )}
//                 </div>
//               )}
//               {activeTab==='Export'&&(
//                 <div style={{flex:1,overflowY:'auto',padding:'14px',minHeight:0}}>
//                   <PanelLabel T={T} icon="📤">Export</PanelLabel>
//                   {[
//                     {fmt:'SVG Vector',icon:'📐',col:T.green,desc:'Figma, Illustrator, laser cut',action:dlSVG,disabled:!svgData},
//                     {fmt:'PNG Image',icon:'🖼️',col:T.gold,desc:'High-res raster from canvas',action:dlPNG,disabled:!showCanvas},
//                     {fmt:'PDF Document',icon:'📄',col:T.orange,desc:'Print-ready — needs reportlab',action:dlPDF,disabled:!file},
//                   ].map(e=>(
//                     <div key={e.fmt} style={{marginBottom:9,padding:'12px',borderRadius:11,background:T.cardBg,border:`1px solid ${T.border}`}}>
//                       <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
//                         <div style={{fontSize:13,fontWeight:700,color:e.col}}>{e.icon} {e.fmt}</div>
//                         <button onClick={e.action} disabled={e.disabled} style={{padding:'4px 12px',borderRadius:7,border:`1px solid ${e.disabled?T.border:e.col+'50'}`,background:e.disabled?'transparent':e.col+'15',color:e.disabled?T.sub:e.col,fontSize:12,cursor:e.disabled?'not-allowed':'pointer',fontWeight:600,fontFamily:'inherit'}}>Download</button>
//                       </div>
//                       <div style={{fontSize:11,color:T.sub}}>{e.desc}</div>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* ── Draw button (sticky bottom) ──────────────────── */}
//               {activeTab==='Draw'&&(
//                 <div style={{position:'absolute',bottom:0,left:60,width:280,padding:'12px',background:T.panel,borderTop:`1px solid ${T.border}`,zIndex:5}}>
//                   {backendOk===false&&(
//                     <div style={{marginBottom:7,padding:'8px 10px',borderRadius:8,background:T.redBg,border:`1px solid ${T.redBdr}`,fontSize:11,color:T.red,fontFamily:'"DM Mono",monospace',lineHeight:1.9}}>
//                       Backend offline<br/><span style={{opacity:.6}}>python main.py</span>
//                     </div>
//                   )}
//                   <button onClick={draw} disabled={!canDraw} className="draw-btn"
//                     style={{
//                       width:'100%',padding:'13px',borderRadius:12,border:'none',
//                       background:canDraw
//                         ?coloringBook?`linear-gradient(135deg,${T.pink},#be185d)`
//                           :useHed?`linear-gradient(135deg,${T.blue},#1d4ed8)`
//                           :'linear-gradient(135deg,#f5c542 0%,#f97316 55%,#ef4444 100%)'
//                         :T.dim,
//                       color:canDraw?(coloringBook||useHed?'#fff':'#08060a'):T.sub,
//                       fontSize:14,fontWeight:800,cursor:canDraw?'pointer':'not-allowed',
//                       display:'flex',alignItems:'center',justifyContent:'center',gap:8,
//                       boxShadow:canDraw
//                         ?coloringBook?`0 5px 20px ${T.pink}40`:useHed?`0 5px 20px ${T.blue}40`:'0 5px 24px rgba(245,197,66,.35)'
//                         :'none',
//                       fontFamily:'inherit',transition:'all .25s',
//                     }}>
//                     {busy?<><Spinner color={canDraw?'#fff':T.sub}/> Processing…</>
//                       :coloringBook?'📖 Colouring Book'
//                       :useHed?'🧠 Neural Sketch'
//                       :'✏️ Generate Sketch'}
//                   </button>
//                   <div style={{textAlign:'center',marginTop:5,fontSize:11,color:T.sub,fontFamily:'"DM Mono",monospace'}}>
//                     {coloringBook?'thick outlines':useHed?`HED · ${hedReady?'ready':'missing'}`:`Canny · ${DETAIL_LABELS[detail]}`}
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* ══ CANVAS CENTER ═══════════════════════════════════════ */}
//           <main style={{
//             flex:1,overflow:'hidden',display:'flex',flexDirection:'column',
//             background:T.app,position:'relative',
//           }}>
//             <div style={{height:2,flexShrink:0,background:`linear-gradient(90deg,transparent,${engineColor}80,${engineColor},${engineColor}80,transparent)`,transition:'background .4s'}}/>

//             {/* Empty states */}
//             {!showCanvas&&activeTab==='Draw'&&(
//               <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:32}}>
//                 <EmptyDraw backendOk={backendOk} useHed={useHed} coloringBook={coloringBook} T={T}/>
//               </div>
//             )}
//             {!showCanvas&&activeTab==='Text'&&(
//               <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
//                 <div style={{textAlign:'center',maxWidth:400}}>
//                   <div style={{width:80,height:80,borderRadius:20,background:`${T.purple}12`,border:`1px solid ${T.purple}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,margin:'0 auto 18px'}}>✨</div>
//                   <div style={{fontSize:22,fontWeight:800,color:T.text,opacity:.2,marginBottom:8}}>Text to Sketch</div>
//                   <p style={{fontSize:13,color:T.sub,lineHeight:1.9,opacity:.4}}>Type a description → animated sketch</p>
//                   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginTop:18,opacity:.4}}>
//                     {['a cat on a desk','lighthouse at sunset','steaming coffee','dragon on mountain'].map(ex=>(
//                       <div key={ex} onClick={()=>setT2sPrompt(ex)} style={{padding:'8px 10px',borderRadius:9,background:`${T.purple}08`,border:`1px solid ${T.purple}18`,fontSize:12,color:T.purple,cursor:'pointer'}}>{ex}</div>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             )}
//             {(activeTab==='Video'||activeTab==='Webcam')&&!showCanvas&&(
//               <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14}}>
//                 <div style={{width:64,height:64,borderRadius:18,background:`${activeTab==='Video'?T.orange:T.cyan}12`,border:`1px solid ${activeTab==='Video'?T.orange:T.cyan}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>{activeTab==='Video'?'🎬':'📷'}</div>
//                 <div style={{fontSize:18,fontWeight:700,color:T.text,opacity:.2}}>{activeTab==='Video'?'Video to Sketch':'Live Webcam'}</div>
//               </div>
//             )}

//             {/* Canvas */}
//             <div style={{
//               flex:1,overflow:'hidden',
//               display:(showCanvas||(activeTab==='Video'&&showCanvas)||(activeTab==='Webcam'&&showCanvas)||(activeTab==='Text'&&showCanvas))?'flex':'none',
//               alignItems:'center',justifyContent:'center',padding:20,position:'relative',
//               background:T.app,
//             }}>
//               {activeTab==='Text'&&t2sGenB64&&t2sPhase!=='idle'&&(
//                 <div style={{position:'absolute',top:14,right:14,zIndex:5,animation:'fadeUp .3s ease'}}>
//                   <div style={{fontSize:9,color:T.sub,marginBottom:3,letterSpacing:'.1em',textTransform:'uppercase',fontFamily:'"DM Mono",monospace'}}>Generated</div>
//                   <img src={`data:image/jpeg;base64,${t2sGenB64}`} alt="Generated" style={{width:100,borderRadius:8,border:`1px solid ${T.border}`,display:'block',boxShadow:'0 3px 16px rgba(0,0,0,.4)'}}/>
//                 </div>
//               )}
//               <DrawingCanvas
//                 ref={canvasRef}
//                 penStyle={penStyle}
//                 strokeOpacity={strokeOpacity/100}
//                 strokeWidthMultiplier={strokeWidth/100}
//                 colorFillImage={colorFillMode?(activeTab==='Text'&&t2sGenB64?`data:image/jpeg;base64,${t2sGenB64}`:file):null}
//                 fillAfterDone={colorFillMode&&(activeTab==='Text'?!!t2sGenB64:!!file)}
//                 onComplete={()=>{setPhase('done');if(activeTab==='Text')setT2sPhase('done')}}
//               />
//             </div>
//           </main>

//           {/* ══ RIGHT PANEL — Style selector ════════════════════════ */}
//           <aside style={{
//             width:280,flexShrink:0,background:T.panel2,borderLeft:`1px solid ${T.border}`,
//             display:'flex',flexDirection:'column',overflow:'hidden',
//           }}>
//             {/* Pen style header */}
//             <div style={{padding:'14px 14px 10px',borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
//               <div style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10}}>Drawing Style</div>
//               {/* Active style preview */}
//               <div style={{
//                 padding:'12px 14px',borderRadius:12,
//                 background:`linear-gradient(135deg,${currentPen.color}20,${currentPen.color}08)`,
//                 border:`1px solid ${currentPen.color}40`,
//                 marginBottom:2,
//               }}>
//                 <div style={{display:'flex',alignItems:'center',gap:10}}>
//                   <span style={{fontSize:22}}>{currentPen.emoji}</span>
//                   <div>
//                     <div style={{fontSize:15,fontWeight:700,color:currentPen.color}}>{currentPen.label}</div>
//                     <div style={{fontSize:11,color:T.sub}}>{currentPen.desc}</div>
//                   </div>
//                 </div>
//                 {/* Mini visual preview */}
//                 <StylePreview id={currentPen.id} color={currentPen.color} T={T}/>
//               </div>
//             </div>

//             {/* Style grid */}
//             <div style={{flex:1,overflowY:'auto',padding:'10px 10px 10px'}}>
//               <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
//                 {PEN_STYLES.map(s=>{
//                   const on=penStyle===s.id
//                   return(
//                     <button key={s.id} className="pen-card" onClick={()=>setPenStyle(s.id)}
//                       style={{
//                         padding:'10px 6px 8px',borderRadius:11,
//                         border:`2px solid ${on?s.color:T.border}`,
//                         background:on?s.color+'14':T.cardBg,
//                         color:on?s.color:T.sub,cursor:'pointer',
//                         fontFamily:'inherit',display:'flex',flexDirection:'column',
//                         alignItems:'center',gap:3,transition:'all .18s',
//                         boxShadow:on?`0 0 16px ${s.color}30`:'none',
//                       }}>
//                       <span style={{fontSize:18}}>{s.emoji}</span>
//                       <span style={{fontSize:11,fontWeight:on?700:500,lineHeight:1.2}}>{s.label}</span>
//                       <span style={{fontSize:9,opacity:.55,textAlign:'center',lineHeight:1.3}}>{s.desc}</span>
//                     </button>
//                   )
//                 })}
//               </div>

//               {/* Style visual differences explanation */}
//               <div style={{marginTop:14,padding:'12px',borderRadius:10,background:T.dim,border:`1px solid ${T.border}`}}>
//                 <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8,letterSpacing:'.06em',textTransform:'uppercase'}}>What changes</div>
//                 {[
//                   {id:'pencil',   desc:'Grey lines · slight wobble · hatching texture'},
//                   {id:'charcoal', desc:'Thick dark · blurred soft · smudge effect'},
//                   {id:'ink',      desc:'Crisp black · precise · sharp corners'},
//                   {id:'brush',    desc:'Wide tapered · wet bleed · pressure vary'},
//                   {id:'marker',   desc:'Flat opaque · rectangular · bold'},
//                   {id:'neon',     desc:'Cyan glow · colored · dark bg effect'},
//                   {id:'classic',  desc:'Sepia brown · crosshatch · warm tone'},
//                   {id:'paper',    desc:'Broken lines · grainy · rough texture'},
//                   {id:'precision',desc:'Thin blue · uniform · technical exact'},
//                 ].find(x=>x.id===penStyle)?.desc?.split(' · ').map((d,i)=>(
//                   <div key={i} style={{fontSize:11,color:T.sub,padding:'2px 0',display:'flex',alignItems:'center',gap:6}}>
//                     <span style={{color:currentPen.color,fontSize:9}}>●</span>{d}
//                   </div>
//                 ))}
//               </div>

//               {/* Engine info */}
//               <div style={{marginTop:12,padding:'12px',borderRadius:10,background:T.dim,border:`1px solid ${T.border}`}}>
//                 <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:8,letterSpacing:'.06em',textTransform:'uppercase'}}>Edge Engine</div>
//                 <div style={{display:'flex',flexDirection:'column',gap:6}}>
//                   {[
//                     {id:'canny',label:'⚡ Canny',desc:'Fast · general images · line art',active:!useHed&&!coloringBook,col:T.gold},
//                     {id:'hed',  label:'🧠 HED',  desc:'Neural · portraits · face detail',active:useHed&&!coloringBook,col:T.blue},
//                     {id:'book', label:'📖 Book',  desc:'Thick outlines · print ready',active:coloringBook,col:T.pink},
//                   ].map(e=>(
//                     <div key={e.id} onClick={()=>{setUseHed(e.id==='hed');setColoringBook(e.id==='book')}}
//                       style={{
//                         padding:'8px 10px',borderRadius:8,cursor:'pointer',
//                         background:e.active?e.col+'15':T.cardBg,
//                         border:`1px solid ${e.active?e.col+'40':T.border}`,
//                         transition:'all .15s',
//                       }}>
//                       <div style={{fontSize:12,fontWeight:e.active?700:500,color:e.active?e.col:T.text,marginBottom:2}}>{e.label}</div>
//                       <div style={{fontSize:10,color:T.sub}}>{e.desc}</div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           </aside>
//         </div>
//       </div>
//     </>
//   )
// }

// /* ─── Style Preview Canvas (inline SVG illustration) ──────── */
// function StylePreview({id,color,T}){
//   const styles={
//     pencil:{stroke:'#9ca3af',width:1.2,dash:'none',filter:'none',opacity:.8},
//     charcoal:{stroke:'#374151',width:5,dash:'none',filter:'blur(1.5px)',opacity:.6},
//     ink:{stroke:'#111827',width:1.5,dash:'none',filter:'none',opacity:1},
//     brush:{stroke:'#1e3a5f',width:7,dash:'none',filter:'blur(.8px)',opacity:.7},
//     marker:{stroke:'#1f2937',width:8,dash:'none',filter:'none',opacity:.85},
//     neon:{stroke:'#22d3ee',width:2,dash:'none',filter:'drop-shadow(0 0 4px #22d3ee)',opacity:1},
//     classic:{stroke:'#92400e',width:1.5,dash:'4,2',filter:'none',opacity:.8},
//     paper:{stroke:'#78350f',width:1.5,dash:'6,3',filter:'url(#roughen)',opacity:.7},
//     precision:{stroke:'#3b82f6',width:.8,dash:'none',filter:'none',opacity:.95},
//   }
//   const s=styles[id]||styles.pencil
//   const bg=id==='neon'?'#0a0914':'transparent'
//   return(
//     <svg width="100%" height={36} viewBox="0 0 200 36" style={{marginTop:8,borderRadius:6,background:bg}}>
//       <defs>
//         <filter id="roughen"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="2"/></filter>
//       </defs>
//       {/* Draw several lines that look like the pen style */}
//       {[8,16,24].map((y,i)=>(
//         <line key={i} x1={10+i*5} y1={y} x2={190-i*3} y2={y}
//           stroke={s.stroke} strokeWidth={s.width} strokeDasharray={s.dash}
//           filter={s.filter} opacity={s.opacity} strokeLinecap="round"/>
//       ))}
//       {id==='pencil'&&<>
//         <line x1="40" y1="10" x2="60" y2="26" stroke="#9ca3af" strokeWidth=".7" opacity=".4"/>
//         <line x1="50" y1="10" x2="70" y2="26" stroke="#9ca3af" strokeWidth=".7" opacity=".4"/>
//       </>}
//       {id==='brush'&&<path d="M20,8 Q100,28 180,12" stroke={s.stroke} strokeWidth="6" fill="none" filter={s.filter} opacity=".6" strokeLinecap="round"/>}
//       {id==='neon'&&<>
//         <line x1="20" y1="18" x2="180" y2="18" stroke="#22d3ee" strokeWidth="1.5" filter="drop-shadow(0 0 6px #22d3ee)"/>
//         <line x1="20" y1="18" x2="180" y2="18" stroke="#ffffff" strokeWidth=".5" opacity=".8"/>
//       </>}
//     </svg>
//   )
// }

// /* ─── Empty state ─────────────────────────────────────────── */
// function EmptyDraw({backendOk,useHed,coloringBook,T}){
//   const col=coloringBook?T.pink:useHed?T.blue:T.gold
//   return(
//     <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20,textAlign:'center',maxWidth:480}}>
//       <div style={{width:84,height:84,borderRadius:24,background:`${col}10`,border:`1px solid ${col}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:38,boxShadow:`0 0 60px ${col}15`}}>
//         {coloringBook?'📖':useHed?'🧠':'✏️'}
//       </div>
//       <div>
//         <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-.04em',color:T.text,opacity:.18,marginBottom:8}}>
//           {coloringBook?'Colouring Book':useHed?'HED Neural Mode':'AI Sketch Studio'}
//         </h1>
//         <p style={{fontSize:13,color:T.sub,lineHeight:1.9,opacity:.35,maxWidth:360}}>
//           Upload any image and watch it transform into a hand-drawn sketch animation.
//         </p>
//       </div>
//       {backendOk===false&&(
//         <div style={{padding:'10px 16px',borderRadius:10,width:'100%',background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.2)',fontSize:11,color:'#f87171',fontFamily:'"DM Mono",monospace',lineHeight:2,textAlign:'left'}}>
//           Backend offline → cd backend && python main.py
//         </div>
//       )}
//       <p style={{fontSize:11,color:T.sub,opacity:.25}}>← Upload an image in the sidebar</p>
//     </div>
//   )
// }

// /* ─── Small components ────────────────────────────────────── */
// function PanelLabel({children,T,icon}){
//   return(
//     <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,fontSize:11,color:T.sub,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase'}}>
//       {icon&&<span style={{fontSize:13}}>{icon}</span>}{children}
//     </div>
//   )
// }

// function Slider({label,value,min,max,step,display,color,T,onChange,last}){
//   return(
//     <div style={{marginBottom:last?0:12}}>
//       <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
//         <span style={{fontSize:12,color:T.sub,fontWeight:500}}>{label}</span>
//         <span style={{fontSize:10,color:color||T.gold,fontFamily:'"DM Mono",monospace',background:`${color||T.gold}12`,border:`1px solid ${color||T.gold}25`,borderRadius:5,padding:'1px 7px',fontWeight:600}}>{display}</span>
//       </div>
//       <input type="range" min={min} max={max} step={step} value={value}
//         onChange={e=>onChange(Number(e.target.value))}
//         style={{width:'100%',accentColor:color||T.gold}}/>
//     </div>
//   )
// }

// function Toggle({value,onChange,color}){
//   return(
//     <div onClick={()=>onChange(!value)} style={{width:38,height:22,borderRadius:11,flexShrink:0,cursor:'pointer',background:value?color:'rgba(255,255,255,.07)',position:'relative',transition:'background .2s',boxShadow:value?`0 0 10px ${color}50`:'none'}}>
//       <div style={{position:'absolute',top:3,left:value?19:3,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.4)'}}/>
//     </div>
//   )
// }

// function XBtn({onClick,children,col}){
//   return(
//     <button onClick={onClick} style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${col}40`,background:`${col}15`,color:col,fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:700,transition:'all .15s'}}>{children}</button>
//   )
// }

// function PulseDot({color,glow}){
//   return(
//     <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:color,boxShadow:glow?`0 0 7px ${color}`:'none',animation:glow?'pulse 2s infinite':'none'}}/>
//   )
// }

// function Spinner({color}){
//   return(
//     <div style={{width:13,height:13,borderRadius:'50%',flexShrink:0,border:'2px solid rgba(255,255,255,.07)',borderTopColor:color||'#f5c542',animation:'spin .65s linear infinite'}}/>
//   )
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

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
`

/* ─── Pen styles — 6 working styles with distinct rendering ─── */
const PEN_STYLES = [
  {
    id:'pencil', label:'Pencil', desc:'HB graphite', color:'#94a3b8',
    icon:(c,on)=>(
      <svg viewBox="0 0 32 32" width="22" height="22">
        <line x1="6" y1="26" x2="22" y2="6" stroke={on?c:'currentColor'} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="8" y1="28" x2="22" y2="6" stroke={on?c+'80':'currentColor'} strokeWidth="1" strokeLinecap="round" opacity=".6"/>
        <polygon points="22,6 26,4 24,8" fill={on?c:'currentColor'} opacity=".8"/>
        <line x1="6" y1="26" x2="8" y2="28" stroke={on?c:'currentColor'} strokeWidth="3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id:'charcoal', label:'Charcoal', desc:'Smudge & shade', color:'#64748b',
    icon:(c,on)=>(
      <svg viewBox="0 0 32 32" width="22" height="22">
        <ellipse cx="16" cy="16" rx="10" ry="6" fill={on?c+'30':'currentColor'} opacity=".3"/>
        <line x1="6" y1="22" x2="26" y2="10" stroke={on?c:'currentColor'} strokeWidth="5" strokeLinecap="round" opacity=".7"/>
        <line x1="8" y1="24" x2="24" y2="12" stroke={on?c:'currentColor'} strokeWidth="3" strokeLinecap="round" opacity=".4"/>
      </svg>
    ),
  },
  {
    id:'ink', label:'Ink', desc:'Sharp & crisp', color:'#475569',
    icon:(c,on)=>(
      <svg viewBox="0 0 32 32" width="22" height="22">
        <path d="M8,24 Q12,14 16,10 Q20,6 22,8" stroke={on?c:'currentColor'} strokeWidth="2" fill="none" strokeLinecap="round"/>
        <ellipse cx="22" cy="8" rx="3" ry="4" fill={on?c:'currentColor'} opacity=".9"/>
        <line x1="8" y1="24" x2="6" y2="28" stroke={on?c:'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id:'brush', label:'Brush', desc:'Wet paint flow', color:'#0ea5e9',
    icon:(c,on)=>(
      <svg viewBox="0 0 32 32" width="22" height="22">
        <path d="M8,26 Q14,16 20,8" stroke={on?c:'currentColor'} strokeWidth="6" strokeLinecap="round" fill="none" opacity=".5"/>
        <path d="M8,26 Q14,16 20,8" stroke={on?c:'currentColor'} strokeWidth="2" strokeLinecap="round" fill="none"/>
        <ellipse cx="20" cy="8" rx="4" ry="5" fill={on?c+'60':'currentColor'} opacity=".6"/>
        <line x1="8" y1="26" x2="6" y2="29" stroke={on?c:'currentColor'} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id:'marker', label:'Marker', desc:'Bold flat', color:'#f59e0b',
    icon:(c,on)=>(
      <svg viewBox="0 0 32 32" width="22" height="22">
        <rect x="5" y="18" width="22" height="8" rx="3" fill={on?c+'50':'currentColor'} opacity=".5"/>
        <rect x="7" y="6" width="18" height="14" rx="4" fill={on?c+'80':'currentColor'} opacity=".7"/>
        <rect x="9" y="20" width="14" height="4" rx="1" fill={on?c:'currentColor'} opacity=".9"/>
      </svg>
    ),
  },
  {
    id:'neon', label:'Neon', desc:'Electric glow', color:'#06b6d4',
    icon:(c,on)=>(
      <svg viewBox="0 0 32 32" width="22" height="22">
        <line x1="6" y1="16" x2="26" y2="16" stroke={on?c:'currentColor'} strokeWidth="3" strokeLinecap="round" filter={on?`drop-shadow(0 0 4px ${c})`:'none'}/>
        <line x1="6" y1="16" x2="26" y2="16" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity=".7"/>
        <circle cx="6" cy="16" r="2" fill={on?c:'currentColor'} opacity=".8"/>
        <circle cx="26" cy="16" r="2" fill={on?c:'currentColor'} opacity=".8"/>
        <line x1="10" y1="10" x2="14" y2="16" stroke={on?c:'currentColor'} strokeWidth="1.5" opacity=".5"/>
        <line x1="22" y1="10" x2="18" y2="16" stroke={on?c:'currentColor'} strokeWidth="1.5" opacity=".5"/>
      </svg>
    ),
  },
]
const NAV_ITEMS = [
  { id:'Draw',    icon:'✏️',  label:'Draw'    },
  { id:'Text',    icon:'✨',  label:'Text'    },
  { id:'Video',   icon:'🎬',  label:'Video'   },
  { id:'Webcam',  icon:'📷',  label:'Webcam'  },
  { id:'Batch',   icon:'📦',  label:'Batch'   },
  { id:'Gallery', icon:'🖼️', label:'Gallery' },
  { id:'Export',  icon:'📤',  label:'Export'  },
]

const DETAIL_LABELS = ['','Minimal','Light','Medium','Detailed','Maximum']

function makeTheme(light) {
  if (light) return {
    app:'#f0eff6',panel:'#ffffff',panel2:'#fafaf9',border:'#e4e2ef',
    accent:'#6d28d9',text:'#0f0e1a',sub:'#6b6080',dim:'#ece9f8',muted:'#ddd8f0',
    gold:'#b45309',goldBg:'rgba(180,83,9,.08)',goldBdr:'rgba(180,83,9,.2)',
    blue:'#1d4ed8',blueBg:'rgba(29,78,216,.08)',blueBdr:'rgba(29,78,216,.2)',
    green:'#15803d',greenBg:'rgba(21,128,61,.08)',greenBdr:'rgba(21,128,61,.2)',
    red:'#dc2626',redBg:'rgba(220,38,38,.08)',redBdr:'rgba(220,38,38,.2)',
    orange:'#c2410c',orangeBg:'rgba(194,65,12,.08)',
    purple:'#6d28d9',purpleBg:'rgba(109,40,217,.08)',purpleBdr:'rgba(109,40,217,.2)',
    pink:'#be185d',pinkBg:'rgba(190,24,93,.08)',pinkBdr:'rgba(190,24,93,.2)',
    cyan:'#0e7490',cardBg:'#ffffff',rail:'#f8f7fc',navActive:'rgba(109,40,217,.1)',
    headerGrad:'linear-gradient(180deg,#ffffff,#fafaf9)',
    canvasBg:'#eeedf4',
  }
  return {
    app:'#07060f',panel:'#0d0b1a',panel2:'#0f0d1e',border:'#1a1730',
    accent:'#a78bfa',text:'#f0eeff',sub:'#6e6882',dim:'#141128',muted:'#221f38',
    gold:'#f5c542',goldBg:'rgba(245,197,66,.08)',goldBdr:'rgba(245,197,66,.22)',
    blue:'#4f9cf9',blueBg:'rgba(79,156,249,.08)',blueBdr:'rgba(79,156,249,.22)',
    green:'#34d399',greenBg:'rgba(52,211,153,.08)',greenBdr:'rgba(52,211,153,.22)',
    red:'#f87171',redBg:'rgba(248,113,113,.08)',redBdr:'rgba(248,113,113,.22)',
    orange:'#fb923c',orangeBg:'rgba(251,146,60,.08)',
    purple:'#a78bfa',purpleBg:'rgba(167,139,250,.08)',purpleBdr:'rgba(167,139,250,.22)',
    pink:'#f472b6',pinkBg:'rgba(244,114,182,.08)',pinkBdr:'rgba(244,114,182,.22)',
    cyan:'#22d3ee',cardBg:'#110f22',rail:'#0a0818',navActive:'rgba(167,139,250,.13)',
    headerGrad:'linear-gradient(180deg,#0d0b1a,#0f0d1e)',
    canvasBg:'#0a0818',
  }
}

export default function App() {
  const canvasRef     = useRef(null)
  const wsStopRef     = useRef(null)
  const fileInputRef  = useRef(null)
  const batchInputRef = useRef(null)

  const [file,setFile]                     = useState(null)
  const [colorFillMode,setColorFillMode]   = useState(false)
  const [preview,setPreview]               = useState(null)
  const [detail,setDetail]                 = useState(3)
  const [maxPaths,setMaxPaths]             = useState(900)
  const [penStyle,setPenStyle]             = useState('pencil')
  const [useWS,setUseWS]                   = useState(false)
  const [dragging,setDragging]             = useState(false)
  const [activeTab,setActiveTab]           = useState('Draw')
  const [useHed,setUseHed]                 = useState(false)
  const [removeBg,setRemoveBg]             = useState(false)
  const [coloringBook,setColoringBook]     = useState(false)
  const [crosshatch,setCrosshatch]         = useState(false)
  const [paperTexture,setPaperTexture]     = useState(false)
  const [watercolour,setWatercolour]       = useState(false)
  const [lightMode,setLightMode]           = useState(false)
  const [strokeOpacity,setStrokeOpacity]   = useState(92)
  const [strokeWidth,setStrokeWidth]       = useState(100)
  const [phase,setPhase]                   = useState('idle')
  const [statusMsg,setStatusMsg]           = useState('')
  const [showCanvas,setShowCanvas]         = useState(false)
  const [backendOk,setBackendOk]           = useState(null)
  const [hedReady,setHedReady]             = useState(false)
  const [engineUsed,setEngineUsed]         = useState(null)
  const [strokeCount,setStrokeCount]       = useState(0)
  const [processingMs,setProcessingMs]     = useState(null)
  const [quality,setQuality]               = useState(null)
  const [svgData,setSvgData]               = useState(null)
  const [wcColors,setWcColors]             = useState([])
  const [paperB64,setPaperB64]             = useState(null)
  const [warnings,setWarnings]             = useState([])
  const [autoResult,setAutoResult]         = useState(null)
  const [batchFiles,setBatchFiles]         = useState([])
  const [batchPhase,setBatchPhase]         = useState('idle')
  const [batchProg,setBatchProg]           = useState(0)
  const [authMode,setAuthMode]             = useState('login')
  const [authUser,setAuthUser]             = useState('')
  const [authPw,setAuthPw]                 = useState('')
  const [authErr,setAuthErr]               = useState('')
  const [token,setToken]                   = useState(()=>localStorage.getItem('sketch_token')||'')
  const [currentUser,setCurrentUser]       = useState(()=>localStorage.getItem('sketch_user')||'')
  const [gallery,setGallery]               = useState([])
  const [saveNameVal,setSaveNameVal]       = useState('')
  const [t2sPrompt,setT2sPrompt]           = useState('')
  const [t2sPhase,setT2sPhase]             = useState('idle')
  const [t2sGenB64,setT2sGenB64]           = useState(null)
  const t2sAbortRef  = useRef(null)
  const t2sPromptRef = useRef('')
  const t2sBusy = ['generating','processing','drawing'].includes(t2sPhase)

  const T = makeTheme(lightMode)
  const engineColor = activeTab==='Text'?T.purple:coloringBook?T.pink:useHed?T.blue:T.gold
  const busy = ['connecting','processing','drawing'].includes(phase)
  const canDraw = !!file && !busy && backendOk!==false
  const isDone = phase==='done' || t2sPhase==='done'
  const currentPen = PEN_STYLES.find(p=>p.id===penStyle)||PEN_STYLES[0]

  useEffect(()=>{
    const ping=()=>fetch('/api/health',{signal:AbortSignal.timeout(3000)})
      .then(r=>r.json()).then(d=>{setBackendOk(true);setHedReady(d.hed_ready)}).catch(()=>setBackendOk(false))
    ping(); const t=setInterval(ping,8000); return()=>clearInterval(t)
  },[])

  useEffect(()=>{
    if(activeTab==='Gallery'&&token) getGallery(token).then(d=>setGallery(d.sketches||[])).catch(()=>{})
  },[activeTab,token])

  const pickFile=useCallback(async(f)=>{
    if(!f||!f.type.startsWith('image/')) return
    if(preview) URL.revokeObjectURL(preview)
    setFile(f);setPreview(URL.createObjectURL(f))
    setPhase('idle');setStatusMsg('');setShowCanvas(false)
    setEngineUsed(null);setStrokeCount(0);setProcessingMs(null)
    setQuality(null);setSvgData(null);setWarnings([]);setAutoResult(null);setWcColors([]);setPaperB64(null)
    canvasRef.current?.reset();setActiveTab('Draw')
    try{
      setStatusMsg('Analysing...')
      const r=await analyseImage(f)
      setAutoResult(r);setDetail(r.detail_level);setMaxPaths(r.max_strokes)
      if(r.pen_style) setPenStyle(r.pen_style)
      if(r.use_hed&&hedReady) setUseHed(true)
      if(r.screen_photo?.detected) setWarnings([{type:'screen_photo',confidence:r.screen_photo.confidence,message:'Screen photo — right-click → Save As → upload that file.'}])
      setStatusMsg('')
    }catch(_){setStatusMsg('')}
  },[preview,hedReady])

  const handleT2sPromptChange=useCallback((val)=>{setT2sPrompt(val);t2sPromptRef.current=val},[])
  const onDrop=useCallback((e)=>{e.preventDefault();setDragging(false);pickFile(e.dataTransfer.files[0])},[pickFile])

  const draw=useCallback(async()=>{
    if(!file||busy) return
    wsStopRef.current?.();canvasRef.current?.reset()
    setShowCanvas(true);setEngineUsed(null);setWarnings([]);setSvgData(null);setQuality(null);setWcColors([]);setPaperB64(null)
    const opts={useHed,removeBg,coloringBook,crosshatch,paperTexture,watercolour}
    const t0=Date.now()
    try{
      if(useWS){
        setPhase('connecting');setStatusMsg('Connecting...')
        await new Promise((resolve,reject)=>{
          wsStopRef.current=streamImage(file,detail,maxPaths,{
            onStatus:m=>{setPhase('processing');setStatusMsg(m)},
            onWarning:w=>setWarnings(p=>[...p,w]),
            onMeta:m=>{canvasRef.current?.setup(m.width,m.height);setEngineUsed(m.engine);setStrokeCount(m.total);setProcessingMs(Date.now()-t0);setPhase('drawing');setStatusMsg(`Drawing ${m.total} strokes...`);setTimeout(()=>canvasRef.current?.start(),60)},
            onChunk:paths=>canvasRef.current?.addPaths(paths),
            onDone:msg=>{setPhase('done');setStatusMsg('');if(msg?.svg)setSvgData(msg.svg);if(msg?.quality)setQuality(msg.quality);if(msg?.wc_colors)setWcColors(msg.wc_colors);if(msg?.paper_b64)setPaperB64(msg.paper_b64);resolve()},
            onError:msg=>{setPhase('error');setStatusMsg(msg);reject(new Error(msg))},
          },opts)
        })
      } else {
        setPhase('processing');setStatusMsg(coloringBook?'Colouring-book...':useHed?'HED neural net...':'Detecting edges...')
        const data=await uploadImage(file,detail,maxPaths,pct=>{if(pct===100)setStatusMsg('Tracing paths...')},opts)
        if(data.warnings?.length) setWarnings(data.warnings)
        if(data.svg) setSvgData(data.svg);if(data.quality) setQuality(data.quality)
        if(data.wc_colors) setWcColors(data.wc_colors);if(data.paper_b64) setPaperB64(data.paper_b64)
        setEngineUsed(data.engine);setStrokeCount(data.total);setProcessingMs(Date.now()-t0)
        canvasRef.current?.setup(data.width,data.height);canvasRef.current?.addPaths(data.paths)
        setPhase('drawing');setStatusMsg(`Drawing ${data.total} strokes...`);setTimeout(()=>canvasRef.current?.start(),60)
      }
    }catch(e){setPhase('error');setStatusMsg(e?.message||'Error — is python main.py running?')}
  },[file,busy,useWS,detail,maxPaths,useHed,removeBg,coloringBook,crosshatch,paperTexture,watercolour])

  const dlSVG=useCallback(()=>{if(!svgData)return;const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([svgData],{type:'image/svg+xml'})),download:'sketch.svg'});a.click();URL.revokeObjectURL(a.href)},[svgData])
  const dlPNG=useCallback(()=>{const c=document.querySelector('canvas');if(!c)return;Object.assign(document.createElement('a'),{href:c.toDataURL('image/png'),download:'sketch.png'}).click()},[])
  const dlPDF=useCallback(async()=>{if(!file)return;setStatusMsg('Generating PDF...');try{await exportPDF(file,{detailLevel:detail,maxStrokes:maxPaths,useHed})}catch(_){alert('PDF failed — pip install reportlab')}setStatusMsg('')},[file,detail,maxPaths,useHed])
  const runBatch=useCallback(async()=>{if(!batchFiles.length)return;setBatchPhase('processing');setBatchProg(0);try{await batchProcess(batchFiles,{detailLevel:detail,maxStrokes:maxPaths,useHed,onProgress:p=>setBatchProg(p)});setBatchPhase('done')}catch(_){setBatchPhase('error')}},[batchFiles,detail,maxPaths,useHed])
  const doAuth=useCallback(async()=>{setAuthErr('');try{const res=authMode==='register'?await register(authUser,authPw):await login(authUser,authPw);setToken(res.access_token);setCurrentUser(res.username);localStorage.setItem('sketch_token',res.access_token);localStorage.setItem('sketch_user',res.username)}catch(e){setAuthErr(e.response?.data?.detail||'Auth failed')}},[authMode,authUser,authPw])
  const doLogout=useCallback(()=>{setToken('');setCurrentUser('');setGallery([]);localStorage.removeItem('sketch_token');localStorage.removeItem('sketch_user')},[])
  const doSave=useCallback(async()=>{if(!token||!svgData)return;try{await saveSketch(token,saveNameVal||`Sketch ${new Date().toLocaleDateString()}`,svgData,engineUsed||'canny',strokeCount);setSaveNameVal('');alert('Saved!')}catch(_){alert('Save failed')}},[token,svgData,saveNameVal,engineUsed,strokeCount])
  const doDelete=useCallback(async(id)=>{try{await deleteSketch(token,id);setGallery(p=>p.filter(s=>s.id!==id))}catch(_){}},[token])

  const generateFromText=useCallback(()=>{
    if(!t2sPromptRef.current.trim()||t2sBusy) return
    if(backendOk===false){setT2sPhase('error');setStatusMsg('Backend offline');return}
    t2sAbortRef.current?.();canvasRef.current?.reset()
    setShowCanvas(true);setT2sPhase('generating');setT2sGenB64(null);setSvgData(null);setQuality(null);setStatusMsg('Generating image…')
    t2sAbortRef.current=streamTextToSketch(
      {prompt:t2sPromptRef.current,penStyle,detailLevel:detail,maxStrokes:maxPaths,useHed,coloringBook,crosshatch,generator:'auto'},
      {
        onStatus:m=>setStatusMsg(m),
        onImageReady:(b64)=>{setT2sGenB64(b64);setT2sPhase('processing');setStatusMsg('Extracting sketch paths…')},
        onMeta:m=>{canvasRef.current?.setup(m.width,m.height);setT2sPhase('drawing');setStatusMsg(`Animating ${m.total} strokes…`)},
        onChunk:paths=>canvasRef.current?.addPaths(paths),
        onStartDraw:()=>setTimeout(()=>canvasRef.current?.start(),60),
        onDone:msg=>{setT2sPhase('done');setStatusMsg('');setPhase('done');setEngineUsed(msg.engine||'t2s');setStrokeCount(msg.total||0);if(msg.svg)setSvgData(msg.svg);if(msg.quality)setQuality(msg.quality)},
        onError:msg=>{setT2sPhase('error');setStatusMsg(msg||'Generation failed');setPhase('error');t2sAbortRef.current=null},
      }
    )
  },[t2sBusy,penStyle,detail,maxPaths,useHed,coloringBook,crosshatch,canvasRef,backendOk])

  const cancelT2S=useCallback(()=>{try{t2sAbortRef.current?.()}catch(_){}t2sAbortRef.current=null;setT2sPhase('idle');setPhase('idle');setStatusMsg('');canvasRef.current?.reset();setShowCanvas(false)},[])

  return(
    <>
      <style>{`
        ${FONT_IMPORT}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{color-scheme:dark}
        body{overflow:hidden}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(128,128,128,.15);border-radius:4px}
        input[type=range]{-webkit-appearance:none;height:3px;border-radius:2px;outline:none;cursor:pointer;background:transparent}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.4)}
        input[type=range]::-webkit-slider-runnable-track{height:3px;border-radius:2px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes borderGlow{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 16px 2px rgba(167,139,250,.2)}}
        .nav-btn:hover .nav-icon{transform:scale(1.15)!important}
        .nav-btn:hover{background:rgba(167,139,250,.1)!important}
        .pen-btn:hover{transform:translateY(-2px) scale(1.05)!important;z-index:2}
        .draw-main-btn:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px)}
        .draw-main-btn:active:not(:disabled){transform:translateY(0)}
        .engine-card:hover{border-color:rgba(167,139,250,.4)!important}
        .action-chip:hover{filter:brightness(1.12);transform:translateY(-1px)}
        .feature-row:hover{background:rgba(255,255,255,.025)!important}
        .slider-track{background:linear-gradient(to right,var(--sc) 0%,var(--sc) var(--pct),rgba(255,255,255,.08) var(--pct),rgba(255,255,255,.08) 100%)}
      `}</style>

      <div style={{
        width:'100vw',height:'100vh',display:'flex',flexDirection:'column',
        background:T.app,color:T.text,overflow:'hidden',
        fontFamily:'"Outfit",-apple-system,sans-serif',
      }}>

        {/* ══ TOPBAR ════════════════════════════════════════════════ */}
        <header style={{
          height:58,flexShrink:0,display:'flex',alignItems:'center',
          padding:'0 18px 0 10px',zIndex:30,
          background:T.panel,
          borderBottom:`1px solid ${T.border}`,
          boxShadow:lightMode?'0 1px 8px rgba(0,0,0,.06)':'0 1px 24px rgba(0,0,0,.4)',
        }}>
          {/* Logo + title */}
          <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0,marginRight:20}}>
            <div style={{
              width:38,height:38,borderRadius:11,flexShrink:0,
              background:'linear-gradient(135deg,#f59e0b 0%,#ef4444 50%,#8b5cf6 100%)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,
              boxShadow:'0 4px 16px rgba(239,68,68,.4)',
            }}>✏️</div>
            <div>
              <div style={{fontSize:17,fontWeight:800,letterSpacing:'-.04em',lineHeight:1,
                background:'linear-gradient(135deg,#f5c542,#f97316 40%,#a78bfa)',
                WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
              }}>AI Sketch Studio</div>
              <div style={{fontSize:9,color:T.sub,letterSpacing:'.14em',fontFamily:'"JetBrains Mono",monospace',marginTop:2}}>NEURAL · EDGE DETECTION · v8</div>
            </div>
          </div>

          {/* ── CENTER: Big project title ── */}
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:16}}>
            {/* Engine selector — horizontal pill row */}
            <div style={{
              display:'flex',alignItems:'center',gap:2,
              background:T.dim,borderRadius:12,padding:3,
              border:`1px solid ${T.border}`,
            }}>
              {[
                {id:'canny',label:'Canny', icon:'⚡',col:T.gold,  active:!useHed&&!coloringBook,set:()=>{setUseHed(false);setColoringBook(false)}},
                {id:'hed',  label:'HED',   icon:'🧠',col:T.blue,  active:useHed&&!coloringBook,  set:()=>{setUseHed(true);setColoringBook(false)}},
                {id:'book', label:'Book',  icon:'📖',col:T.pink,  active:coloringBook,            set:()=>{setUseHed(false);setColoringBook(true)}},
              ].map(e=>(
                <button key={e.id} onClick={e.set} style={{
                  display:'flex',alignItems:'center',gap:6,
                  padding:'6px 14px',borderRadius:9,border:'none',cursor:'pointer',
                  background:e.active?e.col+'22':'transparent',
                  color:e.active?e.col:T.sub,
                  fontSize:13,fontWeight:e.active?700:500,fontFamily:'inherit',
                  transition:'all .15s',
                  boxShadow:e.active?`0 2px 12px ${e.col}30`:'none',
                }}>
                  <span>{e.icon}</span>
                  <span>{e.label}</span>
                  {e.id==='hed'&&!hedReady&&<span style={{width:5,height:5,borderRadius:'50%',background:T.red,flexShrink:0}}/>}
                  {e.id==='hed'&&hedReady&&<span style={{width:5,height:5,borderRadius:'50%',background:T.green,flexShrink:0}}/>}
                </button>
              ))}
            </div>

            {/* Status pill */}
            {(busy||t2sBusy||statusMsg)&&(
              <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12,color:phase==='error'?T.red:T.sub,background:T.dim,padding:'5px 12px',borderRadius:20,border:`1px solid ${T.border}`}}>
                {(busy||t2sBusy)&&<Spinner color={engineColor}/>}
                <span style={{maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{statusMsg}</span>
              </div>
            )}
            {engineUsed&&!busy&&(
              <div style={{display:'flex',alignItems:'center',gap:7,padding:'5px 13px',borderRadius:20,background:engineColor+'14',border:`1px solid ${engineColor}30`,fontSize:11,color:engineColor,fontFamily:'"JetBrains Mono",monospace',animation:'fadeUp .3s ease'}}>
                <PulseDot color={engineColor} glow/>
                <span style={{fontWeight:600}}>{engineUsed.toUpperCase()}</span>
                {strokeCount>0&&<span style={{color:T.sub,fontSize:10}}>· {strokeCount} strokes</span>}
                {processingMs>0&&<span style={{color:T.sub,fontSize:10}}>· {(processingMs/1000).toFixed(1)}s</span>}
                {quality?.grade&&<span style={{fontWeight:700,color:T.gold}}>· {quality.grade}</span>}
              </div>
            )}
          </div>

          {/* Right controls */}
          <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            {isDone&&(
              <div style={{display:'flex',gap:4,animation:'fadeUp .3s ease'}}>
                {svgData&&<Chip onClick={dlSVG} col={T.green}>⬇ SVG</Chip>}
                <Chip onClick={dlPNG} col={T.gold}>⬇ PNG</Chip>
                <Chip onClick={dlPDF} col={T.orange}>⬇ PDF</Chip>
                {token&&svgData&&<Chip onClick={doSave} col={T.purple}>💾 Save</Chip>}
              </div>
            )}
            <div style={{width:1,height:22,background:T.border,margin:'0 2px'}}/>
            {/* Backend */}
            <div style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:8,background:T.dim,border:`1px solid ${T.border}`}}>
              <PulseDot color={backendOk===true?T.green:backendOk===false?T.red:T.sub} glow={backendOk===true}/>
              <span style={{fontSize:11,color:backendOk===true?T.green:backendOk===false?T.red:T.sub,fontFamily:'"JetBrains Mono",monospace',fontWeight:600}}>
                {backendOk===true?'Online':backendOk===false?'Offline':'…'}
              </span>
            </div>
            {/* Transfer mode */}
            <button onClick={()=>setUseWS(v=>!v)} title={useWS?'WebSocket (streaming)':'REST (batch)'} style={{
              width:32,height:32,borderRadius:8,border:`1px solid ${useWS?T.purpleBdr:T.border}`,
              background:useWS?T.purpleBg:T.dim,color:useWS?T.purple:T.sub,
              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,
              transition:'all .2s',
            }}>{useWS?'⚡':'🔗'}</button>
            {/* Theme */}
            <button onClick={()=>setLightMode(v=>!v)} style={{
              width:32,height:32,borderRadius:8,border:`1px solid ${T.border}`,
              background:T.dim,color:lightMode?'#92400e':'#a78bfa',
              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,
            }}>{lightMode?'☀️':'🌙'}</button>
            {/* Auth */}
            {currentUser
              ?<div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{fontSize:12,color:T.purple,fontWeight:700,padding:'4px 10px',background:T.purpleBg,borderRadius:8,border:`1px solid ${T.purpleBdr}`}}>👤 {currentUser}</div>
                <button onClick={doLogout} style={{fontSize:11,color:T.sub,background:'transparent',border:`1px solid ${T.border}`,borderRadius:7,padding:'4px 9px',cursor:'pointer',fontFamily:'inherit'}}>Out</button>
              </div>
              :<button onClick={()=>setActiveTab('Gallery')} style={{fontSize:12,color:T.purple,background:T.purpleBg,border:`1px solid ${T.purpleBdr}`,borderRadius:8,padding:'5px 12px',cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>Sign In</button>
            }
          </div>
        </header>

        {/* ══ BODY — 3 columns ═══════════════════════════════════════ */}
        <div style={{flex:1,display:'flex',overflow:'hidden'}}>

          {/* ── COL 1: Vertical nav rail ──────────────────────────── */}
          <nav style={{
            width:64,flexShrink:0,background:T.rail,borderRight:`1px solid ${T.border}`,
            display:'flex',flexDirection:'column',alignItems:'center',
            paddingTop:10,paddingBottom:10,gap:4,zIndex:10,
          }}>
            {NAV_ITEMS.map(t=>{
              const active=activeTab===t.id
              return(
                <button key={t.id} className="nav-btn" onClick={()=>setActiveTab(t.id)}
                  style={{
                    width:46,height:46,borderRadius:12,border:'none',cursor:'pointer',
                    background:active?T.navActive:'transparent',
                    color:active?T.accent:T.sub,
                    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                    gap:2,transition:'all .15s',fontFamily:'inherit',
                    boxShadow:active?`inset 0 0 0 1px ${T.accent}30`:'none',
                  }}>
                  <span className="nav-icon" style={{fontSize:17,transition:'transform .2s'}}>{t.icon}</span>
                  <span style={{fontSize:8.5,fontWeight:active?700:500,letterSpacing:'.03em',color:active?T.accent:T.sub}}>{t.label}</span>
                </button>
              )
            })}
            <div style={{flex:1}}/>
            {/* Version badge */}
            <div style={{fontSize:8,color:T.sub,fontFamily:'"JetBrains Mono",monospace',opacity:.4,marginBottom:4,letterSpacing:'.05em'}}>v8</div>
          </nav>

          {/* ── COL 2: Settings panel ──────────────────────────────── */}
          <aside style={{
            width:274,flexShrink:0,background:T.panel,borderRight:`1px solid ${T.border}`,
            display:'flex',flexDirection:'column',overflow:'hidden',position:'relative',
          }}>
            {activeTab==='Draw'&&(
              <div style={{flex:1,overflowY:'auto',padding:'12px 10px 110px'}}>

                {/* Warnings / auto-detect */}
                {warnings.filter(w=>w.type==='screen_photo').map((w,i)=>(
                  <div key={i} style={{marginBottom:10,padding:'9px 11px',borderRadius:9,background:T.redBg,border:`1px solid ${T.redBdr}`,fontSize:11,lineHeight:1.7,color:T.red}}>
                    ⚠️ Screen Photo ({Math.round(w.confidence*100)}%) — {w.message}
                  </div>
                ))}
                {autoResult&&!warnings.find(w=>w.type==='screen_photo')&&(
                  <div style={{marginBottom:10,padding:'7px 11px',borderRadius:9,background:T.greenBg,border:`1px solid ${T.greenBdr}`,fontSize:11,animation:'fadeUp .3s ease',color:T.green,display:'flex',alignItems:'center',gap:6}}>
                    <span>✓</span><span style={{fontWeight:600}}>{autoResult.label}</span><span style={{opacity:.6}}>auto-detected</span>
                  </div>
                )}

                {/* Upload zone */}
                <SLabel T={T} icon="📁">Image Upload</SLabel>
                <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
                  onClick={()=>!preview&&fileInputRef.current?.click()}
                  style={{
                    border:`2px dashed ${dragging?T.gold:T.border}`,borderRadius:12,overflow:'hidden',
                    cursor:preview?'default':'pointer',background:dragging?T.goldBg:T.dim,
                    minHeight:preview?0:88,transition:'all .2s',marginBottom:8,
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                  {preview?(
                    <div style={{position:'relative',width:'100%'}}>
                      <img src={preview} alt="preview" style={{width:'100%',maxHeight:140,objectFit:'contain',display:'block'}}/>
                      <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,.85))',padding:'18px 10px 8px',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                        <span style={{fontSize:9.5,color:'rgba(255,255,255,.45)',fontFamily:'"JetBrains Mono",monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:150}}>{file?.name}</span>
                        <button onClick={e=>{e.stopPropagation();setFile(null);setPreview(null);setShowCanvas(false);setPhase('idle');setStatusMsg('');setEngineUsed(null);setWarnings([]);setAutoResult(null);setSvgData(null);canvasRef.current?.reset()}}
                          style={{background:'rgba(255,255,255,.18)',color:'#fff',border:'none',borderRadius:5,padding:'2px 8px',fontSize:11,cursor:'pointer'}}>✕</button>
                      </div>
                    </div>
                  ):(
                    <div style={{textAlign:'center',padding:18}}>
                      <div style={{fontSize:26,opacity:.12,marginBottom:5}}>🖼️</div>
                      <div style={{fontSize:12,color:T.sub,fontWeight:600,marginBottom:3}}>Drop image here</div>
                      <div style={{fontSize:10,color:T.sub,opacity:.45}}>JPG · PNG · WEBP · AVIF</div>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>pickFile(e.target.files[0])}/>
                {preview&&<button onClick={()=>fileInputRef.current?.click()} style={{width:'100%',padding:'6px',borderRadius:8,border:`1px solid ${T.border}`,background:T.dim,color:T.sub,fontSize:11,cursor:'pointer',fontFamily:'inherit',marginBottom:10}}>⇄ Change Image</button>}

                {/* ── Parameters — horizontal 2-col grid ── */}
                <SLabel T={T} icon="⚙️">Parameters</SLabel>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:12}}>
                  {[
                    {label:'Detail',val:detail,min:1,max:5,step:1,display:DETAIL_LABELS[detail],col:engineColor,set:setDetail},
                    {label:'Strokes',val:maxPaths,min:100,max:2500,step:100,display:maxPaths>=1000?`${(maxPaths/1000).toFixed(1)}k`:maxPaths.toString(),col:T.gold,set:setMaxPaths},
                    {label:'Opacity',val:strokeOpacity,min:10,max:100,step:5,display:`${strokeOpacity}%`,col:T.purple,set:setStrokeOpacity},
                    {label:'Width',val:strokeWidth,min:50,max:300,step:10,display:`${strokeWidth}%`,col:T.cyan,set:setStrokeWidth},
                  ].map(p=>(
                    <div key={p.label} style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,padding:'9px 10px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                        <span style={{fontSize:10.5,color:T.sub,fontWeight:600}}>{p.label}</span>
                        <span style={{fontSize:9.5,color:p.col,fontFamily:'"JetBrains Mono",monospace',background:`${p.col}18`,border:`1px solid ${p.col}30`,borderRadius:5,padding:'1px 6px',fontWeight:700}}>{p.display}</span>
                      </div>
                      <input type="range" min={p.min} max={p.max} step={p.step} value={p.val}
                        onChange={e=>p.set(Number(e.target.value))}
                        style={{width:'100%',accentColor:p.col}}/>
                    </div>
                  ))}
                </div>

                {/* ── AI Features ── */}
                <SLabel T={T} icon="🤖">AI Features</SLabel>
                <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:11,overflow:'hidden',marginBottom:12}}>
                  {[
                    {val:removeBg,set:setRemoveBg,col:T.green,icon:'✂️',lbl:'Remove BG',sub:'U2-Net AI'},
                    {val:crosshatch,set:setCrosshatch,col:T.orange,icon:'⊞',lbl:'Crosshatch',sub:'Shading'},
                    {val:paperTexture,set:setPaperTexture,col:T.orange,icon:'📄',lbl:'Paper Grain',sub:'Texture'},
                    {val:watercolour,set:setWatercolour,col:T.cyan,icon:'🎨',lbl:'Watercolour',sub:'Color fill'},
                    {val:colorFillMode,set:setColorFillMode,col:T.gold,icon:'🖌️',lbl:'Color Overlay',sub:'Region map'},
                  ].map((f,i,arr)=>(
                    <div key={f.lbl} className="feature-row" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 11px',borderBottom:i<arr.length-1?`1px solid ${T.border}`:'none',transition:'background .15s'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:26,height:26,borderRadius:7,flexShrink:0,background:f.val?f.col+'18':T.dim,border:`1px solid ${f.val?f.col+'35':T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,transition:'all .2s'}}>{f.icon}</div>
                        <div>
                          <div style={{fontSize:11.5,color:f.val?f.col:T.text,fontWeight:f.val?600:400,lineHeight:1.2}}>{f.lbl}</div>
                          <div style={{fontSize:9.5,color:T.sub,marginTop:1}}>{f.sub}</div>
                        </div>
                      </div>
                      <Toggle value={f.val} onChange={f.set} color={f.col}/>
                    </div>
                  ))}
                </div>

                {/* Quality score */}
                {quality&&(
                  <>
                    <SLabel T={T} icon="📊">Quality Score</SLabel>
                    <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:11,padding:'10px 12px',marginBottom:12}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:7}}>
                        <div style={{flex:1,height:5,borderRadius:3,background:T.dim,overflow:'hidden'}}>
                          <div style={{width:`${quality.score}%`,height:'100%',borderRadius:3,background:quality.score>70?T.green:quality.score>40?T.gold:T.red,transition:'width .8s ease'}}/>
                        </div>
                        <span style={{fontSize:16,fontWeight:900,fontFamily:'"JetBrains Mono",monospace',color:quality.score>70?T.green:quality.score>40?T.gold:T.red}}>{quality.score}</span>
                        <span style={{fontSize:14,color:T.gold,fontWeight:800}}>{quality.grade}</span>
                      </div>
                      {quality.issues?.map((iss,i)=><div key={i} style={{fontSize:10,color:T.orange,lineHeight:1.8,display:'flex',alignItems:'center',gap:5}}><span>⚠</span>{iss}</div>)}
                    </div>
                  </>
                )}

                {/* Save to gallery */}
                {phase==='done'&&token&&svgData&&(
                  <>
                    <SLabel T={T} icon="💾">Save to Gallery</SLabel>
                    <input value={saveNameVal} onChange={e=>setSaveNameVal(e.target.value)} placeholder="Sketch name..." style={{width:'100%',background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:8,padding:'7px 10px',color:T.text,fontSize:11,fontFamily:'inherit',outline:'none',marginBottom:6}}/>
                    <button onClick={doSave} style={{width:'100%',padding:'7px',borderRadius:8,border:`1px solid ${T.purpleBdr}`,background:T.purpleBg,color:T.purple,fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>💾 Save</button>
                  </>
                )}
              </div>
            )}

            {/* Other tab content in left panel */}
            {activeTab==='Video'&&<VideoTab canvasRef={canvasRef} onAnimationStart={()=>setShowCanvas(true)} onAnimationReset={()=>setShowCanvas(false)} onSketchReady={()=>{}}/>}
            {activeTab==='Webcam'&&<WebcamTab canvasRef={canvasRef} onAnimationStart={()=>setShowCanvas(true)} onAnimationReset={()=>setShowCanvas(false)}/>}
            {activeTab==='Text'&&(
              <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,overflow:'hidden'}}>
                <TextToSketchTab canvasRef={canvasRef} onAnimationStart={()=>setShowCanvas(true)} onAnimationReset={()=>setShowCanvas(false)}
                  T={T} externalPrompt={t2sPrompt} onPromptChange={handleT2sPromptChange}
                  phase={t2sPhase} genImageB64={t2sGenB64} onGenerate={generateFromText} onCancel={cancelT2S} busy={t2sBusy}/>
              </div>
            )}
            {activeTab==='Batch'&&(
              <div style={{flex:1,overflowY:'auto',padding:'14px',minHeight:0}}>
                <SLabel T={T} icon="📦">Batch Processing</SLabel>
                <p style={{fontSize:11,color:T.sub,lineHeight:1.8,marginBottom:10}}>Upload multiple images → ZIP of SVGs.</p>
                <input ref={batchInputRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>setBatchFiles(Array.from(e.target.files))}/>
                <button onClick={()=>batchInputRef.current?.click()} style={{width:'100%',padding:'7px',borderRadius:9,border:`1px solid ${T.border}`,background:T.cardBg,color:T.sub,fontSize:11,cursor:'pointer',fontFamily:'inherit',marginBottom:7}}>📂 Select ({batchFiles.length})</button>
                {batchPhase==='processing'&&<div style={{fontSize:11,color:T.sub,marginBottom:8}}>Processing… {batchProg}%</div>}
                {batchPhase==='done'&&<div style={{marginBottom:8,padding:'7px 10px',borderRadius:8,background:T.greenBg,border:`1px solid ${T.greenBdr}`,fontSize:11,color:T.green}}>✓ ZIP downloaded</div>}
                <button onClick={runBatch} disabled={!batchFiles.length||batchPhase==='processing'} style={{width:'100%',padding:10,borderRadius:10,border:'none',background:batchFiles.length?'linear-gradient(135deg,#f5c542,#e05510)':T.dim,color:batchFiles.length?'#08060a':T.sub,fontSize:12,fontWeight:700,cursor:batchFiles.length?'pointer':'not-allowed',fontFamily:'inherit'}}>
                  {batchPhase==='processing'?'Processing…':`📦 Process ${batchFiles.length}`}
                </button>
              </div>
            )}
            {activeTab==='Gallery'&&(
              <div style={{flex:1,overflowY:'auto',padding:'14px',minHeight:0}}>
                {!currentUser?(
                  <>
                    <SLabel T={T} icon="🔐">{authMode==='login'?'Sign In':'Register'}</SLabel>
                    <div style={{display:'flex',flexDirection:'column',gap:7}}>
                      <input value={authUser} onChange={e=>setAuthUser(e.target.value)} placeholder="Username" style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:8,padding:'7px 10px',color:T.text,fontSize:11,fontFamily:'inherit',outline:'none',width:'100%'}}/>
                      <input value={authPw} onChange={e=>setAuthPw(e.target.value)} placeholder="Password" type="password" onKeyDown={e=>e.key==='Enter'&&doAuth()} style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:8,padding:'7px 10px',color:T.text,fontSize:11,fontFamily:'inherit',outline:'none',width:'100%'}}/>
                      {authErr&&<div style={{fontSize:11,color:T.red}}>{authErr}</div>}
                      <button onClick={doAuth} style={{padding:10,borderRadius:9,border:'none',background:'linear-gradient(135deg,#a78bfa,#7c3aed)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Sign In</button>
                      <button onClick={()=>setAuthMode(m=>m==='login'?'register':'login')} style={{background:'transparent',border:'none',color:T.sub,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{authMode==='login'?'Need account?':'← Sign in'}</button>
                    </div>
                  </>
                ):(
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <div style={{fontSize:13,color:T.purple,fontWeight:700}}>👤 {currentUser}</div>
                      <span style={{fontSize:10,color:T.sub}}>{gallery.length} sketches</span>
                    </div>
                    {gallery.map(s=>(
                      <div key={s.id} style={{marginBottom:8,padding:'10px 11px',borderRadius:9,background:T.cardBg,border:`1px solid ${T.border}`}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                          <div><div style={{fontSize:12,fontWeight:600,marginBottom:3}}>{s.name}</div><div style={{fontSize:10,color:T.sub,fontFamily:'"JetBrains Mono",monospace'}}>{s.engine} · {s.paths}</div></div>
                          <button onClick={()=>doDelete(s.id)} style={{background:T.redBg,border:`1px solid ${T.redBdr}`,color:T.red,borderRadius:6,padding:'3px 8px',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>Del</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
            {activeTab==='Export'&&(
              <div style={{flex:1,overflowY:'auto',padding:'14px',minHeight:0}}>
                <SLabel T={T} icon="📤">Export Formats</SLabel>
                {[
                  {fmt:'SVG Vector',icon:'📐',col:T.green,desc:'Figma · Illustrator · Laser cut',action:dlSVG,disabled:!svgData},
                  {fmt:'PNG Image',icon:'🖼️',col:T.gold,desc:'High-res raster from canvas',action:dlPNG,disabled:!showCanvas},
                  {fmt:'PDF Document',icon:'📄',col:T.orange,desc:'Print-ready · needs reportlab',action:dlPDF,disabled:!file},
                ].map(e=>(
                  <div key={e.fmt} style={{marginBottom:8,padding:'11px',borderRadius:10,background:T.cardBg,border:`1px solid ${T.border}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                      <div style={{fontSize:12,fontWeight:700,color:e.col}}>{e.icon} {e.fmt}</div>
                      <button onClick={e.action} disabled={e.disabled} style={{padding:'4px 11px',borderRadius:7,border:`1px solid ${e.disabled?T.border:e.col+'50'}`,background:e.disabled?'transparent':e.col+'15',color:e.disabled?T.sub:e.col,fontSize:11,cursor:e.disabled?'not-allowed':'pointer',fontWeight:600,fontFamily:'inherit'}}>Download</button>
                    </div>
                    <div style={{fontSize:10,color:T.sub}}>{e.desc}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Generate button (sticky bottom) ── */}
            {activeTab==='Draw'&&(
              <div style={{
                position:'absolute',bottom:0,left:0,right:0,
                padding:'11px 10px',background:T.panel,
                borderTop:`1px solid ${T.border}`,
                boxShadow:lightMode?'0 -4px 16px rgba(0,0,0,.06)':'0 -4px 24px rgba(0,0,0,.4)',
                zIndex:5,
              }}>
                {backendOk===false&&(
                  <div style={{marginBottom:7,padding:'7px 10px',borderRadius:8,background:T.redBg,border:`1px solid ${T.redBdr}`,fontSize:10,color:T.red,fontFamily:'"JetBrains Mono",monospace',lineHeight:1.9}}>
                    ⚠ python main.py
                  </div>
                )}
                <button onClick={draw} disabled={!canDraw} className="draw-main-btn"
                  style={{
                    width:'100%',padding:'13px',borderRadius:13,border:'none',
                    background:canDraw
                      ?coloringBook?`linear-gradient(135deg,${T.pink},#be185d)`
                        :useHed?`linear-gradient(135deg,${T.blue},#1d4ed8)`
                        :'linear-gradient(135deg,#f5c542 0%,#f97316 50%,#ef4444 100%)'
                      :T.dim,
                    color:canDraw?(coloringBook||useHed?'#fff':'#07060f'):T.sub,
                    fontSize:14,fontWeight:800,cursor:canDraw?'pointer':'not-allowed',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:9,
                    boxShadow:canDraw?coloringBook?`0 6px 22px ${T.pink}40`:useHed?`0 6px 22px ${T.blue}40`:'0 6px 28px rgba(245,197,66,.4)':'none',
                    letterSpacing:'-.01em',fontFamily:'inherit',transition:'all .25s',
                  }}>
                  {busy?<><Spinner color={canDraw?'#fff':T.sub}/> Processing…</>
                    :coloringBook?'📖 Colouring Book'
                    :useHed?'🧠 Neural Sketch'
                    :'✏️ Generate Sketch'}
                </button>
                <div style={{textAlign:'center',marginTop:5,fontSize:10,color:T.sub,fontFamily:'"JetBrains Mono",monospace',letterSpacing:'.03em'}}>
                  {coloringBook?'thick outlines · print-ready':useHed?`HED · ${hedReady?'✓ ready':'✗ model missing'}`:`Canny · ${DETAIL_LABELS[detail]}`}
                </div>
              </div>
            )}
          </aside>

          {/* ── COL 3: Canvas ──────────────────────────────────────── */}
          <main style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:T.canvasBg,position:'relative'}}>
            {/* Top glow line */}
            <div style={{height:2,flexShrink:0,background:`linear-gradient(90deg,transparent 0%,${engineColor}60 20%,${engineColor} 50%,${engineColor}60 80%,transparent 100%)`,transition:'background .5s'}}/>

            {/* Empty states */}
            {!showCanvas&&activeTab==='Draw'&&<EmptyState backendOk={backendOk} useHed={useHed} coloringBook={coloringBook} T={T}/>}
            {!showCanvas&&activeTab==='Text'&&(
              <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
                <div style={{textAlign:'center',maxWidth:380}}>
                  <div style={{fontSize:52,marginBottom:16,filter:'drop-shadow(0 0 20px rgba(167,139,250,.4))'}}>✨</div>
                  <div style={{fontSize:22,fontWeight:800,color:T.text,opacity:.2,marginBottom:8}}>Text to Sketch</div>
                  <p style={{fontSize:12,color:T.sub,lineHeight:1.9,opacity:.35}}>Describe anything → watch it animate as a sketch</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginTop:16,opacity:.4}}>
                    {['a cat on a desk','lighthouse at sunset','steaming coffee','dragon on mountain'].map(ex=>(
                      <div key={ex} onClick={()=>setT2sPrompt(ex)} style={{padding:'8px 10px',borderRadius:9,background:`${T.purple}08`,border:`1px solid ${T.purple}15`,fontSize:11,color:T.purple,cursor:'pointer',transition:'all .15s'}}>{ex}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {(activeTab==='Video'||activeTab==='Webcam')&&!showCanvas&&(
              <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14}}>
                <div style={{fontSize:52,opacity:.15}}>{activeTab==='Video'?'🎬':'📷'}</div>
                <div style={{fontSize:16,fontWeight:700,color:T.text,opacity:.18}}>{activeTab==='Video'?'Video to Sketch':'Live Webcam'}</div>
              </div>
            )}

            {/* Canvas area */}
            <div style={{
              flex:1,overflow:'hidden',
              display:(showCanvas||((activeTab==='Video'||activeTab==='Webcam')&&showCanvas)||(activeTab==='Text'&&showCanvas))?'flex':'none',
              alignItems:'center',justifyContent:'center',padding:24,position:'relative',
              background:T.canvasBg,
            }}>
              {activeTab==='Text'&&t2sGenB64&&t2sPhase!=='idle'&&(
                <div style={{position:'absolute',top:14,right:14,zIndex:5,animation:'fadeUp .3s ease'}}>
                  <div style={{fontSize:8.5,color:T.sub,marginBottom:3,letterSpacing:'.12em',textTransform:'uppercase',fontFamily:'"JetBrains Mono",monospace'}}>Generated</div>
                  <img src={`data:image/jpeg;base64,${t2sGenB64}`} alt="Generated" style={{width:96,borderRadius:8,border:`1px solid ${T.border}`,display:'block',boxShadow:'0 4px 16px rgba(0,0,0,.5)'}}/>
                </div>
              )}
              <DrawingCanvas
                ref={canvasRef}
                penStyle={penStyle}
                strokeOpacity={strokeOpacity/100}
                strokeWidthMultiplier={strokeWidth/100}
                colorFillImage={colorFillMode?(activeTab==='Text'&&t2sGenB64?`data:image/jpeg;base64,${t2sGenB64}`:file):null}
                fillAfterDone={colorFillMode&&(activeTab==='Text'?!!t2sGenB64:!!file)}
                onComplete={()=>{setPhase('done');if(activeTab==='Text')setT2sPhase('done')}}
              />
            </div>
          </main>

          {/* ── COL 4: Right panel — Drawing Style ─────────────────── */}
          <aside style={{
            width:268,flexShrink:0,background:T.panel2,borderLeft:`1px solid ${T.border}`,
            display:'flex',flexDirection:'column',overflow:'hidden',
          }}>

            {/* Active pen preview */}
            <div style={{padding:'14px 12px 10px',borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{fontSize:10,color:T.sub,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>Drawing Style</div>
              <div style={{
                padding:'11px 13px',borderRadius:12,
                background:`linear-gradient(135deg,${currentPen.color}18,${currentPen.color}06)`,
                border:`1px solid ${currentPen.color}35`,
              }}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <div style={{
                    width:40,height:40,borderRadius:10,
                    background:`${currentPen.color}20`,border:`1px solid ${currentPen.color}35`,
                    display:'flex',alignItems:'center',justifyContent:'center',color:currentPen.color,
                  }}>
                    {currentPen.icon(currentPen.color,true)}
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:currentPen.color}}>{currentPen.label}</div>
                    <div style={{fontSize:10,color:T.sub,marginTop:1}}>{currentPen.desc}</div>
                  </div>
                </div>
                {/* Style preview SVG */}
                <StylePreviewSVG id={currentPen.id} color={currentPen.color}/>
              </div>
            </div>

            {/* Pen style icon grid — 3 per row, compact icons */}
            <div style={{flex:1,overflowY:'auto',padding:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:14}}>
                {PEN_STYLES.map(s=>{
                  const on=penStyle===s.id
                  return(
                    <button key={s.id} className="pen-btn" onClick={()=>setPenStyle(s.id)}
                      style={{
                        padding:'9px 4px 7px',borderRadius:10,
                        border:`1.5px solid ${on?s.color:T.border}`,
                        background:on?s.color+'16':T.cardBg,
                        color:on?s.color:T.sub,cursor:'pointer',
                        fontFamily:'inherit',display:'flex',flexDirection:'column',
                        alignItems:'center',gap:4,transition:'all .2s',
                        boxShadow:on?`0 0 14px ${s.color}28`:'none',
                      }}>
                      <div style={{
                        width:36,height:36,borderRadius:9,
                        background:on?`${s.color}18`:T.dim,
                        border:`1px solid ${on?s.color+'30':T.border}`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        color:on?s.color:T.sub,transition:'all .2s',
                      }}>
                        {s.icon(s.color,on)}
                      </div>
                      <span style={{fontSize:10,fontWeight:on?700:500,lineHeight:1.2,letterSpacing:'-.01em'}}>{s.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* What this style does */}
              <div style={{padding:'10px 12px',borderRadius:10,background:T.dim,border:`1px solid ${T.border}`,marginBottom:12}}>
                <div style={{fontSize:9.5,color:T.sub,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8}}>Effect Description</div>
                {[
                  {id:'pencil',   pts:['Grey HB lines','Slight hand wobble','Hairline hatching','Soft grain texture']},
                  {id:'charcoal', pts:['Thick dark strokes','Gaussian blur edge','Multi-pass layering','Smudge dot effect']},
                  {id:'ink',      pts:['Perfect black lines','Zero jitter — precise','Crisp sharp corners','Full opacity marks']},
                  {id:'brush',    pts:['Wide tapered stroke','Wet edge bleeding','Pressure variation','2-pass layering']},
                  {id:'marker',   pts:['Square cap — flat','Opaque solid fill','Bold wide strokes','No texture']},
                  {id:'neon',     pts:['Cyan glow lines','14px canvas shadow','White core line','Electric feel']},
                ].find(x=>x.id===penStyle)?.pts.map((pt,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:7,padding:'3px 0'}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:currentPen.color,flexShrink:0,opacity:.7}}/>
                    <span style={{fontSize:10.5,color:T.sub}}>{pt}</span>
                  </div>
                ))}
              </div>

              {/* Edge engine — compact cards */}
              <div style={{padding:'10px 12px',borderRadius:10,background:T.dim,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:9.5,color:T.sub,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8}}>Edge Engine</div>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {[
                    {id:'canny',icon:'⚡',label:'Canny Edge',desc:'Fast multi-pass detection. Best for line art, illustrations, anime.',col:T.gold,active:!useHed&&!coloringBook,set:()=>{setUseHed(false);setColoringBook(false)}},
                    {id:'hed',  icon:'🧠',label:'HED Neural', desc:'Holistic neural net. Best for portraits, faces, real photos.',col:T.blue,active:useHed&&!coloringBook,set:()=>{setUseHed(true);setColoringBook(false)},badge:hedReady?'ready':'missing'},
                    {id:'book', icon:'📖',label:'Coloring Book',desc:'Thick closed outlines. Perfect for printing and coloring.',col:T.pink,active:coloringBook,set:()=>{setUseHed(false);setColoringBook(true)}},
                  ].map(e=>(
                    <div key={e.id} className="engine-card" onClick={e.set}
                      style={{
                        padding:'8px 10px',borderRadius:9,cursor:'pointer',
                        background:e.active?e.col+'14':T.cardBg,
                        border:`1.5px solid ${e.active?e.col+'45':T.border}`,
                        transition:'all .15s',
                        boxShadow:e.active?`0 2px 12px ${e.col}20`:'none',
                      }}>
                      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                        <span style={{fontSize:14}}>{e.icon}</span>
                        <span style={{fontSize:11.5,fontWeight:e.active?700:500,color:e.active?e.col:T.text,flex:1}}>{e.label}</span>
                        {e.badge&&(
                          <span style={{fontSize:8.5,padding:'2px 6px',borderRadius:4,background:e.badge==='ready'?T.greenBg:T.redBg,color:e.badge==='ready'?T.green:T.red,fontFamily:'"JetBrains Mono",monospace',fontWeight:600}}>
                            {e.badge}
                          </span>
                        )}
                        {e.active&&<div style={{width:6,height:6,borderRadius:'50%',background:e.col,boxShadow:`0 0 6px ${e.col}`,animation:'pulse 2s infinite'}}/>}
                      </div>
                      <div style={{fontSize:10,color:T.sub,lineHeight:1.6}}>{e.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

/* ─── Style preview SVG ─────────────────────────────────── */
function StylePreviewSVG({id,color}){
  const bg=id==='neon'?'#060412':'transparent'
  return(
    <svg width="100%" height={28} viewBox="0 0 220 28" style={{borderRadius:6,background:bg}}>
      <defs>
        <filter id="blur1"><feGaussianBlur stdDeviation="1.5"/></filter>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {id==='pencil'&&<>
        <line x1="12" y1="9" x2="208" y2="9" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" opacity=".8"/>
        <line x1="12" y1="16" x2="195" y2="16" stroke="#9ca3af" strokeWidth="1" strokeLinecap="round" opacity=".6"/>
        <line x1="12" y1="23" x2="178" y2="23" stroke="#9ca3af" strokeWidth=".8" strokeLinecap="round" opacity=".4"/>
        <line x1="40" y1="5" x2="55" y2="24" stroke="#9ca3af" strokeWidth=".6" opacity=".3"/>
        <line x1="50" y1="5" x2="65" y2="24" stroke="#9ca3af" strokeWidth=".6" opacity=".3"/>
      </>}
      {id==='charcoal'&&<>
        <line x1="12" y1="14" x2="208" y2="14" stroke="#374151" strokeWidth="7" strokeLinecap="round" filter="url(#blur1)" opacity=".5"/>
        <line x1="12" y1="14" x2="208" y2="14" stroke="#4b5563" strokeWidth="4" strokeLinecap="round" opacity=".6"/>
        <line x1="12" y1="14" x2="208" y2="14" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" opacity=".7"/>
      </>}
      {id==='ink'&&<>
        <line x1="12" y1="8" x2="208" y2="8" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="12" y1="16" x2="208" y2="16" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="12" y1="24" x2="208" y2="24" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
      </>}
      {id==='brush'&&<>
        <path d="M12,24 Q80,4 140,18 Q190,8 208,14" stroke="#0ea5e9" strokeWidth="8" fill="none" strokeLinecap="round" filter="url(#blur1)" opacity=".35"/>
        <path d="M12,24 Q80,4 140,18 Q190,8 208,14" stroke="#0ea5e9" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".8"/>
      </>}
      {id==='marker'&&<>
        <line x1="12" y1="9" x2="208" y2="9" stroke="#1f2937" strokeWidth="9" strokeLinecap="square" opacity=".8"/>
        <line x1="12" y1="22" x2="208" y2="22" stroke="#374151" strokeWidth="6" strokeLinecap="square" opacity=".6"/>
      </>}
      {id==='neon'&&<>
        <line x1="12" y1="14" x2="208" y2="14" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" filter="url(#glow)"/>
        <line x1="12" y1="14" x2="208" y2="14" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity=".7"/>
      </>}
      
      
      
    </svg>
  )
}

/* ─── Empty center state ────────────────────────────────── */
function EmptyState({backendOk,useHed,coloringBook,T}){
  const col=coloringBook?T.pink:useHed?T.blue:T.gold
  return(
    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:32}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:24,textAlign:'center',maxWidth:520}}>
        {/* Big gradient title */}
        <div>
          <h1 style={{
            fontSize:44,fontWeight:900,letterSpacing:'-.05em',lineHeight:1,marginBottom:10,
            background:'linear-gradient(135deg,#f5c542 0%,#f97316 30%,#a78bfa 70%,#22d3ee 100%)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
          }}>AI Sketch Studio</h1>
          <p style={{fontSize:14,color:T.sub,lineHeight:1.8,opacity:.5,maxWidth:380}}>
            Transform any image into a beautiful hand-drawn sketch animation using neural edge detection.
          </p>
        </div>

        {/* Feature cards */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,width:'100%'}}>
          {[
            {icon:'⚡',title:'Canny Edge',col:T.gold,desc:'Fast, accurate edge maps for any image type'},
            {icon:'🧠',title:'HED Neural',col:T.blue,desc:'Deep learning edges — faces, portraits, details'},
            {icon:'🎨',title:'Watercolour',col:T.cyan,desc:'Region-based color fill that looks hand-painted'},
          ].map(c=>(
            <div key={c.title} style={{padding:'16px 12px',borderRadius:14,background:`${c.col}06`,border:`1px solid ${c.col}15`,opacity:.7}}>
              <div style={{fontSize:28,marginBottom:8}}>{c.icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:c.col,marginBottom:5}}>{c.title}</div>
              <div style={{fontSize:10.5,color:T.sub,lineHeight:1.6}}>{c.desc}</div>
            </div>
          ))}
        </div>

        {backendOk===false&&(
          <div style={{padding:'10px 16px',borderRadius:10,width:'100%',background:'rgba(248,113,113,.07)',border:'1px solid rgba(248,113,113,.18)',fontSize:11,color:'#f87171',fontFamily:'"JetBrains Mono",monospace',lineHeight:2,textAlign:'left'}}>
            ⚠ Backend offline → cd backend && python main.py
          </div>
        )}
        <p style={{fontSize:11,color:T.sub,opacity:.22,letterSpacing:'.02em'}}>← Upload an image in the left panel to begin</p>
      </div>
    </div>
  )
}

/* ─── Components ────────────────────────────────────────── */
function SLabel({children,T,icon}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:7,fontSize:10,color:T.sub,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase'}}>
      {icon&&<span style={{fontSize:11}}>{icon}</span>}{children}
    </div>
  )
}

function Toggle({value,onChange,color}){
  return(
    <div onClick={()=>onChange(!value)} style={{width:34,height:20,borderRadius:10,flexShrink:0,cursor:'pointer',background:value?color:'rgba(255,255,255,.07)',position:'relative',transition:'all .2s',boxShadow:value?`0 0 9px ${color}45`:'none'}}>
      <div style={{position:'absolute',top:3,left:value?17:3,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.4)'}}/>
    </div>
  )
}

function Chip({onClick,children,col}){
  return(
    <button onClick={onClick} className="action-chip" style={{padding:'5px 11px',borderRadius:8,border:`1px solid ${col}40`,background:`${col}14`,color:col,fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:700,transition:'all .15s'}}>{children}</button>
  )
}

function PulseDot({color,glow}){
  return(
    <div style={{width:6,height:6,borderRadius:'50%',flexShrink:0,background:color,boxShadow:glow?`0 0 6px ${color}`:'none',animation:glow?'pulse 2s infinite':'none'}}/>
  )
}

function Spinner({color}){
  return(
    <div style={{width:12,height:12,borderRadius:'50%',flexShrink:0,border:'2px solid rgba(255,255,255,.07)',borderTopColor:color||'#f5c542',animation:'spin .65s linear infinite'}}/>
  )
}
















































