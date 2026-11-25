#!/usr/bin/env python3
"""Generate original Exovela garment meshes (GLB) and procedural textures.
No third-party / stock assets. Units: meters."""
from __future__ import annotations
import math, os, json, struct, io
from array import array
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TEX = os.path.join(ROOT, "assets", "textures")
MOD = os.path.join(ROOT, "assets", "models")
os.makedirs(TEX, exist_ok=True)
os.makedirs(MOD, exist_ok=True)

# ---------------------------------------------------------------------------
# math
# ---------------------------------------------------------------------------
def vnorm(v):
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.maximum(n, 1e-9)

def lerp(a, b, t):
    return a + (b - a) * t

def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)

def fract(x):
    return x - np.floor(x)

def noise2(x, y, seed=0):
    # value noise
    x = np.asarray(x, dtype=np.float64) + seed * 17.13
    y = np.asarray(y, dtype=np.float64) + seed * 9.27
    xi = np.floor(x).astype(np.int64)
    yi = np.floor(y).astype(np.int64)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    def h(i, j):
        n = np.int64(i) * 374761393 + np.int64(j) * 668265263 + seed * 1274126177
        n = (n ^ (n >> 13)) * 1274126177
        return ((n ^ (n >> 16)) & 0xFFFFFFFF) / 4294967296.0
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v)

def fbm(x, y, octaves=5, seed=0, lacunarity=2.0, gain=0.5):
    a, f, s, n = 0.5, 1.0, 0.0, 0.0
    for i in range(octaves):
        s += a * noise2(x * f, y * f, seed + i * 19)
        n += a
        a *= gain
        f *= lacunarity
    return s / n

# ---------------------------------------------------------------------------
# textures
# ---------------------------------------------------------------------------
def save(img, name):
    path = os.path.join(TEX, name)
    img.save(path, optimize=True)
    print("tex", name, img.size)
    return path

def gen_fabric_normal(size=2048, kind="shell"):
    # kind: shell (fine technical weave + micro wrinkles) or knit (inner suit)
    arr = np.zeros((size, size, 3), dtype=np.float32)
    yy, xx = np.mgrid[0:size, 0:size]
    u, v = xx / size, yy / size
    if kind == "knit":
        # interlock knit: rounded wales and courses
        wale = np.sin(u * math.pi * 180) * 0.55
        course = np.sin(v * math.pi * 140 + 0.4 * np.sin(u * math.pi * 180)) * 0.4
        height = 0.55 * wale + 0.35 * course
        height += 0.08 * (fbm(u * 30, v * 30, 4, 3) - 0.5)
        height += 0.04 * np.sin((u * 12 + v * 9) * math.pi * 2)  # slow drape variation
    else:
        # tight twill / ripstop hybrid
        twill = np.sin((u + v) * math.pi * 420) * 0.25 + np.sin((u - 0.5 * v) * math.pi * 420) * 0.18
        rip = np.minimum(np.abs(np.sin(u * math.pi * 64)), np.abs(np.sin(v * math.pi * 64)))
        rip = np.clip(0.06 - rip, 0, 1) * 0.6  # faint ripstop grid ridges
        height = 0.45 * twill + rip
        height += 0.12 * (fbm(u * 18, v * 18, 5, 7) - 0.5)  # loose drapery
        height += 0.05 * (fbm(u * 80, v * 80, 3, 11) - 0.5)  # fiber noise
    # convert height to normal
    hx = np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)
    hy = np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)
    scale = 4.0 if kind == "knit" else 3.2
    nx, ny, nz = -hx * scale, -hy * scale, np.ones_like(height)
    n = vnorm(np.stack([nx, ny, nz], -1))
    img = Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8), "RGB")
    save(img, f"{kind}_normal.png")
    # roughness: knit slightly fluffier
    rough = 0.62 + 0.18 * (fbm(u * 40, v * 40, 4, 5) - 0.5)
    if kind == "knit":
        rough = 0.72 + 0.14 * (fbm(u * 25, v * 25, 4, 2) - 0.5) + 0.06 * np.abs(wale)
    else:
        rough = np.clip(rough - 0.15 * rip, 0.35, 0.9)
    rimg = Image.fromarray((np.clip(rough, 0, 1) * 255).astype(np.uint8), "L")
    save(rimg, f"{kind}_rough.png")
    return height

def gen_rib_normal(size=1024):
    yy, xx = np.mgrid[0:size, 0:size]
    u, v = xx / size, yy / size
    # vertical 1x1 rib
    rib = np.sin(u * math.pi * 120)
    height = 0.7 * np.sign(rib) * np.abs(rib) ** 0.45
    height += 0.08 * (fbm(u * 40, v * 8, 3, 4) - 0.5)
    hx = np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)
    hy = np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)
    n = vnorm(np.stack([-hx * 6, -hy * 6, np.ones_like(height)], -1))
    save(Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8), "RGB"), "rib_normal.png")
    save(Image.fromarray((np.clip(0.55 + 0.2 * np.abs(rib), 0, 1) * 255).astype(np.uint8), "L"), "rib_rough.png")

def gen_wood(size=2048):
    yy, xx = np.mgrid[0:size, 0:size]
    u, v = xx / size, yy / size
    # planks along v, grain along v
    plank = np.floor(u * 8)
    local = (u * 8) - plank
    gap = np.clip(0.04 - np.minimum(local, 1 - local), 0, 1) / 0.04
    grain = fbm(u * 3 + plank * 1.7, v * 28, 6, 21, lacunarity=2.1, gain=0.55)
    grain2 = fbm(u * 14, v * 80, 4, 22)
    # dark wet teak / aged dock wood
    base = np.array([0.09, 0.06, 0.04])
    mid = np.array([0.22, 0.13, 0.07])
    hi = np.array([0.32, 0.20, 0.11])
    t = np.clip(grain * 1.2 - 0.1, 0, 1)
    col = base + (mid - base) * t[..., None] + (hi - mid) * (t[..., None] ** 2)
    col += (grain2[..., None] - 0.5) * 0.04
    col *= (1.0 - 0.72 * gap[..., None])  # dark seams
    # wet blotches
    wet = smooth(fbm(u * 4, v * 4, 4, 30) - 0.35)
    col = col * (1 - 0.15 * wet[..., None])
    img = Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8), "RGB")
    save(img, "wood_albedo.png")
    # roughness: lower where wet
    rough = np.clip(0.55 - 0.38 * wet + 0.2 * gap, 0.08, 0.9)
    save(Image.fromarray((rough * 255).astype(np.uint8), "L"), "wood_rough.png")
    # normal from grain + gaps
    height = 0.15 * grain + 0.08 * grain2 - 0.35 * gap
    hx = np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)
    hy = np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)
    n = vnorm(np.stack([-hx * 8, -hy * 8, np.ones_like(height)], -1))
    save(Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8), "RGB"), "wood_normal.png")

def gen_moon(size=1024):
    yy, xx = np.mgrid[0:size, 0:size]
    x = (xx / (size - 1) - 0.5) * 2
    y = (0.5 - yy / (size - 1)) * 2
    r = np.sqrt(x * x + y * y)
    # sphere z
    z = np.sqrt(np.clip(1 - x * x - y * y, 0, 1))
    # lat/lon for craters
    lon = np.arctan2(x, z)
    lat = np.arcsin(np.clip(y, -1, 1))
    # highlands / maria
    maria = fbm(lon * 1.2 + 2.0, lat * 1.6 + 0.5, 5, 8)
    # classic maria blobs
    blobs = 0
    for cx, cy, s, k in [(-0.25, 0.15, 0.35, 0.55), (0.3, -0.05, 0.28, 0.45),
                         (-0.05, -0.35, 0.22, 0.4), (0.15, 0.4, 0.18, 0.3),
                         (-0.45, -0.2, 0.2, 0.35)]:
        d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        blobs += k * np.exp(- (d / s) ** 2)
    albedo = 0.72 - 0.28 * np.clip(blobs, 0, 1) - 0.08 * (maria - 0.5)
    # craters
    rng = np.random.RandomState(11)
    height = fbm(lon * 3, lat * 3, 6, 9) * 0.15
    for _ in range(80):
        cx, cy = rng.uniform(-0.95, 0.95), rng.uniform(-0.95, 0.95)
        if cx * cx + cy * cy > 0.9:
            continue
        rad = rng.uniform(0.015, 0.12) * rng.choice([1, 1, 1, 2.2])
        d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        rim = np.exp(-((d - rad * 0.85) / (rad * 0.12)) ** 2)
        bowl = np.clip(1 - d / rad, 0, 1) ** 1.2
        height += 0.045 * rim - 0.07 * bowl * (d < rad)
        albedo -= 0.04 * bowl * (d < rad)
        albedo += 0.03 * rim
    # lighting: sun from upper left
    normal_x = np.gradient(height, axis=1)
    normal_y = np.gradient(height, axis=0)
    N = vnorm(np.stack([-normal_x * 8 + x, -normal_y * 8 + y, z + 0.15], -1))
    L = vnorm(np.array([0.45, 0.35, 0.82]))
    diff = np.clip((N * L).sum(-1), 0, 1)
    # limb darkening
    limb = np.clip(z, 0, 1) ** 0.55
    # color: slightly warm bone with faint blue in shadows
    light = (0.18 + 0.92 * diff) * limb
    col = np.stack([
        albedo * light * 1.00,
        albedo * light * 0.98,
        albedo * light * 0.93
    ], -1)
    # ambient fill
    col += 0.04 * albedo[..., None] * limb[..., None]
    # space is transparent
    alpha = smooth((0.998 - r) / 0.012)
    # soft halo baked? keep transparent, halo in shader
    rgba = np.dstack([np.clip(col, 0, 1), alpha])
    img = Image.fromarray((rgba * 255).astype(np.uint8), "RGBA")
    save(img, "moon.png")

