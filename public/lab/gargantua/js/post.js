// HDR in, film out: a mip-chain bloom (13-tap down, tent up), then one composite pass that grades like a print:
// filmic curve, gentle halation, grain that lives in the mids, letterbox, the horizon's radial streaks and the white.
import * as THREE from 'three';

const quadVert = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const downFrag = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uFirst;
vec3 S(vec2 o) { return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main() {
    vec3 a = S(vec2(-2, 2)), b = S(vec2(0, 2)), c = S(vec2(2, 2));
    vec3 d = S(vec2(-2, 0)), e = S(vec2(0, 0)), f = S(vec2(2, 0));
    vec3 g = S(vec2(-2, -2)), h = S(vec2(0, -2)), i = S(vec2(2, -2));
    vec3 j = S(vec2(-1, 1)), k = S(vec2(1, 1)), l = S(vec2(-1, -1)), m = S(vec2(1, -1));
    vec3 col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
    if (uFirst > 0.5) {
        float br = max(col.r, max(col.g, col.b));
        float soft = clamp(br - uThreshold * 0.5, 0.0, uThreshold);
        soft = soft * soft / (4.0 * uThreshold + 1e-4);
        col *= max(soft, br - uThreshold) / max(br, 1e-4);
        col = min(col, vec3(60.0));
    }
    gl_FragColor = vec4(col, 1.0);
}
`;

const upFrag = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uRadius;
vec3 S(vec2 o) { return texture2D(tSrc, vUv + o * uTexel * uRadius).rgb; }
void main() {
    vec3 col = S(vec2(0)) * 4.0 + (S(vec2(-1, 0)) + S(vec2(1, 0)) + S(vec2(0, 1)) + S(vec2(0, -1))) * 2.0
        + S(vec2(-1, -1)) + S(vec2(1, -1)) + S(vec2(-1, 1)) + S(vec2(1, 1));
    gl_FragColor = vec4(col / 16.0, 1.0);
}
`;

const compFrag = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform vec2 uRes;
uniform float uTime;
uniform float uBloom;
uniform float uExposure;
uniform float uGrain;
uniform float uVignette;
uniform float uLetter;
uniform float uStreak;
uniform float uWhite;
uniform float uBlack;
uniform float uCA;
uniform vec3 uLift;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

// Narkowicz ACES fit, slightly softened shoulder so the disk's core rolls into white without a hard plateau
vec3 filmic(vec3 x) {
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

void main() {
    vec2 uv = vUv;
    vec2 dc = uv - 0.5;
    vec3 col;
    if (uStreak > 0.002) {
        // light dragged toward the vanishing point: radial smear, weighted to the outer samples
        vec3 acc = vec3(0.0); float wsum = 0.0;
        for (int i = 0; i < 32; i++) {
            float t = float(i) / 31.0;
            float s = 1.0 - uStreak * 0.85 * t;
            float w = 1.0 - t * 0.5;
            vec3 c = texture2D(tScene, 0.5 + dc * s).rgb;
            // only the hottest light survives the stretch: streaks, not fog
            acc += c * w * (1.0 + 2.0 * smoothstep(0.8, 3.0, max(c.r, max(c.g, c.b))) * uStreak);
            wsum += w;
        }
        col = acc / wsum;
    } else {
        float ca = uCA * dot(dc, dc);
        col = vec3(texture2D(tScene, uv - dc * ca).r, texture2D(tScene, uv).g, texture2D(tScene, uv + dc * ca).b);
    }
    vec3 bloom = texture2D(tBloom, uv).rgb;
    // halation: film's red-orange fringe around hot highlights
    col += bloom * uBloom * vec3(1.06, 0.96, 0.88);
    col *= uExposure;
    col = filmic(col);
    col = col + uLift * (1.0 - col);

    float vig = smoothstep(1.15, 0.2, length(dc * vec2(uRes.x / uRes.y, 1.0) * 0.82));
    col *= mix(1.0, vig, uVignette);
    col = toSRGB(col);

    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float gr = hash12(floor(uv * uRes) + fract(uTime * 13.7) * 371.0) + hash12(floor(uv * uRes * 0.5) + fract(uTime * 7.3) * 113.0) - 1.0;
    col += gr * uGrain * (0.35 + 0.65 * 4.0 * lum * (1.0 - lum));

    col = mix(col, vec3(1.0, 0.995, 0.985), uWhite);
    col *= 1.0 - uBlack;
    float bar = step(0.5 - uLetter, abs(uv.y - 0.5));
    col *= 1.0 - bar;
    gl_FragColor = vec4(col, 1.0);
}
`;

export class Post {
    constructor(renderer) {
        this.renderer = renderer;
        this.levels = 6;
        this.samples = 4;
        const opts = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
        this.rtScene = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: this.samples, depthBuffer: true });
        this.rtBH = new THREE.WebGLRenderTarget(4, 4, opts);
        this.mips = [];
        for (let i = 0; i < 8; i++) this.mips.push(new THREE.WebGLRenderTarget(4, 4, opts));

        this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
        this.quad.frustumCulled = false;
        this.scene = new THREE.Scene();
        this.scene.add(this.quad);

        this.down = new THREE.ShaderMaterial({
            vertexShader: quadVert, fragmentShader: downFrag, depthTest: false, depthWrite: false,
            uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1.0 }, uFirst: { value: 0 } },
        });
        this.up = new THREE.ShaderMaterial({
            vertexShader: quadVert, fragmentShader: upFrag, depthTest: false, depthWrite: false,
            blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
            uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1 } },
        });
        this.comp = new THREE.ShaderMaterial({
            vertexShader: quadVert, fragmentShader: compFrag, depthTest: false, depthWrite: false,
            uniforms: {
                tScene: { value: null }, tBloom: { value: null }, uRes: { value: new THREE.Vector2() }, uTime: { value: 0 },
                uBloom: { value: 0.9 }, uExposure: { value: 1 }, uGrain: { value: 0.045 }, uVignette: { value: 0.55 }, uLetter: { value: 0 },
                uStreak: { value: 0 }, uWhite: { value: 0 }, uBlack: { value: 0 }, uCA: { value: 0.012 }, uLift: { value: new THREE.Vector3(0, 0, 0) },
            },
        });
        this.u = this.comp.uniforms;
    }

    setSize(w, h, bhScale, levels, samples) {
        this.levels = levels;
        if (samples !== this.samples) {
            this.samples = samples;
            this.rtScene.dispose();
            this.rtScene = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples, depthBuffer: true });
        }
        this.rtScene.setSize(w, h);
        this.rtBH.setSize(Math.max(2, Math.round(w * bhScale)), Math.max(2, Math.round(h * bhScale)));
        let mw = w, mh = h;
        for (let i = 0; i < this.mips.length; i++) {
            mw = Math.max(1, Math.round(mw / 2)); mh = Math.max(1, Math.round(mh / 2));
            this.mips[i].setSize(mw, mh);
        }
        this.u.uRes.value.set(w, h);
    }

    pass(mat, target) {
        this.quad.material = mat;
        this.renderer.setRenderTarget(target);
        this.renderer.render(this.scene, this.cam);
    }

    bloom(threshold) {
        const n = this.levels;
        let src = this.rtScene.texture, sw = this.rtScene.width, sh = this.rtScene.height;
        for (let i = 0; i < n; i++) {
            this.down.uniforms.tSrc.value = src;
            this.down.uniforms.uTexel.value.set(1 / sw, 1 / sh);
            this.down.uniforms.uFirst.value = i === 0 ? 1 : 0;
            this.down.uniforms.uThreshold.value = threshold;
            this.renderer.autoClear = true;
            this.pass(this.down, this.mips[i]);
            src = this.mips[i].texture; sw = this.mips[i].width; sh = this.mips[i].height;
        }
        this.renderer.autoClear = false;
        for (let i = n - 1; i > 0; i--) {
            const s = this.mips[i];
            this.up.uniforms.tSrc.value = s.texture;
            this.up.uniforms.uTexel.value.set(1 / s.width, 1 / s.height);
            this.up.uniforms.uRadius.value = 1.0;
            this.pass(this.up, this.mips[i - 1]);
        }
        this.renderer.autoClear = true;
        return this.mips[0].texture;
    }

    finish(threshold) {
        this.u.tScene.value = this.rtScene.texture;
        this.u.tBloom.value = this.bloom(threshold);
        this.pass(this.comp, null);
    }
}
