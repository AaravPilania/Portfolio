// Quidditch: the director. A broom flight model steered by the pointer (inertia, banking, boost), a Snitch with a
// mind of its own, a chase camera on a rotational spring, and an attract mode that takes over when you let go:
// autopilot chases the Snitch while the lens cuts between flybys, profiles and telephoto wides. It never ends.
import * as THREE from 'three';
import { G, SUN } from './atmos.js';
import { createTerrain, createWater, createTrees, height, LAKE, CASTLE, PITCH } from './world.js';
import { createSky, createClouds } from './sky.js';
import { createCastle } from './castle.js';
import { createPitch } from './pitch.js';
import { createRider } from './rider.js';
import { createSnitch } from './snitch.js';
import { createSpeedLines } from './fx.js';
import { Post } from './post.js';
import { Sound } from './audio.js';
import { clamp, lerp, damp, smooth, wrapAngle, rng } from './util.js';

const Q = new URLSearchParams(location.search);
const SHOT = Q.get('shot');
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------ renderer + quality
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!SHOT, stencil: false });
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.NoToneMapping;
const gl = renderer.getContext();

const TIERS = [
    { name: 'floor', dpr: 0.6, samples: 0, levels: 4, refl: 0, shafts: false, trees: 0.35, lines: 120 },
    { name: 'low', dpr: 0.85, samples: 0, levels: 5, refl: 0, shafts: true, trees: 0.6, lines: 180 },
    { name: 'mid', dpr: 1.0, samples: 2, levels: 6, refl: 0.33, shafts: true, trees: 0.85, lines: 240 },
    { name: 'high', dpr: 1.5, samples: 4, levels: 6, refl: 0.5, shafts: true, trees: 1, lines: 260 },
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
let dyn = 1;

// ------------------------------------------------------------------ the world
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.08, 14000);
const sky = createSky();
const terrain = createTerrain(maxTier);
const water = createWater();
const TREE_MAX = 3600;
const trees = createTrees(Math.round(TREE_MAX * TIERS[maxTier].trees));
const treeTotal = trees.count;
const castle = createCastle();
const pitch = createPitch();
const clouds = createClouds(maxTier);
const rider = createRider();
const snitch = createSnitch();
const lines = createSpeedLines(TIERS[maxTier].lines);
scene.add(sky, terrain, water, trees, castle.mesh, pitch.group, clouds.mesh, rider.group, rider.scarf, rider.trail,
    snitch.group, snitch.trail, snitch.burst, lines.mesh);
const colliders = [...castle.colliders, ...pitch.colliders];
const ground = (x, z) => Math.max(height(x, z), 0);
const _push = new THREE.Vector3();
function pushOut(p, margin) {
    let hit = false;
    for (const c of colliders) {
        if (p.y > c.top + margin) continue;
        const dx = p.x - c.x, dz = p.z - c.z, rr = c.r + margin;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr) {
            const d = Math.sqrt(d2) || 1e-3;
            // over the top if we are near it, around it otherwise
            if (p.y > c.top - 4) { p.y = c.top + margin; }
            else { p.x = c.x + (dx / d) * rr; p.z = c.z + (dz / d) * rr; _push.set(dx / d, 0, dz / d); }
            hit = true;
        }
    }
    return hit;
}

// reflection: a mirrored camera into a low-res target, sampled projectively by the lake
const mirrorCam = new THREE.PerspectiveCamera();
const rtRefl = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: true });
const texBias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
water.material.uniforms.tRefl.value = rtRefl.texture;

const post = new Post(renderer);
let W = 0, H = 0;
function resize() {
    const T = TIERS[tier];
    const dpr = Math.min(window.devicePixelRatio || 1, T.dpr) * dyn;
    W = Math.max(2, Math.round(window.innerWidth * dpr));
    H = Math.max(2, Math.round(window.innerHeight * dpr));
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    canvas.style.width = '100vw'; canvas.style.height = '100vh';
    post.setSize(W, H, T.levels, T.samples);
    post.shaftsOn = T.shafts;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    if (T.refl > 0) rtRefl.setSize(Math.max(2, Math.round(W * T.refl)), Math.max(2, Math.round(H * T.refl)));
    water.material.uniforms.uHasRefl.value = T.refl > 0 ? 1 : 0;
    trees.count = Math.round(treeTotal * (T.trees / TIERS[maxTier].trees));
}

// ------------------------------------------------------------------ the flight model
const F = {
    pos: new THREE.Vector3(-640, 70, 260), yaw: 2.2, pitch: 0, roll: 0, yawRate: 0, speed: 26, boost: 0,
    vel: new THREE.Vector3(), fwd: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3(), quat: new THREE.Quaternion(),
};
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const CENTRE = new THREE.Vector2(-250, 40);

function orient() {
    euler.set(-F.pitch, F.yaw, F.roll);
    F.quat.setFromEuler(euler);
    F.fwd.set(0, 0, 1).applyQuaternion(F.quat);
    F.up.set(0, 1, 0).applyQuaternion(F.quat);
    F.right.set(-1, 0, 0).applyQuaternion(F.quat);
}

