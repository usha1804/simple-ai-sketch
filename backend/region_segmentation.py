"""
region_segmentation.py
──────────────────────
Detects closed regions between sketch strokes.
Returns a list of Region objects with pixel sets, bounding boxes, and image colors.
Uses pure BFS — no flood fill, no leaking between regions.
"""

import cv2
import numpy as np
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Region:
    """One closed region between strokes."""
    pixels:    np.ndarray    # flat pixel indices (y*w + x)
    color_bgr: np.ndarray    # average BGR color from original image
    bbox:      tuple         # (x0, y0, x1, y1)
    size:      int           # pixel count
    mask:      np.ndarray    # bool mask same size as canvas (h, w)


# Pixel is "stroke/boundary" if ANY channel ≤ this threshold.
# 175 catches anti-aliased grey edges (not just pure black).
STROKE_THR = 175
MIN_REGION = 80   # ignore regions smaller than this


def detect_regions(
    canvas_bgr: np.ndarray,
    source_bgr: np.ndarray,
    min_size:   int = MIN_REGION,
) -> List[Region]:
    """
    Detect all closed white regions in canvas_bgr.
    Source_bgr is the original image — used for color sampling.
    Both must be the same spatial size.

    Returns list of Region sorted largest→smallest.
    """
    h, w   = canvas_bgr.shape[:2]
    total  = h * w
    gray   = cv2.cvtColor(canvas_bgr, cv2.COLOR_BGR2GRAY)

    # ── Build visited array: mark all stroke pixels ───────────────
    # A pixel is "stroke" if ANY channel ≤ STROKE_THR
    vis = np.zeros(total, dtype=np.uint8)
    flat = canvas_bgr.reshape(-1, 3)
    stroke_mask = np.any(flat <= STROKE_THR, axis=1)
    vis[stroke_mask] = 1

    # ── BFS region extraction ─────────────────────────────────────
    regions = []

    for start in range(total):
        if vis[start]:
            continue

        # BFS — find entire connected white island
        bfs    = [start]
        vis[start] = 1
        qi     = 0
        pixels = []

        while qi < len(bfs):
            pos = bfs[qi]; qi += 1
            pixels.append(pos)

            px = pos % w
            py = pos // w

            # 4-connected neighbours
            if px > 0    and not vis[pos-1]:   vis[pos-1]=1;   bfs.append(pos-1)
            if px < w-1  and not vis[pos+1]:   vis[pos+1]=1;   bfs.append(pos+1)
            if py > 0    and not vis[pos-w]:   vis[pos-w]=1;   bfs.append(pos-w)
            if py < h-1  and not vis[pos+w]:   vis[pos+w]=1;   bfs.append(pos+w)

        if len(pixels) < min_size:
            continue

        px_arr = np.array(pixels, dtype=np.int32)

        # ── Bounding box ──────────────────────────────────────────
        xs = px_arr % w
        ys = px_arr // w
        x0, x1 = int(xs.min()), int(xs.max())
        y0, y1 = int(ys.min()), int(ys.max())

        # ── Sample average color from SOURCE image ────────────────
        color_bgr = _sample_color(px_arr, source_bgr, w, h)

        # ── Region mask ───────────────────────────────────────────
        mask = np.zeros((h, w), dtype=bool)
        mask[ys, xs] = True

        regions.append(Region(
            pixels    = px_arr,
            color_bgr = color_bgr,
            bbox      = (x0, y0, x1, y1),
            size      = len(pixels),
            mask      = mask,
        ))

    # Sort largest first (natural fill order)
    regions.sort(key=lambda r: r.size, reverse=True)
    print(f"[RegionSeg] Found {len(regions)} regions "
          f"(min_size={min_size}, canvas={w}×{h})")
    return regions


def _sample_color(
    px_arr: np.ndarray,
    source: np.ndarray,
    cw: int, ch: int,
    bg_thr: int = 235,
    sample_step: int = 4,
) -> np.ndarray:
    """
    Average BGR color across region pixels from source image.
    Skips near-white (background) pixels.
    Returns BGR array.
    """
    xs = px_arr[::sample_step] % cw
    ys = px_arr[::sample_step] // cw

    # Clamp to source dimensions (may differ from canvas if scaled)
    src_h, src_w = source.shape[:2]
    sx = np.clip(np.round(xs * src_w / cw).astype(int), 0, src_w-1)
    sy = np.clip(np.round(ys * src_h / ch).astype(int), 0, src_h-1)

    colors = source[sy, sx]  # shape (N, 3) BGR

    # Mask out background (near-white)
    not_bg = np.any(colors < bg_thr, axis=1)
    if not_bg.sum() > 0:
        colors = colors[not_bg]

    avg = colors.mean(axis=0)  # BGR

    # Lighten slightly — pencil-on-paper effect
    lighten = 0.18
    result  = np.clip(avg * (1-lighten) + 255*lighten, 0, 255).astype(np.uint8)
    return result