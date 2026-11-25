#!/usr/bin/env python3
"""Original procedural stockinette knit maps for the 3D viewer: normal + height (tileable)."""
import numpy as np, os
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'textures')
S = 1024; NC, NR = 8, 10          # stitch columns and rows per tile
y, x = np.mgrid[0:S, 0:S].astype(np.float64)
u = x / S * NC; v = y / S * NR
H = np.zeros((S, S))
rng = np.random.default_rng(7)
jit = rng.normal(0, 1, (NR + 2, NC + 2))
for dy in (-1, 0, 1):
    for dx in (-1, 0, 1):
        ci = np.floor(u) + dx; ri = np.floor(v) + dy
        lu = u - ci; lv = v - ri
        j = jit[(ri.astype(int) % NR) + 1, (ci.astype(int) % NC) + 1]
        for side, cx, ang in ((0, 0.27, 0.46), (1, 0.73, -0.46)):
            # one leaning loop of the V, stretched so it reaches into the stitch below
            px = lu - cx; py = lv - 0.55
            ca, sa = np.cos(ang), np.sin(ang)
            ax = px * ca - py * sa; ay = px * sa + py * ca
            d = (ax / 0.235) ** 2 + (ay / 0.74) ** 2
            lobe = np.clip(1 - d, 0, 1) ** 0.5
            ply = 0.035 * np.sin(ay * 30 + ax * 9 + side * 1.7 + j)      # twisted plies of the yarn
            fuzz = 0.03 * j
            H = np.maximum(H, lobe * (0.92 + fuzz) + ply * lobe)
# soften and add a little fibre noise
from PIL import ImageFilter
n = rng.normal(0, 1, (S, S)); n = np.asarray(Image.fromarray(((n * 20) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), float) / 255 - .5
H = H + n * 0.05
H = (H - H.min()) / (H.max() - H.min())
Him = Image.fromarray((H * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
H = np.asarray(Him, float) / 255
gx = (np.roll(H, -1, 1) - np.roll(H, 1, 1)) * 0.5; gy = (np.roll(H, -1, 0) - np.roll(H, 1, 0)) * 0.5
k = 9.0
N = np.dstack([-gx * k, gy * k, np.ones_like(H)])
N /= np.linalg.norm(N, axis=2, keepdims=True)
img = ((N * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8)
Image.fromarray(img).save(os.path.join(OUT, 'knit3d_normal.webp'), quality=92, method=6)
Him.save(os.path.join(OUT, 'knit3d_height.webp'), quality=90, method=6)
Image.fromarray(img).crop((0, 0, 384, 384)).save('/workspace/r4work/knit3d_preview.png')
print('ok')
