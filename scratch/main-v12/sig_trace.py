# python scratch/main-v12/sig_trace.py -> sig-v13.json, sig-v13-overlay.png, sig-v13-preview.png
# signature.png traced into pen strokes: skeleton -> junction graph (crossings contracted, spurs pruned, sharp apexes
# restored from their spurs) -> strokes chained through each junction by the straightest continuation -> cusps split
# -> each piece fitted with a smoothing cubic B-spline (scipy splprep) and sampled at 1px. Scored against the ink.
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.interpolate import splprep, splev
from skimage.morphology import skeletonize, binary_closing, disk

HERE = os.path.dirname(__file__)
SRC = r'C:\Users\gaura\Downloads\signature.png'
img = np.asarray(Image.open(SRC).convert('L')).astype(np.float32)
ink = img < 128
ink = binary_closing(ink, disk(1))
ink = ndi.binary_fill_holes(ink) & ink | ink
lab, nl = ndi.label(ink)
sizes = ndi.sum(ink, lab, range(1, nl + 1))
ink = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 20])
dt = ndi.distance_transform_edt(ink)
sk = skeletonize(ink)
R = float(np.median(dt[sk]))
print('ink px', int(ink.sum()), 'stroke radius', round(R, 2))

H, W = sk.shape
N8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
def nbrs(y, x):
    for dy, dx in N8:
        yy, xx = y + dy, x + dx
        if 0 <= yy < H and 0 <= xx < W and sk[yy, xx]: yield (yy, xx)
deg = np.zeros_like(sk, dtype=np.int32)
ys, xs = np.nonzero(sk)
for y, x in zip(ys, xs): deg[y, x] = sum(1 for _ in nbrs(y, x))

# Junction pixels clustered; endpoints are their own nodes
jl, nj = ndi.label((deg >= 3) & sk, structure=np.ones((3, 3)))
node_of = {}
nodes = []  # dict(p=np.array([x, y]), kind)
for k in range(1, nj + 1):
    py, px = np.nonzero(jl == k)
    nodes.append({'p': np.array([px.mean(), py.mean()]), 'kind': 'j'})
    for y, x in zip(py, px): node_of[(y, x)] = len(nodes) - 1
for y, x in zip(ys, xs):
    if deg[y, x] == 1:
        nodes.append({'p': np.array([x, y], float), 'kind': 'e'})
        node_of[(y, x)] = len(nodes) - 1

# Edges: walk from every node pixel's non-node neighbours to the next node
edges = []  # dict(a, b, pts)
seen = set()
for (y, x), n in list(node_of.items()):
    for q in nbrs(y, x):
        if q in node_of:
            m = node_of[q]
            if m != n and (min(n, m), max(n, m), 'direct') not in seen:
                seen.add((min(n, m), max(n, m), 'direct'))
                edges.append({'a': n, 'b': m, 'pts': [(x, y), (q[1], q[0])]})
            continue
        if ((y, x), q) in seen: continue
        path = [(y, x), q]
        prev, cur = (y, x), q
        while True:
            nx = [r for r in nbrs(*cur) if r != prev and r not in path[-3:]]
            hit = [r for r in nx if r in node_of and r != path[0]]
            if hit:
                path.append(hit[0]); break
            nx = [r for r in nx if r not in node_of]
            if not nx: break
            # prefer 4-neighbours to avoid diagonal shortcuts doubling back
            nx.sort(key=lambda r: abs(r[0] - cur[0]) + abs(r[1] - cur[1]))
            prev, cur = cur, nx[0]
            path.append(cur)
        end = path[-1]
        if end not in node_of: continue
        seen.add((path[-1], path[-2]))
        seen.add(((y, x), q))
        edges.append({'a': n, 'b': node_of[end], 'pts': [(c, r) for r, c in path]})
# drop duplicate walks (same pixel set)
uniq, keys = [], set()
for e in edges:
    k = frozenset(e['pts'])
    if k in keys: continue
    keys.add(k); uniq.append(e)
edges = uniq
print('nodes', len(nodes), 'edges', len(edges))

