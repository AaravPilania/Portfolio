/**
 * SPONGE CAROUSEL ENGINE
 * 1:1 Boutique Creative Developer Experience
 * 
 * Physics:
 * - Horizontally moving conveyor runway aligned dead center vertically.
 * - Dynamic spatial compression lens in the middle of the viewport.
 * - Velocity-dependent sponge squishing (lateral compression, vertical volume preservation bulge,
 *   inertia shear skew, and ballooning rounded corners).
 * - Elastic harmonic spring-back when scrolling stops.
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

            // State variables
            this.scrollX = 0;
            this.targetScrollX = 0;
            this.lastScrollX = 0;
            this.velocity = 0;
            this.smoothedVelocity = 0;

            // Drag state
            this.isDragging = false;
            this.dragStartX = 0;
            this.dragScrollStart = 0;
            this.lastDragX = 0;
            this.dragVelocity = 0;

            // Virtual infinite wrapping
            this.cardItems = [];
            this.singleSetWidth = 0;
            this.cardWidth = 0;
            this.cardGap = 0;

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

            // Duplicate 3 times (36 cards total) for infinite looping
            const REPEATS = 3;
            for (let r = 0; r < REPEATS; r++) {
                PROJECTS.forEach((proj, idx) => {
                    const card = document.createElement('div');
                    card.className = 'sponge-card';
                    card.setAttribute('data-index', idx);
                    card.setAttribute('data-repeat', r);

                    const inner = document.createElement('div');
                    inner.className = 'sponge-card-inner';

                    // Media
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
                        mediaEl.loading = r === 1 ? 'eager' : 'lazy';
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

                    // Header
                    const header = document.createElement('div');
                    header.className = 'sponge-card-header';
                    header.innerHTML = `
                        <span class="sponge-card-num">[ ${proj.num} ]</span>
                        <span class="sponge-card-tag">${proj.tag}</span>
                    `;
                    inner.appendChild(header);

                    // Footer / Details
                    const footer = document.createElement('div');
                    footer.className = 'sponge-card-footer';
                    footer.innerHTML = `
                        <h2 class="sponge-card-title">${proj.title}</h2>
                        <p class="sponge-card-desc">${proj.desc}</p>
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
                    inner.appendChild(footer);

                    card.appendChild(inner);
                    this.track.appendChild(card);

                    this.cardItems.push({
                        el: card,
                        inner: inner,
                        media: mediaEl,
                        project: proj,
                        currentSquish: 0,
                        origIndex: idx
                    });
                });
            }
        }

        measureMetrics() {
            if (this.cardItems.length === 0) return;
            const firstCard = this.cardItems[0].el;
            const secondCard = this.cardItems[1]?.el;

            this.cardWidth = firstCard.offsetWidth;
            this.cardGap = secondCard ? (secondCard.offsetLeft - (firstCard.offsetLeft + this.cardWidth)) : 40;
            this.singleSetWidth = PROJECTS.length * (this.cardWidth + this.cardGap);

            // Start in the center set
            this.scrollX = this.singleSetWidth;
            this.targetScrollX = this.singleSetWidth;
            this.lastScrollX = this.singleSetWidth;
        }

        bindEvents() {
            // Resize
            window.addEventListener('resize', () => {
                this.measureMetrics();
            }, { passive: true });

            // Wheel (Vertical wheel moves horizontal carousel)
            window.addEventListener('wheel', (e) => {
                // Ignore if modifying keys are pressed
                if (e.ctrlKey || e.metaKey) return;

                const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                // Move from right to left on downward scroll
                this.targetScrollX += delta * 1.35;
            }, { passive: true });

            // Pointer Drag
            const stage = this.stage || window;
            stage.addEventListener('pointerdown', (e) => {
                // Allow clicking links without dragging taking over
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
                // Apply remaining momentum
                this.targetScrollX += this.dragVelocity * 4.5;
            };

            window.addEventListener('pointerup', onPointerEnd);
            window.addEventListener('pointercancel', onPointerEnd);

            // Arrow keys
            window.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    this.targetScrollX += 380;
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    this.targetScrollX -= 380;
                }
            });

            // Navigation Arrows
            if (this.arrowPrev) {
                this.arrowPrev.addEventListener('click', () => {
                    this.targetScrollX -= (this.cardWidth + this.cardGap);
                });
            }
            if (this.arrowNext) {
                this.arrowNext.addEventListener('click', () => {
                    this.targetScrollX += (this.cardWidth + this.cardGap);
                });
            }
        }

        tick() {
            // Smooth lerp on scroll position
            const lerpFactor = this.isDragging ? 0.22 : 0.082;
            this.scrollX += (this.targetScrollX - this.scrollX) * lerpFactor;

            // Infinite wrapping
            if (this.singleSetWidth > 0) {
                if (this.scrollX < this.singleSetWidth * 0.5) {
                    this.scrollX += this.singleSetWidth;
                    this.targetScrollX += this.singleSetWidth;
                    this.lastScrollX += this.singleSetWidth;
                } else if (this.scrollX > this.singleSetWidth * 2.0) {
                    this.scrollX -= this.singleSetWidth;
                    this.targetScrollX -= this.singleSetWidth;
                    this.lastScrollX -= this.singleSetWidth;
                }
            }

            // Real-time instantaneous velocity
            const rawV = this.scrollX - this.lastScrollX;
            this.lastScrollX = this.scrollX;
            this.smoothedVelocity += (rawV - this.smoothedVelocity) * 0.18;

            const absV = Math.abs(this.smoothedVelocity);
            // Normalized velocity [0, 1]
            const normV = Math.min(absV / 28.0, 1.0);

            // Apply horizontal transform to track
            this.track.style.transform = `translate3d(${-this.scrollX}px, -50%, 0)`;

            // Subtle parallax on background grid
            if (this.gridBg) {
                const gridOffset = (-this.scrollX * 0.12) % 60;
                this.gridBg.style.transform = `translate3d(${gridOffset}px, 0, 0)`;
            }

            // Center Compression Lens Metrics
            const viewportWidth = window.innerWidth;
            const midX = viewportWidth * 0.5;
            // Radius of middle sponge zone (cards inside this zone get compressed)
            const zoneRadius = Math.min(viewportWidth * 0.42, 500);

            let closestCard = null;
            let minDistance = Infinity;

            // Iterate over all cards and apply spatial sponge squishing
            const dir = Math.sign(this.smoothedVelocity) || 1;

            for (let i = 0; i < this.cardItems.length; i++) {
                const item = this.cardItems[i];
                const rect = item.el.getBoundingClientRect();
                const cardCenterX = rect.left + rect.width * 0.5;
                const dist = Math.abs(cardCenterX - midX);

                if (dist < minDistance) {
                    minDistance = dist;
                    closestCard = item;
                }

                // Smooth bell-curve proximity to the middle
                const proximity = dist < zoneRadius 
                    ? (0.5 * (1 + Math.cos(Math.PI * (dist / zoneRadius)))) 
                    : 0;

                // Squish intensity is strictly tied to BOTH proximity to middle AND scroll velocity!
                // "with movement it squishes like a sponge in the middle be it whatever in the middle yeah and the squishiness depends on the velocity of scroll yeah"
                const targetSquish = proximity * normV;

                // Elastic spring interpolation for organic sponge recovery
                item.currentSquish += (targetSquish - item.currentSquish) * 0.24;
                const q = item.currentSquish;

                // 1. ScaleX: Lateral compression (sponge squishing)
                const scaleX = 1.0 - (q * 0.46);

                // 2. ScaleY: Vertical expansion (Poisson's ratio volume preservation)
                const scaleY = 1.0 + (q * 0.24);

                // 3. SkewX: Inertial shear angle in direction of travel
                const skewX = -dir * q * 9.0;

                // 4. Border Radius: Corners mushroom and soften under compression
                const borderRadius = 18 + q * 34;

                // Apply to inner wrapper
                item.inner.style.transform = `scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}) skewX(${skewX.toFixed(2)}deg)`;
                item.inner.style.borderRadius = `${borderRadius.toFixed(1)}px`;

                // Internal media counter-parallax & zoom
                if (item.media) {
                    const imgScale = 1.08 + q * 0.18;
                    const parallaxX = (cardCenterX - midX) * -0.055;
                    item.media.style.transform = `scale(${imgScale.toFixed(3)}) translate3d(${parallaxX.toFixed(1)}px, 0, 0)`;
                }
            }

            // Mark active center card and update HUD
            if (closestCard) {
                this.cardItems.forEach(c => {
                    c.el.classList.toggle('is-center', c === closestCard);
                });

                if (this.hudIndex && this.hudName) {
                    this.hudIndex.textContent = `[ ${closestCard.project.num} / ${PROJECTS.length.toString().padStart(2, '0')} ]`;
                    this.hudName.textContent = closestCard.project.title.toUpperCase();
                }
            }

            // Update Velocity Gauge in HUD
            if (this.gaugeFill && this.gaugeVal) {
                const fillPct = Math.min(absV * 3.4, 100);
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
