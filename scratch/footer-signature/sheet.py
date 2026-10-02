# python scratch/footer-signature/sheet.py OUT.png COLS THUMB_W file1.png file2.png ... -> labelled contact sheet
import sys, os
from PIL import Image, ImageDraw
out, cols, tw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
files = sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in files]
th = round(ims[0].height * tw / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + 8) + 8, rows * (th + 26) + 8), (40, 40, 44))
d = ImageDraw.Draw(sheet)
for i, (im, f) in enumerate(zip(ims, files)):
    x, y = 8 + (i % cols) * (tw + 8), 8 + (i // cols) * (th + 26)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + 18))
    d.text((x, y + 2), os.path.basename(f), fill=(255, 237, 41))
sheet.save(out)
print(out, sheet.size)
