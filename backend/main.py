
"""
main.py - v6 + Video + Text-to-Sketch  AI Sketch Studio Backend
All endpoints including video-to-sketch and text-to-sketch.
"""

import uuid
import logging, json, base64, asyncio, logging, traceback, os, zipfile, io, time
from pathlib import Path
from datetime import datetime
from typing import Optional

import aiofiles, uvicorn
from fastapi import (FastAPI, File, UploadFile, HTTPException,
                     Query, WebSocket, WebSocketDisconnect,
                     Depends, BackgroundTasks)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse, FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

from pipeline import (run_pipeline, auto_detect_style, _load,
                      detect_screen_photo, paths_to_pdf_bytes)
from video_pipeline import process_video
from text_to_sketch import text_to_sketch_async, sd_available

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

UPLOAD_DIR  = Path("uploads");  UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR  = Path("outputs");  OUTPUT_DIR.mkdir(exist_ok=True)
GALLERY_DIR = Path("gallery");  GALLERY_DIR.mkdir(exist_ok=True)

# ── In-memory stores (swap for SQLite in production) ────────────
_users:   dict = {}
_gallery: dict = {}
_tokens:  dict = {}
_video_jobs: dict = {}

SECRET_KEY = os.getenv("SECRET_KEY", "ai-sketch-studio-secret-change-in-production")

def _hash_pw(pw: str) -> str:
    import hashlib
    return hashlib.sha256((pw + SECRET_KEY).encode()).hexdigest()

def _make_token(username: str) -> str:
    token = str(uuid.uuid4()); _tokens[token] = username; return token

def _get_user(token: str = Depends(
        OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False))):
    return _tokens.get(token) if token else None

# ── App ──────────────────────────────────────────────────────────
app = FastAPI(title="AI Sketch Studio v6+Video+T2S")
app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Pydantic models ──────────────────────────────────────────────
class RegisterBody(BaseModel):
    username: str
    password: str

class SaveSketchBody(BaseModel):
    name: str; svg: str; engine: str; paths: int

# ── Helpers ──────────────────────────────────────────────────────
# Image formats OpenCV cannot open natively — must convert first
_NEEDS_CONVERT = {'.avif', '.heic', '.heif', '.jxl', '.tiff', '.tif', '.webp'}

def _convert_to_png(src_path: Path) -> Path:
    """Convert any image format to PNG so OpenCV can always read it."""
    dst_path = src_path.with_suffix('.png')
    try:
        # Try pillow-avif-plugin for AVIF
        try:
            import pillow_avif  # pip install pillow-avif-plugin
        except ImportError:
            pass
        # Try pillow-heif for HEIC/HEIF
        try:
            from pillow_heif import register_heif_opener
            register_heif_opener()
        except ImportError:
            pass
        from PIL import Image as _PIL
        with _PIL.open(src_path) as img:
            img.convert('RGB').save(dst_path, 'PNG')
        src_path.unlink(missing_ok=True)
        return dst_path
    except Exception as e:
        logging.getLogger(__name__).warning(f"[convert] {src_path.suffix} → PNG failed: {e}")
        return src_path   # return original path, let pipeline try anyway

async def _save_upload(file: UploadFile, max_mb: int = 200) -> Path:
    content = await file.read()
    if len(content) > max_mb * 1024 * 1024:
        raise HTTPException(413, f"File too large (max {max_mb}MB)")
    if len(content) == 0:
        raise HTTPException(400, "Empty file")
    suffix = Path(file.filename or "upload.bin").suffix.lower() or ".bin"
    path   = UPLOAD_DIR / f"{uuid.uuid4()}{suffix}"
    async with aiofiles.open(path, "wb") as f:
        await f.write(content)
    # Convert unsupported formats (AVIF, HEIC, WebP, TIFF) to PNG
    if suffix in _NEEDS_CONVERT:
        path = await asyncio.get_event_loop().run_in_executor(
            None, _convert_to_png, path
        )
    return path

# ═══════════════════════════════════════════════════════════════
# HEALTH
# ═══════════════════════════════════════════════════════════════
@app.get("/api/health")
def health():
    from pipeline import HED_MODEL
    try:
        import cv2
        cv2_ok = True
    except Exception:
        cv2_ok = False
    return {
        "status":    "ok",
        "hed_ready": HED_MODEL.exists(),
        "sd_ready":  sd_available(),
        "hed_size":  (f"{HED_MODEL.stat().st_size/1024/1024:.1f}MB"
                      if HED_MODEL.exists() else "missing"),
        "version":   "6.2",
        "cv2":       cv2_ok,
    }

# ═══════════════════════════════════════════════════════════════
# IMAGE ENDPOINTS
# ═══════════════════════════════════════════════════════════════
@app.post("/api/analyse")
async def analyse(file: UploadFile = File(...)):
    path = await _save_upload(file)
    try:
        bgr    = await asyncio.get_event_loop().run_in_executor(None, _load, str(path))
        result = auto_detect_style(bgr)
        is_screen, conf, reasons = detect_screen_photo(bgr)
        result["screen_photo"] = {"detected": is_screen, "confidence": conf, "reasons": reasons}
        return JSONResponse(result)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/api/process")
