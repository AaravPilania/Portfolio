# python scratch/calendar/v12/side-by-side.py -> side-by-side.png: lamalama.com/contact (1920, settled) over ours (1920,
# default and button hover), with the shared 12-column grid and the anchor lines drawn on both.
from PIL import Image, ImageDraw
from pathlib import Path

here = Path(__file__).parent
ll = Image.open(here.parent.parent / 'lamalama-contact' / 'shots' / 'd-A-settled.png').convert('RGB').resize((1920, 1080))
us = Image.open(here / '1920-c-hover-start.png').convert('RGB')
W, H = 960, 540
pad, gap = 24, 24
col = (1920 - 2 * 32 - 11 * 24) / 12


def grid(im):
    im = im.resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(im, 'RGBA')
    for k in (0, 5):
        x = (32 + k * (col + 24)) / 2
        d.line([(x, 0), (x, H)], fill=(255, 0, 140, 170), width=1)
    return im


out = Image.new('RGB', (W * 2 + 3 * pad, H + 2 * pad + 28), (14, 14, 14))
d = ImageDraw.Draw(out)
for i, (im, name) in enumerate([(ll, 'lamalama.com/contact'), (us, 'aarav / contact.html v12')]):
    x = pad + i * (W + pad)
    out.paste(grid(im), (x, pad + 28))
    d.text((x, pad + 6), name.upper() + '   magenta: column 1 and column 6 of 12', fill=(230, 230, 230))
out.save(here / 'side-by-side.png')
print('ok')
