// Footer: the signature written on in 3D as the footer scrolls in, after Lando Norris's (a Rive state machine whose
// `scroll` input is ScrollTrigger progress, scrub 0.5). Here the strokes are the inline SVG's polylines in pen order,
// swept into one tapered tube; each vertex carries its global pen time, so a single uniform both cuts the tube and
// sharpens a growing nib at the cut. Lit like Lando's head scene: a sky/ground hemisphere plus one key light.
(() => {
    'use strict';
    const foot = document.querySelector('.sig-footer');
    if (!foot) return;
    const hero = foot.querySelector('.sig-hero');
    const canvas = foot.querySelector('.sig-canvas');
    const svg = foot.querySelector('.sig-svg');
    const scroller = document.querySelector('.js-scroller') || document.scrollingElement || document.documentElement;
    const STATIC = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const APP_URL = '/wp-content/themes/lamalama2025/dist/assets/app-DjHRamTc.js';
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

    // Footer links ride the page's Lenis, like every other in-page jump
    let appMod = null;
    import(APP_URL).then((m) => { appMod = m; }).catch(() => {});
    const lenisOf = () => {
        const app = appMod && appMod.n;
        const s = app && app.instances && app.instances.get('scroller');
        return (s && s.lenis) || null;
    };
    foot.addEventListener('click', (e) => {
        const a = e.target.closest('[data-sig-to]');
        if (!a) return;
        const to = a.getAttribute('data-sig-to');
        let y = 0;
        if (to !== '0') {
            const el = document.querySelector(to);
            if (!el) return;
            const vTop = scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top;
            y = el.getBoundingClientRect().top - vTop + scroller.scrollTop;
        }
        e.preventDefault();
        const lenis = lenisOf();
        if (lenis) lenis.scrollTo(y, STATIC ? { immediate: true, force: true } : { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4), force: true });
        else scroller.scrollTo({ top: y, behavior: STATIC ? 'auto' : 'smooth' });
    });

    if (!hero || !svg) return;
    const polys = [...svg.querySelectorAll('polyline')];
    const strokes = polys.map((p) => p.getAttribute('points').trim().split(/\s+/).map((q) => q.split(',').map(Number)));
    if (!strokes.length) return;
    const vb = svg.viewBox.baseVal;
    const VW = vb.width || 1000, VH = vb.height || 718;
    const SW = parseFloat(svg.getAttribute('data-stroke')) || 17.75;

    // Pen time: arc length, plus a short lift between strokes
    const lens = strokes.map((s) => s.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - s[i - 1][0], p[1] - s[i - 1][1]) : 0), 0));
    const total = lens.reduce((a, b) => a + b, 0);
    const LIFT = total * 0.012;
    const span = total + LIFT * (strokes.length - 1);
    let acc = 0;
    const times = lens.map((l) => { const t = [acc / span, (acc + l) / span]; acc += l + LIFT; return t; });

    let progress = STATIC ? 1 : 0, shown = -1, visible = false, raf = 0, last = 0;
    const sway = { x: 0, y: 0, tx: 0, ty: 0 };

    function target() {
        const r = foot.getBoundingClientRect(), H = window.innerHeight;
        const start = H * 0.75, end = Math.max(H - r.height, 0) + H * 0.1;
        return clamp01((start - r.top) / (start - end));
    }

    // Fallback: the SVG itself, dash-drawn on the same pen clock
    let svgLens = null;
    function drawSvg(p) {
        if (!svgLens) svgLens = polys.map((el) => { const l = el.getTotalLength(); el.style.strokeDasharray = l + ' ' + l; return l; });
        polys.forEach((el, i) => {
            const k = clamp01((p - times[i][0]) / Math.max(1e-6, times[i][1] - times[i][0]));
            el.style.strokeDashoffset = String(svgLens[i] * (1 - k));
        });
    }

    const VERT = `
        attribute vec3 aC;
        attribute float aT;
        uniform float uP;
        uniform float uTip;
        varying vec3 vN;
        varying vec3 vV;
        varying float vT;
        void main() {
            float k = smoothstep(0.0, uTip, uP - aT);
            vec3 p = aC + (position - aC) * k;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vV = mv.xyz;
            vN = normalMatrix * normal;
            vT = aT;
            gl_Position = projectionMatrix * mv;
        }`;
    const FRAG = `
        precision highp float;
        uniform float uP;
        uniform vec3 uCol;
        uniform vec3 uRim;
        uniform vec3 uKey;
        varying vec3 vN;
        varying vec3 vV;
        varying float vT;
        void main() {
            if (vT > uP) discard;
            vec3 n = normalize(vN);
            if (!gl_FrontFacing) n = -n;
            vec3 v = normalize(-vV);
            vec3 l = normalize(uKey);
            vec3 amb = mix(vec3(0.40, 0.37, 0.30), vec3(0.80, 0.79, 0.74), 0.5 + 0.5 * n.y);
            float d = max(dot(n, l), 0.0);
            float s = pow(max(dot(n, normalize(l + v)), 0.0), 64.0);
            float f = pow(1.0 - max(dot(n, v), 0.0), 3.0);
            float ink = exp(-max(uP - vT, 0.0) * 70.0);
            vec3 c = uCol * (amb + 0.42 * d) + uRim * (s * 0.7 + f * 0.2) + mix(uCol, vec3(1.0), 0.5) * ink * 0.5;
            gl_FragColor = vec4(c, 1.0);
        }`;

    function tube(THREE) {
        const S = 2 / VW, R = (SW / 2) * S;
        const RAD = 10, pos = [], nor = [], cen = [], tim = [], idx = [];
        let base = 0;
        strokes.forEach((s, si) => {
            const L = lens[si], dot = L < 24;
            const pts = s.map(([x, y]) => new THREE.Vector3((x - VW / 2) * S, (VH / 2 - y) * S, 0.035 * Math.sin(x * 0.009 + y * 0.013)));
            if (pts.length === 2) pts.splice(1, 0, pts[0].clone().lerp(pts[1], 0.5));
            const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
            const segs = Math.max(8, Math.round(L / 3.2));
            const fr = curve.computeFrenetFrames(segs, false);
            const [t0, t1] = times[si];
            for (let i = 0; i <= segs; i++) {
                const u = i / segs, P = curve.getPointAt(u), N = fr.normals[i], B = fr.binormals[i];
                const r = dot
                    ? R * 1.2 * Math.sqrt(Math.max(0.08, Math.sin(Math.PI * u)))
                    : R * Math.pow(Math.max(0.1, Math.min(1, (u * L) / 46, ((1 - u) * L) / 30)), 0.5);
                for (let j = 0; j < RAD; j++) {
                    const a = (j / RAD) * Math.PI * 2, c = Math.cos(a), si2 = Math.sin(a);
                    const nx = c * N.x + si2 * B.x, ny = c * N.y + si2 * B.y, nz = c * N.z + si2 * B.z;
                    pos.push(P.x + nx * r, P.y + ny * r, P.z + nz * r);
                    nor.push(nx, ny, nz);
                    cen.push(P.x, P.y, P.z);
                    tim.push(t0 + (t1 - t0) * u);
                }
                if (i) {
                    const a0 = base + (i - 1) * RAD, a1 = base + i * RAD;
                    for (let j = 0; j < RAD; j++) {
                        const j1 = (j + 1) % RAD;
                        idx.push(a0 + j, a1 + j, a0 + j1, a0 + j1, a1 + j, a1 + j1);
                    }
                }
            }
            base += (segs + 1) * RAD;
        });
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
        g.setAttribute('aC', new THREE.Float32BufferAttribute(cen, 3));
        g.setAttribute('aT', new THREE.Float32BufferAttribute(tim, 1));
        g.setIndex(base > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
        g.computeBoundingSphere();
        return g;
    }

    let gl = null;
    function makeGL() {
        const THREE = window.THREE;
        if (!THREE || !canvas) return null;
        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
        } catch (e) { return null; }
        if (!renderer.capabilities.isWebGL2 && !renderer.extensions.get('OES_element_index_uint')) { renderer.dispose(); return null; }
        renderer.setClearColor(0x000000, 0);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 40);
        const uniforms = {
            uP: { value: progress },
            uTip: { value: 0.012 },
            uCol: { value: new THREE.Color(0xffed29) },
            uRim: { value: new THREE.Color(0xf4f2ea) },
            uKey: { value: new THREE.Vector3(-0.75, 0.2, 0.4).add(new THREE.Vector3(0.3, 0.35, 0.55)) },
        };
        const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(tube(THREE), mat);
        const rig = new THREE.Group();
        rig.add(mesh);
        scene.add(rig);
        canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); foot.classList.remove('is-gl'); gl = null; shown = -1; frameOnce(); }, false);
        return { THREE, renderer, scene, camera, rig, uniforms, w: 0, h: 0 };
    }

    function size() {
        if (!gl) return;
        const w = Math.max(1, hero.clientWidth), h = Math.max(1, hero.clientHeight);
        if (w === gl.w && h === gl.h) return;
        gl.w = w; gl.h = h;
        gl.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        gl.renderer.setSize(w, h, false);
        const cam = gl.camera, aspect = w / h;
        cam.aspect = aspect;
        // Fit the signature box (2 x VH/VW*2 world units, plus the nib) with a margin for the sway
        const bw = 2.08, bh = (VH / VW) * 2 + 0.08;
        const need = Math.max(bh, bw / aspect) * 1.06;
        cam.position.set(0, 0, need / 2 / Math.tan((cam.fov * Math.PI) / 360));
        cam.lookAt(0, 0, 0);
        cam.updateProjectionMatrix();
        shown = -1;
    }

    function render() {
        if (gl) {
            gl.uniforms.uP.value = progress <= 0 ? -1 : progress >= 0.9995 ? 1.01 : progress;
            gl.rig.rotation.y = sway.x * 0.2;
            gl.rig.rotation.x = 0.05 - sway.y * 0.14;
            gl.renderer.render(gl.scene, gl.camera);
            if (!foot.classList.contains('is-gl')) foot.classList.add('is-gl');
        } else drawSvg(progress);
        shown = progress;
    }

    function frame(now) {
        raf = 0;
        const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
        last = now;
        const p0 = progress, sx = sway.x, sy = sway.y;
        if (!STATIC) {
            progress += (target() - progress) * (1 - Math.exp(-dt * 6));
            if (Math.abs(target() - progress) < 1e-4) progress = target();
            const k = 1 - Math.exp(-dt * 4);
            sway.x += (sway.tx - sway.x) * k;
            sway.y += (sway.ty - sway.y) * k;
        }
        if (shown < 0 || Math.abs(progress - p0) > 1e-5 || Math.abs(sway.x - sx) > 1e-5 || Math.abs(sway.y - sy) > 1e-5) render();
        if (visible) raf = requestAnimationFrame(frame);
    }
    function frameOnce() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

    function init() {
        gl = makeGL();
        size();
        if (!STATIC) {
            window.addEventListener('pointermove', (e) => {
                sway.tx = (e.clientX / window.innerWidth) * 2 - 1;
                sway.ty = (e.clientY / window.innerHeight) * 2 - 1;
            }, { passive: true });
        }
        if ('ResizeObserver' in window) new ResizeObserver(() => { size(); frameOnce(); }).observe(hero);
        else window.addEventListener('resize', () => { size(); frameOnce(); }, { passive: true });
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((es) => {
                visible = es[es.length - 1].isIntersecting;
                if (visible) frameOnce();
            }).observe(foot);
        } else { visible = true; frameOnce(); }
        if (!STATIC) render();
    }

    window.__sigFooter = { state: () => ({ progress, target: target(), gl: !!gl, strokes: strokes.length, span }), set: (p) => { progress = p; render(); } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
