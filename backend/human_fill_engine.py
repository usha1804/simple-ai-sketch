"""
human_fill_engine.py
────────────────────
Generates human-like coloring stroke descriptors for each region.

4-pass coloring per region:
  Pass 1 — Base layer    : light, wide strokes covering the region
  Pass 2 — Texture       : medium strokes at a different angle
  Pass 3 — Edge refine   : short strokes near boundaries (reduced near edges)
  Pass 4 — Blend         : very light, long strokes for smooth finish

Each stroke descriptor (JSON-serialisable):
  { x1, y1, cpx, cpy, x2, y2, r, g, b, alpha, lw, pass }

The frontend draws these as quadratic bezier curves.

Edge-aware:
  - Distance transform from edge mask → strokes near edges are shorter + lighter
  - Strokes follow gradient direction of the region shape

Special handling:
  - Dark/neon images: higher base alpha, more passes
  - Portraits: smoother, longer strokes
  - Fine details (small regions): denser, shorter strokes
"""

import math
import numpy as np
import cv2
from typing import List, Dict, Any, Optional

from color_segmentation import ColorRegion


# ── Stroke geometry per pass ──────────────────────────────────────
PASS_CONFIG = [
    # (row_spacing, len_min, len_max, alpha_lo, alpha_hi, lw_base, angle_offset_deg)
    (14, 20, 40, 0.18, 0.28, 3.5,  0),    # Pass 1: base, wide
    ( 9, 12, 26, 0.28, 0.42, 2.2, 45),    # Pass 2: texture, medium
    ( 6,  8, 16, 0.20, 0.32, 1.6, 90),    # Pass 3: edge refine, short
    (18, 28, 55, 0.10, 0.18, 2.8, 22),    # Pass 4: blend, long light
]

# Angle pool — each region gets a unique base angle
_ANGLES_DEG = [42, 130, 55, 125, 68, 115, 50, 140, 75, 105, 38, 148, 90, 60, 120, 45, 35, 155]
ANGLES = [d * math.pi / 180 for d in _ANGLES_DEG]

GAP_MIN = 3
GAP_MAX = 9

# Fine-detail regions (small) get denser strokes
FINE_REGION_PX = 800


def _seeded_rand(seed: int):
    """Deterministic LCG random — reproducible results."""
    s = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
    def rand():
        nonlocal s
        s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
        return s / 4294967295
    return rand


def _build_distance_map(
    region_mask: np.ndarray,
    edge_mask:   Optional[np.ndarray],
    h: int, w: int,
) -> np.ndarray:
    """
    Distance transform: each pixel's distance to the nearest edge/boundary.
    Normalised 0→1 (0 = on edge, 1 = far from edge).
    """
    if edge_mask is not None:
        boundary = edge_mask.astype(np.uint8)
    else:
        # Use region boundary as fallback
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        eroded   = cv2.erode(region_mask.astype(np.uint8), k, iterations=1)
        boundary = region_mask.astype(np.uint8) - eroded

    dist = cv2.distanceTransform(
        cv2.bitwise_not(boundary), cv2.DIST_L2, 5
    ).astype(np.float32)

    # Normalise within region
    region_dist = dist * region_mask.astype(np.float32)
    max_d = region_dist.max()
    if max_d > 0:
        region_dist /= max_d

    return region_dist


def _gradient_angle(region_mask: np.ndarray) -> float:
    """
    Compute dominant gradient direction of the region shape.
    Returns angle in radians — strokes will follow this direction.
    """
    mask_f = region_mask.astype(np.float32)
    gx = cv2.Sobel(mask_f, cv2.CV_32F, 1, 0, ksize=5)
    gy = cv2.Sobel(mask_f, cv2.CV_32F, 0, 1, ksize=5)

    # Mean gradient direction
    mean_gx = float(gx[region_mask].mean()) if region_mask.any() else 0
    mean_gy = float(gy[region_mask].mean()) if region_mask.any() else 0

    if abs(mean_gx) < 1e-6 and abs(mean_gy) < 1e-6:
        return 0.0

    return math.atan2(mean_gy, mean_gx)


