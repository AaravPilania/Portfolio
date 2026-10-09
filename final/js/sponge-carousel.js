/**
 * SPONGE CAROUSEL ENGINE
 * 1:1 Boutique Creative Developer Experience
 * 
 * Features:
 * - Wide landscape aspect ratio (long lengthwise, not heightwise)
 * - Zero gap, zero border: directly connected edge-to-edge images
 * - Purely horizontal spatial sponge compression in the middle
 * - Locked vertical height (zero vertical stretch or bouncing)
 * - Velocity-dependent squish intensity with harmonic spring recovery
 */

(function () {
    'use strict';

    const PROJECTS = [
        {
            num: "01",
            title: "Gargantua",
            tag: "LAB // 2026",
            desc: "Lusion-grade 5D corridor tesseract, crystal void, Schwarzschild raymarched black hole & NASA EMU suit.",
            mediaType: "image",
            mediaSrc: "/lab/gargantua/og.jpg",
            launchUrl: "/lab/gargantua/",
            githubUrl: "https://github.com/AaravPilania/lab-gargantua"
        },
        {
            num: "02",
            title: "Quidditch",
            tag: "LAB // 2026",
            desc: "Endless 3D broom flight simulation around procedural Hogwarts towers chasing the elusive Golden Snitch.",
            mediaType: "image",
            mediaSrc: "/lab/quidditch/assets/og.jpg",
            launchUrl: "/lab/quidditch/",
            githubUrl: "https://github.com/AaravPilania/lab-quidditch"
        },
        {
            num: "03",
            title: "Smart-Split",
            tag: "AI & FINTECH // 2025",
            desc: "Next-gen bill splitting with OCR receipt decomposition, real-time sync, and multi-currency smart settlement.",
            mediaType: "image",
            mediaSrc: "/images/gl/astrodither/2.jpg",
            launchUrl: "https://smart-split-aarav.vercel.app/",
            githubUrl: "https://github.com/AaravPilania/Smart-Split"
        },
        {
            num: "04",
            title: "Pivot",
            tag: "DECISION OS // 2025",
            desc: "High-contrast tactical executive dashboard with algorithmic priority scoring and keyboard-first workflows.",
            mediaType: "video",
            mediaSrc: "/images/gl/dracarys/2.mp4",
            launchUrl: "https://pivot-wheat.vercel.app/",
            githubUrl: "https://github.com/aryan-astra/Pivot"
        },
        {
            num: "05",
            title: "Zenith",
            tag: "SPACETECH // 2026",
            desc: "Real-time orbital tracking of the International Space Station with WebGL day/night terminator shaders.",
            mediaType: "video",
            mediaSrc: "/images/gl/oc2/1.mp4",
            launchUrl: "https://zenith-aarav.vercel.app/",
            githubUrl: "https://github.com/AaravPilania/Zenith"
        },
        {
            num: "06",
            title: "ProvenPath",
            tag: "EDTECH // 2025",
            desc: "Curated learning pathways with graph-based skill trees and verified portfolio assessments.",
            mediaType: "image",
            mediaSrc: "/images/gl/longines/2.jpg",
            launchUrl: "https://provenpath.vercel.app/",
            githubUrl: "https://github.com/AaravPilania/Guidewire"
        },
        {
            num: "07",
            title: "Onyx",
            tag: "CREATIVE OS // 2025",
            desc: "Minimalist desktop visual environment and creative canvas for shaders and kinetic typography.",
            mediaType: "image",
            mediaSrc: "/images/gl/medusae/2.jpg",
            launchUrl: "https://onyx-aarav.vercel.app/",
            githubUrl: "https://github.com/AaravPilania/Onyx"
        },
        {
            num: "08",
            title: "Divide & Conquer",
            tag: "ALGORITHMS // 2025",
            desc: "Kinetic 3D visualization of recursion trees, merge sort pipelines and computational geometry.",
            mediaType: "image",
            mediaSrc: "/images/gl/horsebit/1.jpg",
            launchUrl: "https://divide-and-conquer-visualizer.vercel.app/",
            githubUrl: "https://github.com/AaravPilania/divide-and-conquer-visualizer"
        },
        {
            num: "09",
            title: "Book-Selling",
            tag: "STOREFRONT // 2024",
            desc: "Boutique editorial bookstore platform with dynamic typography, audio samples and inventory sync.",
            mediaType: "image",
            mediaSrc: "/images/gl/wim/3.jpg",
            launchUrl: "https://book-selling-aarav.vercel.app/",
            githubUrl: "https://github.com/AaravPilania/Book-Selling"
        },
        {
            num: "10",
            title: "Sitara",
            tag: "EXPERIMENT // 2025",
            desc: "Generative particle soundscapes and tactile typographic interactions driven by real-time audio FFT.",
            mediaType: "image",
            mediaSrc: "/images/gl/sitara/2.jpg",
            launchUrl: "https://github.com/AaravPilania",
            githubUrl: "https://github.com/AaravPilania"
        },
        {
            num: "11",
            title: "Hypnotica",
            tag: "SHADERS // 2025",
            desc: "Raymarched GLSL chromatic dispersion tunnel with interactive cursor refraction and lens flare.",
            mediaType: "image",
            mediaSrc: "/images/gl/hypnotica/2.jpg",
            launchUrl: "https://github.com/AaravPilania",
            githubUrl: "https://github.com/AaravPilania"
        },
        {
            num: "12",
            title: "Adidas Speed",
            tag: "INTERACTIVE // 2024",
            desc: "High-cadence athletic showcase with frame-accurate motion tracking and video displacement.",
            mediaType: "image",
            mediaSrc: "/images/gl/adidas/2.jpg",
            launchUrl: "https://github.com/AaravPilania",
            githubUrl: "https://github.com/AaravPilania"
        }
    ];

    /**
     * Closed-form continuous spatial deformation field.
     * Maps uncompressed coordinate u (relative to viewport center) to screen offset.
     * Within the middle zone [-R, R], space is compressed horizontally by S * cos^2(pi*u / (2R)).
     * Because the mapping is monotonic and C1 continuous everywhere, adjacent items
     * sharing boundary u are GUARANTEED to share the exact same screen coordinate,
     * producing zero gap and zero overlap at all times!
     */
    function spongeX(u, R, S) {
        if (S <= 0.0001) return u;
        if (u > R) {
            return u - S * (R * 0.5);
        } else if (u < -R) {
            return u + S * (R * 0.5);
        } else {
            return u - S * (0.5 * u + (R / (2 * Math.PI)) * Math.sin((Math.PI * u) / R));
        }
    }

    class SpongeCarousel {
        constructor() {
            this.stage = document.getElementById('spongeStage');
            this.track = document.getElementById('spongeTrack');
            this.gridBg = document.getElementById('spongeGridBg');
            this.lensGuide = document.getElementById('spongeLensGuide');
            this.hudIndex = document.getElementById('spongeHudIndex');
            this.hudName = document.getElementById('spongeHudName');
            this.gaugeFill = document.getElementById('spongeGaugeFill');
            this.gaugeVal = document.getElementById('spongeGaugeVal');
            this.arrowPrev = document.getElementById('spongePrev');
            this.arrowNext = document.getElementById('spongeNext');

            if (!this.track) return;

            // Scroll & Velocity State
            this.scrollX = 0;
            this.targetScrollX = 0;
            this.lastScrollX = 0;
            this.smoothedVelocity = 0;
            this.currentSquish = 0;

            // Pointer Drag State
            this.isDragging = false;
            this.dragStartX = 0;
            this.dragScrollStart = 0;
            this.lastDragX = 0;
            this.dragVelocity = 0;

            // Virtual infinite wrapping metrics
            this.cardItems = [];
            this.cardWidth = 640;
            this.singleSetWidth = 0;
            this.REPEATS = 4; // 48 items total for seamless wrapping

            this.init();
        }

        init() {
            this.buildDOM();
            this.measureMetrics();
            this.bindEvents();
            this.tick();
        }

        buildDOM() {
            this.track.innerHTML = '';
            this.cardItems = [];

            for (let r = 0; r < this.REPEATS; r++) {
                PROJECTS.forEach((proj, idx) => {
                    const card = document.createElement('div');
                    card.className = 'sponge-card';
                    card.setAttribute('data-index', idx);
                    card.setAttribute('data-repeat', r);

                    const inner = document.createElement('div');
                    inner.className = 'sponge-card-inner';

                    // Background Media (Edge-to-edge landscape)
                    const mediaWrap = document.createElement('div');
                    mediaWrap.className = 'sponge-card-media';

                    let mediaEl;
                    if (proj.mediaType === 'video') {
                        mediaEl = document.createElement('video');
                        mediaEl.src = proj.mediaSrc;
                        mediaEl.autoplay = true;
                        mediaEl.loop = true;
                        mediaEl.muted = true;
                        mediaEl.playsInline = true;
                        mediaEl.setAttribute('playsinline', '');
                    } else {
                        mediaEl = document.createElement('img');
                        mediaEl.src = proj.mediaSrc;
                        mediaEl.alt = proj.title;
                        mediaEl.loading = (r === 1 || r === 2) ? 'eager' : 'lazy';
                    }
                    mediaWrap.appendChild(mediaEl);
                    inner.appendChild(mediaWrap);

                    // Scrim & Sheen
                    const scrim = document.createElement('div');
                    scrim.className = 'sponge-card-scrim';
                    inner.appendChild(scrim);

                    const sheen = document.createElement('div');
                    sheen.className = 'sponge-card-sheen';
                    inner.appendChild(sheen);

                    // Overlay Content (Counter-scaled against horizontal squish)
                    const content = document.createElement('div');
                    content.className = 'sponge-card-content';

                    // Header
                    const header = document.createElement('div');
                    header.className = 'sponge-card-header';
                    header.innerHTML = `
                        <span class="sponge-card-num">[ ${proj.num} ]</span>
                        <span class="sponge-card-tag">${proj.tag}</span>
                    `;
                    content.appendChild(header);

                    // Footer
                    const footer = document.createElement('div');
                    footer.className = 'sponge-card-footer';
                    footer.innerHTML = `
                        <div class="sponge-card-meta">
                            <h2 class="sponge-card-title">${proj.title}</h2>
                            <p class="sponge-card-desc">${proj.desc}</p>
                        </div>
                        <div class="sponge-card-actions">
                            <a href="${proj.launchUrl}" ${proj.launchUrl.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="sponge-btn sponge-btn--launch">
                                Launch
                                <svg viewBox="0 0 7 8"><path d="M7.002.499v7h-1V2.206L.707 7.501 0 6.794l5.295-5.295H.002v-1h7Z"/></svg>
                            </a>
                            <a href="${proj.githubUrl}" target="_blank" rel="noopener" class="sponge-btn sponge-btn--gh" title="GitHub">
                                <svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                            </a>
                        </div>
                    `;
                    content.appendChild(footer);

                    inner.appendChild(content);
                    card.appendChild(inner);
                    this.track.appendChild(card);

                    this.cardItems.push({
                        el: card,
                        inner: inner,
                        content: content,
                        media: mediaEl,
                        project: proj,
                        origIndex: idx
                    });
                });
            }
        }

        measureMetrics() {
            if (this.cardItems.length === 0) return;
            // Read computed resting card width from CSS
            const sample = this.cardItems[0].el;
            this.cardWidth = sample.offsetWidth || Math.min(window.innerWidth * 0.48, 720);
            this.singleSetWidth = PROJECTS.length * this.cardWidth;

            // Start in middle repeat set for seamless bidirectional scrolling
            if (this.scrollX === 0) {
                this.scrollX = this.singleSetWidth * 1.5;
                this.targetScrollX = this.scrollX;
                this.lastScrollX = this.scrollX;
            }
        }

        bindEvents() {
            window.addEventListener('resize', () => {
                this.measureMetrics();
            }, { passive: true });

            // Wheel: Downward scroll advances right-to-left
            window.addEventListener('wheel', (e) => {
                if (e.ctrlKey || e.metaKey) return;
                const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                this.targetScrollX += delta * 1.35;
            }, { passive: true });

            // Pointer Drag / Swipe
            const stage = this.stage || window;
            stage.addEventListener('pointerdown', (e) => {
                if (e.target.closest('a, button')) return;
                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragScrollStart = this.targetScrollX;
                this.lastDragX = e.clientX;
                this.dragVelocity = 0;
                if (this.stage) this.stage.classList.add('is-dragging');
            });

            window.addEventListener('pointermove', (e) => {
                if (!this.isDragging) return;
                const dx = e.clientX - this.lastDragX;
                this.lastDragX = e.clientX;
                this.dragVelocity = -dx * 1.6;
                this.targetScrollX += this.dragVelocity;
            });

            const onPointerEnd = () => {
                if (!this.isDragging) return;
                this.isDragging = false;
                if (this.stage) this.stage.classList.remove('is-dragging');
                this.targetScrollX += this.dragVelocity * 4.2;
            };

            window.addEventListener('pointerup', onPointerEnd);
            window.addEventListener('pointercancel', onPointerEnd);

            // Arrow Keys
            window.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    this.targetScrollX += this.cardWidth * 0.85;
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    this.targetScrollX -= this.cardWidth * 0.85;
                }
            });

            // Floating Navigation Arrows
            if (this.arrowPrev) {
                this.arrowPrev.addEventListener('click', () => {
                    this.targetScrollX -= this.cardWidth;
                });
            }
            if (this.arrowNext) {
                this.arrowNext.addEventListener('click', () => {
                    this.targetScrollX += this.cardWidth;
                });
            }
        }

        tick() {
            // Smooth lerp on scroll position
            const lerpFactor = this.isDragging ? 0.22 : 0.084;
            this.scrollX += (this.targetScrollX - this.scrollX) * lerpFactor;

            // Infinite wrapping across repeats
            if (this.singleSetWidth > 0) {
                if (this.scrollX < this.singleSetWidth) {
                    this.scrollX += this.singleSetWidth;
                    this.targetScrollX += this.singleSetWidth;
                    this.lastScrollX += this.singleSetWidth;
                } else if (this.scrollX > this.singleSetWidth * 2.5) {
                    this.scrollX -= this.singleSetWidth;
                    this.targetScrollX -= this.singleSetWidth;
                    this.lastScrollX -= this.singleSetWidth;
                }
            }

            // Real-time instantaneous scroll velocity
            const rawV = this.scrollX - this.lastScrollX;
            this.lastScrollX = this.scrollX;
            this.smoothedVelocity += (rawV - this.smoothedVelocity) * 0.16;

            const absV = Math.abs(this.smoothedVelocity);
            // Normalized velocity [0, 1]
            const normV = Math.min(absV / 24.0, 1.0);

            // Target horizontal sponge compression intensity in the middle
            // High velocity = maximum horizontal sponge squish (up to 44% width compression)
            const targetSquish = 0.44 * normV;
            // Harmonic spring recovery
            this.currentSquish += (targetSquish - this.currentSquish) * 0.22;
            const S = this.currentSquish;

            // Subtle parallax on background grid
            if (this.gridBg) {
                const gridOffset = (-this.scrollX * 0.1) % 60;
                this.gridBg.style.transform = `translate3d(${gridOffset}px, 0, 0)`;
            }

            // Viewport & Sponge Zone Geometry
            const viewportWidth = window.innerWidth;
            const midX = viewportWidth * 0.5;
            // Radius of horizontal sponge zone around center
            const R = Math.min(viewportWidth * 0.45, 520);

            const W0 = this.cardWidth;
            let closestCard = null;
            let minDistance = Infinity;

            // Update each card along the continuous conveyor runway
            for (let i = 0; i < this.cardItems.length; i++) {
                const item = this.cardItems[i];
                const uLeft = i * W0 - this.scrollX;
                const uRight = (i + 1) * W0 - this.scrollX;

                // Deform boundary points through continuous horizontal mapping
                const screenLeft = midX + spongeX(uLeft, R, S);
                const screenRight = midX + spongeX(uRight, R, S);

                // Viewport culling: skip offscreen cards
                if (screenRight < -160 || screenLeft > viewportWidth + 160) {
                    item.el.style.display = 'none';
                    continue;
                }
                item.el.style.display = '';

                // Calculate current squished width
                const currentWidth = screenRight - screenLeft;
                const scaleX = currentWidth / W0;

                // PURELY HORIZONTAL SQUISH:
                // scaleX compresses horizontally; scaleY is strictly locked (never vertical squish!)
                item.el.style.transform = `translate3d(${screenLeft.toFixed(2)}px, 0, 0) scaleX(${scaleX.toFixed(4)})`;
                item.el.style.transformOrigin = '0 50%';

                // Counter-scale text content horizontally so typography stays crisp
                if (item.content) {
                    const counterX = (1 / Math.max(0.35, scaleX)).toFixed(3);
                    item.content.style.transform = `scaleX(${counterX})`;
                    item.content.style.transformOrigin = '0 50%';
                }

                // Check distance to center for active HUD tracking
                const cardCenter = (screenLeft + screenRight) * 0.5;
                const distFromMid = Math.abs(cardCenter - midX);
                if (distFromMid < minDistance) {
                    minDistance = distFromMid;
                    closestCard = item;
                }
            }

            // Mark active center card & update HUD
            if (closestCard) {
                this.cardItems.forEach(c => {
                    c.el.classList.toggle('is-center', c === closestCard);
                });

                if (this.hudIndex && this.hudName) {
                    this.hudIndex.textContent = `[ ${closestCard.project.num} / ${PROJECTS.length.toString().padStart(2, '0')} ]`;
                    this.hudName.textContent = closestCard.project.title.toUpperCase();
                }
            }

            // Update Velocity Sponge Compression Gauge in HUD
            if (this.gaugeFill && this.gaugeVal) {
                const fillPct = Math.min(absV * 3.6, 100);
                this.gaugeFill.style.width = `${fillPct.toFixed(1)}%`;
                this.gaugeVal.textContent = `${Math.round(absV * 10)} PX/S`;
            }

            // Lens guide indicator state
            if (this.lensGuide) {
                this.lensGuide.classList.toggle('is-squishing', normV > 0.08);
            }

            requestAnimationFrame(() => this.tick());
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new SpongeCarousel());
    } else {
        new SpongeCarousel();
    }
})();
