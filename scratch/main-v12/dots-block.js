    // Slide 04's own dots set the headline. The services backdrop (backdrop_theme's section shader) dissolves bottom-up
    // through a 4x4 ordered dither in every 8px cell, offset by a value-noise field; the same maths gives the exact scroll
    // position at which each 2px dot of the lower half winks out, and at that instant a dot of its colour and size leaves
    // that spot and falls to a point of the title's glyphs. The lit dots are read off the backdrop canvas once, just before
    // the wipe begins. Dots beyond the glyph count pour in with the rest and dissolve as they land; the real text takes
    // over at the end so the words finish crisp.
    const dotsCv = sec.querySelector('.wt-dots');
    const svc = document.querySelector('.ll-section--services');
    const D_GAP = 0.2, D_DROP = 0.12, D_LAND = 0.86, D_TYPE = 0.88, D_MAX = 40000;
    // Dither rank of each sub-dot, indexed by its (x, y) slot in the cell as drawLLLogo numbers them
    const BAYER = [0, 13, 6, 10, 5, 14, 2, 15, 1, 8, 12, 9, 7, 4, 11, 3];
    const INK3 = [0.957, 0.949, 0.918], SUN3 = [1, 0.929, 0.161];
    // The flight is evaluated per vertex from static attributes, so a frame is a handful of uniforms and one draw
    const dgl = dotsCv && !STATIC ? dotsCv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false }) : null;
    const dctx = dotsCv && !STATIC && !dgl ? dotsCv.getContext('2d') : null;
    let tg = null, src = null, dots = null, dotsP = NaN, dotsShown = false, gp = null, snapArmed = true, bp = -1, svcB = 1e5;

    const VS = `attribute vec4 a0; attribute vec4 a1; attribute vec4 a2;
uniform float uP, uTop, uFade, uGrow, uDpr; uniform vec2 uRes; uniform vec3 uInk, uSun;
varying vec4 vC;
void main() {
    float t = clamp((uP - a1.x) / (a1.y - a1.x), 0.0, 1.0);
    float e = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(2.0 - 2.0 * t, 3.0) / 2.0;
    float w = sin(3.14159265 * t);
    vec2 d = vec2(a0.z, uTop + a0.w) - a0.xy;
    vec2 p = a0.xy + d * e + vec2(-d.y, d.x) / max(length(d), 1.0) * a1.z * w + vec2(0.0, a1.w * w);
    float keep = step(1.5, a2.w);
    vec3 ink = mix(uInk, uSun, a2.w - 2.0 * keep);
    gl_PointSize = (2.0 + uGrow * keep) * uDpr;
    gl_Position = uP < a1.x ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
    float a = uFade * mix(1.0 - smoothstep(0.55, 1.0, t), 1.0, keep);
    vC = vec4(mix(a2.rgb, ink, smoothstep(0.45, 1.0, t) * keep) * a, a);
}`;
    const FS = 'precision mediump float; varying vec4 vC; void main() { gl_FragColor = vC; }';

    function glInit() {
        const g = dgl, sh = (type, s) => { const o = g.createShader(type); g.shaderSource(o, s); g.compileShader(o); return o; };
        const pr = g.createProgram();
        g.attachShader(pr, sh(g.VERTEX_SHADER, VS));
        g.attachShader(pr, sh(g.FRAGMENT_SHADER, FS));
        g.linkProgram(pr);
        if (!g.getProgramParameter(pr, g.LINK_STATUS)) return null;
        const u = {};
        ['uP', 'uTop', 'uFade', 'uGrow', 'uDpr', 'uRes', 'uInk', 'uSun'].forEach((k) => { u[k] = g.getUniformLocation(pr, k); });
        return { pr, u, buf: g.createBuffer(), a0: g.getAttribLocation(pr, 'a0'), a1: g.getAttribLocation(pr, 'a1'), a2: g.getAttribLocation(pr, 'a2'), n: 0 };
    }

    function glUpload() {
        if (!dgl || !dots) return;
        if (!gp) gp = glInit();
        if (!gp) return;
        const g = dgl;
        g.bindBuffer(g.ARRAY_BUFFER, gp.buf);
        g.bufferData(g.ARRAY_BUFFER, dots.a, g.STATIC_DRAW);
        gp.n = dots.n;
    }

    function glyphTargets() {
        const sr = stage.getBoundingClientRect();
        const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        const gl = [];
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, fs = 0;
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const el = n.parentElement, cs = getComputedStyle(el);
            const font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
            const sun = !!el.closest('em');
            fs = Math.max(fs, parseFloat(cs.fontSize) || 0);
            const t = n.textContent;
            for (let i = 0; i < t.length; i++) {
                if (/\s/.test(t[i])) continue;
                range.setStart(n, i); range.setEnd(n, i + 1);
                const r = range.getBoundingClientRect();
                if (!r.width) continue;
                gl.push({ c: t[i], x: r.left - sr.left, y: r.top - sr.top, font, sun });
                x0 = Math.min(x0, r.left - sr.left); y0 = Math.min(y0, r.top - sr.top);
                x1 = Math.max(x1, r.right - sr.left); y1 = Math.max(y1, r.bottom - sr.top);
            }
        }
        if (!gl.length || !fs) return null;
        const pad = Math.ceil(fs * 0.2);
        const cw = Math.ceil(x1 - x0) + pad * 2, ch = Math.ceil(y1 - y0) + pad * 2;
        const off = mk(cw, ch), o = off.getContext('2d', { willReadFrequently: true });
        o.textBaseline = 'alphabetic';
        o.textAlign = 'left';
        for (const g of gl) {
            o.font = g.font;
            o.fillStyle = g.sun ? '#0f0' : '#f00';
            o.fillText(g.c, g.x - x0 + pad, g.y - y0 + pad + o.measureText(g.c).fontBoundingBoxAscent);
        }
        const px = o.getImageData(0, 0, cw, ch).data;
        // Even lattice steps keep the glyph dots on the backdrop's 2px quantisation
        let step = Math.min(6, Math.max(2, 2 * Math.round(fs / 76)));
        let out;
        for (;;) {
            out = [];
            for (let y = step >> 1; y < ch; y += step) {
                for (let x = step >> 1; x < cw; x += step) {
                    const i = (y * cw + x) * 4;
                    if (px[i + 3] < 140) continue;
                    out.push(x + x0 - pad, y + y0 - pad, px[i + 1] > px[i] ? 1 : 0);
                }
            }
            if (out.length / 3 <= 9000 || step >= 10) break;
            step += 2;
        }
        return { t: out, n: out.length / 3, step };
    }

    const fract = (v) => v - Math.floor(v);
    const hashN = (x, y) => fract(Math.sin(x * 12.98923445328 + y * 4.137643425614414) * 43758.54432453);
    function vnoise(x, y) {
        const ix = Math.floor(x), iy = Math.floor(y);
        let ux = x - ix, uy = y - iy;
        ux = ux * ux * (3 - 2 * ux); uy = uy * uy * (3 - 2 * uy);
        const a = hashN(ix, iy) + (hashN(ix + 1, iy) - hashN(ix, iy)) * ux;
        const b = hashN(ix, iy + 1) + (hashN(ix + 1, iy + 1) - hashN(ix, iy + 1)) * ux;
        const r = a + (b - a) * uy;
        return r * r;
    }
    // Exit progress at which sub-dot (i, j) (2px units, j counted up from the viewport's bottom) is switched off
    function releaseAt(i, j) {
        const xs = (i + 0.5) / (W / 2), ys = (j + 0.5) / (H / 2);
        const R = ys * 0.7 + 0.15 + 0.15 * 0.5 * vnoise(xs * 8, ys * 8);
        const rank = BAYER[(((j & 3) + 1) & 3) * 4 + (((i & 3) + 2) & 3)];
        return R * (1 - D_GAP) + D_GAP * (0.5 - Math.sin(Math.asin(1 - (2 * rank) / 16) / 3));
    }

    // Lit 2px dots of the lower half of the backdrop as it stands before the wipe
    function snapshot() {
        const bc = document.querySelector('canvas.js-canvas');
        if (!bc || !bc.width || !bc.height) return false;
        const hh = Math.ceil(H / 2) + 2, k = bc.height / H;
        let d;
        try {
            const c = mk(W, hh), g = c.getContext('2d', { willReadFrequently: true });
            g.drawImage(bc, 0, (H - hh) * k, W * k, hh * k, 0, 0, W, hh);
            d = g.getImageData(0, 0, W, hh).data;
        } catch (e) { return false; }
        const cols = Math.floor(W / 2), rows = Math.floor(H / 4);
        const xs = [], ys = [], cs = [], rs = [];
        for (let j = 0; j < rows; j++) {
            const py = H - 2 * j - 1 - (H - hh);
            if (py < 0 || py >= hh) continue;
            for (let i = 0; i < cols; i++) {
                const o = (py * W + 2 * i) * 4;
                if (d[o] + d[o + 1] + d[o + 2] < 36) continue;
                xs.push(2 * i + 1); ys.push(H - 2 * j - 1); cs.push(d[o], d[o + 1], d[o + 2]); rs.push(releaseAt(i, j));
            }
        }
        if (xs.length < 64) return false;
        src = { n: xs.length, x: xs, y: ys, c: cs, r: rs };
        assemble();
        return true;
    }

    function assemble() {
        dots = null;
        if (!tg || !src) { title.style.opacity = ''; return; }
        const r = rng(7331), nS = src.n, n = Math.min(tg.n, nS), total = Math.min(nS, D_MAX);
        const idx = new Uint32Array(nS);
        for (let i = 0; i < nS; i++) idx[i] = i;
        for (let i = 0; i < total; i++) { const j = i + Math.floor(r() * (nS - i)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
        // Landing dots pair with glyph points in x order, so the fall reads as a downpour rather than a criss-cross
        const land = Array.from(idx.subarray(0, n)).sort((p, q) => src.x[p] - src.x[q]);
        const tix = [];
        for (let k = 0; k < n; k++) tix.push(Math.floor((k * tg.n) / n));
        tix.sort((p, q) => tg.t[p * 3] - tg.t[q * 3]);
        const kOff = stTop - svcB, a = new Float32Array(total * 12);
        let w = 0, r0 = 1;
        const put = (s, ti, keep) => {
            const sx = src.x[s], sy = src.y[s], tx = tg.t[ti * 3], ty = tg.t[ti * 3 + 1], rel = src.r[s];
            const drop = H * D_DROP * (0.5 + r());
            const meet = 1 - (sy + drop - kOff - ty) / H;
            const o = w * 12;
            a[o] = sx; a[o + 1] = sy; a[o + 2] = tx; a[o + 3] = ty;
            a[o + 4] = rel; a[o + 5] = Math.max(rel + 0.1, Math.min(D_LAND, meet));
            a[o + 6] = (r() - 0.5) * 0.2 * Math.hypot(tx - sx, drop);
            a[o + 7] = H * 0.05 * r();
            a[o + 8] = src.c[s * 3] / 255; a[o + 9] = src.c[s * 3 + 1] / 255; a[o + 10] = src.c[s * 3 + 2] / 255;
            a[o + 11] = tg.t[ti * 3 + 2] + (keep ? 2 : 0);
            r0 = Math.min(r0, rel);
            w++;
        };
        for (let k = n; k < total; k++) put(idx[k], tix[Math.floor(r() * n)], false);
        for (let k = 0; k < n; k++) put(land[k], tix[k], true);
        dots = { n: total, land: n, a, step: tg.step, r0 };
        glUpload();
        dotsP = NaN;
        dirty = true;
    }

    function buildDots() {
        if (!dctx && !dgl) return;
        tg = glyphTargets();
        src = null; dots = null; snapArmed = true;
        if (!tg || !tg.n) { tg = null; sec.classList.remove('wt--dots'); title.style.opacity = ''; return; }
        sec.classList.add('wt--dots');
    }

    function drawDots() {
        if (tg && snapArmed && visible && bp > -0.3 && bp < 0.6 && snapshot()) snapArmed = false;
        if (bp < -0.45) snapArmed = true;
        if (!dots) {
            if (title.style.opacity !== '') title.style.opacity = '';
            return;
        }
        if (bp === dotsP && !dirty) return;
        dotsP = bp;
        const typeK = easeIO(lstep(D_TYPE, 1, bp));
        const op = typeK <= 0 ? '0' : typeK >= 1 ? '1' : typeK.toFixed(3);
        if (title.style.opacity !== op) title.style.opacity = op;
        const show = bp >= dots.r0 && typeK < 1;
        if (dgl) {
            if (!gp || !gp.n) return;
            const g = dgl;
            if (!show) {
                if (dotsShown) { g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT); dotsShown = false; }
                return;
            }
            dotsShown = true;
            g.viewport(0, 0, dotsCv.width, dotsCv.height);
            g.clearColor(0, 0, 0, 0);
            g.clear(g.COLOR_BUFFER_BIT);
            g.useProgram(gp.pr);
            g.bindBuffer(g.ARRAY_BUFFER, gp.buf);
            g.enableVertexAttribArray(gp.a0);
            g.enableVertexAttribArray(gp.a1);
            g.enableVertexAttribArray(gp.a2);
            g.vertexAttribPointer(gp.a0, 4, g.FLOAT, false, 48, 0);
            g.vertexAttribPointer(gp.a1, 4, g.FLOAT, false, 48, 16);
            g.vertexAttribPointer(gp.a2, 4, g.FLOAT, false, 48, 32);
            g.enable(g.BLEND);
            g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
            const u = gp.u;
            g.uniform1f(u.uP, bp);
            g.uniform1f(u.uTop, stageTopNow());
            g.uniform1f(u.uFade, 1 - typeK);
            g.uniform1f(u.uGrow, (dots.step * 0.92 - 2) * typeK);
            g.uniform1f(u.uDpr, dpr);
            g.uniform2f(u.uRes, W, H);
            g.uniform3fv(u.uInk, INK3);
            g.uniform3fv(u.uSun, SUN3);
            g.drawArrays(g.POINTS, 0, gp.n);
            return;
        }
        if (!show) {
            if (dotsShown) { dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.clearRect(0, 0, dotsCv.width, dotsCv.height); dotsShown = false; }
            return;
        }
        dotsShown = true;
        dctx.setTransform(1, 0, 0, 1, 0, 0);
        dctx.clearRect(0, 0, dotsCv.width, dotsCv.height);
        dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const a = dots.a, top = stageTopNow(), sz = 2 + (dots.step * 0.92 - 2) * typeK;
        const ink = new Path2D(), sun = new Path2D();
        for (let i = dots.n - dots.land; i < dots.n; i++) {
            const o = i * 12;
            if (bp < a[o + 4]) continue;
            const t = clamp01((bp - a[o + 4]) / (a[o + 5] - a[o + 4])), e = easeIO(t), w = Math.sin(Math.PI * t);
            const x = a[o] + (a[o + 2] - a[o]) * e, y = a[o + 1] + (top + a[o + 3] - a[o + 1]) * e + a[o + 7] * w;
            (a[o + 11] > 2.5 ? sun : ink).rect(x - sz / 2, y - sz / 2, sz, sz);
        }
        dctx.globalAlpha = 1 - typeK;
        dctx.fillStyle = INK; dctx.fill(ink);
        dctx.fillStyle = SUN; dctx.fill(sun);
        dctx.globalAlpha = 1;
    }