def gen_metal_normal(size=256):
    yy, xx = np.mgrid[0:size, 0:size]
    u, v = xx / size, yy / size
    h = 0.04 * (fbm(u * 20, v * 20, 4, 1) - 0.5)
    hx = np.roll(h, -1, 1) - np.roll(h, 1, 1)
    hy = np.roll(h, -1, 0) - np.roll(h, 1, 0)
    n = vnorm(np.stack([-hx * 4, -hy * 4, np.ones_like(h)], -1))
    save(Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8), "RGB"), "metal_normal.png")

# ---------------------------------------------------------------------------
# mesh builder
# ---------------------------------------------------------------------------
class Mesh:
    def __init__(self, name="mesh"):
        self.name = name
        self.groups = {}  # name -> (verts list, faces list, extra attrs)

    def _g(self, mat):
        if mat not in self.groups:
            self.groups[mat] = {"v": [], "n": [], "uv": [], "uv2": [], "m": [], "i": []}
        return self.groups[mat]

    def add_tri(self, mat, pts, uvs=None, uv2s=None, masks=None, smooth=True):
        g = self._g(mat)
        base = len(g["v"])
        for i, p in enumerate(pts):
            g["v"].append(np.asarray(p, dtype=np.float32))
            if uvs is not None:
                g["uv"].append(np.asarray(uvs[i], dtype=np.float32))
            else:
                g["uv"].append(np.zeros(2, np.float32))
            if uv2s is not None:
                g["uv2"].append(np.asarray(uv2s[i], dtype=np.float32))
            else:
                g["uv2"].append(g["uv"][-1].copy())
            if masks is not None:
                g["m"].append(np.asarray(masks[i], dtype=np.float32))
            else:
                g["m"].append(np.array([1, 0, 0, 0], np.float32))
        g["i"].extend([base, base + 1, base + 2])

    def add_quad(self, mat, pts, uvs=None, uv2s=None, masks=None):
        # pts: 4, order TL TR BR BL or consistent
        a, b, c, d = pts
        uv = uvs or [None] * 4
        u2 = uv2s or [None] * 4
        m = masks or [None] * 4
        def pack(idx):
            return ([pts[i] for i in idx],
                    [uvs[i] for i in idx] if uvs is not None else None,
                    [uv2s[i] for i in idx] if uv2s is not None else None,
                    [masks[i] for i in idx] if masks is not None else None)
        t1 = pack([0, 1, 2])
        t2 = pack([0, 2, 3])
        self.add_tri(mat, *t1)
        self.add_tri(mat, *t2)

    def weld_and_normals(self, sharp_deg=55):
        # compute smooth normals with angle threshold after welding identical positions
        for mat, g in self.groups.items():
            v = np.array(g["v"], dtype=np.float32)
            idx = np.array(g["i"], dtype=np.uint32)
            # weld by rounded position
            key = np.round(v * 20000).astype(np.int64)
            # make unique
            uniq = {}
            remap = np.empty(len(v), dtype=np.int32)
            nv, nuv, nuv2, nm = [], [], [], []
            for i, k in enumerate(map(tuple, key)):
                if k in uniq:
                    remap[i] = uniq[k]
                else:
                    uniq[k] = len(nv)
                    remap[i] = len(nv)
                    nv.append(v[i])
                    nuv.append(g["uv"][i])
                    nuv2.append(g["uv2"][i])
                    nm.append(g["m"][i])
            nv = np.array(nv, dtype=np.float32)
            idx = remap[idx].astype(np.uint32)
            # face normals
            a, b, c = nv[idx[0::3]], nv[idx[1::3]], nv[idx[2::3]]
            fn = np.cross(b - a, c - a)
            fn = vnorm(fn)
            acc = np.zeros_like(nv)
            for k in range(3):
                np.add.at(acc, idx[k::3], fn)
            nrm = vnorm(acc)
            g["v"] = nv
            g["n"] = nrm.astype(np.float32)
            g["uv"] = np.array(nuv, dtype=np.float32)
            g["uv2"] = np.array(nuv2, dtype=np.float32)
            g["m"] = np.array(nm, dtype=np.float32)
            g["i"] = idx

    def transform(self, fn):
        for g in self.groups.values():
            if isinstance(g["v"], np.ndarray):
                g["v"] = fn(g["v"])
            else:
                g["v"] = [fn(np.asarray(p)) for p in g["v"]]


def tube_surface(path, radii, n_u=48, n_v=None, closed_u=True):
    """path: (N,3) centerline, radii: (N,) or (N,2) rx,rz in local frame.
    Returns verts (nv, nu, 3) and a local frame."""
    path = np.asarray(path, dtype=np.float64)
    N = len(path)
    if path.ndim != 2:
        raise ValueError
    radii = np.asarray(radii, dtype=np.float64)
    if radii.ndim == 1:
        radii = np.stack([radii, radii], -1)
    # parallel transport frames
    t = np.zeros_like(path)
    t[1:-1] = path[2:] - path[:-2]
    t[0] = path[1] - path[0]
    t[-1] = path[-1] - path[-2]
    t = vnorm(t)
    # initial normal
    arb = np.array([0, 1, 0]) if abs(t[0, 1]) < 0.9 else np.array([1, 0, 0])
    n0 = vnorm(np.cross(t[0], arb))
    b0 = vnorm(np.cross(t[0], n0))
    Ns = [n0]
    Bs = [b0]
    for i in range(1, N):
        v = t[i - 1]
        w = t[i]
        axis = np.cross(v, w)
        s = np.linalg.norm(axis)
        if s < 1e-8:
            Ns.append(Ns[-1])
            Bs.append(Bs[-1])
            continue
        axis = axis / s
        ang = math.atan2(s, np.dot(v, w))
        # rotate N around axis
        def rot(vec):
            return vec * math.cos(ang) + np.cross(axis, vec) * math.sin(ang) + axis * np.dot(axis, vec) * (1 - math.cos(ang))
        Ns.append(rot(Ns[-1]))
        Bs.append(rot(Bs[-1]))
    Nf = np.stack(Ns)
    Bf = np.stack(Bs)
    us = np.linspace(0, 2 * math.pi, n_u, endpoint=not closed_u, dtype=np.float64)
    if closed_u:
        # last = first, we'll wrap faces
        pass
    verts = np.zeros((N, n_u, 3), dtype=np.float64)
    for j, ang in enumerate(us):
        c, s = math.cos(ang), math.sin(ang)
        verts[:, j] = path + Nf * (radii[:, 0:1] * c) + Bf * (radii[:, 1:2] * s)
    return verts, Nf, Bf, t, us


def grid_faces(mesh, mat, verts, uv, uv2=None, mask=None, wrap_u=True, cap=False, skip=None):
    """verts: (nv, nu, 3). skip(i, j) -> True to omit the quad at row i, col j."""
    nv, nu, _ = verts.shape
    def V(i, j):
        return verts[i, j % nu] if wrap_u else verts[i, min(j, nu - 1)]
    def attr(A, i, j):
        if A is None:
            return None
        return A[i, j % nu] if wrap_u else A[i, min(j, nu - 1)]
    for i in range(nv - 1):
        for j in range(nu if wrap_u else nu - 1):
            if skip is not None and skip(i, j):
                continue
            pts = [V(i, j), V(i, j + 1), V(i + 1, j + 1), V(i + 1, j)]
            uvs = [attr(uv, i, j), attr(uv, i, j + 1), attr(uv, i + 1, j + 1), attr(uv, i + 1, j)] if uv is not None else None
            u2s = [attr(uv2, i, j), attr(uv2, i, j + 1), attr(uv2, i + 1, j + 1), attr(uv2, i + 1, j)] if uv2 is not None else None
            ms = [attr(mask, i, j), attr(mask, i, j + 1), attr(mask, i + 1, j + 1), attr(mask, i + 1, j)] if mask is not None else None
            # skip degenerate
            if np.linalg.norm(np.cross(pts[1] - pts[0], pts[2] - pts[0])) < 1e-12:
                continue
            mesh.add_quad(mat, pts, uvs, u2s, ms)


