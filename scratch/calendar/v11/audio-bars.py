"""Which longer whole-bar loops of Better Off Alone around the current cut (beat 300 of the beat grid) are seamless?
For a loop of N bars starting at bar s, the bar after its end (s+N) must sound like bar s and the bar before its end like
bar s-1. Bar similarity: cosine of log-mel + chroma per beat. Also prints each bar's vocal-ish foreground level."""
import json, numpy as np, librosa, subprocess
SRC = r"C:\Users\gaura\Downloads\Alice Deejay - Better Off Alone (Official Video) - (320 Kbps).mp3"
SR = 22050
bj = json.load(open(r'C:\cal4work\beats.json')); P, O = bj['period'], bj['offset']
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
y = np.frombuffer(raw, np.float32)
print('track %.1f s' % (len(y) / SR))
hop = 256
M = librosa.power_to_db(librosa.feature.melspectrogram(y=y, sr=SR, n_fft=2048, hop_length=hop, n_mels=64))
C = librosa.feature.chroma_stft(y=y, sr=SR, n_fft=4096, hop_length=hop)
t = librosa.frames_to_time(np.arange(M.shape[1]), sr=SR, hop_length=hop)
nb = int((len(y) / SR - O) / P) - 1
def beatfeat(b):
    m = (t >= O + b * P) & (t < O + (b + 1) * P)
    v = np.r_[M[:, m].mean(1) / 10, C[:, m].mean(1) * 3]
    return v
F = np.array([beatfeat(b) for b in range(nb)])
F = F - F.mean(0)
def bar(k): return F[4 * k:4 * k + 4].ravel()
def sim(a, b):
    x, z = bar(a), bar(b); return float(x @ z / (np.linalg.norm(x) * np.linalg.norm(z) + 1e-9))
s0 = 75
print('bar  sim-to-bar75  sim-to-bar74  rms')
for k in range(60, min(nb // 4, 100)):
    m = (t >= O + 4 * k * P) & (t < O + 4 * (k + 1) * P)
    print(f'{k:3d} {k - s0:+4d}  {sim(k, s0):.3f}  {sim(k, s0 - 1):.3f}  {M[:, m].mean():.1f}')
print()
for s in (75, 76, 77, 78, 79):
    for N in (12, 16, 20, 24):
        if s + N + 1 > nb // 4: continue
        print(f'start bar {s} (beat {4 * s}), {N} bars: after-end~start {sim(s + N, s):.3f}, end~before-start {sim(s + N - 1, s - 1):.3f}')
