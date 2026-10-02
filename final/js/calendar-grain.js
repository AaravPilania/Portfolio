// Contact page: the grain only exists where you touch the calendar. Lama Lama's contact-page cursor (theme bundle
// app-BR_oTLmZ.js): a low-res velocity field (viewport / 36, float, linear) that every pointer move adds a gaussian of
// its motion vector into (strength 0.04, radius 0.04 of the height) and that decays by 1 - min(0.5, dt / 250) per frame;
// its grid shader lights up to 7 of each 8 px cell's 4x4 two-pixel squares from length(field). Here those squares are
// stamped onto the calendar: near-black over light paper (yellow free time, cream gaps, white), off-white over the
// dancer and ochre glyphs, and the field also shifts each cell's sample of the calendar so blocks smear and snap back.
// The same pass runs the 0.65 s woven noise dissolve between the dance and camera mode. At rest the GL canvas is hidden
// and the 2D calendar shows through untouched.
(() => {
    'use strict';

    const PIXEL_SIZE = 8;
    const SCALE_FACTOR = 36;
    const LIFE_MS = 1500; // field below one square long before this; the sim stops, the canvas hides
    const MAX_INJECT = 24; // pointer events folded into one frame
    const DISP = 3; // css px of sample shift per unit of field
    const DISP_MAX = 14;
    const INK_DARK = [18 / 255, 19 / 255, 22 / 255];
    const INK_LIGHT = [249 / 255, 244 / 255, 235 / 255];
    const LUMA_SPLIT = 0.6;
    const DISSOLVE_MS = 650;
    const PUFF = 60;

    const VERT = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

    const DECAY = `#version 300 es
precision highp float;
uniform sampler2D u_previous;
uniform float u_keep;
out vec2 FragColor;
void main() {
    FragColor = texelFetch(u_previous, ivec2(gl_FragCoord.xy), 0).rg * u_keep;
}`;

    // u_radial 0: Lama Lama's cursor injection. 1: a puff, the same gaussian pushing outward from its centre.
    const INJECT = `#version 300 es
precision highp float;
uniform sampler2D u_velocity;
uniform vec2 u_size;
uniform vec2 u_vector;
uniform vec2 u_cursor;
uniform vec2 u_resolution;
uniform float u_radial;
uniform float u_radius;
out vec2 FragColor;
void main() {
    float strength = 0.04;
    vec2 uv = gl_FragCoord.xy / u_size;
    vec2 velocity = texelFetch(u_velocity, ivec2(gl_FragCoord.xy), 0).rg;
    vec2 correction = u_cursor / u_resolution - uv;
    correction.x *= u_resolution.x / u_resolution.y;
    float d = length(correction);
    float influence = exp(-d * d / (u_radius * u_radius));
    vec2 push = mix(u_vector, -normalize(correction + 1e-6) * u_vector.x * smoothstep(0.0, u_radius, d), u_radial);
    FragColor = velocity + influence * push * strength;
}`;

    const DRAW = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform sampler2D u_prev;
uniform sampler2D u_vel;
uniform vec2 u_resolution;
uniform float u_dpr;
uniform float u_x0;
uniform float u_mix;
uniform float u_disp;
uniform float u_disp_max;
uniform vec3 u_dark;
uniform vec3 u_light;
uniform float u_split;
out vec4 FragColor;

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.98923445328, 4.137643425614414))) * 43758.54432453);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    float res = mix(mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x), mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
    return res * res;
}

float checkEqual(float first, float second) {
    return 1.0 - ceil(abs(first - second) / 20.0);
}

