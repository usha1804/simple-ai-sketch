
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
  { id:'s', label:'512',     w:512, h:512 },
  { id:'p', label:'512×768', w:512, h:768 },
  { id:'l', label:'768',     w:768, h:768 },
]

const PENS = [
  { id:'pencil',   emoji:'✏️', label:'Pencil'   },
  { id:'charcoal', emoji:'🪨', label:'Charcoal' },
  { id:'ink',      emoji:'🖊️', label:'Ink'      },
  { id:'brush',    emoji:'🖌️', label:'Brush'    },
  { id:'marker',   emoji:'🖍️', label:'Marker'   },
]

export default function TextToSketchTab({
  canvasRef, onAnimationStart, onAnimationReset,
  T, externalPrompt, onPromptChange,
  phase: extPhase, genImageB64: extGenB64,
  onGenerate, onCancel, busy: extBusy,
}) {
  /* ── LOCAL prompt state — NOT controlled by parent.
     Parent's value is synced in on mount/external change only.
     This prevents the "can't type" bug caused by controlled re-renders. ── */
  const [localPrompt, setLocalPrompt] = useState(externalPrompt || '')
  const promptRef = useRef(localPrompt)

  // Sync external → local only when external changes from OUTSIDE
  // (e.g. clicking an example chip from the welcome screen)
  const prevExternal = useRef(externalPrompt)
  useEffect(() => {
    if (externalPrompt !== prevExternal.current) {
      prevExternal.current = externalPrompt
      if (externalPrompt !== promptRef.current) {
        setLocalPrompt(externalPrompt || '')
        promptRef.current = externalPrompt || ''
      }
    }
  }, [externalPrompt])

  const handlePromptChange = useCallback((val) => {
    setLocalPrompt(val)
    promptRef.current = val
    onPromptChange?.(val)
  }, [onPromptChange])

  const [penStyle,   setPenStyle]   = useState('pencil')
  const [quality,    setQuality]    = useState('balanced')
  const [size,       setSize]       = useState('s')
  const [useHed,     setUseHed]     = useState(false)
  const [crosshatch, setCross]      = useState(false)
  const [detail,     setDetail]     = useState(3)
  const [maxStrokes, setStrokes]    = useState(700)
  const [seed,       setSeed]       = useState('')
  const [generator,  setGenerator]  = useState('auto')
  const [showNeg,    setShowNeg]    = useState(false)
  const [negPrompt,  setNeg]        = useState('')
  const [history,    setHistory]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('t2s_history') || '[]') }
    catch { return [] }
  })

  const phase = extPhase || 'idle'
  const busy  = extBusy  || false

  useEffect(() => {
    localStorage.setItem('t2s_history', JSON.stringify(history.slice(0, 20)))
  }, [history])

  const scrollRef = useRef(null)

  // Stop ALL key events from propagating out of the scroll container
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
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

  const S = {
    hdr: {
      padding:'6px 12px', borderBottom:`1px solid ${T.border}`,
      fontSize:8, color:T.sub, letterSpacing:'.14em', textTransform:'uppercase',
      fontFamily:'"JetBrains Mono",monospace', background:'rgba(0,0,0,.02)',
    },
    body: { padding:'10px 12px' },
    lbl: {
      fontSize:8, color:T.sub, letterSpacing:'.08em', textTransform:'uppercase',
      fontFamily:'"JetBrains Mono",monospace', marginBottom:5, display:'block',
    },
    card: { borderRadius:10, border:`1px solid ${T.border}`, overflow:'hidden', marginBottom:8 },
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', minHeight:0 }}>

      {/* ── SCROLLABLE CONTENT ── */}
      <div
        ref={scrollRef}
        style={{
          flex:1, overflowY:'auto', overflowX:'hidden',
          minHeight:0, padding:'10px 10px 4px',
        }}
      >

        {/* ── Prompt ── */}
        <div style={S.card}>
          <div style={S.hdr}>Prompt</div>
          <div style={S.body}>
            <textarea
              value={localPrompt}
              onChange={e => handlePromptChange(e.target.value)}
              placeholder="Describe what to draw…"
              rows={3}
              style={{
                width:'100%', background:T.dim,
                border:`1px solid ${localPrompt ? T.purple+'80' : T.border}`,
                borderRadius:8, padding:'9px 11px', color:T.text,
                fontSize:12, fontFamily:'inherit', outline:'none',
                resize:'none', lineHeight:1.6, boxSizing:'border-box',
                display:'block',
              }}
            />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
              <button
                onClick={() => handlePromptChange(EXAMPLES[Math.floor(Math.random()*EXAMPLES.length)])}
                style={{ background:'transparent', border:'none', color:T.sub, fontSize:9, cursor:'pointer', fontFamily:'inherit', padding:0 }}
              >🎲 Random</button>
              <span style={{ fontSize:8, color:localPrompt.length>200?T.red:T.sub, fontFamily:'"JetBrains Mono",monospace' }}>
                {localPrompt.length}/200
              </span>
            </div>

            <button
              onClick={() => setShowNeg(v=>!v)}
              style={{ marginTop:4, background:'transparent', border:'none', color:T.sub, fontSize:9, cursor:'pointer', fontFamily:'inherit', padding:0 }}
            >{showNeg ? '▾' : '▸'} Negative prompt</button>

            {showNeg && (
              <textarea
                value={negPrompt}
                onChange={e => setNeg(e.target.value)}
                placeholder="Things to avoid…"
                rows={2}
                style={{
                  marginTop:5, width:'100%', background:T.dim,
                  border:`1px solid ${T.border}`, borderRadius:7,
                  padding:'7px 10px', color:T.text, fontSize:10,
                  fontFamily:'inherit', outline:'none', resize:'none',
                  lineHeight:1.5, boxSizing:'border-box', display:'block',
                }}
              />
            )}

            {/* Example chips */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:8 }}>
              {EXAMPLES.slice(0,4).map(ex => (
                <button key={ex} onClick={() => handlePromptChange(ex)} style={{
                  padding:'3px 8px', borderRadius:20, fontSize:8, cursor:'pointer',
                  border:`1px solid ${T.border}`, background:T.dim,
                  color:T.sub, fontFamily:'inherit',
                }}>{ex}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Pen Style ── */}
        <div style={S.card}>
          <div style={S.hdr}>Pen Style</div>
          <div style={{ padding:'8px 12px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4 }}>
              {PENS.map(s => (
                <button key={s.id} onClick={() => setPenStyle(s.id)} style={{
                  padding:'7px 3px', borderRadius:7, fontSize:8, cursor:'pointer',
                  border:`1px solid ${penStyle===s.id?T.purple:T.border}`,
                  background:penStyle===s.id?T.purpleBg:T.dim,
                  color:penStyle===s.id?T.purple:T.sub,
                  fontFamily:'inherit', transition:'all .15s',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                }}>
                  <span style={{ fontSize:13 }}>{s.emoji}</span>
                  <span style={{ fontWeight:penStyle===s.id?700:400 }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Generation ── */}
        <div style={S.card}>
          <div style={S.hdr}>Generation</div>
          <div style={S.body}>
            <span style={S.lbl}>Quality / Speed</span>
            <div style={{ display:'flex', gap:4, marginBottom:10 }}>
              {QUALITY.map(q => (
                <button key={q.id} onClick={() => setQuality(q.id)} style={{
                  flex:1, padding:'7px 3px', borderRadius:7, fontSize:9, cursor:'pointer',
                  border:`1px solid ${quality===q.id?T.blue:T.border}`,
                  background:quality===q.id?T.blueBg:T.dim,
                  color:quality===q.id?T.blue:T.sub,
                  fontFamily:'inherit', transition:'all .15s',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                }}>
                  <span style={{ fontWeight:quality===q.id?700:400 }}>{q.label}</span>
                  <span style={{ fontSize:7, opacity:.7 }}>{q.desc}</span>
                </button>
              ))}
            </div>

            <span style={S.lbl}>Canvas Size</span>
            <div style={{ display:'flex', gap:4, marginBottom:10 }}>
              {SIZES.map(s => (
                <button key={s.id} onClick={() => setSize(s.id)} style={{
                  flex:1, padding:'5px 3px', borderRadius:7, fontSize:8, cursor:'pointer',
                  border:`1px solid ${size===s.id?T.purple:T.border}`,
                  background:size===s.id?T.purpleBg:T.dim,
                  color:size===s.id?T.purple:T.sub,
                  fontFamily:'"JetBrains Mono",monospace', transition:'all .15s', textAlign:'center',
                }}>{s.label}</button>
              ))}
            </div>

            <span style={S.lbl}>Generator</span>
            <div style={{ display:'flex', gap:4, marginBottom:10 }}>
              {[['auto','Auto'],['sd','Stable Diff'],['pollinations','Pollinations']].map(([v,l]) => (
                <button key={v} onClick={() => setGenerator(v)} style={{
                  flex:1, padding:'5px 2px', borderRadius:7, fontSize:8, cursor:'pointer',
                  border:`1px solid ${generator===v?T.green:T.border}`,
                  background:generator===v?T.greenBg:T.dim,
                  color:generator===v?T.green:T.sub,
                  fontFamily:'inherit', transition:'all .15s', textAlign:'center',
                }}>{l}</button>
              ))}
            </div>

            <span style={S.lbl}>Seed (optional)</span>
            <div style={{ display:'flex', gap:5 }}>
              <input
                type="number" value={seed}
                onChange={e => setSeed(e.target.value)}
                placeholder="Random"
                style={{ flex:1, background:T.dim, border:`1px solid ${T.border}`, borderRadius:7, padding:'5px 8px', color:T.text, fontSize:10, fontFamily:'"JetBrains Mono",monospace', outline:'none' }}
              />
              <button onClick={() => setSeed(Math.floor(Math.random()*99999))}
                style={{ background:T.dim, border:`1px solid ${T.border}`, borderRadius:7, padding:'5px 9px', color:T.sub, fontSize:9, cursor:'pointer' }}>🎲</button>
              {seed && <button onClick={() => setSeed('')} style={{ background:'transparent', border:'none', color:T.sub, fontSize:9, cursor:'pointer' }}>✕</button>}
            </div>
          </div>
        </div>

        {/* ── Sketch Settings ── */}
        <div style={S.card}>
          <div style={S.hdr}>Sketch Settings</div>
          <div style={S.body}>
            <div style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:9, color:T.sub }}>Edge Detail</span>
                <span style={{ fontSize:9, color:T.gold, fontFamily:'"JetBrains Mono",monospace', background:T.goldBg, border:`1px solid ${T.goldBdr}`, borderRadius:5, padding:'1px 7px' }}>
                  {['Minimal','Light','Medium','Detailed','Maximum'][detail-1]}
                </span>
              </div>
              <input type="range" min={1} max={5} step={1} value={detail}
                onChange={e => setDetail(+e.target.value)}
                style={{ width:'100%', accentColor:T.gold }} />
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:9, color:T.sub }}>Max Strokes</span>
                <span style={{ fontSize:9, color:T.gold, fontFamily:'"JetBrains Mono",monospace', background:T.goldBg, border:`1px solid ${T.goldBdr}`, borderRadius:5, padding:'1px 7px' }}>
                  {maxStrokes.toLocaleString()}
                </span>
              </div>
              <input type="range" min={100} max={2000} step={100} value={maxStrokes}
                onChange={e => setStrokes(+e.target.value)}
                style={{ width:'100%', accentColor:T.gold }} />
            </div>
            {[
              { label:'HED Neural',  sub:'Better edges on photos', val:useHed,     set:setUseHed, color:T.blue   },
              { label:'Cross-Hatch', sub:'Add shading strokes',    val:crosshatch, set:setCross,  color:T.orange },
            ].map(f => (
              <div key={f.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderTop:`1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize:10, color:f.val?f.color:T.sub, fontWeight:f.val?600:400 }}>{f.label}</div>
                  <div style={{ fontSize:8, color:T.sub }}>{f.sub}</div>
                </div>
                <div onClick={() => f.set(v=>!v)} style={{ width:38, height:21, borderRadius:11, cursor:'pointer', background:f.val?f.color:'rgba(128,128,128,.2)', position:'relative', transition:'background .2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2.5, left:f.val?19:2.5, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.4)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Status / Preview ── */}
        {(phase !== 'idle' || extGenB64) && (
          <div style={{
            ...S.card,
            background:phase==='error'?T.redBg:phase==='done'?T.greenBg:'transparent',
            border:`1px solid ${phase==='error'?T.redBdr:phase==='done'?T.greenBdr:T.border}`,
          }}>
            <div style={{ padding:'10px 12px' }}>
              {busy && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:12, height:12, borderRadius:'50%', border:'2px solid rgba(128,128,128,.2)', borderTopColor:T.purple, animation:'t2s-spin .65s linear infinite', flexShrink:0 }} />
                  <span style={{ fontSize:10, color:T.sub }}>Generating…</span>
                </div>
              )}
              {extGenB64 && (
                <div style={{ marginBottom:6 }}>
                  <div style={{ fontSize:8, color:T.sub, marginBottom:4 }}>GENERATED IMAGE</div>
                  <img src={`data:image/jpeg;base64,${extGenB64}`} alt="Generated"
                    style={{ width:'100%', borderRadius:7, border:`1px solid ${T.border}`, display:'block' }} />
                </div>
              )}
              {phase==='error' && <div style={{ fontSize:10, color:T.red }}>⚠ Generation failed — check backend is running</div>}
              {phase==='done'  && <div style={{ fontSize:10, color:T.green, fontWeight:700 }}>✓ Sketch complete</div>}
            </div>
          </div>
        )}

        {/* ── History ── */}
        {history.length > 0 && (
          <div style={S.card}>
            <div style={{ ...S.hdr, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>History ({history.length})</span>
              <button onClick={() => { setHistory([]); localStorage.removeItem('t2s_history') }}
                style={{ background:'transparent', border:'none', color:T.sub, fontSize:8, cursor:'pointer', fontFamily:'inherit' }}>Clear</button>
            </div>
            {history.map(item => (
              <div key={item.id} onClick={() => handlePromptChange(item.prompt)}
                style={{ padding:'8px 12px', borderBottom:`1px solid ${T.border}`, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2 }}>{item.prompt}</div>
                  <div style={{ fontSize:8, color:T.sub, fontFamily:'"JetBrains Mono",monospace' }}>{item.penStyle} · {item.total} strokes</div>
                </div>
                <span style={{ fontSize:8, color:T.sub, flexShrink:0 }}>↩</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ height:4 }} />
      </div>

      {/* ── GENERATE BUTTON — always pinned at bottom ── */}
      <div style={{
        flexShrink:0, padding:'10px 10px 12px',
        borderTop:`1px solid ${T.border}`,
        background:T.panel,
      }}>
        {busy ? (
          <button onClick={onCancel} style={{
            width:'100%', padding:13, borderRadius:11,
            border:`1px solid ${T.redBdr}`, background:T.redBg,
            color:T.red, fontSize:12, fontWeight:700,
            cursor:'pointer', display:'flex', alignItems:'center',
            justifyContent:'center', gap:8, fontFamily:'inherit',
          }}>
            <div style={{ width:12, height:12, borderRadius:'50%', border:'2px solid rgba(220,38,38,.2)', borderTopColor:T.red, animation:'t2s-spin .65s linear infinite' }} />
            Cancel
          </button>
        ) : (
          <button
            onClick={() => {
              if (!localPrompt.trim()) return
              onPromptChange?.(localPrompt)
              setTimeout(() => onGenerate?.(), 0)
            }}
            disabled={!localPrompt.trim()}
            style={{
              width:'100%', padding:14, borderRadius:11, border:'none',
              background: localPrompt.trim()
                ? 'linear-gradient(135deg,#a78bfa 0%,#7c3aed 50%,#5b21b6 100%)'
                : 'rgba(128,128,128,.15)',
              color: localPrompt.trim() ? '#fff' : T.sub,
              fontSize:13, fontWeight:800,
              cursor: localPrompt.trim() ? 'pointer' : 'not-allowed',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow: localPrompt.trim() ? '0 4px 24px rgba(124,58,237,.4)' : 'none',
              transition:'all .25s', fontFamily:'inherit',
            }}
          >
            ✨ Generate Sketch
          </button>
        )}
        <div style={{ textAlign:'center', marginTop:5, fontSize:8, color:T.sub, fontFamily:'"JetBrains Mono",monospace' }}>
          {localPrompt.trim() ? 'Click or press Ctrl+Enter' : 'Type a prompt above to begin'}
        </div>
      </div>

      <style>{`
        @keyframes t2s-spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  )
}