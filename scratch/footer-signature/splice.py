# python scratch/footer-signature/splice.py -> drops slide 05's veil and inserts the footer after it in final/index.html
p = 'final/index.html'
s = open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'
veil = '        <div class="wt-veil" aria-hidden="true"></div>' + nl
if veil in s:
    s = s.replace(veil, '')
if 'class="sig-footer"' not in s:
    f = open('scratch/footer-signature/footer.html', encoding='utf-8').read()
    f = f.replace('@@SVG@@', open('scratch/footer-signature/sig-svg.html', encoding='utf-8').read()).rstrip('\n')
    f = f.replace('\n', nl)
    anchor = '</ul>' + nl + '    </div>' + nl + '</section>'
    assert s.count(anchor) == 1
    s = s.replace(anchor, anchor + f)
css = '    <link rel="stylesheet" href="/css/work-together.css" media="all" />' + nl
if 'footer-signature.css' not in s:
    assert s.count(css) == 1
    s = s.replace(css, css + css.replace('work-together', 'footer-signature'))
js = '    <script src="/js/work-together.js"></script>' + nl
if 'footer-signature.js' not in s:
    assert s.count(js) == 1
    s = s.replace(js, js + js.replace('work-together', 'footer-signature'))
open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok', repr(nl))