def strokes_for_region(
    region:     ColorRegion,
    reg_idx:    int,
    cw:         int,
    ch:         int,
    edge_mask:  Optional[np.ndarray] = None,
    n_passes:   int = 4,
) -> List[Dict[str, Any]]:
    """
    Generate multi-pass human-like stroke descriptors for one region.

    Returns list of stroke dicts with 'pass' field (0-3).
    """
    pixels_set = set(region.pixels.tolist())
    rand       = _seeded_rand(reg_idx * 7919 + 13337)

    # ── Distance map (edge-aware stroke reduction) ────────────────
    dist_map = _build_distance_map(region.mask, edge_mask, ch, cw)

    # ── Gradient-based angle ──────────────────────────────────────
    grad_angle = _gradient_angle(region.mask)
    base_angle = ANGLES[reg_idx % len(ANGLES)]
    # Blend gradient angle with fixed angle pool
    angle_blend = 0.4
    base_angle  = base_angle * (1 - angle_blend) + grad_angle * angle_blend

    b_val = int(region.color_bgr[0])
    g_val = int(region.color_bgr[1])
    r_val = int(region.color_bgr[2])

    x0, y0, x1, y1 = region.bbox
    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2
    diag = math.ceil(math.hypot(x1 - x0 + 2, y1 - y0 + 2)) + 4

    is_fine = region.size < FINE_REGION_PX

    strokes = []

    for pass_idx in range(min(n_passes, len(PASS_CONFIG))):
        row_sp, len_min, len_max, alpha_lo, alpha_hi, lw_base, angle_off = PASS_CONFIG[pass_idx]

        # Fine regions: denser strokes
        if is_fine:
            row_sp  = max(4, row_sp // 2)
            len_min = max(5, len_min // 2)
            len_max = max(10, len_max // 2)

        angle  = base_angle + angle_off * math.pi / 180
        cos_a  = math.cos(angle)
        sin_a  = math.sin(angle)
        pcos   = -sin_a
        psin   =  cos_a

        for row_off in range(int(-diag), int(diag) + 1, row_sp):
            rx = cx + row_off * pcos
            ry = cy + row_off * psin

            in_seg = False
            seg_t  = 0

            for t in range(int(-diag), int(diag) + 2):
                px = round(rx + t * cos_a)
                py = round(ry + t * sin_a)

                inside = (
                    0 <= px < cw and 0 <= py < ch
                    and (py * cw + px) in pixels_set
                )

                if inside and not in_seg:
                    in_seg = True
                    seg_t  = t

                if (not inside or t == int(diag) + 1) and in_seg:
                    in_seg = False
                    seg_len = t - seg_t
                    if seg_len < len_min * 0.4:
                        continue

                    pos = seg_t + rand() * GAP_MAX
                    while pos < t - len_min * 0.3:
                        length = len_min + rand() * (len_max - len_min)
                        end    = min(pos + length, t - 1)
                        if end - pos < len_min * 0.3:
                            break

                        sx = rx + pos * cos_a
                        sy = ry + pos * sin_a
                        ex = rx + end * cos_a
                        ey = ry + end * sin_a

                        # Mid-point for distance lookup
                        mx = round((sx + ex) / 2)
                        my = round((sy + ey) / 2)
                        mx = max(0, min(cw - 1, mx))
                        my = max(0, min(ch - 1, my))
                        d  = float(dist_map[my, mx])  # 0=edge, 1=interior

                        # Reduce stroke near edges (pass 3 = edge refine, keep near edges)
                        if pass_idx != 2:
                            # Passes 0,1,4: fade out near edges
                            edge_factor = 0.3 + 0.7 * d
                        else:
                            # Pass 2 (edge refine): stronger near edges
                            edge_factor = 0.3 + 0.7 * (1 - d)

                        if edge_factor < 0.15:
                            pos += length + GAP_MIN + rand() * (GAP_MAX - GAP_MIN)
                            continue

                        wobble = (rand() - 0.5) * 3.5

                        # Color variation: slight hue shift per stroke
                        cr = max(0, min(255, r_val + int((rand() - 0.5) * 12)))
                        cg = max(0, min(255, g_val + int((rand() - 0.5) * 12)))
                        cb = max(0, min(255, b_val + int((rand() - 0.5) * 12)))

                        alpha = (alpha_lo + rand() * (alpha_hi - alpha_lo)) * edge_factor
                        lw    = lw_base * (0.75 + rand() * 0.5) * edge_factor

                        strokes.append({
                            "x1":   round(sx, 2),
                            "y1":   round(sy, 2),
                            "cpx":  round((sx + ex) / 2 + wobble * pcos, 2),
                            "cpy":  round((sy + ey) / 2 + wobble * psin, 2),
                            "x2":   round(ex, 2),
                            "y2":   round(ey, 2),
                            "r": cr, "g": cg, "b": cb,
                            "alpha": round(alpha, 3),
                            "lw":    round(lw, 2),
                            "pass":  pass_idx,
                            "bbox":  [x0, y0, x1 + 1, y1 + 1],
                        })

                        pos += length + GAP_MIN + rand() * (GAP_MAX - GAP_MIN)

    return strokes


def generate_all_coloring(
    regions:   List[ColorRegion],
    cw:        int,
    ch:        int,
    edge_mask: Optional[np.ndarray] = None,
    n_passes:  int = 4,
) -> List[Dict[str, Any]]:
    """
    Generate all coloring strokes for all regions.
    Returns flat list sorted by region (largest first), then by pass.
    """
    all_strokes = []
    for ri, region in enumerate(regions):
        s = strokes_for_region(region, ri, cw, ch, edge_mask, n_passes)
        all_strokes.extend(s)

    print(f"[HumanFill] {len(regions)} regions → {len(all_strokes)} strokes "
          f"({n_passes} passes)")
    return all_strokes