async def process(
    file:          UploadFile = File(...),
    detail_level:  int  = Query(3, ge=1, le=5),
    max_strokes:   int  = Query(600, ge=10, le=3000),
    use_hed:       bool = Query(False),
    remove_bg:     bool = Query(False),
    coloring_book: bool = Query(False),
    crosshatch:    bool = Query(False),
    paper_texture: bool = Query(False),
    watercolour:   bool = Query(False),
    webcam:        bool = Query(False),
):
    path = await _save_upload(file)
    log.info(f"process: {file.filename} hed={use_hed} rmbg={remove_bg} "
             f"cb={coloring_book} hatch={crosshatch}")
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: run_pipeline(
                str(path), detail_level, max_strokes, use_hed,
                remove_bg, coloring_book, crosshatch, paper_texture, watercolour,
                webcam
            )
        )
        return JSONResponse(result)
    except Exception as e:
        log.error(traceback.format_exc())
        raise HTTPException(500, f"Processing failed: {e}")

@app.websocket("/api/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        raw  = await ws.receive_text()
        data = json.loads(raw)
        b64  = data.get("image_b64", "")
        if not b64:
            await ws.send_json({"type": "error", "message": "No image data"}); return

        dl   = int(data.get("detail_level",   3))
        ms   = int(data.get("max_strokes",    600))
        fn   = data.get("filename",           "image.jpg")
        hed  = bool(data.get("use_hed",       False))
        rmbg = bool(data.get("remove_bg",     False))
        cb   = bool(data.get("coloring_book", False))
        hatch= bool(data.get("crosshatch",    False))
        pt   = bool(data.get("paper_texture", False))
        wc   = bool(data.get("watercolour",   False))

        suf  = Path(fn).suffix.lower() or ".jpg"
        path = UPLOAD_DIR / f"{uuid.uuid4()}{suf}"
        async with aiofiles.open(path, "wb") as f:
            await f.write(base64.b64decode(b64))

        msg = ("Colouring-book mode..." if cb
               else "Running HED neural network..." if hed
               else "Detecting edges...")
        await ws.send_json({"type": "status", "message": msg})

        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: run_pipeline(str(path), dl, ms, hed, rmbg, cb, hatch, pt, wc, False)
        )

        for w in result.get("warnings", []):
            await ws.send_json({"type": "warning", **w})

        paths = result["paths"]
        await ws.send_json({"type": "meta", "width": result["width"],
            "height": result["height"], "total": len(paths),
            "engine": result["engine"], "quality": result.get("quality", {})})

        for i in range(0, len(paths), 20):
            await ws.send_json({"type": "chunk", "paths": paths[i:i+20]})
            await asyncio.sleep(0)

        await ws.send_json({"type": "done", "engine": result["engine"],
            "quality": result.get("quality", {}),
            "svg": result.get("svg", ""),
            "paper_b64": result.get("paper_b64", ""),
            "wc_colors": result.get("wc_colors", [])})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        log.error(traceback.format_exc())
        try: await ws.send_json({"type": "error", "message": str(e)})
        except: pass

@app.post("/api/export/svg")
async def export_svg(
    file:          UploadFile = File(...),
    detail_level:  int  = Query(3, ge=1, le=5),
    max_strokes:   int  = Query(600, ge=10, le=3000),
    use_hed:       bool = Query(False),
    coloring_book: bool = Query(False),
):
    path   = await _save_upload(file)
    result = await asyncio.get_event_loop().run_in_executor(
        None, lambda: run_pipeline(str(path), detail_level, max_strokes,
                                    use_hed, False, coloring_book))
    return Response(content=result.get("svg", ""), media_type="image/svg+xml",
                    headers={"Content-Disposition": "attachment; filename=sketch.svg"})

@app.post("/api/export/pdf")
async def export_pdf(
    file:          UploadFile = File(...),
    detail_level:  int  = Query(3, ge=1, le=5),
    max_strokes:   int  = Query(800, ge=10, le=3000),
    use_hed:       bool = Query(False),
):
    path      = await _save_upload(file)
    result    = await asyncio.get_event_loop().run_in_executor(
        None, lambda: run_pipeline(str(path), detail_level, max_strokes, use_hed))
    pdf_bytes = paths_to_pdf_bytes(result["paths"], result["width"], result["height"])
    if not pdf_bytes:
        raise HTTPException(500, "PDF generation failed — pip install reportlab")
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=sketch.pdf"})

