// Cooper, after the fall. An EVA suit from primitives, closer to a real suit than a toy: soft woven layers over a hard
// upper torso, bellows at every joint, thigh pockets, gauntlet gloves, a PLSS pack with its hoses, and a gold-tinted
// wraparound visor that holds the amber. Posed in a relaxed zero-g float, tumbling slowly; the cursor leans on him
// through a critically damped spring.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { fabricBump } from './textures.js';

// a soft tapered sleeve hanging down -Y from its joint
function sleeve(len, r0, r1) {
    const g = new THREE.CapsuleGeometry((r0 + r1) / 2, len, 8, 24);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const k = THREE.MathUtils.clamp(0.5 - y / (len + r0 + r1), 0, 1);
        // fabric sags a touch between the ends
        const s = (THREE.MathUtils.lerp(r0, r1, k) * (1 + 0.05 * Math.sin(k * Math.PI))) / ((r0 + r1) / 2);
        pos.setX(i, pos.getX(i) * s); pos.setZ(i, pos.getZ(i) * s);
    }
    g.computeVertexNormals();
    g.translate(0, -len / 2, 0);
    return g;
}
function bellows(parent, r, n, step, mat, y0 = 0) {
    for (let i = 0; i < n; i++) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.12, 8, 32), mat);
        t.rotation.x = Math.PI / 2; t.position.y = y0 - i * step;
        parent.add(t);
    }
}