def displace(verts, amount):
    verts = verts.copy()
    # amount same shape or broadcast
    verts += amount
    return verts

# ---------------------------------------------------------------------------
# garment construction
# ---------------------------------------------------------------------------
def torso_path_radii(kind, inner=False, pants=False):
    """Return centerline and radii for a torso (or pants yoke+legs handled separately)."""
    # Y up, Z forward, X right. Garment centered at origin, feet/hem near y=0.
    if pants:
        return None
    # heights in meters
    # hem y=0.0, neck y ≈ 0.62 (hoodie), shoulders ~0.54
    if kind == "jacket":
        y_neck, y_sh, y_chest, y_waist, y_hem = 0.62, 0.54, 0.42, 0.22, 0.0
        rx = dict(hem=0.24, waist=0.23, chest=0.26, sh=0.26, neck=0.11)
        rz = dict(hem=0.13, waist=0.13, chest=0.15, sh=0.14, neck=0.08)
    else:  # hoodie, slightly roomier
        y_neck, y_sh, y_chest, y_waist, y_hem = 0.60, 0.52, 0.40, 0.20, 0.0
        rx = dict(hem=0.25, waist=0.24, chest=0.27, sh=0.27, neck=0.12)
        rz = dict(hem=0.14, waist=0.135, chest=0.16, sh=0.15, neck=0.09)
    if inner:
        # tighter, shorter offset inward ~1.5-2.2cm
        for d in (rx, rz):
            for k in d:
                d[k] *= 0.90 if k != "neck" else 0.92
        # slightly slimmer
    n = 56
    ys = np.linspace(y_hem, y_neck, n)
    path = np.zeros((n, 3))
    path[:, 1] = ys
    # slight chest forward
    path[:, 2] = 0.02 * np.sin(np.clip((ys - y_waist) / (y_chest - y_waist + 1e-6), 0, 1) * math.pi)
    # radii
    def keyer(y):
        # piecewise
        knots = [(y_hem, "hem"), (y_waist, "waist"), (y_chest, "chest"), (y_sh, "sh"), (y_neck, "neck")]
        if y <= knots[0][0]:
            return {knots[0][1]: 1.0}
        for (y0, k0), (y1, k1) in zip(knots, knots[1:]):
            if y <= y1:
                t = smooth((y - y0) / (y1 - y0 + 1e-9))
                return {k0: 1 - t, k1: t}
        return {knots[-1][1]: 1.0}
    rad = np.zeros((n, 2))
    for i, y in enumerate(ys):
        w = keyer(y)
        rad[i, 0] = sum(rx[k] * a for k, a in w.items())
        rad[i, 1] = sum(rz[k] * a for k, a in w.items())
    # rib flare at hem (outer only): slight outward in last 6cm
    hem_zone = np.clip(1 - ys / 0.07, 0, 1)
    if not inner:
        rad[:, 0] += 0.012 * hem_zone
        rad[:, 1] += 0.008 * hem_zone
    else:
        rad[:, 0] += 0.004 * hem_zone
    return path, rad, dict(y_neck=y_neck, y_sh=y_sh, y_chest=y_chest, y_waist=y_waist, y_hem=y_hem, rx=rx, rz=rz)


def add_folds_torso(verts, path, meta, kind, inner):
    """verts (nv,nu,3). Add gravity folds, underarm hang, chest tension."""
    nv, nu, _ = verts.shape
    ys = path[:, 1]
    # parametric u
    us = np.linspace(0, 2 * math.pi, nu, endpoint=False)
    U = np.broadcast_to(us, (nv, nu))
    Y = verts[:, :, 1]
    # side underarm (u ~ pi/2 and 3pi/2) vertical folds
    side = (np.cos(U) ** 2)  # 1 at sides? u=0 is +X (right), u=pi/2 is +N which was initial normal
    # Our frame: N starts as cross(t, up-ish). t is +Y, arb is +Y so we used +X as arb? 
    # t ≈ (0,1,0), arb = (1,0,0) because abs(t.y)~1, n0 = cross(t, X) = (0,0,-1)? 
    # Let's not rely on u meaning; use vertex x/z.
    x, z = verts[:, :, 0], verts[:, :, 2]
    rhor = np.sqrt(x * x + z * z) + 1e-6
    ang = np.arctan2(z, x)  # 0 at +X (right side)
    # right/left sides: ang ~ 0 and pi
    side = np.cos(ang) ** 2  # 1 at ±X (sides)
    front = np.clip(np.sin(ang), 0, 1)  # +Z is front if sin>0... ang=atan2(z,x), +Z => pi/2, sin=1. Yes front.
    back = np.clip(-np.sin(ang), 0, 1)
    # vertical drapery folds from shoulder, stronger on sides and front-low
    fold = np.zeros((nv, nu, 3))
    # outward normal approx
    ctr = path[:, None, :]
    out = vnorm(verts - ctr)
    # several longitudinal folds
    for k, (freq, phase, amp, where) in enumerate([
        (5.0, 0.2, 0.007, side * 0.7 + front * 0.4),
        (7.2, 1.1, 0.005, side * 0.8 + back * 0.3),
        (3.4, 2.3, 0.009, front * 0.6 + side * 0.3),
        (9.0, 0.7, 0.0035, side * 0.5 + front * 0.2),
    ]):
        wave = np.sin(ang * freq + phase + Y * 3.0)
        # sharper ridges
        ridge = np.sign(wave) * np.abs(wave) ** 1.6
        hfade = np.clip((Y - 0.05) / 0.45, 0, 1) * np.clip((0.55 - Y) / 0.12, 0, 1)
        if inner:
            amp *= 0.45
        fold += out * (amp * ridge * where * hfade)[..., None]
    # compression at belly / hem bunching
    hem = np.clip(1 - Y / 0.10, 0, 1)
    bunch = np.sin(ang * 10 + 0.5) * hem * (0.006 if not inner else 0.003)
    fold += out * bunch[..., None]
    # slight chest tightness (flatten folds on upper front)
    fold *= (1 - 0.45 * front * np.clip((Y - 0.34) / 0.12, 0, 1))[..., None]
    verts = verts + fold
    return verts


def arm_centerline(side, kind, inner, meta):
    s = 1.0 if side == "R" else -1.0
    y_sh = meta["y_sh"]
    # shoulder joint
    sx = (meta["rx"]["sh"] - 0.02) * s
    if inner:
        sx *= 0.92
    p0 = np.array([sx, y_sh - 0.01, 0.00])  # shoulder
    p1 = np.array([sx + 0.08 * s, y_sh - 0.10, 0.02])  # upper arm
    p2 = np.array([sx + 0.13 * s, y_sh - 0.24, 0.05])  # elbow, slightly forward
    p3 = np.array([sx + 0.16 * s, y_sh - 0.40, 0.04])  # mid forearm
    cuff_y = 0.08 if kind != "jacket" else 0.07
    p4 = np.array([sx + 0.17 * s, cuff_y, 0.02])  # wrist / cuff
    # denser sampling
    ctrl = np.stack([p0, p1, p2, p3, p4])
    n = 40
    t = np.linspace(0, 1, n)
    # catmull-rom through points
    pts = []
    for u in t:
        x = u * (len(ctrl) - 1)
        i = int(np.clip(math.floor(x), 0, len(ctrl) - 2))
        f = x - i
        p_1 = ctrl[max(i - 1, 0)]
        p0_ = ctrl[i]
        p1_ = ctrl[i + 1]
        p2_ = ctrl[min(i + 2, len(ctrl) - 1)]
        f2, f3 = f * f, f * f * f
        p = 0.5 * ((2 * p0_) + (-p_1 + p1_) * f + (2 * p_1 - 5 * p0_ + 4 * p1_ - p2_) * f2 + (-p_1 + 3 * p0_ - 3 * p1_ + p2_) * f3)
        pts.append(p)
    return np.array(pts)


