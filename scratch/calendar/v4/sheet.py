"""Side-by-side sheets: reel cells vs ours (overlap), source vs ours (continuation). Usage: python sheet.py overlap|cont|path"""
import numpy as np, json, sys, os
from PIL import Image, ImageDraw
W = r'C:\cal4work'; HERE = os.path.dirname(os.path.abspath(__file__))
PAL = ['#53b44b', '#0b8043', '#616161', '#fbfbfb', '#a6c1f6', '#7986cb', '#5482eb', '#3f51b5', '#039be5',
       '#d50000', '#f4511e', '#f6bf26', '#e67c73']
rgb = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in PAL], np.uint8)
cal = json.load(open(W + r'\calib.json')); match = {int(k): v[0] for k, v in cal['match'].items()}
maps = np.load(W + r'\reel_maps.npy'); ours = np.load(W + r'\ours.npz')
orig = np.load(W + r'\orig480.npy', mmap_mode='r')
x0, y0, sx, sy = cal['grid']
crop = (int(round(x0)), int(round(y0)), int(round(x0 + 49 * sx)), int(round(y0 + 40 * sy)))

def cellimg(m, s=6):
    img = rgb[m].repeat(s, 0).repeat(s, 1).copy()
    img[::s, :] = (172, 246, 192); img[:, ::s] = (172, 246, 192)
    return Image.fromarray(img)

mode = sys.argv[1]
rows = []
if mode == 'overlap':
    for n in [int(v) for v in (sys.argv[2] if len(sys.argv) > 2 else '90,130,170,210,240,262').split(',')]:
        i = match[n]
        a, b = cellimg(maps[n]), cellimg(ours[f'f{i}'])
        src = Image.fromarray(np.asarray(orig[i])).crop(crop).resize(a.size)
        agree = (maps[n] == ours[f'f{i}']).mean()
        rows.append(([src, a, b], f'reel n{n} = orig {i}   source | reel | ours   cells agree {agree * 100:.1f}%'))
else:
    for i in [int(v) for v in sys.argv[2].split(',')]:
        b = cellimg(ours[f'f{i}'])
        src = Image.fromarray(np.asarray(orig[i])).crop(crop).resize(b.size)
        rows.append(([src, b], f'orig {i} (t={i / 25:.2f}s)   source | ours'))
tw = sum(t.width for t in rows[0][0]) + 8 * len(rows[0][0])
th = rows[0][0][0].height + 18
sheet = Image.new('RGB', (tw, th * len(rows)), 'white'); d = ImageDraw.Draw(sheet)
for k, (tiles, lab) in enumerate(rows):
    x = 0
    for t in tiles: sheet.paste(t, (x, k * th + 18)); x += t.width + 8
    d.text((4, k * th + 3), lab, fill=(0, 0, 0))
out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(HERE, 'compare', f'{mode}.png')
sheet.save(out); print(out)
