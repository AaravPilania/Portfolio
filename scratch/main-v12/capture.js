// HEADFUL=1 node scratch/main-v12/capture.js <part> [w h] -> verification stills for main-v12, written beside this file
//   wheel : real wheel detents through slide 04, a still + the visible counter at every detent (wheel-XX.png)
//   dots  : the headline assembling from slide 04's grid, scrubbed in steps (dots-XX.png)
//   stick : sticker size on the conveyor vs mid-fall vs piled, in measured px (stick-*.png)
//   drag  : grab a piled sticker, swing it and throw it (drag-XX.png)
//   sig   : the signature mid-draw and complete (sig-mid.png, sig-done.png)
const path = require('path');
const { open, sleep } = require('./site.js');
const PART = process.argv[2] || 'dots', W = +process.argv[3] || 1920, H = +process.argv[4] || 1080;
const out = (n) => path.join(__dirname, n);
const pad = (i) => String(i).padStart(2, '0');

(async () => {
    const { page, close, geo, set } = await open(W, H, { settle: 5000 });
    const g = await geo();
    const wheel = async (dy, n = 1, gap = 16) => {
        for (let i = 0; i < n; i++) { await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: W * 0.5, y: H * 0.5, deltaX: 0, deltaY: dy }); await sleep(gap); }
    };
    const mouse = (type, x, y, extra = {}) => page.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 }, extra));
    const wt = (expr) => page.eval(`JSON.stringify((() => { const w = window.__workTogether, st = w.state(); ${expr} })())`).then(JSON.parse);

    if (PART === 'wheel') {
        const A = await page.eval(`(() => { const sc = document.querySelector('.js-scroller'), t = document.getElementById('skWheel'); return Math.round(t.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop); })()`);
        await set(A - H * 0.5);
        await sleep(1500);
        const counter = () => page.eval(`JSON.stringify([...document.querySelectorAll('#skWheel .sk-cat')].map((c) => {
            const k = c.querySelector('.sk-kicker'), ch = k && k.querySelector('.sk-ch'), mk = k && k.querySelector('.sk-mk');
            const off = ch ? Math.abs(ch.getBoundingClientRect().top - mk.getBoundingClientRect().top) : 99;
            return { title: c.querySelector('.sk-title').getAttribute('aria-label'), kicker: k ? k.textContent : null, on: off < 3 };
        }).filter((c) => c.on).map((c) => c.title + ' ' + c.kicker).concat([document.getElementById('skWheel').classList.contains('sk--exp') ? 'rail:yellow' : 'rail:white']))`);
        for (let i = 0; i < 9; i++) {
            await wheel(120, 3, 30);
            await sleep(1700);
            const c = await counter();
            console.log('detent', i, c);
            await page.shot(out(`wheel-${pad(i)}.png`));
            if (c.includes('Experience [ 01 / 01 ]')) break;
        }
    }

    if (PART === 'dots') {
        const top = g.together.top;
        // bp = the backdrop's exit progress (1 - services bottom / H); the services section ends where slide 05 starts
        await set(top - H * 1.6); await sleep(900);
        await set(top - H * 1.2); await sleep(1200);
        console.log('dots', JSON.stringify((await wt('return st.dots;'))));
        const Ps = [0.16, 0.26, 0.36, 0.48, 0.6, 0.72, 0.82, 0.9, 0.96, 1.02];
        for (let i = 0; i < Ps.length; i++) {
            await set(top - H * (1 - Ps[i]));
            await sleep(900);
            const op = await page.eval(`document.getElementById('wtTitle').style.opacity`);
            console.log('P', Ps[i], 'title opacity', op, await page.eval(`JSON.stringify((() => {
                const t = document.getElementById('wtTitle').getBoundingClientRect(), s = document.querySelector('.ll-section--together .wt-stage').getBoundingClientRect();
                const sec = document.querySelector('.ll-section--together').getBoundingClientRect();
                const at = document.elementsFromPoint(${W / 2}, t.top + t.height * 0.75).slice(0, 4).map((e) => e.className || e.tagName);
                return { titleTop: Math.round(t.top), stageTop: Math.round(s.top), secTop: Math.round(sec.top), at };
            })())`));
            await page.shot(out(`dots-${pad(i)}.png`));
        }
        // reversible: back up to bp = 0.48 and compare with dots-03
        await set(top - H * 0.52);
        await sleep(900);
        await page.shot(out('dots-reverse-048.png'));
        // seam: at bp = 0.26 with the flying layer hidden, the vacated cells must be exactly the backdrop's own gaps
        await set(top - H * 0.74);
        await sleep(900);
        await page.eval(`document.querySelector('.wt-dots').style.visibility = 'hidden'`);
        await sleep(300);
        await page.shot(out('dots-seam-backdrop-only.png'));
        await page.eval(`document.querySelector('.wt-dots').style.visibility = ''`);
    }

    if (PART === 'ghost') {
        await set(g.together.top - H * 0.98 * 0.25);
        await sleep(900);
        await page.shot(out('ghost-a.png'));
        await page.eval(`document.getElementById('wtTitle').style.visibility = 'hidden'`);
        await sleep(300);
        await page.shot(out('ghost-b-title-hidden.png'));
        await page.eval(`document.querySelector('.wt-dots').style.visibility = 'hidden'`);
        await sleep(300);
        await page.shot(out('ghost-c-dots-hidden.png'));
    }

    if (PART === 'stick' || PART === 'drag') {
        const size = `return w.items.filter((s) => s.img).slice(0, 36).map((s) => [s.def.n, +(s.img.bw * s.side * s.ks / s.ppu).toFixed(1), +(s.img.bh * s.side * s.ks / s.ppu).toFixed(1)]);`;
        // On the conveyor, stage pinned
        await set(g.together.top + H * 0.2);
        await sleep(1500);
        const conv = await wt(size);
        await page.shot(out('stick-conveyor.png'));
        // Into the footer with real wheel input so the drop happens mid-scroll
        await set(g.footer.top - H * 0.9);
        await sleep(600);
        await wheel(60, 10, 16);
        let mid = null;
        for (let i = 0; i < 40 && !mid; i++) {
            const st = await wt('return st;');
            if (st.mode === 'fall') { await sleep(220); mid = await wt(size); await page.shot(out('stick-midfall.png')); }
            else { await wheel(60, 2, 16); await sleep(30); }
        }
        await set(g.max);
        await sleep(4500);
        const pile = await wt(size);
        const st = await wt('return st;');
        await page.shot(out('stick-pile.png'));
        const rows = conv.map((c, i) => ({ n: c[0], conveyor: c[1] + 'x' + c[2], midfall: mid ? mid[i][1] + 'x' + mid[i][2] : '-', pile: pile[i][1] + 'x' + pile[i][2] }));
        console.log('pit', st.pitH, 'floorY', st.floorY, 'resting', st.resting, 'mode', st.mode);
        console.log('sizes (px, die-cut box)\n' + rows.slice(0, 12).map((r) => r.n.padEnd(14) + ' conveyor ' + r.conveyor.padEnd(12) + ' mid-fall ' + r.midfall.padEnd(12) + ' pile ' + r.pile).join('\n'));
        const same = rows.every((r) => r.conveyor === r.pile && (r.midfall === '-' || r.midfall === r.conveyor));
        console.log('all 36 identical across conveyor / mid-fall / pile:', same);
        // Every sticker inside the viewport, on or above the floor
        const onScreen = await wt(`return w.items.map((s) => [Math.round(s.x), Math.round(s.y)]).filter(([x, y]) => x < 0 || x > st.W || y > st.footTop + st.floorY + 4).length;`);
        console.log('stickers outside the pit bounds:', onScreen);

        if (PART === 'drag') {
            // The topmost piled sticker under the pointer: pick the highest one
            const tgt = await wt(`const s = w.items.slice().sort((a, b) => a.y - b.y)[0]; return { n: s.def.n, x: s.x, y: s.y, a: s.a };`);
            console.log('grab', JSON.stringify(tgt));
            await mouse('mouseMoved', tgt.x, tgt.y, { buttons: 0 });
            await sleep(200);
            await mouse('mousePressed', tgt.x, tgt.y);
            await sleep(60);
            console.log('dragging', (await wt('return st.drag;')));
            // swing up and left, hold, then fling right
            const path1 = [];
            for (let i = 1; i <= 24; i++) path1.push([tgt.x - 260 * i / 24, tgt.y - 340 * Math.sin((i / 24) * Math.PI / 2)]);
            for (let i = 0; i < path1.length; i++) {
                await mouse('mouseMoved', path1[i][0], path1[i][1]);
                await sleep(16);
                if (i === 12) await page.shot(out('drag-00.png'));
            }
            await sleep(500);
            await page.shot(out('drag-01.png'));
            const held = await wt(`const s = w.items.find((q) => q.def.n === '${tgt.n}'); return { x: s.x, y: s.y, a: s.a };`);
            console.log('held at', JSON.stringify(held), 'pointer', JSON.stringify(path1[path1.length - 1]));
            const [hx, hy] = path1[path1.length - 1];
            for (let i = 1; i <= 6; i++) { await mouse('mouseMoved', hx + 70 * i, hy - 10 * i); await sleep(16); }
            await mouse('mouseReleased', hx + 420, hy - 60);
            const track = [];
            for (let i = 0; i < 6; i++) {
                await sleep(120);
                track.push(await wt(`const s = w.items.find((q) => q.def.n === '${tgt.n}'); return [Math.round(s.x), Math.round(s.y), +s.a.toFixed(2)];`));
                if (i === 1) await page.shot(out('drag-02.png'));
            }
            console.log('thrown path (x, y, angle)', JSON.stringify(track));
            await sleep(3000);
            await page.shot(out('drag-03.png'));
            console.log('after', JSON.stringify(await wt('return { drag: st.drag, resting: st.resting, awake: st.awake };')));
        }
    }

    if (PART === 'hero') {
        const probe = () => page.eval(`JSON.stringify([...document.querySelectorAll('.track-line-1')].map((t) => {
            const s = t.querySelector('span'), cs = s && getComputedStyle(s);
            return { scale: t.style.scale || '1', font: cs && cs.fontFamily.split(',')[0], stroke: cs && cs.webkitTextStrokeColor + ' ' + cs.webkitTextStrokeWidth, w: Math.round(t.scrollWidth) };
        }))`);
        const ys = [0, 0.2, 0.35, 0.5, 0.7, 1.0, 1.4];
        for (let i = 0; i < ys.length; i++) {
            await set(H * ys[i]);
            await sleep(1100);
            console.log('hero', ys[i], await probe());
            await page.shot(out(`hero-${pad(i)}.png`));
        }
    }

    if (PART === 'sig') {
        await set(g.footer.top - H * 0.75);
        await sleep(800);
        // walk the footer in so the signature draws on, sampling the state as it goes
        const steps = 14;
        let mid = false;
        for (let i = 1; i <= steps; i++) {
            await set(g.footer.top - H * 0.75 + (g.max - (g.footer.top - H * 0.75)) * (i / steps));
            await sleep(900);
            const s = JSON.parse(await page.eval('JSON.stringify(window.__sigFooter.state())'));
            console.log('sig', i, s.progress.toFixed(3), s.target.toFixed(3));
            if (!mid && s.progress > 0.4) { mid = true; await page.shot(out('sig-mid.png')); }
        }
        await sleep(1500);
        await page.shot(out('sig-done.png'));
        console.log('hero box', await page.eval(`JSON.stringify(document.querySelector('.sig-hero').getBoundingClientRect())`));
    }

    console.log(page.errors.length ? 'errors ' + page.errors.slice(0, 6).join('\n') : 'errors none');
    await close();
    process.exit(0);
})();