def elen(e):
    p = np.array(e['pts'], float)
    return float(np.hypot(*np.diff(p, axis=0).T).sum()) if len(p) > 1 else 0.0

# Union-find for contracting nodes
par = list(range(len(nodes)))
def find(i):
    while par[i] != i:
        par[i] = par[par[i]]; i = par[i]
    return i
def union(a, b):
    a, b = find(a), find(b)
    if a != b: par[b] = a

# 1. Contract short junction-junction bridges (an X skeletonises into two Ys joined by a stub)
MERGE = R * 2.2
for n in nodes: n['rad'] = R * 1.7
def arm_dir(e, j, reach):
    p = np.array(e['pts'], float)
    if e['b'] == j and e['a'] != j: p = p[::-1]
    L = elen(e)
    q = p[min(len(p) - 1, max(1, int(min(L, reach))))]
    v = q - p[0]
    n = np.hypot(*v)
    return v / n if n > 1e-6 else np.array([1.0, 0.0])
for e in edges:
    if nodes[e['a']]['kind'] == 'j' and nodes[e['b']]['kind'] == 'j' and elen(e) < MERGE:
        union(e['a'], e['b'])
# A shallow X skeletonises into two Ys joined by a long bridge: contract it when the four arms make two straight pairs
inc = {}
for e in edges:
    inc.setdefault(e['a'], []).append(e); inc.setdefault(e['b'], []).append(e)
for e in edges:
    a, b = e['a'], e['b']
    if a == b or nodes[a]['kind'] != 'j' or nodes[b]['kind'] != 'j' or elen(e) > R * 7: continue
    if len(inc[a]) != 3 or len(inc[b]) != 3: continue
    A = [f for f in inc[a] if f is not e]; B = [f for f in inc[b] if f is not e]
    if len(A) != 2 or len(B) != 2: continue
    da = [arm_dir(f, a, R * 5) for f in A]; db = [arm_dir(f, b, R * 5) for f in B]
    best = 999
    for (x, y) in ((0, 0), (0, 1)):
        d1 = math.degrees(math.acos(max(-1, min(1, float(-da[x] @ db[y])))))
        d2 = math.degrees(math.acos(max(-1, min(1, float(-da[1 - x] @ db[1 - y])))))
        best = min(best, max(d1, d2))
    if best < 35 and os.environ.get('SIG_X') == '1':
        union(a, b)
        half = elen(e) / 2
        nodes[find(a)]['rad'] = max(nodes[find(a)]['rad'], half + R * 1.7)
def rebuild():
    global edges
    groups = {}
    for i in range(len(nodes)): groups.setdefault(find(i), []).append(i)
    for r, g in groups.items():
        if len(g) > 1 or r != g[0]:
            c = np.mean([nodes[i]['p'] for i in g], axis=0)
            nodes[r]['rad'] = max([nodes[i]['rad'] for i in g] + [float(np.hypot(*(nodes[i]['p'] - c))) + R * 1.7 for i in g])
            nodes[r]['p'] = c
            if any(nodes[i]['kind'] == 'j' for i in g): nodes[r]['kind'] = 'j'
    out = []
    for e in edges:
        a, b = find(e['a']), find(e['b'])
        if a == b and elen(e) < MERGE * 1.5: continue
        out.append({'a': a, 'b': b, 'pts': e['pts']})
    edges = out
rebuild()

def degree():
    d = {}
    for e in edges:
        d[e['a']] = d.get(e['a'], 0) + 1
        d[e['b']] = d.get(e['b'], 0) + 1
    return d

