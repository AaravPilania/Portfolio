"""Cut the soundtrack loop: BARS bars from START (a downbeat) of the full track, loop length fitted to the sample by
cross-correlating the audio around the end with the audio around the start, an equal-power crossfade baked into the last
XF ms (before the downbeat, so no kick is smeared), and PAD s of circular padding on both sides so any MP3 decoder
delay still lands inside identical audio. Writes final/audio/calendar-loop.mp3, a 3x render for analysis and a plot.
"""
import numpy as np, json, subprocess, os, sys
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
W = r'C:\cal4work'; SR = 44100
st = np.load(W + r'\track.npy').astype(np.float64)
bj = json.load(open(W + r'\beats.json')); P, O = bj['period'], bj['offset']
B0 = int(os.environ.get('BEAT0', 300)); BARS = int(os.environ.get('BARS', 12))
XF = float(os.environ.get('XF', 0.012)); PAD = 0.5
S = int(round((O + B0 * P) * SR))
mono = st.mean(1)
# the beat tracker's onset peaks trail the transient; measure the attack on the 2 ms envelope averaged over the 56 beats
# around the start (steepest rise within -40..+20 ms of the grid) and cut there
w = int(0.04 * SR); acc = np.zeros(w + int(0.02 * SR))
for b in range(B0 - 4, B0 + 52):
    c = int(round((O + b * P) * SR))
    acc += np.convolve(mono[c - w:c + int(0.02 * SR)] ** 2, np.ones(88) / 88, 'same')
shift = int(np.argmax(np.diff(acc[44:-44]))) + 44 - w
S += shift
print('attack %+.1f ms from the beat grid -> start %.4f s' % (shift / SR * 1000, S / SR))
# downbeat onset refine: snap S to the kick's attack (low-band energy rise) within +-15 ms
Lnom = int(round(BARS * 4 * P * SR))
win = int(0.25 * SR)
best = None
for d in range(-200, 201):
    a = mono[S - win:S + win]; b = mono[S + Lnom + d - win:S + Lnom + d + win]
    c = (a * b).sum() / np.sqrt((a * a).sum() * (b * b).sum())
    if best is None or c > best[0]: best = (c, d)
L = Lnom + best[1]
print('start %.4f s  nominal %d samples, fitted %d (%+d, corr %.4f) -> loop %.6f s, beat %.6f s' % (
    S / SR, Lnom, L, best[1], best[0], L / SR, L / SR / (BARS * 4)))

X = int(XF * SR)
x = st[S:S + L].copy()
th = np.linspace(0, np.pi / 2, X, endpoint=False)[:, None]
# last X samples fade from the segment's own tail into the audio that precedes the start
x[L - X:] = st[S + L - X:S + L] * np.cos(th) + st[S - X:S] * np.sin(th)

def stats(sig, at, name):
    m = sig.mean(1)
    dif = np.abs(np.diff(m))
    j = np.abs(m[at] - m[at - 1])
    hp = np.diff(m, 2)
    e = np.convolve(hp ** 2, np.ones(64) / 64, 'same')
    seam_e = e[at - 256:at + 256].max(); ref = np.median([e[k - 256:k + 256].max() for k in range(at + 4000, at + 400000, 9973)])
    r = lambda a, b: np.sqrt((m[a:b] ** 2).mean())
    w5 = int(0.005 * SR)
    rm = [20 * np.log10(r(at + k * w5, at + (k + 1) * w5) + 1e-9) for k in range(-20, 20)]
    # spectral distance between the 46 ms just before and just after the seam
    n = 2048
    spec = lambda s: np.log(np.abs(np.fft.rfft(s * np.hanning(n))) + 1e-6)
    sd = np.sqrt(((spec(m[at - n:at]) - spec(m[at:at + n])) ** 2).mean())
    print(f'{name}: seam step {j:.4f} (p99 sample step {np.percentile(dif, 99):.4f}); HF energy at seam {seam_e * 1e4:.2f}e-4; spectral jump {sd:.3f};'
          f' 5 ms RMS around seam min {min(rm):.1f} dB, median {np.median(rm):.1f} dB')
    return rm

tile = np.concatenate([x, x, x])
rm = stats(tile, L, '3x loop seam 1'); stats(tile, 2 * L, '3x loop seam 2')
nat = st[S - L:S + 2 * L]
stats(nat, L, 'reference: natural track at the start downbeat')

# bar-level energy across the 3x render: a seam dip would show up as an outlier at L, 2L
w = int(0.05 * SR)
env = np.sqrt(np.convolve(tile.mean(1) ** 2, np.ones(w) / w, 'same'))
OUTD = os.path.join(HERE, 'audio'); os.makedirs(OUTD, exist_ok=True)
fig, ax = plt.subplots(3, 1, figsize=(13, 9))
t = np.arange(len(tile)) / SR
ax[0].plot(t[::40], tile.mean(1)[::40], lw=0.3, color='#0b8043'); ax[0].plot(t[::40], env[::40], color='#d50000', lw=0.8)
for k in (1, 2): ax[0].axvline(k * L / SR, color='k', ls='--', lw=0.8)
ax[0].set_title(f'Loop x3 ({L / SR:.4f} s each), 50 ms RMS envelope; dashed = seams')
z = int(0.06 * SR)
for i, (sig, lab) in enumerate([(tile, 'our seam (end -> start)'), (nat, 'natural track at the same downbeat')]):
    seg = sig[L - z:L + z].mean(1); tt = (np.arange(-z, z)) / SR * 1000
    ax[1 + i].plot(tt, seg, lw=0.6, color='#3f51b5')
    w5 = int(0.002 * SR)
    e2 = np.sqrt(np.convolve(seg ** 2, np.ones(w5) / w5, 'same'))
    ax[1 + i].plot(tt, e2, color='#d50000', lw=1)
    ax[1 + i].axvline(0, color='k', ls='--', lw=0.8); ax[1 + i].axvspan(-XF * 1000, 0, color='#f6bf26', alpha=0.25)
    ax[1 + i].set_title(lab + ' (+-60 ms, 2 ms RMS; yellow = crossfade)')
ax[2].set_xlabel('ms')
plt.tight_layout(); plt.savefig(os.path.join(OUTD, 'seam.png'), dpi=110)

p = int(PAD * SR)
filebuf = np.concatenate([x[L - p:], x, x[:p]])
pcm = (np.clip(filebuf, -1, 1) * 32767).astype('<i2').tobytes()
mp3 = os.path.join(ROOT, 'final', 'audio', 'calendar-loop.mp3')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame',
                '-b:a', '192k', '-write_xing', '1', mp3], input=pcm, check=True)
three = os.path.join(W, 'loop3x.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', three],
               input=(np.clip(tile, -1, 1) * 32767).astype('<i2').tobytes(), check=True)
json.dump({'start': S / SR, 'end': (S + L) / SR, 'samples': L, 'loop': L / SR, 'pad': PAD, 'bars': BARS, 'beat': L / SR / (BARS * 4)},
          open(os.path.join(OUTD, 'loop.json'), 'w'), indent=1)
print('mp3', os.path.getsize(mp3), 'B')
