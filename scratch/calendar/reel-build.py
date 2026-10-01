"""Build final/data/calendar-dance.bin from the reel's own dance, which it already renders as calendar cells.

Each reel frame is read on its cell grid (49 sub-columns x 40 fifteen-minute slots inside the 616x488 card). Every pixel
of a cell's interior is classified to the nearest Google Calendar colour (the mint gap lines are ignored) and the cell
takes the majority. Reel frames are held, not blended, to stretch the reel's dance onto our 137 BPM timeline:
  reel n66-122 (coarse phase)  -> our beats 11-19
  reel n123-267 (fine phase)   -> our beats 19-37, then held through the outro steps
Output is GCD2 (see build-dance.js) at 49x40. PREVIEW=1 writes scratch/calendar/v3/reel/preview.png.
"""
import gzip, os, struct, subprocess, numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = r'C:\Users\gaura\Downloads\inspo.mp4'
OUT = os.environ.get('OUT', os.path.join(ROOT, 'final', 'data', 'calendar-dance.bin'))
X0, Y0, GW, GH = 52 + 22, 396 + 42, 594, 446
COLS, ROWS = 49, 40
BEAT, FPS = 60 / 137.01, 30
N = round(26.5 * BEAT * FPS)
F_FINE = (19 - 11) * BEAT * FPS
F_OUTRO = (37 - 11) * BEAT * FPS

PALETTE = ['#53b44b', '#0b8043', '#616161', '#fbfbfb', '#a6c1f6', '#7986cb', '#5482eb', '#3f51b5', '#039be5',
           '#d50000', '#f4511e', '#f6bf26', '#e67c73']
ANCHORS = {
    0: ['#53b44b', '#57b24b', '#59ac5a', '#48b848', '#68b858'],
    1: ['#0b8043', '#158047', '#087848', '#287848'],
    2: ['#616161', '#748596', '#686868', '#586858', '#685868'],
    3: ['#fbfbfb', '#f0f0f0'],
    4: ['#a6c1f6', '#a6cddc', '#a8b8f8', '#a8b8e8'],
    5: ['#7986cb', '#6584ca', '#7888c8'],
    6: ['#5482eb', '#5888e8'],
    7: ['#3f51b5', '#495697', '#3848b8', '#4858a8'],
    8: ['#039be5', '#30b8d0'],
    9: ['#d50000', '#c83030'],
    10: ['#f4511e', '#e87040'],
    11: ['#f6bf26', '#e8c040'],
    12: ['#e67c73', '#e09080'],
    -1: ['#9ae9a6', '#acf6c0', '#98d898', '#88c888', '#c8f0d0'],
}
hexrgb = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]
A_RGB = np.array([hexrgb(h) for k in ANCHORS for h in ANCHORS[k]], np.float32)
A_IDX = np.array([k for k in ANCHORS for _ in ANCHORS[k]], np.int16)

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-vf', f'crop={GW}:{GH}:{X0}:{Y0}', '-f', 'rawvideo',
                      '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
video = np.frombuffer(raw, np.uint8).reshape(-1, GH, GW, 3)
pw, ph = GW / COLS, GH / ROWS
x_edges = [int(round(c * pw)) for c in range(COLS + 1)]
y_edges = [int(round(r * ph)) for r in range(ROWS + 1)]


def cells(n):
    img = video[n].astype(np.float32)
    d = ((img[:, :, None, :] - A_RGB[None, None]) ** 2).sum(-1)
    cls = A_IDX[d.argmin(-1)]
    out = np.zeros((ROWS, COLS), np.uint8)
    for r in range(ROWS):
        for c in range(COLS):
            p = cls[y_edges[r] + 2:y_edges[r + 1] - 1, x_edges[c] + 2:x_edges[c + 1] - 2].ravel()
            p = p[p >= 0]
            if len(p) < 6:
                continue
            out[r, c] = np.bincount(p, minlength=len(PALETTE)).argmax()
    return out


def reel_frame(f):
    if f < F_FINE:
        return 66 + min(56, int(f * 57 / F_FINE))
    return 123 + min(144, int((f - F_FINE) * 145 / (F_OUTRO - F_FINE)))


cache = {}
frames = []
for f in range(N):
    n = reel_frame(f)
    if n not in cache:
        cache[n] = cells(n)
    frames.append(cache[n])
print(f'{N} frames from {len(cache)} reel frames ({min(cache)}-{max(cache)})')

head = b'GCD2' + struct.pack('<BHHHHB', 2, COLS, ROWS, N, FPS * 100, len(PALETTE))
pal = bytes(sum((hexrgb(h) for h in PALETTE), []))
body = bytearray()
prev = None
for q in frames:
    flat = q.ravel()
    body += (flat ^ prev).tobytes() if prev is not None else flat.tobytes()
    prev = flat
gz = gzip.compress(head + pal + bytes(body), 9)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'wb').write(gz)
print(f'{COLS}x{ROWS}, gzip {len(gz)} B -> {OUT}')

if os.environ.get('PREVIEW'):
    from PIL import Image
    rgb = np.array([hexrgb(h) for h in PALETTE], np.uint8)
    picks = [int(x) for x in os.environ.get('PICKS', '90,150,200,264').split(',')]
    tiles = []
    for n in picks:
        q = cells(n)
        ours = Image.fromarray(rgb[q]).resize((GW, GH), Image.NEAREST)
        src = Image.fromarray(video[n])
        tile = Image.new('RGB', (GW * 2 + 8, GH), 'white')
        tile.paste(src, (0, 0)); tile.paste(ours, (GW + 8, 0))
        tiles.append(tile)
    sheet = Image.new('RGB', (tiles[0].width, (GH + 8) * len(tiles)), 'white')
    for i, t in enumerate(tiles):
        sheet.paste(t, (0, i * (GH + 8)))
    sheet.save(os.path.join(ROOT, 'scratch', 'calendar', 'v3', 'reel', 'preview.png'))
