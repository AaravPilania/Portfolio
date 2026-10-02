"""Rank whole-bar loop candidates by beat-synchronous similarity around the seam."""
import numpy as np, json
W = r'C:\cal4work'
f = np.load(W + r'\feat.npz'); bj = json.load(open(W + r'\beats.json'))
P, O = bj['period'], bj['offset']
T, mel, chroma = f['T'], f['mel'], f['chroma']
st = np.load(W + r'\track.npy'); SR = 44100
dur = len(st) / SR
nb = int((dur - O) / P) - 1
grid = O + P * np.arange(nb + 1)
fi = np.searchsorted(T, grid)
M = np.stack([mel[:, fi[b]:fi[b + 1]].mean(1) for b in range(nb)])
C = np.stack([chroma[:, fi[b]:fi[b + 1]].mean(1) for b in range(nb)])
rms = np.array([np.sqrt((st[int(grid[b] * SR):int(grid[b + 1] * SR)] ** 2).mean()) for b in range(nb)])
nz = lambda a: (a - a.mean(1, keepdims=True)) / (np.linalg.norm(a - a.mean(1, keepdims=True), axis=1, keepdims=True) + 1e-9)
Mz, Cz = nz(M), C / (np.linalg.norm(C, axis=1, keepdims=True) + 1e-9)
# downbeat phase: harmonic change is largest on beat 1
nov = np.r_[0, 1 - (Cz[1:] * Cz[:-1]).sum(1)]
ph = [nov[k::4].mean() for k in range(4)]
DB = int(np.argmax(ph))
print('chroma novelty by phase', np.round(ph, 3), '-> downbeat phase', DB)
# 8-bar phrase phase: bigger change every 32 beats
nov8 = [nov[DB + 4 * k::32].mean() for k in range(8)]
print('novelty by bar-in-8', np.round(nov8, 3))
print('bar RMS (dB) every bar from first downbeat:')
bars = np.arange(DB, nb - 4, 4)
line = ''
for i, b in enumerate(bars):
    line += '%5.1f@%-6.1f' % (20 * np.log10(rms[b:b + 4].mean() + 1e-9), grid[b])
    if i % 8 == 7: print(line); line = ''
print(line)

def seam(b0, L, w=8):
    js = np.arange(-w, w)
    a, b = b0 + js, b0 + L + js
    if a.min() < 0 or b.max() >= nb: return -1
    sm = (Mz[a] * Mz[b]).sum(1).mean()
    sc = (Cz[a] * Cz[b]).sum(1).mean()
    se = 1 - np.abs(np.log(rms[a] + 1e-6) - np.log(rms[b] + 1e-6)).mean()
    return 0.45 * sm + 0.35 * sc + 0.2 * se

out = {}
for L in (32, 48, 64):
    cand = [(seam(b0, L), b0) for b0 in range(DB, nb - L - 8, 4)]
    cand.sort(reverse=True)
    print(f'\n{L // 4} bars ({L * P:.3f} s): top candidates')
    for s, b0 in cand[:10]:
        print('  start %.3f s (beat %d, bar-in-8 %d) end %.3f  score %.4f  loudness %.1f dB' % (
            grid[b0], b0, ((b0 - DB) // 4) % 8, grid[b0 + L], s, 20 * np.log10(rms[b0:b0 + L].mean())))
    out[L] = [(float(s), int(b0), float(grid[b0])) for s, b0 in cand[:10]]
json.dump({'grid0': O, 'P': P, 'DB': DB, 'cands': out}, open(W + r'\loops.json', 'w'))
