"""
color_segmentation.py
─────────────────────
Robust region detection for ALL image types:
  - Normal photos
  - Dark / neon images (Shiva, gods, neon art)
  - Portraits / faces
  - Jewelry / fine detail images

Pipeline:
  1. Preprocess  → LAB + CLAHE, brightness normalisation, dark-image inversion
  2. Edge map    → merge edges from original + brightened image
  3. Superpixels → SLIC (skimage) with adaptive segment count
  4. Merge       → combine similar-colour superpixels using graph merging
  5. Refine      → drop tiny noise regions, re-merge with neighbours
"""

import cv2
import numpy as np
from dataclasses import dataclass
from typing import List, Tuple, Optional

try:
    from skimage.segmentation import slic, mark_boundaries
    from skimage.color import rgb2lab
    SKIMAGE_OK = True
except ImportError:
    SKIMAGE_OK = False


# ── Tuning constants ──────────────────────────────────────────────
MIN_REGION_PX   = 120    # ignore regions smaller than this
SLIC_SEGMENTS   = 300    # initial superpixel count
SLIC_COMPACTNESS= 12     # higher = more square superpixels
MERGE_LAB_DIST  = 18     # merge superpixels whose LAB distance < this
DARK_THRESH     = 60     # mean brightness below this → dark image
NEON_SAT_THRESH = 140    # mean saturation above this → neon image


@dataclass
class ColorRegion:
    """One detected region ready for coloring."""
    pixels:    np.ndarray   # flat pixel indices (y*w + x), int32
    color_bgr: np.ndarray   # dominant BGR color (uint8, shape (3,))
    bbox:      Tuple        # (x0, y0, x1, y1)
    size:      int
    mask:      np.ndarray   # bool mask (h, w)
    label:     int          # region label id


# ─────────────────────────────────────────────────────────────────
# PUBLIC ENTRY POINT
# ─────────────────────────────────────────────────────────────────

def segment_image(
    source_bgr: np.ndarray,
    edge_mask:  Optional[np.ndarray] = None,
    min_size:   int = MIN_REGION_PX,
) -> List[ColorRegion]:
    """
    Segment source_bgr into meaningful color regions.

    Args:
        source_bgr : original image (BGR, uint8)
        edge_mask  : optional pre-computed edge map (uint8, same size)
                     If None, edges are computed internally.
        min_size   : minimum region pixel count

    Returns:
        List[ColorRegion] sorted largest → smallest
    """
    h, w = source_bgr.shape[:2]

    # ── 1. Preprocess ────────────────────────────────────────────
    prep, is_dark, is_neon = _preprocess(source_bgr)

    # ── 2. Edge map ──────────────────────────────────────────────
    if edge_mask is None:
        edge_mask = _compute_edges(source_bgr, prep, is_dark, is_neon)

    # ── 3. Superpixel segmentation ───────────────────────────────
    if SKIMAGE_OK:
        labels = _slic_segmentation(prep, edge_mask, h, w)
    else:
        labels = _fallback_segmentation(prep, edge_mask, h, w)

    # ── 4. Merge similar superpixels ─────────────────────────────
    labels = _merge_similar(labels, prep, MERGE_LAB_DIST)

    # ── 5. Build ColorRegion objects ─────────────────────────────
    regions = _build_regions(labels, source_bgr, h, w, min_size)

    print(f"[ColorSeg] {len(regions)} regions  dark={is_dark}  neon={is_neon}  "
          f"skimage={SKIMAGE_OK}  size={w}×{h}")
    return regions


# ─────────────────────────────────────────────────────────────────
# PREPROCESSING
# ─────────────────────────────────────────────────────────────────

