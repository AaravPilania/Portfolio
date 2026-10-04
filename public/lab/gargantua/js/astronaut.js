// Cooper's EVA suit, modelled in code the way a suit is actually put together. Soft goods are lathed from measured
// profiles and then creased: wrinkles wander round each limb, gather at the joints and sag between them; joints are
// convolute bellows; the hard upper torso, helmet shell and life-support pack are moulded fibreglass with clearcoat.
// The outer layer is ortho-fabric (plain weave + ripstop grid, as a normal map) with cloth sheen, welted seams and
// stitched panels. The gold EVVA visor is a true mirror, so it carries whatever environment it is lit by: the disk
// when he falls toward Gargantua, the amber lattice in the tesseract. Occlusion between parts is baked per vertex from
// the parts' own bounding spheres; rigid parts are merged per material so the whole suit is a few dozen draws.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { fabricNormal, plasticNormal, patchTexture } from './textures.js';

const TAU = Math.PI * 2;
const TILE = 0.075;   // metres of cloth per weave tile
const clamp = THREE.MathUtils.clamp;

// A soft limb lathed down -Y from its joint: prof(t) is the radius at t in [0, 1]. Wrinkles are wandering partial
// rings (not perfect hoops), strongest where env(t) says, and the cross-section can be squashed elliptical.
function limb(len, prof, { seg = 44, rows = 56, sx = 1, sz = 1, folds = 0.035, freq = 13, seed = 0, env = null } = {}) {
    const pts = [new THREE.Vector2(0.0008, 0)];
    for (let i = 0; i <= rows; i++) { const t = i / rows; pts.push(new THREE.Vector2(Math.max(0.002, prof(t)), -t * len)); }
    pts.push(new THREE.Vector2(0.0008, -len));
    // LatheGeometry winds outward only for a profile that climbs in y
    pts.reverse();
    const g = new THREE.LatheGeometry(pts, seg);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const rr = Math.hypot(x, z);
        if (rr < 0.003) continue;
        const t = -y / len, th = Math.atan2(x, z);
        const e = env ? env(t) : 1;
        const ph = t * len * freq + 0.9 * Math.sin(th * 2 + seed) + 0.45 * Math.sin(th * 3 + seed * 1.7);
        const s = Math.sin(ph * TAU);
        const f = Math.sign(s) * Math.pow(Math.abs(s), 0.75) * (0.55 + 0.45 * Math.sin(th + seed * 2.3 + t * 4));
        // the cloth also bags out slightly on the outboard side, where it is not held by the body inside
        const k = 1 + folds * e * f + 0.02 * Math.sin(th + seed) * Math.sin(t * Math.PI);
        pos.setXYZ(i, x * k * sx, y, z * k * sz);
    }
    g.computeVertexNormals();
    seamNormals(g, seg, pts.length);
    const circ = TAU * prof(0.5) * (sx + sz) / 2;
    const ru = Math.max(1, Math.round(circ / TILE));
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * len / TILE);
    return g;
}
// lathe seams carry two vertices per row; average their normals so displaced cloth has no visible zip
function seamNormals(g, seg, n) {
    const nr = g.attributes.normal;
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let j = 0; j < n; j++) {
        const i0 = j, i1 = seg * n + j;
        a.fromBufferAttribute(nr, i0); b.fromBufferAttribute(nr, i1);
        a.add(b).normalize();
        nr.setXYZ(i0, a.x, a.y, a.z); nr.setXYZ(i1, a.x, a.y, a.z);
    }
}
// convolute joint: a run of rounded ridges, the way pressure-suit joints fold without changing volume
const bellowsProf = (r0, r1, n, depth) => (t) => {
    const base = THREE.MathUtils.lerp(r0, r1, t);
    const ridge = Math.pow(Math.abs(Math.sin(t * Math.PI * n)), 0.6);
    return base * (1 - depth + depth * ridge);
};
function uvScale(g, s) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s); return g; }

