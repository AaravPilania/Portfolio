# python scratch/main-v12/sig_site_overlay.py -> sig-site-overlay.png: signature.png's ink (cyan) laid over the live
# render in sig-done.png, in the hero box the site reported (same frame as sig_trace.py: ink bbox + 1.5R, 1000 wide)
import json, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(__file__)
SRC = r'C:\Users\gaura\Downloads\signature.png'
R = 13.93
BOX = dict(x=322.796875, y=111.640625, w=1274.390625, h=925.203125)
st = json.load(open(os.path.join(HERE, 'sig-v13.json')))
VW, VH, SW = st['vw'], st['vh'], 20
ink = np.asarray(Image.open(SRC).convert('L')) < 128
ys, xs = np.nonzero(ink)
pad = R * 1.5
x0, y0, x1 = xs.min() - pad, ys.min() - pad, xs.max() + pad
k = 1000.0 / (x1 - x0)
shot = Image.open(os.path.join(HERE, 'sig-done.png')).convert('RGB')
sx = shot.width / 1920.0
scale = min(BOX['w'] / (VW + SW * 2), BOX['h'] / (VH + SW * 2))
ox = BOX['x'] + (BOX['w'] - VW * scale) / 2
oy = BOX['y'] + (BOX['h'] - VH * scale) / 2
f = k * scale * sx
src = Image.fromarray((ink * 255).astype(np.uint8)).resize((int(ink.shape[1] * f), int(ink.shape[0] * f)), Image.LANCZOS)
px, py = int(round((ox - x0 * k * scale) * sx)), int(round((oy - y0 * k * scale) * sx))
a = np.asarray(shot).astype(np.float32)
m = np.zeros(a.shape[:2], np.float32)
sa = np.asarray(src).astype(np.float32) / 255
h, w = sa.shape
y_0, x_0 = max(0, py), max(0, px)
y_1, x_1 = min(a.shape[0], py + h), min(a.shape[1], px + w)
m[y_0:y_1, x_0:x_1] = sa[y_0 - py:y_1 - py, x_0 - px:x_1 - px]
out = a * (1 - 0.55 * m[..., None]) + np.array([0, 220, 255], np.float32) * 0.55 * m[..., None]
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(os.path.join(HERE, 'sig-site-overlay.png'))
yel = (a[..., 0] > 150) & (a[..., 1] > 150) & (a[..., 2] < 120)
inb = m > 0.5
print('site px', shot.size, 'yellow', int(yel.sum()), 'source', int(inb.sum()),
      'IoU %.3f' % ((yel & inb).sum() / max(1, (yel | inb).sum())),
      'precision %.3f' % ((yel & inb).sum() / max(1, yel.sum())), 'recall %.3f' % ((yel & inb).sum() / max(1, inb.sum())))
