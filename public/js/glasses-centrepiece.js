// Slide 05 and the end screen: the hero's spectacles, which break apart on the first scroll of slide 01, fall back in
// as their two halves and unite over the headline. Built in three.js from the hero's own rim, bridge and temple paths
// (index.html #spectaclesFaceAnchor), extruded as glossy black acetate. The object turns toward the cursor on a damped
// spring, leans with the scroll's velocity and floats while idle; once the headline has gone it settles centre screen
// and grows slowly toward the end of the page, its lenses darkening into sunglasses with Aarav's signature written in
// both. One fixed canvas, rendered from the page's gsap ticker only while slide 05 is on screen.
(() => {
    'use strict';
    const sec = document.querySelector('.ll-section--together');
    const canvas = sec && sec.querySelector('.wt-glasses');
    const THREE = window.THREE;
    if (!sec || !canvas || !THREE) return;
    const STATIC = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scroller = document.querySelector('.js-scroller') || document.scrollingElement || document.documentElement;

    // Left half in the hero's SVG units (y down, bridge centre at x = 0); the right half is its mirror
    const RIM_OUT = 'M -19.6 -28.1 C -44.9 -32.3, -66.7 -35.1, -93.8 -33.8 C -114 -25.8, -119.4 -21.2, -117.9 -12.8 C -114.7 6.9, -108 23.8, -94.3 34.6 C -68.8 35.6, -42.9 34.7, -27.4 24.1 C -18.2 4.7, -19.9 -13.9, -19.6 -28.1 Z';
    const RIM_IN = 'M -26.3 -21.7 C -46.3 -28, -69.4 -27.2, -91 -25.8 C -106.1 -21.9, -109.2 -13.2, -109.1 5.7 C -106 19.4, -90.5 24.5, -67.2 31.1 C -49.4 28.4, -34.8 17.3, -25.6 4.7 C -25.7 -4.6, -25.6 -16, -26.5 -22.3 Z';
    const BRIDGE = 'M -20.9 -13.9 C -14.1 -18.2, -6.9 -17.6, 0 -17.6 L 0 -8.4 C -4.9 -8.8, -13.5 -7.2, -22.2 -7.6 Z';
    const RIVETS = [[-110.9, -21.8], [-105.3, -23.5]];
    const HINGE = [-116.4, -16.5];
    const FRONT_W = 238;
    const DEPTH = 9;

    const SUN = new THREE.Color('#FFED29');
    const CLEAR = new THREE.Color('#dfe7ea');
    const SMOKE = new THREE.Color('#09090b');

    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const lstep = (a, b, v) => clamp01((v - a) / (b - a));
    const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const mix = (a, b, t) => a + (b - a) * t;

    function shapeOf(d) {
        const tok = d.match(/[MCLZ]|-?\d*\.?\d+/g);
        const s = new THREE.Shape();
        let i = 0, cmd = '';
        const n = () => -parseFloat(tok[i++]);
        const x = () => parseFloat(tok[i++]);
        while (i < tok.length) {
            if (/[MCLZ]/.test(tok[i])) cmd = tok[i++];
            if (cmd === 'M') { const a = x(), b = n(); s.moveTo(a, b); cmd = 'L'; }
            else if (cmd === 'L') { const a = x(), b = n(); s.lineTo(a, b); }
            else if (cmd === 'C') { const a = x(), b = n(), c = x(), e = n(), f = x(), g = n(); s.bezierCurveTo(a, b, c, e, f, g); }
            else if (cmd === 'Z') { s.closePath(); cmd = ''; }
            else i++;
        }
        return s;
    }

    // Planar UVs over the shape's own bounds, optionally flipped so a mirrored half still reads left to right
    function lensGeometry(flip) {
        const g = new THREE.ShapeGeometry(shapeOf(RIM_IN), 40);
        g.computeBoundingBox();
        const b = g.boundingBox, w = b.max.x - b.min.x, h = b.max.y - b.min.y;
        const p = g.attributes.position, uv = g.attributes.uv;
        for (let k = 0; k < p.count; k++) {
            const u = (p.getX(k) - b.min.x) / w;
            uv.setXY(k, flip ? 1 - u : u, (p.getY(k) - b.min.y) / h);
        }
        uv.needsUpdate = true;
        return { g, aspect: w / h };
    }

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (e) { return; }
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 10, 20000);

    // A small studio for the reflections: soft box overhead, two strip lights and a sun-yellow kicker
    (function studio() {
        const env = new THREE.Scene();
        env.add(new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), new THREE.MeshBasicMaterial({ color: 0x0c0c0e, side: THREE.BackSide })));
        const panel = (w, h, c, k, pos, rot) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
            m.position.set(...pos);
            m.rotation.set(...rot);
            env.add(m);
        };
        panel(60, 22, 0xffffff, 3.2, [0, 46, 4], [Math.PI / 2, 0, 0]);
        panel(8, 70, 0xffffff, 4.5, [-46, 4, 10], [0, Math.PI / 2, 0]);
        panel(8, 70, 0xffffff, 2.2, [46, 0, 6], [0, -Math.PI / 2, 0]);
        panel(70, 6, 0xffed29, 1.6, [0, -30, -46], [0, 0, 0]);
        const pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(env, 0.035).texture;
        pm.dispose();
    })();
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(-0.6, 0.9, 1.2);
    scene.add(key);

    const acetate = new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.34, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.75 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.22, metalness: 1, envMapIntensity: 1.4 });
    const glass = new THREE.MeshPhysicalMaterial({ color: CLEAR.clone(), roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.12, envMapIntensity: 1.8, depthWrite: false, side: THREE.DoubleSide });

    // The lens print: a gradient smoke that deepens with the morph and the signature in sun yellow, on a decal that
    // sits just proud of the glass and ignores the lights so the ink stays flat and exact
    const lens = lensGeometry(false), lensR = lensGeometry(true);
    const TW = 1024, TH = Math.round(TW / lens.aspect);
    const print = document.createElement('canvas');
    print.width = TW; print.height = TH;
    const pc = print.getContext('2d');
    const printTex = new THREE.CanvasTexture(print);
    printTex.encoding = THREE.sRGBEncoding;
    printTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const decal = new THREE.MeshBasicMaterial({ map: printTex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });

    // The signature trace (signature-data.js: strokes of [x, y-up, radius, t]) laid level along its principal axis
    const sig = (() => {
        const D = window.__SIG_DATA;
        if (!D || !D.s) return null;
        let sx = 0, sy = 0, n = 0;
        for (const st of D.s) for (let i = 0; i < st.length; i += 4) { sx += st[i]; sy += st[i + 1]; n++; }
        const mx = sx / n, my = sy / n;
        let xx = 0, xy = 0, yy = 0;
        for (const st of D.s) for (let i = 0; i < st.length; i += 4) { const dx = st[i] - mx, dy = st[i + 1] - my; xx += dx * dx; xy += dx * dy; yy += dy * dy; }
        const ang = 0.5 * Math.atan2(2 * xy, xx - yy);
        const co = Math.cos(-ang), si = Math.sin(-ang);
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        const strokes = D.s.map((st) => {
            const p = [];
            for (let i = 0; i < st.length; i += 4) {
                const dx = st[i] - mx, dy = st[i + 1] - my;
                const x = dx * co - dy * si, y = -(dx * si + dy * co);
                x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
                p.push(x, y, st[i + 2], st[i + 3]);
            }
            return p;
        });
        return { strokes, x0, x1, y0, y1 };
    })();

    let printKey = '';
    function paintPrint(morph, write) {
        const k = morph.toFixed(3) + '|' + write.toFixed(3);
        if (k === printKey) return;
        printKey = k;
        pc.clearRect(0, 0, TW, TH);
        if (morph > 0.001) {
            const gr = pc.createLinearGradient(0, 0, 0, TH);
            gr.addColorStop(0, `rgba(5, 5, 7, ${(0.97 * morph).toFixed(3)})`);
            gr.addColorStop(0.55, `rgba(9, 9, 12, ${(0.92 * morph).toFixed(3)})`);
            gr.addColorStop(1, `rgba(22, 22, 26, ${(0.84 * morph).toFixed(3)})`);
            pc.fillStyle = gr;
            pc.fillRect(0, 0, TW, TH);
        }
        if (!sig || write <= 0) { printTex.needsUpdate = true; return; }
        const sw = sig.x1 - sig.x0, sh = sig.y1 - sig.y0;
        const sc = Math.min((TW * 0.86) / sw, (TH * 0.66) / sh);
        const ox = TW / 2 - (sig.x0 + sw / 2) * sc, oy = TH * 0.52 - (sig.y0 + sh / 2) * sc;
        pc.strokeStyle = '#FFED29';
        pc.lineCap = 'round';
        pc.lineJoin = 'round';
        pc.shadowColor = 'rgba(255, 237, 41, 0.35)';
        pc.shadowBlur = 6;
        for (const p of sig.strokes) {
            if (p[3] > write) continue;
            for (let i = 4; i < p.length; i += 4) {
                const t = p[i + 3];
                if (t > write) break;
                pc.lineWidth = Math.max(1.4, (p[i + 2] + p[i - 2]) * 0.62 * sc);
                pc.beginPath();
                pc.moveTo(ox + p[i - 4] * sc, oy + p[i - 3] * sc);
                pc.lineTo(ox + p[i] * sc, oy + p[i + 1] * sc);
                pc.stroke();
            }
        }
        pc.shadowBlur = 0;
        printTex.needsUpdate = true;
    }

    function half(mirror) {
        const g = new THREE.Group();
        const rim = shapeOf(RIM_OUT);
        rim.holes.push(new THREE.Path(shapeOf(RIM_IN).getPoints(48)));
        const ext = { depth: DEPTH, bevelEnabled: true, bevelThickness: 2.6, bevelSize: 1.25, bevelSegments: 5, curveSegments: 40 };
        g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(rim, ext), acetate));
        g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shapeOf(BRIDGE), Object.assign({}, ext, { depth: DEPTH * 0.7, bevelThickness: 1.6, bevelSize: 0.8 })), acetate));
        const pane = new THREE.Mesh(lens.g, glass);
        pane.position.z = DEPTH * 0.5;
        pane.renderOrder = 2;
        g.add(pane);
        const ink = new THREE.Mesh(mirror ? lensR.g : lens.g, decal);
        ink.position.z = DEPTH * 0.5 + 0.6;
        ink.renderOrder = 3;
        g.add(ink);
        for (const [rx, ry] of RIVETS) {
            const r = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.2, 20), steel);
            r.rotation.x = Math.PI / 2;
            r.position.set(rx, -ry, DEPTH + 2.6);
            g.add(r);
        }
        // The temple folds back from the hinge, tapering toward the ear with a short drop at the tip
        const arm = new THREE.Group();
        arm.position.set(HINGE[0], -HINGE[1], DEPTH * 0.3);
        arm.rotation.y = -0.07;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 7.5, 168, 1, 1, 12), acetate);
        const bp = bar.geometry.attributes.position;
        for (let k = 0; k < bp.count; k++) {
            const z = bp.getZ(k), t = (84 - z) / 168;
            bp.setY(k, bp.getY(k) * (1 - 0.35 * t) - (t > 0.82 ? Math.pow((t - 0.82) / 0.18, 2) * 18 : 0));
        }
        bar.geometry.computeVertexNormals();
        bar.position.z = -84;
        arm.add(bar);
        g.add(arm);
        if (mirror) g.scale.x = -1;
        const pivot = new THREE.Group();
        pivot.add(g);
        return pivot;
    }

    const glasses = new THREE.Group();
    const L = half(false), R = half(true);
    glasses.add(L, R);
    const rig = new THREE.Group();
    rig.add(glasses);
    scene.add(rig);

    let W = 0, H = 0, dpr = 1, vTop = 0, visible = false, on = false;
    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        renderer.setPixelRatio(dpr);
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.position.set(0, 0, (H / 2) / Math.tan((camera.fov * Math.PI) / 360));
        camera.near = camera.position.z * 0.2;
        camera.far = camera.position.z * 4;
        camera.updateProjectionMatrix();
        vTop = scroller === document.scrollingElement || scroller === document.documentElement ? 0 : scroller.getBoundingClientRect().top;
    }

    const ptr = { x: 0, y: 0, on: false };
    const spin = { x: 0, y: 0, vx: 0, vy: 0 };
    let time = 0, writeDrawn = 0, last = 0;

    function frame() {
        const now = performance.now();
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
        last = now;
        if (!visible) return;
        const r = sec.getBoundingClientRect();
        const top = r.top - vTop;
        const maxScroll = Math.max(1, r.height - H);
        const p = clamp01(-top / maxScroll);
        const enter = clamp01((H - top) / H);
        const st = window.__wtState || { p, settled: true };

        const unite = STATIC ? 1 : easeOut(lstep(0.18, 0.96, enter));
        const centre = easeIO(lstep(0.27, 0.5, p));
        const grow = easeIO(lstep(0.5, 1, p));
        const morph = easeIO(lstep(0.55, 0.72, p));
        const want = st.settled ? lstep(0.64, 0.93, p) : 0;
        writeDrawn = want < writeDrawn ? want : writeDrawn + (want - writeDrawn) * Math.min(1, dt * 6);
        if (Math.abs(want - writeDrawn) < 0.0005) writeDrawn = want;

        const show = enter > 0.02 && top < H;
        if (show !== on) { on = show; canvas.classList.toggle('is-on', show); }
        if (!show) return;

        // Size: over the headline at first, then centre screen and slowly larger to the page's end
        const base = Math.min(W * (W < 700 ? 0.6 : 0.26), 520);
        const width = base * mix(1, W < 700 ? 1.4 : 2.2, grow) * mix(1, 1.08, centre);
        const s = width / FRONT_W;
        const holdY = Math.max(H * 0.13, Math.min(H * 0.17, H / 2 - (W < 700 ? 0.34 : 0.3) * H));
        const y = mix(holdY, H * 0.5, centre);
        rig.position.set(0, H / 2 - y, 0);
        rig.scale.setScalar(s);

        // The halves fall in from above the frame, still carrying the hero's split: apart, tipped, turned away
        const a = 1 - unite;
        L.position.set(-a * W * 0.55 / s, a * H * 0.9 / s, 0);
        R.position.set(a * W * 0.55 / s, a * H * 0.9 / s, 0);
        L.rotation.set(a * 0.5, a * 1.1, a * 0.28);
        R.rotation.set(a * 0.5, -a * 1.1, -a * 0.28);

        time += dt;
        const lenis = window.__lenis;
        const vel = lenis ? lenis.velocity || 0 : 0;
        const tx = (ptr.on ? ptr.y * 0.32 : 0) + Math.max(-0.32, Math.min(0.32, vel * 0.006));
        const ty = ptr.on ? ptr.x * 0.55 : 0;
        if (STATIC) { spin.x = tx; spin.y = ty; }
        else {
            spin.vx += ((tx - spin.x) * 30 - spin.vx * 8.5) * dt;
            spin.vy += ((ty - spin.y) * 30 - spin.vy * 8.5) * dt;
            spin.x += spin.vx * dt;
            spin.y += spin.vy * dt;
        }
        const idle = STATIC ? 0 : 1;
        glasses.rotation.set(spin.x + Math.sin(time * 0.9) * 0.05 * idle, spin.y + Math.sin(time * 0.6) * 0.08 * idle, Math.sin(time * 0.7) * 0.025 * idle);
        glasses.position.y = Math.sin(time * 1.1) * 4 * idle;

        glass.color.copy(CLEAR).lerp(SMOKE, morph);
        glass.opacity = mix(0.12, 0.7, morph);
        paintPrint(morph, writeDrawn);
        renderer.render(scene, camera);
    }

    function start() {
        resize();
        window.addEventListener('resize', resize, { passive: true });
        window.addEventListener('pointermove', (e) => {
            ptr.x = (e.clientX / W) * 2 - 1;
            ptr.y = (e.clientY / H) * 2 - 1;
            ptr.on = true;
        }, { passive: true });
        document.documentElement.addEventListener('pointerleave', () => { ptr.on = false; }, { passive: true });
        new IntersectionObserver((es) => {
            visible = es[es.length - 1].isIntersecting;
            if (!visible && on) { on = false; canvas.classList.remove('is-on'); }
            last = 0;
        }).observe(sec);
        if (window.gsap && gsap.ticker) gsap.ticker.add(frame);
        else (function loop() { frame(); requestAnimationFrame(loop); })();
    }

    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
