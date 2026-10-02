# python scratch/footer-signature/svg.py -> sig-svg.html, the inline <svg> the footer ships (and footer-signature.js reads)
import json
D = json.load(open('scratch/footer-signature/sig-paths.json'))
def f(v): return ('%.1f' % v).rstrip('0').rstrip('.')
lines = []
for s in D['strokes']:
    pts = ' '.join(f(s[i]) + ',' + f(s[i + 1]) for i in range(0, len(s), 2))
    lines.append('<polyline points="%s"/>' % pts)
h = round(D['h'])
svg = '<svg class="sig-svg" viewBox="0 0 1000 %d" aria-hidden="true" focusable="false" data-stroke="%s">%s</svg>' % (h, f(D['width']), ''.join(lines))
open('scratch/footer-signature/sig-svg.html', 'w').write(svg)
print(h, D['width'], len(svg))
