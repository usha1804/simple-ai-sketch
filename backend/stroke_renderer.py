"""
stroke_renderer.py
──────────────────
Converts skeleton edge map → human-like stroke paths.
Stroke order: outer contours first, then internal details.
Each path is a list of [x, y] points ready for frontend bezier drawing.
"""

import cv2
import numpy as np
from typing import List


def trace_paths(
    skel:       np.ndarray,
    min_len:    int   = 10,
    smooth_k:   int   = 0,     # 0 = auto
    stroke_w:   float = 1.0,   # stroke width multiplier
) -> List[List[List[float]]]:
    """
    Trace skeleton into ordered stroke paths.
    Returns list of paths, each path = [[x,y], [x,y], ...]
    """
    paths = _trace_raw(skel, min_len)
    paths = _sort_paths_human_order(paths, skel.shape[0])
    paths = _smooth_paths(paths, smooth_k)
    return paths


def _trace_raw(skel: np.ndarray, min_len: int) -> List[List]:
    """Walk skeleton pixels into connected paths."""
    n, lbl, stats, _ = cv2.connectedComponentsWithStats(skel, connectivity=8)
    clean = np.zeros_like(skel)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= min_len:
            clean[lbl == i] = 255

    ys, xs = np.where(clean > 0)
    if len(xs) == 0:
        return []

    pixel_set = set(zip(xs.tolist(), ys.tolist()))
    OFF       = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

    def get_nb(p):
        return [(p[0]+dx, p[1]+dy) for dx,dy in OFF
                if (p[0]+dx, p[1]+dy) in pixel_set]

    adj     = {p: get_nb(p) for p in pixel_set}
    visited = set()
    paths   = []

    def walk(start):
        path=[list(start)]; visited.add(start); cur=start
        for _ in range(500_000):
            unvis = [v for v in adj[cur] if v not in visited]
            if not unvis: break
            if len(path) >= 2:
                px2,py2 = path[-2]; cx,cy = cur
                dx,dy   = cx-px2, cy-py2
                unvis.sort(key=lambda v: -(dx*(v[0]-cx)+dy*(v[1]-cy)))
            nxt=unvis[0]; visited.add(nxt); path.append(list(nxt)); cur=nxt
        return path

    # Start from endpoints (degree-1 nodes) for cleaner strokes
    for ep in [p for p,ns in adj.items() if len(ns)==1]:
        if ep not in visited:
            p=walk(ep)
            if len(p)>=min_len: paths.append(p)
    for px in list(pixel_set):
        if px not in visited:
            p=walk(px)
            if len(p)>=min_len: paths.append(p)

    return paths


def _sort_paths_human_order(paths: List, ph: int) -> List:
    """
    Sort strokes: outer/large features first, then internal details.
    Mimics how a human artist draws — big shapes before fine detail.
    Within each band: nearest-neighbour ordering to reduce pen lifts.
    """
    if not paths: return paths

    # Score: (vertical band, -length) — top of image first, long strokes first
    def score(p):
        ay = sum(pt[1] for pt in p) / len(p)
        return (int(ay / max(ph/16, 1)), -len(p))

    paths = sorted(paths, key=score)

    # Nearest-neighbour reordering within each band
    ordered  = [paths[0]]
    remaining= paths[1:]
    pen      = ordered[0][-1]

    while remaining:
        bi,bd,flip = 0, float('inf'), False
        chk = remaining[:500] if len(remaining)>500 else remaining
        for i,seg in enumerate(chk):
            s,e = seg[0], seg[-1]
            ds  = abs(pen[0]-s[0])+abs(pen[1]-s[1])
            de  = abs(pen[0]-e[0])+abs(pen[1]-e[1])
            d   = min(ds,de)
            if d<bd: bd,bi,flip=d,i,de<ds
        nxt=remaining.pop(bi)
        if flip: nxt=list(reversed(nxt))
        ordered.append(nxt); pen=ordered[-1][-1]

    return ordered


def _smooth_paths(paths: List, smooth_k: int) -> List:
    """Gaussian smooth each path — removes pixel-grid jaggedness."""
    result = []
    for path in paths:
        arr = np.array(path, dtype=np.float32)
        n   = len(arr)
        if n >= 5:
            k = smooth_k if smooth_k > 0 else min(25, max(5, (n//4)*2+1))
            if k % 2 == 0: k += 1
            arr[:,0] = cv2.GaussianBlur(arr[:,0].reshape(1,-1),(k,1),3.0).flatten()
            arr[:,1] = cv2.GaussianBlur(arr[:,1].reshape(1,-1),(k,1),3.0).flatten()
        sp = [[round(float(pt[0])), round(float(pt[1]))] for pt in arr]
        if len(sp) >= 2:
            result.append(sp)
    return result


def scale_paths(
    paths:  List,
    sx:     float,
    sy:     float,
) -> List:
    """Scale path coordinates from processing size to original image size."""
    return [[[round(pt[0]*sx), round(pt[1]*sy)] for pt in p] for p in paths]