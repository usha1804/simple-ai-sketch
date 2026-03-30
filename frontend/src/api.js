
import axios from 'axios'

// ── REST process ─────────────────────────────────────────────
export async function uploadImage(file, detailLevel, maxStrokes, onProgress, options = {}) {
  const form = new FormData()
  form.append('file', file)
  const params = new URLSearchParams({
    detail_level:  detailLevel,
    max_strokes:   maxStrokes,
    use_hed:       options.useHed        ? 'true' : 'false',
    remove_bg:     options.removeBg      ? 'true' : 'false',
    coloring_book: options.coloringBook  ? 'true' : 'false',
    crosshatch:    options.crosshatch    ? 'true' : 'false',
    paper_texture: options.paperTexture  ? 'true' : 'false',
    watercolour:   options.watercolour   ? 'true' : 'false',
  })
  const { data } = await axios.post(`/api/process?${params}`, form, {
    onUploadProgress: e =>
      onProgress?.(e.total ? Math.round(e.loaded / e.total * 100) : 50)
  })
  return data
}

// ── Auto analyse ─────────────────────────────────────────────
export async function analyseImage(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await axios.post('/api/analyse', form)
  return data
}

// ── WebSocket streaming ──────────────────────────────────────
export function streamImage(file, detailLevel, maxStrokes, cb, options = {}) {
  const proto  = location.protocol === 'https:' ? 'wss' : 'ws'
  // Connect directly to FastAPI (port 8002) in dev — Vite proxy drops WS by default
  const wsBase = location.hostname + (location.port === '5173' ? ':8002' : (location.port ? ':'+location.port : ''))
  const ws     = new WebSocket(`${proto}://${wsBase}/api/ws`)

  ws.onopen = () => {
    const reader = new FileReader()
    reader.onload = e => ws.send(JSON.stringify({
      image_b64:    e.target.result.split(',')[1],
      detail_level: detailLevel,
      max_strokes:  maxStrokes,
      filename:     file.name,
      use_hed:       options.useHed       ?? false,
      remove_bg:     options.removeBg     ?? false,
      coloring_book: options.coloringBook ?? false,
      crosshatch:    options.crosshatch   ?? false,
      paper_texture: options.paperTexture ?? false,
      watercolour:   options.watercolour  ?? false,
    }))
    reader.readAsDataURL(file)
  }

  ws.onmessage = e => {
    const msg = JSON.parse(e.data)
    if      (msg.type === 'status')  cb.onStatus?.(msg.message)
    else if (msg.type === 'warning') cb.onWarning?.(msg)
    else if (msg.type === 'meta')    cb.onMeta?.(msg)
    else if (msg.type === 'chunk')   cb.onChunk?.(msg.paths)
    else if (msg.type === 'done')    { cb.onDone?.(msg); ws.close() }
    else if (msg.type === 'error')   { cb.onError?.(msg.message); ws.close() }
  }

  ws.onerror = () => cb.onError?.('WebSocket error — is backend running?')
  return () => { try { ws.close() } catch (_) {} }
}

