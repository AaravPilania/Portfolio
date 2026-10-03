// node svgs.js -> the arrow / plus / back-arrow SVGs from their captured DOM
const h = require('fs').readFileSync(require('path').join(__dirname, 'ref/dom-1920x1080.html'), 'utf8');
for (const k of ['js-arrow"', 'js-arrow-hover', 'js-plus', 'js-revert-to-contact-button']) {
    const i = h.indexOf(k), s = h.indexOf('<svg', i);
    console.log(k, h.slice(s, h.indexOf('</svg>', s) + 6).replace(/\s+/g, ' '));
}
