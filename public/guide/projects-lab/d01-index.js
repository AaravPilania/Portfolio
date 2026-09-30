(function () {
    'use strict';
    const { projects, esc, pad } = Lab;
    Lab.dock({ num: '01', name: 'Index / Reveal', hint: 'hover · scroll still' });
    Lab.cursor();

    const list = document.getElementById('ixList');
    list.innerHTML = projects.map((p, i) => {
        const aw = p.awards.map((a) => '<a href="' + esc(a[1]) + '" target="_blank" rel="noopener" data-cursor="' + esc(a[0].split('/')[0]) + '">(' + esc(a[0]) + ')</a>').join('');
        const cta = p.url
            ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener" data-cursor="LAUNCH">Launch <i>&#8599;</i></a>'
            : '<span class="is-off">Offline</span>';
        return '<li class="ix-row" data-i="' + i + '" data-cursor="VIEW">' +
            '<span class="ix-row__no">' + pad(i + 1) + '</span>' +
            '<span class="ix-row__year">//' + esc(p.year) + '</span>' +
            '<span class="ix-row__client">' + Lab.roll(p.client) + '</span>' +
            '<span class="ix-row__title">' + Lab.roll(p.title) + '</span>' +
            '<span class="ix-row__aw">' + aw + '</span>' +
            '<span class="ix-row__cta">' + cta + '</span></li>';
    }).join('');

    let active = -1;
    const setActive = (i) => {
        if (i === active) return;
        active = i;
        list.classList.toggle('has-hover', i >= 0);
        if (i >= 0) plane.show(i); else plane.hide();
    };
    Lab.hover('.ix-row', {
        enter: (row) => { row.classList.add('is-hover'); setActive(+row.dataset.i); },
        leave: (row) => {
            row.classList.remove('is-hover');
            requestAnimationFrame(() => { if (!list.querySelector('.ix-row.is-hover')) setActive(-1); });
        }
    });

    /* ---------- Media sources ---------- */
    const sources = projects.map((p) => ({ p, img: null, video: null, phImg: null }));
    function prepare(i) {
        const s = sources[i];
        if (s.img || s.video) return s;
        const poster = Lab.poster(s.p), vsrc = Lab.video(s.p);
        s.phImg = new Image();
        s.phImg.src = Lab.placeholder(s.p, 640, 400);
        if (poster) { s.img = new Image(); s.img.src = poster; }
        if (vsrc) {
            const v = document.createElement('video');
            v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
            v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
            v.src = vsrc;
            s.video = v;
        }
        return s;
    }
    function bestSource(s) {
        if (s.video && s.video.readyState >= 2 && !s.video.error) return { el: s.video, w: s.video.videoWidth, h: s.video.videoHeight, live: true };
        if (s.img && s.img.complete && s.img.naturalWidth) return { el: s.img, w: s.img.naturalWidth, h: s.img.naturalHeight, live: false };
        if (s.phImg && s.phImg.complete && s.phImg.naturalWidth) return { el: s.phImg, w: s.phImg.naturalWidth, h: s.phImg.naturalHeight, live: false };
        return null;
    }

    /* ---------- WebGL plane ---------- */
    const canvas = document.getElementById('ixGl');
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
    let plane;
    try { plane = gl ? makeGL(gl) : makeDOM(); }
    catch (err) { console.warn('[projects-lab] WebGL plane unavailable, using DOM follower:', err.message); canvas.remove(); plane = makeDOM(); }

    function makeGL(gl) {
        const VS = [
            'attribute vec2 aPos;',
            'uniform vec2 uRes, uCenter, uSize, uVel;',
            'varying vec2 vUv;',
            'void main(){',
            '  vUv = aPos;',
            '  vec2 p = aPos - 0.5;',
            '  vec2 px = uCenter + p * uSize;',
            '  px.x -= uVel.x * (1.0 - 4.0 * p.y * p.y) * 0.85;',
            '  px.y -= uVel.y * (1.0 - 4.0 * p.x * p.x) * 0.85;',
            '  vec2 clip = px / uRes * 2.0 - 1.0;',
            '  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);',
            '}'
        ].join('\n');
        const FS = [
            'precision highp float;',
            'varying vec2 vUv;',
            'uniform sampler2D uTex;',
            'uniform vec2 uTexSize, uSize, uVel;',
            'uniform float uReveal, uShift, uTime, uDpr, uGlitch;',
            'float bayer(vec2 p){',
            '  vec2 q = mod(floor(p), 4.0);',
            '  float i = q.x + q.y * 4.0;',
            '  float b = 0.0;',
            '  if(i<1.0)b=0.0; else if(i<2.0)b=8.0; else if(i<3.0)b=2.0; else if(i<4.0)b=10.0;',
            '  else if(i<5.0)b=12.0; else if(i<6.0)b=4.0; else if(i<7.0)b=14.0; else if(i<8.0)b=6.0;',
            '  else if(i<9.0)b=3.0; else if(i<10.0)b=11.0; else if(i<11.0)b=1.0; else if(i<12.0)b=9.0;',
            '  else if(i<13.0)b=15.0; else if(i<14.0)b=7.0; else if(i<15.0)b=13.0; else b=5.0;',
            '  return (b + 0.5) / 16.0;',
            '}',
            'vec2 cover(vec2 uv){',
            '  float ra = uSize.x / uSize.y, ta = uTexSize.x / max(uTexSize.y, 1.0);',
            '  vec2 s = ra > ta ? vec2(1.0, ta / ra) : vec2(ra / ta, 1.0);',
            '  return (uv - 0.5) * s + 0.5;',
            '}',
            'void main(){',
            '  float t = bayer(gl_FragCoord.xy / (3.0 * uDpr));',
            '  float m = uReveal * 1.3 - (1.0 - vUv.y) * 0.3;',
            '  if (m < t) discard;',
            '  vec2 uv = cover(vUv);',
            '  float band = step(0.94, fract(sin(floor(vUv.y * 24.0) * 91.7 + floor(uTime * 18.0)) * 43758.5));',
            '  uv.x += band * uGlitch * 0.04;',
            '  vec2 dir = uVel / uSize * uShift;',
            '  float r = texture2D(uTex, uv + dir).r;',
            '  float g = texture2D(uTex, uv).g;',
            '  float b = texture2D(uTex, uv - dir).b;',
            '  vec3 col = vec3(r, g, b);',
            '  float scan = 0.94 + 0.06 * sin(gl_FragCoord.y / uDpr * 1.6);',
            '  col *= scan;',
            '  gl_FragColor = vec4(col, 1.0);',
            '}'
        ].join('\n');

        const sh = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src); gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
            return s;
        };
        const prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);

        const SEG = 24;
        const verts = [];
        for (let y = 0; y < SEG; y++) {
            for (let x = 0; x < SEG; x++) {
                const x0 = x / SEG, x1 = (x + 1) / SEG, y0 = y / SEG, y1 = (y + 1) / SEG;
                verts.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1);
            }
        }
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        const U = {};
        ['uRes', 'uCenter', 'uSize', 'uVel', 'uTex', 'uTexSize', 'uReveal', 'uShift', 'uTime', 'uDpr', 'uGlitch'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([18, 19, 22, 255]));
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.uniform1i(U.uTex, 0);

        let W = 0, H = 0, dpr = 1;
        const resize = () => {
            dpr = Math.min(2, window.devicePixelRatio || 1);
            W = innerWidth; H = innerHeight;
            canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
            gl.viewport(0, 0, canvas.width, canvas.height);
        };
        resize();
        addEventListener('resize', resize);

        let idx = -1, uploadedKey = null, texW = 1, texH = 1;
        let reveal = 0, targetReveal = 0, glitch = 0, visible = false;
        let x = innerWidth / 2, y = innerHeight / 2, vx = 0, vy = 0;
        let playing = null;

        const setVideo = (v) => {
            if (playing && playing !== v) playing.pause();
            playing = v;
            if (v) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
        };

        Lab.tick((dt, now) => {
            const tx = Lab.pointer.x, ty = Lab.pointer.y;
            if (Lab.reduced) { x = tx; y = ty; vx = vy = 0; }
            else {
                const k = Lab.damp(dt, 7.5);
                const nx = x + (tx - x) * k, ny = y + (ty - y) * k;
                vx = Lab.clamp(tx - nx, -160, 160); vy = Lab.clamp(ty - ny, -160, 160);
                x = nx; y = ny;
            }
            reveal += (targetReveal - reveal) * (Lab.reduced ? 1 : Lab.damp(dt, targetReveal > reveal ? 7 : 10));
            glitch += (0 - glitch) * Lab.damp(dt, 6);
            if (reveal < 0.004 && targetReveal === 0) {
                if (visible) { gl.clear(gl.COLOR_BUFFER_BIT); visible = false; setVideo(null); }
                return;
            }
            visible = true;

            if (idx >= 0) {
                const s = sources[idx];
                const src = bestSource(s);
                if (src && (src.live || uploadedKey !== s.p.key + (src.el === s.img ? ':i' : ':p'))) {
                    gl.bindTexture(gl.TEXTURE_2D, tex);
                    try {
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src.el);
                        texW = src.w; texH = src.h;
                        uploadedKey = src.live ? s.p.key + ':v' : s.p.key + (src.el === s.img ? ':i' : ':p');
                    } catch (e) { /* tainted or not ready */ }
                }
            }

            const w = Lab.clamp(W * 0.27, 240, 520), h = w * 0.64;
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(U.uRes, W, H);
            gl.uniform2f(U.uCenter, x, y);
            gl.uniform2f(U.uSize, w, h);
            gl.uniform2f(U.uVel, vx, vy);
            gl.uniform2f(U.uTexSize, texW, texH);
            gl.uniform1f(U.uReveal, reveal);
            gl.uniform1f(U.uShift, Lab.reduced ? 0 : 0.35);
            gl.uniform1f(U.uTime, now / 1000);
            gl.uniform1f(U.uDpr, dpr);
            gl.uniform1f(U.uGlitch, Lab.reduced ? 0 : glitch);
            gl.drawArrays(gl.TRIANGLES, 0, SEG * SEG * 6);
        });

        return {
            show(i) {
                const s = prepare(i);
                if (idx >= 0 && idx !== i && reveal > 0.2) glitch = 1;
                idx = i;
                uploadedKey = null;
                targetReveal = 1;
                setVideo(s.video);
            },
            hide() { targetReveal = 0; }
        };
    }

    function makeDOM() {
        const box = document.createElement('div');
        box.className = 'ix-float';
        document.body.appendChild(box);
        let cur = null, x = 0, y = 0, bw = 0, bh = 0;
        const measure = () => { bw = box.offsetWidth; bh = box.offsetHeight; };
        measure();
        addEventListener('resize', measure);
        Lab.tick((dt) => {
            const k = Lab.reduced ? 1 : Lab.damp(dt, 8);
            x += (Lab.pointer.x - x) * k; y += (Lab.pointer.y - y) * k;
            box.style.transform = 'translate3d(' + (x - bw / 2) + 'px,' + (y - bh / 2) + 'px,0)';
        });
        return {
            show(i) {
                if (cur) cur.plPause();
                box.innerHTML = '';
                cur = Lab.media(projects[i], { eager: true });
                cur.style.cssText = 'position:absolute;inset:0';
                box.appendChild(cur);
                cur.plPlay();
                box.classList.add('is-on');
            },
            hide() { box.classList.remove('is-on'); if (cur) cur.plPause(); }
        };
    }
})();