function fly(dt, ix, iy, boosting) {
    const maxYaw = 1.35 - F.boost * 0.3, maxPitch = 0.72;
    F.yawRate = damp(F.yawRate, -ix * maxYaw, 3.4, dt);
    // the glen has walls: past the edge the broom is drawn gently home
    const r = Math.hypot(F.pos.x - CENTRE.x, F.pos.z - CENTRE.y);
    if (r > 1650) {
        const home = Math.atan2(CENTRE.x - F.pos.x, CENTRE.y - F.pos.z);
        F.yawRate += wrapAngle(home - F.yaw) * dt * clamp((r - 1650) / 250) * 2.2;
    }
    F.yaw += F.yawRate * dt;
    let tp = iy * maxPitch;
    const look = Math.max(12, F.speed * 1.4);
    const gA = ground(F.pos.x + F.fwd.x * look, F.pos.z + F.fwd.z * look);
    const g0 = ground(F.pos.x, F.pos.z);
    const clear = F.pos.y - Math.max(g0, gA);
    if (clear < 8) tp = Math.max(tp, ((8 - clear) / 8) * 0.85);
    if (F.pos.y > 380) tp = Math.min(tp, -(F.pos.y - 380) / 70);
    F.pitch = damp(F.pitch, clamp(tp, -0.9, 0.9), 2.0, dt);
    F.roll = damp(F.roll, clamp(-F.yawRate * 0.78 + ix * 0.1, -1.1, 1.1), 4.0, dt);
    F.boost = damp(F.boost, boosting ? 1 : 0, boosting ? 1.8 : 0.9, dt);
    const target = 26 + 30 * F.boost - Math.sin(F.pitch) * 9;
    F.speed = damp(F.speed, target, 1.1, dt);
    orient();
    F.vel.copy(F.fwd).multiplyScalar(F.speed);
    F.pos.addScaledVector(F.vel, dt);
    const g = ground(F.pos.x, F.pos.z);
    if (F.pos.y < g + 2.5) F.pos.y = g + 2.5;
    if (pushOut(F.pos, 1.4)) { F.speed *= 1 - dt * 2; shake = Math.min(1, shake + dt * 4); }
}

// ------------------------------------------------------------------ the Snitch's world
const _wp = new THREE.Vector3();
function pickWaypoint(R, player, out) {
    const P = player.pos;
    const roll = R();
    let ok = false;
    if (roll > 0.38) {
        for (let tries = 0; tries < 6 && !ok; tries++) {
            const k = R();
            if (k < 0.3) { const s = castle.spires[Math.floor(R() * castle.spires.length)]; out.set(s.x + (R() - 0.5) * 30, s.y + (R() - 0.3) * 20, s.z + (R() - 0.5) * 30); }
            else if (k < 0.5) { const h = pitch.hoops[Math.floor(R() * pitch.hoops.length)]; out.set(h.x, h.y, h.z); }
            else if (k < 0.75) { clouds.bankAt(Math.floor(R() * clouds.bankCount), time, out); }
            else { const a = R() * 6.283, d = Math.sqrt(R()) * 0.7; out.set(LAKE.x + Math.cos(a) * LAKE.rx * d, 10 + R() * 14, LAKE.z + Math.sin(a) * LAKE.rz * d); }
            ok = out.distanceTo(P) < 650 && out.distanceTo(P) > 60;
        }
    }
    if (!ok) {
        const yaw = F.yaw + (R() - 0.5) * 2.6, d = 70 + R() * 130;
        out.set(P.x + Math.sin(yaw) * d, 0, P.z + Math.cos(yaw) * d);
        out.y = ground(out.x, out.z) + 14 + R() * 70;
    }
    out.y = clamp(out.y, ground(out.x, out.z) + 6, 360);
    if (Math.hypot(out.x - CENTRE.x, out.z - CENTRE.y) > 1500) out.set(lerp(out.x, CENTRE.x, 0.3), out.y, lerp(out.z, CENTRE.y, 0.3));
}
const snitchWorld = { pickWaypoint, ground, pushOut: (p, m) => pushOut(p, m), camera };

