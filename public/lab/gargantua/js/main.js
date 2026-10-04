// Gargantua: the director. One scroll position (0..1) drives everything: the lens's path in black-hole units, the
// Endurance framed against the hole in its own metre-scale world (same camera rotation, decoupled position), the
// fall through the horizon, Cooper, the tesseract and the watch. Two worlds, one post chain, one RAF.
import * as THREE from 'three';
import Lenis from '../vendor/lenis.mjs';
import { createBlackHole } from './blackhole.js';
import { Post } from './post.js';
import { createEndurance } from './endurance.js';
import { createAstronaut } from './astronaut.js';
import { createTesseract } from './tesseract.js';
import { createWatch } from './watch.js';
import { Sound } from './audio.js';

const Q = new URLSearchParams(location.search);
const SHOT = Q.has('p');
const FIXED_P = SHOT ? parseFloat(Q.get('p')) : null;
const FIXED_T = Q.has('t') ? parseFloat(Q.get('t')) : null;
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------ helpers
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const D2R = Math.PI / 180;
// Catmull-Rom through keyed values at uneven p: [[p, v0, v1, ...], ...]
function track(keys) {
    const n = keys[0].length - 1;
    const out = new Array(n).fill(0);
    return (p) => {
        if (p <= keys[0][0]) { for (let i = 0; i < n; i++) out[i] = keys[0][i + 1]; return out; }
        const L = keys.length - 1;
        if (p >= keys[L][0]) { for (let i = 0; i < n; i++) out[i] = keys[L][i + 1]; return out; }
        let k = 0;
        while (p > keys[k + 1][0]) k++;
        const k0 = keys[Math.max(0, k - 1)], k1 = keys[k], k2 = keys[k + 1], k3 = keys[Math.min(L, k + 2)];
        const h = k2[0] - k1[0], t = (p - k1[0]) / h, t2 = t * t, t3 = t2 * t;
        for (let i = 1; i <= n; i++) {
            const m1 = k1 === k0 ? 0 : ((k2[i] - k0[i]) / (k2[0] - k0[0])) * h * 0.5;
            const m2 = k3 === k2 ? 0 : ((k3[i] - k1[i]) / (k3[0] - k1[0])) * h * 0.5;
            out[i - 1] = (2 * t3 - 3 * t2 + 1) * k1[i] + (t3 - 2 * t2 + t) * m1 * 2 + (-2 * t3 + 3 * t2) * k2[i] + (t3 - t2) * m2 * 2;
        }
        return out;
    };
}
const win = (p, a, b, c, d) => smooth(a, b, p) * (1 - smooth(c, d, p));

// ------------------------------------------------------------------ renderer + quality
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: SHOT, stencil: false });
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.NoToneMapping;
const gl = renderer.getContext();

const TIERS = [
    { name: 'floor', steps: 64, stepK: 0.14, bh: 0.34, dpr: 0.6, samples: 0, levels: 4, shadow: 512 },
    { name: 'low', steps: 96, stepK: 0.11, bh: 0.42, dpr: 1.0, samples: 0, levels: 5, shadow: 1024 },
    { name: 'mid', steps: 160, stepK: 0.085, bh: 0.55, dpr: 1.25, samples: 2, levels: 6, shadow: 1024 },
    { name: 'high', steps: 260, stepK: 0.062, bh: 0.75, dpr: 1.75, samples: 4, levels: 6, shadow: 2048 },
];
const mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
let gpuName = '';
try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); gpuName = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''; } catch (e) { /* hidden */ }
function guessTier() {
    if (Q.has('q')) return clamp(parseInt(Q.get('q'), 10) || 0, 0, 3);
    if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(gpuName)) return 0;
    if (mobile) return /Apple GPU|Adreno \(TM\) (7[3-9]|8)\d\d/i.test(gpuName) ? 2 : 1;
    if (/Apple M\d|RTX|Radeon RX|Radeon Pro|GeForce GTX 1[06-9]|Arc/i.test(gpuName)) return 3;
    if (/Intel|UHD|Iris|Radeon\(TM\) Graphics|Vega|Mali|Adreno/i.test(gpuName)) return 2;
    return 3;
}
let tier = guessTier();
const maxTier = tier;
let dyn = 1;   // fine resolution trim for the raymarch, inside a tier
renderer.shadowMap.enabled = !mobile && tier > 0;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const post = new Post(renderer);
let W = 0, H = 0, aspect = 1;
function resize() {
    const T = TIERS[tier];
    const dpr = Math.min(window.devicePixelRatio || 1, T.dpr);
    W = Math.max(2, Math.round(window.innerWidth * dpr));
    H = Math.max(2, Math.round(window.innerHeight * dpr));
    aspect = W / H;
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    canvas.style.width = '100vw'; canvas.style.height = '100vh';
    post.setSize(W, H, T.bh * dyn, T.levels, T.samples);
    bhCam.aspect = shipCam.aspect = tessCam.aspect = aspect;
    bhCam.updateProjectionMatrix(); shipCam.updateProjectionMatrix(); tessCam.updateProjectionMatrix();
}

