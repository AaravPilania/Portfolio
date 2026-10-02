"""Render the rolled-camera shot after the occlusion (orig 1044-1121) in the reel's cell style.

The camera is rolled ~90 degrees there, so each frame is turned 90 degrees clockwise (the kid stands upright, head to
knees in view) and the residual roll of the settling camera (1044-1057) is taken out with the kid's smoothed body axis.
The frame is scaled S and translated so the kid's smoothed head-top and centre sit where the main shot leaves him
(the kid's head spans ~7 reel cells at the end of the main shot, ~6 here unscaled). The camera's white balance differs
from the main shot's, so the kid's pixels get a Lab mean/std transfer onto the main-shot kid's (orig 700-797).
Cells, mask threshold, spike fix and the colour classifier are v4/render.py's: tracked mask coverage >= TAU on the
calibrated 49x40 grid, colours from a HistGradientBoosting classifier on in-mask colour statistics fitted on the reel
overlap (held-out n201-267 agreement printed). REFIT=1 refits the classifier, otherwise the cached one is used.
Writes C:/cal4work/tilt_ours.npz (f<orig index> -> 40x49 palette map) and tilt_warp.npz (warped frames, for sheets).
"""
import numpy as np, json, os, cv2, pickle
from sklearn.ensemble import HistGradientBoostingClassifier
W = r'C:\cal4work'
A, B = 597, 1010
C0, C1 = 1044, 1122
S, X_T, Y_T = float(os.environ.get('SCALE', 1.2)), 290.0, 100.0
TAU = 0.6
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


def feats_img(img, k):
    img = np.asarray(img, np.float32)
    F = np.zeros((40, 49, 15 + 27), np.float32)
    q = np.digitize(img, [50, 110]).astype(np.int32)
    qi = q[..., 0] * 9 + q[..., 1] * 3 + q[..., 2]
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


# ---- the main shot's kid track over the overlap (as render.py)
reel_of = {}
for n, i in match.items(): reel_of.setdefault(i, n)
kid = {}
prev = None
for i in range(match[66], match[267] + 1):
    ms = inst(i)
    if not len(ms): kid[i] = np.zeros((480, 640), bool); continue
    if i in reel_of:
        rm = maps[reel_of[i]] != 0
        sc = [((coverage(m) > 0.5) & rm).sum() / max(1, ((coverage(m) > 0.5) | rm).sum()) for m in ms]
    else:
        sc = [(m & prev).sum() / max(1, (m | prev).sum()) for m in ms]
    j = int(np.argmax(sc)); kid[i] = ms[j]; prev = ms[j]

PK = W + r'\tilt_clf.pkl'
if os.environ.get('REFIT') == '1' or not os.path.exists(PK):
    fc = {}
    def F(i):
        if i not in fc: fc[i] = feats_img(orig[i], kid[i])
        return fc[i]
    def dataset(ns):
        X, y = [], []
        for n in ns:
            m = maps[n]; k = m != 0
            X.append(F(match[n])[k]); y.append(m[k])
        return np.concatenate(X), np.concatenate(y)
    clf = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.08, max_leaf_nodes=31, l2_regularization=1.0)
    Xtr, ytr = dataset(range(123, 201)); Xte, yte = dataset(range(201, 268))
    clf.fit(Xtr, ytr)
    print('colour agreement on dancer cells: train %.3f  held-out n201-267 %.3f' % ((clf.predict(Xtr) == ytr).mean(), (clf.predict(Xte) == yte).mean()))
    held = range(201, 268)
    def agree(pred, tag):
        allc = np.mean([(pred[n] == maps[n]).mean() for n in held])
        uni = np.mean([((pred[n] == maps[n]) & ((maps[n] != 0) | (pred[n] != 0))).sum() / max(1, ((maps[n] != 0) | (pred[n] != 0)).sum()) for n in held])
        sil = np.mean([((pred[n] != 0) & (maps[n] != 0)).sum() / max(1, ((pred[n] != 0) | (maps[n] != 0)).sum()) for n in held])
        print('overlap n201-267 %s: all-cell agreement %.3f, dancer-union colour agreement %.3f, silhouette IoU %.3f' % (tag, allc, uni, sil))
    def render_main(i):
        m = np.zeros((40, 49), np.uint8); k = coverage(kid[i]) >= TAU
        if k.any(): m[k] = clf.predict(F(i)[k])
        return m
    agree({n: render_main(match[n]) for n in held}, '(held out: fitted on n123-200)')
    ours = np.load(W + r'\ours.npz')
    agree({n: ours[f'f{match[n]}'] for n in held}, '(shipped ours.npz, fitted on the whole overlap)')
    X, y = dataset(range(123, 268)); clf.fit(X, y)
    pickle.dump(clf, open(PK, 'wb'))
clf = pickle.load(open(PK, 'rb'))

