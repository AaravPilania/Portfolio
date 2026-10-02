"""Monotone alignment reel n66-267 -> original frames, scored only on the reel's dancer cells."""
import numpy as np
W = r'C:\cal4work'
PAL = ['#53b44b', '#0b8043', '#616161', '#fbfbfb', '#a6c1f6', '#7986cb', '#5482eb', '#3f51b5', '#039be5',
       '#d50000', '#f4511e', '#f6bf26', '#e67c73']
prgb = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in PAL], np.float32)
plum = prgb @ [0.299, 0.587, 0.114]
maps = np.load(W + r'\reel_maps.npy')
small = np.load(W + r'\orig_small.npy')
slum = (small @ np.array([0.299, 0.587, 0.114], np.float32)).reshape(len(small), -1)

d = [(maps[n] != maps[n - 1]).mean() for n in range(67, 268)]
print('reel consecutive cell change: zero-change frames', sum(x == 0 for x in d), 'of', len(d),
      ' <1%:', sum(x < 0.01 for x in d), ' median %.3f' % np.median(d))
print('low-change reel frames:', [67 + i for i, x in enumerate(d) if x < 0.01])

LO, HI = 560, 1100
R = range(66, 268)
sc = np.full((len(R), HI - LO), -1.0)
for i, n in enumerate(R):
    m = maps[n].ravel()
    k = m != 0
    if k.sum() < 10:
        continue
    a = plum[m[k]]; a = (a - a.mean()) / (a.std() + 1e-6)
    b = slum[LO:HI][:, k]; b = (b - b.mean(1, keepdims=True)) / (b.std(1, keepdims=True) + 1e-6)
    sc[i] = (b @ a) / k.sum()
# DP: each reel step advances the source by 0, 1 or 2 frames
P = len(R); Q = HI - LO
acc = np.full((P, Q), -1e9); back = np.zeros((P, Q), int)
acc[0] = sc[0]
for i in range(1, P):
    for s in (0, 1, 2):
        cand = np.full(Q, -1e9); cand[s:] = acc[i - 1][:Q - s] - (0.15 if s == 2 else 0)
        better = cand > acc[i] - 0  # compare with current best
        upd = cand + sc[i] > acc[i]
        acc[i][upd] = cand[upd] + sc[i][upd]; back[i][upd] = s
j = int(acc[-1].argmax()); path = [j]
for i in range(P - 1, 0, -1):
    j -= back[i][j]; path.append(j)
path = path[::-1]
src = np.array(path) + LO
for i in range(0, P, 6):
    print('reel n%d -> orig %d  sc %.3f  (free best %d %.3f)' % (R[i], src[i], sc[i][src[i] - LO], sc[i].argmax() + LO, sc[i].max()))
np.save(W + r'\align_path.npy', np.stack([np.array(list(R)), src, [sc[i][src[i] - LO] for i in range(P)]], 1))