@app.post("/api/batch")
async def batch_process(
    files:         list[UploadFile] = File(...),
    detail_level:  int  = Query(3, ge=1, le=5),
    max_strokes:   int  = Query(600, ge=10, le=3000),
    use_hed:       bool = Query(False),
):
    if len(files) > 10:
        raise HTTPException(400, "Max 10 files per batch")
    results = []
    for file in files:
        try:
            path   = await _save_upload(file)
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda p=path: run_pipeline(str(p), detail_level, max_strokes, use_hed))
            results.append({"filename": file.filename, "status": "ok",
                             "paths": result["total"], "engine": result["engine"],
                             "quality": result.get("quality", {}), "svg": result.get("svg", "")})
        except Exception as e:
            results.append({"filename": file.filename, "status": "error", "message": str(e)})

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for r in results:
            if r["status"] == "ok":
                zf.writestr(Path(r["filename"]).stem + ".svg", r["svg"])
        zf.writestr("summary.json", json.dumps(results, indent=2))
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip",
                             headers={"Content-Disposition":
                                      "attachment; filename=sketches_batch.zip"})

# ═══════════════════════════════════════════════════════════════
# VIDEO ENDPOINTS
# ═══════════════════════════════════════════════════════════════

def _run_video_job(job_id: str, input_path: str, output_path: str,
                   use_hed: bool, detail_level: int, frame_skip: int,
                   temporal_smooth: float, output_format: str):
    _video_jobs[job_id]["status"] = "processing"

    def on_progress(pct, frame, total):
        _video_jobs[job_id]["progress"] = pct
        _video_jobs[job_id]["frame"]    = frame
        _video_jobs[job_id]["total"]    = total

    try:
        result = process_video(
            input_path=input_path, output_path=output_path,
            use_hed=use_hed, detail_level=detail_level,
            frame_skip=frame_skip, temporal_smooth=temporal_smooth,
            output_format=output_format, on_progress=on_progress,
        )
        _video_jobs[job_id]["status"]   = "done"
        _video_jobs[job_id]["result"]   = result
        _video_jobs[job_id]["progress"] = 100
    except Exception as e:
        _video_jobs[job_id]["status"] = "error"
        _video_jobs[job_id]["error"]  = str(e)
        log.error(traceback.format_exc())


@app.post("/api/video/process")
async def video_process(
    background_tasks: BackgroundTasks,
    file:             UploadFile = File(...),
    use_hed:          bool  = Query(False),
    detail_level:     int   = Query(3, ge=1, le=5),
    frame_skip:       int   = Query(2, ge=1, le=10),
    temporal_smooth:  float = Query(0.4, ge=0.0, le=1.0),
    output_format:    str   = Query("mp4"),
):
    suffix = Path(file.filename or "video.mp4").suffix.lower()
    if suffix not in {".mp4", ".avi", ".mov", ".webm", ".mkv", ".m4v"}:
        raise HTTPException(400, f"Unsupported video format: {suffix}")
    if output_format not in {"mp4", "gif"}:
        raise HTTPException(400, "output_format must be mp4 or gif")

    path = await _save_upload(file, max_mb=500)
    job_id      = str(uuid.uuid4())
    output_path = str(OUTPUT_DIR / f"sketch_{job_id}.{output_format}")

    _video_jobs[job_id] = {
        "status": "queued", "progress": 0, "frame": 0, "total": 0,
        "input_file": file.filename, "input_path": str(path),
        "output_path": output_path, "output_format": output_format,
        "use_hed": use_hed, "detail_level": detail_level,
        "frame_skip": frame_skip, "temporal_smooth": temporal_smooth,
        "created_at": datetime.utcnow().isoformat(), "result": None, "error": None,
    }
    background_tasks.add_task(_run_video_job, job_id, str(path), output_path,
                               use_hed, detail_level, frame_skip, temporal_smooth, output_format)
    return {"job_id": job_id, "status": "queued",
            "poll_url": f"/api/video/status/{job_id}",
            "download_url": f"/api/video/download/{job_id}"}


@app.get("/api/video/status/{job_id}")
async def video_status(job_id: str):
    job = _video_jobs.get(job_id)
    if not job: raise HTTPException(404, "Job not found")
    response = {"job_id": job_id, "status": job["status"], "progress": job["progress"],
                "frame": job.get("frame", 0), "total_frames": job.get("total", 0),
                "input_file": job.get("input_file"), "output_format": job.get("output_format"),
                "created_at": job.get("created_at")}
    if job["status"] == "done" and job["result"]:
        r = job["result"]
        response.update({"frames_processed": r["frames_processed"], "fps": r["fps"],
                         "width": r["width"], "height": r["height"],
                         "duration_s": r["duration_s"], "engine": r["engine"],
                         "thumbnail_b64": r.get("thumbnail_b64", ""),
                         "download_url": f"/api/video/download/{job_id}"})
    elif job["status"] == "error":
        response["error"] = job.get("error", "Unknown error")
    return JSONResponse(response)


@app.get("/api/video/download/{job_id}")
async def video_download(job_id: str):
    job = _video_jobs.get(job_id)
    if not job: raise HTTPException(404, "Job not found")
    if job["status"] != "done": raise HTTPException(400, f"Job not ready: {job['status']}")
    output_path = job["output_path"]
    if not Path(output_path).exists(): raise HTTPException(404, "Output file not found")
    fmt      = job.get("output_format", "mp4")
    mimetype = "video/mp4" if fmt == "mp4" else "image/gif"
    return FileResponse(output_path, media_type=mimetype, filename=f"sketch_video.{fmt}")