// a tube that follows a curve and is corrugated along its length (the cooling / oxygen umbilicals)
function hose(points, r, corr = 0.18, pitch = 0.018) {
    const curve = new THREE.CatmullRomCurve3(points);
    const len = curve.getLength();
    const g = new THREE.TubeGeometry(curve, Math.max(24, Math.round(len / pitch * 3)), r, 12, false);
    const pos = g.attributes.position, nr = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
        const s = uv.getX(i) * len;
        const d = r * corr * Math.pow(Math.abs(Math.sin((s / pitch) * Math.PI)), 0.5);
        pos.setXYZ(i, pos.getX(i) + nr.getX(i) * d, pos.getY(i) + nr.getY(i) * d, pos.getZ(i) + nr.getZ(i) * d);
    }
    g.computeVertexNormals();
    return g;
}

export function createAstronaut({ detail = 1 } = {}) {
    const q = detail >= 1 ? 1 : 0.6;
    const S = (n) => Math.max(8, Math.round(n * q));
    const fab = fabricNormal();
    const plas = plasticNormal();
    const patch = patchTexture();

    const cloth = new THREE.MeshPhysicalMaterial({
        color: 0xe7e3d9, roughness: 0.84, metalness: 0, normalMap: fab, normalScale: new THREE.Vector2(0.55, 0.55),
        sheen: 1, sheenColor: new THREE.Color(0.86, 0.85, 0.82), sheenRoughness: 0.42, vertexColors: true,
    });
    const clothGrey = cloth.clone(); clothGrey.color.set(0xc8c4bb); clothGrey.normalScale.set(0.75, 0.75);
    const clothDark = cloth.clone(); clothDark.color.set(0x3b3d41); clothDark.sheenColor.set(0x8d8f94); clothDark.roughness = 0.78;
    const accent = cloth.clone(); accent.color.set(0xa53c26); accent.sheenColor.set(0xffb39a);
    const hard = new THREE.MeshPhysicalMaterial({
        color: 0xf1efe9, roughness: 0.36, metalness: 0, normalMap: plas, normalScale: new THREE.Vector2(0.35, 0.35),
        clearcoat: 0.65, clearcoatRoughness: 0.22, vertexColors: true,
    });
    const hardGrey = hard.clone(); hardGrey.color.set(0x8e9197); hardGrey.roughness = 0.5;
    const metal = new THREE.MeshStandardMaterial({ color: 0xc4c8ce, roughness: 0.3, metalness: 1, vertexColors: true });
    const anod = new THREE.MeshStandardMaterial({ color: 0x8e9bb0, roughness: 0.38, metalness: 1, vertexColors: true });
    const anodRed = new THREE.MeshStandardMaterial({ color: 0x8a2f22, roughness: 0.36, metalness: 1, vertexColors: true });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.72, metalness: 0, vertexColors: true });
    const visor = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0.93, 0.74, 0.44), metalness: 1, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02,
        envMapIntensity: 1.0, iridescence: 0.18, iridescenceIOR: 1.5, iridescenceThicknessRange: [200, 380],
    });
    const lens = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff1d8, emissiveIntensity: 0.8, roughness: 0.2 });
    const lcd = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xffa040, emissiveIntensity: 0.3, roughness: 0.3 });
    const patchMat = new THREE.MeshStandardMaterial({ map: patch, roughness: 0.9, metalness: 0, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2 });
    const materials = { cloth, clothGrey, clothDark, accent, hard, hardGrey, metal, anod, anodRed, rubber, visor, lens, lcd, patchMat };

    const M = (g, m, p, r, s) => { const o = new THREE.Mesh(g, m); if (p) o.position.set(...p); if (r) o.rotation.set(...r); if (s) o.scale.set(...s); return o; };
    const ring = (parent, r, tube, mat, y = 0, sx = 1, sz = 1) => parent.add(M(new THREE.TorusGeometry(r, tube, S(10), S(48)), mat, [0, y, 0], [Math.PI / 2, 0, 0], [sx, sz, 1]));
    const welt = (parent, r, y, sx = 1, sz = 1) => ring(parent, r, 0.0045, clothGrey, y, sx, sz);

    const body = new THREE.Group();

    // ------------------------------------------------------------ torso
    // soft torso under the shell: waist to shoulders, elliptical
    const torso = limb(0.62, (t) => 0.25 + 0.04 * Math.sin(t * Math.PI) - 0.02 * t, { sx: 1.18, sz: 0.86, folds: 0.03, freq: 9, seed: 1, env: (t) => 0.4 + 0.6 * t });
    body.add(M(torso, cloth, [0, 0.5, 0]));
    // hard upper torso: a fibreglass shell over chest and upper back, open at the neck
    const hutProf = (t) => { const y = 1 - t; return 0.16 + 0.17 * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, y - 0.35) / 0.65, 2))); };
    const hut = limb(0.42, hutProf, { sx: 1.08, sz: 0.82, folds: 0, seg: S(64), rows: S(40) });
    body.add(M(hut, hard, [0, 0.56, 0.0]));
    // its lower lip, a raised rolled edge
    ring(body, 0.31, 0.012, hard, 0.15, 1.1, 0.84);
    // waist bearing and the brief below it
    ring(body, 0.262, 0.016, metal, -0.11, 1.12, 0.86);
    ring(body, 0.258, 0.008, anod, -0.085, 1.12, 0.86);
    const brief = limb(0.4, (t) => 0.255 + 0.03 * Math.sin(t * Math.PI * 0.8), { sx: 1.16, sz: 0.88, folds: 0.03, freq: 11, seed: 3, env: (t) => 0.3 + 0.7 * Math.sin(t * Math.PI) });
    body.add(M(brief, cloth, [0, -0.1, 0]));
    // seams running down the brief, and a stitched waist panel
    for (const sx of [-1, 1]) {
        const c = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * 0.298, -0.12, 0), new THREE.Vector3(sx * 0.305, -0.28, 0.02), new THREE.Vector3(sx * 0.27, -0.44, 0.03)]);
        body.add(new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.005, 6), clothGrey));
    }
    welt(body, 0.29, -0.2, 1.13, 0.88);

    // ------------------------------------------------------------ chest: display and control module, hoses
    const dcm = new THREE.Group();
    dcm.position.set(0, 0.26, 0.27); dcm.rotation.x = -0.32; body.add(dcm);
    dcm.add(M(new RoundedBoxGeometry(0.3, 0.15, 0.1, 4, 0.025), hard));
    dcm.add(M(new RoundedBoxGeometry(0.31, 0.03, 0.105, 2, 0.01), hardGrey, [0, -0.07, 0]));
    dcm.add(M(new THREE.BoxGeometry(0.12, 0.035, 0.004), lcd, [-0.05, 0.035, 0.051]));
    const knob = new THREE.CylinderGeometry(0.016, 0.018, 0.022, S(20));
    for (const [x, y, m] of [[0.07, 0.03, hardGrey], [0.115, 0.03, hardGrey], [0.07, -0.025, anodRed], [0.115, -0.025, hardGrey], [-0.1, -0.025, metal]]) dcm.add(M(knob, m, [x, y, 0.058], [Math.PI / 2, 0, 0]));
    for (let i = 0; i < 5; i++) dcm.add(M(new THREE.BoxGeometry(0.014, 0.006, 0.004), hardGrey, [-0.1 + i * 0.024, -0.03, 0.051]));
    // suit-side connectors and the two umbilicals looping round to the pack
    for (const sx of [-1, 1]) {
        body.add(M(new THREE.CylinderGeometry(0.028, 0.028, 0.03, S(20)), metal, [sx * 0.19, 0.2, 0.26], [0, 0, Math.PI / 2]));
        body.add(M(new THREE.TorusGeometry(0.028, 0.006, 8, S(24)), sx < 0 ? anod : anodRed, [sx * 0.205, 0.2, 0.26], [0, Math.PI / 2, 0]));
        body.add(new THREE.Mesh(hose([
            new THREE.Vector3(sx * 0.21, 0.2, 0.26), new THREE.Vector3(sx * 0.3, 0.16, 0.24), new THREE.Vector3(sx * 0.37, 0.1, 0.1),
            new THREE.Vector3(sx * 0.36, 0.06, -0.12), new THREE.Vector3(sx * 0.28, 0.1, -0.27),
        ], 0.017), rubber));
    }
    // name tape over the right chest and a pen pocket on the left sleeve's side
    {
        const c = document.createElement('canvas'); c.width = 256; c.height = 48;
        const x = c.getContext('2d'); x.fillStyle = '#d9d5cb'; x.fillRect(0, 0, 256, 48);
        x.fillStyle = '#2a2b2e'; x.font = '600 26px "G Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('COOPER', 128, 26);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
        const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, vertexColors: true });
        const g = new THREE.CylinderGeometry(0.338, 0.338, 0.035, 24, 1, true, -0.62, 0.5);
        body.add(M(g, m, [0, 0.4, 0.0], null, [1.08, 1, 0.82]));
        materials.tape = m;
    }

    // ------------------------------------------------------------ portable life support system
    const pls = new THREE.Group();
    pls.position.set(0, 0.24, -0.35); body.add(pls);
    pls.add(M(uvScale(new RoundedBoxGeometry(0.56, 0.7, 0.22, 5, 0.06), 3), hard));
    pls.add(M(uvScale(new RoundedBoxGeometry(0.5, 0.16, 0.2, 4, 0.05), 3), hard, [0, 0.37, 0.01]));
    // recessed service panels, a vent grille, the secondary oxygen pack below
    pls.add(M(new RoundedBoxGeometry(0.42, 0.24, 0.02, 3, 0.008), hardGrey, [0, 0.12, -0.108]));
    pls.add(M(new RoundedBoxGeometry(0.42, 0.22, 0.02, 3, 0.008), hardGrey, [0, -0.17, -0.108]));
    for (let i = 0; i < 7; i++) pls.add(M(new THREE.BoxGeometry(0.2, 0.008, 0.012), rubber, [0.06, 0.06 + i * 0.022 - 0.06, -0.12]));
    pls.add(M(uvScale(new RoundedBoxGeometry(0.5, 0.15, 0.2, 4, 0.05), 3), hard, [0, -0.43, 0.0]));
    for (const sx of [-1, 1]) {
        pls.add(M(new THREE.CylinderGeometry(0.03, 0.03, 0.16, S(20)), hardGrey, [sx * 0.29, -0.43, 0], [0, 0, Math.PI / 2]));
        pls.add(M(new RoundedBoxGeometry(0.03, 0.5, 0.05, 2, 0.012), rubber, [sx * 0.285, 0.02, 0.06]));
    }
    pls.add(M(new THREE.CylinderGeometry(0.008, 0.012, 0.2, 8), metal, [0.2, 0.52, -0.04]));
    pls.add(M(new THREE.SphereGeometry(0.014, 12, 8), anodRed, [0.2, 0.62, -0.04]));
    // stencilled caution band, the only lettering on the pack
    pls.add(M(new THREE.BoxGeometry(0.16, 0.018, 0.003), accent, [-0.15, 0.3, -0.113]));

    // ------------------------------------------------------------ neck ring and helmet
    ring(body, 0.172, 0.03, anod, 0.585, 1.02, 1.0);
    ring(body, 0.19, 0.012, metal, 0.565, 1.04, 1.0);
    const helmet = new THREE.Group();
    helmet.position.set(0, 0.78, 0.02); body.add(helmet);
    const HS = [1, 1.06, 1.08];
    // the extravehicular visor assembly: a hard shell over the bubble, the gold visor slid down in front
    helmet.add(M(new THREE.SphereGeometry(0.205, S(72), S(48)), hard, null, null, HS));
    const vPhi0 = Math.PI * 0.5 - Math.PI * 0.36, vPhiL = Math.PI * 0.72, vTh0 = Math.PI * 0.3, vThL = Math.PI * 0.42;
    const vis = M(new THREE.SphereGeometry(0.211, S(72), S(48), vPhi0, vPhiL, vTh0, vThL), visor, null, null, HS);
    helmet.add(vis);
    // the visor's frame: a rolled rim following the glass's edge
    {
        const R = 0.214, pts = [];
        const at = (phi, th) => new THREE.Vector3(-R * Math.cos(phi) * Math.sin(th) * HS[0], R * Math.cos(th) * HS[1], R * Math.sin(phi) * Math.sin(th) * HS[2]);
        const N = 24;
        for (let i = 0; i < N; i++) pts.push(at(vPhi0 + vPhiL * (i / N), vTh0));
        for (let i = 0; i < N; i++) pts.push(at(vPhi0 + vPhiL, vTh0 + vThL * (i / N)));
        for (let i = 0; i < N; i++) pts.push(at(vPhi0 + vPhiL * (1 - i / N), vTh0 + vThL));
        for (let i = 0; i < N; i++) pts.push(at(vPhi0, vTh0 + vThL * (1 - i / N)));
        helmet.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), 192, 0.0085, 8, true), hardGrey));
        // a centre pull tab at the top of the visor
        helmet.add(M(new RoundedBoxGeometry(0.04, 0.02, 0.016, 2, 0.006), hardGrey, [0, at(Math.PI / 2, vTh0).y + 0.004, at(Math.PI / 2, vTh0).z + 0.004], [-0.5, 0, 0]));
    }
    // the brow: a raised moulded band over the visor track
    helmet.add(M(new THREE.SphereGeometry(0.217, S(72), 6, vPhi0 - 0.12, vPhiL + 0.24, vTh0 - 0.12, 0.08), hard, null, null, HS));
    // EVA helmet lights and camera, on short arms either side
    for (const sx of [-1, 1]) {
        const pod = new THREE.Group();
        pod.position.set(sx * 0.205, 0.04, 0.05); pod.rotation.set(0, sx * 0.15, 0); helmet.add(pod);
        pod.add(M(new RoundedBoxGeometry(0.05, 0.075, 0.12, 3, 0.016), hard, [sx * 0.02, 0, 0]));
        pod.add(M(new THREE.CylinderGeometry(0.019, 0.019, 0.01, S(24)), lens, [sx * 0.02, 0.012, 0.061], [Math.PI / 2, 0, 0]));
        pod.add(M(new THREE.CylinderGeometry(0.012, 0.012, 0.01, S(20)), lens, [sx * 0.02, -0.02, 0.061], [Math.PI / 2, 0, 0]));
        pod.add(M(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 8), metal, [-sx * 0.005, 0, -0.02], [0, 0, Math.PI / 2]));
        if (sx > 0) pod.add(M(new THREE.CylinderGeometry(0.014, 0.016, 0.04, S(16)), rubber, [0.02, 0.05, 0.03], [Math.PI / 2, 0, 0]));
    }

    // ------------------------------------------------------------ arms
    const arms = [];
    for (const sx of [-1, 1]) {
        const shoulder = new THREE.Group();
        shoulder.position.set(sx * 0.36, 0.42, -0.01);
        body.add(shoulder);
        // scye bearing on the shell, then a short bellows into the upper arm
        const sb = new THREE.Group(); sb.rotation.z = sx * Math.PI / 2; shoulder.add(sb);
        ring(sb, 0.116, 0.015, anod, 0.0);
        ring(sb, 0.12, 0.007, metal, -0.016);
        const arm = new THREE.Group(); shoulder.add(arm);
        arm.add(M(limb(0.1, bellowsProf(0.118, 0.11, 3, 0.07), { folds: 0.0, seg: S(40), rows: S(36) }), cloth, [0, -0.02, 0]));
        arm.add(M(limb(0.22, (t) => 0.106 - 0.012 * t + 0.006 * Math.sin(t * Math.PI), { folds: 0.05, freq: 14, seed: sx * 2, env: (t) => 0.35 + 0.65 * Math.abs(t - 0.45) * 2 }), cloth, [0, -0.11, 0]));
        // the mission patch and (right arm) a red band
        welt(arm, 0.108, -0.16);
        if (sx < 0) {
            const g = new THREE.CylinderGeometry(0.112, 0.112, 0.085, 24, 1, true, -Math.PI / 2 - 0.62, 1.25);
            arm.add(M(g, patchMat, [0, -0.17, 0]));
        } else {
            arm.add(M(limb(0.022, () => 0.111, { folds: 0, rows: 4 }), accent, [0, -0.19, 0]));
        }
        const elbow = new THREE.Group();
        elbow.position.y = -0.27; arm.add(elbow);
        elbow.add(M(limb(0.1, bellowsProf(0.096, 0.09, 4, 0.08), { folds: 0, seg: S(40), rows: S(40) }), cloth, [0, 0.0, 0]));
        elbow.add(M(limb(0.2, (t) => 0.09 - 0.012 * t, { folds: 0.05, freq: 15, seed: sx * 5, env: (t) => 0.25 + 0.75 * (1 - t) }), cloth, [0, -0.08, 0]));
        const wrist = new THREE.Group();
        wrist.position.y = -0.27; elbow.add(wrist);
        // wrist disconnect: two bearing races, colour-coded per side
        ring(wrist, 0.074, 0.017, metal, 0.01);
        ring(wrist, 0.072, 0.009, sx < 0 ? anod : anodRed, -0.008);
        // gauntlet cuff, flared, then the hand
        wrist.add(M(limb(0.09, (t) => 0.07 + 0.01 * t, { folds: 0.02, freq: 18, seed: sx }), clothGrey, [0, -0.015, 0]));
        const hand = new THREE.Group(); hand.position.y = -0.125; hand.rotation.set(0.15, sx * 0.25, 0); hand.scale.setScalar(1.15); wrist.add(hand);
        hand.add(M(new RoundedBoxGeometry(0.095, 0.1, 0.042, 4, 0.018), cloth));
        hand.add(M(new RoundedBoxGeometry(0.085, 0.085, 0.012, 3, 0.005), clothDark, [0, -0.008, -0.02]));
        // four fingers in three phalanges each, curled loosely as a pressurised glove holds them
        for (let f = 0; f < 4; f++) {
            let seg = new THREE.Group();
            seg.position.set(-0.033 + f * 0.022, -0.05, 0); seg.rotation.x = -0.25 - f * 0.05; hand.add(seg);
            const L = [0.034, 0.026, 0.022].map((l) => l * (f === 0 || f === 3 ? 0.88 : 1));
            for (let k = 0; k < 3; k++) {
                seg.add(M(new THREE.CapsuleGeometry(0.0105 - k * 0.0008, L[k], 4, S(10)), k === 2 ? clothDark : cloth, [0, -L[k] / 2, 0]));
                const nx = new THREE.Group(); nx.position.y = -L[k]; nx.rotation.x = -0.45; seg.add(nx); seg = nx;
            }
        }
        const thumb = new THREE.Group(); thumb.position.set(sx * -0.045, -0.015, 0.012); thumb.rotation.set(-0.5, 0, sx * 0.85); hand.add(thumb);
        thumb.add(M(new THREE.CapsuleGeometry(0.012, 0.03, 4, S(10)), cloth, [0, -0.02, 0]));
        const t2 = new THREE.Group(); t2.position.y = -0.04; t2.rotation.x = -0.4; thumb.add(t2);
        t2.add(M(new THREE.CapsuleGeometry(0.011, 0.024, 4, S(10)), clothDark, [0, -0.015, 0]));
        // tether ring on the cuff
        wrist.add(M(new THREE.TorusGeometry(0.012, 0.003, 6, 16), metal, [sx * 0.075, -0.05, 0], [0, Math.PI / 2, 0]));

        shoulder.rotation.set(-0.25, 0, sx * 0.55);
        elbow.rotation.set(-0.7, 0, -sx * 0.12);
        wrist.rotation.set(0, sx * 0.4, 0);
        arms.push({ shoulder, elbow, wrist, sx });
    }

    // ------------------------------------------------------------ legs
    const legs = [];
    for (const sx of [-1, 1]) {
        const hip = new THREE.Group();
        hip.position.set(sx * 0.135, -0.43, 0);
        body.add(hip);
        ring(hip, 0.125, 0.018, anod, 0.0);
        hip.add(M(limb(0.1, bellowsProf(0.13, 0.125, 3, 0.06), { folds: 0, seg: S(40), rows: S(36) }), cloth, [0, -0.01, 0]));
        hip.add(M(limb(0.3, (t) => 0.122 - 0.022 * t + 0.008 * Math.sin(t * Math.PI), { folds: 0.045, freq: 11, seed: sx * 3, env: (t) => 0.3 + 0.7 * Math.abs(t - 0.5) * 2 }), cloth, [0, -0.1, 0]));
        // thigh pocket with a flap and its welt, and a red band on the left leg (commander's stripes)
        hip.add(M(new RoundedBoxGeometry(0.1, 0.13, 0.05, 3, 0.02), cloth, [sx * 0.09, -0.24, 0.06], [0, sx * 0.85, 0]));
        hip.add(M(new RoundedBoxGeometry(0.104, 0.04, 0.054, 3, 0.012), clothGrey, [sx * 0.09, -0.18, 0.062], [0, sx * 0.85, 0]));
        welt(hip, 0.112, -0.33);
        if (sx < 0) hip.add(M(limb(0.03, () => 0.113, { folds: 0, rows: 4 }), accent, [0, -0.36, 0]));
        const knee = new THREE.Group();
        knee.position.y = -0.4; hip.add(knee);
        knee.add(M(limb(0.11, bellowsProf(0.105, 0.098, 4, 0.08), { folds: 0, seg: S(40), rows: S(40) }), cloth));
        knee.add(M(limb(0.28, (t) => 0.098 - 0.018 * t, { folds: 0.045, freq: 13, seed: sx * 7, env: (t) => 0.3 + 0.7 * (1 - t) }), cloth, [0, -0.09, 0]));
        welt(knee, 0.092, -0.2);
        const ankle = new THREE.Group();
        ankle.position.y = -0.37; knee.add(ankle);
        ring(ankle, 0.086, 0.016, metal, 0.0);
        // boot: a moulded upper over a lugged sole, toe cap and heel counter
        ankle.add(M(limb(0.1, (t) => 0.084 + 0.01 * t, { folds: 0.015, freq: 18, seed: sx }), clothGrey, [0, -0.01, 0]));
        ankle.add(M(uvScale(new RoundedBoxGeometry(0.15, 0.1, 0.27, 5, 0.045), 2), hard, [0, -0.13, 0.05]));
        ankle.add(M(new RoundedBoxGeometry(0.16, 0.035, 0.29, 3, 0.014), rubber, [0, -0.185, 0.05]));
        for (let i = 0; i < 6; i++) ankle.add(M(new THREE.BoxGeometry(0.15, 0.008, 0.016), rubber, [0, -0.205, -0.07 + i * 0.045]));
        ankle.add(M(new THREE.SphereGeometry(0.075, S(24), S(12), 0, TAU, 0, Math.PI / 2), hard, [0, -0.15, 0.15], [Math.PI / 2, 0, 0], [1, 0.75, 0.6]));
        legs.push({ hip, knee, ankle, sx });
    }

    const root = new THREE.Group();
    const tumble = new THREE.Group();
    root.add(tumble);
    tumble.add(body);

    // ------------------------------------------------------------ bake occlusion, then merge rigid parts per material
    for (const l of legs) { l.hip.rotation.set(l.sx < 0 ? -0.5 : 0.18, 0, l.sx * 0.12); l.knee.rotation.x = l.sx < 0 ? 0.95 : 0.55; l.ankle.rotation.x = -0.25; }
    root.updateMatrixWorld(true);
    bakeOcclusion(body);
    const keep = new Set([body]);
    for (const a of arms) { keep.add(a.shoulder); keep.add(a.elbow); }
    for (const l of legs) { keep.add(l.hip); keep.add(l.knee); }
    for (const g of keep) flatten(g, keep);
    let tris = 0, draws = 0;
    body.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; draws++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });

    // ------------------------------------------------------------ motion: a slow zero-g float, a spring to the cursor
    const target = new THREE.Vector2(), lean = new THREE.Vector2(), leanV = new THREE.Vector2();
    function update(dt, time, pointer, { tumbleAmt = 1, spin = 0 } = {}) {
        target.set(-pointer.y * 0.45, pointer.x * 0.75);
        const k = 10, c = 2 * Math.sqrt(k) * 0.85;
        const h = Math.min(dt, 1 / 30);
        leanV.x += (k * (target.x - lean.x) - c * leanV.x) * h;
        leanV.y += (k * (target.y - lean.y) - c * leanV.y) * h;
        lean.addScaledVector(leanV, h);
        tumble.rotation.set(
            (0.18 + Math.sin(time * 0.11) * 0.2) * tumbleAmt + lean.x + spin * 0.7,
            (-0.5 + Math.sin(time * 0.07) * 0.6) * tumbleAmt + lean.y + spin,
            (-0.32 + Math.sin(time * 0.09 + 1.3) * 0.16) * tumbleAmt + spin * 0.4,
        );
        body.position.y = Math.sin(time * 0.37) * 0.04;
        for (const a of arms) {
            a.shoulder.rotation.z = a.sx * (0.55 + Math.sin(time * 0.5 + a.sx) * 0.06);
            a.shoulder.rotation.x = -0.25 + Math.sin(time * 0.33 + a.sx * 1.4) * 0.05;
            a.elbow.rotation.x = -0.7 + Math.sin(time * 0.43 + a.sx * 2) * 0.08;
        }
        for (const l of legs) l.knee.rotation.x = (l.sx < 0 ? 0.95 : 0.55) + Math.sin(time * 0.31 + l.sx) * 0.06;
    }

    return { root, body, update, visor, materials, stats: { draws, tris: Math.round(tris) } };
}