def arm_radii(n, kind, inner):
    t = np.linspace(0, 1, n)
    # shoulder 0, elbow ~0.45, cuff 1
    r_sh, r_el, r_fore, r_cuff = 0.075, 0.055, 0.048, 0.042
    if kind == "jacket":
        r_sh, r_el, r_fore, r_cuff = 0.072, 0.052, 0.046, 0.040
    if inner:
        r_sh, r_el, r_fore, r_cuff = [x * 0.88 for x in (r_sh, r_el, r_fore, r_cuff)]
    r = np.where(t < 0.45,
                 lerp(r_sh, r_el, smooth(t / 0.45)),
                 lerp(r_el, lerp(r_fore, r_cuff, smooth((t - 0.7) / 0.3) if True else 0), smooth((t - 0.45) / 0.55)))
    # cuff rib flare
    cuff = smooth((t - 0.88) / 0.12)
    if not inner:
        r = r + 0.006 * cuff
    return r


def add_elbow_folds(verts, path, inner):
    # path (n,3), verts (n, nu, 3)
    n, nu, _ = verts.shape
    # elbow index
    i_el = int(0.45 * (n - 1))
    el = path[i_el]
    # arm tangent
    tng = vnorm(path[min(i_el + 2, n - 1)] - path[max(i_el - 2, 0)])[0]
    # inner elbow: direction of curvature (towards +Z and slightly down)
    # find points near elbow
    d = np.linalg.norm(path - el, axis=1)
    along = np.exp(- (d / 0.07) ** 2)
    ctr = path[:, None, :]
    out = vnorm(verts - ctr)
    # inner side: toward the bend, which is roughly +Z (forward) and -Y
    # use dot of out with bend inward (-forward of the curve)
    # curve is forward, inner elbow faces roughly +Z and a bit +X? 
    # bend is in +Z, so inner elbow is +Z side of arm
    inward = np.array([0, 0, 1.0])
    inn = np.clip((out * inward).sum(-1), 0, 1) ** 1.2
    # circumferential ripples
    # angle around arm
    # project out onto plane
    ang = np.arctan2((out * np.array([0, 1, 0])).sum(-1), (out * np.array([1, 0, 0])).sum(-1))
    fold = np.zeros_like(verts)
    amp = 0.0045 if not inner else 0.0025
    for freq, ph, a in [(8, 0.0, 1.0), (12, 1.2, 0.55), (5, 2.0, 0.4)]:
        wave = np.sin(ang * 0 + (path[:, None, 1] * 0) + freq * ((path[:, None, 1] - el[1]) / 0.05) + ph)
        # actually folds run around the arm (along circumference), stacked along the arm
        s = np.sin(freq * ((np.arange(n)[:, None] - i_el) / 4.0) + ph)
        ridge = np.sign(s) * np.abs(s) ** 1.3
        fold += out * (amp * a * ridge * inn * along[:, None])[..., None]
    # outer elbow slight stretch (flatten)
    outer = np.clip((-out * inward).sum(-1), 0, 1)
    verts = verts + fold - out * (0.002 * outer * along[:, None])[..., None]
    return verts


def hood_mesh(mesh, meta, inner=False):
    """Hood up as a single smooth panel: neck edge to a U-shaped face opening."""
    y0 = meta["y_neck"] - 0.008
    rx, rz = meta["rx"]["neck"], meta["rz"]["neck"]
    n_v, n_u = 32, 64
    us = np.linspace(0, 1, n_u)
    vs = np.linspace(0, 1, n_v)
    verts_out = np.zeros((n_v, n_u, 3))
    verts_in = np.zeros((n_v, n_u, 3))
    gap = 0.16  # small front gap on the neck seam, in radians

    open_w, open_h, open_z = 0.105, 0.155, 0.088
    open_y_base = y0 + 0.04

    for i, v in enumerate(vs):
        tv = smooth(v)
        for j, u in enumerate(us):
            a = math.pi / 2 + gap + (2 * math.pi - 2 * gap) * u
            neck = np.array([rx * math.cos(a), y0, rz * math.sin(a)])
            phi = math.pi * u
            opening = np.array([
                -open_w * math.cos(phi),
                open_y_base + open_h * math.sin(phi) * 0.88 + 0.015,
                open_z + 0.012 * math.sin(phi),
            ])
            p = neck * (1 - tv) + opening * tv
            backness = 1.0 - abs(2 * u - 1)
            bulge = math.sin(v * math.pi) * (0.40 + 0.60 * backness)
            p = p + np.array([
                0.032 * math.sin(v * math.pi) * math.sin(2 * math.pi * u),
                0.155 * bulge,
                -0.185 * bulge - 0.035 * backness * math.sin(v * math.pi),
            ])
            verts_out[i, j] = p
            head = np.array([0.0, y0 + 0.13, -0.03])
            nrm = p - head
            nrm = nrm / (np.linalg.norm(nrm) + 1e-9)
            thick = 0.006 if inner else 0.011
            verts_in[i, j] = p - nrm * thick

    def hood_folds(V, amp):
        # gentle longitudinal folds, stronger on the back
        u_grid = us[None, :]
        v_grid = vs[:, None]
        back = 1.0 - np.abs(2 * u_grid - 1)
        nrm = np.zeros_like(V)
        # outward from a center
        ctr = np.array([0.0, y0 + 0.16, -0.08])
        nrm = vnorm(V - ctr)
        s = (np.sin(u_grid * math.pi * 6) * 0.7 + np.sin(u_grid * math.pi * 10 + 0.8) * 0.3)
        fade = np.sin(v_grid * math.pi) * (0.35 + 0.65 * back)
        return V + nrm * (amp * s * fade)[..., None]

    if not inner:
        verts_out = hood_folds(verts_out, 0.0055)
        verts_in = hood_folds(verts_in, 0.002)
    else:
        verts_out = hood_folds(verts_out, 0.002)

    uv_out = display_uv_grid(verts_out)
    uv_in = display_uv_grid(verts_in)
    mask_d = np.zeros((n_v, n_u, 4), np.float32)
    mask_l = np.zeros((n_v, n_u, 4), np.float32)
    mask_d[..., 0] = 0 if inner else 1
    mask_l[..., 1] = 1
    if not inner:
        grid_faces(mesh, "display", verts_out, uv_out, uv_out, mask_d, wrap_u=False)
        grid_faces(mesh, "lining", verts_in[:, ::-1], uv_in[:, ::-1], uv_in[:, ::-1], mask_l[:, ::-1], wrap_u=False)
        # opening bind (v = 1)
        for j in range(n_u - 1):
            pts = [verts_out[-1, j], verts_out[-1, j + 1], verts_in[-1, j + 1], verts_in[-1, j]]
            uvs = [display_uv_point(p) for p in pts]
            mesh.add_quad("rib", pts, uvs, uvs, [(0, 1, 0, 0)] * 4)
        # neck bind (v = 0)
        for j in range(n_u - 1):
            pts = [verts_out[0, j + 1], verts_out[0, j], verts_in[0, j], verts_in[0, j + 1]]
            uvs = [display_uv_point(p) for p in pts]
            mesh.add_quad("rib", pts, uvs, uvs, [(0, 1, 0, 0)] * 4)
        cords = [verts_out[-1, 0].copy(), verts_out[-1, -1].copy()]
    else:
        grid_faces(mesh, "inner", verts_out, uv_out, uv_out, mask_l, wrap_u=False)
        cords = []
    return verts_out[0], cords


def zipper_teeth(mesh, y0, y1, z_front, n=80):
    """A visible zipper down the front."""
    ys = np.linspace(y0, y1, n)
    for i, y in enumerate(ys):
        s = 1 if i % 2 == 0 else -1
        # tooth: small box
        w, h, d = 0.0036, (y1 - y0) / n * 0.9, 0.003
        x0 = -0.002 * s
        z0 = z_front
        # 8 corners as two quads approx - a small wedge
        c = np.array([0.0, y, z0])
        a = np.array([0.003 * s, y + h * 0.5, z0 + d])
        b = np.array([0.003 * s, y - h * 0.5, z0 + d])
        e = np.array([0.0005 * s, y, z0 - 0.001])
        m = [(0, 0, 1, 0)] * 3
        mesh.add_tri("metal", [e, a, b], [(0, 0), (1, 0), (1, 1)], None, m)
        mesh.add_tri("metal", [e, b, np.array([-0.0005 * s, y, z0 - 0.001])], None, None, m)
    # tape / pull
    pull = np.array([0, y1 - 0.02, z_front + 0.008])
    # simple pull tab
    tab = [
        pull + np.array([-0.006, 0, 0]),
        pull + np.array([0.006, 0, 0]),
        pull + np.array([0.005, -0.018, 0.002]),
        pull + np.array([-0.005, -0.018, 0.002]),
    ]
    mesh.add_quad("metal", tab, [(0, 1), (1, 1), (1, 0), (0, 0)], None, [(0, 0, 1, 0)] * 4)