// ------------------------------------------------------------------ input
const input = { x: 0, y: 0, tx: 0, ty: 0, boost: false, lastAt: -1e9, keys: new Set(), touchId: null, ax: 0, ay: 0, kbd: false };
let started = false;
let time = 0;
const markInput = () => { input.lastAt = time; };
const curve = (v) => { const a = Math.abs(v); return a < 0.04 ? 0 : Math.sign(v) * Math.pow((a - 0.04) / 0.96, 1.25); };
const dot = document.querySelector('.site-cursor-dot');
const reticle = document.getElementById('reticle');
let cx = -100, cy = -100;
window.addEventListener('pointermove', (e) => {
    cx = e.clientX; cy = e.clientY;
    if (e.pointerType === 'mouse') {
        dot.classList.add('is-on');
        const nx = (e.clientX / window.innerWidth) * 2 - 1, ny = -((e.clientY / window.innerHeight) * 2 - 1);
        if (Math.abs(nx - input.tx) + Math.abs(ny - input.ty) > 0.004) markInput();
        input.tx = nx; input.ty = ny; input.kbd = false;
        const t = e.target.closest && e.target.closest('a, button, label');
        dot.classList.toggle('is-hover', !!t);
    } else if (e.pointerId === input.touchId) {
        const s = Math.min(window.innerWidth, window.innerHeight) * 0.22;
        input.tx = clamp((e.clientX - input.ax) / s, -1, 1); input.ty = clamp(-(e.clientY - input.ay) / s, -1, 1);
        markInput();
        moveStick(e.clientX, e.clientY);
    }
}, { passive: true });
document.addEventListener('pointerleave', () => dot.classList.remove('is-on'));
canvas.addEventListener('pointerdown', (e) => {
    if (!started) return;
    markInput();
    if (e.pointerType === 'mouse') { if (e.button === 0) input.boost = true; }
    else if (input.touchId == null) { input.touchId = e.pointerId; input.ax = e.clientX; input.ay = e.clientY; input.tx = input.ty = 0; showStick(e.clientX, e.clientY); }
    else input.boost = true;
});
window.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') input.boost = false;
    else if (e.pointerId === input.touchId) { input.touchId = null; input.tx = input.ty = 0; hideStick(); }
    else input.boost = false;
});
window.addEventListener('pointercancel', (e) => { if (e.pointerId === input.touchId) { input.touchId = null; input.tx = input.ty = 0; hideStick(); } });
const boostBtn = document.getElementById('boost');
boostBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); input.boost = true; markInput(); boostBtn.classList.add('is-on'); });
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => boostBtn.addEventListener(ev, () => { input.boost = false; boostBtn.classList.remove('is-on'); }));
const KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, KeyA: 1, KeyD: 1, KeyW: 1, KeyS: 1, Space: 1, ShiftLeft: 1, ShiftRight: 1 };
window.addEventListener('keydown', (e) => {
    if (!started || !KEYS[e.code]) return;
    if (e.code === 'Space') e.preventDefault();
    input.keys.add(e.code); input.kbd = true; markInput();
});
window.addEventListener('keyup', (e) => input.keys.delete(e.code));
window.addEventListener('blur', () => { input.keys.clear(); input.boost = false; });
const stick = document.getElementById('stick');
function showStick(x, y) { stick.style.transform = `translate3d(${x}px, ${y}px, 0)`; stick.classList.add('is-on'); }
function moveStick(x, y) { stick.style.setProperty('--kx', `${clamp(x - input.ax, -60, 60)}px`); stick.style.setProperty('--ky', `${clamp(y - input.ay, -60, 60)}px`); }
function hideStick() { stick.classList.remove('is-on'); stick.style.setProperty('--kx', '0px'); stick.style.setProperty('--ky', '0px'); }

function readInput(dt) {
    if (input.kbd) {
        const k = input.keys;
        const kx = (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0);
        const ky = (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0) - (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0);
        input.tx = damp(input.tx, kx * 0.85, 4, dt); input.ty = damp(input.ty, ky * 0.75, 4, dt);
    }
    input.x = damp(input.x, curve(clamp(input.tx, -1, 1)), 10, dt);
    input.y = damp(input.y, curve(clamp(input.ty, -1, 1)), 10, dt);
    return input.boost || input.keys.has('Space') || input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
}

// autopilot: chase the Snitch's lead point, smoothed so it reads as a pilot, not a servo
const AP = { x: 0, y: 0 };
function autopilot(dt) {
    _v.copy(snitch.S.pos).addScaledVector(snitch.S.vel, 0.5).sub(F.pos);
    const dist = _v.length();
    const err = wrapAngle(Math.atan2(_v.x, _v.z) - F.yaw);
    const desP = Math.atan2(_v.y, Math.hypot(_v.x, _v.z));
    AP.x = damp(AP.x, clamp(-err * 1.7, -1, 1), 3, dt);
    AP.y = damp(AP.y, clamp((desP / 0.72) * 1.3, -1, 1), 3, dt);
    return { x: AP.x, y: AP.y, boost: dist < 110 && Math.abs(err) < 0.6 && snitch.S.cooldown <= 0 };
}

// ------------------------------------------------------------------ camera rigs
const chase = { off: new THREE.Vector3(0, 2, -8), look: new THREE.Vector3(0, 0.5, 8), primed: false };
const cine = { type: '', t: 0, dur: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 45, side: 1, anchor: new THREE.Vector3() };
const CAM = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 60, roll: 0 };
let attract = 1, wasAttract = true, shake = 0;
const SHOTS = ['flyby', 'side', 'wide', 'snitch', 'low', 'flyby', 'side'];
let shotIdx = Math.floor(Math.random() * SHOTS.length);

