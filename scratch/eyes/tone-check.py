# python scratch/eyes/tone-check.py shot.png : per 8px grid cell, the page's dot-grid brightness against the video
# frame's luminance under the backdrop's cover mapping. Prints the fit and the cells near the eyes; writes a side by
# side of the expected tone (frame, cell-averaged) and the rendered tone around the eyes.
import sys, cv2, numpy as np
shot = cv2.cvtColor(cv2.imread(sys.argv[1]), cv2.COLOR_BGR2GRAY).astype(np.float32)
src = cv2.cvtColor(cv2.imread('scratch/eyes/frame.png'), cv2.COLOR_BGR2GRAY).astype(np.float32)
H, W = shot.shape
k = W / 1440; oy = -(1920 * k - H) / 2
warp = cv2.warpAffine(src, np.float32([[k, 0, 0], [0, k, oy]]), (W, H))
C = 8
cs = cv2.resize(shot, (W // C, H // C), interpolation=cv2.INTER_AREA)
cw = cv2.resize(warp, (W // C, H // C), interpolation=cv2.INTER_AREA)
# face area only, away from text/header
m = np.zeros_like(cs, bool); m[12:50, 80:150] = True
x, y = cw[m], cs[m]
A = np.vstack([x, np.ones_like(x)]).T
a, b = np.linalg.lstsq(A, y, rcond=None)[0]
print('render = %.3f * luma + %.2f   corr %.3f' % (a, b, np.corrcoef(x, y)[0, 1]))
for name, (ex, ey) in {'eye L': (873, 169), 'eye R': (1088, 185)}.items():
    gx, gy = ex // C, ey // C
    pl = cw[gy - 3:gy + 4, gx - 5:gx + 6]; pr = cs[gy - 3:gy + 4, gx - 5:gx + 6]
    print(name, 'luma %.1f -> expected %.1f, rendered %.1f' % (pl.mean(), a * pl.mean() + b, pr.mean()))
X0, X1, Y0, Y1 = 760, 1200, 80, 280
exp = np.clip(a * warp + b, 0, 255)
row = np.concatenate([cv2.resize(cv2.resize(exp[Y0:Y1, X0:X1], None, fx=1 / C, fy=1 / C, interpolation=cv2.INTER_AREA), (X1 - X0, Y1 - Y0), interpolation=cv2.INTER_NEAREST),
                      cv2.resize(cv2.resize(shot[Y0:Y1, X0:X1], None, fx=1 / C, fy=1 / C, interpolation=cv2.INTER_AREA), (X1 - X0, Y1 - Y0), interpolation=cv2.INTER_NEAREST),
                      warp[Y0:Y1, X0:X1] * 0.3], axis=1)
cv2.imwrite('scratch/eyes/tone-check.png', cv2.resize(cv2.normalize(row, None, 0, 255, cv2.NORM_MINMAX), None, fx=1.5, fy=1.5, interpolation=cv2.INTER_NEAREST))
