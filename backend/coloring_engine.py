"""
coloring_engine.py
──────────────────
Generates human-like pencil stroke descriptors for each region.
Returns JSON-serializable list consumed by the React DrawingCanvas.

Each stroke descriptor:
  { x1, y1, cpx, cpy, x2, y2, r, g, b, alpha, lw }

The frontend draws these as quadratic bezier curves — short, angled,
with slight wobble — exactly like a human hand coloring on paper.
"""

import math
import numpy as np
from typing import List, Dict, Any

from region_segmentation import Region


# ── Stroke geometry constants ─────────────────────────────────────
ROW_SPACING   = 9     # px between parallel rows
LEN_MIN       = 12    # min stroke length px
LEN_MAX       = 26    # max stroke length px
GAP_MIN       = 3     # min gap between strokes on row
GAP_MAX       = 9     # max gap
ALPHA_LO      = 0.32  # lightest pressure
ALPHA_HI      = 0.50  # heaviest pressure
LW_BASE       = 2.2   # base line width px

# Angle per region — each region gets a different direction
_ANGLES_DEG = [42,130,55,125,68,115,50,140,75,105,38,148,90,60,120,45,35,155]
ANGLES = [d * math.pi / 180 for d in _ANGLES_DEG]


def _seeded_rand(seed: int):
    """Deterministic random — no Math.random() in animation loop."""
    s = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
    def rand():
        nonlocal s
        s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
        return s / 4294967295
    return rand


def strokes_for_region(
    region:    Region,
    reg_idx:   int,
    cw:        int,
    ch:        int,
    row_spacing: int = ROW_SPACING,
    len_min:     int = LEN_MIN,
    len_max:     int = LEN_MAX,
) -> List[Dict[str, Any]]:
    """
    Generate pencil stroke descriptors for one region.

    Algorithm:
    1. Choose angle based on region index
    2. Sweep parallel rows across bounding box
    3. Along each row find segments inside the region (pixel Set lookup)
    4. Chop each segment into individual strokes with random gaps
    5. Each stroke gets wobble on control point (hand tremor)
    """
    pixels_set = set(region.pixels.tolist())
    rand       = _seeded_rand(reg_idx * 7919 + 13337)

    angle  = ANGLES[reg_idx % len(ANGLES)]
    cos_a  = math.cos(angle)
    sin_a  = math.sin(angle)
    pcos   = -sin_a   # perpendicular direction
    psin   =  cos_a

    x0,y0,x1,y1 = region.bbox
    cx = (x0+x1)/2
    cy = (y0+y1)/2
    diag = math.ceil(math.hypot(x1-x0+2, y1-y0+2)) + 4

    b, g, r = int(region.color_bgr[0]), int(region.color_bgr[1]), int(region.color_bgr[2])

    strokes = []

    for row_off in range(int(-diag), int(diag)+1, row_spacing):
        rx = cx + row_off * pcos
        ry = cy + row_off * psin

        in_seg = False
        seg_t  = 0

        for t in range(int(-diag), int(diag)+2):
            px = round(rx + t*cos_a)
            py = round(ry + t*sin_a)

            # Correct bounds check + region membership
            inside = (0 <= px < cw and 0 <= py < ch
                      and (py*cw + px) in pixels_set)

            if inside and not in_seg:
                in_seg = True; seg_t = t
            if (not inside or t == int(diag)+1) and in_seg:
                in_seg = False
                seg_len = t - seg_t
                if seg_len < len_min * 0.4:
                    continue

                pos = seg_t + rand() * GAP_MAX
                while pos < t - len_min*0.3:
                    length = len_min + rand()*(len_max-len_min)
                    end    = min(pos+length, t-1)
                    if end-pos < len_min*0.3:
                        break

                    sx = rx + pos*cos_a;  sy = ry + pos*sin_a
                    ex = rx + end*cos_a;  ey = ry + end*sin_a
                    wobble = (rand()-0.5)*3.5  # hand tremor

                    strokes.append({
                        "x1":  round(sx, 2),
                        "y1":  round(sy, 2),
                        "cpx": round((sx+ex)/2 + wobble*pcos, 2),
                        "cpy": round((sy+ey)/2 + wobble*psin, 2),
                        "x2":  round(ex, 2),
                        "y2":  round(ey, 2),
                        "r": r, "g": g, "b": b,
                        "alpha": round(ALPHA_LO + rand()*(ALPHA_HI-ALPHA_LO), 3),
                        "lw":   round(LW_BASE*(0.75 + rand()*0.5), 2),
                        "bbox": [x0, y0, x1+1, y1+1],
                    })
                    pos += length + GAP_MIN + rand()*(GAP_MAX-GAP_MIN)

    return strokes


def generate_all_coloring(
    regions:     List[Region],
    cw:          int,
    ch:          int,
    row_spacing: int   = ROW_SPACING,
    len_min:     int   = LEN_MIN,
    len_max:     int   = LEN_MAX,
) -> List[Dict[str, Any]]:
    """
    Generate all coloring strokes for all regions.
    Returns flat list of stroke descriptors sorted by region (largest first).
    """
    all_strokes = []
    for ri, region in enumerate(regions):
        s = strokes_for_region(region, ri, cw, ch, row_spacing, len_min, len_max)
        all_strokes.extend(s)
    print(f"[ColorEngine] {len(regions)} regions → {len(all_strokes)} strokes total")
    return all_strokes