export function createAstronaut() {
    const bump = fabricBump();
    bump.repeat.set(4, 4);
    const suit = new THREE.MeshPhysicalMaterial({ color: 0xdedad1, roughness: 0.86, metalness: 0, bumpMap: bump, bumpScale: 1.1, sheen: 0.35, sheenColor: new THREE.Color(0xfff6ea), sheenRoughness: 0.6 });
    const layer = new THREE.MeshPhysicalMaterial({ color: 0xcdc8bd, roughness: 0.9, metalness: 0, bumpMap: bump, bumpScale: 0.8, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) });
    const hard = new THREE.MeshPhysicalMaterial({ color: 0xe9e6df, roughness: 0.4, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.35 });
    const ring = new THREE.MeshStandardMaterial({ color: 0x7d8086, roughness: 0.32, metalness: 0.95 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.62, metalness: 0.25 });
    const glove = new THREE.MeshPhysicalMaterial({ color: 0x55575c, roughness: 0.75, metalness: 0, sheen: 0.4, sheenColor: new THREE.Color(0xaaaaaa) });
    const accent = new THREE.MeshStandardMaterial({ color: 0xa8492b, roughness: 0.7, metalness: 0 });
    const visor = new THREE.MeshPhysicalMaterial({ color: 0x3a2a12, roughness: 0.05, metalness: 1.0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2, iridescence: 0.25, iridescenceIOR: 1.6 });

    const M = (g, m, p, r, s) => { const o = new THREE.Mesh(g, m); if (p) o.position.set(...p); if (r) o.rotation.set(...r); if (s) o.scale.set(...s); return o; };
    const body = new THREE.Group();

    // soft torso, a hard upper torso shell over it, and the brief section
    const torsoG = new THREE.CapsuleGeometry(0.27, 0.36, 8, 32);
    torsoG.scale(1.2, 1, 0.9);
    body.add(M(torsoG, suit, [0, -0.02, 0]));
    body.add(M(new RoundedBoxGeometry(0.66, 0.46, 0.44, 5, 0.14), hard, [0, 0.2, -0.01]));
    body.add(M(new RoundedBoxGeometry(0.5, 0.22, 0.38, 4, 0.1), layer, [0, -0.4, 0]));
    // waist bearing, sitting on the body
    body.add(M(new THREE.TorusGeometry(0.29, 0.03, 10, 40), ring, [0, -0.13, 0], [Math.PI / 2, 0, 0], [1.05, 0.88, 1]));
    // chest display & control module, with its strap and hoses into the pack
    body.add(M(new RoundedBoxGeometry(0.32, 0.15, 0.09, 3, 0.03), hard, [0, 0.08, 0.27], [-0.2, 0, 0]));
    body.add(M(new THREE.BoxGeometry(0.22, 0.05, 0.005), dark, [0, 0.105, 0.322], [-0.2, 0, 0]));
    for (const [x, c] of [[-0.11, accent], [0.11, dark]]) body.add(M(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 16), c, [x, 0.06, 0.325], [Math.PI / 2 - 0.2, 0, 0]));
    for (const sx of [-1, 1]) {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * 0.12, 0.1, 0.3), new THREE.Vector3(sx * 0.2, 0.3, 0.26), new THREE.Vector3(sx * 0.22, 0.45, 0.06), new THREE.Vector3(sx * 0.2, 0.42, -0.24)]);
        body.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.016, 8), dark));
    }
    // flag-less mission patch and an arm stripe: the only colour
    body.add(M(new THREE.CircleGeometry(0.045, 32), accent, [0.2, 0.32, 0.215], [-0.15, 0.3, 0]));

    // PLSS
    body.add(M(new RoundedBoxGeometry(0.6, 0.72, 0.24, 4, 0.06), hard, [0, 0.08, -0.34]));
    body.add(M(new RoundedBoxGeometry(0.5, 0.2, 0.05, 3, 0.02), layer, [0, 0.3, -0.47]));
    body.add(M(new RoundedBoxGeometry(0.5, 0.2, 0.05, 3, 0.02), layer, [0, -0.06, -0.47]));
    body.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.04), accent, [0.22, 0.38, -0.47]));

    // neck bearing and helmet
    body.add(M(new THREE.TorusGeometry(0.19, 0.04, 12, 48), ring, [0, 0.47, 0.02], [Math.PI / 2, 0, 0]));
    const helmet = new THREE.Group();
    helmet.position.set(0, 0.67, 0.03); body.add(helmet);
    helmet.add(M(new THREE.SphereGeometry(0.24, 56, 40), hard, null, null, [1, 1.05, 1.04]));
    // wraparound visor: front, a little wider than the face, gold-tinted
    helmet.add(M(new THREE.SphereGeometry(0.246, 56, 40, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.2, Math.PI * 0.44), visor, null, null, [1, 1.05, 1.04]));
    // brow ridge over the glass
    helmet.add(M(new THREE.SphereGeometry(0.252, 56, 8, Math.PI * 0.1, Math.PI * 0.8, Math.PI * 0.17, Math.PI * 0.04), hard, null, null, [1, 1.05, 1.04]));
    for (const sx of [-1, 1]) {
        helmet.add(M(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 20), dark, [sx * 0.235, 0.05, 0.02], [0, 0, Math.PI / 2]));
        helmet.add(M(new THREE.CylinderGeometry(0.026, 0.026, 0.01, 20), ring, [sx * 0.268, 0.05, 0.02], [0, 0, Math.PI / 2]));
    }

    // arms: relaxed float, elbows soft, hands loosely open
    const arms = [];
    for (const sx of [-1, 1]) {
        const shoulder = new THREE.Group();
        shoulder.position.set(sx * 0.37, 0.3, 0);
        shoulder.rotation.set(-0.3, 0, sx * 0.62);
        body.add(shoulder);
        shoulder.add(M(new THREE.SphereGeometry(0.13, 32, 20), hard));
        bellows(shoulder, 0.115, 2, 0.04, layer, -0.1);
        shoulder.add(M(sleeve(0.26, 0.112, 0.1), suit, [0, -0.08, 0]));
        if (sx > 0) shoulder.add(M(new THREE.TorusGeometry(0.108, 0.012, 8, 32), accent, [0, -0.2, 0], [Math.PI / 2, 0, 0]));
        const elbow = new THREE.Group();
        elbow.position.y = -0.38; shoulder.add(elbow);
        elbow.rotation.set(-0.75, 0, -sx * 0.18);
        bellows(elbow, 0.1, 3, 0.035, layer, 0.04);
        elbow.add(M(sleeve(0.22, 0.098, 0.084), suit, [0, -0.03, 0]));
        const wrist = new THREE.Group();
        wrist.position.y = -0.3; elbow.add(wrist);
        wrist.add(M(new THREE.TorusGeometry(0.08, 0.02, 8, 28), ring, null, [Math.PI / 2, 0, 0]));
        wrist.add(M(new THREE.CylinderGeometry(0.088, 0.075, 0.08, 24), glove, [0, -0.04, 0]));
        wrist.add(M(new RoundedBoxGeometry(0.1, 0.13, 0.065, 3, 0.03), glove, [0, -0.13, 0.005], [0.2, 0, 0]));
        for (let f = 0; f < 4; f++) wrist.add(M(new THREE.CapsuleGeometry(0.014, 0.05, 4, 8), glove, [-0.033 + f * 0.022, -0.22, 0.02], [0.5, 0, 0]));
        wrist.add(M(new THREE.CapsuleGeometry(0.016, 0.045, 4, 8), glove, [sx * -0.055, -0.13, 0.03], [0.3, 0, sx * 0.7]));
        arms.push({ shoulder, elbow, sx });
    }
    // legs
    const legs = [];
    for (const sx of [-1, 1]) {
        const hip = new THREE.Group();
        hip.position.set(sx * 0.15, -0.46, 0);
        hip.rotation.set(sx < 0 ? -0.55 : 0.2, 0, sx * 0.2);
        body.add(hip);
        hip.add(M(new THREE.SphereGeometry(0.135, 28, 18), suit));
        hip.add(M(sleeve(0.38, 0.135, 0.11), suit, [0, -0.04, 0]));
        hip.add(M(new RoundedBoxGeometry(0.1, 0.16, 0.06, 3, 0.02), layer, [sx * 0.12, -0.24, 0.04], [0, sx * 0.5, 0]));
        const knee = new THREE.Group();
        knee.position.y = -0.52; hip.add(knee);
        knee.rotation.x = sx < 0 ? 1.05 : 0.6;
        bellows(knee, 0.112, 3, 0.04, layer, 0.05);
        knee.add(M(sleeve(0.34, 0.108, 0.092), suit, [0, -0.03, 0]));
        const ankle = new THREE.Group();
        ankle.position.y = -0.44; knee.add(ankle);
        ankle.add(M(new THREE.TorusGeometry(0.095, 0.02, 8, 28), ring, null, [Math.PI / 2, 0, 0]));
        ankle.add(M(new RoundedBoxGeometry(0.17, 0.16, 0.3, 4, 0.05), hard, [0, -0.08, 0.05]));
        ankle.add(M(new RoundedBoxGeometry(0.18, 0.04, 0.32, 2, 0.015), dark, [0, -0.17, 0.05]));
        legs.push({ hip, knee, sx });
    }

    const root = new THREE.Group();
    const tumble = new THREE.Group();
    root.add(tumble);
    tumble.add(body);

    // spring toward the cursor, layered on a slow procedural tumble
    const target = new THREE.Vector2(), lean = new THREE.Vector2(), leanV = new THREE.Vector2();
    function update(dt, time, pointer) {
        target.set(-pointer.y * 0.45, pointer.x * 0.75);
        const k = 10, c = 2 * Math.sqrt(k) * 0.85;
        const h = Math.min(dt, 1 / 30);
        leanV.x += (k * (target.x - lean.x) - c * leanV.x) * h;
        leanV.y += (k * (target.y - lean.y) - c * leanV.y) * h;
        lean.addScaledVector(leanV, h);
        tumble.rotation.set(
            0.18 + Math.sin(time * 0.11) * 0.2 + lean.x,
            -0.5 + Math.sin(time * 0.07) * 0.6 + lean.y,
            -0.32 + Math.sin(time * 0.09 + 1.3) * 0.16,
        );
        body.position.y = Math.sin(time * 0.37) * 0.04;
        for (const a of arms) {
            a.shoulder.rotation.z = a.sx * (0.62 + Math.sin(time * 0.5 + a.sx) * 0.06);
            a.elbow.rotation.x = -0.75 + Math.sin(time * 0.43 + a.sx * 2) * 0.08;
        }
        for (const l of legs) l.knee.rotation.x = (l.sx < 0 ? 1.05 : 0.6) + Math.sin(time * 0.31 + l.sx) * 0.06;
    }

    return { root, update, visor };
}