// ------------------------------------------------------------------ world 1: the hole (units of r_s) and the ship (metres)
const bh = createBlackHole();
const bhCam = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
const shipCam = new THREE.PerspectiveCamera(30, 1, 1, 8000);
const shipScene = new THREE.Scene();

const bgMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { t: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb, 1.0); }',
});
const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bg.frustumCulled = false; bg.renderOrder = -10;
shipScene.add(bg);

const endurance = createEndurance({ shadows: renderer.shadowMap.enabled });
shipScene.add(endurance.root);

// lit only by the disk: a warm key from the hole, a broader glow off the disk's edge, a breath of starlight
const key = new THREE.DirectionalLight(0xffd2a0, 4.2);
key.castShadow = renderer.shadowMap.enabled;
key.shadow.mapSize.set(TIERS[tier].shadow, TIERS[tier].shadow);
Object.assign(key.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 400 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.06;
const diskGlow = new THREE.DirectionalLight(0xff9c55, 1.3);
const starFill = new THREE.HemisphereLight(0x8a96aa, 0x3a2414, 0.22);
shipScene.add(key, key.target, diskGlow, diskGlow.target, starFill);

// environment: a black sky with the disk as one hot, flat band; rotated each frame to face the hole
const pmrem = new THREE.PMREMGenerator(renderer);
function envFrom(fragment) {
    const s = new THREE.Scene();
    const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: 'varying vec3 vD;\n' + fragment });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), m));
    const t = pmrem.fromScene(s, 0, 0.1, 100).texture;
    return t;
}
shipScene.environment = envFrom(`void main(){
    vec3 d = normalize(vD);
    float band = exp(-pow(d.y * 9.0, 2.0)) * pow(max(0.0, -d.z * 0.5 + 0.5), 3.0);
    float core = exp(-pow(d.y * 3.0, 2.0)) * pow(max(0.0, -d.z), 24.0);
    vec3 c = vec3(1.0, 0.62, 0.3) * band * 2.2 + vec3(1.0, 0.85, 0.65) * core * 3.0 + vec3(0.015, 0.017, 0.02);
    gl_FragColor = vec4(c, 1.0);
}`);
shipScene.environmentIntensity = 1.15;

