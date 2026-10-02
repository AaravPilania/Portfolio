"""Beat grid of the full track and a ranked list of whole-bar loop candidates (start/end on downbeats)."""
import numpy as np, librosa, subprocess, sys, json
SRC = r'C:\Users\gaura\Downloads\Alice Deejay - Better Off Alone (Official Video) - (320 Kbps).mp3'
SR = 44100
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                     capture_output=True, check=True).stdout
st = np.frombuffer(raw, np.float32).reshape(-1, 2)
np.save(r'C:\cal4work\track.npy', st)
y = st.mean(1)
print('duration %.2f s' % (len(y) / SR))

hop = 256
onset = librosa.onset.onset_strength(y=y, sr=SR, hop_length=hop, aggregate=np.median)
tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=SR, hop_length=hop, start_bpm=137, tightness=400)
bt = librosa.frames_to_time(beats, sr=SR, hop_length=hop)
# refine: least-squares line through the beat times of the steady middle
k = np.arange(len(bt))
mid = (bt > 20) & (bt < len(y) / SR - 20)
p = np.polyfit(k[mid], bt[mid], 1)
print('librosa tempo', tempo, 'fit period %.5f s -> %.3f BPM' % (p[0], 60 / p[0]))
res = bt[mid] - np.polyval(p, k[mid])
print('beat residual rms %.4f s, max %.4f' % (np.sqrt((res ** 2).mean()), np.abs(res).max()))

# kick-weighted onset for downbeat phase: low band energy flux
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
low = S[freqs < 150].sum(0)
flux = np.maximum(0, np.diff(low, prepend=low[0]))
T = librosa.frames_to_time(np.arange(len(flux)), sr=SR, hop_length=hop)
json.dump({'period': p[0], 'offset': p[1], 'beats': bt.tolist()}, open(r'C:\cal4work\beats.json', 'w'))

chroma = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=hop)
mel = librosa.power_to_db(librosa.feature.melspectrogram(y=y, sr=SR, hop_length=hop, n_mels=64))
np.savez(r'C:\cal4work\feat.npz', chroma=chroma, mel=mel, T=T, flux=flux)
print('features', chroma.shape, mel.shape)