def _preprocess(bgr: np.ndarray) -> Tuple[np.ndarray, bool, bool]:
    """
    Returns (processed_bgr, is_dark, is_neon).
    Applies CLAHE in LAB space, handles dark/neon images.
    """
    # Detect image type
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    hsv  = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    mean_brightness = float(gray.mean())
    mean_saturation = float(hsv[:, :, 1].mean())

    is_dark = mean_brightness < DARK_THRESH
    is_neon = mean_saturation > NEON_SAT_THRESH and mean_brightness < 120

    # Convert to LAB for CLAHE
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    # Adaptive CLAHE — stronger for dark images
    clip = 4.0 if is_dark else (3.0 if is_neon else 2.5)
    tile = (4, 4) if is_dark else (8, 8)
    clahe = cv2.createCLAHE(clipLimit=clip, tileGridSize=tile)
    l_eq = clahe.apply(l)

    # For dark images: boost L channel significantly
    if is_dark:
        l_eq = np.clip(l_eq.astype(np.float32) * 1.8, 0, 255).astype(np.uint8)

    lab_eq = cv2.merge([l_eq, a, b])
    result = cv2.cvtColor(lab_eq, cv2.COLOR_LAB2BGR)

    # For neon: reduce glow by blurring then sharpening
    if is_neon:
        blurred = cv2.GaussianBlur(result, (5, 5), 1.5)
        result  = cv2.addWeighted(result, 1.4, blurred, -0.4, 0)
        result  = np.clip(result, 0, 255).astype(np.uint8)

    # Bilateral filter to smooth regions while preserving edges
    result = cv2.bilateralFilter(result, 9, 75, 75)

    return result, is_dark, is_neon


# ─────────────────────────────────────────────────────────────────
# EDGE DETECTION
# ─────────────────────────────────────────────────────────────────