function chaseRig(dt, snap) {
    const back = 4.9 + F.boost * 1.6;
    _v.set(F.fwd.x, F.fwd.y * 0.55, F.fwd.z).normalize();
    _v2.copy(_v).multiplyScalar(-back).add(_v3.set(0, 1.3, 0)).addScaledVector(F.right, -F.roll * 0.7);
    const k = snap ? 1 : 1 - Math.exp(-dt * 4.5);
    chase.off.lerp(_v2, k);
    _v2.copy(F.fwd).multiplyScalar(9).add(_v3.set(0, 0.95, 0));
    chase.look.lerp(_v2, snap ? 1 : 1 - Math.exp(-dt * 6));
    CAM.pos.copy(F.pos).add(chase.off).addScaledVector(F.fwd, -F.boost * 1.2);
    CAM.look.copy(F.pos).add(chase.look);
    CAM.fov = 58 + 15 * F.boost;
    CAM.roll = F.roll * 0.35;
}

function newShot() {
    cine.type = SHOTS[shotIdx++ % SHOTS.length];
    cine.t = 0;
    cine.side = Math.random() < 0.5 ? -1 : 1;
    const flatR = _v3.set(F.right.x, 0, F.right.z).normalize();
    const s = cine.side;
    if (cine.type === 'flyby') {
        cine.dur = 4.6; cine.fov = 36;
        cine.anchor.copy(F.pos).addScaledVector(F.fwd, F.speed * 2.3).addScaledVector(flatR, s * (9 + Math.random() * 7)); cine.anchor.y += -2 + Math.random() * 6;
    } else if (cine.type === 'side') { cine.dur = 6; cine.fov = 40; }
    else if (cine.type === 'wide') {
        cine.dur = 6.5; cine.fov = 19;
        cine.anchor.copy(F.pos).addScaledVector(flatR, s * 75).addScaledVector(F.fwd, 95); cine.anchor.y += 16;
    } else if (cine.type === 'snitch') { cine.dur = 5; cine.fov = 48; }
    else if (cine.type === 'low') {
        cine.dur = 4.8; cine.fov = 30;
        cine.anchor.copy(F.pos).addScaledVector(F.fwd, F.speed * 3).addScaledVector(flatR, s * 5);
        cine.anchor.y = ground(cine.anchor.x, cine.anchor.z) + 1.6;
        if (F.pos.y - cine.anchor.y > 60) { cine.type = 'flyby'; cine.anchor.y = F.pos.y - 3; cine.fov = 34; }
    }
    if (cine.anchor.y < ground(cine.anchor.x, cine.anchor.z) + 1.5) cine.anchor.y = ground(cine.anchor.x, cine.anchor.z) + 1.5;
    pushOut(cine.anchor, 3);
}

function cineRig(dt) {
    cine.t += dt;
    if (cine.t > cine.dur || !cine.type) newShot();
    const flatR = _v3.set(F.right.x, 0, F.right.z).normalize();
    const s = cine.side;
    if (cine.type === 'flyby' || cine.type === 'wide' || cine.type === 'low') {
        cine.pos.copy(cine.anchor);
        _v.copy(F.pos).addScaledVector(F.fwd, 1.5);
        cine.look.lerp(_v, cine.t < 0.05 ? 1 : 1 - Math.exp(-dt * 8));
    } else if (cine.type === 'side') {
        _v.copy(F.pos).addScaledVector(flatR, s * 5.2).addScaledVector(F.fwd, -0.6 + Math.sin(cine.t * 0.4) * 0.8); _v.y += 0.5;
        cine.pos.lerp(_v, cine.t < 0.05 ? 1 : 1 - Math.exp(-dt * 5));
        cine.look.copy(F.pos).addScaledVector(F.fwd, 1.6);
    } else {
        _v.copy(F.pos).addScaledVector(F.fwd, -4.2).addScaledVector(flatR, s * 1.3); _v.y += 0.7;
        cine.pos.lerp(_v, cine.t < 0.05 ? 1 : 1 - Math.exp(-dt * 5));
        _v2.copy(F.pos).addScaledVector(F.fwd, 10).lerp(snitch.S.pos, 0.65);
        cine.look.lerp(_v2, cine.t < 0.05 ? 1 : 1 - Math.exp(-dt * 6));
    }
    return cine;
}

function updateCamera(dt, snap = false) {
    chaseRig(dt, snap || !chase.primed);
    chase.primed = true;
    if (attract > 0.001) {
        cineRig(dt);
        const a = smooth(0, 1, attract);
        CAM.pos.lerp(cine.pos, a);
        CAM.look.lerp(cine.look, a);
        CAM.fov = lerp(CAM.fov, cine.fov, a);
        CAM.roll *= 1 - a;
    }
    const g = ground(CAM.pos.x, CAM.pos.z);
    if (CAM.pos.y < g + 1.2) CAM.pos.y = g + 1.2;
    pushOut(CAM.pos, 1.0);
    camera.position.copy(CAM.pos);
    if (shake > 0.001 || F.boost > 0.05) {
        const k = shake * 0.3 + F.boost * 0.035;
        camera.position.x += (Math.sin(time * 37.1) + Math.sin(time * 23.7)) * k * 0.5;
        camera.position.y += (Math.sin(time * 31.3) + Math.sin(time * 19.9)) * k * 0.5;
    }
    shake = Math.max(0, shake - dt * 2);
    camera.up.set(Math.sin(CAM.roll) * 1, Math.cos(CAM.roll), 0);
    camera.up.set(0, 1, 0).applyAxisAngle(_v.subVectors(CAM.look, CAM.pos).normalize(), -CAM.roll);
    camera.lookAt(CAM.look);
    camera.fov = CAM.fov + punch * 10;
    camera.updateProjectionMatrix();
}

