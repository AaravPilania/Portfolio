"""Check the shipped loop as Chrome decodes it: sample offset of the loop points against the source track, then the seam
of the decoded loop tiled 3x (sample step, HF burst, spectral jump, 5 ms RMS) next to the same downbeat in the natural
track. Writes scratch/calendar/v4/audio/seam-verify.png."""
import json, os, subprocess, numpy as np
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
W = r'C:\cal4work'; SR = 44100
lj = json.load(open(os.path.join(HERE, 'audio', 'loop.json')))
L = lj['samples']; S = int(round(lj['start'] * SR)); p = int(lj['pad'] * SR)
st = np.load(W + r'\track.npy').astype(np.float64); mono = st.mean(1)
cd = json.load(open(W + r'\chrome-decode.json'))
dec = np.array(cd['start'])
ref = st[S - 4000:S + 4000, 0]
lags = range(-1500, 1501)
c = [np.dot(dec[2000:6000], ref[2000 + k:6000 + k]) / np.sqrt(np.dot(dec[2000:6000], dec[2000:6000]) * np.dot(ref[2000 + k:6000 + k], ref[2000 + k:6000 + k])) for k in lags]
k = lags[int(np.argmax(c))]
print(f'Chrome decode: length {cd["length"]} (= L+2*pad: {cd["length"] == L + 2 * p}); loop start offset vs source {k:+d} samples, corr {max(c):.5f}')
print(f'  residual RMS at offset 0: {np.sqrt(((dec[2000:6000] - ref[2000:6000]) ** 2).mean()):.5f} (signal RMS {np.sqrt((ref ** 2).mean()):.4f})')

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, 'final', 'audio', 'calendar-loop.mp3'), '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'],
                     capture_output=True, check=True).stdout
full = np.frombuffer(raw, '<i2').reshape(-1, 2).astype(np.float64) / 32768
print('ffmpeg decode length', len(full))
x = full[p:p + L]
tile = np.concatenate([x, x, x]).mean(1)
nat = mono[S - L:S + 2 * L]

def stats(m, at, name):
    dif = np.abs(np.diff(m))
    hp = np.diff(m, 2); e = np.convolve(hp ** 2, np.ones(64) / 64, 'same')
    seam = e[at - 256:at + 256].max()
    others = [e[q - 256:q + 256].max() for q in range(at + 5000, at + L - 5000, 9973)]
    w5 = int(0.005 * SR)
    rms = [20 * np.log10(np.sqrt((m[at + i * w5:at + (i + 1) * w5] ** 2).mean()) + 1e-9) for i in range(-10, 10)]
    n = 2048; spec = lambda s: np.log(np.abs(np.fft.rfft(s * np.hanning(n))) + 1e-6)
    sd = np.sqrt(((spec(m[at - n:at]) - spec(m[at:at + n])) ** 2).mean())
    print(f'{name}: step {abs(m[at] - m[at - 1]):.4f} (p99 {np.percentile(dif, 99):.4f}); HF burst {seam / np.median(others):.2f}x median window'
          f' (percentile {(np.array(others) < seam).mean() * 100:.0f}); spectral jump {sd:.3f}; 5 ms RMS min {min(rms):.1f} dB / median {np.median(rms):.1f} dB')
    return sd

stats(tile, L, '3x seam 1'); stats(tile, 2 * L, '3x seam 2')
stats(nat, L, 'natural track, same downbeat')

fig, ax = plt.subplots(3, 1, figsize=(13, 9))
t = np.arange(len(tile)) / SR
w = int(0.05 * SR); env = np.sqrt(np.convolve(tile ** 2, np.ones(w) / w, 'same'))
ax[0].plot(t[::40], tile[::40], lw=0.3, color='#0b8043'); ax[0].plot(t[::40], env[::40], color='#d50000', lw=0.8)
for q in (1, 2): ax[0].axvline(q * L / SR, color='k', ls='--', lw=0.8)
ax[0].set_title(f'Decoded calendar-loop.mp3 loop region x3 ({L / SR:.4f} s each), 50 ms RMS; dashed = seams')
z = int(0.06 * SR)
for i, (sig, lab) in enumerate([(tile, 'our seam (decoded, end -> start)'), (nat, 'natural track at the same downbeat')]):
    seg = sig[L - z:L + z]; tt = np.arange(-z, z) / SR * 1000
    ax[1 + i].plot(tt, seg, lw=0.6, color='#3f51b5')
    w2 = int(0.002 * SR); ax[1 + i].plot(tt, np.sqrt(np.convolve(seg ** 2, np.ones(w2) / w2, 'same')), color='#d50000', lw=1)
    ax[1 + i].axvline(0, color='k', ls='--', lw=0.8); ax[1 + i].set_title(lab + ' (+-60 ms, 2 ms RMS)')
ax[2].set_xlabel('ms')
plt.tight_layout(); plt.savefig(os.path.join(HERE, 'audio', 'seam-verify.png'), dpi=110)
print('plot written')