// ------------------------------------------------------------------ world 2: Cooper, the tesseract, the watch
const tessScene = new THREE.Scene();
const tessCam = new THREE.PerspectiveCamera(40, 1, 0.05, 400);
const tess = createTesseract({ N: tier <= 1 ? 3 : 4, layers: tier <= 1 ? 9 : 12 });
tessScene.add(tess.root);
const cooper = createAstronaut();
tessScene.add(cooper.root);
const watch = createWatch();
tessScene.add(watch.root);
tessScene.environment = envFrom(`void main(){
    vec3 d = normalize(vD);
    vec3 c = vec3(0.012, 0.009, 0.007);
    c += vec3(1.0, 0.58, 0.24) * pow(max(0.0, -d.z), 3.0) * 1.6;
    c += vec3(0.9, 0.92, 1.0) * smoothstep(0.55, 0.9, d.y) * 1.1;
    c += vec3(1.0, 0.7, 0.4) * smoothstep(0.7, 0.95, d.x) * 0.8;
    gl_FragColor = vec4(c, 1.0);
}`);
const tKey = new THREE.DirectionalLight(0xf3f1ec, 1.5); tKey.position.set(-3, 4, 3);
const tRim = new THREE.DirectionalLight(0xffa458, 5.5); tRim.position.set(3, 1.5, -4);
const tRim2 = new THREE.DirectionalLight(0xffc89a, 1.6); tRim2.position.set(-4, -1, -3);
const tHemi = new THREE.HemisphereLight(0x3a3430, 0x0a0604, 0.5);
const tGroup = new THREE.Group();
tGroup.add(tKey, tRim, tRim2, tHemi, tKey.target, tRim.target, tRim2.target);
tessScene.add(tGroup);
// dust motes drifting in front of Cooper, lit by the amber
const dustN = 600, dustPos = new Float32Array(dustN * 3);
for (let i = 0; i < dustN; i++) { dustPos[i * 3] = (Math.random() - 0.5) * 14; dustPos[i * 3 + 1] = (Math.random() - 0.5) * 9; dustPos[i * 3 + 2] = -Math.random() * 18; }
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 }, uH: { value: 1000 } },
    vertexShader: 'uniform float uH; varying float vF; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; vF = smoothstep(18.0, 2.0, -mv.z); gl_PointSize = uH * 0.0035 / -mv.z + 1.0; }',
    fragmentShader: 'uniform float uA; varying float vF; void main(){ vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c,c)*16.0) * uA * vF; gl_FragColor = vec4(vec3(1.0,0.75,0.45) * a * 1.6, a); }',
});
const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false;
tessScene.add(dust);

// ------------------------------------------------------------------ choreography
// lens path, black-hole units: p, r, elevation, azimuth, yaw, pitch, roll (deg), vertical fov
const camTrack = track([
    [0.00, 54, 2.0, -24, 0, 0, 0, 30],
    [0.08, 49, 2.4, -16, 0, 0, -2, 30],
    [0.16, 43, 3.2, -8, 7, -1.2, -3, 31],
    [0.26, 35, 4.2, 0, 5, -0.6, -4, 33],
    [0.36, 21, 5.6, 7, 0.5, 0, -6, 37],
    [0.46, 10.5, 6.4, 11, 0, 0, -8, 42],
    [0.52, 5.0, 4.2, 14, 0, 0, -10, 47],
    [0.575, 1.04, 1.0, 16, 0, 0, -14, 54],
]);
// ship framed against the hole, camera space, metres: p, distance along the hole's line of sight, x / y offsets,
// then the ship's own attitude (euler, relative to the camera)
const shipTrack = track([
    [0.04, 760, 300, -46, 0.18, 0.2, 0.12],
    [0.12, 520, 46, -18, 0.22, 0.35, 0.14],
    [0.17, 210, 4, -12, 0.42, 0.62, 0.2],
    [0.22, 112, -30, -7, 0.62, 0.9, 0.26],
    [0.27, 130, -16, 0, 0.46, 1.15, 0.16],
    [0.34, 270, -4, 2.5, 0.3, 1.35, 0.08],
    [0.42, 720, -0.5, 0.8, 0.2, 1.45, 0.02],
    [0.48, 1500, 0, 0, 0.16, 1.5, 0],
    [0.535, 2700, 0, 0, 0.14, 1.52, 0],
]);
const CAPS = {
    title: [0.006, 0.018, 0.048, 0.064],
    endurance: [0.15, 0.165, 0.235, 0.252],
    approach: [0.285, 0.3, 0.35, 0.366],
    doppler: [0.385, 0.4, 0.45, 0.466],
    horizon: [0.505, 0.515, 0.54, 0.552],
    cooper: [0.635, 0.65, 0.705, 0.72],
    tesseract: [0.755, 0.77, 0.845, 0.86],
    watch: [0.905, 0.92, 1.5, 2],
};
const capEls = {};
for (const el of document.querySelectorAll('[data-cap]')) capEls[el.dataset.cap] = el;
const tcLabel = document.getElementById('tcLabel'), tcRs = document.getElementById('tcRs');
const morseEl = document.getElementById('morse'), stayEl = document.getElementById('stay');

