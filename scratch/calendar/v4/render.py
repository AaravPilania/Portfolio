"""Render original frames in the reel's cell style and measure agreement with the reel on the overlap.

1. Track the kid's YOLO instance through the shot (seeded by the reel's dancer cells, then max IoU frame to frame).
2. Cells on the calibrated grid (calib.json) are dancer cells when the kid's mask covers >= TAU of them.
3. Dancer cell colour: a classifier on in-mask colour statistics, fitted on reel cells (train n123-200, test n201-267).
Writes C:/cal4work/ours.npz (maps for orig frames A..B) and prints agreement.
"""
import numpy as np, json, os
from sklearn.ensemble import HistGradientBoostingClassifier
W = r'C:\cal4work'
A, B = 597, 1010
cal = json.load(open(W + r'\calib.json'))
x0, y0, sx, sy = cal['grid']
match = {int(k): v[0] for k, v in cal['match'].items()}
maps = np.load(W + r'\reel_maps.npy')
orig = np.load(W + r'\orig480.npy', mmap_mode='r')
seg = np.load(W + rf'\seg_{A}_{B}.npz')
xs = np.clip(np.round(x0 + sx * np.arange(50)).astype(int), 0, 640)
ys = np.clip(np.round(y0 + sy * np.arange(41)).astype(int), 0, 480)

def inst(i):
    m = seg[f'm{i}']
    return np.unpackbits(m, axis=-1)[..., :640].astype(bool) if len(m) else np.zeros((0, 480, 640), bool)

def coverage(mask):
    ii = np.pad(mask.astype(np.float32).cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    a = ii[ys[1:, None], xs[None, 1:]] - ii[ys[:-1, None], xs[None, 1:]] - ii[ys[1:, None], xs[None, :-1]] + ii[ys[:-1, None], xs[None, :-1]]
    return a / ((ys[1:] - ys[:-1])[:, None] * (xs[1:] - xs[:-1])[None])

# ---- tracking
reel_of = {}
for n, i in match.items(): reel_of.setdefault(i, n)
kid = {}
prev = None
start = match[66]
for i in list(range(start, B)) + list(range(start - 1, A - 1, -1)):
    if i == start - 1: prev = kid[start]
    ms = inst(i)
    if not len(ms):
        kid[i] = np.zeros((480, 640), bool); continue
    if i in reel_of and i >= start:
        rm = maps[reel_of[i]] != 0
        sc = [((coverage(m) > 0.5) & rm).sum() / max(1, ((coverage(m) > 0.5) | rm).sum()) for m in ms]
    else:
        sc = [(m & prev).sum() / max(1, (m | prev).sum()) for m in ms]
    j = int(np.argmax(sc))
    kid[i] = ms[j]; prev = ms[j]
print('tracked', len(kid))

# ---- mask threshold on the overlap
ov = sorted(n for n in range(123, 268))
cov = {i: coverage(kid[i]) for i in kid}
TAU = float(os.environ.get('TAU', 0.6))
# a frame whose dancer area jumps against its neighbours (YOLO fused someone else in) takes their median coverage
raw = dict(cov)
for i in range(A + 3, B - 3):
    area = lambda c: (c >= TAU).sum()
    nb = [raw[i + d] for d in (-3, -2, -1, 1, 2, 3)]
    med = np.median([area(c) for c in nb])
    iou = lambda a, b: ((a >= TAU) & (b >= TAU)).sum() / max(1, ((a >= TAU) | (b >= TAU)).sum())
    if area(raw[i]) > 1.3 * med or (iou(raw[i], raw[i - 1]) < 0.55 and iou(raw[i], raw[i + 1]) < 0.55):
        cov[i] = np.median(np.stack([raw[i + d] for d in (-2, -1, 1, 2)]), 0)
        print('spike fixed', i, int(area(raw[i])), '->', int(area(cov[i])))
for tau in (0.4, 0.5, 0.6, 0.7, 0.8):
    agree = np.mean([((cov[match[n]] >= tau) == (maps[n] != 0)).mean() for n in ov])
    iou = np.mean([((cov[match[n]] >= tau) & (maps[n] != 0)).sum() / max(1, ((cov[match[n]] >= tau) | (maps[n] != 0)).sum()) for n in ov])
    print('tau %.1f: mask cell agreement %.3f, IoU %.3f' % (tau, agree, iou))

# ---- colour features
def feats(i):
    img = np.asarray(orig[i], np.float32)
    k = kid[i]
    F = np.zeros((40, 49, 15 + 27), np.float32)
    q = np.digitize(img, [50, 110]).astype(np.int32)
    qi = q[..., 0] * 9 + q[..., 1] * 3 + q[..., 2]
    hsv_v = img.max(-1)
    for r in range(40):
        for c in range(49):
            sl = (slice(ys[r], ys[r + 1]), slice(xs[c], xs[c + 1]))
            px = img[sl].reshape(-1, 3); mk = k[sl].ravel()
            p = px[mk] if mk.sum() >= 4 else px
            v = p.max(1); o = np.argsort(v)
            lo, hi = p[o[:max(1, len(o) // 3)]].mean(0), p[o[-max(1, len(o) // 3):]].mean(0)
            qq = qi[sl].ravel(); qq = qq[mk] if mk.sum() >= 4 else qq
            F[r, c] = np.r_[p.mean(0), np.median(p, 0), lo, hi, [mk.mean(), v.std(), r / 40], np.bincount(qq, minlength=27) / len(qq)]
    return F

fc = {}
def F(i):
    if i not in fc: fc[i] = feats(i)
    return fc[i]

def dataset(ns):
    X, y = [], []
    for n in ns:
        m = maps[n]; k = m != 0
        X.append(F(match[n])[k]); y.append(m[k])
    return np.concatenate(X), np.concatenate(y)

Xtr, ytr = dataset(range(123, 201)); Xte, yte = dataset(range(201, 268))
clf = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.08, max_leaf_nodes=31, l2_regularization=1.0)
clf.fit(Xtr, ytr)
print('colour agreement on dancer cells: train %.3f  test(held-out n201-267) %.3f' % ((clf.predict(Xtr) == ytr).mean(), (clf.predict(Xte) == yte).mean()))
print('label share', np.round(np.bincount(yte, minlength=13) / len(yte), 3))
def render(i):
    m = np.zeros((40, 49), np.uint8)
    k = cov[i] >= TAU
    if k.any(): m[k] = clf.predict(F(i)[k])
    return m

held = [n for n in range(201, 268)]
full = np.mean([(render(match[n]) == maps[n]).mean() for n in held])
dancer = np.mean([((render(match[n]) == maps[n]) & ((maps[n] != 0) | (render(match[n]) != 0))).sum() / max(1, ((maps[n] != 0) | (render(match[n]) != 0)).sum()) for n in held])
print('HELD-OUT overlap n201-267: all-cell agreement %.3f, agreement over dancer cells (union) %.3f' % (full, dancer))
# final model on the whole fine overlap
X, y = dataset(range(123, 268)); clf.fit(X, y)
out = {f'f{i}': render(i) for i in range(A, B)}
np.savez_compressed(W + r'\ours.npz', **out)
np.savez_compressed(W + r'\kidcov.npz', **{f'c{i}': cov[i] for i in cov})
allfit = np.mean([(out[f'f{match[n]}'] == maps[n]).mean() for n in range(66, 268)])
print('in-sample all-cell agreement over the whole reel dance n66-267: %.3f' % allfit)
