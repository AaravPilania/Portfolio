// The tesseract: Murph's bookshelf repeated on a 3D lattice and dragged out along time. Every book becomes a strand
// running to the vanishing point, shelf frames repeat every cell like the slices of a loaf, and light runs down the
// strands in pulses. The lattice is anchored to world space and re-centred on the camera one cell at a time, so it
// is infinite with a few thousand instances and the pulses never pop.
import * as THREE from 'three';

const vert = /* glsl */`
attribute vec3 aColor;
attribute vec4 aInfo;  // seed, axis (0 x, 1 y, 2 z), glow, speed
varying vec3 vColor;
varying vec4 vInfo;
varying vec3 vWorld;
varying vec3 vN;
void main() {
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vColor = aColor;
    vInfo = aInfo;
    gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const frag = /* glsl */`
precision highp float;
varying vec3 vColor;
varying vec4 vInfo;
varying vec3 vWorld;
varying vec3 vN;
uniform float uTime;
uniform vec3 uFog;
uniform vec3 uFogFar;
uniform float uFogDensity;
uniform float uReveal;
uniform float uGain;
uniform float uFlow;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
    float seed = vInfo.x;
    int axis = int(vInfo.y + 0.5);
    float along = axis == 0 ? vWorld.x : axis == 1 ? vWorld.y : vWorld.z;
    vec3 n = normalize(vN);

    // warm key from above-ahead, cooler bounce from below
    vec3 L = normalize(vec3(0.35, 0.8, 0.45));
    float diff = 0.28 + 0.72 * max(dot(n, L), 0.0);
    float back = max(dot(n, -L), 0.0) * 0.18;
    // book spines: worn bands along each strand, so each reads as a moment, not a pipe
    float band = 0.82 + 0.18 * sin(along * (0.6 + seed * 1.7) + seed * 40.0);
    vec3 col = vColor * (diff + back) * band;

    // light running along time
    float s = along * 0.08 + uTime * vInfo.w * uFlow + seed * 17.0;
    float pulse = pow(0.5 + 0.5 * sin(s * 6.2831), 18.0);
    float ember = pow(0.5 + 0.5 * sin(s * 2.1 + 1.3), 40.0);
    col += vec3(1.0, 0.62, 0.26) * (pulse * 2.4 + ember * 1.4) * vInfo.z;

    float d = length(vWorld - cameraPosition);
    float fog = 1.0 - exp(-d * uFogDensity);
    col = mix(col, uFog, fog);
    col = mix(col, uFogFar, pow(fog, 5.0));
    // the lattice resolves out of the dark from the astronaut outward
    float vis = 1.0 - smoothstep(uReveal * 0.75, uReveal, d);
    gl_FragColor = vec4(col * uGain * vis + uFog * (1.0 - vis) * 0.0, 1.0);
    if (vis < 0.003) discard;
}
`;

const BOOKS = [0x6b3d22, 0x8a5a2b, 0x9c6b33, 0x4a2c1a, 0x7d3a26, 0xb58a4c, 0x5e4a33, 0x3a2a20, 0xa47645, 0x6f5236, 0x2f3a38, 0x8b4a2f, 0xc9a46a];

export function createTesseract({ N = 4, layers = 12 } = {}) {
    const S = 5.0;
    const BOOK_LEN = 170;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const R = (() => { let s = 1234567; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();

    const mats = [], cols = [], infos = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    const c = new THREE.Color();
    const push = (x, y, z, sx, sy, sz, color, axis, glow, speed) => {
        m.compose(p.set(x, y, z), q, sc.set(sx, sy, sz));
        mats.push(m.clone());
        c.set(color);
        cols.push(c.r, c.g, c.b);
        infos.push(R(), axis, glow, speed);
    };

    for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
        const cx = i * S, cy = j * S;
        // keep the cell the camera flies through clear
        if (i === 0 && j === 0) continue;
        if (R() < 0.82) {
            // a shelf of books seen end-on, each extruded into a thread through time
            const shelfY = cy - S * 0.42;
            let x = cx - S * 0.46;
            while (x < cx + S * 0.44) {
                const w = 0.12 + R() * 0.26, h = 0.6 + R() * 1.1 * (R() < 0.15 ? 1.6 : 1);
                if (R() < 0.9) push(x + w / 2, shelfY + h / 2, 0, w * 0.92, h, BOOK_LEN, BOOKS[(R() * BOOKS.length) | 0], 2, R() < 0.22 ? 0.6 + R() : 0.04, 0.4 + R() * 0.9);
                x += w;
            }
            // a second, shorter shelf above
            const shelf2 = cy + S * 0.05;
            x = cx - S * 0.46;
            while (x < cx + S * 0.44) {
                const w = 0.1 + R() * 0.22, h = 0.5 + R() * 0.8;
                if (R() < 0.75) push(x + w / 2, shelf2 + h / 2, 0, w * 0.92, h, BOOK_LEN, BOOKS[(R() * BOOKS.length) | 0], 2, R() < 0.18 ? 0.6 + R() : 0.04, 0.4 + R() * 0.9);
                x += w;
            }
        }
        // a few bright threads hanging free in the cell
        const nThreads = (R() * 3) | 0;
        for (let t = 0; t < nThreads; t++) push(cx + (R() - 0.5) * S * 0.9, cy + (R() - 0.5) * S * 0.9, 0, 0.025, 0.025, BOOK_LEN, 0xffc27a, 2, 1.6 + R() * 1.4, 0.8 + R() * 1.5);
    }
    // shelf frames, repeating along time: horizontal and vertical slats at each layer
    for (let k = -layers; k <= layers; k++) {
        const z = k * S;
        for (let j = -N; j <= N + 1; j++) {
            push(0, j * S - S * 0.42 - 0.03, z, (2 * N + 1) * S, 0.05, 0.22, 0x3b2616, 0, 0.0, 0.0);
            push(0, j * S - S * 0.5, z, (2 * N + 1) * S, 0.06, 0.12, 0x24170e, 0, R() < 0.2 ? 0.5 : 0.0, 1.0);
        }
        for (let i = -N; i <= N + 1; i++) push(i * S - S * 0.5, 0, z, 0.06, (2 * N + 1) * S, 0.12, 0x24170e, 1, R() < 0.2 ? 0.5 : 0.0, 1.0);
        // fine time-threads across the lattice, both ways, catching the light
        for (let t = 0; t < 7; t++) {
            push(0, (R() - 0.5) * (2 * N + 1) * S, z + (R() - 0.5) * S, (2 * N + 1) * S, 0.012, 0.012, 0xffc78a, 0, 0.8 + R() * 1.8, 0.5 + R());
            push((R() - 0.5) * (2 * N + 1) * S, 0, z + (R() - 0.5) * S, 0.012, (2 * N + 1) * S, 0.012, 0xffc78a, 1, 0.8 + R() * 1.8, 0.5 + R());
        }
    }

    const count = mats.length;
    const mat = new THREE.ShaderMaterial({
        vertexShader: vert, fragmentShader: frag,
        uniforms: {
            uTime: { value: 0 }, uFog: { value: new THREE.Color(0.2, 0.1, 0.035) }, uFogFar: { value: new THREE.Color(1.1, 0.62, 0.26) }, uFogDensity: { value: 0.032 },
            uReveal: { value: 0 }, uGain: { value: 1 }, uFlow: { value: 1 },
        },
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    for (let i = 0; i < count; i++) mesh.setMatrixAt(i, mats[i]);
    mesh.geometry = geo.clone();
    mesh.geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(cols), 3));
    mesh.geometry.setAttribute('aInfo', new THREE.InstancedBufferAttribute(new Float32Array(infos), 4));
    mesh.frustumCulled = false;

    const root = new THREE.Group();
    root.add(mesh);
    // re-centre on the camera a whole cell at a time; the camera rides the middle of the clear cell
    function follow(camPos) {
        root.position.set(0, 0, Math.round(camPos.z / S) * S);
    }
    return { root, mesh, uniforms: mat.uniforms, follow, S, count };
}
