# python scratch/footer-signature/vectorise.py -> signature centrelines from C:/Users/gaura/Downloads/signature.png
# Skeletonise the ink, walk the skeleton graph through crossings by good continuation, drop spurs, simplify,
# and write sig-strokes.json (strokes as flat [x,y,...] in a 0..1000 wide box) plus sig-trace.png for a visual check.
import json, math, sys
import numpy as np
from PIL import Image, ImageDraw
from skimage.morphology import skeletonize, remove_small_objects, binary_closing, disk
from scipy import ndimage as ndi

SRC = r'C:/Users/gaura/Downloads/signature.png'
OUT = 'scratch/footer-signature/'
im = Image.open(SRC).convert('RGBA')
a = np.asarray(im).astype(np.float32)
lum = (a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11) * (a[..., 3] / 255) + 255 * (1 - a[..., 3] / 255)
ink = lum < 128
ink = binary_closing(ink, disk(2))
ink = remove_small_objects(ink, 60)
dist = ndi.distance_transform_edt(ink)
sk = skeletonize(ink)
H, W = ink.shape
ys, xs = np.nonzero(sk)
width = float(np.median(dist[sk]) * 2)
print('size', W, H, 'skeleton px', len(xs), 'stroke width', round(width, 1))

N8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
pts = set(zip(ys.tolist(), xs.tolist()))
def nb(p):
    y, x = p
    return [(y + dy, x + dx) for dy, dx in N8 if (y + dy, x + dx) in pts]

deg = {p: len(nb(p)) for p in pts}
# Junction clusters: pixels with 3+ neighbours, merged into nodes
junc = {p for p in pts if deg[p] >= 3}
node_of = {}
nodes = []
for p in junc:
    if p in node_of: continue
    stack, comp = [p], []
    node_of[p] = len(nodes)
    while stack:
        q = stack.pop(); comp.append(q)
        for r in nb(q):
            if r in junc and r not in node_of:
                node_of[r] = len(nodes); stack.append(r)
    nodes.append(comp)
ends = [p for p in pts if deg[p] == 1]
for p in ends:
    node_of[p] = len(nodes); nodes.append([p])

# Edges: walk from each node pixel's non-node neighbours until another node
edges = []
seen = set()
for ni, comp in enumerate(nodes):
    for p in comp:
        for q in nb(p):
            if q in node_of and node_of[q] == ni: continue
            if (p, q) in seen: continue
            path = [p, q]
            prev, cur = p, q
            while cur not in node_of:
                nxt = [r for r in nb(cur) if r != prev and r not in path[-3:]]
                if not nxt: break
                # prefer the straightest continuation
                if len(nxt) > 1:
                    vy, vx = cur[0] - prev[0], cur[1] - prev[1]
                    nxt.sort(key=lambda r: -((r[0] - cur[0]) * vy + (r[1] - cur[1]) * vx))
                prev, cur = cur, nxt[0]
                path.append(cur)
            if cur in node_of and node_of[cur] == ni and len(path) < 4: continue
            seen.add((path[-1], path[-2])); seen.add((p, q))
            edges.append({'a': ni, 'b': node_of.get(cur, -1), 'path': path})
# dedupe edges walked from both sides
uniq, keys = [], set()
for e in edges:
    k = (min(e['path'][0], e['path'][-1]), max(e['path'][0], e['path'][-1]), len(e['path']))
    if k in keys: continue
    keys.add(k); uniq.append(e)
edges = uniq
print('nodes', len(nodes), 'edges', len(edges))

# Prune spurs: short edges ending in an endpoint that hang off a junction
def is_end(ni): return len(nodes[ni]) == 1 and deg[nodes[ni][0]] == 1
spur = max(6, width * 1.6)
edges = [e for e in edges if not (len(e['path']) < spur and (is_end(e['a']) != is_end(e['b'])))]

def tangent(path, at_start, k=None):
    k = k or max(4, int(width * 2.2))
    seg = path[:k] if at_start else path[-k:][::-1]
    p0, p1 = np.array(seg[0], float), np.array(seg[-1], float)
    v = p1 - p0
    n = np.linalg.norm(v) or 1
    return v / n  # pointing away from the node, into the edge

# Chain edges into strokes: at each node, pair incident edges by good continuation (most opposite tangents)
inc = {}
for i, e in enumerate(edges):
    inc.setdefault(e['a'], []).append((i, True))
    inc.setdefault(e['b'], []).append((i, False))