const sound = new Sound();
const pointer = new THREE.Vector2();
const v3 = new THREE.Vector3(), v3b = new THREE.Vector3(), qv = new THREE.Quaternion(), qInv = new THREE.Quaternion(), eul = new THREE.Euler();
const toHole = new THREE.Vector3(), holeCam = new THREE.Vector3(), v3c = new THREE.Vector3(), Y_AXIS = new THREE.Vector3(0, 1, 0);
let introAt = SHOT ? -100 : Infinity;
let time = FIXED_T ?? 0;
let world = 1;
let watchT0 = -1;

function update(p, dt) {
    const T = TIERS[tier];
    const intro = SHOT ? 1 : smooth(0, 6, time - introAt);

    // ---------------- the lens
    const [r, el, az, yaw, pitch, roll, fov] = camTrack(p);
    bhCam.position.set(r * Math.cos(el * D2R) * Math.sin(az * D2R), r * Math.sin(el * D2R), r * Math.cos(el * D2R) * Math.cos(az * D2R));
    bhCam.up.set(0, 1, 0);
    bhCam.lookAt(0, 0, 0);
    bhCam.rotateY(yaw * D2R); bhCam.rotateX(pitch * D2R); bhCam.rotateZ(roll * D2R);
    bhCam.fov = fov; bhCam.updateProjectionMatrix();
    bhCam.updateMatrixWorld();

    const U = bh.uniforms;
    U.uTime.value = time;
    U.uSteps.value = T.steps;
    U.uStepK.value = T.stepK;
    U.uDiskGain.value = 1.6 * smooth(0.035, 0.11, p) * (SHOT ? 1 : smooth(1.5, 7, time - introAt));
    U.uStarGain.value = intro * 1.0;
    U.uDoppler.value = 0.62;

    // ---------------- the ship, framed against the hole
    shipCam.quaternion.copy(bhCam.quaternion);
    shipCam.fov = fov; shipCam.updateProjectionMatrix();
    shipCam.position.set(0, 0, 0);
    shipCam.updateMatrixWorld();
    toHole.copy(bhCam.position).multiplyScalar(-1).normalize();
    qInv.copy(bhCam.quaternion).invert();
    holeCam.copy(toHole).applyQuaternion(qInv);
    const [dist, ox, oy, ex, ey, ez] = shipTrack(p);
    v3.copy(holeCam).multiplyScalar(dist);
    v3.x += ox; v3.y += oy;
    v3.applyQuaternion(bhCam.quaternion);
    endurance.root.position.copy(v3);
    qv.setFromEuler(eul.set(ex, ey, ez));
    endurance.root.quaternion.copy(bhCam.quaternion).multiply(qv);
    endurance.root.visible = p > 0.03 && p < 0.545;
    endurance.update(dt, time);

    v3c.copy(toHole).applyAxisAngle(Y_AXIS, 0.95); v3c.y += 0.45; v3c.normalize();
    key.position.copy(v3).addScaledVector(v3c, 160);
    key.target.position.copy(v3);
    v3b.copy(toHole).applyAxisAngle(Y_AXIS, 1.1);
    v3b.y += 0.15;
    diskGlow.position.copy(v3).addScaledVector(v3b, 160);
    diskGlow.target.position.copy(v3);
    shipScene.environmentRotation.set(0, Math.atan2(-toHole.x, -toHole.z), 0);
    key.intensity = 5.6 * (0.6 + 0.4 * smooth(0.05, 0.14, p));
    endurance.puffMat.uniforms.uScale.value = H * 0.9;

    // the fall: spaghettified, redshifted, gone
    const fall = smooth(0.468, 0.532, p);
    endurance.shipU.uStretch.value = fall;
    endurance.shipU.uRed.value = smooth(0.45, 0.52, p);
    endurance.shipU.uFade.value = 1 - smooth(0.505, 0.535, p);
    v3.applyMatrix4(shipCam.matrixWorldInverse);
    endurance.shipU.uCenter.value.copy(v3);

    // ---------------- Cooper and the tesseract
    const tp = clamp((p - 0.6) / 0.4);
    const travel = smooth(0.64, 0.95, p);
    tessCam.position.set(Math.sin(time * 0.13) * 0.08, Math.sin(time * 0.17) * 0.06, -travel * 120);
    tessCam.rotation.set(Math.sin(time * 0.11) * 0.015, Math.sin(time * 0.09) * 0.03, Math.sin(time * 0.07) * 0.01);
    tessCam.updateMatrixWorld();
    tess.follow(tessCam.position);
    tGroup.position.copy(tessCam.position);
    const leave = smooth(0.875, 0.93, p);
    v3.set(0.42 - leave * 2.6, -0.05 + leave * 0.4, -4.6 - leave * 2.5).applyMatrix4(tessCam.matrixWorld);
    cooper.root.position.copy(v3);
    cooper.root.visible = p > 0.58 && leave < 0.999;
    cooper.update(dt, time, pointer);
    const reveal = smooth(0.665, 0.79, p);
    tess.uniforms.uReveal.value = 2 + reveal * 110;
    tess.uniforms.uTime.value = time;
    tess.uniforms.uFlow.value = 1 + smooth(0.75, 0.85, p) * 1.5;
    tessScene.background = tessScene.background || new THREE.Color();
    const far = tess.uniforms.uFogFar.value;
    tessScene.background.setRGB(0.012 + far.r * 0.9 * reveal, 0.008 + far.g * 0.9 * reveal, 0.005 + far.b * 0.9 * reveal);
    dustMat.uniforms.uA.value = win(p, 0.6, 0.66, 0.86, 0.92);
    dustMat.uniforms.uH.value = H;
    dust.position.set(0, 0, tessCam.position.z);

    // ---------------- the watch
    const wIn = smooth(0.885, 0.945, p);
    v3.set(0.0, -1.6 * (1 - wIn) + 0.14, -2.5).applyMatrix4(tessCam.matrixWorld);
    watch.root.position.copy(v3);
    watch.root.quaternion.copy(tessCam.quaternion);
    watch.root.rotateX(-0.28 * (1 - wIn) + 0.12);
    watch.root.rotateY(0.35 * (1 - wIn) - 0.08);
    watch.root.rotateZ(Math.sin(time * 0.3) * 0.02);
    watch.root.scale.setScalar(0.4);
    watch.root.visible = p > 0.87;
    if (p > 0.915) { if (watchT0 < 0) watchT0 = time; } else watchT0 = -1;
    const m = watch.update(watchT0 < 0 ? 0 : (FIXED_T != null ? 7.4 : time - watchT0));
    if (m.onset) sound.morseTick();
    if (morseEl.textContent !== m.morse) morseEl.textContent = m.morse;
    if (stayEl.textContent !== m.word) stayEl.textContent = m.word;

    world = p < 0.592 ? 1 : 2;

    // ---------------- post
    const u = post.u;
    const imax = smooth(0.3, 0.44, p);
    const bar239 = Math.max(0, (1 - aspect / 2.39) / 2);
    u.uLetter.value = world === 1 ? bar239 * (1 - imax) : 0;
    u.uStreak.value = win(p, 0.524, 0.545, 0.553, 0.564);
    u.uBlack.value = Math.max(1 - intro * (SHOT ? 1 : 1), win(p, 0.553, 0.566, 0.577, 0.59));
    if (!SHOT && introAt === Infinity) u.uBlack.value = 1;
    u.uWhite.value = win(p, 0.577, 0.598, 0.612, 0.655);
    u.uBloom.value = world === 1 ? 0.5 : 0.8;
    u.uExposure.value = world === 1 ? 1.0 : 1.05;
    u.uGrain.value = 0.045;
    u.uVignette.value = 0.6;
    u.uCA.value = world === 1 ? 0.006 : 0.006;
    u.uTime.value = time;

    // ---------------- captions + HUD
    for (const [k, [a, b, c, d]] of Object.entries(CAPS)) {
        const el = capEls[k]; if (!el) continue;
        const o = win(p, a, b, c, d);
        el.style.opacity = o.toFixed(3);
        el.style.transform = k === 'title' ? `translate3d(-50%, calc(-50% + ${(1 - o) * 10}px), 0)` : k === 'watch' ? `translate3d(-50%, ${(1 - o) * 10}px, 0)` : `translate3d(0, ${(1 - o) * 12}px, 0)`;
    }
    if (world === 1) {
        tcLabel.textContent = `d\u03c4/dt ${Math.sqrt(Math.max(0, 1 - 1 / r)).toFixed(3)}`;
        tcRs.innerHTML = `r = ${r.toFixed(1)} r<sub>s</sub>`;
    } else {
        tcLabel.textContent = 'd\u03c4/dt \u2014';
        tcRs.innerHTML = 'r = <sub>bulk</sub>';
    }

    // ---------------- sound
    const lvl = 0.35 + 0.25 * smooth(0.08, 0.2, p) + 0.4 * smooth(0.3, 0.48, p);
    const silence = 1 - smooth(0.5, 0.548, p);
    const after = smooth(0.6, 0.66, p);
    sound.set({
        level: p < 0.56 ? lvl * silence : after * lerp(0.35, 0.75, smooth(0.7, 0.8, p)) * (1 - 0.6 * smooth(0.88, 0.94, p)),
        bright: p < 0.56 ? lerp(0.1, 1, smooth(0.08, 0.48, p)) : 0.6,
        tick: p < 0.56 ? lerp(0.25, 0.9, smooth(0.1, 0.46, p)) * (1 - smooth(0.49, 0.53, p)) : 0,
        arp: smooth(0.7, 0.78, p) * (1 - 0.7 * smooth(0.88, 0.94, p)),
    });
}