// ------------------------------------------------------------------ HUD
const hud = {
    dist: document.getElementById('tDist'), alt: document.getElementById('tAlt'), spd: document.getElementById('tSpd'), caught: document.getElementById('tCaught'),
    best: document.getElementById('tBest'), mark: document.getElementById('mark'), markD: document.getElementById('markD'), edge: document.getElementById('edge'),
    caption: document.getElementById('caption'), capN: document.getElementById('capN'), capT: document.getElementById('capT'), toast: document.getElementById('toast'),
    attract: document.getElementById('attractTag'),
};
let caughtN = 0, chaseStart = 0, best = parseFloat(localStorage.getItem('quidditch-best') || '0') || 0, hoopN = 0;
if (best) hud.best.textContent = best.toFixed(1) + ' s';
let hudTick = 0;
const _ndc = new THREE.Vector3();
function updateHud(dt, dist) {
    const show = started && attract < 0.5;
    root.classList.toggle('is-flying', show);
    if (!show) { hud.mark.style.opacity = 0; hud.edge.style.opacity = 0; return; }
    _ndc.copy(snitch.S.pos).project(camera);
    const behind = _v.subVectors(snitch.S.pos, camera.position).dot(_v2.set(0, 0, -1).applyQuaternion(camera.quaternion)) < 0;
    const on = !behind && Math.abs(_ndc.x) < 0.94 && Math.abs(_ndc.y) < 0.9;
    const w = window.innerWidth, h = window.innerHeight;
    if (on) {
        hud.mark.style.opacity = dist > 18 ? 1 : 0;
        hud.mark.style.transform = `translate3d(${((_ndc.x + 1) / 2 * w).toFixed(1)}px, ${((1 - _ndc.y) / 2 * h).toFixed(1)}px, 0)`;
        hud.edge.style.opacity = 0;
    } else {
        hud.mark.style.opacity = 0;
        let x = _ndc.x, y = _ndc.y;
        if (behind) { x = -x; y = -y; }
        const a = Math.atan2(y * h, x * w);
        const ex = Math.cos(a), ey = Math.sin(a);
        const k = Math.min((w / 2 - 34) / Math.abs(ex || 1e-3), (h / 2 - 34) / Math.abs(ey || 1e-3));
        hud.edge.style.opacity = 1;
        hud.edge.style.transform = `translate3d(${(w / 2 + ex * k).toFixed(1)}px, ${(h / 2 - ey * k).toFixed(1)}px, 0) rotate(${(-a).toFixed(3)}rad)`;
    }
    if ((hudTick += dt) > 0.1) {
        hudTick = 0;
        hud.dist.textContent = Math.round(dist) + ' m';
        hud.markD.textContent = Math.round(dist) + ' m';
        hud.alt.textContent = Math.round(F.pos.y - ground(F.pos.x, F.pos.z)) + ' m';
        hud.spd.textContent = Math.round(F.speed) + ' m/s';
    }
}
let toastT = 0;
function toast(text) { hud.toast.textContent = text; hud.toast.classList.remove('is-on'); void hud.toast.offsetWidth; hud.toast.classList.add('is-on'); toastT = 2.2; }

// ------------------------------------------------------------------ the catch
let catchAt = -100, punch = 0;
const CATCH_R = 5.0;
function checkCatch() {
    if (snitch.S.cooldown > 0) return;
    _v.copy(F.pos).addScaledVector(F.fwd, 0.6).addScaledVector(F.up, 0.35);
    if (_v.distanceTo(snitch.S.pos) > CATCH_R) return;
    snitch.caught(F);
    catchAt = time;
    sound.catch();
    if (started && attract < 0.5) {
        caughtN++;
        const took = time - chaseStart;
        hud.caught.textContent = String(caughtN).padStart(2, '0');
        hud.capN.textContent = String(caughtN).padStart(2, '0');
        hud.capT.textContent = took.toFixed(1) + ' s';
        if (!best || took < best) { best = took; hud.best.textContent = best.toFixed(1) + ' s'; try { localStorage.setItem('quidditch-best', best.toFixed(2)); } catch (e) { /* private */ } }
        hud.caption.classList.remove('is-on'); void hud.caption.offsetWidth; hud.caption.classList.add('is-on');
    }
    chaseStart = time + 1.6;
}
const prevPos = new THREE.Vector3();
function checkHoops() {
    for (const h of pitch.hoops) {
        if (Math.sign(prevPos.x - h.x) !== Math.sign(F.pos.x - h.x) && Math.hypot(F.pos.y - h.y, F.pos.z - h.z) < h.r + 0.6) {
            hoopN++;
            sound.hoop();
            if (started && attract < 0.5) toast(`Through the hoop / ${String(hoopN).padStart(2, '0')}`);
        }
    }
}

