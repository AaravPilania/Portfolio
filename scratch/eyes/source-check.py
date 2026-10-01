# python scratch/eyes/source-check.py [video.mp4] : frame 0 of the video vs the source PNG put through the same
# cover-scale + centre crop (lanczos). Prints PSNR over the whole frame and the eye region, writes the eye crops
# side by side (source | video | 4x abs diff) to scratch/eyes/source-vs-video.png
import sys, subprocess, cv2, numpy as np
SRC = r'C:\Users\gaura\Downloads\Gemini_Generated_Image_rlbcfjrlbcfjrlbc.png'
vid = sys.argv[1] if len(sys.argv) > 1 else 'final/videos/services-bg.mp4'
out = sys.argv[2] if len(sys.argv) > 2 else 'scratch/eyes/source-vs-video.png'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', vid, '-frames:v', '1', 'scratch/eyes/_f0.png'], check=True)
f0 = cv2.imread('scratch/eyes/_f0.png').astype(np.float32)
src = cv2.imread(SRC)
h, w = src.shape[:2]
k = max(1440 / w, 1920 / h)
sw, sh = round(w * k), round(h * k)
big = cv2.resize(src, (sw, sh), interpolation=cv2.INTER_LANCZOS4)
x0, y0 = (sw - 1440) // 2, (sh - 1920) // 2
ref = big[y0:y0 + 1920, x0:x0 + 1440].astype(np.float32)
psnr = lambda a, b: 10 * np.log10(255 ** 2 / max(1e-9, np.mean((a - b) ** 2)))
E = (slice(610, 770), slice(570, 900))
print('crop offset', x0, y0, 'scale %.5f' % k)
print('PSNR whole %.2f dB, eyes %.2f dB' % (psnr(ref, f0), psnr(ref[E], f0[E])))
# chroma detail lost: compare Cr/Cb high-frequency energy in the eye box
def hf(img):
    ycc = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_BGR2YCrCb).astype(np.float32)
    return [float(np.abs(cv2.Laplacian(ycc[..., c], cv2.CV_32F)).mean()) for c in range(3)]
print('eye-box laplacian Y/Cr/Cb  source', ['%.2f' % v for v in hf(ref[E])], ' video', ['%.2f' % v for v in hf(f0[E])])
a, b = ref[E], f0[E]
d = np.clip(np.abs(a - b) * 4, 0, 255)
row = np.concatenate([a, b, d], axis=1).astype(np.uint8)
cv2.imwrite(out, cv2.resize(row, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST))
