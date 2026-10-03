// node tree.js ref/dom-1920x1080.html > ref/contact-tree-1920.txt — indented tag/class outline of their header + contact section
const h = require('fs').readFileSync(process.argv[2], 'utf8');
let s = h.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/<video[\s\S]*?<\/video>/g, '<video/>')
    .replace(/ (srcset|sizes|src|style|aria-[a-z]+|data-swup[a-z-]*|loading|decoding|width|height|alt|target|rel)="[^"]*"/g, '');
let d = 0, out = '';
for (const m of s.matchAll(/<(\/?)([a-z0-9]+)([^>]*?)(\/?)>|([^<]+)/g)) {
    if (m[5]) { const t = m[5].trim(); if (t) out += '  '.repeat(d) + '"' + t.slice(0, 60) + '"\n'; continue; }
    if (m[1]) { d--; continue; }
    out += '  '.repeat(d) + '<' + m[2] + m[3].replace(/\s+/g, ' ').slice(0, 330) + '>\n';
    if (!m[4] && !['img', 'input', 'br', 'svg', 'video', 'source', 'path', 'meta', 'link'].includes(m[2])) d++;
}
process.stdout.write(out);
