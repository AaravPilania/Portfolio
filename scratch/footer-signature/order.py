# python scratch/footer-signature/order.py -> chains sig-strokes.json fragments into pen-order strokes (sig-paths.json)
# Greedy pen: from the current end, continue into the fragment that leaves the same point most straight-on; when
# nothing touches, lift the pen to the leftmost unwritten fragment. Dots go last, as they would be.
import json, math
import numpy as np
from PIL import Image, ImageDraw

D = json.load(open('scratch/footer-signature/sig-strokes.json'))
wid = D['width']
frags = [np.array(f, float).reshape(-1, 2) for f in D['strokes']]
dots = [f for f in frags if len(f) < 3 or np.linalg.norm(f[-1] - f[0]) < wid * 0.6]
lines = [f for f in frags if not any(f is d for d in dots)]
def plen(P): return float(np.sum(np.linalg.norm(np.diff(P, axis=0), axis=1)))
def straight(P): return np.linalg.norm(P[-1] - P[0]) / (plen(P) or 1)
under = [f for f in lines if plen(f) > 400 and straight(f) > 0.99]
print('underline fragments', len(under))
lines = [f for f in lines if not any(f is u for u in under)]

def tan_out(P):  # direction of travel at the end
    k = min(len(P) - 1, 3); v = P[-1] - P[-1 - k]; return v / (np.linalg.norm(v) or 1)
def tan_in(P):
    k = min(len(P) - 1, 3); v = P[k] - P[0]; return v / (np.linalg.norm(v) or 1)

left = list(range(len(lines)))
# the pen starts where a right-hander starts this A: the low end of the long first loop
first = max(left, key=lambda i: len(lines[i]))
P = lines[first]
if P[0][1] < P[-1][1]: P = P[::-1]
left.remove(first)
strokes, cur = [], [P]
while left:
    end, t = cur[-1][-1], tan_out(cur[-1])
    best, bs = None, -2
    for i in left:
        for rev in (False, True):
            Q = lines[i][::-1] if rev else lines[i]
            if np.linalg.norm(Q[0] - end) > wid * 1.4: continue
            s = float(np.dot(t, tan_in(Q)))
            if s > bs: best, bs = (i, Q), s
    if best and bs > 0.3:
        cur.append(best[1]); left.remove(best[0]); continue
    strokes.append(np.vstack([c if k == 0 else c[1:] for k, c in enumerate(cur)]))
    i = min(left, key=lambda i: lines[i][:, 0].min())
    Q = lines[i] if lines[i][0][0] <= lines[i][-1][0] else lines[i][::-1]
    cur = [Q]; left.remove(i)
strokes.append(np.vstack([c if k == 0 else c[1:] for k, c in enumerate(cur)]))
for d in sorted(dots, key=lambda f: f[:, 0].min()):
    c = d.mean(0)
    strokes.append(np.array([c + [-wid * 0.18, 0], c + [wid * 0.18, 0]]))
if under:
    U = sorted([u if u[0][0] <= u[-1][0] else u[::-1] for u in under], key=lambda u: u[0][0])
    strokes.append(np.vstack([u if k == 0 else u[1:] for k, u in enumerate(U)]))

out = [[round(v, 1) for p in s for v in p] for s in strokes]
lens = [float(np.sum(np.linalg.norm(np.diff(s, axis=0), axis=1))) for s in strokes]
print('strokes', len(out), [round(l) for l in lens], 'pts', sum(len(s) for s in strokes))
json.dump({'w': D['w'], 'h': D['h'], 'width': wid, 'strokes': out}, open('scratch/footer-signature/sig-paths.json', 'w'), separators=(',', ':'))

total = sum(lens)
vis = Image.new('RGB', (1040, int(D['h']) + 40), (18, 19, 22))
d = ImageDraw.Draw(vis)
acc = 0
for k, s in enumerate(strokes):
    for j in range(len(s) - 1):
        seg = float(np.linalg.norm(s[j + 1] - s[j]))
        t = (acc + seg / 2) / total; acc += seg
        col = (int(255 * (1 - t) + 97 * t), int(237 * (1 - t) + 218 * t), int(41 * (1 - t) + 251 * t))
        d.line([tuple(s[j] + 20), tuple(s[j + 1] + 20)], fill=col, width=4)
    d.text(tuple(s[0] + [24, -16]), str(k), fill=(244, 242, 234))
vis.save('scratch/footer-signature/sig-order.png')
