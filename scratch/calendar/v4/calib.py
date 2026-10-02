"""Solve the reel's source->grid transform (offset/scale of the 49x40 cell grid on the 640x480 original) and the exact
original frame behind every reel dance frame, scoring luminance correlation on the reel's dancer cells."""
import numpy as np, json
W = r'C:\cal4work'
PAL = ['#53b44b', '#0b8043', '#616161', '#fbfbfb', '#a6c1f6', '#7986cb', '#5482eb', '#3f51b5', '#039be5',
       '#d50000', '#f4511e', '#f6bf26', '#e67c73']
plum = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in PAL], np.float32) @ [0.299, 0.587, 0.114]
maps = np.load(W + r'\reel_maps.npy')
orig = np.load(W + r'\orig480.npy', mmap_mode='r')
path = np.load(W + r'\align_path.npy')
dp = {int(n): int(s) for n, s, _ in path}
lum_cache = {}

def lum(i):
    if i not in lum_cache:
        lum_cache[i] = np.asarray(orig[i], np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
    return lum_cache[i]

def cells(L, x0, y0, sx, sy):
    # integral image box means
    ii = np.pad(L.cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    xs = np.clip(np.round(x0 + sx * np.arange(50)).astype(int), 0, 640)
    ys = np.clip(np.round(y0 + sy * np.arange(41)).astype(int), 0, 480)
    A = ii[ys[1:, None], xs[None, 1:]] - ii[ys[:-1, None], xs[None, 1:]] - ii[ys[1:, None], xs[None, :-1]] + ii[ys[:-1, None], xs[None, :-1]]
    area = np.maximum(1, (ys[1:] - ys[:-1])[:, None] * (xs[1:] - xs[:-1])[None])
    return A / area

def score(n, i, g):
    m = maps[n]; k = m != 0
    a = plum[m[k]]; b = cells(lum(i), *g)[k]
    a = a - a.mean(); b = b - b.mean()
    return (a * b).sum() / np.sqrt((a * a).sum() * (b * b).sum() + 1e-9)

ns = list(range(126, 268, 7))
base = (0.0, 0.0, 640 / 49, 12.0)
def total(g): return np.mean([max(score(n, dp[n] + d, g) for d in (-1, 0, 1)) for n in ns])
base = (7.35, 12.0, 12.761, 11.4); best = (total(base), base)
print('base', round(best[0], 4))
for it in range(12):
    x0, y0, sx, sy = best[1]
    for g in [(x0 + dx, y0, sx, sy) for dx in (-4, -2, -1, 1, 2, 4)] + [(x0, y0 + dy, sx, sy) for dy in (-4, -2, -1, 1, 2, 4)] + \
             [(x0 - 24.5 * ds, y0, sx + ds, sy) for ds in (-0.3, -0.15, 0.15, 0.3)] + [(x0, y0 - 20 * ds, sx, sy + ds) for ds in (-0.3, -0.15, 0.15, 0.3)]:
        s = total(g)
        if s > best[0]: best = (s, g)
    print('iter', it, round(best[0], 4), np.round(best[1], 3))
G = best[1]
match = {}
for n in range(66, 268):
    cand = range(dp[n] - 3, dp[n] + 4)
    sc = [score(n, i, G) for i in cand]
    match[n] = (int(cand[int(np.argmax(sc))]), float(max(sc)))
seq = [match[n][0] for n in range(66, 268)]
print('reel->orig', [(n, match[n][0]) for n in range(66, 268, 10)])
print('steps of orig index per reel frame:', np.bincount(np.clip(np.diff(seq) + 1, 0, 5)))
json.dump({'grid': list(G), 'match': {n: match[n] for n in match}}, open(W + r'\calib.json', 'w'))