def tangent(e, at_a, reach):
    p = np.array(e['pts'], float)
    if not at_a: p = p[::-1]
    o = nodes[find(e['a'] if at_a else e['b'])]['p']
    # skip the part inside the junction blob, then average direction over `reach`
    d = np.hypot(*(p - o).T)
    r0 = nodes[find(e['a'] if at_a else e['b'])].get('rad', R * 1.7) * 0.7
    sel = p[(d > r0) & (d < r0 + reach)]
    if len(sel) < 2: sel = p[len(p) // 3:]
    v = sel.mean(0) - o
    n = np.hypot(*v)
    return v / n if n > 1e-6 else np.array([1.0, 0.0])

# 2. Spurs: short junction-to-endpoint edges. At a sharp V (the other two arms close together) the spur marks the
#    pointed tip, so the junction moves out along it; otherwise it's a skeleton whisker and is dropped.
apex = set()
for _ in range(3):
    d = degree()
    drop = []
    for i, e in enumerate(edges):
        a, b = e['a'], e['b']
        ka, kb = nodes[a]['kind'], nodes[b]['kind']
        if {ka, kb} != {'j', 'e'}: continue
        j, t = (a, b) if ka == 'j' else (b, a)
        if d.get(j, 0) != 3 or elen(e) > R * 3.2: continue
        others = [f for f in edges if f is not e and (f['a'] == j or f['b'] == j)]
        if len(others) != 2: continue
        t1 = tangent(others[0], others[0]['a'] == j, R * 4)
        t2 = tangent(others[1], others[1]['a'] == j, R * 4)
        ang = math.degrees(math.acos(max(-1, min(1, float(t1 @ t2)))))
        if ang < 75:
            tip = nodes[t]['p']
            v = tip - nodes[j]['p']; L = np.hypot(*v)
            nodes[j]['p'] = tip - (v / L) * min(L, R * 0.55) if L > 1e-6 else tip
            apex.add(j)
        else:
            # a whisker or a touching tip pulls the skeleton aside for a few radii either side
            nodes[j]['rad'] = max(nodes[j].get('rad', R * 1.7), R * 3.2)
        drop.append(i)
    if not drop: break
    edges = [e for i, e in enumerate(edges) if i not in set(drop)]

# 3. Re-chain through degree-2 junctions (left after spur removal) and through 3/4-way crossings by straightest pairing
d = degree()
ends = {}  # node -> list of (edge index, at_a)
for i, e in enumerate(edges):
    ends.setdefault(e['a'], []).append((i, True))
    ends.setdefault(e['b'], []).append((i, False))
pair = {}
corner_at = set()
for n, lst in ends.items():
    if len(lst) < 2: continue
    tans = [tangent(edges[i], at, R * 5) for i, at in lst]
    cand = []
    for u in range(len(lst)):
        for v in range(u + 1, len(lst)):
            if lst[u][0] == lst[v][0] and lst[u][1] == lst[v][1]: continue
            dev = math.degrees(math.acos(max(-1, min(1, float(-tans[u] @ tans[v])))))
            cand.append((dev, u, v))
    cand.sort()
    used = set()
    for dev, u, v in cand:
        if u in used or v in used: continue
        if len(lst) == 2 or dev < 70:
            pair[(lst[u][0], lst[u][1])] = (lst[v][0], lst[v][1])
            pair[(lst[v][0], lst[v][1])] = (lst[u][0], lst[u][1])
            used.update((u, v))
            if dev >= 55 or n in apex: corner_at.add((lst[u][0], lst[u][1])); corner_at.add((lst[v][0], lst[v][1]))

# Walk strokes: start at unpaired edge ends, cross edges, follow pairings
used_e = set()
strokes = []
def walk(i, at_a):
    pts, corners = [], []
    while i is not None and i not in used_e:
        used_e.add(i)
        e = edges[i]
        p = [tuple(map(float, q)) for q in e['pts']]
        a, b = find(e['a']), find(e['b'])
        if not at_a: p = p[::-1]; a, b = b, a
        p[0] = tuple(nodes[a]['p']); p[-1] = tuple(nodes[b]['p'])
        if pts:
            if (i, at_a) in corner_at:
                corners.append(len(pts) - 1)
                p = p[1:]
            else:
                # a straight pass through a crossing: the blob's centroid isn't on either line, so cut both sides back
                # out of the blob and let the spline bridge the gap
                o = np.array(nodes[a]['p'])
                cut = nodes[a].get('rad', R * 1.7)
                while len(pts) > 2 and math.hypot(pts[-1][0] - o[0], pts[-1][1] - o[1]) < cut: pts.pop()
                while len(p) > 2 and math.hypot(p[0][0] - o[0], p[0][1] - o[1]) < cut: p = p[1:]
        pts.extend(p)
        nxt = pair.get((i, not at_a))
        if nxt is None: break
        # entering the paired edge through the end that meets this one
        i, at_a = nxt
    return pts, corners
for i, e in enumerate(edges):
    for at in (True, False):
        if i in used_e: break
        if (i, at) not in pair: strokes.append(walk(i, at))
for i in range(len(edges)):
    if i not in used_e: strokes.append(walk(i, True))
print('strokes', len(strokes))

# Fragments: a walk that stopped at a crossing it couldn't pair is continued by the stroke whose end lies just ahead of
# it, in line with both
def end_tan(p, at_start, reach):
    p = np.array(p, float)
    q = p if at_start else p[::-1]
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(q, axis=0).T))]
    j = int(np.searchsorted(d, min(reach, d[-1] * 0.5)))
    v = q[0] - q[max(1, j)]
    n = np.hypot(*v)
    return v / n if n > 1e-6 else np.array([1.0, 0.0])