// ------------------------------------------------------------------ sound
const sound = new Sound();

// ------------------------------------------------------------------ the frame
const sunUV = new THREE.Vector2();
let mist = 0;
function step(dt, realDt) {
    time += dt;
    G.uTime.value = time;
    let ix = 0, iy = 0, boosting = false;
    const user = readInput(realDt);
    const idle = !started || time - input.lastAt > 9;
    if (idle) { const a = autopilot(dt); ix = a.x; iy = a.y; boosting = a.boost; }
    else {
        ix = input.x; iy = input.y; boosting = user;
        // a light hand on the stick when the Snitch is right there
        const d = F.pos.distanceTo(snitch.S.pos);
        if (d < 30 && _v.subVectors(snitch.S.pos, F.pos).normalize().dot(F.fwd) > 0.35) {
            const a = autopilot(dt); const k = 0.8 * Math.sqrt(1 - d / 30);
            ix = lerp(ix, a.x, k); iy = lerp(iy, a.y, k);
        } else { AP.x = ix; AP.y = iy; }
    }
    attract = damp(attract, idle ? 1 : 0, idle ? 1.6 : 3.2, realDt);
    if (idle && !wasAttract) { cine.type = ''; }
    wasAttract = idle;
    root.classList.toggle('is-attract', started && idle);

    prevPos.copy(F.pos);
    fly(dt, ix, iy, boosting);
    checkHoops();
    rider.group.position.copy(F.pos);
    rider.group.quaternion.copy(F.quat);
    const dist = snitch.update(dt, time, F, snitchWorld);
    checkCatch();
    updateCamera(realDt);
    rider.update(dt, F, time, camera.position);
    lines.update(dt, camera.position, F.vel, F.speed, F.boost);
    mist = damp(mist, clouds.update(camera.position, time), 5, realDt);

    // sound
    if (sound.ctx) {
        _v.subVectors(snitch.S.pos, camera.position);
        const pan = _v2.set(1, 0, 0).applyQuaternion(camera.quaternion).dot(_v) / (_v.length() + 1);
        const closing = -_v3.subVectors(snitch.S.vel, F.vel).dot(_v.normalize()) / 60;
        sound.update({ speed01: clamp(F.speed / 56), boost: F.boost, turn: Math.abs(F.yawRate), time, snitchDist: dist, snitchPan: pan, snitchDoppler: closing, pitchDist: Math.hypot(F.pos.x - PITCH.x, F.pos.z - PITCH.z), mist });
    }
    updateHud(realDt, dist);
    if (toastT > 0 && (toastT -= realDt) <= 0) hud.toast.classList.remove('is-on');
    return dist;
}

function render() {
    const T = TIERS[tier];
    // the lake's mirror
    if (T.refl > 0 && camera.position.y < 700) {
        mirrorCam.copy(camera);
        mirrorCam.position.set(camera.position.x, -camera.position.y, camera.position.z);
        _v.set(CAM.look.x, -CAM.look.y, CAM.look.z);
        mirrorCam.up.copy(camera.up).multiply(_v2.set(1, -1, 1));
        mirrorCam.lookAt(_v);
        mirrorCam.updateMatrixWorld();
        mirrorCam.projectionMatrix.copy(camera.projectionMatrix);
        water.material.uniforms.uTexMat.value.copy(texBias).multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
        water.visible = false; lines.mesh.visible = false; rider.trail.visible = false; snitch.trail.visible = false;
        G.uReflect.value = 1;
        renderer.setRenderTarget(rtRefl);
        renderer.render(scene, mirrorCam);
        G.uReflect.value = 0;
        water.visible = true; lines.mesh.visible = true; rider.trail.visible = true; snitch.trail.visible = true;
    }
    renderer.setRenderTarget(post.rtScene);
    renderer.render(scene, camera);

    // grade
    const since = time - catchAt;
    punch = since < 2 ? Math.exp(-since * 3) * smooth(0, 0.05, since) : 0;
    post.u.uTime.value = time;
    post.u.uWhite.value = since < 1 ? Math.exp(-since * 7) * 0.32 : 0;
    post.u.uExposure.value = 1.0 + (since < 2 ? Math.exp(-since * 2) * 0.35 : 0);
    post.u.uBloom.value = 0.7 + (since < 2 ? Math.exp(-since * 1.5) * 0.8 : 0);
    post.u.uStreak.value = reduceMotion ? 0 : clamp((F.speed - 34) / 22) * (1 - attract);
    post.u.uLetter.value = 0.075 * smooth(0, 1, attract) * (SHOT ? 0 : 1);
    post.u.uMist.value = clamp(mist * 1.1);
    _v.copy(camera.position).addScaledVector(SUN, 1000).project(camera);
    const facing = _v2.set(0, 0, -1).applyQuaternion(camera.quaternion).dot(SUN);
    sunUV.set((_v.x + 1) / 2, (_v.y + 1) / 2);
    const shaft = facing > 0 ? smooth(0.2, 0.75, facing) * (1 - smooth(0.9, 1.6, Math.max(Math.abs(_v.x), Math.abs(_v.y)))) : 0;
    post.finish(1.2, sunUV, shaft * 0.9 * (1 - mist));
}