def drawcords(mesh, start_L, start_R):
    """Cords hanging from hood opening with aglets."""
    for start, s in ((start_L, -1), (start_R, 1)):
        n = 18
        path = []
        p = np.array(start, dtype=np.float64)
        # hang down with a slight outward S
        for i in range(n):
            t = i / (n - 1)
            path.append(p + np.array([0.012 * s * t, -0.16 * t - 0.02 * t * t, 0.01 * math.sin(t * 2)]))
        path = np.array(path)
        r = np.full(n, 0.0022)
        verts, *_ = tube_surface(path, r, n_u=8)
        uv = np.zeros((n, 8, 2))
        mask = np.zeros((n, 8, 4))
        mask[..., 1] = 1
        grid_faces(mesh, "cord", verts, uv, uv, mask, wrap_u=True)
        # aglet
        tip = path[-1]
        ag = []
        nn = 8
        for j in range(nn):
            a = 2 * math.pi * j / nn
            ag.append(tip + np.array([0.0032 * math.cos(a), 0, 0.0032 * math.sin(a)]))
        # approx cylinder 2cm
        tip2 = tip + np.array([0, -0.018, 0])
        for j in range(nn):
            j2 = (j + 1) % nn
            a1 = 2 * math.pi * j / nn
            a2 = 2 * math.pi * j2 / nn
            p1 = tip + np.array([0.0032 * math.cos(a1), 0, 0.0032 * math.sin(a1)])
            p2 = tip + np.array([0.0032 * math.cos(a2), 0, 0.0032 * math.sin(a2)])
            q1 = tip2 + np.array([0.0030 * math.cos(a1), 0, 0.0030 * math.sin(a1)])
            q2 = tip2 + np.array([0.0030 * math.cos(a2), 0, 0.0030 * math.sin(a2)])
            mesh.add_quad("metal", [p1, p2, q2, q1], None, None, [(0, 0, 1, 0)] * 4)


def pocket(mesh, meta, inner=False):
    if inner:
        return
    # kangaroo pocket on front
    y0, y1 = 0.10, 0.28
    xw = 0.16
    z = meta["rz"]["chest"] * 0.55  # will be displaced to surface later – place at front
    # better: a panel sitting on +Z
    n_u, n_v = 24, 14
    verts = np.zeros((n_v, n_u, 3))
    for i in range(n_v):
        vy = i / (n_v - 1)
        y = lerp(y0, y1, vy)
        # width slightly less at top
        w = xw * lerp(1.0, 0.85, vy)
        for j in range(n_u):
            vx = j / (n_u - 1)
            x = lerp(-w, w, vx)
            # bulge
            bulge = 0.018 * math.sin(vx * math.pi) * math.sin(vy * math.pi)
            zpos = 0.14 + bulge + 0.01 * math.sin(vy * math.pi)
            verts[i, j] = [x, y, zpos]
    # a few folds
    out = np.zeros_like(verts)
    out[:, :, 2] = 1
    fold = 0.003 * np.sin(verts[:, :, 0] * 40) * np.sin((verts[:, :, 1] - y0) * 25)
    verts = verts + out * fold[..., None]
    uv = display_uv_grid(verts)
    mask = np.zeros((n_v, n_u, 4))
    mask[..., 0] = 1  # still display (pocket is on the shell)
    grid_faces(mesh, "display", verts, uv, uv, mask, wrap_u=False)
    # pocket opening slits (dark fabric edge) left and right
    for side in (-1, 1):
        # along the side of the pocket
        pts_o = []
        for i in range(n_v):
            j = 0 if side < 0 else n_u - 1
            p = verts[i, j]
            pts_o.append(p)
        # just a thickened edge already visible


def connectors_and_pack(mesh, meta, inner=True):
    """Spine pack, harness, dock on the inner suit (and shell-side pad if not inner)."""
    y_pack = 0.28
    # pack on the back (-Z)
    w, h, d = 0.07, 0.12, 0.018
    z = -meta["rz"]["waist"] * 0.95 - (0.012 if inner else 0.004)
    # rounded box as 6 faces
    def box(cx, cy, cz, sx, sy, sz, mat, mask):
        hx, hy, hz = sx / 2, sy / 2, sz / 2
        faces = [
            # +Z
            [(-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)],
            [(-hx, -hy, -hz), (-hx, hy, -hz), (hx, hy, -hz), (hx, -hy, -hz)],
            [(-hx, hy, -hz), (-hx, hy, hz), (hx, hy, hz), (hx, hy, -hz)],
            [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, -hy, hz), (-hx, -hy, hz)],
            [(hx, -hy, -hz), (hx, hy, -hz), (hx, hy, hz), (hx, -hy, hz)],
            [(-hx, -hy, -hz), (-hx, -hy, hz), (-hx, hy, hz), (-hx, hy, -hz)],
        ]
        for f in faces:
            pts = [np.array([cx, cy, cz]) + np.array(p) for p in f]
            uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
            mesh.add_quad(mat, pts, uvs, uvs, [mask] * 4)
    if inner:
        box(0, y_pack, z, w, h, d, "pack", (0, 0, 0, 1))
        # vents
        for k in range(5):
            box(-0.02 + k * 0.01, y_pack + 0.04, z - d / 2 - 0.001, 0.004, 0.03, 0.002, "metal", (0, 0, 1, 0))
        # status LED
        box(0.025, y_pack + 0.05, z - d / 2 - 0.001, 0.006, 0.006, 0.002, "led", (0, 0, 0, 1))
        # dock (upper back)
        y_dock = meta["y_sh"] - 0.06
        z_d = -meta["rz"]["sh"] * 0.92
        # base plate
        box(0, y_dock, z_d, 0.045, 0.045, 0.008, "dock", (0, 0, 1, 0))
        # pogo pins
        for ix in (-1, 0, 1):
            for iy in (-1, 0, 1):
                if abs(ix) + abs(iy) == 2:
                    continue
                box(ix * 0.008, y_dock + iy * 0.008, z_d - 0.007, 0.0025, 0.0025, 0.008, "metal", (0, 0, 1, 0))
        # magnet ring (8 capsules)
        for k in range(8):
            a = k * math.pi / 4
            box(0.016 * math.cos(a), y_dock + 0.016 * math.sin(a), z_d - 0.003, 0.006, 0.006, 0.005, "metal", (0, 0, 1, 0))
        # harness cables: tube from pack to dock and to shoulders
        def cable(p0, p1, r=0.003):
            n = 12
            path = np.linspace(p0, p1, n)
            # slight sag
            mid = (p0 + p1) / 2 + np.array([0, -0.015, -0.01])
            for i in range(n):
                t = i / (n - 1)
                path[i] = (1 - t) ** 2 * p0 + 2 * (1 - t) * t * mid + t ** 2 * p1
            verts, *_ = tube_surface(path, np.full(n, r), n_u=6)
            uv = np.zeros((n, 6, 2))
            mask = np.zeros((n, 6, 4)); mask[..., 3] = 1
            grid_faces(mesh, "cable", verts, uv, uv, mask, wrap_u=True)
        pack_top = np.array([0, y_pack + h / 2, z])
        dock_p = np.array([0, y_dock, z_d])
        cable(pack_top, dock_p)
        cable(pack_top + np.array([0.02, 0, 0]), np.array([0.08, meta["y_sh"] - 0.02, -0.05]))
        cable(pack_top + np.array([-0.02, 0, 0]), np.array([-0.08, meta["y_sh"] - 0.02, -0.05]))
    else:
        # shell-side recessed pads (inside of back)
        y_dock = meta["y_sh"] - 0.06
        z_d = -meta["rz"]["sh"] * 0.88
        box(0, y_dock, z_d, 0.042, 0.042, 0.004, "dock", (0, 0, 1, 0))
        for ix in (-1, 0, 1):
            for iy in (-1, 0, 1):
                if abs(ix) + abs(iy) == 2:
                    continue
                box(ix * 0.008, y_dock + iy * 0.008, z_d + 0.003, 0.004, 0.004, 0.0015, "metal", (0, 0, 1, 0))


def display_uv_point(p):
    """World-space planar front/back mapping so hood, torso, pocket and sleeves share one skin."""
    x, y, z = float(p[0]), float(p[1]), float(p[2])
    v = float(np.clip(y / 0.92, 0.0, 1.0))
    if z >= 0:
        u = float(np.clip(x / 0.70 + 0.5, 0, 1) * 0.5)
    else:
        u = float(0.5 + np.clip(-x / 0.70 + 0.5, 0, 1) * 0.5)
    return (u, v)

def display_uv_grid(verts):
    x, y, z = verts[..., 0], verts[..., 1], verts[..., 2]
    v = np.clip(y / 0.92, 0.0, 1.0)
    u = np.where(
        z >= 0,
        np.clip(x / 0.70 + 0.5, 0, 1) * 0.5,
        0.5 + np.clip(-x / 0.70 + 0.5, 0, 1) * 0.5,
    )
    return np.stack([u, v], -1)

