"""
text_to_sketch.py – Updated for 2026 Pollinations + Better Placeholder + Stronger Edges
"""

import asyncio
import base64
import io
import logging
import time
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Callable, Optional

import cv2
import numpy as np

log = logging.getLogger(__name__)

# ── Optional SD import ────────────────────────────────────────
_sd_pipe        = None
_sd_loaded      = False
_sd_load_error  = ""


def _try_load_sd():
    global _sd_pipe, _sd_loaded, _sd_load_error
    if _sd_loaded:
        return _sd_pipe is not None

    _sd_loaded = True
    try:
        import torch
        from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler

        model_id = "runwayml/stable-diffusion-v1-5"
        dtype    = torch.float16 if torch.cuda.is_available() else torch.float32
        device   = "cuda" if torch.cuda.is_available() else "cpu"

        log.info(f"[T2S] Loading SD model on {device}...")
        pipe = StableDiffusionPipeline.from_pretrained(
            model_id, torch_dtype=dtype, safety_checker=None, requires_safety_checker=False
        )
        pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
        pipe = pipe.to(device)

        if hasattr(pipe, "enable_attention_slicing"):
            pipe.enable_attention_slicing()
        try:
            pipe.enable_xformers_memory_efficient_attention()
        except Exception:
            pass

        _sd_pipe = pipe
        log.info(f"[T2S] SD ready on {device}")
        return True
    except Exception as e:
        _sd_load_error = str(e)
        log.warning(f"[T2S] SD not available: {e}")
        return False


def sd_available() -> bool:
    return _try_load_sd()


# ── Better Placeholder with more edges ────────────────────────
def _generate_placeholder(prompt: str, width: int, height: int) -> np.ndarray:
    """Improved placeholder with many random sketch-like strokes."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 250

    # Text
    words = prompt.split()[:8]
    for i, word in enumerate(words):
        y = 80 + i * 45
        cv2.putText(img, word[:20], (40, y), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (60, 60, 60), 2, cv2.LINE_AA)

    # Many random sketch lines
    rng = np.random.default_rng(hash(prompt) % (2**32))
    for _ in range(180):   # Increased for more edges
        x1 = rng.integers(20, width-20)
        y1 = rng.integers(20, height-20)
        x2 = rng.integers(20, width-20)
        y2 = rng.integers(20, height-20)
        thickness = rng.integers(1, 3)
        cv2.line(img, (x1, y1), (x2, y2), (90, 90, 90), thickness, cv2.LINE_AA)

    # Add some curves / circles for variety
    for _ in range(25):
        cx = rng.integers(50, width-50)
        cy = rng.integers(50, height-50)
        r = rng.integers(15, 60)
        cv2.circle(img, (cx, cy), r, (100, 100, 100), 1, cv2.LINE_AA)

    return img


# ── Pollinations (updated – may still need key; fallback is strong) ──
def _generate_with_pollinations(prompt: str, width: int, height: int, seed: Optional[int]) -> np.ndarray:
    sketch_prompt = f"{prompt}, pencil sketch, black and white line drawing, hand-drawn artistic illustration, clean detailed lines"
    encoded = urllib.parse.quote(sketch_prompt)

    params = f"width={width}&height={height}&nologo=true&nofeed=true"
    if seed is not None:
        params += f"&seed={seed}"

    url = f"https://image.pollinations.ai/prompt/{encoded}?{params}"
    log.info(f"[T2S] Trying Pollinations...")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AISketchStudio/1.0"})
        with urllib.request.urlopen(req, timeout=45) as resp:
            img_bytes = resp.read()

        arr = np.frombuffer(img_bytes, np.uint8)
        bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if bgr is not None:
            log.info(f"[T2S] Pollinations success ({len(img_bytes)//1024} KB)")
            return bgr
    except Exception as e:
        log.warning(f"[T2S] Pollinations failed: {e}")

    # Fallback to improved placeholder
    log.info("[T2S] Using enhanced placeholder")
    return _generate_placeholder(prompt, width, height)


# ── Prompt enhancement (unchanged) ─────────────────────────────
STYLE_PROMPTS = { ... }  # keep your existing STYLE_PROMPTS and NEGATIVE_PROMPTS

def enhance_prompt(prompt: str, pen_style: str = "pencil", use_hed: bool = False, coloring_book: bool = False) -> str:
    style = STYLE_PROMPTS.get(pen_style, STYLE_PROMPTS["pencil"])
    if coloring_book:
        style = "coloring book page, thick clean outlines, no shading, black and white"
    elif use_hed:
        style = "detailed pencil sketch, fine hatching, realistic sketch"
    return f"{prompt}, {style}, white background, high contrast"


# ── Main function (simplified import) ──────────────────────────
def text_to_sketch(
    prompt: str,
    detail_level: int = 3,
    max_strokes: int = 600,
    pen_style: str = "pencil",
    use_hed: bool = False,
    coloring_book: bool = False,
    crosshatch: bool = False,
    width: int = 512,
    height: int = 512,
    steps: int = 20,
    guidance: float = 7.5,
    seed: Optional[int] = None,
    generator: str = "auto",
    negative_prompt: str = "",
    on_status: Optional[Callable[[str], None]] = None,
) -> dict:
    from pipeline import run_pipeline, colouring_book_edges, paths_to_svg, score_sketch

    detail_level = max(1, min(5, int(detail_level)))
    max_strokes = max(10, min(3000, int(max_strokes)))
    width = max(256, min(1024, int(width)))
    height = max(256, min(1024, int(height)))

    def status(msg: str):
        log.info(f"[T2S] {msg}")
        if on_status:
            on_status(msg)

    status("Enhancing prompt...")
    enhanced = enhance_prompt(prompt, pen_style, use_hed, coloring_book)

    # Generate image
    bgr = None
    used_generator = "placeholder"

    if generator in ("auto", "sd") and sd_available():
        status("Generating with Stable Diffusion...")
        try:
            bgr = _generate_with_sd(enhanced, negative_prompt, width, height, steps, guidance, seed)
            used_generator = "stable_diffusion"
        except Exception as e:
            log.warning(f"SD failed: {e}")

    if bgr is None:
        status("Generating image...")
        bgr = _generate_with_pollinations(enhanced, width, height, seed)
        used_generator = "pollinations" if "pollinations" in str(bgr) else "placeholder"  # rough check

    status(f"Image ready ({bgr.shape[1]}×{bgr.shape[0]}) via {used_generator}")

    # Save temp file
    import tempfile, os
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    cv2.imwrite(tmp.name, bgr)
    tmp_path = tmp.name
    tmp.close()

    # Run pipeline
    status(f"Extracting sketch edges (detail={detail_level})...")
    try:
        result = run_pipeline(
            image_path=tmp_path,
            detail_level=detail_level,
            max_strokes=max_strokes,
            use_hed=use_hed,
            remove_bg=False,
            coloring_book=coloring_book,
            crosshatch=crosshatch,
            paper_texture=False,
            watercolour=False,
            webcam=False,
        )
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass

    # Metadata
    result["prompt"] = prompt
    result["enhanced_prompt"] = enhanced
    result["generator"] = used_generator
    result["engine"] = f"t2s_{used_generator}"
    result["generation_params"] = {"steps": steps, "guidance": guidance, "seed": seed, "width": width, "height": height}

    _, enc = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
    result["generated_image_b64"] = base64.b64encode(enc.tobytes()).decode()

    status(f"Done — {result.get('total', 0)} strokes")
    return result


async def text_to_sketch_async(prompt: str, **kwargs) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: text_to_sketch(prompt, **kwargs))