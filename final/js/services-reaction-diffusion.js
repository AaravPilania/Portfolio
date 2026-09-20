/**
 * Services Section ("What We Do"):
 * Lama Lama Authentic 1:1 Video-Driven 8-Bit Particle Grid & Noise Dither Matrix
 * 
 * 1. Background: Full-width pitch black (#000000) with uniform 8-bit dot matrix (Suisse/Lama Lama theme)
 * 2. Right-side Video Engine: Samples /videos/services-bg.mp4 in real-time offscreen
 *    - Dynamically renders the dancing person through glowing 8-bit matrix glyphs
 *    - No raw color video is visible; the person emerges organically through pixel luminance & scale
 * 3. Authentic Noise-Dither Scroll Transitions:
 *    - Top transition from Projects: Procedural 8-bit noise blocks dissolve into the section
 *    - Bottom transition to Happy Clients: Procedural 8-bit noise blocks dissolve into the next section
 * 4. Interactive cursor luminescence & magnetic repulsion
 * 5. 60fps high performance with offscreen frame cache
 */
(function () {
    'use strict';

    function pseudoNoise(x, y) {
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return n - Math.floor(n);
    }

    function initServicesEngine() {
        const section = document.querySelector('.ll-section--services');
        if (!section) return;

        let canvas = document.getElementById('servicesDiffusionCanvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'servicesDiffusionCanvas';
            canvas.className = 'services-diffusion-canvas';
            canvas.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;';
            section.style.position = 'relative';
            section.insertBefore(canvas, section.firstChild);
        }

        if (canvas._servicesEngineActive) return;
        canvas._servicesEngineActive = true;

        const ctx = canvas.getContext('2d', { alpha: true });
        let width = 0, height = 0, dpr = 1;
        let gridCells = [];

        // Offscreen sampling canvas for authentic video
        const sampleW = 120;
        const sampleH = 160;
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = sampleW;
        sampleCanvas.height = sampleH;
        const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

        // Ensure video is playing and completely invisible in DOM
        let videoEl = document.getElementById('servicesVideo');
        if (!videoEl) {
            videoEl = document.createElement('video');
            videoEl.id = 'servicesVideo';
            videoEl.preload = 'auto';
            videoEl.autoplay = true;
            videoEl.loop = true;
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.style.cssText = 'opacity: 0; pointer-events: none; position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px; z-index: -999;';
            videoEl.src = '/videos/services-bg.mp4';
            document.body.appendChild(videoEl);
        }
        if (!videoEl.src || !videoEl.src.includes('services-bg.mp4')) {
            videoEl.src = '/videos/services-bg.mp4';
        }
        videoEl.muted = true;
        videoEl.play().catch(() => {
            const resumeOnAction = () => {
                videoEl.play().catch(() => {});
                window.removeEventListener('scroll', resumeOnAction);
                window.removeEventListener('click', resumeOnAction);
            };
            window.addEventListener('scroll', resumeOnAction, { passive: true });
            window.addEventListener('click', resumeOnAction, { once: true });
        });

        function resize() {
            const rect = section.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = canvas.width = Math.round(rect.width * dpr);
            height = canvas.height = Math.round(rect.height * dpr);

            if (width <= 0 || height <= 0) return;

            // Authentic Lama Lama grid density: step size 8px - 9px
            gridCells = [];
            const step = Math.round(8.5 * dpr);
            const cols = Math.ceil(width / step);
            const rows = Math.ceil(height / step);

            for (let r = 0; r < rows; r++) {
                const py = r * step;
                for (let c = 0; c < cols; c++) {
                    const px = c * step;
                    gridCells.push({
                        c: c,
                        r: r,
                        px: px,
                        py: py,
                        dither: pseudoNoise(c * 23.17, r * 47.83),
                        blockNoise: pseudoNoise(Math.floor(c / 2) * 11.3, Math.floor(r / 2) * 17.7),
                        largeBlockNoise: pseudoNoise(Math.floor(c / 4) * 5.7, Math.floor(r / 4) * 9.1)
                    });
                }
            }
        }

        resize();
        window.addEventListener('resize', resize);

        // Mouse interaction
        let mouseX = -9999, mouseY = -9999;
        let targetMouseX = -9999, targetMouseY = -9999;
        let isHovering = false;

        window.addEventListener('mousemove', (e) => {
            const rect = section.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                isHovering = true;
                targetMouseX = (e.clientX - rect.left) * dpr;
                targetMouseY = (e.clientY - rect.top) * dpr;
            } else {
                isHovering = false;
                targetMouseX = -9999;
                targetMouseY = -9999;
            }
        });

        let time = 0;

        function getDissolveProgress() {
            const rect = section.getBoundingClientRect();
            const winH = window.innerHeight;

            if (rect.bottom <= 0 || rect.top >= winH) {
                return 0;
            }

            // Smooth dissolve transition at top and bottom
            const zone = winH * 0.35;
            const topProgress = Math.max(0, Math.min(1, (winH - rect.top) / zone));
            const bottomProgress = Math.max(0, Math.min(1, rect.bottom / zone));

            return Math.max(0, Math.min(1, Math.min(topProgress, bottomProgress)));
        }

        function draw() {
            requestAnimationFrame(draw);

            const dissolve = getDissolveProgress();
            if (dissolve <= 0.001) return;

            time += 0.025;

            // Smooth cursor tracking
            if (isHovering && targetMouseX > 0) {
                mouseX += (targetMouseX - mouseX) * 0.18;
                mouseY += (targetMouseY - mouseY) * 0.18;
            } else {
                mouseX += (-9999 - mouseX) * 0.1;
                mouseY += (-9999 - mouseY) * 0.1;
            }

            // Sample video frame if ready
            let hasVideo = false;
            let sampleData = null;
            if (videoEl && videoEl.readyState >= 2 && !videoEl.paused) {
                sampleCtx.drawImage(videoEl, 0, 0, sampleW, sampleH);
                sampleData = sampleCtx.getImageData(0, 0, sampleW, sampleH).data;
                hasVideo = true;
            }

            // Geometry of video area on the right side
            const isDesktop = width >= 768 * dpr;
            const vidH = isDesktop ? height * 0.96 : height * 0.65;
            const vidW = vidH * (1440 / 1920);
            const vidX = isDesktop ? (width - vidW - width * 0.02) : (width - vidW) * 0.5;
            const vidY = isDesktop ? (height - vidH) * 0.5 : (height - vidH) * 0.8;

            ctx.clearRect(0, 0, width, height);
            ctx.save();

            const baseSize = 2.2 * dpr;
            const cursorRadius = 130 * dpr;
            const numCells = gridCells.length;

            for (let i = 0; i < numCells; i++) {
                const cell = gridCells[i];

                // Authentic Lama Lama dither dissolve transition
                const relY = cell.py / height;
                let edgeFactor = 1.0;
                if (relY < 0.18) {
                    edgeFactor = Math.max(0, relY / 0.18);
                } else if (relY > 0.82) {
                    edgeFactor = Math.max(0, (1.0 - relY) / 0.18);
                }

                const cellProgress = dissolve * edgeFactor;
                // Multi-scale dither cutoff (small, medium, and large blocks)
                if (cellProgress < 0.95) {
                    const threshold = (cell.dither * 0.5 + cell.blockNoise * 0.3 + cell.largeBlockNoise * 0.2);
                    if (threshold > cellProgress * 1.25) continue;
                }

                let px = cell.px;
                let py = cell.py;

                // Check video sample
                let vidLum = 0;
                if (hasVideo && px >= vidX && px <= vidX + vidW && py >= vidY && py <= vidY + vidH) {
                    const sx = Math.min(sampleW - 1, Math.max(0, Math.floor(((px - vidX) / vidW) * sampleW)));
                    const sy = Math.min(sampleH - 1, Math.max(0, Math.floor(((py - vidY) / vidH) * sampleH)));
                    const idx = (sy * sampleW + sx) * 4;
                    const r = sampleData[idx];
                    const g = sampleData[idx + 1];
                    const b = sampleData[idx + 2];
                    vidLum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                }

                // Cursor repulsion & glow
                let cursorGlow = 0;
                if (mouseX > -1000) {
                    const dx = px - mouseX;
                    const dy = py - mouseY;
                    const dist = Math.hypot(dx, dy);
                    if (dist < cursorRadius && dist > 0.01) {
                        const factor = 1 - dist / cursorRadius;
                        const force = factor * factor * (16 * dpr);
                        px += (dx / dist) * force;
                        py += (dy / dist) * force;
                        cursorGlow = factor * 0.85;
                    }
                }

                // Ambient shimmer wave across matrix
                const wave = 0.5 + 0.5 * Math.sin(time * 1.5 + cell.px * 0.008 + cell.py * 0.012);
                let alpha = (0.16 + 0.14 * wave) * cellProgress + cursorGlow;
                let scale = 1.0;
                let rVal = 249, gVal = 244, bVal = 235;

                if (vidLum > 0.10) {
                    // Moving person silhouette: boost luminance and scale dynamically
                    const boost = Math.pow(vidLum, 1.15);
                    alpha = Math.min(1.0, alpha + boost * 0.82 * cellProgress);
                    scale = 1.0 + boost * 1.25;
                }

                if (cursorGlow > 0) {
                    alpha = Math.min(1.0, alpha + cursorGlow * 0.6);
                    scale += cursorGlow * 0.5;
                }

                if (alpha < 0.03) continue;

                ctx.fillStyle = `rgba(${rVal}, ${gVal}, ${bVal}, ${alpha.toFixed(3)})`;

                const curSize = baseSize * scale;

                if (vidLum > 0.32 || (cellProgress < 0.85 && cell.blockNoise > 0.6)) {
                    // Crisp 8-bit square block
                    ctx.fillRect(px - curSize * 0.5, py - curSize * 0.5, curSize, curSize);
                } else if (cell.dither > 0.4) {
                    // Micro-circle dot
                    ctx.beginPath();
                    ctx.arc(px, py, curSize * 0.45, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Square dot
                    ctx.fillRect(px - curSize * 0.4, py - curSize * 0.4, curSize * 0.8, curSize * 0.8);
                }
            }

            ctx.restore();
        }

        requestAnimationFrame(draw);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initServicesEngine);
    } else {
        initServicesEngine();
    }

    window.addEventListener('popstate', () => setTimeout(initServicesEngine, 100));

    window.__servicesEngine = {
        init: initServicesEngine
    };
})();