# ---- colour transfer target: the main-shot kid's pixels in Lab
def lab(img): return cv2.cvtColor(np.ascontiguousarray(img), cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)
tgt = np.concatenate([lab(orig[i])[kid[i].ravel()] for i in range(700, 798, 3)])
mu_t, sd_t = tgt.mean(0), tgt.std(0)

# ---- the rolled shot
tk = np.load(W + r'\tiltkid.npz')
km = {i: np.unpackbits(tk[f'k{i}'], axis=-1)[..., :480].astype(bool) for i in range(C0 - 12, C1 + 12) if f'k{i}' in tk.files}
cen, top, axis = {}, {}, {}
for i, k in km.items():
    yy, xx = np.nonzero(k)
    if len(yy) < 1000: continue
    p = np.c_[yy, xx].astype(float); c = p.mean(0)
    _, _, vt = np.linalg.svd(p - c, full_matrices=False)
    d = vt[0] if vt[0][0] > 0 else -vt[0]
    axis[i] = np.degrees(np.arctan2(d[1], d[0]))
    cen[i] = c[1]; top[i] = np.nonzero(k.any(1))[0].min()
def smooth(d, i, h):
    v = [d[j] for j in range(i - h, i + h + 1) if j in d]
    return float(np.median(v)) if len(v) else 0.0
rot = {i: cv2.rotate(np.ascontiguousarray(orig[i]), cv2.ROTATE_90_CLOCKWISE) for i in range(C0 - 3, C1 + 3)}
src = np.concatenate([lab(rot[i])[km[i].ravel()] for i in range(1052, C1, 3)])
mu_s, sd_s = src.mean(0), src.std(0)
print('Lab kid mean main', mu_t.round(1), 'rolled', mu_s.round(1), ' std main', sd_t.round(1), 'rolled', sd_s.round(1))
def transfer(img):
    L = (lab(img) - mu_s) / sd_s * sd_t + mu_t
    return cv2.cvtColor(np.clip(L, 0, 255).astype(np.uint8).reshape(img.shape), cv2.COLOR_LAB2RGB)

img_w, mk_w, cov = {}, {}, {}
for i in range(C0 - 3, C1 + 3):
    roll = smooth(axis, i, 4) if i < 1058 else 0.0
    cx, ty = smooth(cen, i, 12), smooth(top, i, 12)
    R = cv2.getRotationMatrix2D((cx, 400.0), -roll, 1.0)
    M = np.array([[S, 0, X_T - S * cx], [0, S, Y_T - S * ty]]) @ np.vstack([R, [0, 0, 1]])
    img_w[i] = cv2.warpAffine(transfer(rot[i]), M, (640, 480), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0))
    mk_w[i] = cv2.warpAffine(km[i].astype(np.uint8), M, (640, 480), flags=cv2.INTER_NEAREST) > 0
    cov[i] = coverage(mk_w[i])
# a frame whose dancer area jumps against its neighbours (the mask fused someone in) takes their median (render.py's rule)
raw = dict(cov)
area = lambda c: (c >= TAU).sum()
iou = lambda a, b: ((a >= TAU) & (b >= TAU)).sum() / max(1, ((a >= TAU) | (b >= TAU)).sum())
for i in range(C0, C1):
    nb = [raw[i + d] for d in (-3, -2, -1, 1, 2, 3)]
    med = np.median([area(c) for c in nb])
    if area(raw[i]) > 1.3 * med or (iou(raw[i], raw[i - 1]) < 0.55 and iou(raw[i], raw[i + 1]) < 0.55):
        cov[i] = np.median(np.stack([raw[i + d] for d in (-2, -1, 1, 2)]), 0)
        print('spike fixed', i, int(area(raw[i])), '->', int(area(cov[i])))
out, warped = {}, {}
for i in range(C0, C1):
    m = np.zeros((40, 49), np.uint8)
    k = cov[i] >= TAU
    if k.any(): m[k] = clf.predict(feats_img(img_w[i], mk_w[i])[k])
    out[f'f{i}'] = m; warped[f'w{i}'] = img_w[i]
np.savez_compressed(W + r'\tilt_ours.npz', **out)
np.savez_compressed(W + r'\tilt_warp.npz', **warped)
main = np.load(W + r'\ours.npz')
share = lambda maps_: np.bincount(np.concatenate([q[q != 0] for q in maps_]), minlength=13) / sum((q != 0).sum() for q in maps_)
print('dancer cells: main 940-981 median %d, rolled median %d' % (np.median([(main[f'f{i}'] != 0).sum() for i in range(940, 982)]), np.median([(out[f'f{i}'] != 0).sum() for i in range(C0, C1)])))
print('colour share main 900-981:', share([main[f'f{i}'] for i in range(900, 982)]).round(3))
print('colour share rolled      :', share([out[f'f{i}'] for i in range(C0, C1)]).round(3))
print('done')