merged = True
while merged:
    merged = False
    best = None
    for u in range(len(strokes)):
        for v in range(len(strokes)):
            if u == v or len(strokes[u][0]) < 3 or len(strokes[v][0]) < 3: continue
            for eu in (False, True):
                for ev in (True, False):
                    pu = np.array(strokes[u][0][0 if eu else -1]); pv = np.array(strokes[v][0][0 if ev else -1])
                    gap = pv - pu; g = np.hypot(*gap)
                    if g > R * 7 or g < 1e-6: continue
                    tu = end_tan(strokes[u][0], eu, R * 4)
                    tv = -end_tan(strokes[v][0], ev, R * 4)
                    gd = gap / g
                    a1 = math.degrees(math.acos(max(-1, min(1, float(tu @ gd)))))
                    a2 = math.degrees(math.acos(max(-1, min(1, float(gd @ tv)))))
                    if a1 < 32 and a2 < 32:
                        sc = g / R + (a1 + a2) / 20
                        if best is None or sc < best[0]: best = (sc, u, eu, v, ev)
    if best:
        _, u, eu, v, ev = best
        pu, cu = strokes[u]; pv, cv = strokes[v]
        if eu: pu = pu[::-1]; cu = [len(pu) - 1 - c for c in cu]
        if not ev: pv = pv[::-1]; cv = [len(pv) - 1 - c for c in cv]
        joined = list(pu) + list(pv)
        strokes[u] = (joined, cu + [c + len(pu) for c in cv])
        del strokes[v]
        merged = True
print('after merge', len(strokes))

# The A is a knot of strokes that run on top of each other for long stretches, where the skeleton follows the middle
# of the merged band instead of either line. Those strokes are guided: waypoints in pen order (C = cusp) read off a
# 25px grid of the source, then every sample is pulled sideways onto the centre of the ink wherever the band is one pen
# wide, and left to the spline where strokes overlap.
C = 'C'
GUIDED = [
    # A: up the right side to the tip, down the long left side, round the bottom loop and up into the 'a'
    [(650, 615), (660, 560), (671, 453), (682, 327), (688, 230), (683, 150), (670, 105), (657, 92), C, (640, 110),
     (605, 160), (566, 222), (519, 310), (464, 398), (420, 490), (397, 560), (372, 640), (348, 710), (327, 780),
     (313, 850), (305, 900), (298, 950), (293, 1000), (292, 1050), (298, 1092), (318, 1115), (345, 1102), (363, 1083),
     (400, 1037), (447, 977), (497, 910), (523, 868), (545, 820), (562, 785), (575, 752)],
    # Inner A: the left leg up to the apex, down the right leg
    [(383, 896), (392, 855), (410, 793), (433, 693), (450, 580), (464, 453), (481, 348), (496, 300), C, (511, 339),
     (532, 453), (557, 580), (574, 660), (590, 730)],
    # Lead-in hooking down to the left edge, then the crossbar sweeping up through the A
    [(417, 632), (390, 662), (363, 700), (340, 740), (317, 787), (297, 822), (289, 838), C, (317, 827), (363, 803),
     (410, 773), (463, 740), (530, 705), (600, 667), (700, 592), (800, 512), (870, 440), (926, 378)],
]

