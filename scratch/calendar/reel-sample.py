"""Sample the reel's dance (already rendered as calendar cells) at its own 49x40 cell grid.

Writes scratch/calendar/v3/reel/cells.npy: uint8 [frames, 40, 49] RGB-cluster samples (median per cell),
and a colour histogram for palette mapping.
"""
import subprocess, sys, numpy as np

SRC = r'C:\Users\gaura\Downloads\inspo.mp4'
X0, Y0, GW, GH = 52 + 22, 396 + 42, 594, 446
COLS, ROWS = 49, 40
N0, N1 = int(sys.argv[1]) if len(sys.argv) > 1 else 60, int(sys.argv[2]) if len(sys.argv) > 2 else 268

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-vf', f'crop={GW}:{GH}:{X0}:{Y0}', '-f', 'rawvideo',
                      '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, GH, GW, 3)[N0:N1].astype(np.int16)
pw, ph = GW / COLS, GH / ROWS
out = np.zeros((len(fr), ROWS, COLS, 3), np.uint8)
for r in range(ROWS):
    y = int((r + 0.5) * ph)
    for c in range(COLS):
        x = int((c + 0.5) * pw)
        patch = fr[:, y + 1:y + 5, x - 2:x + 4].reshape(len(fr), -1, 3)
        out[:, r, c] = np.median(patch, axis=1)
np.save('scratch/calendar/v3/reel/cells.npy', out)
q = (out.reshape(-1, 3) // 16).astype(np.int32)
keys, cnt = np.unique(q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2], return_counts=True)
for k, n in sorted(zip(keys, cnt), key=lambda a: -a[1])[:40]:
    print('#%02x%02x%02x' % ((k >> 8) * 16 + 8, ((k >> 4) & 15) * 16 + 8, (k & 15) * 16 + 8), n)
