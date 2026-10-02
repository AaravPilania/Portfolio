# Per-beat analysis of the 12-bar loop (Better Off Alone 131.958-152.982 s): foreground (vocal) energy from a
# REPET-SIM style nearest-neighbour separation, percussive onset strength from HPSS, spectral centroid.
# python scratch/calendar/v10/audio-analyse.py -> prints a table + writes analysis.json and analysis.png
import json, os, subprocess, sys
import numpy as np
import librosa

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\gaura\Downloads\Alice Deejay - Better Off Alone (Official Video) - (320 Kbps).mp3"
SR = 44100
START, N = 131.95761904761906, 927155
BEATS = 48

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
st = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
s0 = int(round(START * SR))
loop = st[s0:s0 + N]
np.save(os.path.join(HERE, 'loop-st.npy'), loop)
y = loop.mean(axis=1)
# side channel: lead vocals are usually centred, synths often wide
side = (loop[:, 0] - loop[:, 1]) * 0.5

# tile 3x so the separation sees the loop circularly
y3 = np.concatenate([y, y, y])
S, phase = librosa.magphase(librosa.stft(y3, n_fft=2048, hop_length=512))
beat_s = (N / SR) / BEATS
frames_per_beat = beat_s * SR / 512
S_filter = librosa.decompose.nn_filter(S, aggregate=np.median, metric='cosine', width=int(round(frames_per_beat * 4)))
S_filter = np.minimum(S, S_filter)
margin_v = 10
mask_v = librosa.util.softmask(S - S_filter, margin_v * S_filter, power=2)
S_fg = mask_v * S
H, P = librosa.decompose.hpss(S, margin=2.0)

freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
vb = (freqs > 250) & (freqs < 3500)
nf = S.shape[1] // 3
sl = slice(nf, 2 * nf)
fg = (S_fg[vb][:, sl] ** 2).sum(axis=0)
tot = (S[vb][:, sl] ** 2).sum(axis=0) + 1e-9
perc = (P[:, sl] ** 2).sum(axis=0)
onset = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S, ref=np.max)[:, sl], sr=SR)
cent = librosa.feature.spectral_centroid(S=S[:, sl], sr=SR)[0]
low = (S[freqs < 150][:, sl] ** 2).sum(axis=0)
t = librosa.frames_to_time(np.arange(nf), sr=SR, hop_length=512)

rows = []
for b in range(BEATS):
    a, e = b * beat_s, (b + 1) * beat_s
    m = (t >= a) & (t < e)
    # onset right at the beat (first 60 ms)
    mo = (t >= a - 0.02) & (t < a + 0.06)
    rows.append(dict(beat=b, bar=b // 4, t=round(a, 3), fg_ratio=float(fg[m].sum() / tot[m].sum()), fg=float(fg[m].sum()),
                     onset_at=float(onset[mo].max() if mo.any() else 0), perc=float(perc[m].sum()), low=float(low[m].sum()),
                     cent=float(cent[m].mean())))
fgmax = max(r['fg'] for r in rows); pmax = max(r['perc'] for r in rows); omax = max(r['onset_at'] for r in rows); lmax = max(r['low'] for r in rows)
print('beat bar   t      fgRatio  fg%   onset  perc%  low%  centroid')
for r in rows:
    print(f"{r['beat']:4d} {r['bar']:3d} {r['t']:6.2f}   {r['fg_ratio']:.3f}  {100*r['fg']/fgmax:5.1f} {r['onset_at']/omax:6.2f} {100*r['perc']/pmax:5.1f} {100*r['low']/lmax:5.1f}  {r['cent']:6.0f}")
bars = []
for k in range(12):
    rr = rows[k * 4:(k + 1) * 4]
    bars.append(dict(bar=k, fg=sum(r['fg'] for r in rr) / fgmax / 4, fg_ratio=float(np.mean([r['fg_ratio'] for r in rr])), down_onset=rr[0]['onset_at'] / omax, low=rr[0]['low'] / lmax))
print('\nbar  fg(mean of beat %)  fgRatio  downbeat onset  downbeat low')
for b in bars:
    print(f"{b['bar']:3d}   {100*b['fg']:6.1f}            {b['fg_ratio']:.3f}    {b['down_onset']:.2f}          {b['low']:.2f}")
json.dump(dict(rows=rows, bars=bars, beat=beat_s), open(os.path.join(HERE, 'analysis.json'), 'w'), indent=1)

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(3, 1, figsize=(18, 10), sharex=True)
    D = librosa.amplitude_to_db(S_fg[:, sl], ref=np.max)
    ax[0].imshow(D[:400], origin='lower', aspect='auto', extent=[0, N / SR, 0, freqs[399]], cmap='magma', vmin=-60)
    ax[0].set_title('foreground (vocal-ish) spectrogram')
    D2 = librosa.amplitude_to_db(S[:, sl], ref=np.max)
    ax[1].imshow(D2[:400], origin='lower', aspect='auto', extent=[0, N / SR, 0, freqs[399]], cmap='magma', vmin=-60)
    ax[1].set_title('full mix')
    ax[2].plot(t, fg / fg.max(), label='fg energy'); ax[2].plot(t, onset / onset.max(), label='onset', alpha=0.6)
    ax[2].legend()
    for a in ax:
        for b in range(BEATS + 1):
            a.axvline(b * beat_s, color='w' if a is not ax[2] else 'k', lw=1.2 if b % 4 == 0 else 0.3, alpha=0.7)
    for k in range(12):
        ax[2].text(k * 4 * beat_s + 0.05, 1.02, f'bar {k}', fontsize=9)
    plt.tight_layout(); plt.savefig(os.path.join(HERE, 'analysis.png'), dpi=80)
except Exception as e:
    print('no plot', e)
