# python scratch/eyes/verify-map.py <screenshot> : warps frame.png onto the viewport with the shader's centred cover
# (u_scale 1), blurs both to tone, and phase-correlates them over the face region. A ~0 shift means the mapping holds.
import sys, cv2, numpy as np
shot = cv2.cvtColor(cv2.imread(sys.argv[1]), cv2.COLOR_BGR2GRAY).astype(np.float32)
src = cv2.cvtColor(cv2.imread('scratch/eyes/frame.png'), cv2.COLOR_BGR2GRAY).astype(np.float32)
H, W = shot.shape
c, i = W / H, 1440 / 1920
if c >= i:
    k = W / 1440
    ox, oy = 0, -(1920 * k - H) / 2
else:
    k = H / 1920
    ox, oy = -(1440 * k - W) / 2, 0
M = np.float32([[k, 0, ox], [0, k, oy]])
warp = cv2.warpAffine(src, M, (W, H))
sig = W / 160
a = cv2.GaussianBlur(shot, (0, 0), sig)
b = cv2.GaussianBlur(warp, (0, 0), sig)
# the face only: away from the yellow text, header and asterisk
x0, x1 = int(W * 0.33), int(W * 0.67)
y0, y1 = int(H * 0.08), int(H * 0.45)
R = int(W * 0.03)
tpl = b[y0:y1, x0:x1]
img = a[max(0, y0 - R):y1 + R, x0 - R:x1 + R]
res = cv2.matchTemplate(img, tpl, cv2.TM_CCOEFF_NORMED)
_, best, _, loc = cv2.minMaxLoc(res)
dx, dy = loc[0] - R, loc[1] - (y0 - max(0, y0 - R))
print('%dx%d render is offset from the mapping by dx=%d dy=%d px (ncc %.3f, search +-%d)' % (W, H, dx, dy, best, R))
for u, v in [(0.4549, 0.3552), (0.5667, 0.3615)]:
    print('  eye -> %.1f, %.1f' % (u * 1440 * k + ox, v * 1920 * k + oy))