def display_uv_for_torso(verts):
    return display_uv_grid(verts)

def display_uv_for_arm(verts, side):
    return display_uv_grid(verts)


def fabric_uv(verts, scale=2.5):
    # cylindrical unwrap
    x, y, z = verts[:, :, 0], verts[:, :, 1], verts[:, :, 2]
    ang = np.arctan2(z, x)
    uv = np.zeros(verts.shape[:2] + (2,))
    uv[:, :, 0] = (ang / (2 * math.pi) + 0.5) * scale
    uv[:, :, 1] = (y - y.min()) / (y.max() - y.min() + 1e-9) * scale * 0.7
    return uv



def superellipse_torso(verts, path, rad, n=3.2):
    """Flatten the tube into a more body-like rounded-rect, and add shoulder wings."""
    nv, nu, _ = verts.shape
    # recover u angles from first row relative to center
    for i in range(nv):
        ctr = path[i]
        rx, rz = rad[i]
        # y-based shoulder widen
        y = path[i, 1]
        wing = 0.0
        if 0.44 <= y <= 0.58:
            wing = math.sin((y - 0.44) / 0.14 * math.pi) * 0.055
        rx2, rz2 = rx + wing, rz * 0.92
        for j in range(nu):
            rel = verts[i, j] - ctr
            ang = math.atan2(rel[2] / max(rz, 1e-6), rel[0] / max(rx, 1e-6))
            c, si = math.cos(ang), math.sin(ang)
            # superellipse
            ax = rx2 * math.copysign(abs(c) ** (2 / n), c)
            az = rz2 * math.copysign(abs(si) ** (2 / n), si)
            verts[i, j, 0] = ctr[0] + ax
            verts[i, j, 2] = ctr[2] + az
    return verts


