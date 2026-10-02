// Contact page: the main site's slide-4 dot grid laid over the calendar grid (never the time column). The halftone is
// the Lama Lama backdrop grid shader (theme bundle app-DjHRamTc.js, driven by backdrop_theme-DR-7dYLM.js): 8 px cells
// of 4x4 two-pixel squares, each square lit by its own luminance in a fixed order, at most 7 of 16 with content, so
// anything under 36/255 drops out. Here it reads the calendar canvas instead of services-bg.mp4 and renders it in black
// and white, except where the calendar's keep mask says dancer or glyph: those pixels keep their own colour under a
// light grain. ?grain=0 turns it off, ?grain=1 on; GRAIN_DEFAULT is the default.
(() => {
    'use strict';

    const GRAIN_DEFAULT = true;
    const PIXEL_SIZE = 8;
    const BACKDROP = [0, 0, 0];
    // Slide 4 lights its squares in grey 70; on the calendar a light grey keeps the black and white read without glare
    const DOTS = [200, 198, 192];
    // Luminance levels before the halftone, as on slide 4: yellow free time lights 4 of the 7 squares (the same vertical
    // dashes as the photo's mid-tones), cream gaps 6, white 7
    const LO = 0.0, HI = 1.0;
    const KEEP_GRAIN = 0.14;

    const q = new URLSearchParams(location.search).get('grain');
    const wanted = q === '0' ? false : q === '1' ? true : GRAIN_DEFAULT;

    const VERT = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

    const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform sampler2D u_mask;
uniform vec2 u_resolution;
uniform float u_pixel_size;
uniform float u_dpr;
uniform float u_x0;
uniform float u_keep;
uniform vec3 u_theme;
uniform vec3 u_content_theme;
uniform vec2 u_levels;
uniform float u_keep_grain;

out vec4 FragColor;

float checkEqual(float first, float second) {
    float difference = abs(first - second);
    float inverted_number = ceil(1.0 * difference / 20.0);

    return (1.0 - inverted_number);
}

float drawLLLogo(vec2 rect, float opacity, float full) {

    float x = mod(round(mod(rect.x, 1.0) * 4.0 + 0.5 + 1.0), 4.0);
    float y = mod(round(mod(rect.y, 1.0) * 4.0 + 0.5), 4.0);

    float divider = (7.0 + 9.0 * full);
    float progress = 1.0 / divider;
    float offset = 0.0;

    float output_opacity = 0.0;

    float block_1 = step(1.0 - opacity, progress * (0.0 + offset));
    float block_2 = step(1.0 - opacity, progress * (1.0 + offset));
    float block_3 = step(1.0 - opacity, progress * (2.0 + offset));
    float block_4 = step(1.0 - opacity, progress * (3.0 + offset));
    float block_5 = step(1.0 - opacity, progress * (4.0 + offset));
    float block_6 = step(1.0 - opacity, progress * (5.0 + offset));
    float block_7 = step(1.0 - opacity, progress * (6.0 + offset));

    float block_8 = full * step(1.0 - opacity, progress * (7.0 + offset));
    float block_9 = full * step(1.0 - opacity, progress * (8.0 + offset));
    float block_10 = full * step(1.0 - opacity, progress * (9.0 + offset));
    float block_11 = full * step(1.0 - opacity, progress * (10.0 + offset));
    float block_12 = full * step(1.0 - opacity, progress * (11.0 + offset));
    float block_13 = full * step(1.0 - opacity, progress * (12.0 + offset));
    float block_14 = full * step(1.0 - opacity, progress * (13.0 + offset));
    float block_15 = full * step(1.0 - opacity, progress * (14.0 + offset));
    float block_16 = full * step(1.0 - opacity, progress * (15.0 + offset));

    output_opacity += block_1 * checkEqual(1.0, x) * checkEqual(3.0, y);
    output_opacity += block_2 * checkEqual(2.0, x) * checkEqual(3.0, y);
    output_opacity += block_3 * checkEqual(0.0, x) * checkEqual(2.0, y);
    output_opacity += block_4 * checkEqual(2.0, x) * checkEqual(2.0, y);
    output_opacity += block_5 * checkEqual(0.0, x) * checkEqual(1.0, y);
    output_opacity += block_6 * checkEqual(2.0, x) * checkEqual(1.0, y);
    output_opacity += block_7 * checkEqual(0.0, x) * checkEqual(0.0, y);

    output_opacity += block_8 * checkEqual(3.0, x) * checkEqual(3.0, y);
    output_opacity += block_9 * checkEqual(1.0, x) * checkEqual(2.0, y);
    output_opacity += block_10 * checkEqual(3.0, x) * checkEqual(1.0, y);
    output_opacity += block_11 * checkEqual(1.0, x) * checkEqual(1.0, y);
    output_opacity += block_12 * checkEqual(2.0, x) * checkEqual(0.0, y);
    output_opacity += block_13 * checkEqual(3.0, x) * checkEqual(2.0, y);
    output_opacity += block_14 * checkEqual(1.0, x) * checkEqual(0.0, y);
    output_opacity += block_15 * checkEqual(3.0, x) * checkEqual(0.0, y);
    output_opacity += block_16 * checkEqual(0.0, x) * checkEqual(3.0, y);

    return min(1.0, output_opacity);
}

void main() {
    ivec2 size = textureSize(u_input, 0);
    vec2 frag = gl_FragCoord.xy;
    vec2 screenUV = vec2(u_x0 + frag.x, frag.y) / u_dpr / u_resolution;

    float fullColumns = u_resolution.x / u_pixel_size;
    float fullRows = u_resolution.y / u_pixel_size;
    vec2 uv_resolution = vec2(screenUV.x * fullColumns, screenUV.y * fullRows);

    vec2 cells = vec2(fullColumns, fullRows) * 4.0;
    vec2 small = (floor(screenUV * cells) + 0.5) / cells;
    ivec2 sp = clamp(ivec2(small.x * u_resolution.x * u_dpr, float(size.y) - small.y * u_resolution.y * u_dpr), ivec2(0), size - 1);
    vec4 tex = texelFetch(u_input, sp, 0);
    float imageRGB = (tex.r + tex.g + tex.b) / 3.0;

    float f = drawLLLogo(uv_resolution, clamp((imageRGB - u_levels.x) / (u_levels.y - u_levels.x), 0.0, 1.0), 0.0);
    vec3 mono = mix(u_theme, u_content_theme, f) / 255.0;

    ivec2 p = ivec2(int(u_x0) + int(frag.x), size.y - 1 - int(frag.y));
    vec3 own = texelFetch(u_input, p, 0).rgb;
    float g = drawLLLogo(uv_resolution, imageRGB, 1.0);
    vec3 kept = own * (1.0 - u_keep_grain * (1.0 - g));

    float m = u_keep * step(0.5, texelFetch(u_mask, p, 0).r);
    FragColor = vec4(mix(mono, kept, m), 1.0);
}`;

    let gl = null, prog = null, texIn = null, texMask = null, glCanvas = null, src = null, maskCanvas = null, maskCtx = null;
    let uni = {}, ok = false, maskLive = false;
    const PERF_N = 2048, perf = new Float32Array(PERF_N);
    let perfI = 0;

    function fail() {
        ok = false;
        if (glCanvas) glCanvas.remove();
        glCanvas = null; gl = null; maskCtx = null;
    }

    function init() {
        glCanvas = document.createElement('canvas');
        glCanvas.className = 'gc-grain';
        glCanvas.setAttribute('aria-hidden', 'true');
        gl = glCanvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
        if (!gl) { fail(); return; }
        const sh = (type, s) => {
            const o = gl.createShader(type);
            gl.shaderSource(o, s);
            gl.compileShader(o);
            return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null;
        };
        const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
        if (!vs || !fs) { fail(); return; }
        prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { fail(); return; }
        gl.useProgram(prog);
        for (const n of ['u_input', 'u_mask', 'u_resolution', 'u_pixel_size', 'u_dpr', 'u_x0', 'u_keep', 'u_theme', 'u_content_theme', 'u_levels', 'u_keep_grain']) uni[n] = gl.getUniformLocation(prog, n);
        gl.uniform1i(uni.u_input, 0);
        gl.uniform1i(uni.u_mask, 1);
        gl.uniform1f(uni.u_pixel_size, PIXEL_SIZE);
        gl.uniform3fv(uni.u_theme, BACKDROP);
        gl.uniform3fv(uni.u_content_theme, DOTS);
        gl.uniform2f(uni.u_levels, LO, HI);
        gl.uniform1f(uni.u_keep_grain, KEEP_GRAIN);
        const tex = (unit) => {
            const t = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            return t;
        };
        texIn = tex(0);
        texMask = tex(1);
        glCanvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail(); });
        maskCanvas = document.createElement('canvas');
        maskCtx = maskCanvas.getContext('2d', { alpha: false });
        ok = true;
    }

    // Called from the calendar's layout(): the GL canvas covers the grid from device column x0, one GL pixel per
    // calendar pixel. Returns the keep-mask context the calendar paints dancer and glyph blocks into (white on black).
    function layout({ canvas, x0, W, H, vw, vh, dpr }) {
        if (!ok) return null;
        src = canvas;
        if (!glCanvas.isConnected) canvas.after(glCanvas);
        glCanvas.width = W - x0;
        glCanvas.height = H;
        glCanvas.style.left = (x0 / dpr) + 'px';
        glCanvas.style.width = ((W - x0) / dpr) + 'px';
        glCanvas.style.height = vh + 'px';
        maskCanvas.width = W;
        maskCanvas.height = H;
        gl.viewport(0, 0, W - x0, H);
        gl.uniform2f(uni.u_resolution, vw, vh);
        gl.uniform1f(uni.u_dpr, dpr);
        gl.uniform1f(uni.u_x0, x0);
        // a 1x1 mask until the first keep frame, so the sampler is never incomplete
        gl.activeTexture(gl.TEXTURE1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        maskLive = false;
        return maskCtx;
    }

    // After every calendar frame that drew. keep: the frame has dancer or glyph blocks in the mask.
    function draw(keep) {
        if (!ok || !src) return;
        const a = performance.now();
        gl.activeTexture(gl.TEXTURE0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        if (keep) {
            gl.activeTexture(gl.TEXTURE1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
            maskLive = true;
        }
        gl.uniform1f(uni.u_keep, keep && maskLive ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        perf[perfI++ % PERF_N] = performance.now() - a;
    }

    if (wanted) init();

    window.CalendarGrain = {
        get enabled() { return ok; },
        layout, draw,
        perf: () => {
            const v = Array.from(perf.subarray(0, Math.min(perfI, PERF_N))).sort((x, y) => x - y);
            const at = (p) => (v.length ? +v[Math.min(v.length - 1, Math.floor(v.length * p))].toFixed(2) : null);
            return { draws: perfI, p50: at(0.5), p95: at(0.95), max: at(1) };
        },
    };
})();
