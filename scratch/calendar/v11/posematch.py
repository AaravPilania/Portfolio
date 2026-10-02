"""Pose matches inside the current dance (final/data/calendar-dance.bin, 424 frames): for a jump from frame j back to
frame i+1 to read as continuous motion, frames around j must look like the frames around i. Score = mean silhouette IoU
of (i+o, j+o), o = -2..2, on the 49x40 grid. Prints the best jumps with their length in beats (beat = 13.14 frames)."""
import os, numpy as np, json
from gcd import load
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
F, fps = load(os.path.join(ROOT, 'final', 'data', 'calendar-dance.bin'))
S = (F != 0).reshape(len(F), -1).astype(np.float32)
n = len(S)
inter = S @ S.T
area = S.sum(1)
iou = inter / np.maximum(1, area[:, None] + area[None] - inter)
BEAT = 927155 / 44100 / 48 * fps
win = np.zeros_like(iou)
for o in range(-2, 3):
    a = np.clip(np.arange(n) + o, 0, n - 1)
    win += iou[np.ix_(a, a)]
win /= 5
cand = []
for i in range(2, n - 2):
    for j in range(i + 20, n - 2):
        cand.append((float(win[i, j]), i, j, (j - i) / BEAT))
cand.sort(reverse=True)
print('frames', n, 'beat (frames) %.3f' % BEAT)
print('best jumps (score, i, j, beats back):')
seen = []
for s, i, j, b in cand:
    if any(abs(i - a) < 6 and abs(j - c) < 6 for a, c in seen): continue
    seen.append((i, j))
    print(f'  {s:.3f}  i={i:3d} j={j:3d}  {b:5.2f} beats')
    if len(seen) >= 40: break
# also: best match for each "whole beat" jump length
print('best by whole-beat length (|frac| <= 0.08):')
for k in range(2, 33):
    best = max(((win[i, j], i, j) for i in range(2, n - 2) for j in [int(round(i + k * BEAT))] if j < n - 2), default=None)
    if best: print(f'  {k:2d} beats: {best[0]:.3f}  i={best[1]} j={best[2]}')
np.save(r'C:\cal4work\posewin.npy', win)
first = S[0]
print('IoU of each frame with frame 0, top late frames:', sorted(((float(iou[0, f]), f) for f in range(200, n)), reverse=True)[:5])
