"""Cache reel cell maps (49x40 palette indices, n0-267) and the original's frames for alignment work."""
import os, subprocess, numpy as np, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
W = os.path.join(HERE, 'work')
spec = importlib.util.spec_from_file_location('rb', os.path.join(HERE, '..', 'reel-build.py'))

# reel-build runs its build at import; replicate only what we need
SRC = r'C:\Users\gaura\Downloads\inspo.mp4'
X0, Y0, GW, GH = 52 + 22, 396 + 42, 594, 446
src = open(os.path.join(HERE, '..', 'reel-build.py'), encoding='utf8').read()
ns = {'__file__': os.path.join(HERE, '..', 'reel-build.py')}
exec(src.split('raw = subprocess.run')[0], ns)
A_RGB, A_IDX = ns['A_RGB'], ns['A_IDX']
COLS, ROWS = 49, 40

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-vf', f'crop={GW}:{GH}:{X0}:{Y0}', '-f', 'rawvideo',
                      '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
video = np.frombuffer(raw, np.uint8).reshape(-1, GH, GW, 3)
np.save(os.path.join(W, 'reel_card.npy'), video)
pw, ph = GW / COLS, GH / ROWS
xe = [int(round(c * pw)) for c in range(COLS + 1)]
ye = [int(round(r * ph)) for r in range(ROWS + 1)]
maps = np.zeros((len(video), ROWS, COLS), np.uint8)
for n in range(len(video)):
    img = video[n].astype(np.float32)
    cls = A_IDX[((img[:, :, None, :] - A_RGB[None, None]) ** 2).sum(-1).argmin(-1)]
    for r in range(ROWS):
        for c in range(COLS):
            p = cls[ye[r] + 2:ye[r + 1] - 1, xe[c] + 2:xe[c + 1] - 2].ravel()
            p = p[p >= 0]
            if len(p) >= 6:
                maps[n, r, c] = np.bincount(p, minlength=13).argmax()
np.save(os.path.join(W, 'reel_maps.npy'), maps)

orig = os.path.join(W, 'orig.mp4')
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', orig, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                     capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, 480, 640, 3)
np.save(os.path.join(W, 'orig480.npy'), fr)
print(maps.shape, fr.shape)