// ------------------------------------------------------------------ adaptive quality
const perf = { ema: 16.7, bad: 0, good: 0, cool: 1500, raised: false };
function sample(dtMs) {
    if (SHOT) return;
    perf.ema = lerp(perf.ema, Math.min(dtMs, 100), 0.05);
    perf.cool -= dtMs;
    if (perf.cool > 0) return;
    if (perf.ema > 21) perf.bad += dtMs; else perf.bad = Math.max(0, perf.bad - dtMs * 0.5);
    if (perf.ema < 13.5) perf.good += dtMs; else perf.good = 0;
    if (perf.bad > 1200) {
        perf.bad = 0; perf.cool = 2500;
        if (dyn > 0.8) { dyn -= 0.1; resize(); }
        else if (tier > 0) { tier--; dyn = 1; resize(); }
    } else if (perf.good > 7000 && !perf.raised) {
        perf.good = 0; perf.cool = 3000;
        if (dyn < 1) { dyn = Math.min(1, dyn + 0.1); resize(); }
        else if (tier < maxTier) { tier++; perf.raised = true; resize(); }
    }
}

// ------------------------------------------------------------------ the gate
const gate = document.getElementById('gate');
document.getElementById('gateGo').addEventListener('click', () => {
    const mode = (document.querySelector('input[name="snd"]:checked') || {}).value || 'on';
    sound.start(mode !== 'off');
    if (mode === 'off') document.getElementById('mute').setAttribute('aria-pressed', 'true');
    gate.classList.add('is-gone');
    root.classList.add('is-running');
    started = true;
    input.lastAt = time;
    chaseStart = time;
    root.classList.add('show-hint');
    setTimeout(() => root.classList.remove('show-hint'), 7000);
});
document.getElementById('mute').addEventListener('click', (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    e.currentTarget.setAttribute('aria-label', on ? 'Unmute sound' : 'Mute sound');
    if (!sound.ctx && !on) sound.start(true);
    sound.setMuted(on);
});