def resample(p, step):
    p = np.array(p, float)
    keep = np.r_[True, np.hypot(*np.diff(p, axis=0).T) > 1e-6]
    p = p[keep]
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    if d[-1] < 1e-6: return p[:1], d
    n = max(2, int(math.ceil(d[-1] / step)) + 1)
    t = np.linspace(0, d[-1], n)
    return np.c_[np.interp(t, d, p[:, 0]), np.interp(t, d, p[:, 1])], t

def inkat(x, y):
    xi, yi = int(round(x)), int(round(y))
    return 0 <= xi < W and 0 <= yi < H and bool(ink[yi, xi])

def catmull(ws, step):
    P = np.array(ws, float)
    if len(P) < 3: return resample(P, step)[0]
    P = np.r_[[2 * P[0] - P[1]], P, [2 * P[-1] - P[-2]]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int(np.hypot(*(p2 - p1)) / step))
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return np.array(out)

def gsmooth(p, sigma):
    if len(p) < 5: return p
    r = int(sigma * 3)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); k /= k.sum()
    pre = 2 * p[0] - p[1:r + 1][::-1]
    post = 2 * p[-1] - p[-r - 1:-1][::-1]
    q = np.r_[pre, p, post]
    return np.c_[np.convolve(q[:, 0], k, 'valid'), np.convolve(q[:, 1], k, 'valid')]

def snap(P, free0, free1):
    P = P.copy()
    for it in range(40):
        T = np.gradient(P, axis=0)
        T /= np.maximum(1e-6, np.hypot(*T.T))[:, None]
        Nn = np.c_[-T[:, 1], T[:, 0]]
        tgt = P.copy()
        for i, (p, n) in enumerate(zip(P, Nn)):
            if not inkat(*p): continue
            dl = dr = None
            for s in np.arange(0.5, R * 2.8, 0.5):
                if dr is None and not inkat(*(p + n * s)): dr = s
                if dl is None and not inkat(*(p - n * s)): dl = s
                if dl is not None and dr is not None: break
            if dl is None or dr is None: continue
            w = dl + dr
            if R * 1.7 < w < R * 2.25: tgt[i] = p + n * (dr - dl) / 2
        P = P + (tgt - P) * 0.5
        a, b = P[0].copy(), P[-1].copy()
        P = gsmooth(P, 3.0)
        if not free0: P[0] = a
        if not free1: P[-1] = b
    # free ends: the pen's centre sits one radius inside the round cap
    for end, free in ((0, free0), (-1, free1)):
        if not free: continue
        q = P if end == 0 else P[::-1]
        t = q[0] - q[min(len(q) - 1, 6)]
        t /= max(1e-6, np.hypot(*t))
        s = 0.0
        while s < R * 3 and inkat(*(q[0] + t * (s + 0.5))): s += 0.5
        shift = s - R * 0.95
        if abs(shift) > 0.5:
            ext = [q[0] + t * u for u in np.arange(shift, 0, -1.0)] if shift > 0 else []
            if shift > 0: q = np.r_[np.array(ext), q]
            else:
                d = np.r_[0, np.cumsum(np.hypot(*np.diff(q, axis=0).T))]
                q = q[d >= -shift]
        P = q if end == 0 else q[::-1]
    return P

guided = []
for ws in GUIDED:
    pieces, cur = [], []
    for w in ws:
        if w == C: pieces.append(cur); cur = [cur[-1]]
        else: cur.append(w)
    pieces.append(cur)
    q, cidx = [], []
    for k_, g in enumerate(pieces):
        P = snap(catmull(g, 3.0), k_ == 0, k_ == len(pieces) - 1)
        if len(P) > 8:
            L_ = float(np.hypot(*np.diff(P, axis=0).T).sum())
            tck, _ = splprep([P[:, 0], P[:, 1]], s=len(P) * 1.2 ** 2, k=3)
            x_, y_ = splev(np.linspace(0, 1, max(8, int(L_))), tck)
            Q = np.c_[x_, y_]; Q[0], Q[-1] = P[0], P[-1]
            P = Q
        if q: cidx.append(len(q) - 1); P = P[1:]
        q.extend(P.tolist())
    guided.append((np.array(q), cidx))