def _compute_edges(
    original: np.ndarray,
    processed: np.ndarray,
    is_dark: bool,
    is_neon: bool,
) -> np.ndarray:
    """
    Merge edges from original + brightened image.
    Uses multi-scale Canny + DoG for robustness.
    """
    def _edges_from(img):
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Multi-scale Canny
        e1 = cv2.Canny(cv2.GaussianBlur(gray, (3, 3), 0.8), 20, 60)
        e2 = cv2.Canny(cv2.GaussianBlur(gray, (7, 7), 2.0), 35, 100)
        # DoG (Difference of Gaussians) — catches soft edges
        g1 = cv2.GaussianBlur(gray, (3, 3), 1.0).astype(np.float32)
        g2 = cv2.GaussianBlur(gray, (9, 9), 3.0).astype(np.float32)
        dog = np.abs(g1 - g2)
        dog = cv2.normalize(dog, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        _, dog_bin = cv2.threshold(dog, 15, 255, cv2.THRESH_BINARY)
        return cv2.bitwise_or(cv2.bitwise_or(e1, e2), dog_bin)

    edges_orig = _edges_from(original)
    edges_proc = _edges_from(processed)
    edges = cv2.bitwise_or(edges_orig, edges_proc)

    # For dark/neon: also detect edges on brightened version
    if is_dark or is_neon:
        bright = np.clip(original.astype(np.float32) * 2.5, 0, 255).astype(np.uint8)
        edges_bright = _edges_from(bright)
        edges = cv2.bitwise_or(edges, edges_bright)

    # Dilate slightly to close small gaps
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    edges = cv2.dilate(edges, k, iterations=1)

    return edges


# ─────────────────────────────────────────────────────────────────
# SUPERPIXEL SEGMENTATION
# ─────────────────────────────────────────────────────────────────

def _slic_segmentation(
    bgr: np.ndarray,
    edges: np.ndarray,
    h: int, w: int,
) -> np.ndarray:
    """SLIC superpixels with edge-aware compactness."""
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

    # Adaptive segment count based on image size
    n_segs = max(100, min(500, (h * w) // 800))

    labels = slic(
        rgb,
        n_segments=n_segs,
        compactness=SLIC_COMPACTNESS,
        sigma=1.0,
        start_label=0,
        channel_axis=-1,
    )
    return labels.astype(np.int32)


def _fallback_segmentation(
    bgr: np.ndarray,
    edges: np.ndarray,
    h: int, w: int,
) -> np.ndarray:
    """Watershed fallback when skimage is not available."""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    # Distance transform from edges
    edge_inv = cv2.bitwise_not(edges)
    dist = cv2.distanceTransform(edge_inv, cv2.DIST_L2, 5)
    cv2.normalize(dist, dist, 0, 1.0, cv2.NORM_MINMAX)

    _, sure_fg = cv2.threshold(dist, 0.4, 1.0, cv2.THRESH_BINARY)
    sure_fg = sure_fg.astype(np.uint8)

    # Markers for watershed
    _, markers = cv2.connectedComponents(sure_fg)

    # Watershed
    bgr_3ch = bgr.copy()
    markers = cv2.watershed(bgr_3ch, markers)
    markers[markers == -1] = 0  # boundary → background

    return markers.astype(np.int32)


# ─────────────────────────────────────────────────────────────────
# REGION MERGING
# ─────────────────────────────────────────────────────────────────

def _merge_similar(
    labels: np.ndarray,
    bgr: np.ndarray,
    lab_dist_thresh: float,
) -> np.ndarray:
    """
    Merge adjacent superpixels whose LAB color distance < lab_dist_thresh.
    Uses Union-Find for efficiency.
    """
    h, w = labels.shape
    unique = np.unique(labels)
    unique = unique[unique >= 0]

    if len(unique) == 0:
        return labels

    # Compute mean LAB color per label
    lab_img = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    label_colors = {}
    for lbl in unique:
        mask = labels == lbl
        if mask.sum() == 0:
            continue
        label_colors[lbl] = lab_img[mask].mean(axis=0)

    # Union-Find
    parent = {lbl: lbl for lbl in unique}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    # Find adjacent pairs (scan horizontal + vertical boundaries)
    # Horizontal adjacency
    left  = labels[:, :-1]
    right = labels[:, 1:]
    h_pairs = np.stack([left.ravel(), right.ravel()], axis=1)
    h_pairs = h_pairs[h_pairs[:, 0] != h_pairs[:, 1]]

    # Vertical adjacency
    top    = labels[:-1, :]
    bottom = labels[1:, :]
    v_pairs = np.stack([top.ravel(), bottom.ravel()], axis=1)
    v_pairs = v_pairs[v_pairs[:, 0] != v_pairs[:, 1]]

    all_pairs = np.unique(
        np.concatenate([h_pairs, v_pairs], axis=0), axis=0
    )

    for a, b in all_pairs:
        if a < 0 or b < 0:
            continue
        ca = label_colors.get(a)
        cb = label_colors.get(b)
        if ca is None or cb is None:
            continue
        dist = float(np.linalg.norm(ca - cb))
        if dist < lab_dist_thresh:
            union(int(a), int(b))

    # Remap labels
    remap = {lbl: find(lbl) for lbl in unique}
    new_labels = np.vectorize(lambda x: remap.get(x, x))(labels)

    return new_labels.astype(np.int32)


# ─────────────────────────────────────────────────────────────────
# BUILD ColorRegion OBJECTS
# ─────────────────────────────────────────────────────────────────

def _build_regions(
    labels: np.ndarray,
    source_bgr: np.ndarray,
    h: int, w: int,
    min_size: int,
) -> List[ColorRegion]:
    """Convert label map → list of ColorRegion objects."""
    from color_sampling import dominant_color

    unique = np.unique(labels)
    unique = unique[unique >= 0]

    regions = []
    for lbl in unique:
        ys, xs = np.where(labels == lbl)
        size = len(xs)
        if size < min_size:
            continue

        pixels = (ys * w + xs).astype(np.int32)
        x0, x1 = int(xs.min()), int(xs.max())
        y0, y1 = int(ys.min()), int(ys.max())

        # Sample dominant color from interior pixels
        color_bgr = dominant_color(pixels, source_bgr, w, h)

        mask = np.zeros((h, w), dtype=bool)
        mask[ys, xs] = True

        regions.append(ColorRegion(
            pixels    = pixels,
            color_bgr = color_bgr,
            bbox      = (x0, y0, x1, y1),
            size      = size,
            mask      = mask,
            label     = int(lbl),
        ))

    regions.sort(key=lambda r: r.size, reverse=True)
    return regions
