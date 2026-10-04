// Slide 05 and the end screen: the hero's spectacles, which break apart on the first scroll of slide 01, fall back in
// as their two halves and unite over the headline. They are the hero's own felt-tip drawing (index.html
// SPECS_FRAMES: rim, inner rim, brow pass, hatching, bridge, temple, nose pad, glare), every stroke swept into an
// inked tube that tapers like a marker, and the three hand-drawn boil frames cycle on twos so the line keeps living
// in 3D. The object turns toward the cursor on a damped spring, leans with the scroll's velocity and floats while
// idle; once the headline has gone it settles centre screen and grows toward the end of the page, its lenses
// darkening into sunglasses with Aarav's signature written across both in a broad chisel nib.
// Built when the section is a couple of screens away, rendered from the page's gsap ticker only while on screen.
(() => {
    'use strict';
    const sec = document.querySelector('.ll-section--together');
    const canvas = sec && sec.querySelector('.wt-glasses');
    const THREE = window.THREE;
    if (!sec || !canvas || !THREE) return;
    const STATIC = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scroller = document.querySelector('.js-scroller') || document.scrollingElement || document.documentElement;
    const perf = window.__apPerf || { low: false, dpr: (c) => Math.min(window.devicePixelRatio || 1, 1.5, c || 2) };

    const FRONT_W = 238;
    const FRONT_H = 72;
    const BOIL = 1 / 7;
    const NIB_ANGLE = (35 * Math.PI) / 180;

    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const lstep = (a, b, v) => clamp01((v - a) / (b - a));
    const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const mix = (a, b, t) => a + (b - a) * t;

    // SVG path (M/L/C/Z, y down) to polylines in y-up units; one polyline per subpath
    function polylines(d, steps) {
        const tok = d.match(/[MCLZ]|-?\d*\.?\d+(?:e-?\d+)?/g);
        const out = [];
        let cur = null, i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
        const num = () => parseFloat(tok[i++]);
        while (i < tok.length) {
            if (/[MCLZ]/.test(tok[i])) cmd = tok[i++];
            if (cmd === 'M') {
                x = sx = num(); y = sy = num();
                cur = [[x, -y]]; out.push(cur); cmd = 'L';
            } else if (cmd === 'L') {
                x = num(); y = num(); cur.push([x, -y]);
            } else if (cmd === 'C') {
                const a = num(), b = num(), c = num(), e = num(), f = num(), g = num();
                for (let k = 1; k <= steps; k++) {
                    const t = k / steps, u = 1 - t;
                    const px = u * u * u * x + 3 * u * u * t * a + 3 * u * t * t * c + t * t * t * f;
                    const py = u * u * u * y + 3 * u * u * t * b + 3 * u * t * t * e + t * t * t * g;
                    cur.push([px, -py]);
                }
                x = f; y = g;
            } else if (cmd === 'Z') {
                cur.closed = true; x = sx; y = sy; cmd = '';
            } else i++;
        }
        return out;
    }

    function shapeOf(d) {
        const p = polylines(d, 16)[0];
        const s = new THREE.Shape();
        p.forEach(([x, y], k) => (k ? s.lineTo(x, y) : s.moveTo(x, y)));
        s.closePath();
        return s;
    }

    // A marker stroke: a tube along the drawn line whose radius swells with pen pressure and lifts off at open ends
    function inkTube(pts, r, closed, q, taper = true) {
        const v = pts.map((p) => (p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2] || 0)));
        if (closed && v[0].distanceTo(v[v.length - 1]) < 0.5) v.pop();
        const curve = new THREE.CatmullRomCurve3(v, closed, 'centripetal');
        const segs = Math.max(6, Math.round((curve.getLength() / 3.2) * q.seg));
        const g = new THREE.TubeGeometry(curve, segs, r, q.radial, closed);
        const pos = g.attributes.position, ring = q.radial + 1, c = new THREE.Vector3(), w = new THREE.Vector3();
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            let k = 1 + 0.1 * Math.sin(t * 9.4 + r * 3.1);
            if (!closed && taper) k *= 0.3 + 0.7 * Math.sqrt(Math.min(1, t / 0.08, (1 - t) / 0.08));
            curve.getPointAt(Math.min(t, 1), c);
            for (let j = 0; j < ring; j++) {
                const n = i * ring + j;
                w.fromBufferAttribute(pos, n).sub(c).multiplyScalar(k).add(c);
                pos.setXYZ(n, w.x, w.y, w.z);
            }
        }
        g.computeVertexNormals();
        return g;
    }

    // Planar UVs over the shape's own bounds, optionally flipped so a mirrored half still reads left to right
    function lensGeometry(d, flip) {
        const g = new THREE.ShapeGeometry(shapeOf(d), 1);
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

    // The signature as a chisel nib: a flat edge of fixed width at a fixed angle swept along smooth centrelines. Each
    // segment's sweep is the parallelogram between the nib at its two ends, so their union is the exact nib trace,
    // filled as one path per run so no seams open at joins. R carries pen time x coverage and G coverage, so the
    // shader can reveal the ink in writing order without repainting the texture.
    function paintSignature(TW, TH) {
        const c = document.createElement('canvas');
        c.width = TW; c.height = TH;
        const g = c.getContext('2d');
        g.fillStyle = '#000';
        g.fillRect(0, 0, TW, TH);
        const D = window.__SIG_DATA;
        if (!D || !D.s) return c;
        const sc = Math.min((TW * 0.84) / D.w, (TH * 0.72) / D.h);
        const ox = TW / 2 - (D.w / 2) * sc, oy = TH * 0.52 + (D.h / 2) * sc;
        const nib = TH * 0.085;
        const nx = (Math.cos(NIB_ANGLE) * nib) / 2, ny = (-Math.sin(NIB_ANGLE) * nib) / 2;
        const RUN = 5;
        for (let si = D.s.length - 1; si >= 0; si--) {
            const s = D.s[si], n = s.length / 3;
            const X = (k) => ox + s[k * 3] * sc, Y = (k) => oy - s[k * 3 + 1] * sc;
            for (let k0 = Math.floor((n - 2) / RUN) * RUN; k0 >= 0; k0 -= RUN) {
                const a0 = Math.max(0, k0 - 1), a1 = Math.min(n - 1, k0 + RUN);
                g.beginPath();
                for (let k = a0; k < a1; k++) {
                    const ax = X(k), ay = Y(k), bx = X(k + 1), by = Y(k + 1);
                    if ((bx - ax) * ny - (by - ay) * nx >= 0) {
                        g.moveTo(ax - nx, ay - ny); g.lineTo(ax + nx, ay + ny); g.lineTo(bx + nx, by + ny); g.lineTo(bx - nx, by - ny);
                    } else {
                        g.moveTo(ax - nx, ay - ny); g.lineTo(bx - nx, by - ny); g.lineTo(bx + nx, by + ny); g.lineTo(ax + nx, ay + ny);
                    }
                    g.closePath();
                }
                g.fillStyle = `rgb(${Math.round(s[k0 * 3 + 2] * 255)},255,0)`;
                g.fill('nonzero');
            }
        }
        return c;
    }

    let renderer = null, scene, camera, rig, glasses, L, R, frames = [], glass, decalMat, chalk, chalkSoft, built = false;
    let W = 0, H = 0, vTop = 0, secTop = 0, secH = 1, navBottom = 0, kickerY = 0, visible = false, on = false, ticking = false;

    function build() {
        if (built) return true;
        built = true;
        const FR = window.__specsFrames;
        if (!FR || !FR.length) return false;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !perf.low, powerPreference: perf.low ? 'low-power' : 'high-performance' });
        } catch (e) { renderer = null; return false; }
        renderer.setClearColor(0x000000, 0);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(28, 1, 10, 20000);
        const q = perf.low ? { seg: 0.5, radial: 5 } : { seg: 1, radial: 8 };

        if (!perf.low) {
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
        }
        scene.add(new THREE.AmbientLight(0xffffff, perf.low ? 0.55 : 0.2));
        const key = new THREE.DirectionalLight(0xffffff, 1.1);
        key.position.set(-0.6, 0.9, 1.2);
        scene.add(key);

        const ink = perf.low
            ? new THREE.MeshLambertMaterial({ color: 0x0b0b0c })
            : new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.4, metalness: 0, envMapIntensity: 0.9 });
        const graphite = perf.low ? ink : new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.55, metalness: 0, envMapIntensity: 0.6 });
        chalk = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72, depthWrite: false });
        chalkSoft = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, depthWrite: false });
        const rivetMat = new THREE.MeshBasicMaterial({ color: 0xe8eae0 });
        glass = perf.low
            ? new THREE.MeshBasicMaterial({ color: 0xdfe7ea, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide })
            : new THREE.MeshPhysicalMaterial({ color: 0xdfe7ea, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.1, envMapIntensity: 1.8, depthWrite: false, side: THREE.DoubleSide });

        const lensD = FR[0].left.inner;
        const lens = lensGeometry(lensD, false), lensR = lensGeometry(lensD, true);
        const TW = perf.low ? 640 : 1024, TH = Math.round(TW / lens.aspect);
        const sigTex = new THREE.CanvasTexture(paintSignature(TW, TH));
        sigTex.anisotropy = Math.min(perf.low ? 1 : 4, renderer.capabilities.getMaxAnisotropy());
        decalMat = new THREE.ShaderMaterial({
            uniforms: { map: { value: sigTex }, write: { value: 0 }, morph: { value: 0 } },
            vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
            fragmentShader: [
                'uniform sampler2D map; uniform float write; uniform float morph; varying vec2 vUv;',
                'void main() {',
                '  vec4 s = texture2D(map, vUv);',
                '  float t = s.r / max(s.g, 0.004);',
                '  float ink = s.g * clamp((write - t) * 300.0, 0.0, 1.0);',
                '  float sa = morph * mix(0.86, 0.97, vUv.y);',
                '  vec3 smoke = mix(vec3(0.086, 0.086, 0.102), vec3(0.02, 0.02, 0.027), vUv.y);',
                '  float a = sa + ink * (1.0 - sa);',
                '  vec3 c = (smoke * sa * (1.0 - ink) + vec3(1.0, 0.929, 0.161) * ink) / max(a, 0.001);',
                '  gl_FragColor = vec4(c, a);',
                '}',
            ].join('\n'),
            transparent: true, depthWrite: false, side: THREE.DoubleSide,
        });

        // One drawn frame of one half, in the hero's units (bridge centre at x = 0, y up)
        function drawnHalf(F, mirrorUV) {
            const g = new THREE.Group();
            const add = (geo, mat, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.z = z; g.add(m); return m; };
            const line = (d, r, mat, z = 0, taper = true) => polylines(d, 10).forEach((p) => add(inkTube(p, r, !!p.closed, q, taper), mat, z));
            line(F.outer, 3.3, ink);
            line(F.inner, 1.5, ink, -0.6);
            line(F.brow, 1.9, ink, 1.6);
            line(F.hatch, 1.1, graphite, 1.2);
            line(F.nosePad, 1.5, graphite, -5);
            // The filled saddle bridge becomes its centreline, as thick as the drawn piece, meeting the mirror at x = 0
            const [br] = polylines(F.bridge, 10);
            const iTop = br.findIndex(([x]) => Math.abs(x) < 1e-3);
            const top = br.slice(0, iTop + 1), bot = br.slice(iTop + 1).reverse();
            const mid = top.map((p, k) => {
                const o = bot[Math.round((k / Math.max(1, top.length - 1)) * (bot.length - 1))];
                return [(p[0] + o[0]) / 2, (p[1] + o[1]) / 2, -1];
            });
            const thick = Math.abs(top[top.length - 1][1] - bot[bot.length - 1][1]);
            add(inkTube(mid, thick * 0.44, false, q, false), ink);
            // The drawn temple runs out sideways; in 3D it folds back from the hinge to the ear with a short drop
            const [tp] = polylines(F.temple, 10);
            const [hx, hy] = tp[0];
            let acc = 0;
            const arm = tp.map(([x, y], k) => {
                if (k) acc += Math.hypot(x - tp[k - 1][0], y - tp[k - 1][1]);
                return [hx + (x - hx) * 0.14, hy + (y - hy) * 0.8, -acc * 2.3];
            });
            const end = arm[arm.length - 1];
            arm.push([end[0] + 0.6, end[1] - 9, end[2] - 7], [end[0] + 1, end[1] - 17, end[2] - 4]);
            add(inkTube(arm, 2.4, false, q), ink, -1);
            for (const [gl, mat, r] of [[F.glare1, chalk, 1.5], [F.glare2, chalkSoft, 1]]) {
                add(inkTube([[gl.x1, -gl.y1, 0], [(gl.x1 + gl.x2) / 2, -(gl.y1 + gl.y2) / 2, 0], [gl.x2, -gl.y2, 0]], r, false, q), mat, 2.2).renderOrder = 4;
            }
            for (const rv of [F.rivet1, F.rivet2]) {
                const m = add(new THREE.SphereGeometry(1.7, perf.low ? 6 : 10, perf.low ? 5 : 8), rivetMat, 3.4);
                m.position.x = rv.x; m.position.y = -rv.y;
            }
            return g;
        }

        function half(mirror) {
            const g = new THREE.Group();
            const pane = new THREE.Mesh(lens.g, glass);
            pane.renderOrder = 2;
            g.add(pane);
            const print = new THREE.Mesh(mirror ? lensR.g : lens.g, decalMat);
            print.position.z = 0.5;
            print.renderOrder = 3;
            g.add(print);
            const f = FR.map((F) => { const d = drawnHalf(F.left, mirror); g.add(d); return d; });
            if (mirror) g.scale.x = -1;
            const pivot = new THREE.Group();
            pivot.add(g);
            return { pivot, f };
        }

        glasses = new THREE.Group();
        const hl = half(false), hr = half(true);
        L = hl.pivot; R = hr.pivot;
        frames = FR.map((_, k) => [hl.f[k], hr.f[k]]);
        glasses.add(L, R);
        rig = new THREE.Group();
        rig.add(glasses);
        scene.add(rig);

        // Everything is compiled and uploaded now, with every boil frame showing once, so nothing is built mid-scroll
        measure();
        renderer.compile(scene, camera);
        renderer.render(scene, camera);
        showFrame(0);
        canvas.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
        return true;
    }

    let boilShown = -1;
    function showFrame(k) {
        if (k === boilShown) return;
        boilShown = k;
        frames.forEach((pair, i) => { pair[0].visible = pair[1].visible = i === k; });
    }

    function measure() {
        W = window.innerWidth;
        H = window.innerHeight;
        vTop = scroller === document.scrollingElement || scroller === document.documentElement ? 0 : scroller.getBoundingClientRect().top;
        const r = sec.getBoundingClientRect();
        secTop = r.top - vTop + scroller.scrollTop;
        secH = r.height;
        const nav = document.querySelector('.ap-nav');
        navBottom = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : H * 0.08;
        // The kicker's place in the sticky stage, which rests at the viewport top while the glasses hold over it
        const stage = sec.querySelector('.wt-stage'), kick = sec.querySelector('.wt-kicker, .wt-title');
        if (!kick || !kick.style.transform || !kickerY) {
            kickerY = stage && kick ? kick.getBoundingClientRect().top - stage.getBoundingClientRect().top : H * 0.3;
            if (!(kickerY > navBottom + 40)) kickerY = H * 0.3;
        }
        if (!renderer) return;
        renderer.setPixelRatio(perf.dpr(perf.low ? 1 : 1.5));
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.position.set(0, 0, (H / 2) / Math.tan((camera.fov * Math.PI) / 360));
        camera.near = camera.position.z * 0.2;
        camera.far = camera.position.z * 4;
        camera.updateProjectionMatrix();
        dirty = true;
    }

    const lenisScroll = () => {
        const l = window.__lenis;
        return l && typeof l.scroll === 'number' ? l.scroll : scroller.scrollTop;
    };

    const ptr = { x: 0, y: 0, on: false };
    const spin = { x: 0, y: 0, vx: 0, vy: 0 };
    let time = 0, writeDrawn = 0, last = 0, boilT = 0, boilK = 0, dirty = true, lastKey = '';

    function frame() {
        const now = performance.now();
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
        last = now;
        if (!visible || !renderer) return;
        const top = secTop - lenisScroll();
        const maxScroll = Math.max(1, secH - H);
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

        // Size: centred in the gap between the nav and the kicker at first, with air on both sides, then centre screen
        // and slowly larger to the page's end
        const gap = kickerY - navBottom;
        const base = Math.min(W * (W < 700 ? 0.56 : 0.24), 480, (gap * 0.62 / FRONT_H) * FRONT_W);
        const width = base * mix(1, W < 700 ? 1.4 : 2.2, grow) * mix(1, 1.08, centre);
        const s = width / FRONT_W;
        const holdY = navBottom + gap * 0.5;
        const y = mix(holdY, H * 0.5, centre);

        time += dt;
        const vel = window.__lenis ? window.__lenis.velocity || 0 : 0;
        const tx = (ptr.on ? ptr.y * 0.32 : 0) + Math.max(-0.32, Math.min(0.32, vel * 0.006));
        const ty = ptr.on ? ptr.x * 0.55 : 0;
        if (STATIC) { spin.x = tx; spin.y = ty; }
        else {
            spin.vx += ((tx - spin.x) * 30 - spin.vx * 8.5) * dt;
            spin.vy += ((ty - spin.y) * 30 - spin.vy * 8.5) * dt;
            spin.x += spin.vx * dt;
            spin.y += spin.vy * dt;
            boilT += dt;
            if (boilT >= BOIL) { boilT %= BOIL; boilK = (boilK + 1) % frames.length; }
        }
        showFrame(STATIC ? 0 : boilK);
        const idle = STATIC || perf.low ? 0 : 1;

        // Nothing moves on a parked page except the boil, so the GPU only works when a stroke or the scroll changes
        const key = [top.toFixed(1), W, H, boilShown, writeDrawn.toFixed(4), spin.x.toFixed(4), spin.y.toFixed(4), idle ? time.toFixed(3) : 0].join('|');
        if (key === lastKey && !dirty) return;
        lastKey = key;
        dirty = false;

        rig.position.set(0, H / 2 - y, 0);
        rig.scale.setScalar(s);
        // The halves fall in from above the frame, still carrying the hero's split: apart, tipped, turned away
        const a = 1 - unite;
        L.position.set(-a * W * 0.55 / s, a * H * 0.9 / s, 0);
        R.position.set(a * W * 0.55 / s, a * H * 0.9 / s, 0);
        L.rotation.set(a * 0.5, a * 1.1, a * 0.28);
        R.rotation.set(a * 0.5, -a * 1.1, -a * 0.28);
        glasses.rotation.set(spin.x + Math.sin(time * 0.9) * 0.05 * idle, spin.y + Math.sin(time * 0.6) * 0.08 * idle, Math.sin(time * 0.7) * 0.025 * idle);
        glasses.position.y = Math.sin(time * 1.1) * 4 * idle;

        glass.color.setRGB(mix(0.87, 0.035, morph), mix(0.9, 0.035, morph), mix(0.92, 0.043, morph));
        glass.opacity = mix(0.1, 0.55, morph);
        chalk.opacity = 0.72 * (1 - 0.65 * morph);
        chalkSoft.opacity = 0.42 * (1 - 0.65 * morph);
        decalMat.uniforms.morph.value = morph;
        decalMat.uniforms.write.value = writeDrawn;
        renderer.render(scene, camera);
    }

    function setTicking(v) {
        if (v === ticking) return;
        ticking = v;
        last = 0;
        if (window.gsap && gsap.ticker) { if (v) gsap.ticker.add(frame); else gsap.ticker.remove(frame); }
        else if (v) (function loop() { if (!ticking) return; frame(); requestAnimationFrame(loop); })();
    }

    function start() {
        measure();
        window.addEventListener('resize', measure, { passive: true });
        window.addEventListener('ap:tier', measure);
        if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', measure);
        window.addEventListener('pointermove', (e) => {
            ptr.x = (e.clientX / W) * 2 - 1;
            ptr.y = (e.clientY / H) * 2 - 1;
            ptr.on = true;
        }, { passive: true });
        document.documentElement.addEventListener('pointerleave', () => { ptr.on = false; }, { passive: true });
        // Built on an idle slice once the page has settled, or two screens ahead if the visitor gets there first
        const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1));
        const early = () => setTimeout(() => idle(() => build(), { timeout: 6000 }), 2500);
        if (document.readyState === 'complete') early(); else window.addEventListener('load', early, { once: true });
        new IntersectionObserver((es) => {
            if (!es[es.length - 1].isIntersecting || built) return;
            idle(() => build(), { timeout: 400 });
        }, { root: scroller === document.scrollingElement || scroller === document.documentElement ? null : scroller, rootMargin: '200% 0px' }).observe(sec);
        new IntersectionObserver((es) => {
            visible = es[es.length - 1].isIntersecting;
            if (visible && !built) build();
            if (visible) measure();
            if (!visible && on) { on = false; canvas.classList.remove('is-on'); }
            dirty = true;
            setTicking(visible && !!renderer);
        }).observe(sec);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
