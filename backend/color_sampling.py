"""
color_sampling.py
─────────────────
Extracts the dominant color for each region using K-means clustering.

Key behaviours:
  - Uses INTERIOR pixels only (avoids neon/bright edge contamination)
  - K-means with k=2 or k=3 → picks the most representative cluster
  - Skips near-white background pixels
  - Applies a subtle lightening for pencil-on-paper feel
  - Falls back to mean color if K-means fails or region is too small
"""

import cv2
import numpy as np
from typing import Optional


# ── Constants ─────────────────────────────────────────────────────
BG_THRESH    = 235    # pixel is background if ALL channels > this
NEON_SAT_THR = 200    # skip pixels with saturation > this (neon edge glow)
LIGHTEN      = 0.12   # mix this fraction of white into final color
SAMPLE_STEP  = 3      # sample every Nth pixel for speed
MIN_KMEANS   = 30     # minimum pixels needed for K-means


def dominant_color(
    pixels:     np.ndarray,   # flat pixel indices (y*w + x)
    source_bgr: np.ndarray,
    cw:         int,
    ch:         int,
    k:          int = 3,
) -> np.ndarray:
    """
    Extract dominant BGR color for a region.

    Steps:
      1. Sample interior pixels (skip edges of bounding box)
      2. Filter out background (near-white) and neon-edge pixels
      3. K-means clustering → pick largest cluster centroid
      4. Lighten slightly for pencil-on-paper feel

    Returns uint8 BGR array shape (3,).
    """
    src_h, src_w = source_bgr.shape[:2]

    # ── Sample pixels ────────────────────────────────────────────
    sampled = pixels[::SAMPLE_STEP]
    xs = sampled % cw
    ys = sampled // cw

    # Map to source image coordinates (may differ from canvas size)
    sx = np.clip(np.round(xs * src_w / cw).astype(int), 0, src_w - 1)
    sy = np.clip(np.round(ys * src_h / ch).astype(int), 0, src_h - 1)

    colors = source_bgr[sy, sx].astype(np.float32)  # (N, 3) BGR

    # ── Filter background pixels ─────────────────────────────────
    not_bg = np.any(colors < BG_THRESH, axis=1)
    colors = colors[not_bg]

    if len(colors) == 0:
        return np.array([200, 200, 200], dtype=np.uint8)

    # ── Filter neon-edge pixels (very high saturation) ───────────
    colors_uint8 = np.clip(colors, 0, 255).astype(np.uint8)
    hsv = cv2.cvtColor(colors_uint8.reshape(-1, 1, 3), cv2.COLOR_BGR2HSV)
    sat = hsv[:, 0, 1]
    not_neon = sat < NEON_SAT_THR
    if not_neon.sum() > MIN_KMEANS:
        colors = colors[not_neon]

    # ── K-means clustering ───────────────────────────────────────
    if len(colors) >= MIN_KMEANS:
        actual_k = min(k, len(colors))
        try:
            criteria = (
                cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER,
                20, 1.0
            )
            _, labels, centers = cv2.kmeans(
                colors.astype(np.float32),
                actual_k,
                None,
                criteria,
                5,
                cv2.KMEANS_PP_CENTERS,
            )
            # Pick the cluster with the most pixels
            counts = np.bincount(labels.ravel(), minlength=actual_k)
            best   = int(np.argmax(counts))
            avg    = centers[best]
        except Exception:
            avg = colors.mean(axis=0)
    else:
        avg = colors.mean(axis=0)

    # ── Lighten for pencil-on-paper feel ─────────────────────────
    result = np.clip(avg * (1 - LIGHTEN) + 255 * LIGHTEN, 0, 255).astype(np.uint8)
    return result


def sample_interior_color(
    pixels:     np.ndarray,
    source_bgr: np.ndarray,
    cw:         int,
    ch:         int,
    shrink:     float = 0.6,
) -> np.ndarray:
    """
    Sample color from the interior of a region (avoids boundary pixels).
    Useful for portraits where skin tone is in the center, not the edge.

    shrink: fraction of bounding box to use as interior (0.6 = inner 60%)
    """
    xs = pixels % cw
    ys = pixels // cw

    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())

    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2
    hw = (x1 - x0) * shrink / 2
    hh = (y1 - y0) * shrink / 2

    # Keep only pixels inside the shrunk bounding box
    interior = (
        (xs >= cx - hw) & (xs <= cx + hw) &
        (ys >= cy - hh) & (ys <= cy + hh)
    )
    interior_pixels = pixels[interior]

    if len(interior_pixels) < 10:
        interior_pixels = pixels  # fallback to all pixels

    return dominant_color(interior_pixels, source_bgr, cw, ch)
