# python scratch/main-v12/sig_reorder.py -> moves .sig-hero to the end of the footer (signature is the last element)
import os, re
IDX = os.path.join(os.path.dirname(__file__), '..', '..', 'final', 'index.html')
h = open(IDX, encoding='utf8').read()
m = re.search(r'(    <div class="sig-hero">.*?\n    </div>\r?\n)(    <div class="sig-hello">.*?)(</footer>)', h, re.S)
if m:
    h = h[:m.start()] + m.group(2) + m.group(1) + m.group(3) + h[m.end():]
    open(IDX, 'w', encoding='utf8', newline='').write(h)
L = h.split('\n')
i = next(k for k, s in enumerate(L) if 'class="sig-footer"' in s)
for k in range(i, i + 23): print(k + 1, L[k][:130])
