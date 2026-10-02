"""Build final/data/calendar-dance.bin for the 16-bar cycle (GCD2, 49x40, 30 fps, every data frame 1/30 s at 1.0x).

The page starts the dance on beat 13; a beat is 13.140 data frames (loop16.json).
  page   0- 65  reel n66-131, the opening bar
  page  66-254  reel n79-267: a one-bar DJ repeat. Reel frames 10-14 and 63-67 are the same move (posematch.py: the
                best 4-beat match in the dance; silhouette IoU 0.76 across the join), so after reel frame 65 the
                dance picks up again at reel frame 13 and the opening move plays twice, keeping its place in the bar
  page 255-472  orig 797-978 rendered in the reel's style (v4/render.py), on the reel's 25 -> 30 fps cadence; cut on beat 49
  page 473-565  orig 1044-1121, the rolled-camera shot after the white-shirt dancer passes, turned upright and rendered
                by render-tilt.py on the same cadence; its last frame is the kid's arms-spread pose, on beat 56
The page holds that last frame as the final pose until the rising line takes it (beat 58).
python scratch/calendar/v11/build-dance.py"""
import os, json, numpy as np
from gcd import save
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
W = r'C:\cal4work'
loop = json.load(open(os.path.join(HERE, 'loop16.json')))
BEATF = loop['beat'] * 30
maps = np.load(W + r'\reel_maps.npy'); ours = np.load(W + r'\ours.npz'); tilt = np.load(W + r'\tilt_ours.npz')
src = [('reel', 66 + f) for f in range(0, 66)] + [('reel', 66 + f) for f in range(13, 202)]
cut_b = int(round((49 - 13) * BEATF))
src += [('orig', 797 + int(k * 5 / 6 + 0.5)) for k in range(cut_b - len(src))]
end = int(round((56 - 13) * BEATF))
nC = end + 1 - len(src)
src += [('roll', 1044 + int(k * 5 / 6 + 0.5)) for k in range(nC)]
get = {'reel': lambda i: maps[i], 'orig': lambda i: ours[f'f{i}'], 'roll': lambda i: tilt[f'f{i}']}
frames = np.stack([get[k](i) for k, i in src]).astype(np.uint8)
N = len(frames)
assert src[-1] == ('roll', 1121), src[-1]
print(f'{N} frames = {N / 30:.3f} s; beat = {BEATF:.3f} frames; B->C cut at page {cut_b} (beat {13 + cut_b / BEATF:.3f}); final pose page {N - 1} (beat {13 + (N - 1) / BEATF:.3f})')
print('segments:', [(k, src.index(next(s for s in src if s[0] == k)), max(j for j, s in enumerate(src) if s[0] == k)) for k in ('reel', 'orig', 'roll')])

ch = lambda a, b: (a != b).mean()
sil = lambda a, b: ((a != 0) & (b != 0)).sum() / max(1, ((a != 0) | (b != 0)).sum())
reel_steps = [ch(maps[n], maps[n - 1]) for n in range(67, 268)]
moving = [x for x in reel_steps if x > 0]
print(f'cell change per step: reel median {np.median(moving):.3f}, p90 {np.percentile(moving, 90):.3f}, max {max(moving):.3f}')
for name, p in (('DJ repeat (reel 65 -> 13)', 66), ('reel n267 -> orig 797', 255), ('orig 978 -> roll 1044 (beat 49)', cut_b)):
    print(f'join {name}: {ch(frames[p - 1], frames[p]):.3f} cells changed, silhouette IoU {sil(frames[p - 1], frames[p]):.3f}')
roll_steps = [ch(frames[f], frames[f - 1]) for f in range(cut_b + 1, N)]
print(f'rolled shot steps: median {np.median([x for x in roll_steps if x > 0]):.3f}, p90 {np.percentile(roll_steps, 90):.3f}; repeats {sum(x == 0 for x in roll_steps)}/{len(roll_steps)}')
area = lambda m: int((m != 0).sum())
print('dancer cells: page 0', area(frames[0]), ' orig 978', area(frames[cut_b - 1]), ' roll 1044', area(frames[cut_b]), ' final pose', area(frames[-1]))
size = save(os.path.join(ROOT, 'final', 'data', 'calendar-dance.bin'), frames)
json.dump(dict(frames=N, beat_frames=BEATF, cut_b=cut_b, src=src), open(os.path.join(HERE, 'dance-frames.json'), 'w'))
print(f'gzip {size} B')
