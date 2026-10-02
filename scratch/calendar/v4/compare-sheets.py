"""v4/compare: join.png (reel's last frames -> our first continuation frames, with sources) and ending.png (source
around the end of the shot vs the page's sweep stills at 1920)."""
import numpy as np, json, os
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); W = r'C:\cal4work'
PAL = ['#53b44b', '#0b8043', '#616161', '#fbfbfb', '#a6c1f6', '#7986cb', '#5482eb', '#3f51b5', '#039be5',
       '#d50000', '#f4511e', '#f6bf26', '#e67c73']
rgb = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in PAL], np.uint8)
cal = json.load(open(W + r'\calib.json')); match = {int(k): v[0] for k, v in cal['match'].items()}
maps = np.load(W + r'\reel_maps.npy'); ours = np.load(W + r'\ours.npz'); orig = np.load(W + r'\orig480.npy', mmap_mode='r')
x0, y0, sx, sy = cal['grid']; crop = (int(round(x0)), int(round(y0)), int(round(x0 + 49 * sx)), int(round(y0 + 40 * sy)))

def cellimg(m, s=5):
    img = rgb[m].repeat(s, 0).repeat(s, 1).copy(); img[::s, :] = (172, 246, 192); img[:, ::s] = (172, 246, 192)
    return Image.fromarray(img)

def src(i, size): return Image.fromarray(np.asarray(orig[i])).crop(crop).resize(size)

def grid(cols, out, title):
    tw = max(sum(t.width + 6 for t, _ in col) for col in [cols]) if False else None
    cw = max(t.width for col in cols for t, _ in col); ch = [max(t.height for t, _ in row) for row in zip(*cols)]
    S = Image.new('RGB', ((cw + 6) * len(cols), sum(h + 16 for h in ch) + 20), 'white'); d = ImageDraw.Draw(S)
    d.text((4, 4), title, fill=0)
    for c, col in enumerate(cols):
        y = 20
        for r, (t, lab) in enumerate(col):
            d.text((c * (cw + 6) + 2, y + 2), lab, fill=0); S.paste(t, (c * (cw + 6), y + 14)); y += ch[r] + 16
    S.save(out); print(out)

cols = []
for n in (264, 265, 266, 267):
    a = cellimg(maps[n]); cols.append([(src(match[n], a.size), f'source orig {match[n]}'), (a, f'reel n{n} (data f{n - 66})')])
for k, i in enumerate((797, 798, 799, 800)):
    a = cellimg(ours[f'f{i}']); cols.append([(src(i, a.size), f'source orig {i}'), (a, f'ours orig {i} (data f{202 + k})')])
grid(cols, os.path.join(HERE, 'compare', 'join.png'), 'JOIN: the reel ends at n267 (= orig 796); the continuation picks up at orig 797 on the next 1/30 s step')

cols = []
st = os.path.join(HERE, 'stills')
pg = lambda k: Image.open(os.path.join(st, f'k-1920-{k}.png')).crop((560, 60, 1260, 1080)).resize((245, 357))
for i, lab, k in ((962, 'sweep step 1 (frame 402)', 11), (970, 'sweep step 4 (frame 410)', 12), (981, 'sweep step 8 (frame 423)', 13), (988, 'outro: week grid', 14)):
    a = cellimg(ours[f'f{i}']) if i <= 981 else None
    s = src(i, (245, 200))
    col = [(s, f'source orig {i}')]
    col.append((a.resize((245, 200)) if a is not None else Image.new('RGB', (245, 200), (83, 180, 75)), f'ours orig {i}' if a is not None else 'not used (occluded)'))
    col.append((pg(k), 'page 1920: ' + lab))
    cols.append(col)
grid(cols, os.path.join(HERE, 'compare', 'ending.png'), 'ENDING: the white-shirt dancer walks in from the right at orig ~984; the page sweeps the kid off right to left over 2 beats')