pair = {}
for ni, lst in inc.items():
    if len(lst) < 2: continue
    cand = []
    for x in range(len(lst)):
        for y in range(x + 1, len(lst)):
            (i, si), (j, sj) = lst[x], lst[y]
            if i == j: continue
            ti, tj = tangent(edges[i]['path'], si), tangent(edges[j]['path'], sj)
            cand.append((float(np.dot(ti, tj)), lst[x], lst[y]))
    cand.sort(key=lambda c: c[0])
    used = set()
    for score, u, v in cand:
        if score > -0.35: break
        if u in used or v in used: continue
        used.add(u); used.add(v)
        pair[(ni,) + u] = v; pair[(ni,) + v] = u

done = set()
strokes = []
def walk(i, forward):
    out = []
    while True:
        if i in done: break
        done.add(i)
        p = edges[i]['path'] if forward else edges[i]['path'][::-1]
        out.extend(p if not out else p[1:])
        node = edges[i]['b'] if forward else edges[i]['a']
        nxt = pair.get((node, i, not forward))
        if not nxt: break
        j, sj = nxt
        i, forward = j, sj
    return out
# start from edges that end at endpoints or unpaired sides, then any loops
order = sorted(range(len(edges)), key=lambda i: -len(edges[i]['path']))
for i in order:
    if i in done: continue
    e = edges[i]
    a_free = (e['a'], i, True) not in pair
    b_free = (e['b'], i, False) not in pair
    if a_free: strokes.append(walk(i, True))
    elif b_free: strokes.append(walk(i, False))
for i in order:
    if i not in done: strokes.append(walk(i, True))

def rdp(P, eps):
    if len(P) < 3: return P
    a, b = np.array(P[0], float), np.array(P[-1], float)
    ab = b - a; L = np.linalg.norm(ab)
    best, bi = -1, 0
    for k in range(1, len(P) - 1):
        p = np.array(P[k], float)
        d = abs(np.cross(ab, p - a)) / L if L else np.linalg.norm(p - a)
        if d > best: best, bi = d, k
    if best > eps:
        return rdp(P[:bi + 1], eps)[:-1] + rdp(P[bi:], eps)
    return [P[0], P[-1]]

def smooth(P, it=3):
    P = np.array(P, float)
    for _ in range(it):
        Q = P.copy(); Q[1:-1] = (P[:-2] + 2 * P[1:-1] + P[2:]) / 4; P = Q
    return P

ys, xs = np.nonzero(ink)
bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
S = 1000 / (bx1 - bx0)
res = []
for s in strokes:
    if len(s) < max(5, width * 0.8) and len(strokes) > 1:
        # dots: keep as a tiny stroke
        pass
    P = [(x, y) for y, x in s]
    P = smooth(P, 4)
    P = rdp([tuple(p) for p in P], 1.1)
    flat = []
    for x, y in P:
        flat += [round((x - bx0) * S, 1), round((y - by0) * S, 1)]
    res.append(flat)
# order strokes as written: by their leftmost-top start, starting each at its left end
for k, f in enumerate(res):
    if len(f) >= 4 and f[0] > f[-2]:
        pts2 = [f[i:i + 2] for i in range(0, len(f), 2)][::-1]
        res[k] = [v for p in pts2 for v in p]
res.sort(key=lambda f: min(f[0::2]))
lens = [sum(math.hypot(f[i + 2] - f[i], f[i + 3] - f[i + 1]) for i in range(0, len(f) - 2, 2)) for f in res]
print('strokes', len(res), 'lengths', [round(l) for l in lens], 'points', sum(len(f) // 2 for f in res))
data = {'w': 1000, 'h': round((by1 - by0) * S, 1), 'width': round(width * S, 2), 'strokes': res}
json.dump(data, open(OUT + 'sig-strokes.json', 'w'), separators=(',', ':'))

vis = Image.new('RGB', (1000 + 40, int(data['h']) + 40), (18, 19, 22))
d = ImageDraw.Draw(vis)
cols = [(255, 237, 41), (97, 218, 251), (240, 80, 50), (95, 160, 78), (189, 52, 254), (244, 242, 234)]
for k, f in enumerate(res):
    pts2 = [(f[i] + 20, f[i + 1] + 20) for i in range(0, len(f), 2)]
    if len(pts2) > 1: d.line(pts2, fill=cols[k % len(cols)], width=3)
    d.ellipse([pts2[0][0] - 4, pts2[0][1] - 4, pts2[0][0] + 4, pts2[0][1] + 4], outline=cols[k % len(cols)])
    d.text((pts2[0][0] + 6, pts2[0][1] - 14), str(k), fill=cols[k % len(cols)])
vis.save(OUT + 'sig-trace.png')
