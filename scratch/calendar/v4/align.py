"""Find, for each reel dance frame, the original frame it was rendered from (full-frame 4:3 -> 49x40 hypothesis)."""
import numpy as np, sys
W = r'C:\cal4work'
PAL = ['#53b44b', '#0b8043', '#616161', '#fbfbfb', '#a6c1f6', '#7986cb', '#5482eb', '#3f51b5', '#039be5',
       '#d50000', '#f4511e', '#f6bf26', '#e67c73']
prgb = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in PAL], np.float32)
plum = prgb @ [0.299, 0.587, 0.114]
maps = np.load(W + r'\reel_maps.npy')
orig = np.load(W + r'\orig480.npy', mmap_mode='r')
N = len(orig)
try:
    small = np.load(W + r'\orig_small.npy')
except FileNotFoundError:
    # 640x480 -> 49x40 by area: crop to 637x480 (13 px cols) and 12 px rows
    small = np.zeros((N, 40, 49, 3), np.float32)
    for i in range(N):
        f = orig[i, :, 1:638].astype(np.float32)
        small[i] = f.reshape(40, 12, 49, 13, 3).mean((1, 3))
    np.save(W + r'\orig_small.npy', small)
slum = small @ np.array([0.299, 0.587, 0.114], np.float32)  # N,40,49

def z(a):
    a = a - a.mean(-1, keepdims=True)
    return a / (np.sqrt((a * a).sum(-1, keepdims=True)) + 1e-6)

S = z(slum.reshape(N, -1))
res = []
for n in range(66, 268):
    m = maps[n]
    mask = (m != 0).astype(np.float32).ravel()
    lum = np.where(m == 0, 0, plum[m]).ravel()  # field cells read as dark background
    sc = S @ z(lum[None])[0]
    best = int(sc.argmax())
    res.append((n, best, float(sc[best]), float(np.sort(sc)[-30])))
for r in res[::4]:
    print('reel n%d -> orig %d (t=%.2f) score %.3f (30th %.3f)' % (r[0], r[1], r[1] / 25, r[2], r[3]))
np.save(W + r'\align_raw.npy', np.array(res))