# Drop the skeleton's runs that lie under a guided stroke for more than a few pen widths
G = np.vstack([resample(g, 1.0)[0] for g, _ in guided])
from scipy.spatial import cKDTree
tree = cKDTree(G)
kept = []
for pts, corners in strokes:
    p = np.array(pts, float)
    if len(p) < 2: kept.append((pts, corners)); continue
    cov = tree.query(p)[0] < R * 1.1
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    if not cov.any(): kept.append((pts, corners)); continue
    drop = np.zeros(len(p), bool)
    i = 0
    while i < len(p):
        if not cov[i]: i += 1; continue
        j = i
        while j + 1 < len(p) and cov[j + 1]: j += 1
        if d[j] - d[i] > R * 4 or i == 0 or j == len(p) - 1: drop[i:j + 1] = True
        i = j + 1
    i = 0
    while i < len(p):
        if drop[i]: i += 1; continue
        j = i
        while j + 1 < len(p) and not drop[j + 1]: j += 1
        if d[j] - d[i] > R * 3:
            kept.append(([pts[k] for k in range(i, j + 1)], [c - i for c in corners if i < c < j]))
        i = j + 1
strokes = kept
print('auto strokes kept', len(strokes))

# Pieces of one pen stroke that the skeleton split at a crossing: join ends that face each other across solid ink
def bridged(a, b):
    n = int(np.hypot(*(b - a)) / 2) + 2
    return all(inkat(*(a + (b - a) * t)) for t in np.linspace(0, 1, n))
merged = True
while merged:
    merged = False
    best = None
    for u in range(len(strokes)):
        for v in range(len(strokes)):
            if u == v or len(strokes[u][0]) < 3 or len(strokes[v][0]) < 3: continue
            for eu in (False, True):
                for ev in (True, False):
                    pu = np.array(strokes[u][0][0 if eu else -1], float); pv = np.array(strokes[v][0][0 if ev else -1], float)
                    gap = pv - pu; g = np.hypot(*gap)
                    if g > R * 10 or g < 1e-6 or not bridged(pu, pv): continue
                    tu = end_tan(strokes[u][0], eu, R * 3)
                    tv = -end_tan(strokes[v][0], ev, R * 3)
                    gd = gap / g
                    a1 = math.degrees(math.acos(max(-1, min(1, float(tu @ gd)))))
                    a2 = math.degrees(math.acos(max(-1, min(1, float(gd @ tv)))))
                    a3 = math.degrees(math.acos(max(-1, min(1, float(tu @ tv)))))
                    if a1 < 50 and a2 < 50 and a3 < 60:
                        sc = g / R + (a1 + a2 + a3) / 25
                        if best is None or sc < best[0]: best = (sc, u, eu, v, ev)
    if best:
        _, u, eu, v, ev = best
        pu, cu = strokes[u]; pv, cv = strokes[v]
        if eu: pu = pu[::-1]; cu = [len(pu) - 1 - c for c in cu]
        if not ev: pv = pv[::-1]; cv = [len(pv) - 1 - c for c in cv]
        strokes[u] = (list(pu) + list(pv), cu + [c + len(pu) for c in cv])
        del strokes[v]
        merged = True
print('after ink merge', len(strokes))

def resample(p, step):
    p = np.array(p, float)
    keep = np.r_[True, np.hypot(*np.diff(p, axis=0).T) > 1e-6]
    p = p[keep]
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    if d[-1] < 1e-6: return p[:1], d
    n = max(2, int(math.ceil(d[-1] / step)) + 1)
    t = np.linspace(0, d[-1], n)
    return np.c_[np.interp(t, d, p[:, 0]), np.interp(t, d, p[:, 1])], t