float drawLLLogo(vec2 rect, float opacity, float full) {
    float x = mod(round(mod(rect.x, 1.0) * 4.0 + 0.5 + 1.0), 4.0);
    float y = mod(round(mod(rect.y, 1.0) * 4.0 + 0.5), 4.0);
    float progress = 1.0 / (7.0 + 9.0 * full);
    float o = 0.0;
    o += step(1.0 - opacity, progress * 0.0) * checkEqual(0.0, x) * checkEqual(0.0, y);
    o += step(1.0 - opacity, progress * 1.0) * checkEqual(0.0, x) * checkEqual(2.0, y);
    o += step(1.0 - opacity, progress * 2.0) * checkEqual(2.0, x) * checkEqual(1.0, y);
    o += step(1.0 - opacity, progress * 3.0) * checkEqual(3.0, x) * checkEqual(3.0, y);
    o += step(1.0 - opacity, progress * 4.0) * checkEqual(1.0, x) * checkEqual(3.0, y);
    o += step(1.0 - opacity, progress * 5.0) * checkEqual(0.0, x) * checkEqual(1.0, y);
    o += step(1.0 - opacity, progress * 6.0) * checkEqual(2.0, x) * checkEqual(0.0, y);
    o += full * step(1.0 - opacity, progress * 7.0) * checkEqual(0.0, x) * checkEqual(3.0, y);
    o += full * step(1.0 - opacity, progress * 8.0) * checkEqual(1.0, x) * checkEqual(2.0, y);
    o += full * step(1.0 - opacity, progress * 9.0) * checkEqual(3.0, x) * checkEqual(2.0, y);
    o += full * step(1.0 - opacity, progress * 10.0) * checkEqual(3.0, x) * checkEqual(0.0, y);
    o += full * step(1.0 - opacity, progress * 11.0) * checkEqual(2.0, x) * checkEqual(3.0, y);
    o += full * step(1.0 - opacity, progress * 12.0) * checkEqual(2.0, x) * checkEqual(2.0, y);
    o += full * step(1.0 - opacity, progress * 13.0) * checkEqual(1.0, x) * checkEqual(0.0, y);
    o += full * step(1.0 - opacity, progress * 14.0) * checkEqual(1.0, x) * checkEqual(1.0, y);
    o += full * step(1.0 - opacity, progress * 15.0) * checkEqual(3.0, x) * checkEqual(1.0, y);
    return min(1.0, o);
}

vec3 at(sampler2D s, vec2 p) {
    ivec2 size = textureSize(s, 0);
    return texelFetch(s, clamp(ivec2(p), ivec2(0), size - 1), 0).rgb;
}

