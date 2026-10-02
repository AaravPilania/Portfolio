"""Contact sheet of the new dance timeline: one tile per beat (beats 13-56) from final/data/calendar-dance.bin in the
page's palette, labelled with the beat, the data frame and its source (reel / orig / roll), plus the held final pose.
python timeline-sheet.py -> scratch/calendar/v11/timeline-sheet.png"""
import os, json, numpy as np, cv2
from gcd import load, PAL
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
F, _ = load(os.path.join(ROOT, 'final', 'data', 'calendar-dance.bin'))
meta = json.load(open(os.path.join(HERE, 'dance-frames.json')))
src, BF = meta['src'], meta['beat_frames']
rgb = np.array([[int(h[i:i + 2], 16) for i in (5, 3, 1)] for h in PAL], np.uint8)
rgb[0] = (41, 237, 255)
TAG = {'reel': (60, 60, 60), 'orig': (11, 128, 67), 'roll': (181, 81, 63)}
tiles = []
for b in range(13, 57):
    f = min(len(F) - 1, int(round((b - 13) * BF)))
    t = cv2.resize(rgb[F[f]], (147, 120), interpolation=cv2.INTER_NEAREST)
    t = cv2.copyMakeBorder(t, 18, 0, 0, 0, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    k, i = src[f]
    bar = '|' if b % 4 == 0 else ''
    cv2.putText(t, f'{bar}b{b} f{f} {k} {i}', (3, 13), cv2.FONT_HERSHEY_SIMPLEX, 0.36, TAG[k], 1, cv2.LINE_AA)
    if f == len(F) - 1: cv2.putText(t, 'FINAL POSE', (3, 134), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 200), 1, cv2.LINE_AA)
    if b in (18, 49): cv2.rectangle(t, (0, 18), (146, 137), (0, 0, 220), 2)
    tiles.append(cv2.copyMakeBorder(t, 2, 2, 2, 2, cv2.BORDER_CONSTANT, value=(255, 255, 255)))
cols = 11
while len(tiles) % cols: tiles.append(np.full_like(tiles[0], 255))
sheet = np.vstack([np.hstack(tiles[k:k + cols]) for k in range(0, len(tiles), cols)])
head = np.full((30, sheet.shape[1], 3), 255, np.uint8)
cv2.putText(head, 'Dance timeline, one tile per beat (| = downbeat). red frames: b18 DJ repeat join, b49 cut to the rolled shot. grey reel / green orig 797-978 / blue roll 1044-1121',
            (6, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)
cv2.imwrite(os.path.join(HERE, 'timeline-sheet.png'), np.vstack([head, sheet]))
print(sheet.shape)