def cusps(p):
    # sharp turns inside a stroke, at the scale of the pen
    k = max(3, int(R * 2.2))
    out = []
    if len(p) < 2 * k + 3: return out
    ang = np.zeros(len(p))
    for i in range(k, len(p) - k):
        a = p[i] - p[i - k]; b = p[i + k] - p[i]
        na, nb = np.hypot(*a), np.hypot(*b)
        if na < 1e-6 or nb < 1e-6: continue
        ang[i] = math.degrees(math.acos(max(-1, min(1, float(a @ b) / (na * nb)))))
    for i in range(k, len(p) - k):
        if ang[i] > 95 and ang[i] == ang[max(0, i - k):i + k + 1].max(): out.append(i)
    return out

def fit(p):
    if len(p) < 4: return p
    L = float(np.hypot(*np.diff(p, axis=0).T).sum())
    k = 3 if len(p) > 5 else 1
    s = len(p) * (0.55 ** 2)
    try:
        tck, u = splprep([p[:, 0], p[:, 1]], s=s, k=k)
    except Exception:
        return p
    uu = np.linspace(0, 1, max(4, int(L / 1.0)))
    x, y = splev(uu, tck)
    q = np.c_[x, y]
    q[0], q[-1] = p[0], p[-1]
    return q

out = []
for pts, corners in strokes:
    if len(pts) < 2:
        continue
    p = np.array(pts, float)
    # corner positions by arc length so they survive resampling
    dd = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    cs = sorted(set(float(dd[c]) for c in corners))
    r, t = resample(p, 1.0)
    idx = sorted(set([int(np.argmin(np.abs(t - c))) for c in cs] + cusps(r)))
    idx = [i for i in idx if 2 < i < len(r) - 3]
    segs, last = [], 0
    for i in idx + [len(r) - 1]:
        if i - last >= 1: segs.append(r[last:i + 1])
        last = i
    q, cidx = [], []
    for g in segs:
        f = fit(g)
        if q: cidx.append(len(q) - 1); f = f[1:]
        q.extend(f.tolist())
    q = np.array(q)
    out.append({'pts': q, 'corners': cidx, 'L': float(np.hypot(*np.diff(q, axis=0).T).sum()) if len(q) > 1 else 0.0})

# Pen order: left to right by start, the long underline last; each stroke written from its left/upper end unless
# chained otherwise
def start_key(s):
    q = s['pts']
    return float(min(q[0][0], q[-1][0]))
for s in out:
    q = s['pts']
    if len(q) > 1 and q[-1][0] < q[0][0] - 2:
        s['pts'] = q[::-1]
        n = len(q) - 1
        s['corners'] = sorted(n - c for c in s['corners'])
ul = max(out, key=lambda s: (s['pts'][-1][0] - s['pts'][0][0]) * (s['pts'][0][1] - s['pts'][-1][1]) if len(s['pts']) > 1 else 0)
rest = sorted([s for s in out if s is not ul], key=start_key)
gs = [{'pts': g, 'corners': c, 'L': float(np.hypot(*np.diff(g, axis=0).T).sum())} for g, c in guided]
# Pen order: the A, its inner strokes, the rest of the name left to right, the crossbar once the name reaches it, the
# underline last
bar = gs[2]
rest_l = [s for s in rest if start_key(s) < 930]
rest_r = [s for s in rest if start_key(s) >= 930]
out = gs[:2] + rest_l + [bar] + rest_r + [ul]

# Frame: ink bbox + pen radius, scaled to 1000 units wide
ys_, xs_ = np.nonzero(ink)
pad = R * 1.5
x0, y0, x1, y1 = xs_.min() - pad, ys_.min() - pad, xs_.max() + pad, ys_.max() + pad
k = 1000.0 / (x1 - x0)
VW, VH = 1000, int(round((y1 - y0) * k))
SW = round(2 * R * k * 1.06, 1)

def rdp(p, e):
    if len(p) < 3: return p
    a, b = p[0], p[-1]
    dx, dy = b - a
    L = math.hypot(dx, dy) or 1
    d = np.abs(dy * (p[:, 0] - a[0]) - dx * (p[:, 1] - a[1])) / L
    i = int(np.argmax(d))
    if d[i] > e: return np.r_[rdp(p[:i + 1], e)[:-1], rdp(p[i:], e)]
    return np.array([a, b])