// ------------------------------------------------------------------ shot mode: deterministic key frames
function setupShot(name) {
    const P = (x, y, z) => new THREE.Vector3(x, y, z);
    const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
    const castleC = P(CASTLE.x, CASTLE.y + 40, CASTLE.z);
    const presets = {
        hero: () => { F.pos.set(-430, 96, 150); F.yaw = yawTo(F.pos, castleC) + 0.12; F.pitch = -0.04; return { snitch: [0.9, 0.9, 13], rig: 'chase', boost: 0.3, roll: -0.18 }; },
        castle: () => { F.pos.set(40, 34, 10); F.yaw = -Math.PI / 2 - 0.3; return { snitch: [0, 1, 9], rig: 'fixed', cam: P(230, 9, 190), look: P(-10, 70, -250), fov: 34 }; },
        pitch: () => { F.pos.set(PITCH.x + 34, PITCH.y + 19, PITCH.z + 4); F.yaw = Math.PI / 2 + 0.05; F.pitch = 0.02; return { snitch: [-1.5, 0.6, 12], rig: 'chase', boost: 0.6, roll: 0.15 }; },
        snitch: () => { F.pos.set(-300, 70, 180); F.yaw = yawTo(F.pos, castleC) - 0.5; return { snitch: [0.3, 0.7, 4.2], rig: 'macro', boost: 0.2 }; },
        side: () => { F.pos.set(-200, 80, 120); F.yaw = yawTo(F.pos, castleC) - 0.9; return { snitch: [0, 1, 10], rig: 'side', boost: 0.4, roll: -0.25 }; },
        cloud: () => { F.pos.set(-140, 182, -230); F.yaw = yawTo(F.pos, castleC) + 0.3; F.pitch = -0.05; return { snitch: [0.4, 0.4, 11], rig: 'chase', boost: 0.7 }; },
        catch: () => { F.pos.set(-380, 80, 120); F.yaw = yawTo(F.pos, castleC) - 0.2; return { snitch: [0, 0.4, 1.0], rig: 'chase', catchIt: true, roll: 0.1 }; },
    };
    const p = (presets[name] || presets.hero)();
    F.roll = p.roll || 0; F.boost = p.boost || 0; F.speed = 26 + 30 * F.boost;
    orient();
    // fly in so the cloak, scarf and wake are settled
    const end = F.pos.clone();
    F.pos.addScaledVector(F.fwd, -F.speed * 2);
    const dt = 1 / 60;
    const sp = new THREE.Vector3();
    for (let i = 0; i < 120; i++) {
        time += dt; G.uTime.value = time;
        F.pos.addScaledVector(F.fwd, F.speed * dt);
        rider.group.position.copy(F.pos); rider.group.quaternion.copy(F.quat);
        sp.copy(F.pos).addScaledVector(F.right, p.snitch[0]).addScaledVector(F.up, p.snitch[1]).addScaledVector(F.fwd, p.snitch[2]);
        sp.x += Math.sin(time * 3) * 0.2; sp.y += Math.sin(time * 4.3) * 0.15;
        snitch.S.vel.copy(F.fwd).multiplyScalar(F.speed);
        if (i === 0) snitch.place(sp, snitch.S.vel);
        snitch.S.pos.copy(sp);
        snitch.S.cooldown = 99;
        snitch.update(0, time, F, snitchWorld);
        snitch.S.pos.copy(sp); snitch.group.position.copy(sp);
        if (p.rig === 'chase') { chaseRig(dt, i === 0); }
        else if (p.rig === 'fixed') { CAM.pos.copy(p.cam); CAM.look.copy(p.look); CAM.fov = p.fov; CAM.roll = 0; }
        else if (p.rig === 'side') { CAM.pos.copy(F.pos).addScaledVector(_v3.set(F.right.x, 0, F.right.z).normalize(), -5.4); CAM.pos.y += 0.4; CAM.look.copy(F.pos).addScaledVector(F.fwd, 1.4); CAM.fov = 38; CAM.roll = 0; }
        else if (p.rig === 'macro') { CAM.pos.copy(sp).addScaledVector(F.right, 1.7).addScaledVector(F.fwd, 2.4).addScaledVector(F.up, 0.25); CAM.look.copy(sp).addScaledVector(F.fwd, -1.6).addScaledVector(F.up, -0.15); CAM.fov = 32; CAM.roll = 0; }
        camera.position.copy(CAM.pos);
        camera.up.set(0, 1, 0).applyAxisAngle(_v2.subVectors(CAM.look, CAM.pos).normalize(), -CAM.roll);
        camera.lookAt(CAM.look); camera.fov = CAM.fov; camera.updateProjectionMatrix();
        rider.update(dt, F, time, camera.position);
        lines.update(dt, camera.position, F.vel.copy(F.fwd).multiplyScalar(F.speed), F.speed, F.boost);
        mist = clouds.update(camera.position, time);
        if (p.catchIt && i === 104) { snitch.caught(F); catchAt = time; snitch.S.pos.copy(sp); }
        if (p.catchIt && i > 104) { snitch.burstU.uT.value = (i - 104) * dt; }
    }
    if (p.catchIt) { snitch.group.visible = false; snitch.trail.visible = false; }
    attract = 0;
    started = true;
}

// ------------------------------------------------------------------ boot
let raf = 0, last = performance.now(), frames = 0;
function frame(now) {
    raf = requestAnimationFrame(frame);
    const dtMs = Math.min(100, now - last);
    last = now;
    if (SHOT) {
        render();
        if (++frames === 4) window.__qShot = true;
        return;
    }
    const realDt = dtMs / 1000;
    const since = time - catchAt;
    const timeScale = since < 1.4 && !reduceMotion ? lerp(0.3, 1, smooth(0.05, 1.4, since)) : 1;
    step(realDt * timeScale, realDt);
    render();
    sample(dtMs);
    dot.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    if (reticle && started) {
        const k = Math.min(1, Math.hypot(input.x, input.y));
        reticle.style.setProperty('--k', k.toFixed(3));
    }
}
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; sound.pause(true); }
    else if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); sound.pause(false); }
});
window.addEventListener('resize', resize);
resize();
orient();
{
    // the Snitch starts out ahead, teasing
    _v.copy(F.pos).addScaledVector(F.fwd, 60); _v.y += 8;
    snitch.place(_v);
}
if (SHOT) {
    document.getElementById('gate').style.display = 'none';
    root.classList.add('is-running');
    if (Q.has('clean')) root.classList.add('q-clean');
    setupShot(SHOT);
} else {
    // a few frames of flight before anyone sees it, so the gate opens on a settled shot
    for (let i = 0; i < 90; i++) step(1 / 60, 1 / 60);
}
raf = requestAnimationFrame(frame);

// the shared nav types its home-page line on load; this page keeps its own
const navMsg = document.querySelector('.ap-nav__msg');
if (navMsg) {
    const LINE = 'Lab / Quidditch';
    new MutationObserver(() => { if (/^Creative developer/.test(navMsg.textContent)) navMsg.textContent = LINE; })
        .observe(navMsg, { childList: true, characterData: true, subtree: true });
}

window.__q = { get tier() { return TIERS[tier].name; }, gpu: gpuName, get dyn() { return dyn; }, renderer, camera, F, input, snitch, get attract() { return attract; }, get caught() { return caughtN; }, get time() { return time; }, sound,
    setTier(t) { tier = clamp(t, 0, 3); resize(); } };
