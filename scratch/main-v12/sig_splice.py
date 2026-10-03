# python scratch/main-v12/sig_splice.py -> writes sig-v13.json's pen strokes into final/index.html's inline .sig-svg
# (one polyline per stroke, in pen order; data-e = whether its start / end is a pen lift that tapers)
import json, os, re
HERE = os.path.dirname(__file__)
IDX = os.path.join(HERE, '..', '..', 'final', 'index.html')
st = json.load(open(os.path.join(HERE, 'sig-v13.json')))
fmt = lambda v: ('%.1f' % v).rstrip('0').rstrip('.')
SW = 20
lines = ''.join('<polyline data-e="%d%d" points="%s"/>' % (e[0], e[1], ' '.join(fmt(x) + ',' + fmt(y) for x, y in s))
                for s, e in zip(st['strokes'], st['ends']))
svg = ('<svg class="sig-svg" viewBox="0 0 %d %d" aria-hidden="true" focusable="false" data-stroke="%s">' % (st['vw'], st['vh'], SW)) + lines + '</svg>'
h = open(IDX, encoding='utf8').read()
h2, n = re.subn(r'<svg class="sig-svg".*?</svg>', lambda m: svg, h, count=1, flags=re.S)
assert n == 1
open(IDX, 'w', encoding='utf8', newline='').write(h2)
print('spliced', len(st['strokes']), 'strokes', len(svg), 'chars')
