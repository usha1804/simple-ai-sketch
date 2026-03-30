"""
video_pipeline.py — Video to Sketch
Converts any video file into a sketched video, frame by frame.

Features:
- Canny or HED edge detection per frame
- Temporal smoothing (blends edges between frames, stops flickering)
- Output as MP4 (sketched video) or GIF (animated)
- Progress callback for WebSocket streaming
- Frame skip for faster processing
- Thumbnail preview of first sketched frame
"""

import cv2
import numpy as np
import tempfile
import os
from pathlib import Path

# reuse edge detection from main pipeline
try:
    from pipeline import hed_edges, descreen, detect_screen_photo
except ImportError:
    def hed_edges(bgr): return None
    def descreen(bgr): return bgr
    def detect_screen_photo(bgr): return False, 0, []

MAX_VIDEO_DIM  = 720    # resize to this width max
MAX_FRAMES     = 600    # cap at 600 frames (~20s at 30fps) to avoid huge files
DEFAULT_FPS    = 24


def _edges_for_frame(bgr: np.ndarray, use_hed: bool,
                     lo: int, hi: int) -> np.ndarray:
    """Return a clean edge map for one video frame."""
    gray  = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    lab   = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    L     = lab[:, :, 0]
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    gray  = clahe.apply(gray)
    L     = clahe.apply(L)
    gray_b = cv2.bilateralFilter(gray, 7, 60, 60)
    L_b    = cv2.bilateralFilter(L,    7, 60, 60)

    if use_hed:
        edges = hed_edges(bgr)
        if edges is not None:
            return edges

    # Canny multi-pass
    e1 = cv2.Canny(cv2.GaussianBlur(gray_b, (5, 5), 1.2), lo, hi)
    e2 = cv2.Canny(cv2.GaussianBlur(L_b,    (5, 5), 1.2), lo, hi)
    e3 = cv2.Canny(cv2.GaussianBlur(gray_b, (3, 3), 0.8), lo//2, hi//2)
    return e1 | e2 | e3


def _edge_to_sketch_frame(edges: np.ndarray) -> np.ndarray:
    """Convert binary edge map to white-paper pencil-sketch BGR frame."""
    # Invert: edges become dark lines on white background
    inv  = cv2.bitwise_not(edges)
    # Slight blur to soften the hard binary edges into pencil-like strokes
    soft = cv2.GaussianBlur(inv, (3, 3), 0.8)
    # Convert to BGR
    bgr  = cv2.cvtColor(soft, cv2.COLOR_GRAY2BGR)
    return bgr


def process_video(
    input_path:      str,
    output_path:     str,
    use_hed:         bool  = False,
    detail_level:    int   = 3,
    frame_skip:      int   = 1,       # process every N-th frame
    temporal_smooth: float = 0.4,     # 0=no smoothing, 1=full smoothing
    output_format:   str   = "mp4",   # "mp4" or "gif"
    on_progress=None,                 # callback(pct: int, frame: int, total: int)
) -> dict:
    """
    Convert a video file to a sketched video.

    Args:
        input_path:      Path to source video
        output_path:     Path for output file (.mp4 or .gif)
        use_hed:         Use HED neural network (slower but better)
        detail_level:    1-5 edge sensitivity
        frame_skip:      Process every N frames (1=all, 2=half, 3=third...)
        temporal_smooth: Blend prev/current edges to reduce flicker (0-1)
        output_format:   "mp4" or "gif"
        on_progress:     Optional callback(pct, frame_num, total_frames)

    Returns:
        dict with stats: frames_processed, fps, width, height, duration_s, output_path
    """
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {input_path}")

    src_fps    = cap.get(cv2.CAP_PROP_FPS) or 30
    src_total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    src_w      = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h      = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Clamp frames
    total_to_read = min(src_total, MAX_FRAMES * frame_skip)

    # Resize dimensions
    scale = min(MAX_VIDEO_DIM / max(src_w, src_h), 1.0)
    out_w  = int(src_w * scale) & ~1   # must be even for MP4
    out_h  = int(src_h * scale) & ~1

    out_fps = max(1, src_fps / frame_skip)

    lo = [30, 20, 12, 7, 4][max(0, min(4, detail_level - 1))]
    hi = [90, 65, 40, 25, 15][max(0, min(4, detail_level - 1))]

    print(f"[Video] {src_w}x{src_h} {src_fps:.1f}fps  ->  "
          f"{out_w}x{out_h} {out_fps:.1f}fps  "
          f"use_hed={use_hed} skip={frame_skip} smooth={temporal_smooth}")

    # ── Writer setup ────────────────────────────────────────────
    if output_format == "gif":
        gif_frames = []
    else:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(output_path, fourcc, out_fps, (out_w, out_h))
        if not writer.isOpened():
            cap.release()
            raise RuntimeError("VideoWriter failed to open. Check output path.")

    # ── First frame thumbnail ───────────────────────────────────
    thumbnail_b64 = ""

    prev_edges = None
    frames_written = 0
    frame_idx  = 0

    while frame_idx < total_to_read:
        ret, bgr = cap.read()
        if not ret:
            break

        # Skip frames
        if frame_idx % frame_skip != 0:
            frame_idx += 1
            continue

        # Resize
        bgr = cv2.resize(bgr, (out_w, out_h), interpolation=cv2.INTER_AREA)

        # Edge detection
        edges = _edges_for_frame(bgr, use_hed, lo, hi)

        # Temporal smoothing — blend with previous frame's edges
        if prev_edges is not None and temporal_smooth > 0:
            edges = cv2.addWeighted(
                edges.astype(np.float32), 1.0 - temporal_smooth,
                prev_edges.astype(np.float32), temporal_smooth, 0
            ).astype(np.uint8)
            # Re-threshold after blending
            _, edges = cv2.threshold(edges, 64, 255, cv2.THRESH_BINARY)

        prev_edges = edges.copy()

        # Convert to sketch frame
        sketch = _edge_to_sketch_frame(edges)

        # Save thumbnail from first frame
        if frames_written == 0:
            import base64, io
            _, buf = cv2.imencode('.jpg', sketch, [cv2.IMWRITE_JPEG_QUALITY, 80])
            thumbnail_b64 = base64.b64encode(buf.tobytes()).decode()

        if output_format == "gif":
            # Convert BGR to RGB for imageio
            gif_frames.append(cv2.cvtColor(sketch, cv2.COLOR_BGR2RGB))
        else:
            writer.write(sketch)

        frames_written += 1
        frame_idx      += 1

        # Progress callback
        # if on_progress and frame_idx % 10 == 0:
        #     pct = int(frame_idx / total_to_read * 100)
        #     on_progress(pct, frames_written, total_to_read // frame_skip)
        if on_progress:
             pct = int(frame_idx / max(total_to_read, 1) * 100)
             on_progress(pct, frames_written, total_to_read // frame_skip)
    
    cap.release()

    if output_format == "gif":
        try:
            import imageio
            imageio.mimsave(output_path, gif_frames, fps=out_fps, loop=0)
            print(f"[Video] GIF saved: {frames_written} frames")
        except ImportError:
            raise RuntimeError("imageio not installed — pip install imageio")
    else:
        writer.release()
        # Re-encode with ffmpeg for better compatibility if available
        _reencode_mp4(output_path)
        print(f"[Video] MP4 saved: {frames_written} frames at {out_fps:.1f}fps")

    if on_progress:
        on_progress(100, frames_written, frames_written)

    duration_s = frames_written / out_fps
    return {
        "frames_processed": frames_written,
        "fps":              round(out_fps, 1),
        "width":            out_w,
        "height":           out_h,
        "duration_s":       round(duration_s, 1),
        "output_path":      output_path,
        "thumbnail_b64":    thumbnail_b64,
        "engine":           "hed" if use_hed else "canny",
    }


def _reencode_mp4(path: str):
    """Re-encode with ffmpeg for browser-compatible H.264 if available."""
    import subprocess
    tmp = path + ".tmp.mp4"
    try:
        result = subprocess.run([
            "ffmpeg", "-y", "-i", path,
            "-vcodec", "libx264", "-crf", "23",
            "-preset", "fast", "-pix_fmt", "yuv420p",
            tmp
        ], capture_output=True, timeout=300)
        if result.returncode == 0 and os.path.exists(tmp):
            os.replace(tmp, path)
            print("[Video] ffmpeg re-encode OK")
        else:
            print("[Video] ffmpeg not available — using raw mp4v")
            if os.path.exists(tmp):
                os.remove(tmp)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        print("[Video] ffmpeg not found — using raw mp4v (may not play in all browsers)")
        if os.path.exists(tmp):
            os.remove(tmp)


def extract_frames_as_sketches(
    input_path:   str,
    output_dir:   str,
    use_hed:      bool = False,
    detail_level: int  = 3,
    frame_skip:   int  = 5,
    on_progress=None,
) -> dict:
    """
    Extract individual sketch frames as JPEG files.
    Useful for GIF creation or frame-by-frame inspection.
    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {input_path}")

    src_fps   = cap.get(cv2.CAP_PROP_FPS) or 30
    src_total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    src_w     = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h     = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    scale     = min(MAX_VIDEO_DIM / max(src_w, src_h), 1.0)
    out_w     = int(src_w * scale)
    out_h     = int(src_h * scale)

    lo = [30, 20, 12, 7, 4][max(0, min(4, detail_level - 1))]
    hi = [90, 65, 40, 25, 15][max(0, min(4, detail_level - 1))]

    saved, frame_idx = 0, 0
    total_to_read    = min(src_total, MAX_FRAMES * frame_skip)

    while frame_idx < total_to_read:
        ret, bgr = cap.read()
        if not ret: break
        if frame_idx % frame_skip == 0:
            bgr    = cv2.resize(bgr, (out_w, out_h), interpolation=cv2.INTER_AREA)
            edges  = _edges_for_frame(bgr, use_hed, lo, hi)
            sketch = _edge_to_sketch_frame(edges)
            fname  = os.path.join(output_dir, f"frame_{saved:04d}.jpg")
            cv2.imwrite(fname, sketch, [cv2.IMWRITE_JPEG_QUALITY, 90])
            saved += 1
            if on_progress and saved % 5 == 0:
                pct = int(frame_idx / total_to_read * 100)
                on_progress(pct, saved, total_to_read // frame_skip)
        frame_idx += 1

    cap.release()
    if on_progress: on_progress(100, saved, saved)
    return {"frames_saved": saved, "output_dir": output_dir,
            "fps": src_fps / frame_skip}