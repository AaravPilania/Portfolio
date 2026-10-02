"""Which frames of a candidate upload are NOT in the original 3eRBFkxgG7g? Each candidate frame (all frames, 32x24 grey,
centre-cropped to 4:3, also tried mirrored) is matched to its best original frame by normalised correlation; runs of
frames with no good match are footage the original lacks. python cand-match.py <video> [<video> ...]"""
import subprocess, sys, json, numpy as np
W = r'C:\cal4work'

def thumbs(path, crop43=True):
    vf = ('crop=ih*4/3:ih,' if crop43 else '') + 'scale=32:24:flags=area,format=gray'
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', vf, '-f', 'rawvideo', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(-1, 24 * 32).astype(np.float32)
    a -= a.mean(1, keepdims=True)
    return a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-6)

orig = thumbs(W + r'\orig.mp4', False)
out = {}
for p in sys.argv[1:]:
    probe = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', p], capture_output=True).stdout)['streams'][0]
    crop = probe['width'] / probe['height'] > 1.4
    c = thumbs(p, crop)
    cm = c.reshape(-1, 24, 32)[:, :, ::-1].reshape(len(c), -1)
    s1 = c @ orig.T; s2 = cm @ orig.T
    best = np.maximum(s1.max(1), s2.max(1)); arg = np.where(s1.max(1) >= s2.max(1), s1.argmax(1), s2.argmax(1))
    num, den = map(int, probe['r_frame_rate'].split('/')); fps = num / den
    new = best < 0.8
    runs, i = [], 0
    while i < len(new):
        if new[i]:
            j = i
            while j < len(new) and new[j]: j += 1
            if j - i >= int(fps): runs.append((round(i / fps, 2), round(j / fps, 2)))
            i = j
        else: i += 1
    matched = arg[~new]
    print(f'{p}: {len(c)} frames @ {fps:.2f}; matched to orig {100 * (~new).mean():.1f}%; orig range covered {matched.min() if len(matched) else -1}-{matched.max() if len(matched) else -1};'
          f' max orig frame matched {int(matched.max()) if len(matched) else -1}; unmatched runs >=1 s: {runs}')
    out[p] = dict(fps=fps, best=best.round(3).tolist(), arg=arg.tolist())
json.dump(out, open(W + r'\cand\match.json', 'w'))
