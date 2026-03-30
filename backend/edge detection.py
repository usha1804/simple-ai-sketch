"""
edge_detection.py
─────────────────
Combines Canny + HED into one fused edge map.
Applies morphological closing to seal broken edges.
Preserves fine details: eyes, lips, hair, jewellery.
Returns a binary uint8 edge map (255=edge, 0=background).
"""

import cv2
import numpy as np
from pathlib import Path

# ── HED model paths ───────────────────────────────────────────────
HED_PROTO = Path(__file__).parent / "models" / "deploy.prototxt"
HED_MODEL = Path(__file__).parent / "models" / "hed_pretrained_bsds.caffemodel"
_hed_net  = None


class _CropLayer(cv2.dnn.Layer):
    """Patched CropLayer — fixes OpenCV 4.9.0 DNN assertion error."""
    def __init__(self, params, blobs):
        super().__init__()
        self.xstart = self.xend = self.ystart = self.yend = 0

    def getMemoryShapes(self, inputs):
        inp, ref = inputs[0], inputs[1]
        out = list(inp)
        out[2], out[3] = ref[2], ref[3]
        self.xstart = (inp[3] - ref[3]) // 2
        self.xend   = self.xstart + ref[3]
        self.ystart = (inp[2] - ref[2]) // 2
        self.yend   = self.ystart + ref[2]
        return [out]

    def forward(self, inputs):
        return [inputs[0][:, :, self.ystart:self.yend, self.xstart:self.xend]]


def _get_hed_net():
    global _hed_net
    if _hed_net is not None:
        return _hed_net
    if not (HED_PROTO.exists() and HED_MODEL.exists()):
        return None
    try:
        cv2.dnn_registerLayer("Crop", _CropLayer)
        net = cv2.dnn.readNetFromCaffe(str(HED_PROTO), str(HED_MODEL))
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        _hed_net = net
        print("[HED] loaded")
        return _hed_net
    except Exception as e:
        print(f"[HED] failed: {e}")
        return None


def _hed_edges(bgr: np.ndarray) -> np.ndarray | None:
    net = _get_hed_net()
    if net is None:
        return None
    h, w = bgr.shape[:2]
    try:
        blob = cv2.dnn.blobFromImage(
            bgr, 1.0, (w, h),
            (104.00698793, 116.66876762, 122.67891434),
            swapRB=False, crop=False
        )
        net.setInput(blob)
        prob = net.forward()[0, 0]
        prob = cv2.resize(prob, (w, h))
        # Soft threshold — keep more detail than hard 0.38
        return (prob * 255).astype(np.uint8)
    except Exception as e:
        print(f"[HED] forward error: {e}")
        return None


def _canny_multipass(gray: np.ndarray, detail_level: int = 3) -> np.ndarray:
    """
    Multi-pass Canny on multiple preprocessed versions of the image.
    Catches both strong and fine edges.
    detail_level 1=coarse … 5=very fine
    """
    lo = [30, 20, 12, 7, 4][detail_level - 1]
    hi = [90, 65, 40, 25, 15][detail_level - 1]

    # CLAHE — boosts local contrast so fine details get detected
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    gray  = clahe.apply(gray)

    # Three preprocessing variants
    bil  = cv2.bilateralFilter(gray, 9, 75, 75)   # smoothed — main features
    g5   = cv2.GaussianBlur(gray, (5, 5), 1.2)    # medium blur
    g3   = cv2.GaussianBlur(gray, (3, 3), 0.8)    # light blur — fine detail

    e1 = cv2.Canny(bil, lo,    hi)
    e2 = cv2.Canny(g5,  lo,    hi)
    e3 = cv2.Canny(g3,  lo//2, hi//2)  # lower threshold = more fine detail

    # Also run adaptive threshold for texture/fine detail
    ada = cv2.adaptiveThreshold(
        bil, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 11, 4
    )
    # Thin adaptive result so it doesn't overwhelm
    ada = cv2.ximgproc.thinning(ada) if hasattr(cv2, 'ximgproc') else ada

    return e1 | e2 | e3 | ada


def _close_and_refine(edges: np.ndarray, detail_level: int = 3) -> np.ndarray:
    """
    Close broken edges so regions form closed boundaries.
    Steps:
      1. Dilate slightly (closes small gaps)
      2. Morphological CLOSE (seals gaps up to kernel size)
      3. Skeletonize (thin back to 1px lines)
    """
    from skimage.morphology import skeletonize

    # Close size depends on detail level: coarser = bigger close kernel
    close_k = [5, 4, 3, 2, 2][detail_level - 1]
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_k, close_k))

    # Step 1: small dilation to connect near-adjacent edges
    dil = cv2.dilate(edges, k, iterations=1)
    # Step 2: morphological close — fills gaps
    closed = cv2.morphologyEx(dil, cv2.MORPH_CLOSE, k, iterations=2)
    # Step 3: skeletonize — back to thin lines
    skel = skeletonize(closed > 0).astype(np.uint8) * 255
    return skel


def detect_edges(
    bgr: np.ndarray,
    detail_level: int  = 3,
    use_hed:      bool = True,
    coloring_book:bool = False,
) -> np.ndarray:
    """
    Main entry point. Returns refined binary edge map (255=edge).

    detail_level: 1=coarse, 5=very fine detail
    use_hed:      try HED first, fall back to Canny
    coloring_book: thick clean outlines for coloring pages
    """
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    if coloring_book:
        return _coloring_book_edges(bgr)

    # ── HED edges (probability map, soft) ───────────────────────
    hed_prob = _hed_edges(bgr) if use_hed else None

    # ── Canny multi-pass ─────────────────────────────────────────
    canny = _canny_multipass(gray, detail_level)

    # ── Fuse HED + Canny ─────────────────────────────────────────
    if hed_prob is not None:
        # HED threshold: lower = more detail captured
        hed_thresh = max(70, 120 - detail_level * 10)
        hed_bin    = (hed_prob > hed_thresh).astype(np.uint8) * 255
        # Weighted fusion: HED gives structure, Canny gives fine detail
        fused = cv2.addWeighted(hed_bin.astype(np.float32), 0.65,
                                canny.astype(np.float32),   0.35, 0)
        edges = (fused > 60).astype(np.uint8) * 255
        print(f"[EdgeDet] HED+Canny fused, hed_thresh={hed_thresh}")
    else:
        edges = canny
        print("[EdgeDet] Canny only")

    # ── LAB channel edges — catches colour boundaries Canny misses ─
    lab   = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    L_ed  = _canny_multipass(lab[:, :, 0], detail_level)
    a_ed  = _canny_multipass(lab[:, :, 1], max(1, detail_level-1))
    b_ed  = _canny_multipass(lab[:, :, 2], max(1, detail_level-1))
    edges = edges | L_ed | a_ed | b_ed

    # ── Close and refine ─────────────────────────────────────────
    refined = _close_and_refine(edges, detail_level)

    print(f"[EdgeDet] edge density={np.count_nonzero(refined)/(refined.size):.3f}")
    return refined


def _coloring_book_edges(bgr: np.ndarray) -> np.ndarray:
    """Thick clean outlines for coloring-book mode."""
    from skimage.morphology import skeletonize
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    for _ in range(3):
        gray = cv2.bilateralFilter(gray, 9, 80, 80)
    edges = cv2.Canny(gray, 40, 120)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (4, 4))
    edges = cv2.dilate(edges, k, iterations=2)
    return skeletonize(edges > 0).astype(np.uint8) * 255