function render(p) {
    const u = post.u;
    const covered = u.uBlack.value > 0.999 || u.uWhite.value > 0.999;
    if (!covered) {
        if (world === 1) {
            bh.setCamera(bhCam, post.rtBH.height);
            renderer.setRenderTarget(post.rtBH);
            renderer.render(bh.scene, bh.camera);
            bgMat.uniforms.t.value = post.rtBH.texture;
            renderer.setRenderTarget(post.rtScene);
            renderer.render(shipScene, shipCam);
        } else {
            renderer.setRenderTarget(post.rtScene);
            renderer.render(tessScene, tessCam);
        }
    }
    post.finish(world === 1 ? 1.5 : 1.0);
}

// ------------------------------------------------------------------ adaptive quality: sample, then step down / up
const perf = { ema: 16.7, bad: 0, good: 0, cool: 0, raised: false };
function sample(dtMs) {
    if (SHOT || time - introAt < 2.5 && !SHOT && introAt !== Infinity) return;
    perf.ema = lerp(perf.ema, Math.min(dtMs, 100), 0.05);
    perf.cool -= dtMs;
    if (perf.cool > 0) return;
    if (perf.ema > 24) perf.bad += dtMs; else perf.bad = Math.max(0, perf.bad - dtMs * 0.5);
    if (perf.ema < 13) perf.good += dtMs; else perf.good = 0;
    if (perf.bad > 1200) {
        perf.bad = 0; perf.cool = 2500;
        if (dyn > 0.76) { dyn -= 0.12; resize(); }
        else if (tier > 0) { tier--; dyn = 1; if (tier === 0) key.castShadow = false; resize(); }
    } else if (perf.good > 6000 && !perf.raised) {
        perf.good = 0; perf.cool = 3000;
        if (dyn < 1) { dyn = Math.min(1, dyn + 0.12); resize(); }
        else if (tier < maxTier) { tier++; perf.raised = true; resize(); }
    }
}

