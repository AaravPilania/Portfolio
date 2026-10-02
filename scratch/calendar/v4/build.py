"""Build final/data/calendar-dance.bin (GCD2, 49x40, 30 fps, one data frame per 1/30 s, nothing held or stretched).

frames 0-201   reel n66-267 as the reel shows them (its cells, majority-classified by prep.py)
frames 202-423 the original past the reel's last frame (orig 797-981), rendered in the reel's style by render.py, on the
               reel's own 25 -> 30 fps cadence (one source frame repeats every sixth step, as in the reel)
Orig 981 is the last frame before the white-shirt dancer walks in front of the kid from the right; the page sweeps the
dancer off right to left over the last 2 beats of the dance (frames 400-423).
Also prints the join and ending checks."""
import gzip, os, struct, json, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
W = r'C:\cal4work'
PAL = ['#53b44b', '#0b8043', '#616161', '#fbfbfb', '#a6c1f6', '#7986cb', '#5482eb', '#3f51b5', '#039be5',
       '#d50000', '#f4511e', '#f6bf26', '#e67c73']
maps = np.load(W + r'\reel_maps.npy'); ours = np.load(W + r'\ours.npz')
match = {int(k): v[0] for k, v in json.load(open(W + r'\calib.json'))['match'].items()}
N, REEL = 424, 202
src = []
for f in range(N):
    src.append(('reel', 66 + f) if f < REEL else ('orig', 797 + int((f - REEL) * 5 / 6 + 0.5)))
frames = [maps[i] if k == 'reel' else ours[f'f{i}'] for k, i in src]
print('last source frame', src[-1], ' continuation orig', src[REEL][1], '-', src[-1][1])

ch = lambda a, b: (a != b).mean()
reel_steps = [ch(maps[n], maps[n - 1]) for n in range(67, 268)]
moving = [x for x in reel_steps if x > 0]
cont_steps = [ch(frames[f], frames[f - 1]) for f in range(REEL + 1, N)]
print(f'cell change per step: reel median {np.median(moving):.3f} (moving steps), continuation median {np.median([x for x in cont_steps if x > 0]):.3f}')
print(f'join reel n267 -> orig 797: {ch(frames[REEL - 1], frames[REEL]):.3f} cells changed (reel p90 {np.percentile(moving, 90):.3f})')
print(f'repeat steps: reel {sum(x == 0 for x in reel_steps)}/{len(reel_steps)}, continuation {sum(x == 0 for x in cont_steps)}/{len(cont_steps)}')
area = lambda m: (m != 0).sum()
print('dancer cells: reel n267', area(frames[REEL - 1]), 'orig 797', area(frames[REEL]), ' orig 981', area(frames[-1]))

# ending candidates: a late pose close to the dance's first frame (loop-back) or the shot's end
first = frames[0] != 0
best = max(((((ours[f'f{i}'] != 0) & first).sum() / max(1, ((ours[f'f{i}'] != 0) | first).sum()), i) for i in range(830, 982)))
print(f'pose match to the first dance frame (silhouette IoU), best late frame orig {best[1]}: {best[0]:.3f}')

head = b'GCD2' + struct.pack('<BHHHHB', 2, 49, 40, N, 3000, len(PAL))
pal = bytes(sum(([int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in PAL), []))
body = bytearray(); prev = None
for q in frames:
    flat = q.astype(np.uint8).ravel()
    body += (flat ^ prev).tobytes() if prev is not None else flat.tobytes()
    prev = flat
gz = gzip.compress(head + pal + bytes(body), 9)
out = os.path.join(ROOT, 'final', 'data', 'calendar-dance.bin')
open(out, 'wb').write(gz)
json.dump(src, open(os.path.join(HERE, 'dance-frames.json'), 'w'))
print(f'{N} frames, gzip {len(gz)} B -> {out}')
