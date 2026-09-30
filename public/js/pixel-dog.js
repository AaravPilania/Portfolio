// BYTE: front-facing pixel office dog that chases the cursor anywhere on screen and narrates each section.
// Self-mounting once the intro has handed over (body.is-loaded). Pet (click), drag, or leave it to nap.
(function () {
    'use strict';
    if (window.__pixelDog) return;
    window.__pixelDog = true;

    const doc = document;
    const S = 2;                      // CSS px per sprite pixel
    const CW = 40, CH = 44;           // canvas in sprite px: dog + headroom for hearts / Zs
    const OX = 6, OY = 15;            // dog sprite origin inside the canvas
    const DW = 28, DH = 28;           // dog sprite size
    const PAL = { k: '#121316', w: '#f4f2ea', s: '#b9b5a8', y: '#FFED29', t: '#ff7a8a' };
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Left half of the face-on sprite; the right half is its mirror
    const HEAD = [
        '..............',
        '........kkkkkk',
        '......kkwwwwww',
        '.....kwwwwwwww',
        '..kkkwwwwwwwww',
        '.kssskwwwwwwww',
        'ksssskwwwwwwww',
        'ksssskwwwwwwww',
        'ksssskwwwwwwww',
        'ksssskwwwwwwww',
        'ksssskwwwwwwww',
        'ksssskwwwwwwww',
        '.kssskwwwwwwww',
        '..kkk.kwwwwwww',
        '......kwwwwwww',
        '.......kwwwwww',
        '........kkwwww',
    ];
    const BODY = [
        '.......kkkkkkk',
        '.......kyyyyyy',
        '.......kwwwwww',
        '......kwwwwwww',
        '......kwwwwwww',
    ];
    const LEG = {
        down: [
            '......kwwkwwws',
            '......kwwkwwws',
            '.....kwwwkwwws',
            '.....kwwwkwwwk',
            '.....kkkkkwkwk',
            '.........kkkkk',
        ],
        up: [
            '......kwwkwwws',
            '......kwwkwwws',
            '.....kwwwkwwwk',
            '.....kwwwkwkwk',
            '.....kkkkkkkkk',
            '..............',
        ],
        tuck: [
            '..............',
            '..............',
            '.......kkkkkk.',
            '.......kwkwwk.',
            '.......kkkkkk.',
            '..............',
        ],
    };
    const PATCH = [[17, 7, 19], [16, 8, 20], [16, 9, 20], [16, 10, 20], [17, 11, 19]];
    const TAIL = {
        a: ['....k.', '...kwk', '...kwk', '..kwk.', '..kwk.', '.kwk..', 'kwk...', 'kk....'],
        b: ['......', '....kk', '...kwk', '..kwk.', '..kwk.', '.kwk..', 'kwk...', 'kk....'],
        down: ['......', '......', '......', '......', 'k.....', 'wk....', 'kwk...', '.kk...'],
    };
    const EYE = {
        open: ['.kk', 'kkk', 'kkk'],
        shut: ['...', 'kkk', '...'],
        happy: ['.k.', 'k.k', '...'],
        wide: ['kkk', 'kwk', 'kkk'],
    };
    const GLYPH = {
        heart: ['yy.yy', 'yyyyy', '.yyy.', '..y..'],
        z: ['yyyy', '..y.', '.y..', 'yyyy'],
        bang: ['y', 'y', 'y', '.', 'y'],
    };

    const LINES = {
        welcome: ['woof. i\'m byte, the office dog. i\'ll tag along.'],
        hero: ['move your cursor. he follows it with his eyes. so do i.', 'psst. i\'m draggable. be gentle.'],
        screen: ['same guy, smaller screen. the words run right through it.', 'keep it simple, stupid. his words, not mine.'],
        about: ['the short version of the human. worth a sniff.', 'he writes code like i chase tennis balls. obsessively.'],
        projects: ['the good bones are buried here. hover one to dig in.', 'every one of these kept him up past my walk time.'],
        services: ['how he pays rent. and my kibble.', 'party tricks, he calls them. i call them fetch.'],
        logos: ['people he\'s worked with. i\'ve barked at all of them.', 'nice people. excellent snacks.'],
        pet: ['good human.', 'again. do it again.', '*tail intensifies*', 'you smell like coffee and deadlines.'],
        caught: ['got you.', 'caught it. what\'s my prize?', 'tag. you\'re it.', '*pant pant* again?', 'fast, huh?', 'that cursor never stood a chance.'],
    };

    function blank() {
        const g = [];
        for (let y = 0; y < DH; y++) g.push(new Array(DW).fill('.'));
        return g;
    }
    function put(g, x, y, c) {
        if (y >= 0 && y < DH && x >= 0 && x < DW) g[y][x] = c;
    }
    function stamp(g, rows, ox, oy) {
        rows.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) if (row[x] !== '.') put(g, ox + x, oy + y, row[x]);
        });
    }
    function half(g, rows, oy, side) {
        rows.forEach((row, y) => {
            for (let x = 0; x < 14; x++) {
                const c = row[x];
                if (c === '.') continue;
                if (side <= 0) put(g, x, oy + y, c);
                if (side >= 0) put(g, DW - 1 - x, oy + y, c);
            }
        });
    }

    // pose: { legs: 'stand'|'walkL'|'walkR'|'tuck', tail, eyes, lookX, lookY, tongue, blush, lie }
    const cache = new Map();
    function compose(p) {
        const key = JSON.stringify(p);
        if (cache.has(key)) return cache.get(key);
        const g = blank();
        const dy = p.lie ? 4 : 0;
        stamp(g, TAIL[p.tail], 20, 13 + dy);
        half(g, HEAD, dy, 0);
        half(g, BODY, 17 + dy, 0);
        if (p.lie) {
            half(g, LEG.tuck, 20, 0);
        } else {
            half(g, p.legs === 'walkL' ? LEG.up : LEG.down, 22, -1);
            half(g, p.legs === 'walkR' ? LEG.up : LEG.down, 22, 1);
        }
        PATCH.forEach(([x0, y, x1]) => {
            for (let x = x0; x <= x1; x++) if (g[y + dy][x] === 'w') g[y + dy][x] = 's';
        });
        const eye = EYE[p.eyes];
        const lx = p.lookX || 0, ly = p.lookY || 0;
        [[8, 8], [17, 8]].forEach(([ex, ey]) => {
            for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
                const c = eye[y][x];
                if (c !== '.') put(g, ex + x + lx, ey + y + ly + dy, c);
            }
        });
        stamp(g, ['kkkk', '.kk.'], 12, 12 + dy);
        if (p.tongue) {
            stamp(g, ['.kk.', 'kttk', 'kttk', 'kttk', '.kk.'], 12, 14 + dy);
        } else {
            stamp(g, ['..kk..', 'kk..kk'], 11, 14 + dy);
        }
        if (p.blush) {
            put(g, 7, 13 + dy, 't');
            put(g, 20, 13 + dy, 't');
        }
        stamp(g, ['yy', 'yy'], 13, 19 + dy);
        cache.set(key, g);
        return g;
    }

    function mount() {
        const style = doc.createElement('style');
        style.textContent = `
            .pd-dog { position: fixed; left: 0; top: 0; z-index: 9999990; width: ${CW * S}px; height: ${CH * S}px;
                padding: 0; margin: 0; border: 0; background: none; cursor: none; touch-action: none;
                transform-origin: 50% 100%; will-change: transform; -webkit-tap-highlight-color: transparent; }
            .pd-dog:focus-visible { outline: 1px dashed #FFED29; outline-offset: 2px; }
            .pd-dog canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; image-rendering: crisp-edges; pointer-events: none; }
            .pd-bubble { position: fixed; left: 0; top: 0; z-index: 9999991; max-width: 15.5rem; pointer-events: none;
                padding: 9px 12px 10px; background: #f4f2ea; color: #121316;
                font: 500 11.5px/1.45 'IBM Plex Mono', 'Sometype Mono', monospace; letter-spacing: 0.01em;
                box-shadow: 0 -2px 0 0 #121316, 0 2px 0 0 #121316, -2px 0 0 0 #121316, 2px 0 0 0 #121316, 5px 5px 0 0 rgba(18,19,22,0.28);
                opacity: 0; transition: opacity 0.18s steps(3); will-change: transform, opacity; }
            .pd-bubble.is-on { opacity: 1; }
            .pd-bubble::after { content: ''; position: absolute; left: var(--tail, 24px); bottom: -8px; width: 8px; height: 6px; background: #121316;
                clip-path: polygon(0 0, 100% 0, 100% 33%, 66% 33%, 66% 66%, 33% 66%, 33% 100%, 0 100%); }
            .pd-bubble.is-below::after { bottom: auto; top: -8px; transform: scaleY(-1); }
            .pd-tag { display: inline-block; margin: 0 0 5px; padding: 1px 5px; background: #121316; color: #FFED29;
                font-size: 9px; letter-spacing: 0.18em; }
            .pd-body { position: relative; display: block; }
            .pd-ghost { visibility: hidden; }
            .pd-type { position: absolute; inset: 0; }
            .pd-type::after { content: ''; display: inline-block; width: 6px; height: 11px; margin-left: 2px; vertical-align: -1px; background: #121316; animation: pdCaret 0.8s steps(1) infinite; }
            .pd-bubble.is-done .pd-type::after { display: none; }
            @keyframes pdCaret { 50% { opacity: 0; } }
        `;
        doc.head.appendChild(style);

        const dog = doc.createElement('button');
        dog.type = 'button';
        dog.className = 'pd-dog';
        dog.setAttribute('aria-label', 'Byte, the site guide. Press for a tip.');
        dog._hintBound = true;
        const canvas = doc.createElement('canvas');
        canvas.width = CW;
        canvas.height = CH;
        dog.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const bubble = doc.createElement('div');
        bubble.className = 'pd-bubble';
        bubble.setAttribute('role', 'status');
        bubble.setAttribute('aria-live', 'polite');
        bubble.innerHTML = '<span class="pd-tag">[ BYTE ]</span><span class="pd-body"><span class="pd-ghost"></span><span class="pd-type"></span></span>';
        const ghost = bubble.querySelector('.pd-ghost');
        const typed = bubble.querySelector('.pd-type');
        doc.body.appendChild(bubble);
        doc.body.appendChild(dog);

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
        const W = CW * S, H = CH * S;
        // Sprite-space anchors in CSS px from the canvas top-left
        const BODY_CX = (OX + DW / 2) * S, BODY_CY = (OY + DH / 2) * S;
        const home = () => ({ x: 24, y: vh - H - 8 });
        let x = home().x, y = -H, vx = 0, vy = 0;
        let state = reduced ? 'idle' : 'enter';
        if (reduced) y = home().y;
        let hover = false, happy = 0, squash = 0, hop = 0, rot = 0;
        let lastActive = performance.now(), nextBlink = 2, blink = 0, clock = 0;
        let travelled = 0, lastCaughtSay = -1e9;
        const mouse = { x: -1, y: -1, t: 0, vx: 0, seen: false };
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
            if (mouse.t) mouse.vx = (e.clientX - mouse.x) / Math.max(1, now - mouse.t) * 1000;
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.t = now;
            mouse.seen = true;
            wake();
        }, { passive: true });

        const scroller = doc.querySelector('.js-scroller');
        (scroller || window).addEventListener('scroll', wake, { passive: true });

        // --- Particles: hearts on pets and catches, Zs while napping, a bang when startled
        function spawn(kind, n) {
            const count = n || 1;
            for (let i = 0; i < count; i++) {
                parts.push({
                    kind,
                    x: OX + 10 + (Math.random() * 8 | 0),
                    y: OY + (kind === 'z' ? 4 : 0),
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
            ['about', doc.querySelector('.s.is-impact-home')],
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
            } else if (key && !seen[key] && now - sectionSince > 700 && state !== 'held' && state !== 'enter') {
                seen[key] = true;
                told[key] = 1;
                if (state === 'sleep') wake();
                spawn('bang');
                hop = 1;
                enqueue(LINES[key][0]);
            }
        }

        // --- Pet / drag
        let press = null, pets = 0;
        dog.addEventListener('pointerenter', () => { hover = true; label('[ PET ]'); });
        dog.addEventListener('pointerleave', () => { hover = false; if (state !== 'held') label(''); });
        dog.addEventListener('pointerdown', (e) => {
            press = { x: e.clientX, y: e.clientY, ox: e.clientX - x, oy: e.clientY - y };
            dog.setPointerCapture(e.pointerId);
        });
        dog.addEventListener('pointermove', (e) => {
            if (!press || reduced) return;
            if (state !== 'held' && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) {
                state = 'held';
                hush();
                label('[ WHEE ]');
            }
        });
        function release(e) {
            if (!press) return;
            if (state === 'held') {
                state = 'idle';
                vx = vy = 0;
                squash = 0.2;
                label(hover ? '[ PET ]' : '');
            } else {
                pet(performance.now());
            }
            press = null;
            if (e && dog.hasPointerCapture(e.pointerId)) dog.releasePointerCapture(e.pointerId);
        }
        dog.addEventListener('pointerup', release);
        dog.addEventListener('pointercancel', release);
        dog.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hush();
        });
        dog.addEventListener('click', (e) => {
            if (e.detail === 0) pet(performance.now());
        });

        function pet(now) {
            wake();
            happy = 1.6;
            hop = 1;
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
            hop = 1;
            spawn('heart');
            if (!say && !queue.length && now - lastCaughtSay > 7000) {
                lastCaughtSay = now;
                speak(LINES.caught[Math.random() * LINES.caught.length | 0], now);
            }
        }

        // --- Render
        function draw(g, bob) {
            ctx.clearRect(0, 0, CW, CH);
            if (state !== 'held') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fillRect(OX + 6, CH - 1, 16, 1);
                ctx.fillRect(OX + 8, CH - 2, 12, 1);
            }
            for (let gy = 0; gy < DH; gy++) {
                const row = g[gy];
                for (let gx = 0; gx < DW; gx++) {
                    const c = row[gx];
                    if (c === '.') continue;
                    ctx.fillStyle = PAL[c];
                    ctx.fillRect(OX + gx, OY + gy + bob, 1, 1);
                }
            }
            for (const p of parts) {
                if (p.age < 0) continue;
                const rows = GLYPH[p.kind];
                const px = p.x + (p.kind === 'bang' ? 0 : Math.round(Math.sin(p.age * 5) * p.drift));
                const py = Math.round(p.y - p.age * (p.kind === 'bang' ? 3 : p.kind === 'z' ? 5 : 7)) - rows.length;
                ctx.fillStyle = PAL.k;
                rows.forEach((row, ry) => {
                    for (let rx = 0; rx < row.length; rx++) {
                        if (row[rx] === '.') continue;
                        ctx.fillRect(px + rx - 1, py + ry, 3, 1);
                        ctx.fillRect(px + rx, py + ry - 1, 1, 3);
                    }
                });
                ctx.fillStyle = PAL.y;
                rows.forEach((row, ry) => {
                    for (let rx = 0; rx < row.length; rx++) if (row[rx] !== '.') ctx.fillRect(px + rx, py + ry, 1, 1);
                });
            }
        }

        let last = performance.now(), nextDetect = 0, nextZ = 0, stride = 0;
        const mountedAt = last;
        function loop(now) {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            clock += dt;
            happy = Math.max(0, happy - dt);
            squash = Math.max(0, squash - dt);
            hop = Math.max(0, hop - dt * 3.2);

            if (now > nextDetect) {
                detect(now);
                nextDetect = now + 250;
            }

            if (state === 'idle' || state === 'walk') {
                if (now - lastActive > 18000 && !say && !queue.length) {
                    state = 'sleep';
                    vx = vy = 0;
                    hush();
                }
            }

            const cx = x + BODY_CX, cy = y + BODY_CY;
            if (state === 'held') {
                x = mouse.x - press.ox;
                y = mouse.y - press.oy;
                rot += (Math.max(-18, Math.min(18, -mouse.vx * 0.02)) - rot) * Math.min(1, dt * 10);
                mouse.vx *= 0.9;
            } else if (state === 'enter') {
                vy += 2600 * dt;
                y += vy * dt;
                if (y >= home().y) {
                    y = home().y;
                    vy = 0;
                    squash = 0.2;
                    state = 'idle';
                    lastActive = now;
                }
            } else if (state !== 'sleep' && !reduced) {
                // Settles just below-right of the cursor; stands still once the cursor comes in to pet it
                let tx = cx, ty = cy;
                const near = Math.hypot(mouse.x - cx, mouse.y - cy) < 52;
                if (mouse.seen && !near && !hover) {
                    tx = mouse.x + 44;
                    ty = mouse.y + 40;
                }
                tx = Math.max(BODY_CX - OX * S, Math.min(vw - (W - BODY_CX) + OX * S, tx));
                ty = Math.max(BODY_CY - OY * S + 8, Math.min(vh - (H - BODY_CY), ty));
                const k = 70, c = 15;
                vx += ((tx - cx) * k - vx * c) * dt;
                vy += ((ty - cy) * k - vy * c) * dt;
                const sp = Math.hypot(vx, vy);
                if (sp > 2600) { vx *= 2600 / sp; vy *= 2600 / sp; }
                x += vx * dt;
                y += vy * dt;
                travelled += sp * dt;
                const moving = sp > 40;
                if (!moving && state === 'walk' && travelled > 140 && Math.hypot(tx - cx, ty - cy) < 14) {
                    travelled = 0;
                    caught(now);
                }
                state = moving ? 'walk' : 'idle';
                rot += (Math.max(-8, Math.min(8, vx * 0.006)) - rot) * Math.min(1, dt * 8);
            }

            nextBlink -= dt;
            if (nextBlink <= 0) {
                blink = 0.13;
                nextBlink = 2.5 + Math.random() * 3;
            }
            blink = Math.max(0, blink - dt);

            let lookX = 0, lookY = 0;
            if (state === 'walk') {
                lookX = Math.abs(vx) > 60 ? Math.sign(vx) : 0;
                lookY = Math.abs(vy) > 60 ? Math.sign(vy) : 0;
            } else if (mouse.seen) {
                const dx = mouse.x - (x + BODY_CX), dy = mouse.y - (y + BODY_CY * 0.6);
                lookX = Math.abs(dx) > 24 ? Math.sign(dx) : 0;
                lookY = Math.abs(dy) > 24 ? Math.sign(dy) : 0;
            }

            const pose = { legs: 'stand', tail: 'a', eyes: blink > 0 ? 'shut' : 'open', lookX, lookY, tongue: false, blush: false, lie: false };
            let bob = 0;
            const talking = say && now - say.start < say.text.length * 31;
            if (state === 'walk') {
                stride += Math.min(18, Math.hypot(vx, vy) / 40) * dt;
                const f = Math.floor(stride) % 4;
                pose.legs = ['walkL', 'stand', 'walkR', 'stand'][f];
                pose.tail = f < 2 ? 'a' : 'b';
                bob = f % 2 ? 0 : -1;
                pose.tongue = Math.hypot(vx, vy) > 700;
            } else if (state === 'sleep') {
                pose.lie = true;
                pose.eyes = 'shut';
                pose.tail = 'down';
                pose.lookX = pose.lookY = 0;
                bob = Math.floor(clock / 1.4) % 2;
                if (clock > nextZ) {
                    spawn('z');
                    nextZ = clock + 1.7;
                }
            } else if (state === 'held') {
                pose.tail = 'down';
                pose.eyes = 'wide';
                pose.lookX = pose.lookY = 0;
            } else {
                const wag = happy > 0 || hover ? 0.1 : 0.34;
                pose.tail = Math.floor(clock / wag) % 2 ? 'b' : 'a';
                pose.tongue = talking ? Math.floor(clock * 8) % 2 === 0 : false;
            }
            if (happy > 0 && state !== 'sleep' && state !== 'held') {
                pose.eyes = 'happy';
                pose.tongue = true;
                pose.blush = true;
                pose.lookX = pose.lookY = 0;
            }

            for (let i = parts.length - 1; i >= 0; i--) {
                parts[i].age += dt;
                if (parts[i].age > parts[i].life) parts.splice(i, 1);
            }

            draw(compose(pose), bob);

            const lift = hop > 0 ? Math.sin(hop * Math.PI) * 10 : 0;
            const sx = squash > 0 ? 1 + squash * 0.6 : 1;
            const sy = squash > 0 ? 1 - squash * 0.7 : 1;
            const tx = Math.round(x / S) * S;
            const ty = Math.round((y - lift) / S) * S;
            dog.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) rotate(' + rot.toFixed(2) + 'deg) scale(' + sx + ',' + sy + ')';

            if (!say && queue.length && now - mountedAt > 1100 && state !== 'held' && state !== 'enter' && state !== 'sleep') speak(queue.shift(), now);
            if (say) {
                const n = Math.min(say.text.length, Math.floor((now - say.start) / 31));
                if (typed.textContent.length !== n) typed.textContent = say.text.slice(0, n);
                if (n >= say.text.length) bubble.classList.add('is-done');
                const headX = tx + BODY_CX;
                const bx = Math.max(12, Math.min(vw - say.bw - 12, headX - 30));
                let by = ty + (OY - 2) * S - say.bh - 8;
                const below = by < 12;
                if (below) by = ty + H + 8;
                bubble.classList.toggle('is-below', below);
                bubble.style.transform = 'translate3d(' + bx + 'px,' + by + 'px,0)';
                bubble.style.setProperty('--tail', Math.max(8, Math.min(say.bw - 20, headX - bx - 4)) + 'px');
                if (now - say.start > say.hold) hush();
            }

            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);

        enqueue(LINES.welcome[0]);
        window.__pixelDogState = () => ({ state, x, y, section, say: say && say.text, parts: parts.length });
        if (window.__pixelDogDebug) window.__pixelDogDebug = { compose, PAL, DW, DH };
    }

    function ready() {
        if (doc.body && doc.body.classList.contains('is-loaded')) mount();
        else setTimeout(ready, 200);
    }
    ready();
})();
