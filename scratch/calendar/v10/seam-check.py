# Seam check on the shipped final/audio/calendar-loop.mp3: decode, cut the loop exactly as calendar-audio.js plays it
# (pad .. pad + LOOP), and compare the wrap's sample step and 10 ms RMS against the loop's interior.
# python scratch/calendar/v10/seam-check.py
import os, subprocess
import numpy as np

SR, N, PAD = 44100, 927155, 0.5
ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')
mp3 = os.path.join(ROOT, 'final', 'audio', 'calendar-loop.mp3')
dec = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', mp3, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout, dtype=np.float32).reshape(-1, 2)
p = int(round(PAD * SR))
loop = dec[p:p + N].mean(axis=1)
wrap = np.concatenate([loop[-2048:], loop[:2048]])
d_wrap = np.abs(np.diff(wrap))
d_in = np.abs(np.diff(loop[SR:SR * 5]))
print('decoded %d samples, loop %d' % (len(dec), len(loop)))
print('step at wrap %.5f | wrap p99 %.5f | interior p99 %.5f | interior max %.5f' % (d_wrap[2047], np.percentile(d_wrap, 99), np.percentile(d_in, 99), d_in.max()))
w = int(0.01 * SR)
rms = [np.sqrt(np.mean(wrap[i:i + w] ** 2)) for i in range(2048 - 4 * w, 2048 + 4 * w, w)]
print('10 ms RMS, 4 before | 4 after:', ' '.join('%.3f' % r for r in rms[:4]), '|', ' '.join('%.3f' % r for r in rms[4:]))
# the pads must equal the loop's far ends, so a start at offset 0 or a late join hits the same samples
pre = dec[:p].mean(axis=1); post = dec[p + N:p + N + p].mean(axis=1)
print('pad match: head vs loop tail %.4f, tail vs loop head %.4f (max abs diff)' % (np.abs(pre[-4096:] - loop[-4096:]).max(), np.abs(post[:4096] - loop[:4096]).max()))