def loft_shoulder(mesh, mat, torso_verts, path, arm_start, side, uv2_fn, inner):
    """Bridge a torso armhole ring to the sleeve start ring."""
    nv, nu, _ = torso_verts.shape
    s = 1.0 if side == "R" else -1.0
    # row nearest the arm start height
    ys = path[:, 1]
    i_row = int(np.argmin(np.abs(ys - arm_start[len(arm_start)//2, 1] if False else arm_start[0, 1])))
    # actually arm_start is a ring (nu_arm, 3)
    ring_b = arm_start  # (na, 3)
    na = len(ring_b)
    # torso hole: vertices on this row and one above/below whose x is on the correct side
    # build ring_a as an ellipse on the torso at the side
    ctr = path[min(i_row, nv-1)].copy()
    # move center out to the shoulder
    rx = np.linalg.norm(torso_verts[i_row][:, [0, 2]] - ctr[[0, 2]], axis=-1).max()
    ctr[0] = s * (abs(ctr[0]) + rx * 0.85)
    ctr[1] = arm_start[:, 1].mean()
    ctr[2] = 0.0
    # ring_a: ellipse, na points, same winding as arm ring
    # estimate arm ring center and a reference
    bctr = arm_start.mean(0)
    # match winding: parameterize both by atan2 around their axis (roughly +X or -X)
    def order_ring(ring, outward_axis):
        c = ring.mean(0)
        # orthonormal
        zax = np.array([0, 1, 0])
        xax = np.cross(zax, outward_axis); xax = xax / (np.linalg.norm(xax) + 1e-9)
        yax = np.cross(outward_axis, xax)
        ang = np.arctan2((ring - c) @ yax, (ring - c) @ xax)
        return ring[np.argsort(ang)], c
    axis = np.array([s, 0, 0], dtype=np.float64)
    ring_b, bctr = order_ring(arm_start, axis)
    # torso ring: sample ellipse at shoulder surface, slightly larger
    ring_a = np.zeros((na, 3))
    for j in range(na):
        a = 2 * math.pi * j / na
        # ellipse in YZ, then shifted to shoulder on torso
        py, pz = 0.07 * math.cos(a), 0.065 * math.sin(a)
        ring_a[j] = ctr + np.array([0, py, pz])
        # snap out onto torso-ish by pulling x to the side of the body
    ring_a, _ = order_ring(ring_a, axis)
    n_span = 12
    for k in range(n_span):
        t0, t1 = k / n_span, (k + 1) / n_span
        # ease
        e0, e1 = t0 * t0 * (3 - 2 * t0), t1 * t1 * (3 - 2 * t1)
        r0 = ring_a * (1 - e0) + ring_b * e0
        r1 = ring_a * (1 - e1) + ring_b * e1
        for j in range(na):
            j2 = (j + 1) % na
            pts = [r0[j], r0[j2], r1[j2], r1[j]]
            uvs = [display_uv_point(p) for p in pts]
            mask = [(0, 1, 0, 0) if inner else (1, 0, 0, 0)] * 4
            mesh.add_quad(mat, pts, uvs, uvs, mask)


def build_top(kind="hoodie", inner=False):
    mesh = Mesh(f"{kind}_{'inner' if inner else 'outer'}")
    path, rad, meta = torso_path_radii(kind, inner)
    n_u = 80
    verts, Nf, Bf, tang, us = tube_surface(path, rad, n_u=n_u)
    verts = superellipse_torso(verts, path, rad, n=3.1)
    verts = add_folds_torso(verts, path, meta, kind, inner)
    # material masks: display on most of outer, rib at hem, fabric near neck for hoodie binding
    nv = verts.shape[0]
    ys = path[:, 1]
    mask = np.zeros((nv, n_u, 4), np.float32)
    if inner:
        mask[..., 1] = 1  # knit
        mat = "inner"
    else:
        hem = np.clip(1 - ys / 0.065, 0, 1)[:, None]
        mask[..., 0] = 1 - hem  # display
        mask[..., 1] = hem      # rib
        mat = "display"
    uv = fabric_uv(verts)
    uv2 = display_uv_for_torso(verts)
    # split hem into rib group by using two grids? easier: store mask and split later,
    # or emit two materials based on hem row
    # split at hem rows
    hem_rows = int(np.sum(ys <= 0.065))
    if inner:
        grid_faces(mesh, "inner", verts, uv, uv2, mask, wrap_u=True)
    else:
        grid_faces(mesh, "rib", verts[: hem_rows + 1], uv[: hem_rows + 1], uv2[: hem_rows + 1], mask[: hem_rows + 1], wrap_u=True)
        grid_faces(mesh, "display", verts[hem_rows:], uv[hem_rows:], uv2[hem_rows:], mask[hem_rows:], wrap_u=True)
        # hem cap (bottom ring)
        ring = verts[0]
        ctr = ring.mean(0)
        ctr[1] += 0.002
        for j in range(n_u):
            j2 = (j + 1) % n_u
            mesh.add_tri("rib", [ring[j], ring[j2], ctr], [(j / n_u, 0), ((j + 1) / n_u, 0), (0.5, 0.5)], None, [(0, 1, 0, 0)] * 3)

    # arms
    for side in ("R", "L"):
        ap = arm_centerline(side, kind, inner, meta)
        ar = arm_radii(len(ap), kind, inner)
        av, *_ = tube_surface(ap, ar, n_u=36)
        av = add_elbow_folds(av, ap, inner)
        auv = fabric_uv(av, scale=1.8)
        auv2 = display_uv_for_arm(av, side)
        am = np.zeros(av.shape[:2] + (4,), np.float32)
        # cuff rib last 12%
        t = np.linspace(0, 1, len(ap))[:, None]
        cuff = np.clip((t - 0.88) / 0.12, 0, 1)
        if inner:
            am[..., 1] = 1
            grid_faces(mesh, "inner", av, auv, auv2, am, wrap_u=True)
        else:
            am[..., 0] = 1 - cuff
            am[..., 1] = cuff
            ci = int(0.88 * (len(ap) - 1))
            grid_faces(mesh, "display", av[: ci + 1], auv[: ci + 1], auv2[: ci + 1], am[: ci + 1], wrap_u=True)
            grid_faces(mesh, "rib", av[ci:], auv[ci:], auv2[ci:], am[ci:], wrap_u=True)
            # cuff cap
            ring = av[-1]
            ctr = ring.mean(0)
            for j in range(36):
                j2 = (j + 1) % 36
                mesh.add_tri("rib", [ring[j2], ring[j], ctr], None, None, [(0, 1, 0, 0)] * 3)
        start = av[0]
        loft_shoulder(mesh, "inner" if inner else "display", verts, path, start, side, None, inner)

    if kind == "hoodie":
        ring, cords = hood_mesh(mesh, meta, inner=inner)
        if not inner:
            if len(cords) >= 2:
                drawcords(mesh, cords[0], cords[1])
            elif len(cords) == 1:
                p = cords[0]
                drawcords(mesh, p, p * np.array([-1, 1, 1]))
            pocket(mesh, meta, inner=False)
    if kind == "jacket":
        add_jacket_collar(mesh, meta, inner)
        if not inner:
            # zipper down the front
            # front z of torso near midline
            zf = meta["rz"]["chest"] * 0.95
            zipper_teeth(mesh, 0.04, meta["y_neck"] - 0.02, zf + 0.005)
            # placket / front break: a slight inset is enough visually

    connectors_and_pack(mesh, meta, inner=inner)
    mesh.weld_and_normals()
    return mesh, meta


def add_jacket_collar(mesh, meta, inner):
    y0 = meta["y_neck"] - 0.01
    n_v, n_u = 12, 48
    verts = np.zeros((n_v, n_u, 3))
    # u along collar from left lapel to right, open at front
    for i in range(n_v):
        v = i / (n_v - 1)
        for j in range(n_u):
            t = j / (n_u - 1)  # 0 left, 1 right
            a = lerp(0.15 * math.pi, 1.85 * math.pi, t)  # skip a front gap
            # around neck, a=0 is +X
            r = meta["rx"]["neck"] + 0.015 + 0.03 * v
            rz = meta["rz"]["neck"] + 0.01 + 0.02 * v
            x = r * math.cos(a)
            z = rz * math.sin(a)
            # fold: as v increases, collar lifts then rolls outward
            y = y0 + 0.02 + 0.045 * v
            # roll outward
            outx, outz = math.cos(a), math.sin(a)
            x += 0.02 * v * outx
            z += 0.02 * v * outz
            # lapel drop at the two front ends
            end = min(t, 1 - t) / 0.12
            end = 1 - np.clip(end, 0, 1)
            y -= 0.07 * end * v
            z += 0.03 * end * v
            verts[i, j] = [x, y, z]
    uv = np.zeros((n_v, n_u, 2))
    for i in range(n_v):
        for j in range(n_u):
            uv[i, j] = [j / (n_u - 1), i / (n_v - 1)]
    mask = np.zeros((n_v, n_u, 4), np.float32)
    if inner:
        mask[..., 1] = 1
        grid_faces(mesh, "inner", verts, uv, uv, mask, wrap_u=False)
    else:
        mask[..., 0] = 0.2
        mask[..., 1] = 0.8  # mostly fabric collar
        grid_faces(mesh, "fabric", verts, uv, uv, mask, wrap_u=False)


# Fix typo trap - the wait_fix line is inside a dead branch (kind==jacket and we return before? 
# No, I left a broken block in build_top. I'll remove it by rewriting build_top's jacket collar part.
# The broken lines are:
#        for i in range(n_v):
#            ...
#                x = (meta["rx"]["neck"] + 0.02 + over) * math.cos(a * 0.35 + math.pi / 2) wait_fix
# I'll patch after writing by replacing that block.

def build_pants(inner=False):
    mesh = Mesh(f"joggers_{'inner' if inner else 'outer'}")
    # waist
    y_waist, y_crotch, y_knee, y_ankle = 0.92, 0.70, 0.42, 0.08
    if inner:
        y_waist, y_crotch, y_knee, y_ankle = 0.90, 0.70, 0.42, 0.10
    # waist yoke as a short tube
    n_yoke, n_u = 14, 56
    ys = np.linspace(y_crotch + 0.02, y_waist, n_yoke)
    path = np.zeros((n_yoke, 3)); path[:, 1] = ys
    rx = np.linspace(0.18, 0.17, n_yoke) if not inner else np.linspace(0.165, 0.155, n_yoke)
    rz = rx * 0.72
    rad = np.stack([rx, rz], -1)
    # waistband flare
    band = np.clip((ys - (y_waist - 0.05)) / 0.05, 0, 1)
    rad[:, 0] += 0.008 * band
    verts, *_ = tube_surface(path, rad, n_u=n_u)
    # front fly crease
    x, z = verts[:, :, 0], verts[:, :, 2]
    ang = np.arctan2(z, x)
    out = vnorm(verts - path[:, None, :])
    crease = np.exp(- (np.abs(x) / 0.02) ** 2) * np.clip(z, 0, 1)  # front midline
    verts = verts - out * (0.006 * crease)[..., None]
    uv = fabric_uv(verts, 2.0)
    # pants color UV: whole surface 0-1
    uv2 = np.zeros((n_yoke, n_u, 2))
    uv2[:, :, 0] = (ang / (2 * math.pi) + 0.5)
    uv2[:, :, 1] = (ys[:, None] - y_ankle) / (y_waist - y_ankle)
    mask = np.zeros((n_yoke, n_u, 4), np.float32)
    if inner:
        mask[..., 1] = 1
        grid_faces(mesh, "inner", verts, uv, uv2, mask, wrap_u=True)
    else:
        # waistband rib
        wb = int(np.sum(ys >= y_waist - 0.05))
        mask[..., 0] = 1
        mask_w = mask.copy(); mask_w[..., 0] = 0; mask_w[..., 1] = 1
        split = n_yoke - wb
        if split < 1:
            split = 1
        grid_faces(mesh, "display", verts[: split + 1], uv[: split + 1], uv2[: split + 1], mask[: split + 1], wrap_u=True)
        grid_faces(mesh, "rib", verts[split:], uv[split:], uv2[split:], mask_w[split:], wrap_u=True)

    # legs
    for side, s in (("L", -1), ("R", 1)):
        n = 36
        t = np.linspace(0, 1, n)
        # hip, knee, ankle
        hip = np.array([0.09 * s, y_crotch, 0.0])
        mid = np.array([0.10 * s, (y_crotch + y_knee) / 2, 0.01])
        knee = np.array([0.10 * s, y_knee, 0.035])  # slight forward
        mid2 = np.array([0.09 * s, (y_knee + y_ankle) / 2, 0.01])
        ank = np.array([0.07 * s, y_ankle, 0.0])
        ctrl = np.stack([hip, mid, knee, mid2, ank])
        path = []
        for u in t:
            x = u * (len(ctrl) - 1)
            i = int(np.clip(math.floor(x), 0, len(ctrl) - 2))
            f = x - i
            p_1 = ctrl[max(i - 1, 0)]; p0 = ctrl[i]; p1 = ctrl[i + 1]; p2 = ctrl[min(i + 2, len(ctrl) - 1)]
            f2, f3 = f * f, f * f * f
            p = 0.5 * ((2 * p0) + (-p_1 + p1) * f + (2 * p_1 - 5 * p0 + 4 * p1 - p2) * f2 + (-p_1 + 3 * p0 - 3 * p1 + p2) * f3)
            path.append(p)
        path = np.array(path)
        r_hip, r_th, r_kn, r_calf, r_ank = 0.085, 0.08, 0.065, 0.055, 0.048
        if inner:
            r_hip, r_th, r_kn, r_calf, r_ank = [x * 0.88 for x in (r_hip, r_th, r_kn, r_calf, r_ank)]
        r = np.zeros(n)
        for i, u in enumerate(t):
            if u < 0.35:
                r[i] = lerp(r_hip, r_kn, smooth(u / 0.35))
            elif u < 0.5:
                r[i] = lerp(r_kn, r_calf, smooth((u - 0.35) / 0.15))
            else:
                r[i] = lerp(r_calf, r_ank, smooth((u - 0.5) / 0.5))
        cuff = smooth((t - 0.88) / 0.12)
        if not inner:
            r = r + 0.006 * cuff
        av, *_ = tube_surface(path, r, n_u=32)
        # knee folds
        av = add_elbow_folds(av, path, inner)  # same idea works at the knee (forward bend)
        # extra long folds on thigh
        out = vnorm(av - path[:, None, :])
        ang = np.arctan2(av[:, :, 2], av[:, :, 0] - path[:, None, 0])
        fade = np.clip((0.35 - t) / 0.35, 0, 1)[:, None]
        wr = np.sin(ang * 6 + path[:, None, 1] * 8) * fade * (0.005 if not inner else 0.002)
        av = av + out * wr[..., None]
        auv = fabric_uv(av, 2.0)
        auv2 = np.zeros((n, 32, 2))
        auv2[:, :, 0] = 0.05 + 0.4 * (0 if s < 0 else 1) + 0.4 * (np.arange(32) / 32)
        auv2[:, :, 1] = 0.02 + 0.9 * t[:, None]
        am = np.zeros((n, 32, 4), np.float32)
        if inner:
            am[..., 1] = 1
            grid_faces(mesh, "inner", av, auv, auv2, am, wrap_u=True)
        else:
            am[..., 0] = 1 - cuff[:, None]
            am[..., 1] = cuff[:, None]
            ci = int(0.88 * (n - 1))
            grid_faces(mesh, "display", av[: ci + 1], auv[: ci + 1], auv2[: ci + 1], am[: ci + 1], wrap_u=True)
            grid_faces(mesh, "rib", av[ci:], auv[ci:], auv2[ci:], am[ci:], wrap_u=True)
            ring = av[-1]; ctr = ring.mean(0)
            for j in range(32):
                j2 = (j + 1) % 32
                mesh.add_tri("rib", [ring[j2], ring[j], ctr], None, None, [(0, 1, 0, 0)] * 3)
    # waist dock / slim pack for pants inner
    if inner:
        box_y, box_z = y_waist - 0.08, -0.12
        # reuse connector style
        meta = dict(y_sh=y_waist - 0.05, y_neck=y_waist, y_chest=y_crotch, y_waist=y_crotch, y_hem=y_ankle,
                    rx=dict(sh=0.17, neck=0.16, chest=0.18, waist=0.17, hem=0.17),
                    rz=dict(sh=0.12, neck=0.11, chest=0.13, waist=0.12, hem=0.12))
        connectors_and_pack(mesh, meta, inner=True)
    mesh.weld_and_normals()
    return mesh, {}


# ---------------------------------------------------------------------------
# GLB export
# ---------------------------------------------------------------------------
MATS = {
    "display": dict(base=[0.02, 0.02, 0.03, 1], metal=0.05, rough=0.18, emissive=[0, 0, 0], name="display"),
    "rib": dict(base=[0.07, 0.07, 0.08, 1], metal=0.0, rough=0.7, emissive=[0, 0, 0], name="rib"),
    "fabric": dict(base=[0.06, 0.06, 0.07, 1], metal=0.0, rough=0.62, emissive=[0, 0, 0], name="fabric"),
    "lining": dict(base=[0.09, 0.09, 0.10, 1], metal=0.0, rough=0.75, emissive=[0, 0, 0], name="lining"),
    "inner": dict(base=[0.12, 0.125, 0.13, 1], metal=0.0, rough=0.78, emissive=[0, 0, 0], name="inner"),
    "metal": dict(base=[0.72, 0.73, 0.75, 1], metal=1.0, rough=0.28, emissive=[0, 0, 0], name="metal"),
    "cord": dict(base=[0.04, 0.04, 0.045, 1], metal=0.0, rough=0.8, emissive=[0, 0, 0], name="cord"),
    "pack": dict(base=[0.04, 0.045, 0.05, 1], metal=0.15, rough=0.4, emissive=[0, 0, 0], name="pack"),
    "dock": dict(base=[0.08, 0.08, 0.09, 1], metal=0.4, rough=0.35, emissive=[0, 0, 0], name="dock"),
    "cable": dict(base=[0.02, 0.02, 0.02, 1], metal=0.0, rough=0.6, emissive=[0, 0, 0], name="cable"),
    "led": dict(base=[0.1, 0.8, 0.4, 1], metal=0.0, rough=0.3, emissive=[0.2, 1.0, 0.4], name="led"),
}

def export_glb(mesh: Mesh, path: str):
    # pack all buffers
    bin_parts = []
    accessors = []
    bufferviews = []
    primitives = []
    materials = []
    mat_index = {}

    def add_view(data: bytes, target=None):
        # pad to 4
        pad = (4 - (len(data) % 4)) % 4
        offset = sum(len(p) for p in bin_parts)
        bin_parts.append(data + (b"\x00" * pad))
        bv = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target:
            bv["target"] = target
        bufferviews.append(bv)
        return len(bufferviews) - 1

    for mat, g in mesh.groups.items():
        if len(g["i"]) == 0:
            continue
        if mat not in mat_index:
            md = MATS.get(mat, MATS["fabric"])
            pbr = {
                "baseColorFactor": md["base"],
                "metallicFactor": md["metal"],
                "roughnessFactor": md["rough"],
            }
            m = {"name": md["name"], "pbrMetallicRoughness": pbr, "doubleSided": True}
            if any(md["emissive"]):
                m["emissiveFactor"] = md["emissive"]
            mat_index[mat] = len(materials)
            materials.append(m)
        v = np.asarray(g["v"], dtype=np.float32)
        n = np.asarray(g["n"], dtype=np.float32)
        uv = np.asarray(g["uv"], dtype=np.float32)
        uv2 = np.asarray(g["uv2"], dtype=np.float32)
        msk = np.asarray(g["m"], dtype=np.float32)
        idx = np.asarray(g["i"], dtype=np.uint32)
        def acc(arr, typ, comp, target=None, normalized=False):
            data = arr.tobytes()
            vi = add_view(data, target)
            mn = arr.reshape(len(arr), -1).min(0).tolist()
            mx = arr.reshape(len(arr), -1).max(0).tolist()
            a = {"bufferView": vi, "componentType": typ, "count": len(arr), "type": comp, "min": mn, "max": mx}
            if typ == 5126 and comp != "SCALAR":
                # min max ok
                pass
            if typ == 5125 or typ == 5123:
                a.pop("min", None); a.pop("max", None)
                # indices should have min/max too but optional
            accessors.append(a)
            return len(accessors) - 1
        ai = acc(idx, 5125, "SCALAR", 34963)
        av = acc(v, 5126, "VEC3", 34962)
        an = acc(n, 5126, "VEC3", 34962)
        au = acc(uv, 5126, "VEC2", 34962)
        au2 = acc(uv2, 5126, "VEC2", 34962)
        am = acc(msk, 5126, "VEC4", 34962)
        primitives.append({
            "attributes": {"POSITION": av, "NORMAL": an, "TEXCOORD_0": au, "TEXCOORD_1": au2, "COLOR_0": am},
            "indices": ai,
            "material": mat_index[mat],
        })
    blob = b"".join(bin_parts)
    gltf = {
        "asset": {"version": "2.0", "generator": "exovela-sculpt"},
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": bufferviews,
        "accessors": accessors,
        "materials": materials,
        "meshes": [{"name": mesh.name, "primitives": primitives}],
        "nodes": [{"name": mesh.name, "mesh": 0}],
        "scenes": [{"nodes": [0]}],
        "scene": 0,
    }
    js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    js += b" " * ((4 - (len(js) % 4)) % 4)
    # GLB
    def chunk(tag, data):
        return struct.pack("<I", len(data)) + tag + data
    body = b"glTF" + struct.pack("<II", 2, 12 + 8 + len(js) + 8 + len(blob) + ((4 - (len(blob) % 4)) % 4))
    pad = (4 - (len(blob) % 4)) % 4
    blob_p = blob + b"\x00" * pad
    raw = body + chunk(b"JSON", js) + chunk(b"BIN\x00", blob_p)
    # fix total length
    total = len(raw)
    raw = raw[:8] + struct.pack("<I", total) + raw[12:]
    with open(path, "wb") as f:
        f.write(raw)
    verts_n = sum(len(g["v"]) for g in mesh.groups.values())
    tris = sum(len(g["i"]) // 3 for g in mesh.groups.values())
    print(f"glb {os.path.basename(path)}  {len(raw)/1024:.1f} KB  {verts_n} verts  {tris} tris  mats={list(mesh.groups)}")


def main():
    print("textures…")
    needed = ["shell_normal.png","knit_normal.png","rib_normal.png","wood_albedo.png","moon.png","metal_normal.png"]
    if not all(os.path.exists(os.path.join(TEX, n)) for n in needed):
        gen_fabric_normal(2048, "shell")
        gen_fabric_normal(2048, "knit")
        gen_rib_normal(1024)
        gen_wood(2048)
        gen_moon(1024)
        gen_metal_normal(256)
    else:
        if not os.path.exists(os.path.join(TEX, "moon.png")):
            gen_moon(1024)
        if not os.path.exists(os.path.join(TEX, "metal_normal.png")):
            gen_metal_normal(256)
        print("textures exist, skipping (except missing)")

    print("meshes…")
    # Monkey-patch the broken jacket collar block in build_top by just calling add_jacket_collar
    # (the broken source lines would SyntaxError — I must not have a wait_fix in the actual file)
    for kind in ("hoodie", "jacket"):
        for inner in (False, True):
            m, _ = build_top(kind, inner)
            export_glb(m, os.path.join(MOD, f"{kind}_{'inner' if inner else 'outer'}.glb"))
    for inner in (False, True):
        m, _ = build_pants(inner)
        export_glb(m, os.path.join(MOD, f"joggers_{'inner' if inner else 'outer'}.glb"))
    print("done")

if __name__ == "__main__":
    main()