// Per-vertex ambient occlusion from every other part's bounding sphere (analytic sphere occlusion, cosine-weighted).
function bakeOcclusion(body) {
    const inv = new THREE.Matrix4().copy(body.matrixWorld).invert();
    const parts = [];
    body.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry.computeBoundingSphere();
        const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
        const s = o.geometry.boundingSphere.clone().applyMatrix4(m);
        parts.push({ o, m, s });
    });
    const occ = parts.filter((p) => p.s.radius > 0.035);
    const v = new THREE.Vector3(), n = new THREE.Vector3(), d = new THREE.Vector3(), nm = new THREE.Matrix3();
    for (const p of parts) {
        const g = p.o.geometry;
        const pos = g.attributes.position, nr = g.attributes.normal;
        const col = new Float32Array(pos.count * 3);
        nm.getNormalMatrix(p.m);
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(p.m);
            n.fromBufferAttribute(nr, i).applyMatrix3(nm).normalize();
            let a = 0;
            for (const q of occ) {
                if (q === p) continue;
                d.copy(q.s.center).sub(v);
                const dist = d.length();
                const r = q.s.radius * 0.72;
                if (dist < r * 0.5) continue;
                const cos = Math.max(0, n.dot(d) / dist);
                a += cos * (r * r) / Math.max(dist * dist, r * r);
            }
            const ao = clamp(1 - a * 0.42, 0.32, 1);
            col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
}

// Flatten every mesh under a moving joint (down to the next moving joint) into one mesh per material, baked into the
// joint's space. Static sub-groups are left behind empty, so the hierarchy below them still hangs where it did.
function flatten(group, keep) {
    const byMat = new Map();
    const gInv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const m = new THREE.Matrix4();
    const visit = (o) => {
        for (const c of [...o.children]) {
            if (keep.has(c)) continue;
            if (c.isMesh) {
                const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
                for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
                if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
                if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
                g.applyMatrix4(m.multiplyMatrices(gInv, c.matrixWorld));
                if (!byMat.has(c.material)) byMat.set(c.material, []);
                byMat.get(c.material).push(g);
                o.remove(c);
            } else visit(c);
        }
    };
    visit(group);
    for (const [mat, list] of byMat) {
        const merged = mergeGeometries(list, false);
        if (merged) group.add(new THREE.Mesh(merged, mat));
    }
}