// ------------------------------------------------------------------ scroll
history.scrollRestoration = 'manual';
let progress = 0;
let lenis = null;
const scrollEl = document.getElementById('scroll');
function readProgress() {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress = clamp(window.scrollY / max);
}
if (!SHOT) {
    window.scrollTo(0, 0);
    lenis = new Lenis({ lerp: reduceMotion ? 1 : 0.075, smoothWheel: true, syncTouch: false, wheelMultiplier: 0.8, touchMultiplier: 1.4 });
    lenis.stop();
    lenis.on('scroll', readProgress);
    root.classList.add('g-locked');
} else {
    document.getElementById('gate').style.display = 'none';
    scrollEl.style.height = '0';
    root.classList.add('is-running');
}

// ------------------------------------------------------------------ the gate
const gate = document.getElementById('gate');
sound.scoreAvailable().then((ok) => { if (ok) document.getElementById('scoreOpt').hidden = false; });
document.getElementById('gateGo').addEventListener('click', () => {
    const mode = (document.querySelector('input[name="snd"]:checked') || {}).value || 'organ';
    sound.start(mode);
    if (mode === 'off') { sound.muted = true; document.getElementById('mute').setAttribute('aria-pressed', 'true'); }
    gate.classList.add('is-gone');
    root.classList.remove('g-locked');
    root.classList.add('is-running');
    introAt = time;
    lenis && lenis.start();
});
document.getElementById('mute').addEventListener('click', (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    e.currentTarget.setAttribute('aria-label', on ? 'Unmute sound' : 'Mute sound');
    if (!sound.ctx && !sound.scoreEl && !on) { sound.start('organ'); }
    sound.setMuted(on);
});