void main() {
    float H = float(textureSize(u_input, 0).y);
    vec2 frag = gl_FragCoord.xy;
    vec2 screen = vec2(u_x0 + frag.x, frag.y) / u_dpr;
    vec2 grid = u_resolution / ${PIXEL_SIZE.toFixed(1)};
    vec2 uvr = screen / u_resolution * grid;

    vec2 v = texture(u_vel, round(uvr) / grid).rg;
    vec2 off = v * u_disp;
    float ol = length(off);
    if (ol > u_disp_max) off *= u_disp_max / ol;
    off = floor(off * u_dpr + 0.5);
    vec2 shift = vec2(-off.x, off.y);

    vec2 p = vec2(u_x0 + frag.x, H - frag.y) + shift;
    vec3 col = at(u_input, p);
    if (u_mix < 1.0) {
        float n = noise(screen / 56.0);
        float m = drawLLLogo(uvr, clamp(u_mix * 1.6 - n * 0.6, 0.0, 1.0), 1.0);
        col = mix(at(u_prev, p), col, m);
    }

    float trail = drawLLLogo(uvr, length(v), 0.0);
    if (trail > 0.0) {
        vec2 sq = (floor(screen / 2.0) + 0.5) * 2.0 * u_dpr;
        vec3 under = at(u_input, vec2(sq.x, H - sq.y) + shift);
        vec3 ink = dot(under, vec3(0.299, 0.587, 0.114)) > u_split ? u_dark : u_light;
        col = mix(col, ink, trail);
    }
    FragColor = vec4(col, 1.0);
}`;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let gl = null, glCanvas = null, src = null, ok = false, trailOk = false;
    let pDraw = null, pDecay = null, pInject = null;
    const U = { draw: {}, decay: {}, inject: {} };
    let texIn = null, texPrev = null, inW = 0, inH = 0;
    let simW = 0, simH = 0, simTex = [null, null], simFbo = [null, null], simIdx = 0;
    let vw = 0, vh = 0, dpr = 1;
    let shown = false, dirty = true, lastNow = 0, lastInject = -Infinity, dissolveT0 = -1, pinned = null;
    let last = null;
    const queue = [];
    const PERF_N = 2048, perf = new Float32Array(PERF_N);
    let perfI = 0;

    function fail() {
        ok = false; trailOk = false;
        if (glCanvas) glCanvas.remove();
        glCanvas = null; gl = null;
    }

    function program(fs, names, store) {
        const sh = (type, s) => {
            const o = gl.createShader(type);
            gl.shaderSource(o, s);
            gl.compileShader(o);
            return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null;
        };
        const vs = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, fs);
        if (!vs || !f) return null;
        const p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, f);
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
        for (const n of names) store[n] = gl.getUniformLocation(p, n);
        return p;
    }

    function texture(filter) {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return t;
    }

    function init() {
        glCanvas = document.createElement('canvas');
        glCanvas.className = 'gc-grain';
        glCanvas.setAttribute('aria-hidden', 'true');
        gl = glCanvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
        if (!gl) { fail(); return; }
        pDraw = program(DRAW, ['u_input', 'u_prev', 'u_vel', 'u_resolution', 'u_dpr', 'u_x0', 'u_mix', 'u_disp', 'u_disp_max', 'u_dark', 'u_light', 'u_split'], U.draw);
        if (!pDraw) { fail(); return; }
        gl.useProgram(pDraw);
        gl.uniform1i(U.draw.u_input, 0);
        gl.uniform1i(U.draw.u_prev, 1);
        gl.uniform1i(U.draw.u_vel, 2);
        gl.uniform1f(U.draw.u_disp, DISP);
        gl.uniform1f(U.draw.u_disp_max, DISP_MAX);
        gl.uniform3fv(U.draw.u_dark, INK_DARK);
        gl.uniform3fv(U.draw.u_light, INK_LIGHT);
        gl.uniform1f(U.draw.u_split, LUMA_SPLIT);
        gl.activeTexture(gl.TEXTURE0); texIn = texture(gl.NEAREST);
        gl.activeTexture(gl.TEXTURE1); texPrev = texture(gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        // a float field needs renderable float targets, as on Lama Lama; without them only the dissolve runs
        trailOk = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
        if (trailOk) {
            pDecay = program(DECAY, ['u_previous', 'u_keep'], U.decay);
            pInject = program(INJECT, ['u_velocity', 'u_size', 'u_vector', 'u_cursor', 'u_resolution', 'u_radial', 'u_radius'], U.inject);
            trailOk = !!(pDecay && pInject);
        }
        gl.activeTexture(gl.TEXTURE2);
        if (trailOk) {
            for (let i = 0; i < 2; i++) { simTex[i] = texture(gl.LINEAR); simFbo[i] = gl.createFramebuffer(); }
        } else {
            simTex[0] = texture(gl.NEAREST);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        }
        glCanvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail(); });
        ok = true;
        if (trailOk) bindPointer();
    }

    function allocSim() {
        simW = Math.max(2, Math.ceil(vw * dpr / SCALE_FACTOR));
        simH = Math.max(2, Math.ceil(vh * dpr / SCALE_FACTOR));
        const zero = new Uint16Array(simW * simH * 2);
        for (let i = 0; i < 2; i++) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, simTex[i]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, simW, simH, 0, gl.RG, gl.HALF_FLOAT, zero);
            gl.bindFramebuffer(gl.FRAMEBUFFER, simFbo[i]);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, simTex[i], 0);
        }
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) trailOk = false;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        simIdx = 0;
    }

    // Called from the calendar's layout(): the GL canvas covers the grid from device column x0, one GL pixel per
    // calendar pixel; the field covers the whole viewport.
    function layout(o) {
        if (!ok) return;
        src = o.canvas; vw = o.vw; vh = o.vh; dpr = o.dpr;
        if (!glCanvas.isConnected) o.canvas.after(glCanvas);
        glCanvas.width = o.W - o.x0;
        glCanvas.height = o.H;
        glCanvas.style.left = (o.x0 / o.dpr) + 'px';
        glCanvas.style.width = ((o.W - o.x0) / o.dpr) + 'px';
        glCanvas.style.height = o.vh + 'px';
        gl.useProgram(pDraw);
        gl.uniform2f(U.draw.u_resolution, vw, vh);
        gl.uniform1f(U.draw.u_dpr, dpr);
        gl.uniform1f(U.draw.u_x0, o.x0);
        inW = inH = 0;
        dirty = true;
        if (trailOk) allocSim();
    }

    // ------------------------------------------------------------ pointer
    function bindPointer() {
        const live = () => trailOk && !reduceMotion.matches;
        window.addEventListener('pointermove', (e) => {
            if (!live()) return;
            if (e.pointerType === 'touch' && !e.isPrimary) return;
            const cur = [e.clientX, vh - e.clientY];
            if (last && queue.length < MAX_INJECT) queue.push(cur[0], cur[1], cur[0] - last[0], cur[1] - last[1], 0);
            last = cur;
        }, { passive: true });
        window.addEventListener('pointerdown', (e) => { last = [e.clientX, vh - e.clientY]; }, { passive: true });
        const drop = (e) => { if (e.pointerType !== 'mouse') last = null; };
        window.addEventListener('pointerup', drop, { passive: true });
        window.addEventListener('pointercancel', () => { last = null; }, { passive: true });
        document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) last = null; }, { passive: true });
    }

    // A puff of grain at a viewport point (css px, y down); amp 1 pushes about as hard as a 60 px pointer step
    function puff(x, y, amp = 1) {
        if (!trailOk || reduceMotion.matches || queue.length >= MAX_INJECT) return;
        queue.push(x, vh - y, amp * PUFF, 0, 1);
    }

    function simPass(prog, fn) {
        const w = 1 - simIdx;
        gl.bindFramebuffer(gl.FRAMEBUFFER, simFbo[w]);
        gl.useProgram(prog);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, simTex[simIdx]);
        fn();
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        simIdx = w;
    }

    function step(dt, now) {
        gl.viewport(0, 0, simW, simH);
        simPass(pDecay, () => {
            gl.uniform1i(U.decay.u_previous, 2);
            gl.uniform1f(U.decay.u_keep, 1 - Math.min(0.5, dt / 250));
        });
        for (let i = 0; i < queue.length; i += 5) {
            const radial = queue[i + 4];
            simPass(pInject, () => {
                const u = U.inject;
                gl.uniform1i(u.u_velocity, 2);
                gl.uniform2f(u.u_size, simW, simH);
                gl.uniform2f(u.u_resolution, vw, vh);
                gl.uniform2f(u.u_cursor, queue[i], queue[i + 1]);
                gl.uniform2f(u.u_vector, queue[i + 2], queue[i + 3]);
                gl.uniform1f(u.u_radial, radial);
                gl.uniform1f(u.u_radius, radial ? 0.07 : 0.04);
            });
            lastInject = now;
        }
        queue.length = 0;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function upload(tex, unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (unit === 0 && inW === src.width && inH === src.height) {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
            if (unit === 0) { inW = src.width; inH = src.height; }
        }
    }

    // After every rAF of the calendar. drew: the calendar canvas changed this frame.
    function frame(drew, now) {
        if (!ok || !src) return;
        const dt = lastNow ? Math.min(50, now - lastNow) : 16.6;
        lastNow = now;
        if (drew) dirty = true;
        if (reduceMotion.matches) queue.length = 0;
        if (pinned !== null && dissolveT0 >= 0) dissolveT0 = now - pinned * DISSOLVE_MS;
        const dis = dissolveT0 < 0 ? 1 : Math.min(1, (now - dissolveT0) / DISSOLVE_MS);
        const simLive = trailOk && (queue.length > 0 || now - lastInject < LIFE_MS);
        if (!simLive && dis >= 1) {
            if (shown) { glCanvas.style.visibility = 'hidden'; shown = false; }
            dissolveT0 = -1;
            return;
        }
        const a = performance.now();
        if (simLive) step(dt, now);
        if (dirty || !shown) { upload(texIn, 0); dirty = false; }
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        gl.useProgram(pDraw);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, simTex[trailOk ? simIdx : 0]);
        gl.uniform1f(U.draw.u_mix, dis < 1 ? Math.sin(dis * Math.PI / 2) : 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!shown) { glCanvas.style.visibility = 'visible'; shown = true; }
        if (dis >= 1) dissolveT0 = -1;
        perf[perfI++ % PERF_N] = performance.now() - a;
    }

    // Freeze what the calendar shows now; the next 0.65 s dissolve from it into whatever the calendar draws next.
    // Returns false when there is no GL to do it (the caller cuts).
    function dissolve(now) {
        if (!ok || !src) return false;
        upload(texPrev, 1);
        dissolveT0 = now;
        dirty = true;
        return true;
    }

    init();

    window.CalendarGrain = {
        get enabled() { return ok; },
        get trail() { return trailOk && !reduceMotion.matches; },
        get active() { return shown; },
        layout, frame, puff, dissolve,
        perf: () => {
            const v = Array.from(perf.subarray(0, Math.min(perfI, PERF_N))).sort((x, y) => x - y);
            const at = (p) => (v.length ? +v[Math.min(v.length - 1, Math.floor(v.length * p))].toFixed(2) : null);
            return { draws: perfI, p50: at(0.5), p95: at(0.95), max: at(1) };
        },
        perfReset: () => { perfI = 0; },
        // stills: hold the next (or current) dissolve at progress p in 0..1; null lets it run
        pin: (p) => { pinned = p === null ? null : Math.max(0, Math.min(0.999, p)); },
    };
})();
