"""16-bar soundtrack loop: source bars 79-94 of Better Off Alone (beat 316 of the beat grid, the downbeat the v10 cycle
already starts on, so the page's first beat is unchanged and no rotation is needed). Same method as v4/audio-build.py:
start snapped to the kick attack, length fitted by cross-correlating +-0.25 s around the end with the start, a 12 ms
equal-power crossfade into the audio before the start baked into the tail, 0.5 s circular pads, 128 kbps MP3. Then the
decoded file is checked against the source loop (SNR) and across the seam, as v10/audio-rotate.py did.
python scratch/calendar/v11/audio-build16.py"""
import json, os, subprocess
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SRC = r"C:\Users\gaura\Downloads\Alice Deejay - Better Off Alone (Official Video) - (320 Kbps).mp3"
OUT = os.path.join(ROOT, 'final', 'audio', 'calendar-loop.mp3')
SR, PAD, XF, B0, BARS = 44100, 0.5, 0.012, 316, 16
bj = json.load(open(r'C:\cal4work\beats.json')); P, O = bj['period'], bj['offset']
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
st = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
mono = st.mean(1)
S = int(round((O + B0 * P) * SR))
w = int(0.04 * SR); acc = np.zeros(w + int(0.02 * SR))
for b in range(B0 - 4, B0 + 52):
    c = int(round((O + b * P) * SR))
    acc += np.convolve(mono[c - w:c + int(0.02 * SR)] ** 2, np.ones(88) / 88, 'same')
shift = int(np.argmax(np.diff(acc[44:-44]))) + 44 - w
S += shift
v10 = json.load(open(os.path.join(HERE, '..', 'v10', 'loop-rotated.json')))
print('attack %+.1f ms -> start %.4f s (v10 cycle started at %.4f s: %+.1f ms)' % (shift / SR * 1e3, S / SR, v10['cycle_starts_at_source'], (S / SR - v10['cycle_starts_at_source']) * 1e3))
Lnom = int(round(BARS * 4 * P * SR)); win = int(0.25 * SR)
best = None
for d in range(-200, 201):
    a = mono[S - win:S + win]; b = mono[S + Lnom + d - win:S + Lnom + d + win]
    c = (a * b).sum() / np.sqrt((a * a).sum() * (b * b).sum())
    if best is None or c > best[0]: best = (c, d)
L = Lnom + best[1]
print('nominal %d samples, fitted %d (%+d, corr %.4f) -> loop %.6f s, beat %.6f s' % (Lnom, L, best[1], best[0], L / SR, L / SR / (BARS * 4)))
X = int(XF * SR)
x = st[S:S + L].copy()
th = np.linspace(0, np.pi / 2, X, endpoint=False)[:, None]
x[L - X:] = st[S + L - X:S + L] * np.cos(th) + st[S - X:S] * np.sin(th)
p = int(PAD * SR)
padded = np.concatenate([x[L - p:], x, x[:p]]).astype(np.float32)
f32 = os.path.join(HERE, 'loop16.f32'); padded.tofile(f32)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', f32, '-c:a', 'libmp3lame', '-b:a', '128k', OUT], check=True)
os.remove(f32)

dec = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', OUT, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout, np.float32).reshape(-1, 2)
m = dec.mean(1); ref = padded.mean(1)
seg = slice(p + 20000, p + 120000)
lag = max(range(-3000, 3001), key=lambda k: float(np.dot(m[seg.start + k:seg.stop + k], ref[seg])))
body = m[p + lag:p + lag + L]
snr = 10 * np.log10((ref[p:p + L] ** 2).mean() / ((body - ref[p:p + L]) ** 2).mean())
wrap = np.concatenate([dec[p + lag + L - 2048:p + lag + L], dec[p + lag:p + lag + 2048]]).mean(1)
inside = dec[p + lag + L // 2 - 2048:p + lag + L // 2 + 2048].mean(1)
dw, di = np.abs(np.diff(wrap)), np.abs(np.diff(inside))
rms = [float(np.sqrt((wrap[i:i + 441] ** 2).mean())) for i in range(0, len(wrap) - 441, 441)]
n = 2048
spec = lambda s: np.log(np.abs(np.fft.rfft(s * np.hanning(n))) + 1e-6)
sd_seam = np.sqrt(((spec(wrap[:n]) - spec(wrap[n:])) ** 2).mean())
sd_in = np.sqrt(((spec(inside[:n]) - spec(inside[n:])) ** 2).mean())
print('decoded %d samples (expected %d), decoder lag %d, SNR vs source loop %.1f dB' % (len(dec), len(padded), lag, snr))
print('seam step %.5f, wrap p99 %.5f, interior p99 %.5f; spectral jump seam %.3f vs interior %.3f' % (dw[2047], np.percentile(dw, 99), np.percentile(di, 99), sd_seam, sd_in))
print('RMS across seam (10 ms):', ' '.join('%.3f' % r for r in rms))
info = dict(source_start=S / SR, samples=L, bars=BARS, beats=BARS * 4, loop=L / SR, beat=L / SR / (BARS * 4), source_bars='79-94', start_beat=B0,
            seam_corr=round(best[0], 4), xf_ms=XF * 1e3, pad=PAD, decoder_lag=lag, snr_db=round(float(snr), 1), size=os.path.getsize(OUT))
json.dump(info, open(os.path.join(HERE, 'loop16.json'), 'w'), indent=1)
print(json.dumps(info))