// ------------------------------------------------------------------ pointer + the white cursor
const dot = document.querySelector('.site-cursor-dot');
let cx = -100, cy = -100, dx = -100, dy = -100;
window.addEventListener('pointermove', (e) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    cx = e.clientX; cy = e.clientY;
    if (e.pointerType === 'mouse') dot.classList.add('is-on');
    const t = e.target.closest && e.target.closest('a, button, label');
    dot.classList.toggle('is-hover', !!t);
}, { passive: true });
document.addEventListener('pointerleave', () => dot.classList.remove('is-on'));

// ------------------------------------------------------------------ loop
let raf = 0, last = performance.now(), frames = 0;
function frame(now) {
    raf = requestAnimationFrame(frame);
    const dtMs = Math.min(100, now - last);
    last = now;
    const dt = dtMs / 1000;
    if (FIXED_T == null) time += dt;
    if (lenis) lenis.raf(now);
    const p = SHOT ? FIXED_P : progress;
    update(p, dt);
    render(p);
    sample(dtMs);
    dx += (cx - dx) * 0.35; dy += (cy - dy) * 0.35;
    dot.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    if (SHOT && ++frames === 6) window.__gargShot = true;
}
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; sound.pause(true); }
    else if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); sound.pause(false); }
});
window.addEventListener('resize', resize);
resize();
raf = requestAnimationFrame(frame);

// the shared nav types its home-page line on load; this page keeps its own
const navMsg = document.querySelector('.ap-nav__msg');
if (navMsg) {
    const LINE = 'Lab / Gargantua';
    new MutationObserver(() => { if (/^Creative developer/.test(navMsg.textContent)) navMsg.textContent = LINE; })
        .observe(navMsg, { childList: true, characterData: true, subtree: true });
}

window.__garg = { get tier() { return TIERS[tier].name; }, gpu: gpuName, get dyn() { return dyn; }, renderer };
