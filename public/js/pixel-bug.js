// GLITCH: top-down pixel beetle that wanders the whole viewport, grooms, flies, visits the cursor and narrates each section.
// Self-mounting once the intro has handed over (body.is-loaded). Boop (click), drag and drop (it lands on its back), or let it nap.
(function () {
    'use strict';
    if (window.__pixelBug) return;
    window.__pixelBug = true;

    const doc = document;
    const S = 2;                      // CSS px per sprite pixel
    const GW = 24, GH = 30;           // sprite grid, drawn facing up
    const BOX = 32;                   // square hit box in sprite px, centred on the bug
    const FXW = 40, FXH = 56;         // particle canvas, reaches above the box for hearts / Zs
    const PAL = { k: '#121316', w: '#f4f2ea', s: '#b9b5a8', y: '#FFED29', t: '#ff7a8a', d: '#57585f', o: '#7d6d1c', g: 'rgba(150, 160, 172, 0.55)' };
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Left half of the shell, head and pronotum; the right half is its mirror. The outline pass adds the ink edge.
    const BODY = [
        '............',
        '............',
        '............',
        '............',
        '.........www',
        '........wwww',
        '........wkkw',
        '........wkkw',
        '........wwww',
        '.........www',
        '.......sssss',
        '......ssssss',
        '......ssssss',
        '......kkkkkk',
        '......yyyyyk',
        '.....yyyyyyk',
        '.....yyyyyyk',
        '.....yykkyyk',
        '.....yykkyyk',
        '.....yyyyyyk',
        '.....yyyyyyk',
        '.....ykkyyyk',
        '.....ykkyyyk',
        '......yyyyyk',
        '.......yyyyk',
        '.........yyk',
    ];
    // Wing membranes behind the split shell, two buzz frames
    const WING = {
        1: { y: 11, rows: ['.....ggg', '...ggggg', '..gggggg', '.ggggggg', '.ggggggg', 'gggggggg', 'gggggggg', 'gggggggg',
            '.ggggggg', '.ggggggg', '..gggggg', '..gggggg', '...ggggg', '...ggggg', '....gggg', '.....ggg'] },
        2: { y: 13, rows: ['....gggg', '...ggggg', '..gggggg', '..gggggg', '..gggggg', '..gggggg', '...ggggg', '...ggggg',
            '...ggggg', '....gggg', '....gggg', '.....ggg'] },
    };
    // Left legs as pixel runs from the body outward
    const LEG = {
        front: {
            fwd: [[5, 11], [4, 11], [3, 10], [2, 9], [2, 8]],
            mid: [[5, 11], [4, 11], [3, 11], [2, 10], [1, 10]],
            back: [[5, 12], [4, 12], [3, 12], [2, 13], [1, 13]],
            tuck: [[5, 11], [4, 11]],
            groom: [[5, 11], [4, 10], [4, 9], [5, 8], [6, 7]],
        },
        mid: {
            fwd: [[4, 17], [3, 16], [2, 16], [1, 15]],
            mid: [[4, 17], [3, 17], [2, 17], [1, 17]],
            back: [[4, 18], [3, 19], [2, 19], [1, 19]],
            tuck: [[4, 17], [3, 17]],
        },
        rear: {
            fwd: [[4, 22], [3, 22], [2, 21], [1, 21]],
            mid: [[4, 22], [3, 23], [2, 24], [1, 25]],
            back: [[4, 23], [3, 24], [2, 25], [2, 26]],
            tuck: [[4, 22], [3, 23]],
        },
    };
    const ANT = {
        out: [[9, 3], [8, 2], [7, 1], [6, 1]],
        up: [[10, 3], [10, 2], [9, 1]],
        wide: [[9, 3], [8, 3], [7, 2], [6, 2], [5, 1]],
        down: [[9, 3], [8, 3], [7, 3], [6, 4]],
    };
    // SPARK: slim firefly, graphite wing cases, pink-flecked shield and a lantern tail (L) that flashes
    const FIREFLY = [
        '............', '............', '............', '............',
        '..........ww', '.........www', '.........kww', '.........kww', '..........ww',
        '........ssss', '........sstt', '........sstt', '........ssss', '........kkkk',
        '........dddk', '.......ddddk', '.......ddddk', '.......ddddk', '.......ddddk', '.......ddddk', '.......ddddk', '........dddk',
        '........LLLL', '........LLLL', '.........LLL', '..........LL',
    ];
    // PINCH: stag beetle, broad graphite shell with a signature-yellow rim and bone mandibles
    const STAG = [
        '............', '............', '............', '............',
        '.........sss', '.......sssss', '......skssss', '......ssssss', '.......sssss', '........ssss',
        '......dddddd', '.....ddddddd', '.....ddddddd', '......kkkkkk',
        '......yddddk', '.....ydddddk', '.....ydddddk', '.....ydddddk', '.....ydddddk', '.....ydddddk',
        '.....ydddddk', '.....ydddddk', '.....ydddddk', '......yddddk', '.......ydddk', '.........yyk',
    ];
    const MANDIBLE = [[9, 3], [10, 3], [8, 2], [8, 1], [9, 1], [10, 2]];
    // DUST: moth, fuzzy segmented body under dithered wings (D) with a yellow eye-spot
    const MOTH = [
        '............', '............', '............', '............',
        '..........ww', '.........www', '.........kww', '..........ww', '.........www', '.........www',
        '.........www', '.........www', '..........ww', '..........ss', '..........ww', '..........ss',
        '..........ww', '..........ss', '..........ww', '..........ss', '..........ww', '...........w',
    ];
    const MOTH_WING = { y: 7, rows: [
        '........DD', '......DDDD', '....DDDDDD', '..DDDDDDDD', '.DDDDyyDDD', '.DDDykkyDD', '.DDDDyyDDD', '..DDDDDDDD',
        '...DDDDDDD', '....DDDDDD', '...DDDDDDD', '..DDDDDDDD', '..DDDDDDDD', '...DDDDDDD', '....DDDDDD', '......DDDD', '........DD',
    ] };
    const SKINS = {
        beetle: { name: 'GLITCH', body: BODY, ant: ANT, legDx: 0, wings: 'membrane',
            welcome: 'hi. i\'m glitch. every good site ships with one bug. i\'m it.', scroll: 'scroll-jacked.' },
        firefly: { name: 'SPARK', body: FIREFLY, legDx: 3, wings: 'membrane', lantern: true,
            ant: { out: [[10, 3], [9, 2], [8, 1], [7, 1]], up: [[11, 3], [11, 2], [10, 1]], wide: [[10, 3], [9, 3], [8, 2], [7, 2], [6, 1]], down: [[10, 3], [9, 3], [8, 4], [7, 5]] },
            welcome: 'hi. i\'m spark. i light up when you find the good stuff.', scroll: 'my light can\'t keep up with you.' },
        stag: { name: 'PINCH', body: STAG, legDx: 0, wings: 'membrane', extra: MANDIBLE,
            ant: { out: [[6, 5], [5, 4], [4, 4], [3, 3]], up: [[6, 5], [6, 4], [5, 3]], wide: [[6, 5], [5, 5], [4, 4], [3, 4], [2, 3]], down: [[5, 6], [4, 7], [3, 8]] },
            welcome: 'i\'m pinch. i guard the portfolio. mostly by standing here.', scroll: 'easy. these pincers aren\'t seatbelts.' },
        moth: { name: 'DUST', body: MOTH, legDx: 0, wings: 'moth', noLegs: true,
            ant: { out: [[10, 3], [9, 2], [8, 2], [8, 1], [7, 1]], up: [[11, 3], [10, 2], [10, 1], [9, 1]], wide: [[10, 3], [9, 3], [8, 2], [7, 2], [7, 1], [6, 1]], down: [[10, 3], [9, 3], [8, 3], [7, 4]] },
            welcome: 'i\'m dust. came for the glow of your screen, stayed for the work.', scroll: 'wheee. is that a lamp?' },
    };
    const GLYPH = {
        heart: ['yy.yy', 'yyyyy', '.yyy.', '..y..'],
        z: ['yyyy', '..y.', '.y..', 'yyyy'],
        bang: ['y', 'y', 'y', '.', 'y'],
    };

    const LINES = {
        scroll: ['whoa, slow down.', 'wind in my antennae.', 'hold on, i\'m coming.', 'motion sickness is a feature.'],
        hero: ['move your cursor. he watches it. i just try not to get squashed.', 'drag me anywhere. i won\'t file a report.'],
        screen: ['same guy, smaller screen. i live in the gaps between the words.', 'keep it simple, stupid. i\'m the simple part.'],
        projects: ['the good work is down here. hover a row, i\'ll wait on the line.', 'zero bugs in any of these. except me, visiting.'],
        services: ['how he pays rent. i work for crumbs.', 'party tricks. mine is vanishing on refresh.'],
        logos: ['people he\'s shipped with. none of them caught me.', 'big names. i\'ve crawled across all their screens.'],
        pet: ['tickles.', '*antennae intensify*', 'careful. i bite. in bytes.', 'you\'re not squashing me. i like you.'],
        caught: ['gotcha. not a feature.', 'reproduced it.', 'found you. marking as resolved.', 'faster than your QA team.', 'tag. you\'re the bug now.'],
        flip: ['i\'m fine. this is fine.', 'help. legs. air.', 'undefined is not a function.', 'works on my machine.'],
    };

    function blank() {
        const g = [];
        for (let y = 0; y < GH; y++) g.push(new Array(GW).fill('.'));
        return g;
    }
    function put(g, x, y, c) {
        if (y >= 0 && y < GH && x >= 0 && x < GW) g[y][x] = c;
    }
    function both(g, x, y, c, side) {
        if (side <= 0) put(g, x, y, c);
        if (side >= 0) put(g, GW - 1 - x, y, c);
    }
    function run(g, pts, c, side, tip) {
        pts.forEach(([px, py], i) => both(g, px, py, tip && i === pts.length - 1 ? tip : c, side));
    }

    // Tripod gait: front + rear on one side swing with the middle leg of the other
    function legState(legs, side, leg) {
        if (legs === 'tuck') return 'tuck';
        if (legs === 'a' || legs === 'b') {
            const swing = (legs === 'a') === (side < 0);
            return (leg === 'mid') === swing ? 'back' : 'fwd';
        }
        if (legs === 'flail0' || legs === 'flail1') return (legs === 'flail0') === (side < 0) ? 'fwd' : 'back';
        if (leg === 'front' && ((legs === 'groomL' && side < 0) || (legs === 'groomR' && side > 0))) return 'groom';
        return 'mid';
    }

    // pose: { skin, legs, antL, antR, fly: 0|1|2, belly, happy, lit }
    const cache = new Map();
    function compose(p) {
        const key = JSON.stringify(p);
        if (cache.has(key)) return cache.get(key);
        const skin = SKINS[p.skin] || SKINS.beetle;
        const g = blank();
        if (skin.wings === 'moth') {
            // Wide wings at rest, folded toward the body on the upstroke
            const fold = p.fly === 2 ? 3 : 0;
            MOTH_WING.rows.forEach((row, ry) => {
                for (let rx = 0; rx < row.length; rx++) {
                    let c = row[rx];
                    if (c === '.' || rx + fold > 9) continue;
                    if (c === 'D') c = (rx + ry) % 2 ? 's' : 'w';
                    both(g, rx + fold, MOTH_WING.y + ry, c, 0);
                }
            });
        } else if (p.fly) {
            WING[p.fly].rows.forEach((row, ry) => {
                for (let rx = 0; rx < row.length; rx++) if (row[rx] !== '.') both(g, rx, WING[p.fly].y + ry, 'g', 0);
            });
        }
        for (const side of [-1, 1]) {
            if (!skin.noLegs) {
                for (const leg of ['front', 'mid', 'rear']) {
                    run(g, LEG[leg][legState(p.legs, side, leg)].map(([lx, ly]) => [lx + skin.legDx, ly]), 's', side);
                }
            }
            run(g, skin.ant[side < 0 ? p.antL : p.antR], 's', side, 'y');
            if (skin.extra) run(g, skin.extra, 'w', side);
        }
        const split = p.fly && skin.wings !== 'moth' ? 1 : 0;
        skin.body.forEach((row, y) => {
            for (let x = 0; x < 12; x++) {
                let c = row[x];
                if (c === '.') continue;
                if (c === 'L') c = p.lit ? 'y' : 'o';
                if (p.belly && y >= 14) c = y === 17 || y === 21 ? 'k' : 's';
                if (p.happy && c === 'k' && y >= 6 && y <= 7) c = 'y';
                const dx = split && y >= 14 ? 1 : 0;
                put(g, x - dx, y, c);
                put(g, GW - 1 - x + dx, y, c);
            }
        });
        // One-pixel ink edge around everything opaque, so the bug reads on the paper hero and the black slides alike
        const out = g.map((r) => r.slice());
        const solid = (yy, xx) => yy >= 0 && yy < GH && xx >= 0 && xx < GW && 'wsytdo'.indexOf(g[yy][xx]) >= 0;
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
            if (g[y][x] === '.' && (solid(y - 1, x) || solid(y + 1, x) || solid(y, x - 1) || solid(y, x + 1))) out[y][x] = 'k';
        }
        const img = doc.createElement('canvas'), sil = doc.createElement('canvas');
        img.width = sil.width = GW;
        img.height = sil.height = GH;
        const ic = img.getContext('2d'), sc = sil.getContext('2d');
        sc.fillStyle = '#000';
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
            const c = out[y][x];
            if (c === '.') continue;
            ic.fillStyle = PAL[c];
            ic.fillRect(x, y, 1, 1);
            if (c !== 'g') sc.fillRect(x, y, 1, 1);
        }
        const res = { grid: out, img, sil };
        cache.set(key, res);
        return res;
    }

    function mount() {
        const style = doc.createElement('style');
        style.textContent = `
            .pb-bug { position: fixed; left: 0; top: 0; z-index: 9999990; width: ${BOX * S}px; height: ${BOX * S}px;
                padding: 0; margin: 0; border: 0; background: none; cursor: none; touch-action: none; overflow: visible;
                will-change: transform; -webkit-tap-highlight-color: transparent; }
            .pb-bug:focus-visible { outline: 1px dashed #FFED29; outline-offset: 2px; }
            .pb-bug canvas { position: absolute; display: block; pointer-events: none; image-rendering: pixelated; image-rendering: crisp-edges; }
            .pb-rot, .pb-bug .pb-shadow { position: absolute; left: ${(BOX - GW) / 2 * S}px; top: ${(BOX - GH) / 2 * S}px; width: ${GW * S}px; height: ${GH * S}px; will-change: transform; pointer-events: none; }
            .pb-bug .pb-body { left: 0; top: 0; width: 100%; height: 100%; }
            .pb-bug .pb-shadow { opacity: 0.26; }
            .pb-glow { position: absolute; left: ${12 * S - 22}px; top: ${23.5 * S - 22}px; width: 44px; height: 44px; border-radius: 50%; display: none;
                background: radial-gradient(circle, rgba(255, 237, 41, 0.75) 0%, rgba(255, 237, 41, 0.28) 32%, transparent 70%);
                mix-blend-mode: screen; opacity: 0; will-change: opacity; }
            .pb-bug.has-lantern .pb-glow { display: block; }
            .pb-fx { left: ${(BOX - FXW) / 2 * S}px; top: ${(BOX - FXH) * S}px; width: ${FXW * S}px; height: ${FXH * S}px; }
            .pb-bubble { position: fixed; left: 0; top: 0; z-index: 9999991; max-width: 15.5rem; pointer-events: none;
                padding: 9px 12px 10px; background: #f4f2ea; color: #121316;
                font: 500 11.5px/1.45 'IBM Plex Mono', 'Sometype Mono', monospace; letter-spacing: 0.01em;
                box-shadow: 0 -2px 0 0 #121316, 0 2px 0 0 #121316, -2px 0 0 0 #121316, 2px 0 0 0 #121316, 5px 5px 0 0 rgba(18,19,22,0.28);
                opacity: 0; transition: opacity 0.18s steps(3); will-change: transform, opacity; }
            .pb-bubble.is-on { opacity: 1; }
            .pb-bubble::after { content: ''; position: absolute; left: var(--tail, 24px); bottom: -8px; width: 8px; height: 6px; background: #121316;
                clip-path: polygon(0 0, 100% 0, 100% 33%, 66% 33%, 66% 66%, 33% 66%, 33% 100%, 0 100%); }
            .pb-bubble.is-below::after { bottom: auto; top: -8px; transform: scaleY(-1); }
            .pb-tag { display: inline-block; margin: 0 0 5px; padding: 1px 5px; background: #121316; color: #FFED29;
                font-size: 9px; letter-spacing: 0.18em; }
            .pb-text { position: relative; display: block; }
            .pb-ghost { visibility: hidden; }
            .pb-type { position: absolute; inset: 0; }
            .pb-type::after { content: ''; display: inline-block; width: 6px; height: 11px; margin-left: 2px; vertical-align: -1px; background: #121316; animation: pbCaret 0.8s steps(1) infinite; }
            .pb-bubble.is-done .pb-type::after { display: none; }
            @keyframes pbCaret { 50% { opacity: 0; } }
            .pb-trail { position: fixed; inset: 0; z-index: 9999989; pointer-events: none; overflow: hidden; }
            .pb-dot { position: absolute; left: 0; top: 0; width: ${S}px; height: ${S}px; margin: ${-S / 2}px 0 0 ${-S / 2}px; background: #b89a2e;
                opacity: 0; animation: pbDot 3.4s linear forwards; will-change: opacity; }
            @keyframes pbDot { 0% { opacity: 0; } 5% { opacity: 0.9; } 70% { opacity: 0.9; } 100% { opacity: 0; } }
        `;
        doc.head.appendChild(style);

        const bug = doc.createElement('button');
        bug.type = 'button';
        bug.className = 'pb-bug';
        bug.setAttribute('aria-label', 'Glitch, the site guide. Press for a tip.');
        bug._hintBound = true;
        const shadow = doc.createElement('canvas');
        const body = doc.createElement('canvas');
        const fx = doc.createElement('canvas');
        shadow.className = 'pb-shadow';
        body.className = 'pb-body';
        fx.className = 'pb-fx';
        shadow.width = body.width = GW;
        shadow.height = body.height = GH;
        fx.width = FXW;
        fx.height = FXH;
        const rot = doc.createElement('div');
        rot.className = 'pb-rot';
        const glow = doc.createElement('span');
        glow.className = 'pb-glow';
        rot.append(glow, body);
        bug.append(shadow, rot, fx);
        const sctx = shadow.getContext('2d'), bctx = body.getContext('2d'), fctx = fx.getContext('2d');

        const bubble = doc.createElement('div');
        bubble.className = 'pb-bubble';
        bubble.setAttribute('role', 'status');
        bubble.setAttribute('aria-live', 'polite');
        bubble.innerHTML = '<span class="pb-tag"></span><span class="pb-text"><span class="pb-ghost"></span><span class="pb-type"></span></span>';
        const tag = bubble.querySelector('.pb-tag');
        let stored = null;
        try { stored = window.localStorage.getItem('pixelBugSkin'); } catch (e) { /* storage blocked */ }
        let skinKey = SKINS[window.__pixelBugSkin] ? window.__pixelBugSkin : SKINS[stored] ? stored : 'beetle';
        let skin = SKINS[skinKey];
        function applySkin() {
            tag.textContent = '[ ' + skin.name + ' ]';
            bug.classList.toggle('has-lantern', !!skin.lantern);
            bug.setAttribute('aria-label', skin.name.charAt(0) + skin.name.slice(1).toLowerCase() + ', the site guide. Press for a tip.');
        }
        applySkin();
        const ghost = bubble.querySelector('.pb-ghost');
        const typed = bubble.querySelector('.pb-type');
        const trail = doc.createElement('div');
        trail.className = 'pb-trail';
        trail.setAttribute('aria-hidden', 'true');
        doc.body.appendChild(trail);
        doc.body.appendChild(bubble);
        doc.body.appendChild(bug);

        function dot(px, py) {
            const d = doc.createElement('span');
            d.className = 'pb-dot';
            d.style.transform = 'translate3d(' + (Math.round(px / S) * S) + 'px,' + (Math.round(py / S) * S) + 'px,0)';
            d.addEventListener('animationend', () => d.remove(), { once: true });
            trail.appendChild(d);
            if (trail.childElementCount > 140) trail.firstElementChild.remove();
        }

        const cursorDot = doc.getElementById('siteCursorDot');
        const cursorLabel = doc.getElementById('cursorLabel');
        const cursorText = cursorLabel && cursorLabel.querySelector('.js-text-container');
        function label(text) {
            if (!cursorLabel) return;
            if (text) {
                if (cursorText) cursorText.textContent = text;
                cursorLabel.style.opacity = '1';
                if (cursorDot) cursorDot.classList.add('is-hovering');
            } else {
                cursorLabel.style.opacity = '0';
                if (cursorDot) cursorDot.classList.remove('is-hovering');
            }
        }

        let vw = window.innerWidth, vh = window.innerHeight;
        const HALF = BOX * S / 2;
        const home = () => ({ x: 70, y: vh - 60 });
        const SPEED = { roam: 85, scuttle: 230, circle: 70, visit: 260, fly: 340 };
        // (x, y) is the centre of the bug; heading 0 points right
        let x = reduced ? home().x : -30, y = home().y;
        let heading = 0, speed = 0, entered = reduced;
        let act = reduced ? null : { type: 'roam', pts: [{ x: 190, y: home().y - 30 }], i: 0 };
        let pauseUntil = 0, stride = 0, stepSide = 1, nextInterest = 0, lastVisit = 0;
        let state = 'idle', hover = false, happy = 0, squash = 0, lift = 0, wob = 0, flipUntil = 0, flips = 0;
        let lastActive = performance.now(), clock = 0, travelled = 0, lastCaughtSay = -1e9;
        let twitch = 0, twitchSide = 'L', nextTwitch = 1.5;
        const mouse = { x: -1, y: -1, t: 0, vx: 0, seen: false, travel: 0 };
        const parts = [];

        window.addEventListener('resize', () => {
            vw = window.innerWidth;
            vh = window.innerHeight;
        }, { passive: true });

        function wake() {
            lastActive = performance.now();
            if (state === 'sleep') {
                state = 'idle';
                spawn('bang');
            }
        }

        doc.addEventListener('pointermove', (e) => {
            const now = performance.now();
            if (mouse.t) {
                mouse.vx = (e.clientX - mouse.x) / Math.max(1, now - mouse.t) * 1000;
                mouse.travel += Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y);
            }
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.t = now;
            mouse.seen = true;
            wake();
        }, { passive: true });

        const scroller = doc.querySelector('.js-scroller');
        const scrollTop = () => (scroller ? scroller.scrollTop : window.scrollY);
        // Scroll velocity is smoothed in the listener itself (Lenis writes scrollTop each frame), so detection
        // doesn't depend on the render loop's frame rate; a sustained fast stretch arms a takeoff for the loop
        let lastSt = scrollTop(), lastStAt = performance.now(), scrollV = 0, fastStart = 0, scrollArmed = 0;
        let lastScrollMove = -1e9, lastScrollFly = -1e9, lastScrollSay = -1e9;
        (scroller || window).addEventListener('scroll', () => {
            const now = performance.now(), st = scrollTop();
            const ms = now - lastStAt;
            if (ms > 0) {
                const v = (st - lastSt) / ms * 1000;
                scrollV += (v - scrollV) * (1 - Math.exp(-ms / 60));
            }
            if (Math.abs(st - lastSt) > 0.5) lastScrollMove = now;
            if (Math.abs(scrollV) > 1800) {
                if (!fastStart) fastStart = now;
                else if (now - fastStart > 120) scrollArmed = Math.sign(scrollV);
            } else {
                fastStart = 0;
            }
            lastSt = st;
            lastStAt = now;
            lastActive = now;
        }, { passive: true });

        function spawn(kind, n) {
            const count = n || 1;
            for (let i = 0; i < count; i++) {
                parts.push({
                    kind,
                    x: FXW / 2 - 3 + (Math.random() * 6 | 0),
                    y: FXH - BOX / 2 - 12,
                    age: -i * 0.18,
                    life: kind === 'bang' ? 0.7 : kind === 'z' ? 2.2 : 1.3,
                    drift: Math.random() < 0.5 ? -1 : 1,
                });
            }
        }

        // --- Speech bubble with a fixed footprint so typing never reflows it
        const queue = [];
        let say = null;
        function speak(text, now) {
            ghost.textContent = text;
            typed.textContent = '';
            bubble.classList.remove('is-done');
            bubble.classList.add('is-on');
            say = { text, start: now, hold: 1900 + text.length * 48, bw: bubble.offsetWidth, bh: bubble.offsetHeight };
        }
        function enqueue(text) {
            if (queue.indexOf(text) < 0) queue.push(text);
        }
        function hush() {
            say = null;
            bubble.classList.remove('is-on');
            lastActive = performance.now();
        }

        // --- Section awareness: one line the first time each section settles under the viewport centre
        const hero = doc.querySelector('.sticky-hero-viewport');
        const heroSection = hero && hero.parentElement;
        const card = doc.getElementById('heroShrinkCard');
        const SECTIONS = [
            ['projects', doc.getElementById('section-projects')],
            ['services', doc.querySelector('.ll-section--services')],
            ['logos', doc.querySelector('.ll-section--logos')],
        ].filter((s) => s[1]);
        const seen = {}, told = {};
        let section = '', sectionSince = 0;
        function detect(now) {
            const mid = vh * 0.5;
            let key = '';
            if (heroSection) {
                const r = heroSection.getBoundingClientRect();
                if (r.top <= mid && r.bottom >= mid) {
                    const cw = card ? card.getBoundingClientRect().width : vw;
                    key = cw < vw * 0.7 ? 'screen' : 'hero';
                }
            }
            if (!key) {
                for (const [k, el] of SECTIONS) {
                    const r = el.getBoundingClientRect();
                    if (r.top <= mid && r.bottom >= mid) { key = k; break; }
                }
            }
            if (key !== section) {
                section = key;
                sectionSince = now;
            } else if (key && !seen[key] && now - sectionSince > 700 && state !== 'held') {
                seen[key] = true;
                told[key] = 1;
                if (state === 'sleep') wake();
                spawn('bang');
                enqueue(LINES[key][0]);
            }
        }

        // --- Boop / drag
        let press = null, pets = 0;
        bug.addEventListener('pointerenter', () => { hover = true; label('[ BOOP ]'); });
        bug.addEventListener('pointerleave', () => { hover = false; if (state !== 'held') label(''); });
        bug.addEventListener('pointerdown', (e) => {
            press = { x: e.clientX, y: e.clientY, ox: e.clientX - x, oy: e.clientY - y };
            bug.setPointerCapture(e.pointerId);
        });
        bug.addEventListener('pointermove', (e) => {
            if (!press || reduced) return;
            if (state !== 'held' && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) {
                state = 'held';
                hush();
                label('[ WHEE ]');
            }
        });
        function release(e) {
            if (!press) return;
            const now = performance.now();
            if (state === 'held') {
                // Dropped bugs land on their back and flail until they right themselves
                state = 'flip';
                flipUntil = now + 1300;
                speed = 0;
                act = null;
                squash = 0.25;
                flips++;
                if (flips === 1 || Math.random() < 0.4) speak(LINES.flip[(flips - 1) % LINES.flip.length], now);
                label(hover ? '[ BOOP ]' : '');
            } else {
                pet(now);
            }
            press = null;
            if (e && bug.hasPointerCapture(e.pointerId)) bug.releasePointerCapture(e.pointerId);
        }
        bug.addEventListener('pointerup', release);
        bug.addEventListener('pointercancel', release);
        bug.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hush();
        });
        bug.addEventListener('click', (e) => {
            if (e.detail === 0) pet(performance.now());
        });

        function pet(now) {
            wake();
            happy = 1.6;
            squash = 0.2;
            spawn('heart', 3);
            pets++;
            queue.length = 0;
            const lines = section && LINES[section];
            if (pets % 2 === 1 && lines) {
                const i = (told[section] || 0) % lines.length;
                told[section] = i + 1;
                speak(lines[i], now);
            } else {
                speak(LINES.pet[(pets >> 1) % LINES.pet.length], now);
            }
        }

        function caught(now) {
            happy = 2.2;
            spawn('heart');
            if (!say && !queue.length && now - lastCaughtSay > 7000) {
                lastCaughtSay = now;
                speak(LINES.caught[Math.random() * LINES.caught.length | 0], now);
            }
        }

        function drawParts() {
            fctx.clearRect(0, 0, FXW, FXH);
            for (const p of parts) {
                if (p.age < 0) continue;
                const rows = GLYPH[p.kind];
                const px = p.x + (p.kind === 'bang' ? 0 : Math.round(Math.sin(p.age * 5) * p.drift));
                const py = Math.round(p.y - p.age * (p.kind === 'bang' ? 3 : p.kind === 'z' ? 5 : 7)) - rows.length;
                fctx.fillStyle = PAL.k;
                rows.forEach((row, ry) => {
                    for (let rx = 0; rx < row.length; rx++) {
                        if (row[rx] === '.') continue;
                        fctx.fillRect(px + rx - 1, py + ry, 3, 1);
                        fctx.fillRect(px + rx, py + ry - 1, 1, 3);
                    }
                });
                fctx.fillStyle = PAL.y;
                rows.forEach((row, ry) => {
                    for (let rx = 0; rx < row.length; rx++) if (row[rx] !== '.') fctx.fillRect(px + rx, py + ry, 1, 1);
                });
            }
        }

        let last = performance.now(), nextDetect = 0, nextZ = 0, lastKey = '';
        const mountedAt = last;
        function loop(now) {
            // rAF timestamps can trail performance.now(), so the first step may come out negative
            const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
            last = Math.max(last, now);
            clock += dt;
            happy = Math.max(0, happy - dt);
            squash = Math.max(0, squash - dt);

            if (now > nextDetect) {
                detect(now);
                nextDetect = now + 250;
            }

            if ((state === 'idle' || state === 'walk' || state === 'groom') && now - lastActive > 18000 && !say && !queue.length) {
                state = 'sleep';
                speed = 0;
                act = null;
                hush();
            }

            const minX = 24, maxX = vw - 24, minY = 30, maxY = vh - 30;
            const clampX = (v) => Math.max(minX, Math.min(maxX, v));
            const clampY = (v) => Math.max(minY, Math.min(maxY, v));
            let liftTo = 0;

            // Fast scrolling blows it off its feet: a short flight that drifts with the scroll and lands once it settles
            if (now - lastScrollMove > 120) {
                scrollV *= Math.exp(-dt * 10);
                fastStart = 0;
            }
            const armed = scrollArmed;
            scrollArmed = 0;
            if (armed && !(act && act.scroll) && now - lastScrollFly > 6000 && state !== 'held' && state !== 'flip' && !reduced) {
                lastScrollFly = now;
                if (state === 'sleep') {
                    state = 'idle';
                    spawn('bang');
                }
                act = { type: 'fly', phase: 'air', scroll: true, dir: armed, until: now + 5000,
                    pts: [{ x: clampX(x + (Math.random() - 0.5) * 220), y }], i: 0 };
                squash = 0.15;
                if (!say && !queue.length && now - lastScrollSay > 12000) {
                    lastScrollSay = now;
                    const pool = LINES.scroll.concat(skin.scroll);
                    speak(pool[Math.random() * pool.length | 0], now);
                }
            }

            if (state === 'held') {
                x = mouse.x - press.ox;
                y = mouse.y - press.oy;
                wob += (Math.max(-40, Math.min(40, -mouse.vx * 0.04)) - wob) * Math.min(1, dt * 10);
                mouse.vx *= 0.9;
                liftTo = 0.55;
            } else if (state === 'flip') {
                wob *= 0.85;
                if (now > flipUntil) {
                    state = 'idle';
                    squash = 0.2;
                    pauseUntil = now + 500;
                }
            } else if (state !== 'sleep' && !reduced) {
                wob *= 0.8;
                const near = Math.hypot(mouse.x - x, mouse.y - y) < 26;
                const cursorLive = mouse.seen && now - mouse.t < 1500;

                // A lot of cursor movement sometimes catches its eye, but it won't drop everything every time
                if (now > nextInterest) {
                    nextInterest = now + 1600;
                    const busy = act && (act.type === 'visit' || act.type === 'fly');
                    if (!busy && cursorLive && mouse.travel > 260 && Math.random() < 0.35) act = { type: 'visit', until: now + 4200 };
                    mouse.travel = 0;
                }
                if ((near || hover) && act && act.type === 'visit') {
                    act = null;
                    pauseUntil = now + 1000;
                }

                if (!act && now > pauseUntil && !near && !hover) {
                    const spot = (lo, hi) => {
                        let gx = x, gy = y;
                        for (let i = 0; i < 10; i++) {
                            gx = minX + 30 + Math.random() * Math.max(0, maxX - minX - 60);
                            gy = minY + 30 + Math.random() * Math.max(0, maxY - minY - 60);
                            const d = Math.hypot(gx - x, gy - y);
                            if (d > lo && d < hi) break;
                        }
                        return { x: gx, y: gy };
                    };
                    // While it's talking it only picks calm things so the bubble stays readable
                    const menu = say
                        ? [['pause', 3], ['groom', 2]]
                        : [['roam', 28], ['scuttle', 16], ['pause', 16], ['groom', 12], ['circle', 8], ['fly', 8],
                            ['visit', mouse.seen && now - lastVisit > 9000 ? 7 : 0]];
                    let roll = Math.random() * menu.reduce((a, m) => a + m[1], 0);
                    let type = menu[0][0];
                    for (const [t, w] of menu) { if ((roll -= w) < 0) { type = t; break; } }

                    if (type === 'roam') {
                        act = { type, pts: [spot(120, 380)], i: 0 };
                    } else if (type === 'scuttle') {
                        // Short zigzag burst, the way beetles dart between cover
                        const pts = [], turn = Math.random() < 0.5 ? 1 : -1;
                        let a = heading + (Math.random() - 0.5) * 1.6, px = x, py = y;
                        for (let k = 0; k < 3; k++) {
                            const d = 50 + Math.random() * 60;
                            px = clampX(px + Math.cos(a) * d);
                            py = clampY(py + Math.sin(a) * d);
                            pts.push({ x: px, y: py });
                            a += turn * (k % 2 ? 0.9 : -0.9);
                        }
                        act = { type, pts, i: 0 };
                    } else if (type === 'circle') {
                        // Investigates a small patch in a tight loop
                        const r = 18, pts = [], dir = Math.random() < 0.5 ? 1 : -1;
                        const ccx = clampX(x + Math.cos(heading) * r), ccy = clampY(y + Math.sin(heading) * r);
                        for (let k = 1; k <= 10; k++) {
                            const a = heading + Math.PI + dir * k * Math.PI / 5;
                            pts.push({ x: ccx + Math.cos(a) * r, y: ccy + Math.sin(a) * r });
                        }
                        act = { type, pts, i: 0 };
                    } else if (type === 'fly') {
                        act = { type, phase: 'warm', until: now + 520, pts: [spot(260, 620)], i: 0 };
                    } else if (type === 'visit') {
                        act = { type, until: now + 4200 };
                    } else {
                        act = { type, until: now + (type === 'groom' ? 1600 + Math.random() * 1000 : 800 + Math.random() * 1400) };
                    }
                }

                let target = 0, goal = null;
                if (act && act.type === 'visit') {
                    const dx = x - mouse.x, dy = y - mouse.y, d = Math.hypot(dx, dy) || 1;
                    goal = { x: clampX(mouse.x + dx / d * 38), y: clampY(mouse.y + dy / d * 38) };
                    if (now > act.until) {
                        act = { type: 'pause', until: now + 900 };
                        goal = null;
                    }
                } else if (act && act.type === 'fly') {
                    if (act.phase === 'warm') {
                        if (now > act.until) act.phase = 'air';
                    } else if (act.phase === 'air') {
                        if (act.scroll) {
                            if (now - lastScrollMove < 450 && now < act.until) {
                                if (Math.abs(scrollV) > 200) act.dir = Math.sign(scrollV);
                                act.pts[0].y = y + act.dir * 140;
                            } else {
                                act.scroll = false;
                                act.pts[0] = { x: x + Math.cos(heading) * 70, y: y + Math.sin(heading) * 70 };
                            }
                        }
                        goal = { x: clampX(act.pts[0].x), y: clampY(act.pts[0].y) };
                        liftTo = 1;
                    } else if (now > act.until) {
                        act = null;
                        pauseUntil = now + 500 + Math.random() * 600;
                    }
                } else if (act && act.pts) {
                    const p = act.pts[act.i];
                    goal = { x: clampX(p.x), y: clampY(p.y) };
                } else if (act && now > act.until) {
                    act = null;
                    pauseUntil = now + 200 + Math.random() * 600;
                }

                // After a visit it keeps turning to face the cursor
                if (!goal && act && act.face && cursorLive) {
                    let da = Math.atan2(mouse.y - y, mouse.x - x) - heading;
                    da = Math.atan2(Math.sin(da), Math.cos(da));
                    heading += Math.max(-10 * dt, Math.min(10 * dt, da));
                }

                if (goal) {
                    const dx = goal.x - x, dy = goal.y - y, dist = Math.hypot(dx, dy);
                    const through = act.pts && act.i < act.pts.length - 1;
                    if (dist < (through ? 12 : 6)) {
                        if (act.type === 'visit') {
                            if (travelled > 100) caught(now);
                            lastVisit = now;
                            act = { type: 'pause', until: now + 2400, face: true };
                        } else if (act.type === 'fly') {
                            act.phase = 'land';
                            act.until = now + 340;
                        } else if (through) {
                            act.i++;
                        } else {
                            pauseUntil = now + (act.type === 'scuttle' ? 150 + Math.random() * 400 : 300 + Math.random() * 800);
                            act = null;
                        }
                        travelled = 0;
                    } else {
                        // Pivots hard when slow, arcs when running, barely steers in the air
                        const want = Math.atan2(dy, dx) + (act.type === 'roam' ? Math.sin(clock * 7.3) * 0.35 : 0);
                        let da = want - heading;
                        da = Math.atan2(Math.sin(da), Math.cos(da));
                        const turn = (act.type === 'fly' ? 4.5 : speed < 50 ? 18 : 9) * dt;
                        heading += Math.max(-turn, Math.min(turn, da));
                        const top = act.type === 'visit' ? Math.min(SPEED.visit, 90 + dist * 0.9) : SPEED[act.type];
                        target = through ? top : Math.min(top, Math.sqrt(2 * 1800 * Math.max(0, dist - 4)));
                        if (Math.abs(da) > 1.6 && act.type !== 'fly') target = Math.min(target, 40);
                    }
                }
                const flying = act && act.type === 'fly';
                speed += Math.max((flying ? -900 : -2600) * dt, Math.min((flying ? 700 : 1500) * dt, target - speed));
                x += Math.cos(heading) * speed * dt;
                y += Math.sin(heading) * speed * dt;
                if (x > minX) entered = true;
                if (entered) {
                    x = clampX(x);
                    y = clampY(y);
                }
                travelled += speed * dt;

                // Six feet, one pair of track dots per step, only while it's on the ground
                if (speed > 20 && lift < 0.1) {
                    const prev = Math.floor(stride);
                    stride += speed * dt / 7;
                    if (Math.floor(stride) !== prev) {
                        stepSide = -stepSide;
                        const c = Math.cos(heading), s = Math.sin(heading);
                        dot(x - s * 8 * stepSide + c * 5, y + c * 8 * stepSide + s * 5);
                        dot(x + s * 8 * stepSide - c * 4, y - c * 8 * stepSide - s * 4);
                    }
                }
                state = flying ? 'fly' : speed > 20 ? 'walk' : act && act.type === 'groom' ? 'groom' : 'idle';
            }
            lift += (liftTo - lift) * Math.min(1, dt * 6);

            nextTwitch -= dt;
            if (nextTwitch <= 0) {
                twitch = 0.35;
                twitchSide = Math.random() < 0.5 ? 'L' : 'R';
                nextTwitch = 1 + Math.random() * 2.5;
            }
            twitch = Math.max(0, twitch - dt);

            // Firefly lantern: a short flash every couple of seconds, a slow glow while napping, full beam when happy
            let lantern = 0;
            if (skin.lantern) {
                const ph = (clock % 2.2) / 2.2;
                lantern = state === 'sleep' ? 0.2 + Math.sin(clock * 1.2) * 0.12 : Math.max(0.12, ph < 0.35 ? Math.sin(ph / 0.35 * Math.PI) : 0);
                if (happy > 0 || state === 'fly') lantern = 1;
                glow.style.opacity = (lantern * 0.95).toFixed(2);
            }
            const pose = { skin: skinKey, legs: 'stand', antL: 'out', antR: 'out', fly: 0, belly: false, happy: false, lit: lantern > 0.45 };
            const talking = say && now - say.start < say.text.length * 31;
            if (state === 'walk') {
                pose.legs = ['a', 'stand', 'b', 'stand'][Math.floor(stride) % 4];
                if (speed > 180) pose.antL = pose.antR = 'wide';
            } else if (state === 'fly') {
                pose.fly = Math.floor(clock / (skin.wings === 'moth' ? 0.08 : 0.035)) % 2 ? 1 : 2;
                pose.legs = act && act.phase === 'warm' ? 'stand' : 'tuck';
                pose.antL = pose.antR = 'wide';
            } else if (state === 'groom') {
                const left = Math.floor(clock / 0.18) % 2 === 0;
                pose.legs = left ? 'groomL' : 'groomR';
                if (left) pose.antL = 'down'; else pose.antR = 'down';
            } else if (state === 'sleep') {
                pose.legs = 'tuck';
                pose.antL = pose.antR = 'down';
                if (clock > nextZ) {
                    spawn('z');
                    nextZ = clock + 1.7;
                }
            } else if (state === 'held') {
                pose.legs = Math.floor(clock / 0.09) % 2 ? 'flail0' : 'flail1';
                pose.antL = pose.antR = 'wide';
            } else if (state === 'flip') {
                pose.belly = true;
                pose.legs = Math.floor(clock / 0.06) % 2 ? 'flail0' : 'flail1';
                pose.antL = pose.antR = 'wide';
            } else {
                if (twitch > 0) pose[twitchSide === 'L' ? 'antL' : 'antR'] = 'up';
                if (talking) {
                    const up = Math.floor(clock / 0.15) % 2 === 0;
                    pose.antL = up ? 'up' : 'out';
                    pose.antR = up ? 'out' : 'up';
                }
            }
            if (happy > 0 && state !== 'sleep' && state !== 'held' && state !== 'flip') {
                pose.happy = true;
                pose.antL = pose.antR = 'up';
            }

            for (let i = parts.length - 1; i >= 0; i--) {
                parts[i].age += dt;
                if (parts[i].age > parts[i].life) parts.splice(i, 1);
            }

            const spr = compose(pose);
            const key = JSON.stringify(pose);
            if (key !== lastKey) {
                lastKey = key;
                bctx.clearRect(0, 0, GW, GH);
                bctx.drawImage(spr.img, 0, 0);
                sctx.clearRect(0, 0, GW, GH);
                sctx.drawImage(spr.sil, 0, 0);
            }
            drawParts();

            // Pixel art rotates in 16 snapped steps so it never smears between angles
            const STEP = 22.5;
            let deg = Math.round((heading + Math.PI / 2) * 180 / Math.PI / STEP) * STEP;
            deg += Math.round(wob / STEP) * STEP;
            if (happy > 1.2 && state === 'idle') deg += Math.floor(clock / 0.12) % 2 ? STEP : -STEP;
            if (state === 'flip') deg += Math.floor(clock / 0.2) % 2 ? STEP : 0;
            const sc = (1 + lift * 0.18) * (1 + squash * 0.4);
            rot.style.transform = 'rotate(' + deg + 'deg) scale(' + sc.toFixed(3) + ')';
            shadow.style.transform = 'translate3d(' + Math.round(3 + lift * 16) + 'px,' + Math.round(4 + lift * 22) + 'px,0) rotate(' + deg + 'deg)';
            shadow.style.opacity = (0.26 - lift * 0.12).toFixed(3);

            const tx = Math.round((x - HALF) / S) * S;
            const ty = Math.round((y - HALF) / S) * S;
            bug.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';

            if (!say && queue.length && now - mountedAt > 1100 && state !== 'held' && state !== 'sleep') speak(queue.shift(), now);
            if (say) {
                const n = Math.min(say.text.length, Math.floor((now - say.start) / 31));
                if (typed.textContent.length !== n) typed.textContent = say.text.slice(0, n);
                if (n >= say.text.length) bubble.classList.add('is-done');
                const cx = tx + HALF, cy = ty + HALF;
                const bx = Math.max(12, Math.min(vw - say.bw - 12, cx - 30));
                let by = cy - 38 - say.bh;
                const below = by < 12;
                if (below) by = cy + 38;
                bubble.classList.toggle('is-below', below);
                bubble.style.transform = 'translate3d(' + bx + 'px,' + by + 'px,0)';
                bubble.style.setProperty('--tail', Math.max(8, Math.min(say.bw - 20, cx - bx - 4)) + 'px');
                if (now - say.start > say.hold) hush();
            }

            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);

        enqueue(skin.welcome);
        window.__pixelBugSetSkin = (key) => {
            if (!SKINS[key] || key === skinKey) return;
            skinKey = key;
            skin = SKINS[key];
            applySkin();
            glow.style.opacity = '0';
            hush();
            queue.length = 0;
            wake();
            spawn('bang');
            squash = 0.25;
            speak(skin.welcome, performance.now());
        };
        window.__pixelBugState = () => ({ state, x, y, section, say: say && say.text, parts: parts.length, act: act && act.type, speed, lift, skin: skinKey, scrollV: Math.round(scrollV), scrollFly: !!(act && act.scroll) });
        if (window.__pixelBugDebug) window.__pixelBugDebug = { compose, PAL, GW, GH, SKINS: Object.keys(SKINS) };
    }

    function ready() {
        if (doc.body && doc.body.classList.contains('is-loaded')) mount();
        else setTimeout(ready, 200);
    }
    ready();
})();