// ── SVG / PDF export ─────────────────────────────────────────
export async function exportSVG(file, options = {}) {
  const form = new FormData()
  form.append('file', file)
  const params = new URLSearchParams({
    detail_level:  options.detailLevel  ?? 3,
    max_strokes:   options.maxStrokes   ?? 600,
    use_hed:       options.useHed       ? 'true' : 'false',
    coloring_book: options.coloringBook ? 'true' : 'false',
  })
  const res = await axios.post(`/api/export/svg?${params}`, form, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a   = document.createElement('a')
  a.href    = url; a.download = 'sketch.svg'; a.click()
  URL.revokeObjectURL(url)
}

export async function exportPDF(file, options = {}) {
  const form = new FormData()
  form.append('file', file)
  const params = new URLSearchParams({
    detail_level: options.detailLevel ?? 3,
    max_strokes:  options.maxStrokes  ?? 800,
    use_hed:      options.useHed      ? 'true' : 'false',
  })
  const res = await axios.post(`/api/export/pdf?${params}`, form, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a   = document.createElement('a')
  a.href    = url; a.download = 'sketch.pdf'; a.click()
  URL.revokeObjectURL(url)
}

// ── Batch processing ─────────────────────────────────────────
export async function batchProcess(files, options = {}) {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  const params = new URLSearchParams({
    detail_level: options.detailLevel ?? 3,
    max_strokes:  options.maxStrokes  ?? 600,
    use_hed:      options.useHed      ? 'true' : 'false',
  })
  const res = await axios.post(`/api/batch?${params}`, form, {
    responseType: 'blob',
    onUploadProgress: e =>
      options.onProgress?.(e.total ? Math.round(e.loaded / e.total * 100) : 50)
  })
  const url = URL.createObjectURL(res.data)
  const a   = document.createElement('a')
  a.href    = url; a.download = 'sketches_batch.zip'; a.click()
  URL.revokeObjectURL(url)
}

// ── Auth ─────────────────────────────────────────────────────
export async function register(username, password) {
  const { data } = await axios.post('/api/auth/register', { username, password })
  return data
}

export async function login(username, password) {
  const form = new URLSearchParams({ username, password, grant_type: 'password' })
  const { data } = await axios.post('/api/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  return data
}

// ── Gallery ──────────────────────────────────────────────────
export async function getGallery(token) {
  const { data } = await axios.get('/api/gallery', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return data
}

export async function saveSketch(token, name, svg, engine, paths) {
  const { data } = await axios.post('/api/gallery',
    { name, svg, engine, paths },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return data
}

export async function deleteSketch(token, id) {
  const { data } = await axios.delete(`/api/gallery/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return data
}

// ── Text-to-Sketch: generator status ────────────────────────
// Returns: { sd_available, pollinations_available, recommended }
export async function getT2SStatus() {
  const { data } = await axios.get('/api/text2sketch/status')
  return data
}

// ── Text-to-Sketch: WebSocket stream ────────────────────────
// Prompt → generated image → sketch paths → animated drawing
//
// options: { prompt, negativePrompt, penStyle, detailLevel, maxStrokes,
//            useHed, coloringBook, crosshatch, width, height,
//            steps, guidance, seed, generator }
//
// callbacks: { onStatus, onImageReady(b64, generator),
//              onMeta, onChunk, onStartDraw, onDone, onError }
//
// Returns a cancel() function.
export function streamTextToSketch(options, callbacks) {
  const {
    prompt,
    negativePrompt = '',
    penStyle       = 'pencil',
    detailLevel    = 3,
    maxStrokes     = 700,
    useHed         = false,
    coloringBook   = false,
    crosshatch     = false,
    width          = 512,
    height         = 512,
    steps          = 20,
    guidance       = 7.5,
    seed           = null,
    generator      = 'auto',
  } = options

  const params = new URLSearchParams({
    prompt,
    negative_prompt: negativePrompt,
    pen_style:       penStyle,
    detail_level:    detailLevel,
    max_strokes:     maxStrokes,
    use_hed:         useHed,
    coloring_book:   coloringBook,
    crosshatch,
    width,
    height,
    steps,
    guidance,
    generator,
  })
  if (seed !== null && seed !== '') params.set('seed', seed)

  const proto  = location.protocol === 'https:' ? 'wss' : 'ws'
  const wsBase = location.hostname + (location.port === '5173' ? ':8002' : (location.port ? ':'+location.port : ''))
  const ws     = new WebSocket(`${proto}://${wsBase}/api/text2sketch/ws?${params}`)

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    switch (msg.type) {
      case 'status':      callbacks.onStatus?.(msg.message);                       break
      case 'image_ready': callbacks.onImageReady?.(msg.image_b64, msg.generator);  break
      case 'meta':        callbacks.onMeta?.(msg);                                 break
      case 'chunk':       callbacks.onChunk?.(msg.paths);                          break
      case 'start_draw':  callbacks.onStartDraw?.();                               break
      case 'done':        callbacks.onDone?.(msg); ws.close();                     break
      case 'error':       callbacks.onError?.(msg.message); ws.close();            break
    }
  }

  ws.onerror = () => callbacks.onError?.('WebSocket error — is backend running?')

  return () => { try { ws.close() } catch (_) {} }
}








