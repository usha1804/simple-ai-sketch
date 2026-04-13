import { useState, useRef, useCallback, useEffect } from 'react'

const EXAMPLES = [
  "a cat sitting on a wooden desk",
  "an old lighthouse at sunset",
  "a steaming coffee cup",
  "a dragon on a mountain peak",
  "a bicycle against a tree",
  "a wolf howling at the moon",
  "a sailboat on calm water",
  "a futuristic city skyline",
]

const QUALITY = [
  { id:'fast',     label:'Fast',     steps:10, guidance:6.0, desc:'~5s'  },
  { id:'balanced', label:'Balanced', steps:20, guidance:7.5, desc:'~15s' },
  { id:'quality',  label:'Quality',  steps:35, guidance:8.5, desc:'~30s' },
]

const SIZES = [
  { id:'s', label:'512×512', w:512, h:512 },
  { id:'p', label:'512×768', w:512, h:768 },
  { id:'l', label:'768×768', w:768, h:768 },
]

const DETAIL_LABELS = ['Minimal','Light','Medium','Detailed','Maximum']

/* Pen style is NOT here — it lives in App.jsx right panel and is passed via props */

export default function TextToSketchTab({
  canvasRef, onAnimationStart, onAnimationReset,
  T, externalPrompt, onPromptChange,
  phase: extPhase, genImageB64: extGenB64,
  onGenerate, onCancel, busy: extBusy,
}) {
  const [localPrompt, setLocalPrompt] = useState(externalPrompt || '')
  const promptRef = useRef(localPrompt)
  const prevExt   = useRef(externalPrompt)

  useEffect(() => {
    if (externalPrompt !== prevExt.current) {
      prevExt.current = externalPrompt
      if (externalPrompt !== promptRef.current) {
        setLocalPrompt(externalPrompt || '')
        promptRef.current = externalPrompt || ''
      }
    }
  }, [externalPrompt])

  const handleChange = useCallback((val) => {
    setLocalPrompt(val); promptRef.current = val; onPromptChange?.(val)
  }, [onPromptChange])

  const [quality,    setQuality]   = useState('balanced')
  const [size,       setSize]      = useState('s')
  const [useHed,     setUseHed]    = useState(false)
  const [crosshatch, setCross]     = useState(false)
  const [detail,     setDetail]    = useState(3)
  const [maxStrokes, setStrokes]   = useState(700)
  const [seed,       setSeed]      = useState('')
  const [generator,  setGenerator] = useState('auto')
  const [showNeg,    setShowNeg]   = useState(false)
  const [negPrompt,  setNeg]       = useState('')
  const [history,    setHistory]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('t2s_history') || '[]') }
    catch { return [] }
  })

  const phase = extPhase || 'idle'
  const busy  = extBusy  || false

  useEffect(() => {
    localStorage.setItem('t2s_history', JSON.stringify(history.slice(0, 20)))
  }, [history])

  const scrollRef = useRef(null)
  useEffect(() => {
    const el = scrollRef.current; if (!el) return
    const stop = e => e.stopPropagation()
    el.addEventListener('keydown', stop, true)
    el.addEventListener('keyup',   stop, true)
    el.addEventListener('keypress',stop, true)
    return () => {
      el.removeEventListener('keydown', stop, true)
      el.removeEventListener('keyup',   stop, true)
      el.removeEventListener('keypress',stop, true)
    }
  }, [])

  const card  = { borderRadius:11, border:`1px solid ${T.border}`, overflow:'hidden', marginBottom:10 }
  const hdr   = { padding:'9px 14px', borderBottom:`1px solid ${T.border}`, fontSize:11, color:T.sub, letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'"JetBrains Mono",monospace', fontWeight:600 }
  const body  = { padding:'13px 14px' }
  const lbl   = { fontSize:11, color:T.sub, letterSpacing:'.06em', textTransform:'uppercase', fontFamily:'"JetBrains Mono",monospace', marginBottom:7, display:'block', fontWeight:600 }
  const badge = (col) => ({ fontSize:11, color:col, fontFamily:'"JetBrains Mono",monospace', background:col+'18', border:`1px solid ${col}30`, borderRadius:5, padding:'2px 8px', fontWeight:700 })

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', minHeight:0 }}>

      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', overflowX:'hidden', minHeight:0, padding:'10px 10px 6px' }}>

        {/* ── Prompt ── */}
        <div style={card}>
          <div style={hdr}>✨  Prompt</div>
          <div style={body}>
            <textarea
              value={localPrompt}
              onChange={e => handleChange(e.target.value)}
              placeholder="Describe what you want to draw…"
              rows={3}
              style={{
                width:'100%', background:T.dim,
                border:`1.5px solid ${localPrompt ? T.purple+'90' : T.border}`,
                borderRadius:9, padding:'10px 12px', color:T.text,
                fontSize:13, fontFamily:'inherit', outline:'none',
                resize:'none', lineHeight:1.65, boxSizing:'border-box', display:'block',
                transition:'border-color .2s',
              }}
            />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
              <button onClick={() => handleChange(EXAMPLES[Math.floor(Math.random()*EXAMPLES.length)])}
                style={{ background:'transparent', border:'none', color:T.sub, fontSize:11, cursor:'pointer', fontFamily:'inherit', padding:0 }}>
                🎲 Random example
              </button>
              <span style={{ fontSize:11, color:localPrompt.length>200?T.red:T.sub, fontFamily:'"JetBrains Mono",monospace' }}>
                {localPrompt.length}/200
              </span>
            </div>
            <button onClick={() => setShowNeg(v=>!v)}
              style={{ marginTop:6, background:'transparent', border:'none', color:T.sub, fontSize:11, cursor:'pointer', fontFamily:'inherit', padding:0 }}>
              {showNeg ? '▾' : '▸'} Negative prompt
            </button>
            {showNeg && (
              <textarea value={negPrompt} onChange={e => setNeg(e.target.value)}
                placeholder="Things to avoid…" rows={2}
                style={{ marginTop:7, width:'100%', background:T.dim, border:`1px solid ${T.border}`, borderRadius:8, padding:'9px 12px', color:T.text, fontSize:12, fontFamily:'inherit', outline:'none', resize:'none', lineHeight:1.5, boxSizing:'border-box', display:'block' }}/>
            )}
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:10 }}>
              {EXAMPLES.slice(0,4).map(ex => (
                <button key={ex} onClick={() => handleChange(ex)}
                  style={{ padding:'5px 10px', borderRadius:20, fontSize:10, cursor:'pointer', border:`1px solid ${T.border}`, background:T.dim, color:T.sub, fontFamily:'inherit', transition:'all .15s' }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Pen style notice — pen is in the right panel ── */}
        <div style={{ padding:'10px 13px', borderRadius:10, marginBottom:10, background:T.purpleBg, border:`1px solid ${T.purpleBdr}`, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>🎨</span>
          <div>
            <div style={{ fontSize:12, color:T.purple, fontWeight:700, marginBottom:2 }}>Pen style → right panel</div>
            <div style={{ fontSize:11, color:T.sub }}>Select drawing style from the panel on the right →</div>
          </div>
        </div>

        {/* ── Generation settings ── */}
        <div style={card}>
          <div style={hdr}>⚙️  Generation Settings</div>
          <div style={body}>

            <span style={lbl}>Quality / Speed</span>
            <div style={{ display:'flex', gap:5, marginBottom:14 }}>
              {QUALITY.map(q => (
                <button key={q.id} onClick={() => setQuality(q.id)}
                  style={{ flex:1, padding:'9px 4px', borderRadius:9, fontSize:11, cursor:'pointer', border:`1.5px solid ${quality===q.id?T.blue:T.border}`, background:quality===q.id?T.blueBg:T.dim, color:quality===q.id?T.blue:T.sub, fontFamily:'inherit', transition:'all .15s', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <span style={{ fontWeight:quality===q.id?700:500 }}>{q.label}</span>
                  <span style={{ fontSize:10, opacity:.7 }}>{q.desc}</span>
                </button>
              ))}
            </div>

            <span style={lbl}>Canvas Size</span>
            <div style={{ display:'flex', gap:5, marginBottom:14 }}>
              {SIZES.map(s => (
                <button key={s.id} onClick={() => setSize(s.id)}
                  style={{ flex:1, padding:'8px 3px', borderRadius:9, fontSize:11, cursor:'pointer', border:`1.5px solid ${size===s.id?T.purple:T.border}`, background:size===s.id?T.purpleBg:T.dim, color:size===s.id?T.purple:T.sub, fontFamily:'"JetBrains Mono",monospace', transition:'all .15s', textAlign:'center' }}>
                  {s.label}
                </button>
              ))}
            </div>

            <span style={lbl}>Generator</span>
            <div style={{ display:'flex', gap:5, marginBottom:14 }}>
              {[['auto','Auto'],['sd','Stable Diff'],['pollinations','Pollinations']].map(([v,l]) => (
                <button key={v} onClick={() => setGenerator(v)}
                  style={{ flex:1, padding:'7px 3px', borderRadius:9, fontSize:10, cursor:'pointer', border:`1.5px solid ${generator===v?T.green:T.border}`, background:generator===v?T.greenBg:T.dim, color:generator===v?T.green:T.sub, fontFamily:'inherit', transition:'all .15s', textAlign:'center' }}>
                  {l}
                </button>
              ))}
            </div>

            <span style={lbl}>Seed (optional)</span>
            <div style={{ display:'flex', gap:6 }}>
              <input type="number" value={seed} onChange={e => setSeed(e.target.value)} placeholder="Random"
                style={{ flex:1, background:T.dim, border:`1px solid ${T.border}`, borderRadius:8, padding:'7px 10px', color:T.text, fontSize:12, fontFamily:'"JetBrains Mono",monospace', outline:'none' }}/>
              <button onClick={() => setSeed(Math.floor(Math.random()*99999))}
                style={{ background:T.dim, border:`1px solid ${T.border}`, borderRadius:8, padding:'7px 10px', color:T.sub, fontSize:13, cursor:'pointer' }}>🎲</button>
              {seed && <button onClick={() => setSeed('')}
                style={{ background:'transparent', border:'none', color:T.sub, fontSize:13, cursor:'pointer' }}>✕</button>}
            </div>
          </div>
        </div>

        {/* ── Sketch settings ── */}
        <div style={card}>
          <div style={hdr}>✏️  Sketch Settings</div>
          <div style={body}>
            <div style={{ marginBottom:13 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:12, color:T.sub, fontWeight:500 }}>Edge Detail</span>
                <span style={badge(T.gold)}>{DETAIL_LABELS[detail-1]}</span>
              </div>
              <input type="range" min={1} max={5} step={1} value={detail}
                onChange={e => setDetail(+e.target.value)} style={{ width:'100%', accentColor:T.gold }}/>
            </div>
            <div style={{ marginBottom:13 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:12, color:T.sub, fontWeight:500 }}>Max Strokes</span>
                <span style={badge(T.gold)}>{maxStrokes.toLocaleString()}</span>
              </div>
              <input type="range" min={100} max={2000} step={100} value={maxStrokes}
                onChange={e => setStrokes(+e.target.value)} style={{ width:'100%', accentColor:T.gold }}/>
            </div>
            {[
              { label:'HED Neural',  sub:'Better face/photo edge detection', val:useHed,     set:setUseHed, col:T.blue   },
              { label:'Cross-Hatch', sub:'Adds manual shading strokes',       val:crosshatch, set:setCross,  col:T.orange },
            ].map(f => (
              <div key={f.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderTop:`1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize:12, color:f.val?f.col:T.text, fontWeight:f.val?600:400, marginBottom:2 }}>{f.label}</div>
                  <div style={{ fontSize:10, color:T.sub }}>{f.sub}</div>
                </div>
                <div onClick={() => f.set(v=>!v)}
                  style={{ width:40, height:22, borderRadius:11, cursor:'pointer', background:f.val?f.col:'rgba(128,128,128,.18)', position:'relative', transition:'background .2s', flexShrink:0, boxShadow:f.val?`0 0 8px ${f.col}44`:'none' }}>
                  <div style={{ position:'absolute', top:3, left:f.val?20:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.4)' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Status / Preview ── */}
        {(phase !== 'idle' || extGenB64) && (
          <div style={{ ...card, background:phase==='error'?T.redBg:phase==='done'?T.greenBg:'transparent', border:`1px solid ${phase==='error'?T.redBdr:phase==='done'?T.greenBdr:T.border}` }}>
            <div style={{ padding:'12px 14px' }}>
              {busy && (
                <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:9 }}>
                  <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(128,128,128,.2)', borderTopColor:T.purple, animation:'t2s-spin .65s linear infinite', flexShrink:0 }}/>
                  <span style={{ fontSize:12, color:T.sub }}>Generating…</span>
                </div>
              )}
              {extGenB64 && (
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:10, color:T.sub, marginBottom:5, letterSpacing:'.1em', textTransform:'uppercase', fontFamily:'"JetBrains Mono",monospace' }}>GENERATED IMAGE</div>
                  <img src={`data:image/jpeg;base64,${extGenB64}`} alt="Generated" style={{ width:'100%', borderRadius:8, border:`1px solid ${T.border}`, display:'block' }}/>
                </div>
              )}
              {phase==='error' && <div style={{ fontSize:12, color:T.red }}>⚠ Generation failed — check backend is running</div>}
              {phase==='done'  && <div style={{ fontSize:12, color:T.green, fontWeight:700 }}>✓ Sketch complete!</div>}
            </div>
          </div>
        )}

        {/* ── History ── */}
        {history.length > 0 && (
          <div style={card}>
            <div style={{ ...hdr, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>History ({history.length})</span>
              <button onClick={() => { setHistory([]); localStorage.removeItem('t2s_history') }}
                style={{ background:'transparent', border:'none', color:T.sub, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>Clear</button>
            </div>
            {history.map(item => (
              <div key={item.id} onClick={() => handleChange(item.prompt)}
                style={{ padding:'9px 14px', borderBottom:`1px solid ${T.border}`, cursor:'pointer', display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:3 }}>{item.prompt}</div>
                  <div style={{ fontSize:10, color:T.sub, fontFamily:'"JetBrains Mono",monospace' }}>{item.total||0} strokes</div>
                </div>
                <span style={{ fontSize:13, color:T.sub, flexShrink:0 }}>↩</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ height:6 }} />
      </div>

      {/* ── Generate button — pinned bottom ── */}
      <div style={{ flexShrink:0, padding:'11px 12px 13px', borderTop:`1px solid ${T.border}`, background:T.panel, boxShadow:'0 -4px 20px rgba(0,0,0,.3)' }}>
        {busy ? (
          <button onClick={onCancel}
            style={{ width:'100%', padding:13, borderRadius:12, border:`1px solid ${T.redBdr}`, background:T.redBg, color:T.red, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:9, fontFamily:'inherit' }}>
            <div style={{ width:13, height:13, borderRadius:'50%', border:'2px solid rgba(220,38,38,.2)', borderTopColor:T.red, animation:'t2s-spin .65s linear infinite' }}/>
            Cancel Generation
          </button>
        ) : (
          <button
            onClick={() => { if (!localPrompt.trim()) return; onPromptChange?.(localPrompt); setTimeout(() => onGenerate?.(), 0) }}
            disabled={!localPrompt.trim()}
            style={{
              width:'100%', padding:14, borderRadius:12, border:'none',
              background: localPrompt.trim() ? 'linear-gradient(135deg,#a78bfa 0%,#7c3aed 50%,#5b21b6 100%)' : 'rgba(128,128,128,.12)',
              color: localPrompt.trim() ? '#fff' : T.sub,
              fontSize:14, fontWeight:800, cursor: localPrompt.trim() ? 'pointer' : 'not-allowed',
              display:'flex', alignItems:'center', justifyContent:'center', gap:9,
              boxShadow: localPrompt.trim() ? '0 5px 28px rgba(124,58,237,.45)' : 'none',
              transition:'all .25s', fontFamily:'inherit', letterSpacing:'-.01em',
            }}>
            ✨ Generate Sketch
          </button>
        )}
        <div style={{ textAlign:'center', marginTop:6, fontSize:10, color:T.sub, fontFamily:'"JetBrains Mono",monospace' }}>
          {localPrompt.trim() ? 'Pen style used from right panel →' : 'Type a prompt above to begin'}
        </div>
      </div>

      <style>{`@keyframes t2s-spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}