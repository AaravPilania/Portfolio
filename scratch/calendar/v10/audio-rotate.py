# Rotate the 12-bar loop so the cycle starts on bar 4's downbeat (the first beat of an instrumental phrase), rebuild
# final/audio/calendar-loop.mp3 with 0.5 s circular pads, then verify the decoded file against the rotated source and
# the seam's continuity. python scratch/calendar/v10/audio-rotate.py
import json, os, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'final', 'audio', 'calendar-loop.mp3')
SR, N, BEATS, PAD = 44100, 927155, 48, 0.5
ROT_BEATS = 16

loop = np.load(os.path.join(HERE, 'loop-st.npy'))
assert loop.shape[0] == N
k = int(round(ROT_BEATS * N / BEATS))
rot = np.roll(loop, -k, axis=0)
p = int(round(PAD * SR))
padded = np.concatenate([rot[-p:], rot, rot[:p]]).astype(np.float32)
wav = os.path.join(HERE, 'rot.f32')
padded.tofile(wav)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '128k', OUT], check=True)
os.remove(wav)

dec = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', OUT, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout, dtype=np.float32).reshape(-1, 2)
print('decoded samples', dec.shape[0], 'expected', padded.shape[0])
m = dec.mean(axis=1)
ref = padded.mean(axis=1)
seg = slice(p + 20000, p + 120000)
best = max(range(-3000, 3001), key=lambda L: float(np.dot(m[seg.start + L:seg.stop + L], ref[seg])))
print('decoder lag (samples)', best)
body = m[p + best:p + best + N]
err = body - ref[p:p + N]
snr = 10 * np.log10((ref[p:p + N] ** 2).mean() / (err ** 2).mean())
print('SNR decoded vs rotated source: %.1f dB' % snr)

# seam: the loop's last samples running into its first, exactly as AudioBufferSourceNode plays loopEnd -> loopStart
wrap = np.concatenate([dec[p + best + N - 2048:p + best + N], dec[p + best:p + best + 2048]]).mean(axis=1)
inside = dec[p + best + N - 2048 - 4096:p + best + N - 4096 + 2048 * 2].mean(axis=1)
d_wrap = np.abs(np.diff(wrap))
d_in = np.abs(np.diff(inside))
print('seam step |d| at wrap %.5f, wrap p99 %.5f, interior p99 %.5f' % (d_wrap[2047], np.percentile(d_wrap, 99), np.percentile(d_in, 99)))
# short-time RMS across the seam (10 ms windows) to catch a level jump
w = 441
rms = [float(np.sqrt((wrap[i:i + w] ** 2).mean())) for i in range(0, len(wrap) - w, w)]
print('RMS across seam (10 ms):', ' '.join('%.3f' % r for r in rms))
# the pads hold the circular neighbours, so the decoder's view of loopEnd matches loopStart's preroll
pre = dec[best:best + p].mean(axis=1); post_ref = dec[p + best + N - p:p + best + N].mean(axis=1)
print('pad-before vs loop tail SNR: %.1f dB' % (10 * np.log10((post_ref ** 2).mean() / ((pre - post_ref) ** 2).mean())))
info = dict(source_start=131.95761904761906, samples=N, rotate_beats=ROT_BEATS, rotate_samples=k, rotate_seconds=k / SR,
            cycle_starts_at_source=131.95761904761906 + k / SR, pad=PAD, decoder_lag=best, snr_db=round(float(snr), 1), size=os.path.getsize(OUT))
json.dump(info, open(os.path.join(HERE, 'loop-rotated.json'), 'w'), indent=1)
print(json.dumps(info))