# An end is a pen lift where the ink stops just past it; elsewhere the stroke runs on into another one's ink and
# keeps its full width
def free_end(q, at_start):
    q = np.array(q, float)
    if len(q) < 3: return True
    e = q[0] if at_start else q[-1]
    t = -end_tan(q, at_start, R * 2)
    s = 0.0
    while s < R * 3 and inkat(*(e - t * (s + 0.5))): s += 0.5
    return s < R * 1.7
res, ends = [], []
for s in out:
    q = (np.array(s['pts']) - [x0, y0]) * k
    q = rdp(q, 0.12) if len(q) > 2 else q
    res.append([[round(float(a), 2), round(float(b), 2)] for a, b in q])
    ends.append([int(free_end(s['pts'], True)), int(free_end(s['pts'], False))])
print('ends', ends)
json.dump({'vw': VW, 'vh': VH, 'stroke': SW, 'strokes': res, 'ends': ends}, open(os.path.join(HERE, 'sig-v13.json'), 'w'), separators=(',', ':'))
print('frame', VW, VH, 'stroke', SW, 'strokes', len(res), 'points', sum(len(r) for r in res))

# Score: strokes rasterised at the pen width vs the ink
def raster(scale, width_px):
    im = Image.new('L', (int(W * scale), int(H * scale)), 0)
    d = ImageDraw.Draw(im)
    for s in out:
        q = [(float(a) * scale, float(b) * scale) for a, b in s['pts']]
        if len(q) == 1:
            x, y = q[0]; r = width_px * scale / 2
            d.ellipse([x - r, y - r, x + r, y + r], fill=255)
            continue
        d.line(q, fill=255, width=max(1, int(round(width_px * scale))), joint='curve')
        for x, y in (q[0], q[-1]):
            r = width_px * scale / 2
            d.ellipse([x - r, y - r, x + r, y + r], fill=255)
    return np.asarray(im.resize((W, H), Image.BILINEAR)) > 127
m = raster(2, 2 * R)
inter = (m & ink).sum()
print('precision %.3f recall %.3f IoU %.3f' % (inter / m.sum(), inter / ink.sum(), inter / (m | ink).sum()))

# Overlay: source ink in grey, traced centrelines in red, nodes / corners marked
ov = Image.new('RGB', (W * 2, H * 2), (255, 255, 255))
g = Image.fromarray(np.where(ink, 175, 255).astype(np.uint8)).resize((W * 2, H * 2), Image.NEAREST)
ov.paste(Image.merge('RGB', [g, g, g]))
d = ImageDraw.Draw(ov)
cols = [(220, 20, 20), (0, 140, 40), (180, 0, 200), (0, 100, 220), (230, 110, 0)]
for i, s in enumerate(out):
    q = [(float(a) * 2, float(b) * 2) for a, b in s['pts']]
    c = cols[i % len(cols)]
    if len(q) > 1: d.line(q, fill=c, width=3)
    d.ellipse([q[0][0] - 6, q[0][1] - 6, q[0][0] + 6, q[0][1] + 6], outline=c, width=2)
    d.text((q[0][0] + 8, q[0][1] - 16), str(i), fill=c)
    for ci in s['corners']:
        if ci < len(q): d.rectangle([q[ci][0] - 4, q[ci][1] - 4, q[ci][0] + 4, q[ci][1] + 4], outline=(0, 0, 0))
ov.save(os.path.join(HERE, 'sig-v13-overlay.png'))

# Preview: the strokes at pen width in the site's yellow over the void, beside the source
pv = Image.new('RGB', (W * 2, H), (18, 19, 22))
src_rgb = Image.open(SRC).convert('RGB')
pv.paste(src_rgb, (0, 0))
dd2 = ImageDraw.Draw(pv)
for s in out:
    q = [(float(a) + W, float(b)) for a, b in s['pts']]
    wpx = int(round(2 * R * 1.06))
    if len(q) > 1: dd2.line(q, fill=(255, 237, 41), width=wpx, joint='curve')
    for x, y in (q[0], q[-1]):
        dd2.ellipse([x - wpx / 2, y - wpx / 2, x + wpx / 2, y + wpx / 2], fill=(255, 237, 41))
pv.save(os.path.join(HERE, 'sig-v13-preview.png'))