@app.get("/api/video/jobs")
async def list_video_jobs():
    jobs = [{"job_id": jid, "status": j["status"], "progress": j["progress"],
              "input_file": j.get("input_file"), "created_at": j.get("created_at")}
             for jid, j in _video_jobs.items()]
    jobs.sort(key=lambda j: j.get("created_at", ""), reverse=True)
    return {"jobs": jobs, "count": len(jobs)}


@app.websocket("/api/video/animate")
async def video_animate(ws: WebSocket):
    await ws.accept()
    tmp_path = None
    try:
        raw  = await ws.receive_text()
        data = json.loads(raw)
        b64      = data.get("video_b64", "")
        filename = data.get("filename", "video.mp4")
        skip     = int(data.get("frame_skip", 3))
        hed      = bool(data.get("use_hed", False))
        dl       = int(data.get("detail_level", 3))
        smooth_v = float(data.get("temporal_smooth", 0.4))

        if not b64:
            await ws.send_json({"type":"error","message":"No video data"}); return

        suffix   = Path(filename).suffix.lower() or ".mp4"
        tmp_path = str(UPLOAD_DIR / f"{uuid.uuid4()}{suffix}")
        async with aiofiles.open(tmp_path, "wb") as f:
            await f.write(base64.b64decode(b64))

        await ws.send_json({"type":"status","message":"Processing video..."})

        import cv2 as _cv2
        from video_pipeline import MAX_VIDEO_DIM
        from pipeline import _trace_paths, _sort_paths, _smooth_and_scale
        from skimage.morphology import skeletonize as _skel
        import numpy as _np

        cap = _cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            await ws.send_json({"type":"error","message":"Cannot open video file"}); return

        src_fps   = cap.get(_cv2.CAP_PROP_FPS) or 30
        src_total = int(cap.get(_cv2.CAP_PROP_FRAME_COUNT))
        src_w     = int(cap.get(_cv2.CAP_PROP_FRAME_WIDTH))
        src_h     = int(cap.get(_cv2.CAP_PROP_FRAME_HEIGHT))
        scale     = min(MAX_VIDEO_DIM / max(src_w, src_h, 1), 1.0)
        out_w     = max(2, int(src_w * scale) & ~1)
        out_h     = max(2, int(src_h * scale) & ~1)
        total_out = min(src_total // max(skip, 1), 600)

        await ws.send_json({"type": "meta", "total_frames": total_out,
                            "width": out_w, "height": out_h, "fps": round(src_fps / skip, 1)})

        frame_idx = 0; sent = 0; prev_edges = None

        while True:
            ret, bgr = cap.read()
            if not ret: break
            if frame_idx % skip != 0: frame_idx += 1; continue

            bgr   = _cv2.resize(bgr, (out_w, out_h), interpolation=_cv2.INTER_AREA)
            clean = _cv2.bilateralFilter(bgr, 9, 75, 75)
            gray  = _cv2.cvtColor(clean, _cv2.COLOR_BGR2GRAY)
            clahe_v = _cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            gray  = clahe_v.apply(gray)
            fine_e  = _cv2.Canny(_cv2.GaussianBlur(gray,(3,3),0.8), 20, 60)
            coarse_e= _cv2.Canny(_cv2.GaussianBlur(gray,(7,7),2.0), 35, 100)
            edges   = _cv2.bitwise_or(coarse_e, fine_e)
            k_n  = _cv2.getStructuringElement(_cv2.MORPH_ELLIPSE, (3,3))
            edges= _cv2.bitwise_and(edges, _cv2.dilate(edges, k_n, iterations=1))

            if prev_edges is not None and smooth_v > 0:
                blended = _cv2.addWeighted(edges.astype("float32"), 1.0-smooth_v,
                    prev_edges.astype("float32"), smooth_v, 0).astype("uint8")
                _, edges = _cv2.threshold(blended, 60, 255, _cv2.THRESH_BINARY)
            prev_edges = edges.copy()

            k3   = _cv2.getStructuringElement(_cv2.MORPH_ELLIPSE, (3,3))
            dil  = _cv2.dilate(edges, k3, iterations=1)
            cl   = _cv2.morphologyEx(dil, _cv2.MORPH_CLOSE, k3, iterations=1)
            skel = _skel(cl > 0).astype("uint8") * 255

            paths = _trace_paths(skel, min_len=15)
            paths = _sort_paths(paths, out_h)
            paths = _smooth_and_scale(paths, 1.0, 1.0)
            paths = [p for p in paths if len(p) >= 4]
            if len(paths) > 300:
                paths = sorted(paths, key=len, reverse=True)[:300]

            await ws.send_json({"type": "frame", "frame_index": sent,
                                 "width": out_w, "height": out_h, "paths": paths})
            sent += 1; frame_idx += 1
            await asyncio.sleep(0)
            if sent >= 600: break

        cap.release()
        await ws.send_json({"type":"done","total_frames":sent})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        log.error(traceback.format_exc())
        try: await ws.send_json({"type":"error","message":str(e)})
        except: pass
    finally:
        if tmp_path and Path(tmp_path).exists():
            try: Path(tmp_path).unlink()
            except: pass


# ═══════════════════════════════════════════════════════════════
# WEBCAM ENDPOINT
# ═══════════════════════════════════════════════════════════════
@app.post("/api/webcam")
async def webcam_process(
    file:         UploadFile = File(...),
    detail_level: int  = Query(2, ge=1, le=5),
    max_strokes:  int  = Query(400, ge=10, le=1000),
    use_hed:      bool = Query(False),
):
    path = await _save_upload(file)
    try:
        import cv2 as _cv2
        import numpy as _np
        from skimage.morphology import skeletonize as _skel
        from pipeline import (_trace_paths, _sort_paths, _smooth_and_scale,
                               paths_to_svg, score_sketch)

        bgr = await asyncio.get_event_loop().run_in_executor(None, _load, str(path))
        oh, ow = bgr.shape[:2]
        scale = min(800 / max(oh, ow), 1.0)
        if scale < 1.0:
            bgr = _cv2.resize(bgr, (int(ow*scale), int(oh*scale)), interpolation=_cv2.INTER_AREA)
        ph, pw = bgr.shape[:2]

        ycrcb = _cv2.cvtColor(bgr, _cv2.COLOR_BGR2YCrCb)
        hsv   = _cv2.cvtColor(bgr, _cv2.COLOR_BGR2HSV)
        mask1 = _cv2.inRange(ycrcb, _np.array([0,133,77],dtype=_np.uint8), _np.array([255,173,127],dtype=_np.uint8))
        mask2 = _cv2.inRange(hsv,   _np.array([0,15,60], dtype=_np.uint8), _np.array([25,255,255], dtype=_np.uint8))
        mask3 = _cv2.inRange(hsv,   _np.array([0,10,40], dtype=_np.uint8), _np.array([30,200,255], dtype=_np.uint8))
        skin_mask = _cv2.bitwise_or(mask1, _cv2.bitwise_or(mask2, mask3))
        k_skin = _cv2.getStructuringElement(_cv2.MORPH_ELLIPSE, (20,20))
        skin_mask = _cv2.dilate(skin_mask, k_skin, iterations=3)
        skin_mask = _cv2.morphologyEx(skin_mask, _cv2.MORPH_CLOSE, k_skin, iterations=2)
        skin_coverage = float(_np.count_nonzero(skin_mask)) / (ph * pw)

        gray  = _cv2.cvtColor(bgr, _cv2.COLOR_BGR2GRAY)
        gamma = 1.4
        lut   = _np.array([min(255, int(((i/255.0)**gamma)*255)) for i in range(256)], dtype=_np.uint8)
        gray  = _cv2.LUT(gray, lut)
        clahe = _cv2.createCLAHE(clipLimit=4.0, tileGridSize=(4,4))
        gray  = clahe.apply(gray)
        gray  = _cv2.bilateralFilter(gray, 7, 50, 50)

        lo = [8,6,4,3,2][max(0,min(4,detail_level-1))]
        hi = [25,20,15,10,8][max(0,min(4,detail_level-1))]

        if use_hed:
            from pipeline import hed_edges
            edges = hed_edges(bgr)
            if edges is None:
                e1 = _cv2.Canny(_cv2.GaussianBlur(gray,(3,3),0.8), lo, hi)
                e2 = _cv2.Canny(_cv2.GaussianBlur(gray,(5,5),1.2), lo*2, hi*2)
                edges = _cv2.bitwise_or(e1, e2)
        else:
            e1    = _cv2.Canny(_cv2.GaussianBlur(gray,(3,3),0.8), lo,   hi)
            e2    = _cv2.Canny(_cv2.GaussianBlur(gray,(5,5),1.2), lo*2, hi*2)
            edges = _cv2.bitwise_or(e1, e2)

        if skin_coverage > 0.05:
            edges = _cv2.bitwise_and(edges, edges, mask=skin_mask)

        k3   = _cv2.getStructuringElement(_cv2.MORPH_ELLIPSE, (3,3))
        dil  = _cv2.dilate(edges, k3, iterations=1)
        cl   = _cv2.morphologyEx(dil, _cv2.MORPH_CLOSE, k3, iterations=1)
        skel = _skel(cl > 0).astype(_np.uint8) * 255

        paths = _trace_paths(skel, min_len=8)
        paths = _sort_paths(paths, ph)
        paths = _smooth_and_scale(paths, ow/pw, oh/ph)
        paths = [p for p in paths if len(p) >= 3]

        if len(paths) > max_strokes:
            step  = len(paths) / max_strokes
            paths = [paths[int(i*step)] for i in range(max_strokes)]

        svg     = paths_to_svg(paths, ow, oh)
        quality = score_sketch(paths, ow, oh)

        return JSONResponse({"width": ow, "height": oh, "paths": paths, "total": len(paths),
                             "engine": "hed" if use_hed else "canny_webcam",
                             "svg": svg, "quality": quality, "warnings": []})
    except Exception as e:
        log.error(traceback.format_exc())
        raise HTTPException(500, f"Webcam processing failed: {e}")


@app.websocket("/api/video/stream/{job_id}")
async def video_stream(ws: WebSocket, job_id: str):
    await ws.accept()
    try:
        for _ in range(20):
            if job_id in _video_jobs: break
            await asyncio.sleep(0.5)

        job = _video_jobs.get(job_id)
        if not job:
            await ws.send_json({"type":"error","message":f"Job {job_id[:8]} not found"}); return

        input_path = job.get("input_path")
        if not input_path or not Path(input_path).exists():
            await ws.send_json({"type":"error","message":"Video file not found"}); return

        skip       = int(job.get("frame_skip",      3))
        hed        = bool(job.get("use_hed",         False))
        dl         = int(job.get("detail_level",     3))
        smooth_val = float(job.get("temporal_smooth",0.4))

        import cv2 as _cv2
        from video_pipeline import _edges_for_frame, MAX_VIDEO_DIM
        from pipeline import _trace_paths, _sort_paths, _smooth_and_scale
        from skimage.morphology import skeletonize as _skel

        cap = _cv2.VideoCapture(input_path)
        if not cap.isOpened():
            await ws.send_json({"type":"error","message":"Cannot open video"}); return

        src_fps   = cap.get(_cv2.CAP_PROP_FPS) or 30
        src_total = int(cap.get(_cv2.CAP_PROP_FRAME_COUNT))
        src_w     = int(cap.get(_cv2.CAP_PROP_FRAME_WIDTH))
        src_h     = int(cap.get(_cv2.CAP_PROP_FRAME_HEIGHT))
        scale     = min(MAX_VIDEO_DIM / max(src_w, src_h, 1), 1.0)
        out_w     = max(2, int(src_w * scale) & ~1)
        out_h     = max(2, int(src_h * scale) & ~1)
        total_out = min(src_total // max(skip, 1), 600)

        await ws.send_json({"type": "meta", "total_frames": total_out,
                            "width": out_w, "height": out_h, "fps": round(src_fps / skip, 1)})

        frame_idx = 0; sent = 0; prev_edges = None

        while True:
            ret, bgr = cap.read()
            if not ret: break
            if frame_idx % skip != 0: frame_idx += 1; continue

            lo = [30,20,12,7,4][max(0,min(4,dl-1))]
            hi = [90,65,40,25,15][max(0,min(4,dl-1))]
            bgr   = _cv2.resize(bgr, (out_w, out_h), interpolation=_cv2.INTER_AREA)
            edges = _edges_for_frame(bgr, hed, lo, hi)

            if prev_edges is not None and smooth_val > 0:
                edges = _cv2.addWeighted(edges.astype("float32"), 1.0-smooth_val,
                    prev_edges.astype("float32"), smooth_val, 0).astype("uint8")
                _, edges = _cv2.threshold(edges, 64, 255, _cv2.THRESH_BINARY)
            prev_edges = edges.copy()

            k3   = _cv2.getStructuringElement(_cv2.MORPH_ELLIPSE, (3,3))
            skel = _skel(_cv2.morphologyEx(_cv2.dilate(edges, k3), _cv2.MORPH_CLOSE, k3) > 0).astype("uint8") * 255
            paths = _trace_paths(skel, min_len=6)
            paths = _sort_paths(paths, out_h)
            paths = _smooth_and_scale(paths, 1.0, 1.0)
            if len(paths) > 300:
                step = len(paths)/300; paths = [paths[int(i*step)] for i in range(300)]

            await ws.send_json({"type": "frame", "frame_index": sent,
                                 "width": out_w, "height": out_h, "paths": paths})
            sent += 1; frame_idx += 1
            await asyncio.sleep(0)
            if sent >= 600: break

        cap.release()
        await ws.send_json({"type":"done","total_frames":sent})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        log.error(traceback.format_exc())
        try: await ws.send_json({"type":"error","message":str(e)})
        except: pass


# ═══════════════════════════════════════════════════════════════
# AUTH + GALLERY
# ═══════════════════════════════════════════════════════════════
@app.post("/api/auth/register")
async def register(body: RegisterBody):
    if body.username in _users: raise HTTPException(400, "Username already taken")
    if len(body.password) < 4:  raise HTTPException(400, "Password too short (min 4 chars)")
    uid = str(uuid.uuid4())
    _users[body.username]   = {"id": uid, "hashed_pw": _hash_pw(body.password)}
    _gallery[uid]           = []
    token = _make_token(body.username)
    return {"access_token": token, "token_type": "bearer", "username": body.username}

@app.post("/api/auth/login")
async def login_ep(form: OAuth2PasswordRequestForm = Depends()):
    user = _users.get(form.username)
    if not user or user["hashed_pw"] != _hash_pw(form.password):
        raise HTTPException(401, "Incorrect username or password")
    token = _make_token(form.username)
    return {"access_token": token, "token_type": "bearer", "username": form.username}

@app.get("/api/gallery")
async def get_gallery(username: Optional[str] = Depends(_get_user)):
    if not username: raise HTTPException(401, "Login required")
    uid = _users[username]["id"]
    return {"sketches": _gallery.get(uid, []), "count": len(_gallery.get(uid, []))}

@app.post("/api/gallery")
async def save_sketch_ep(body: SaveSketchBody, username: Optional[str] = Depends(_get_user)):
    if not username: raise HTTPException(401, "Login required")
    uid    = _users[username]["id"]
    record = {"id": str(uuid.uuid4()), "name": body.name,
               "engine": body.engine, "paths": body.paths,
               "created_at": datetime.utcnow().isoformat(),
               "svg_preview": body.svg[:500]}
    _gallery.setdefault(uid, []).append(record)
    return {"saved": True, "id": record["id"]}

@app.delete("/api/gallery/{sketch_id}")
async def delete_sketch_ep(sketch_id: str, username: Optional[str] = Depends(_get_user)):
    if not username: raise HTTPException(401, "Login required")
    uid    = _users[username]["id"]
    before = len(_gallery.get(uid, []))
    _gallery[uid] = [s for s in _gallery.get(uid, []) if s["id"] != sketch_id]
    if len(_gallery[uid]) == before: raise HTTPException(404, "Sketch not found")
    return {"deleted": True}



# ═══════════════════════════════════════════════════════════════
# TEXT-TO-SKETCH  —  prompt → image → paths → animated sketch
# ═══════════════════════════════════════════════════════════════

from text_to_sketch import text_to_sketch_async, sd_available

# ═══════════════════════════════════════════════════════════════
# COLORIZE ENDPOINT  — intelligent region-based human-like coloring
# ═══════════════════════════════════════════════════════════════
@app.post("/api/colorize")
async def colorize(
    sketch_file: UploadFile = File(..., description="Sketch / edge image (white bg, black lines)"),
    source_file: UploadFile = File(..., description="Original color image for color sampling"),
    n_passes:    int  = Query(4, ge=1, le=4, description="Number of coloring passes (1-4)"),
    min_region:  int  = Query(120, ge=20, le=2000, description="Minimum region size in pixels"),
):
    """
    Intelligent human-like coloring.

    Accepts:
      - sketch_file : the sketch/edge image (black lines on white)
      - source_file : the original color image (used for color sampling)

    Returns JSON with stroke descriptors for the frontend DrawingCanvas.
    """
    sketch_path = await _save_upload(sketch_file)
    source_path = await _save_upload(source_file)

    log.info(f"colorize: sketch={sketch_file.filename} source={source_file.filename} "
             f"passes={n_passes} min_region={min_region}")

    try:
        def _run():
            import cv2 as _cv2
            from color_segmentation import segment_image
            from human_fill_engine import generate_all_coloring

            sketch_bgr = _load(str(sketch_path))
            source_bgr = _load(str(source_path))

            if sketch_bgr is None or source_bgr is None:
                raise ValueError("Could not load one or both images")

            h, w = sketch_bgr.shape[:2]

            # Resize source to match sketch dimensions
            if source_bgr.shape[:2] != (h, w):
                source_bgr = _cv2.resize(
                    source_bgr, (w, h), interpolation=_cv2.INTER_AREA
                )

            # Build edge mask from sketch (dark pixels = edges)
            gray = _cv2.cvtColor(sketch_bgr, _cv2.COLOR_BGR2GRAY)
            _, edge_mask = _cv2.threshold(gray, 200, 255, _cv2.THRESH_BINARY_INV)

            # Segment into color regions
            regions = segment_image(
                source_bgr,
                edge_mask=edge_mask,
                min_size=min_region,
            )

            if not regions:
                return {"strokes": [], "regions": 0, "width": w, "height": h,
                        "message": "No regions detected — try a lower min_region value"}

            # Generate human-like strokes
            strokes = generate_all_coloring(
                regions, w, h,
                edge_mask=edge_mask,
                n_passes=n_passes,
            )

            return {
                "strokes":  strokes,
                "regions":  len(regions),
                "width":    w,
                "height":   h,
                "message":  f"{len(regions)} regions, {len(strokes)} strokes",
            }

        result = await asyncio.get_event_loop().run_in_executor(None, _run)
        return JSONResponse(result)

    except Exception as e:
        log.error(traceback.format_exc())
        raise HTTPException(500, f"Colorize failed: {e}")
    finally:
        for p in [sketch_path, source_path]:
            try:
                Path(p).unlink(missing_ok=True)
            except Exception:
                pass


@app.get("/api/text2sketch/status")
async def text2sketch_status():
    """Check which image generators are available."""
    try:
        import urllib.request
        urllib.request.urlopen("https://image.pollinations.ai", timeout=3)
        pollinations_ok = True
    except Exception:
        pollinations_ok = False

    return {
        "sd_available":           sd_available(),
        "pollinations_available": pollinations_ok,
        "recommended":            "sd" if sd_available() else "pollinations",
    }


@app.websocket("/api/text2sketch/ws")
async def text2sketch_ws(
    ws:              WebSocket,
    prompt:          str   = Query(...),
    negative_prompt: str   = Query(""),
    pen_style:       str   = Query("pencil"),
    detail_level:    int   = Query(3,   ge=1,    le=5),
    max_strokes:     int   = Query(700, ge=10,   le=3000),
    use_hed:         bool  = Query(False),
    coloring_book:   bool  = Query(False),
    crosshatch:      bool  = Query(False),
    width:           int   = Query(512, ge=256,  le=1024),
    height:          int   = Query(512, ge=256,  le=1024),
    steps:           int   = Query(20,  ge=5,    le=50),
    guidance:        float = Query(7.5, ge=1.0,  le=20.0),
    seed:            Optional[int] = Query(None),
    generator:       str   = Query("auto"),  # "auto" | "sd" | "pollinations"
):
    """
    WebSocket endpoint for text-to-sketch animation.

    Flow:
      1. Client connects (no body needed — params in query string)
      2. Server streams: status → image_ready → meta → chunks → start_draw → done
      3. Client feeds paths to DrawingCanvas as they arrive
    """
    await ws.accept()
    log.info(f"[T2S-WS] '{prompt[:60]}' gen={generator} steps={steps}")
    t0 = time.time()

    try:
        # ── status callback → WebSocket ──────────────────────
        async def send_status(msg: str):
            try:
                await ws.send_json({"type": "status", "message": msg})
            except Exception:
                pass

        # We need a sync callback that schedules the async send
        import concurrent.futures
        loop = asyncio.get_event_loop()

        def on_status(msg: str):
            # Safe to call from executor thread
            asyncio.run_coroutine_threadsafe(send_status(msg), loop)

        # ── Run generation + edge extraction in thread ────────
        await send_status("Generating image…")

        result = await text_to_sketch_async(
            prompt          = prompt,
            negative_prompt = negative_prompt,
            pen_style       = pen_style,
            detail_level    = detail_level,
            max_strokes     = max_strokes,
            use_hed         = use_hed,
            coloring_book   = coloring_book,
            crosshatch      = crosshatch,
            width           = width,
            height          = height,
            steps           = steps,
            guidance        = guidance,
            seed            = seed,
            generator       = generator,
            on_status       = on_status,
        )

        # ── Send generated image preview ──────────────────────
        await ws.send_json({
            "type":      "image_ready",
            "image_b64": result.get("generated_image_b64", ""),
            "generator": result.get("generator", "unknown"),
            "prompt":    result.get("prompt", ""),
        })

        # ── Send canvas dimensions + total stroke count ───────
        paths = result["paths"]
        await ws.send_json({
            "type":   "meta",
            "width":  result["width"],
            "height": result["height"],
            "total":  len(paths),
            "engine": result["engine"],
        })

        # ── Stream paths in chunks of 20 ─────────────────────
        for i in range(0, len(paths), 20):
            await ws.send_json({
                "type":  "chunk",
                "paths": paths[i:i + 20],
            })
            await asyncio.sleep(0)  # yield to event loop

        # ── Signal frontend to start drawing animation ────────
        await ws.send_json({"type": "start_draw"})

        # ── Final done message ────────────────────────────────
        await ws.send_json({
            "type":      "done",
            "total":     len(paths),
            "engine":    result["engine"],
            "generator": result.get("generator"),
            "seed":      seed,
            "time_ms":   int((time.time() - t0) * 1000),
            "svg":       result.get("svg", ""),
            "quality":   result.get("quality", {}),
        })

        log.info(f"[T2S-WS] Done — {len(paths)} paths in {time.time()-t0:.1f}s")

    except WebSocketDisconnect:
        log.info("[T2S-WS] Client disconnected")
    except Exception as e:
        log.error(f"[T2S-WS] Error: {e}")
        log.error(traceback.format_exc())
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


if __name__ == "__main__":
    print("\n" + "="*60)
    print("  AI Sketch Studio v6.2 + Video + Text-to-Sketch")
    print("  http://127.0.0.1:8002/api/health")
    print()
    print("  POST /api/process              image sketch")
    print("  WS   /api/ws                   streaming sketch")
    print("  GET  /api/text2sketch/status   check generators")
    print("  WS   /api/text2sketch/ws       text-to-sketch stream")
    print("  POST /api/video/process        start video job")
    print("  GET  /api/video/status/{id}    poll progress")
    print("  GET  /api/video/download/{id}  download result")
    print("  POST /api/export/svg|pdf       export formats")
    print("  POST /api/batch                batch images -> zip")
    print("  POST /api/auth/register|login")
    print("  GET  /api/gallery              saved sketches")
    print("="*60 + "\n")
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8002, reload=False)





