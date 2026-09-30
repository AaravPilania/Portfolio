(() => {
    const Lab = window.CursorLab;
    const INK_RGB = '18,19,22';
    const PAPER_RGB = '244,242,234';
    const SIG_RGB = '255,237,41';
    const TAU = Math.PI * 2;

    const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
    const BAYER8 = [
        0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
        12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
        3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
        15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21
    ].map(v => (v + 0.5) / 64);

    const fgRGB = z => (z === 'paper' ? INK_RGB : PAPER_RGB);
    const hotRGB = z => (z === 'paper' ? INK_RGB : SIG_RGB);
    const rgba = (rgb, a) => 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const damp = (cur, target, dt, rate) => cur + (target - cur) * (1 - Math.exp(-dt * rate));
    const MONO = "500 10px 'IBM Plex Mono', ui-monospace, monospace";

    function springStep(s, target, dt, k, d) {
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
            s.v += ((target - s.p) * k - s.v * d) * h;
            s.p += s.v * h;
        }
    }
    const sp = p => ({ p, v: 0 });

    /* 01 */
    Lab.register((() => {
        const C = 16;
        const cells = new Map();
        let waves = [];
        let lcx = null, lcy = null;

        function light(cx, cy, v) {
            const key = cx * 8192 + cy;
            const c = cells.get(key);
            if (c) { if (c.v < v) c.v = v; }
            else cells.set(key, { cx, cy, v });
        }

        function stroke(x0, y0, x1, y1, fat) {
            let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
            const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
            let err = dx + dy, n = 0;
            for (;;) {
                light(x0, y0, 1);
                if (fat) { light(x0 + 1, y0, 0.55); light(x0 - 1, y0, 0.55); light(x0, y0 + 1, 0.55); light(x0, y0 - 1, 0.55); }
                if ((x0 === x1 && y0 === y1) || ++n > 96) break;
                const e2 = 2 * err;
                if (e2 >= dy) { err += dy; x0 += sx; }
                if (e2 <= dx) { err += dx; y0 += sy; }
            }
        }

        return {
            id: 'wake', index: 1,
            name: 'Pixel Wake',
            line: 'The site’s 16px grid trail, dithered — click for a pixel shockwave.',
            mount() { cells.clear(); waves = []; lcx = null; },
            unmount() { cells.clear(); waves = []; lcx = null; },
            onDown(core) {
                if (core.reduced) return;
                waves.push({ cx: Math.floor(core.x / C), cy: Math.floor(core.y / C), t: 0 });
            },
            frame(core, dt, t) {
                const { ctx, w, h } = core;
                ctx.clearRect(0, 0, w, h);
                const cx = Math.floor(core.x / C), cy = Math.floor(core.y / C);

                if (!core.reduced && core.seen) {
                    if (lcx !== null && (cx !== lcx || cy !== lcy)) stroke(lcx, lcy, cx, cy, core.speed > 7);
                    lcx = cx; lcy = cy;
                }

                for (let i = waves.length - 1; i >= 0; i--) {
                    const wv = waves[i];
                    wv.t += dt;
                    const r = wv.t * 30;
                    if (r > 15) { waves.splice(i, 1); continue; }
                    const R = Math.round(r), v = 1 - r / 15;
                    for (let ox = -R; ox <= R; ox++) {
                        const oy = R - Math.abs(ox);
                        light(wv.cx + ox, wv.cy + oy, v);
                        if (oy) light(wv.cx + ox, wv.cy - oy, v);
                    }
                }

                const pInk = new Path2D(), pLight = new Path2D();
                for (const [key, c] of cells) {
                    c.v -= dt * 1.45;
                    if (c.v <= 0) { cells.delete(key); continue; }
                    const x = c.cx * C, y = c.cy * C;
                    if (x > w || y > h || x < -C || y < -C) continue;
                    const path = core.zoneAt(x + 8, y + 8) === 'paper' ? pInk : pLight;
                    for (let j = 0; j < 4; j++) {
                        for (let i = 0; i < 4; i++) {
                            if (c.v > BAYER4[j * 4 + i]) path.rect(x + 1 + i * 3.5, y + 1 + j * 3.5, 3.5, 3.5);
                        }
                    }
                }
                ctx.fillStyle = rgba(INK_RGB, 0.88);
                ctx.fill(pInk);
                ctx.fillStyle = rgba(PAPER_RGB, 0.82);
                ctx.fill(pLight);

                const hv = core.hover;
                if (hv && hv.kind !== 'text') {
                    const r = core.rectOf(hv);
                    const x0 = Math.floor(r.x / C) * C, y0 = Math.floor(r.y / C) * C;
                    const x1 = Math.ceil((r.x + r.w) / C) * C, y1 = Math.ceil((r.y + r.h) / C) * C;
                    const z = core.zoneAt(r.x + r.w / 2, r.y + r.h / 2);
                    const off = core.reduced ? 0 : (t * 32) % 8;
                    const p = new Path2D();
                    for (let x = x0 + off; x < x1; x += 8) { p.rect(x, y0 - 2, 4, 4); p.rect(x1 - (x - x0) - 4, y1 - 2, 4, 4); }
                    for (let y = y0 + off; y < y1; y += 8) { p.rect(x1 - 2, y, 4, 4); p.rect(x0 - 2, y1 - (y - y0) - 4, 4, 4); }
                    ctx.fillStyle = rgba(hotRGB(z), 0.95);
                    ctx.fill(p);
                }

                if (core.seen) {
                    const hx = cx * C, hy = cy * C;
                    const z = core.zone;
                    if (core.down) {
                        ctx.fillStyle = rgba(SIG_RGB, 0.95);
                        ctx.fillRect(hx, hy, C, C);
                    }
                    ctx.strokeStyle = rgba(hotRGB(z), 0.9);
                    ctx.lineWidth = 1;
                    ctx.strokeRect(hx + 0.5, hy + 0.5, C - 1, C - 1);
                    if (!hv || hv.kind !== 'text') {
                        core.pose.x = core.x + (hx + 8 - core.x) * 0.3;
                        core.pose.y = core.y + (hy + 8 - core.y) * 0.3;
                    }
                }
            }
        };
    })());

    /* 02 */
    Lab.register((() => {
        let bx, by, bw, bh, marks = [], count = 0;
        const pad = n => String(Math.max(0, Math.round(n))).padStart(4, '0');
        const reset = core => {
            bx = sp(core.x - 8); by = sp(core.y - 8); bw = sp(16); bh = sp(16);
            marks = []; count = 0;
        };
        return {
            id: 'plotter', index: 2,
            name: 'Plotter',
            line: 'CAD hairlines with live X/Y. Brackets snap to whatever you hover.',
            mount: reset,
            unmount() { marks = []; },
            onDown(core) {
                count++;
                marks.push({ x: core.x + core.scrollX, y: core.y + core.scrollY, n: count, t: 0 });
                if (marks.length > 30) marks.shift();
            },
            frame(core, dt) {
                const { ctx, w, h } = core;
                ctx.clearRect(0, 0, w, h);
                if (!core.seen) return;
                const z = core.zone;
                const rgb = fgRGB(z);
                const hv = core.hover;
                const text = !!hv && hv.kind === 'text';
                const x = Math.round(core.x) + 0.5, y = Math.round(core.y) + 0.5;

                ctx.lineWidth = 1;
                ctx.strokeStyle = rgba(rgb, hv && !text ? 0.16 : 0.3);
                ctx.beginPath();
                if (!text) { ctx.moveTo(0, y); ctx.lineTo(x - 12, y); ctx.moveTo(x + 12, y); ctx.lineTo(w, y); }
                ctx.moveTo(x, 0); ctx.lineTo(x, y - 12); ctx.moveTo(x, y + 12); ctx.lineTo(x, h);
                ctx.stroke();

                ctx.beginPath();
                const sx = core.scrollX, sy = core.scrollY;
                for (let gx = Math.ceil((x - 140 + sx) / 20) * 20; gx < x + 140 + sx; gx += 20) {
                    const vx = Math.round(gx - sx) + 0.5, len = gx % 100 === 0 ? 7 : 3;
                    if (!text) { ctx.moveTo(vx, y - len); ctx.lineTo(vx, y + len); }
                }
                for (let gy = Math.ceil((y - 140 + sy) / 20) * 20; gy < y + 140 + sy; gy += 20) {
                    const vy = Math.round(gy - sy) + 0.5, len = gy % 100 === 0 ? 7 : 3;
                    ctx.moveTo(x - len, vy); ctx.lineTo(x + len, vy);
                }
                ctx.strokeStyle = rgba(rgb, 0.5);
                ctx.stroke();

                let tx, ty, tw, th;
                if (hv && !text) {
                    const r = core.rectOf(hv);
                    tx = r.x - 6; ty = r.y - 6; tw = r.w + 12; th = r.h + 12;
                    if (core.down) { tx += 3; ty += 3; tw -= 6; th -= 6; }
                } else {
                    const s = core.down ? 10 : text ? 12 : 18;
                    tx = core.x - s / 2; ty = core.y - (text ? 14 : s / 2); tw = s; th = text ? 28 : s;
                }
                if (core.reduced) { bx.p = tx; by.p = ty; bw.p = tw; bh.p = th; }
                else {
                    springStep(bx, tx, dt, 340, 24); springStep(by, ty, dt, 340, 24);
                    springStep(bw, tw, dt, 340, 24); springStep(bh, th, dt, 340, 24);
                }
                const X = bx.p, Y = by.p, W = Math.max(4, bw.p), H = Math.max(4, bh.p);
                const L = clamp(Math.min(W, H) * 0.3, 4, 14);
                ctx.strokeStyle = hv && !text ? rgba(hotRGB(z), 1) : rgba(rgb, 0.85);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(X, Y + L); ctx.lineTo(X, Y); ctx.lineTo(X + L, Y);
                ctx.moveTo(X + W - L, Y); ctx.lineTo(X + W, Y); ctx.lineTo(X + W, Y + L);
                ctx.moveTo(X + W, Y + H - L); ctx.lineTo(X + W, Y + H); ctx.lineTo(X + W - L, Y + H);
                ctx.moveTo(X + L, Y + H); ctx.lineTo(X, Y + H); ctx.lineTo(X, Y + H - L);
                ctx.stroke();

                ctx.font = MONO;
                ctx.textBaseline = 'middle';
                if (hv && !text) {
                    const r = core.rectOf(hv);
                    const dim = Math.round(r.w) + ' × ' + Math.round(r.h);
                    ctx.fillStyle = rgba(hotRGB(z), 1);
                    ctx.textAlign = 'right';
                    ctx.fillText(dim, X + W, Y - 9);
                    ctx.textAlign = 'left';
                }

                const read = 'X ' + pad(core.x + sx) + '  Y ' + pad(core.y + sy);
                const rw = ctx.measureText(read).width + 12;
                const rx = Math.min(core.x + 16, w - rw - 4), ry = core.y - 30;
                ctx.fillStyle = rgba(INK_RGB, 0.9);
                ctx.fillRect(rx, ry, rw, 17);
                ctx.fillStyle = core.down ? rgba(SIG_RGB, 1) : rgba(PAPER_RGB, 0.92);
                ctx.fillText(core.down ? 'PLOT  P' + String(count).padStart(2, '0') : read, rx + 6, ry + 9);

                for (let i = marks.length - 1; i >= 0; i--) {
                    const m = marks[i];
                    m.t += dt;
                    const a = m.t < 6 ? 1 : 1 - (m.t - 6) / 1.5;
                    if (a <= 0) { marks.splice(i, 1); continue; }
                    const mx = Math.round(m.x - sx) + 0.5, my = Math.round(m.y - sy) + 0.5;
                    if (my < -20 || my > h + 20) continue;
                    const mz = core.zoneAt(mx, my);
                    ctx.strokeStyle = rgba(hotRGB(mz), a);
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(mx - 5, my - 5); ctx.lineTo(mx + 5, my + 5);
                    ctx.moveTo(mx + 5, my - 5); ctx.lineTo(mx - 5, my + 5);
                    ctx.moveTo(mx + 8, my); ctx.arc(mx, my, 8, 0, TAU);
                    ctx.stroke();
                    ctx.fillStyle = rgba(hotRGB(mz), a);
                    ctx.fillText('P' + String(m.n).padStart(2, '0'), mx + 12, my - 8);
                }
            }
        };
    })());

    /* 03 */
    Lab.register((() => {
        let segs = [], blots = [], dust = [], drops = [];
        let lx = null, ly = null;
        let under = null, underP = 0, underSeed = 0;
        let sprite = null;

        function makeSprite() {
            const c = document.createElement('canvas');
            c.width = c.height = 64;
            const g = c.getContext('2d');
            const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            grd.addColorStop(0, 'rgba(' + INK_RGB + ',0.55)');
            grd.addColorStop(0.45, 'rgba(' + INK_RGB + ',0.22)');
            grd.addColorStop(1, 'rgba(' + INK_RGB + ',0)');
            g.fillStyle = grd;
            g.fillRect(0, 0, 64, 64);
            return c;
        }

        function speck(x, y, spread, vy) {
            if (dust.length > 1600) return;
            dust.push({
                x: x + (Math.random() + Math.random() - 1) * spread,
                y: y + (Math.random() + Math.random() - 1) * spread,
                vx: (Math.random() - 0.5) * 6, vy: vy + Math.random() * 20,
                s: Math.random() < 0.7 ? 1 : 2, a: 0.45 + Math.random() * 0.5,
                life: 1.1 + Math.random() * 1.2, t: 0
            });
        }

        function wobble(u, seed) {
            return Math.sin(u * 0.045 + seed) * 1.6 + Math.sin(u * 0.13 + seed * 2.3) * 0.7;
        }

        const reset = () => { segs = []; blots = []; dust = []; drops = []; lx = null; under = null; underP = 0; };

        return {
            id: 'ink', index: 3,
            name: 'Ink Bleed',
            line: 'A marker line that feathers into the paper. On black it turns to chalk.',
            mount() { reset(); sprite = sprite || makeSprite(); },
            unmount: reset,
            onHover(core, next) {
                if (next && next.kind !== 'text') { under = next; underP = core.reduced ? 1 : 0; underSeed = Math.random() * 100; }
                return false;
            },
            onDown(core) {
                if (core.reduced) return;
                if (core.zone === 'paper') {
                    blots.push({ x: core.x, y: core.y, r0: 10, r1: 30, t: 0, life: 2.4, a: 0.9 });
                    drops.push({ x: core.x, y: core.y, r: 5.5, t: 0, life: 2.6 });
                    for (let i = 0; i < 7; i++) {
                        const a = Math.random() * TAU, d = 10 + Math.random() * 26;
                        drops.push({ x: core.x + Math.cos(a) * d, y: core.y + Math.sin(a) * d, r: 1 + Math.random() * 3, t: 0, life: 2.2 + Math.random() });
                    }
                } else {
                    for (let i = 0; i < 70; i++) {
                        const a = Math.random() * TAU, v = 30 + Math.random() * 120;
                        dust.push({ x: core.x, y: core.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: Math.random() < 0.6 ? 1 : 2, a: 0.9, life: 0.9 + Math.random(), t: 0 });
                    }
                }
            },
            frame(core, dt) {
                const { ctx, w, h } = core;
                ctx.clearRect(0, 0, w, h);

                if (!core.reduced && core.seen) {
                    if (lx !== null) {
                        const dx = core.x - lx, dy = core.y - ly, len = Math.hypot(dx, dy);
                        if (len > 0.8) {
                            const z = core.zoneAt((lx + core.x) / 2, (ly + core.y) / 2);
                            const width = clamp(6 - core.speed * 0.28, 1.6, 6);
                            segs.push({ x1: lx, y1: ly, x2: core.x, y2: core.y, w: width, t: 0, life: 1.8, z });
                            if (z === 'paper') {
                                for (let d = 0; d < len; d += 7) {
                                    const u = d / len;
                                    blots.push({ x: lx + dx * u, y: ly + dy * u, r0: width * 0.9, r1: width * 2.6, t: 0, life: 1.6, a: 0.28 });
                                }
                            } else {
                                const n = Math.min(24, Math.ceil(len / 1.6));
                                for (let i = 0; i < n; i++) { const u = Math.random(); speck(lx + dx * u, ly + dy * u, width, 6); }
                            }
                            lx = core.x; ly = core.y;
                        }
                    } else { lx = core.x; ly = core.y; }
                }
                if (!core.seen) lx = null;

                for (let i = blots.length - 1; i >= 0; i--) {
                    const b = blots[i];
                    b.t += dt;
                    const u = b.t / b.life;
                    if (u >= 1) { blots.splice(i, 1); continue; }
                    const r = b.r0 + (b.r1 - b.r0) * (1 - Math.pow(1 - u, 3));
                    ctx.globalAlpha = b.a * (1 - u);
                    ctx.drawImage(sprite, b.x - r, b.y - r, r * 2, r * 2);
                }
                ctx.globalAlpha = 1;

                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                const buckets = [];
                for (let i = segs.length - 1; i >= 0; i--) {
                    const s = segs[i];
                    s.t += dt;
                    const u = s.t / s.life;
                    if (u >= 1) { segs.splice(i, 1); continue; }
                    const q = Math.min(7, Math.floor((1 - u) * 8));
                    const key = q * 2 + (s.z === 'paper' ? 0 : 1);
                    (buckets[key] || (buckets[key] = [])).push(s);
                }
                for (let key = 0; key < buckets.length; key++) {
                    const list = buckets[key];
                    if (!list) continue;
                    const q = key >> 1, paper = (key & 1) === 0;
                    const a = (q + 1) / 8;
                    for (const s of list) {
                        ctx.beginPath();
                        ctx.moveTo(s.x1, s.y1);
                        ctx.lineTo(s.x2, s.y2);
                        ctx.lineWidth = paper ? s.w : s.w * 1.6;
                        ctx.strokeStyle = paper ? rgba(INK_RGB, 0.9 * a) : rgba(PAPER_RGB, 0.12 * a);
                        ctx.stroke();
                    }
                }

                for (let i = drops.length - 1; i >= 0; i--) {
                    const d = drops[i];
                    d.t += dt;
                    const u = d.t / d.life;
                    if (u >= 1) { drops.splice(i, 1); continue; }
                    ctx.fillStyle = rgba(INK_RGB, 0.92 * (1 - u * u));
                    ctx.beginPath();
                    ctx.arc(d.x, d.y, d.r * (1 + u * 0.25), 0, TAU);
                    ctx.fill();
                }

                const p = new Path2D();
                for (let i = dust.length - 1; i >= 0; i--) {
                    const s = dust[i];
                    s.t += dt;
                    if (s.t >= s.life) { dust.splice(i, 1); continue; }
                    s.vx *= 0.94; s.vy = s.vy * 0.94 + 26 * dt;
                    s.x += s.vx * dt; s.y += s.vy * dt;
                    if ((1 - s.t / s.life) * s.a > BAYER4[((s.x | 0) & 3) + (((s.y | 0) & 3) << 2)] * 0.9) p.rect(s.x | 0, s.y | 0, s.s, s.s);
                }
                ctx.fillStyle = rgba(PAPER_RGB, 0.9);
                ctx.fill(p);

                if (under) {
                    const live = core.hover && core.hover.el === under.el;
                    underP = core.reduced ? (live ? 1 : 0) : damp(underP, live ? 1 : 0, dt, live ? 7 : 10);
                    if (underP < 0.01 && !live) under = null;
                    else {
                        const r = core.rectOf(under);
                        const z = core.zoneAt(r.x + r.w / 2, r.y + r.h / 2);
                        const y0 = r.y + r.h - 5, end = r.w * underP;
                        ctx.beginPath();
                        for (let u = 0; u <= end; u += 6) ctx.lineTo(r.x + u, y0 + wobble(u, underSeed));
                        ctx.lineWidth = z === 'paper' ? 2.4 : 2;
                        ctx.strokeStyle = z === 'paper' ? rgba(INK_RGB, 0.9) : rgba(SIG_RGB, 0.95);
                        ctx.stroke();
                    }
                }
            }
        };
    })());

    /* 04 */
    Lab.register((() => {
        let hx = 0, hy = 0, rad = 18, ang = 0, stretch = 1, press = 0, glow = 0, glowRect = null;
        return {
            id: 'dither', index: 4,
            name: 'Dither Halo',
            line: '1-bit Bayer glow that swells with speed and bleeds around targets.',
            mount(core) { hx = core.x; hy = core.y; rad = 18; glow = 0; glowRect = null; },
            unmount() { glowRect = null; },
            frame(core, dt, t) {
                const { ctx, w, h } = core;
                ctx.clearRect(0, 0, w, h);
                if (!core.seen) return;
                const hv = core.hover;
                const text = !!hv && hv.kind === 'text';
                const k = core.reduced ? 1 : 1 - Math.exp(-dt * 22);
                hx += (core.x - hx) * k;
                hy += (core.y - hy) * k;
                const spd = core.reduced ? 0 : core.speed;
                rad = damp(rad, 16 + Math.min(64, spd * 2.4) + (core.down ? 10 : 0), dt, 10);
                stretch = damp(stretch, 1 + Math.min(1.3, spd * 0.05), dt, 12);
                if (spd > 0.6) ang = Math.atan2(core.vy, core.vx);
                press = damp(press, core.down ? 1 : 0, dt, 18);

                let a = rad * stretch, b = rad / Math.sqrt(stretch), ca = Math.cos(ang), sa = Math.sin(ang);
                if (text) { a = 5; b = 20; ca = 1; sa = 0; }
                const S = 3, R = Math.max(a, b) + S;
                const zone = core.zone;
                const pBase = new Path2D(), pHot = new Path2D();
                const breathe = core.reduced ? 1 : 0.92 + Math.sin(t * 3.2) * 0.08;
                const gx0 = Math.floor((hx - R) / S), gx1 = Math.ceil((hx + R) / S);
                const gy0 = Math.floor((hy - R) / S), gy1 = Math.ceil((hy + R) / S);
                for (let gy = gy0; gy <= gy1; gy++) {
                    for (let gx = gx0; gx <= gx1; gx++) {
                        const px = gx * S + S / 2 - hx, py = gy * S + S / 2 - hy;
                        const u = (px * ca + py * sa) / a, v = (-px * sa + py * ca) / b;
                        const d = Math.sqrt(u * u + v * v);
                        if (d >= 1 || Math.hypot(px, py) < 6) continue;
                        const I = Math.pow(1 - d, 1.6) * breathe * (1 + press * 0.5);
                        const th = BAYER8[(gx & 7) + ((gy & 7) << 3)];
                        if (I > th) (press > 0.3 && I > 0.6 ? pHot : pBase).rect(gx * S, gy * S, S - 0.5, S - 0.5);
                    }
                }
                ctx.fillStyle = rgba(fgRGB(zone), 0.92);
                ctx.fill(pBase);
                ctx.fillStyle = rgba(SIG_RGB, 1);
                ctx.fill(pHot);

                if (hv && !text) glowRect = hv;
                glow = core.reduced ? (hv && !text ? 1 : 0) : damp(glow, hv && !text ? 1 : 0, dt, 9);
                if (glowRect && glow > 0.02) {
                    const r = core.rectOf(glowRect);
                    const G = 26, S2 = 4;
                    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, hw = r.w / 2, hh = r.h / 2;
                    const z = core.zoneAt(cx, cy);
                    const p = new Path2D();
                    const x0 = Math.max(0, Math.floor((r.x - G) / S2)), x1 = Math.min(Math.ceil(w / S2), Math.ceil((r.x + r.w + G) / S2));
                    const y0 = Math.max(0, Math.floor((r.y - G) / S2)), y1 = Math.min(Math.ceil(h / S2), Math.ceil((r.y + r.h + G) / S2));
                    for (let gy = y0; gy <= y1; gy++) {
                        const qy = Math.max(Math.abs(gy * S2 + 2 - cy) - hh, 0);
                        for (let gx = x0; gx <= x1; gx++) {
                            const qx = Math.max(Math.abs(gx * S2 + 2 - cx) - hw, 0);
                            if (qx === 0 && qy === 0) continue;
                            const d = Math.sqrt(qx * qx + qy * qy);
                            if (d > G) continue;
                            const I = Math.pow(1 - d / G, 2.2) * glow;
                            if (I > BAYER8[(gx & 7) + ((gy & 7) << 3)]) p.rect(gx * S2, gy * S2, S2 - 1, S2 - 1);
                        }
                    }
                    ctx.fillStyle = rgba(hotRGB(z), 0.9);
                    ctx.fill(p);
                } else if (glow <= 0.02) glowRect = null;
            }
        };
    })());

    /* 05 */
    Lab.register((() => {
        let bx, by, bw, bh, typed = '', target = '', acc = 0, blinkT = 0;
        return {
            id: 'bracket', index: 5,
            name: 'Bracket Morph',
            line: 'The dot lives inside [ ]. Brackets wrap what you hover; the tag types itself.',
            mount(core) {
                bx = sp(core.x - 11); by = sp(core.y - 11); bw = sp(22); bh = sp(22);
                typed = ''; target = ''; acc = 0;
                core.setLabel('');
            },
            unmount(core) { typed = ''; target = ''; core.setLabel(''); },
            onHover(core, next) {
                target = next && next.kind !== 'text' ? '[ ' + next.tag + ' ]' : '';
                if (core.reduced) typed = target;
                return true;
            },
            frame(core, dt, t) {
                const { ctx, w, h } = core;
                ctx.clearRect(0, 0, w, h);
                const hv = core.hover;
                const text = !!hv && hv.kind === 'text';
                const on = !!hv && !text;

                acc += dt;
                while (acc > 0.032) {
                    acc -= 0.032;
                    if (typed === target) break;
                    typed = target.startsWith(typed) ? target.slice(0, typed.length + 1) : typed.slice(0, -1);
                }
                blinkT += dt;
                const caret = typed !== target || (on && Math.floor(blinkT * 2.2) % 2 === 0) ? '_' : '\u2002';
                core.setLabel(typed ? typed + caret : '');
                core.labelVisible = typed.length > 0;

                let tx, ty, tw, th;
                if (on) {
                    const r = core.rectOf(hv);
                    const pad = core.down ? 3 : 8;
                    tx = r.x - pad; ty = r.y - pad; tw = r.w + pad * 2; th = r.h + pad * 2;
                } else if (text) {
                    tx = core.x - 6; ty = core.y - 13; tw = 12; th = 26;
                } else {
                    const s = core.down ? 14 : 22;
                    tx = core.x - s / 2; ty = core.y - s / 2; tw = s; th = s;
                }
                if (core.reduced) { bx.p = tx; by.p = ty; bw.p = tw; bh.p = th; }
                else {
                    springStep(bx, tx, dt, 300, 20); springStep(by, ty, dt, 300, 20);
                    springStep(bw, tw, dt, 300, 20); springStep(bh, th, dt, 300, 20);
                }
                if (!core.seen) return;
                const X = bx.p, Y = by.p, W = Math.max(6, bw.p), H = Math.max(6, bh.p);
                const L = clamp(Math.min(W * 0.18, H * 0.3), 4, 12);
                const z = on ? core.zoneAt(X + W / 2, Y + H / 2) : core.zone;
                ctx.strokeStyle = on ? rgba(hotRGB(z), 1) : rgba(fgRGB(z), 0.9);
                ctx.lineWidth = on ? 2 : 1.5;
                ctx.lineCap = 'square';
                ctx.beginPath();
                if (text) {
                    ctx.moveTo(X, Y); ctx.lineTo(X + W, Y);
                    ctx.moveTo(X, Y + H); ctx.lineTo(X + W, Y + H);
                } else {
                    ctx.moveTo(X + L, Y); ctx.lineTo(X, Y); ctx.lineTo(X, Y + H); ctx.lineTo(X + L, Y + H);
                    ctx.moveTo(X + W - L, Y); ctx.lineTo(X + W, Y); ctx.lineTo(X + W, Y + H); ctx.lineTo(X + W - L, Y + H);
                }
                ctx.stroke();

                if (on) {
                    core.pose.sx *= 0.55; core.pose.sy *= 0.55;
                    core.labelPose = { x: X, y: Y - 30 };
                }
            }
        };
    })());

    /* 06 */
    Lab.register((() => {
        let head, tail = [], drops = [], sq = sp(1), grid = new Float32Array(0);
        const TAIL = [{ r: 8, k: 150, d: 14 }, { r: 6.2, k: 110, d: 12 }, { r: 4.6, k: 80, d: 10 }];
        const reset = core => {
            head = { x: core.x, y: core.y, r: 11 };
            tail = TAIL.map(c => ({ x: sp(core.x), y: sp(core.y), r: c.r, k: c.k, d: c.d }));
            drops = []; sq = sp(1);
        };
        return {
            id: 'liquid', index: 6,
            name: 'Liquid Pixel',
            line: 'A pixel metaball that stretches with speed, squishes on click, leans into targets.',
            mount: reset,
            unmount() { drops = []; },
            onDown(core) {
                sq.v -= 9;
                if (core.reduced) return;
                for (let i = 0; i < 5; i++) {
                    const a = i / 5 * TAU + Math.random() * 0.4, v = 220 + Math.random() * 120;
                    const d = { x: sp(core.x), y: sp(core.y), r: 3.5 + Math.random() * 2, t: 0 };
                    d.x.v = Math.cos(a) * v; d.y.v = Math.sin(a) * v;
                    drops.push(d);
                }
            },
            onUp() { sq.v += 12; },
            frame(core, dt) {
                const { ctx, w, h } = core;
                ctx.clearRect(0, 0, w, h);
                if (!core.seen) return;
                const hv = core.hover;
                const on = !!hv && hv.kind !== 'text';
                const text = !!hv && hv.kind === 'text';

                let px = core.x, py = core.y;
                if (on) {
                    const r = core.rectOf(hv);
                    const pull = hv.kind === 'drag' ? 0.12 : 0.18;
                    px += (r.x + r.w / 2 - px) * pull * Math.min(1, 160 / r.w);
                    py += (r.y + r.h / 2 - py) * pull;
                }
                springStep(sq, core.down ? 0.72 : 1, dt, 260, 14);
                head.x = px; head.y = py;
                head.r = (text ? 5 : on ? 17 : 11) * sq.p;

                let fx = head.x, fy = head.y;
                for (const s of tail) {
                    if (core.reduced) { s.x.p = head.x; s.y.p = head.y; }
                    else { springStep(s.x, fx, dt, s.k, s.d); springStep(s.y, fy, dt, s.k, s.d); }
                    fx = s.x.p; fy = s.y.p;
                }
                for (let i = drops.length - 1; i >= 0; i--) {
                    const d = drops[i];
                    d.t += dt;
                    springStep(d.x, head.x, dt, 60, 7); springStep(d.y, head.y, dt, 60, 7);
                    if (d.t > 0.5 && Math.hypot(d.x.p - head.x, d.y.p - head.y) < head.r) drops.splice(i, 1);
                    else if (d.t > 3) drops.splice(i, 1);
                }

                const balls = [{ x: head.x, y: head.y, r: head.r }];
                if (!text) {
                    for (const s of tail) balls.push({ x: s.x.p, y: s.y.p, r: s.r * (on ? 1.3 : 1) * sq.p });
                    for (const d of drops) balls.push({ x: d.x.p, y: d.y.p, r: d.r });
                }
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const b of balls) {
                    const m = b.r * 2.4;
                    if (b.x - m < minX) minX = b.x - m; if (b.x + m > maxX) maxX = b.x + m;
                    if (b.y - m < minY) minY = b.y - m; if (b.y + m > maxY) maxY = b.y + m;
                }
                const S = 3;
                const gx0 = Math.floor(minX / S), gy0 = Math.floor(minY / S);
                const cols = Math.min(160, Math.ceil(maxX / S) - gx0 + 1), rows = Math.min(160, Math.ceil(maxY / S) - gy0 + 1);
                if (grid.length < cols * rows) grid = new Float32Array(cols * rows);
                for (let j = 0; j < rows; j++) {
                    const cy = (gy0 + j) * S + S / 2;
                    for (let i = 0; i < cols; i++) {
                        const cx = (gx0 + i) * S + S / 2;
                        let f = 0;
                        for (const b of balls) { const dx = cx - b.x, dy = cy - b.y; f += (b.r * b.r) / (dx * dx + dy * dy + 0.001); }
                        grid[j * cols + i] = f;
                    }
                }
                const z = core.zone;
                const pFill = new Path2D(), pEdge = new Path2D();
                for (let j = 0; j < rows; j++) {
                    for (let i = 0; i < cols; i++) {
                        const f = grid[j * cols + i];
                        if (f < 1) continue;
                        const edge = i === 0 || j === 0 || i === cols - 1 || j === rows - 1 ||
                            grid[j * cols + i - 1] < 1 || grid[j * cols + i + 1] < 1 || grid[(j - 1) * cols + i] < 1 || grid[(j + 1) * cols + i] < 1;
                        const x = (gx0 + i) * S, y = (gy0 + j) * S;
                        if (edge) pEdge.rect(x, y, S, S);
                        else if (z === 'paper' || BAYER4[(i & 3) + ((j & 3) << 2)] < (core.down ? 0.4 : 0.14)) pFill.rect(x, y, S, S);
                    }
                }
                if (z === 'paper') {
                    ctx.fillStyle = rgba(INK_RGB, 0.95);
                    ctx.fill(pFill); ctx.fill(pEdge);
                } else {
                    ctx.fillStyle = core.down ? rgba(SIG_RGB, 0.9) : rgba(PAPER_RGB, 0.55);
                    ctx.fill(pFill);
                    ctx.fillStyle = rgba(on ? SIG_RGB : PAPER_RGB, 0.95);
                    ctx.fill(pEdge);
                }

                core.pose.x = head.x; core.pose.y = head.y;
                if (!text && !core.reduced) {
                    const st = 1 + Math.min(0.8, core.speed * 0.035);
                    core.pose.rot = Math.atan2(core.vy, core.vx);
                    core.pose.sx *= st * (2 - sq.p);
                    core.pose.sy *= (1 / st) * sq.p;
                }
            }
        };
    })());

    /* 07 */
    Lab.register((() => {
        const N = 8;
        let ghosts = [];
        let orbitT = 0;
        const reset = core => { ghosts = Array.from({ length: N }, () => ({ x: sp(core.x), y: sp(core.y) })); };
        function perimeter(r, u) {
            const P = 2 * (r.w + r.h);
            let d = ((u % 1) + 1) % 1 * P;
            if (d < r.w) return [r.x + d, r.y];
            d -= r.w; if (d < r.h) return [r.x + r.w, r.y + d];
            d -= r.h; if (d < r.w) return [r.x + r.w - d, r.y + r.h];
            d -= r.w; return [r.x, r.y + r.h - d];
        }
        return {
            id: 'afterimage', index: 7,
            name: 'Afterimage',
            line: 'Eight spring-linked ghosts, like a long exposure. They orbit what you hover.',
            mount: reset,
            unmount() { ghosts = []; },
            onDown() {
                ghosts.forEach((g, i) => {
                    const a = i / N * TAU;
                    g.x.v += Math.cos(a) * 520; g.y.v += Math.sin(a) * 520;
                });
            },
            frame(core, dt) {
                const { ctx, w, h } = core;
                ctx.clearRect(0, 0, w, h);
                if (!core.seen || core.reduced) return;
                const hv = core.hover;
                const on = !!hv && hv.kind !== 'text';
                const text = !!hv && hv.kind === 'text';
                orbitT += dt * 0.09;
                let r = null;
                if (on) { const rr = core.rectOf(hv); r = { x: rr.x - 6, y: rr.y - 6, w: rr.w + 12, h: rr.h + 12 }; }

                let px = core.x, py = core.y;
                ghosts.forEach((g, i) => {
                    let tx, ty, k = 260, d = 17;
                    if (on) { [tx, ty] = perimeter(r, orbitT + i / N); k = 120; d = 14; }
                    else if (text) { tx = core.x; ty = core.y + (i - 3.5) * 3.2; k = 300; d = 22; }
                    else { tx = px; ty = py; }
                    springStep(g.x, tx, dt, k, d);
                    springStep(g.y, ty, dt, k, d);
                    px = g.x.p; py = g.y.p;
                });

                const z = core.zone;
                const rgb = on ? hotRGB(core.zoneAt(r.x + r.w / 2, r.y + r.h / 2)) : fgRGB(z);
                if (!on) {
                    ctx.beginPath();
                    ctx.moveTo(core.x, core.y);
                    for (const g of ghosts) ctx.lineTo(g.x.p, g.y.p);
                    ctx.strokeStyle = rgba(rgb, 0.22);
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                for (let i = N - 1; i >= 0; i--) {
                    const g = ghosts[i];
                    ctx.fillStyle = rgba(rgb, on ? 0.95 : 0.85 - i * 0.09);
                    ctx.beginPath();
                    ctx.arc(g.x.p, g.y.p, on ? 2.6 : text ? 1.4 : 3.6 - i * 0.3, 0, TAU);
                    ctx.fill();
                }
            }
        };
    })());

    /* 08 */
    Lab.register((() => {
        let stamps = [], variants = [], rot = 0, ring = sp(1), hoverA = 0;
        const W = 96, H = 50;
        const date = (() => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getFullYear()).slice(2); })();

        function buildVariant(seed) {
            const s = 2;
            const c = document.createElement('canvas');
            c.width = W * s; c.height = H * s;
            const g = c.getContext('2d');
            g.scale(s, s);
            g.strokeStyle = g.fillStyle = 'rgb(' + SIG_RGB + ')';
            g.lineWidth = 2.4; g.strokeRect(2, 2, W - 4, H - 4);
            g.lineWidth = 1; g.strokeRect(6, 6, W - 12, H - 12);
            g.font = "700 27px 'Brier', 'PP-Mori', Georgia, serif";
            g.textBaseline = 'middle';
            g.fillText('AP', 12, H / 2 + 2);
            g.fillRect(55, 12, 1, H - 24);
            g.font = "500 7.5px 'IBM Plex Mono', monospace";
            g.fillText('PASSED', 61, 20);
            g.fillText(date, 61, 30);
            g.globalCompositeOperation = 'destination-out';
            let r = seed * 9301 + 49297;
            const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
            for (let i = 0; i < 380; i++) {
                g.globalAlpha = 0.4 + rnd() * 0.6;
                g.fillRect(rnd() * W, rnd() * H, 0.5 + rnd() * 1.3, 0.5 + rnd() * 1.1);
            }
            g.globalAlpha = 0.35;
            for (let i = 0; i < 3; i++) g.fillRect(0, rnd() * H, W, 0.6 + rnd());
            const ink = document.createElement('canvas');
            ink.width = c.width; ink.height = c.height;
            const gi = ink.getContext('2d');
            gi.drawImage(c, 0, 0);
            gi.globalCompositeOperation = 'source-in';
            gi.fillStyle = 'rgb(' + INK_RGB + ')';
            gi.fillRect(0, 0, ink.width, ink.height);
            return { sig: c, ink };
        }
        function build() { variants = [1, 2, 3].map(buildVariant); }

        return {
            id: 'stamp', index: 8,
            name: 'Rubber Stamp',
            line: 'A registration-mark cursor. Click to press a worn yellow AP stamp.',
            mount() {
                stamps = [];
                build();
                if (document.fonts) document.fonts.load("700 27px 'Brier'").then(build, () => {});
            },
            unmount() { stamps = []; },
            onDown(core) {
                ring.v -= 8;
                const hv = core.hover;
                if (hv && (hv.fixed || hv.kind === 'drag')) return;
                stamps.push({
                    x: core.x + core.scrollX, y: core.y + core.scrollY,
                    rot: core.reduced ? 0 : (Math.random() - 0.5) * 0.42,
                    v: (Math.random() * variants.length) | 0, t: 0, z: core.zone
                });
                if (stamps.length > 22) stamps.shift();
            },
            frame(core, dt) {
                const { ctx, w, h } = core;
                ctx.clearRect(0, 0, w, h);
                for (let i = stamps.length - 1; i >= 0; i--) {
                    const s = stamps[i];
                    s.t += dt;
                    const a = s.t < 4 ? 1 : 1 - (s.t - 4) / 1.4;
                    if (a <= 0) { stamps.splice(i, 1); continue; }
                    const x = s.x - core.scrollX, y = s.y - core.scrollY;
                    if (y < -60 || y > h + 60) continue;
                    const sc = core.reduced || s.t > 0.14 ? 1 : 1.3 - (s.t / 0.14) * 0.3;
                    const V = variants[s.v];
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(s.rot);
                    ctx.scale(sc, sc);
                    if (s.z === 'paper') {
                        ctx.globalAlpha = 0.4 * a;
                        ctx.drawImage(V.ink, -W / 2 + 1.6, -H / 2 + 1.1, W, H);
                        ctx.globalCompositeOperation = 'multiply';
                    }
                    ctx.globalAlpha = 0.95 * a;
                    ctx.drawImage(V.sig, -W / 2, -H / 2, W, H);
                    ctx.restore();
                }
                if (!core.seen) return;
                const hv = core.hover;
                const text = !!hv && hv.kind === 'text';
                const on = !!hv && !text;
                springStep(ring, text ? 0 : core.down ? 0.72 : on ? 1.35 : 1, dt, 280, 16);
                hoverA = damp(hoverA, on ? 1 : 0, dt, 10);
                if (!core.reduced) rot += (core.vx * 0.012 + (on ? 1.2 : 0.25)) * dt * 2;
                const R = 11 * ring.p;
                if (R < 0.5) return;
                const z = core.zone;
                ctx.save();
                ctx.translate(core.x, core.y);
                ctx.rotate(rot);
                ctx.lineWidth = 1;
                ctx.strokeStyle = rgba(on ? hotRGB(z) : fgRGB(z), 0.85);
                if (hoverA > 0.05) ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(0, 0, R, 0, TAU);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const a = i * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
                    ctx.moveTo(c * (R - 4), s * (R - 4));
                    ctx.lineTo(c * (R + 7), s * (R + 7));
                }
                ctx.stroke();
                ctx.restore();
            }
        };
    })());
})();
