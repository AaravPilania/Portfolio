const fs = require('fs');
const path = require('path');

const interactiveCode = `/**
 * Lama Lama Recreated Interactive Animation & Transition Engine
 * 100% Client-side, High-performance, Authentic Easing & Motions
 */

(function () {
  'use strict';

  // State Management
  const state = {
    isPreloaded: false,
    menuOpen: false,
    servicesOpen: false,
    formActive: false,
    currentStep: 0,
    activeCase: 0,
    videoPlaying: true,
    videoMuted: true,
    cursorX: window.innerWidth / 2,
    cursorY: window.innerHeight / 2,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    clockInterval: null,
    servicesMouseX: -1000,
    servicesMouseY: -1000,
    servicesInView: false
  };

  /* ===================================================
     1. PRELOADER & ENTRANCE SEQUENCE
     Elements remain strictly hidden during the 4.25s
     pixelated intro animation and smoothly reveal after.
     =================================================== */
  function initPreloader() {
    const loader = document.querySelector('.js-loader');
    const counter = document.querySelector('.js-progress');
    
    // Smooth progress counter from 0 to 100 over authentic intro length (3.8s)
    if (counter) {
      const duration = 3800; // ms
      const startTime = Date.now();
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(1, elapsed / duration);
        const progress = Math.floor(pct * 100);
        counter.textContent = progress;

        if (pct >= 1) {
          clearInterval(timer);
          counter.textContent = '100';
        }
      }, 20);
    }

    let revealed = false;
    function triggerReveal() {
      if (revealed) return;
      revealed = true;

      if (loader && !loader.classList.contains('is-loaded')) {
        loader.classList.add('is-loaded');
        setTimeout(() => {
          loader.style.display = 'none';
        }, 500);
      }

      // Smooth delayed entrance after loader curtain begins exiting
      setTimeout(revealEntrance, 120);
    }

    // Observe when the authentic WebGL bundle finishes (removes .js-loader from DOM or adds class)
    if (loader) {
      const observer = new MutationObserver(() => {
        if (!document.body.contains(loader) || loader.classList.contains('is-loaded') || loader.style.display === 'none') {
          observer.disconnect();
          triggerReveal();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    }

    // Authentic duration fallback: 4.3 seconds (matches authentic 4.25s GSAP timeline)
    setTimeout(() => {
      triggerReveal();
    }, 4300);
  }

  function revealEntrance() {
    if (state.isPreloaded) return;
    state.isPreloaded = true;

    // Header reveal
    const header = document.querySelector('.js-header');
    const stickyMenu = document.querySelector('.js-menu');
    if (header) {
      header.classList.add('is-revealed');
    }
    if (stickyMenu) {
      stickyMenu.classList.remove('opacity-0');
      stickyMenu.classList.add('is-revealed');
    }

    // Sticky Lars Card
    const stickyItems = document.querySelector('.js-sticky-items');
    if (stickyItems) {
      stickyItems.classList.remove('opacity-0');
      stickyItems.classList.add('is-revealed');
    }

    // Sticky Bottom Bar
    const stickyBar = document.querySelector('.js-sticky-bar');
    if (stickyBar) {
      stickyBar.style.opacity = '1';
      stickyBar.classList.add('is-revealed');
    }

    // Sticky hero showreel card
    const heroSticky = document.querySelector('.js-sticky-item');
    if (heroSticky) {
      heroSticky.classList.remove('opacity-0');
      heroSticky.classList.add('is-revealed');
    }

    // Reveal hero text elements with smooth upward staggered reveal
    const heroTexts = document.querySelectorAll('.ll-section--hero_extended .ll-text-reveal');
    heroTexts.forEach((el, i) => {
      setTimeout(() => {
        el.classList.add('is-revealed');
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        el.style.transform = 'translateY(0)';
      }, 100 + i * 140);
    });

    // Reveal remaining text elements on scroll or immediately
    const otherTexts = document.querySelectorAll('.ll-text-reveal:not(.ll-section--hero_extended .ll-text-reveal)');
    otherTexts.forEach((el) => {
      el.classList.add('is-revealed');
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.transform = 'translateY(0)';
    });
  }

  /* ===================================================
     2. NAVIGATION & DROPDOWN MENU
     =================================================== */
  function initNavigation() {
    const menuToggle = document.querySelector('.js-menu-toggle');
    const menu = document.querySelector('.js-menu');
    const menuItemsContainer = document.querySelector('.js-menu-items-container');
    const servicesToggle = document.querySelector('.js-services-toggle');
    const servicesDropdown = document.querySelector('.js-services-dropdown');

    if (menuToggle && menu) {
      menuToggle.addEventListener('click', (e) => {
        e.preventDefault();
        state.menuOpen = !state.menuOpen;
        if (state.menuOpen) {
          menu.classList.add('is-open');
          if (menuItemsContainer) menuItemsContainer.style.height = 'auto';
        } else {
          menu.classList.remove('is-open');
          if (menuItemsContainer) menuItemsContainer.style.height = '0px';
          if (servicesDropdown) servicesDropdown.style.height = '0px';
          state.servicesOpen = false;
        }
      });
    }

    if (servicesToggle && servicesDropdown) {
      servicesToggle.addEventListener('click', (e) => {
        e.preventDefault();
        state.servicesOpen = !state.servicesOpen;
        if (state.servicesOpen) {
          servicesDropdown.style.height = 'auto';
        } else {
          servicesDropdown.style.height = '0px';
        }
      });
    }
  }

  /* ===================================================
     3. CONTACT CARD & INTERACTIVE FORM STEPS
     =================================================== */
  function initContactForm() {
    const toggleButtons = document.querySelectorAll('.js-contact-card-toggle, .js-contact-toggle');
    const formContainer = document.querySelector('.js-form-container');
    const stepIndicators = document.querySelectorAll('.js-form-step');
    const nextButtons = document.querySelectorAll('.js-form-next');
    const prevButtons = document.querySelectorAll('.js-form-prev');
    const submitButtons = document.querySelectorAll('.js-form-submit');

    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        state.formActive = !state.formActive;
        if (formContainer) {
          formContainer.style.height = state.formActive ? 'auto' : '0px';
        }
      });
    });

    function showStep(stepIdx) {
      state.currentStep = stepIdx;
      stepIndicators.forEach((step, idx) => {
        if (idx === stepIdx) {
          step.classList.remove('hidden');
          step.style.display = 'block';
        } else {
          step.classList.add('hidden');
          step.style.display = 'none';
        }
      });
    }

    nextButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.currentStep < stepIndicators.length - 1) {
          showStep(state.currentStep + 1);
        }
      });
    });

    prevButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.currentStep > 0) {
          showStep(state.currentStep - 1);
        }
      });
    });

    submitButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const loader = btn.querySelector('.js-form-submit-loader');
        if (loader) loader.classList.remove('hidden');
        setTimeout(() => {
          if (loader) loader.classList.add('hidden');
          alert('Thank you! Your message has been sent to the Lama Lama team.');
          state.formActive = false;
          if (formContainer) formContainer.style.height = '0px';
          showStep(0);
        }, 1200);
      });
    });
  }

  /* ===================================================
     4. HEADER CLOCK & AMSTERDAM TIME
     =================================================== */
  function initClock() {
    const clockElements = document.querySelectorAll('.js-clock, [data-component="parts/clock"]');
    if (!clockElements.length) return;

    function updateTime() {
      const now = new Date();
      const options = {
        timeZone: 'Europe/Amsterdam',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      const formatter = new Intl.DateTimeFormat([], options);
      const timeParts = formatter.formatToParts(now);
      const hour = timeParts.find(p => p.type === 'hour')?.value || '12';
      const minute = timeParts.find(p => p.type === 'minute')?.value || '00';
      const second = timeParts.find(p => p.type === 'second')?.value || '00';

      clockElements.forEach(el => {
        const timeDisplay = el.querySelector('.js-time-display') || el;
        const textNode = Array.from(timeDisplay.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
        const formatted = \`Amsterdam \${hour}:\${minute}:\${second}\`;
        if (textNode) {
          textNode.textContent = formatted;
        } else {
          const span = el.querySelector('.js-clock-text');
          if (span) span.textContent = formatted;
        }
      });
    }

    updateTime();
    state.clockInterval = setInterval(updateTime, 1000);
  }

  /* ===================================================
     5. PIXELATED / DITHER DISSOLVING TRANSITION (IMAGE 2)
     Authentic fine Bayer 8x8 matrix stipple dissolve
     from hero video into solid black (#000000).
     =================================================== */
  function initDitherTransition() {
    let canvas = document.getElementById('hero-dither-canvas');
    let container = document.querySelector('.ll-dither-transition-container');
    const heroSection = document.querySelector('.ll-section--hero_extended');

    if (!container && heroSection) {
      container = document.createElement('div');
      container.className = 'll-dither-transition-container';
      container.setAttribute('aria-hidden', 'true');
      canvas = document.createElement('canvas');
      canvas.className = 'll-dither-canvas';
      canvas.id = 'hero-dither-canvas';
      container.appendChild(canvas);
      heroSection.appendChild(container);
    }

    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 8x8 Bayer Dither Matrix normalized 0..63
    const bayer8 = [
       0, 32,  8, 40,  2, 34, 10, 42,
      48, 16, 56, 24, 50, 18, 58, 26,
      12, 44,  4, 36, 14, 46,  6, 38,
      60, 28, 52, 20, 62, 30, 54, 22,
       3, 35, 11, 43,  1, 33,  9, 41,
      51, 19, 59, 27, 49, 17, 57, 25,
      15, 47,  7, 39, 13, 45,  5, 37,
      63, 31, 55, 23, 61, 29, 53, 21
    ];

    const pixelSize = 2.5; // Fine 2.5px stipple dots matching authentic Image 2
    let width = 0, height = 0;

    function resize() {
      width = canvas.width = container.offsetWidth || window.innerWidth;
      height = canvas.height = container.offsetHeight || 380;
      renderDither();
    }

    function renderDither() {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / pixelSize);
      const rows = Math.ceil(height / pixelSize);

      ctx.fillStyle = '#000000';

      for (let y = 0; y < rows; y++) {
        const progress = y / rows; // 0.0 (top) to 1.0 (bottom)
        
        let thresholdVal = 0;
        if (progress < 0.14) {
          // Sparse single-pixel dots
          thresholdVal = progress * 0.35;
        } else if (progress < 0.84) {
          // Organic S-curve expansion through Bayer matrix
          const norm = (progress - 0.14) / 0.70;
          thresholdVal = 0.049 + 0.951 * Math.pow(norm, 1.42);
        } else {
          // Solid pure black (#000000) at bottom
          thresholdVal = 1.0;
        }

        for (let x = 0; x < cols; x++) {
          const bayerIdx = (y % 8) * 8 + (x % 8);
          const bayerThreshold = (bayer8[bayerIdx] + 0.5) / 64.0;

          if (thresholdVal >= bayerThreshold) {
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
          }
        }
      }
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', () => requestAnimationFrame(renderDither), { passive: true });
    if (window.lenis) {
      window.lenis.on('scroll', renderDither);
    }
  }

  /* ===================================================
     6. SERVICES ("WHAT WE DO") ANIMATED PIXEL GRID BG
     Interactive 8px animated pixel grid with smiley logo
     and cursor reactivity. Strictly NO visible raw video.
     =================================================== */
  function initServicesPixelAnimation() {
    const servicesSection = document.querySelector('.ll-section--services');
    if (!servicesSection) return;

    let canvas = servicesSection.querySelector('.ll-services-pixel-bg-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'll-services-pixel-bg-canvas';
      canvas.id = 'services-pixel-canvas';
      servicesSection.prepend(canvas);
    }

    const ctx = canvas.getContext('2d');
    const cellSize = 8; // Authentic Lama Lama 8px grid size
    let width = 0, height = 0;
    let animFrame = null;
    let time = 0;

    function resize() {
      width = canvas.width = servicesSection.offsetWidth || window.innerWidth;
      height = canvas.height = servicesSection.offsetHeight || 800;
    }

    // Track mouse over services section for ripple interaction
    servicesSection.addEventListener('mousemove', (e) => {
      const rect = servicesSection.getBoundingClientRect();
      state.servicesMouseX = e.clientX - rect.left;
      state.servicesMouseY = e.clientY - rect.top;
    });

    servicesSection.addEventListener('mouseleave', () => {
      state.servicesMouseX = -1000;
      state.servicesMouseY = -1000;
    });

    // Intersection observer so it only computes while visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        state.servicesInView = entry.isIntersecting;
        if (state.servicesInView && !animFrame) {
          animFrame = requestAnimationFrame(renderLoop);
        }
      });
    }, { rootMargin: '200px' });
    observer.observe(servicesSection);

    // Lama Lama Smile Logo in 4x4 matrix blocks
    const smilePattern = [
      [1, 0, 0, 1],
      [0, 0, 0, 0],
      [1, 0, 0, 1],
      [0, 1, 1, 0]
    ];

    function renderLoop() {
      if (!state.servicesInView) {
        animFrame = null;
        return;
      }

      time += 0.03;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const cols = Math.floor(width / cellSize);
      const rows = Math.floor(height / cellSize);

      for (let y = 0; y < rows; y++) {
        const py = y * cellSize;
        for (let x = 0; x < cols; x++) {
          const px = x * cellSize;

          // Distance from user cursor
          const dx = px - state.servicesMouseX;
          const dy = py - state.servicesMouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Subtle background breathing wave
          const wave = Math.sin(x * 0.12 + y * 0.08 + time) * 0.5 + 0.5;
          let alpha = 0.04 + wave * 0.06;

          // Interactive ripple aura on cursor proximity
          if (dist < 260) {
            const aura = (1 - dist / 260);
            const ripple = Math.sin(dist * 0.08 - time * 4) * 0.5 + 0.5;
            alpha += aura * (0.35 + ripple * 0.35);
          }

          // Lama Lama smile logo clusters placed periodically
          const blockX = x % 24;
          const blockY = y % 24;
          if (blockX >= 10 && blockX < 14 && blockY >= 10 && blockY < 14) {
            const isSmile = smilePattern[blockY - 10][blockX - 10];
            if (isSmile) {
              const pulse = Math.sin(time * 2 + (x * 0.1)) * 0.5 + 0.5;
              alpha += 0.25 + pulse * 0.2;
            }
          }

          if (alpha > 0.03) {
            ctx.fillStyle = \`rgba(255, 255, 255, \${Math.min(0.9, alpha)})\`;
            // 2px square pixel dot centered in the 8px cell
            ctx.fillRect(px + 3, py + 3, 2, 2);
          }
        }
      }

      animFrame = requestAnimationFrame(renderLoop);
    }

    resize();
    window.addEventListener('resize', resize);
    animFrame = requestAnimationFrame(renderLoop);
  }

  /* ===================================================
     7. FULLSCREEN VIDEO MODAL (STICKY & CASES)
     =================================================== */
  function initVideoModal() {
    const modal = document.querySelector('.js-video-modal-container');
    const modalVideo = modal?.querySelector('video');
    const closeBtn = modal?.querySelector('.js-close-modal');
    const playBtn = modal?.querySelector('.js-play-button');
    const muteBtn = modal?.querySelector('.js-mute-button');
    const progressBtn = modal?.querySelector('.js-progress-line-button');
    const progressLine = modal?.querySelector('.js-progress-line');
    const currentTimeEl = modal?.querySelector('.js-current-time');
    const openShowreelButtons = document.querySelectorAll('.js-toggle-showreel, .js-open-showreel');

    if (!modal) return;

    function openModal(videoSrc) {
      if (modalVideo && videoSrc) {
        modalVideo.src = videoSrc;
        modalVideo.play().catch(() => {});
      }
      modal.classList.add('is-active');
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'auto';
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      if (modalVideo) {
        modalVideo.pause();
        modalVideo.currentTime = 0;
      }
      modal.classList.remove('is-active');
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
      document.body.style.overflow = '';
    }

    openShowreelButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const src = btn.dataset.src || '/videos/showreel.mp4';
        openModal(src);
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-active')) {
        closeModal();
      }
    });

    if (playBtn && modalVideo) {
      playBtn.addEventListener('click', () => {
        if (modalVideo.paused) {
          modalVideo.play();
          playBtn.querySelector('.js-pause-label')?.classList.remove('hidden');
          playBtn.querySelector('.js-play-label')?.classList.add('hidden');
        } else {
          modalVideo.pause();
          playBtn.querySelector('.js-pause-label')?.classList.add('hidden');
          playBtn.querySelector('.js-play-label')?.classList.remove('hidden');
        }
      });
    }

    if (muteBtn && modalVideo) {
      muteBtn.addEventListener('click', () => {
        modalVideo.muted = !modalVideo.muted;
        if (modalVideo.muted) {
          muteBtn.querySelector('.js-mute-label')?.classList.remove('hidden');
          muteBtn.querySelector('.js-unmute-label')?.classList.add('hidden');
        } else {
          muteBtn.querySelector('.js-mute-label')?.classList.add('hidden');
          muteBtn.querySelector('.js-unmute-label')?.classList.remove('hidden');
        }
      });
    }

    if (modalVideo) {
      modalVideo.addEventListener('timeupdate', () => {
        if (!modalVideo.duration) return;
        const pct = modalVideo.currentTime / modalVideo.duration;
        if (progressLine) progressLine.style.transform = \`scaleX(\${pct})\`;

        const mins = Math.floor(modalVideo.currentTime / 60);
        const secs = Math.floor(modalVideo.currentTime % 60).toString().padStart(2, '0');
        if (currentTimeEl) currentTimeEl.textContent = \`\${mins}:\${secs}\`;
      });
    }

    if (progressBtn && modalVideo) {
      progressBtn.addEventListener('click', (e) => {
        const rect = progressBtn.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        modalVideo.currentTime = pos * (modalVideo.duration || 63);
      });
    }
  }

  /* ===================================================
     8. FEATURED CASES ACCORDION
     =================================================== */
  function initCasesAccordion() {
    const caseItems = document.querySelectorAll('.js-case-item');
    if (!caseItems.length) return;

    caseItems.forEach((item, index) => {
      const contentEl = item.querySelector('.js-content');
      const minus = item.querySelector('.js-minus');
      const plus = item.querySelector('.js-plus');
      const zoomBtn = item.querySelector('.js-zoom-button');

      // Populate slide imagery
      const slides = item.querySelectorAll('.ll-swiper-slide');
      slides.forEach((slide, sIdx) => {
        if (!slide.querySelector('img') && !slide.querySelector('video')) {
          const img = document.createElement('img');
          img.loading = 'lazy';
          const sampleImgs = [
            '/images/lamalama/lamalama-moov-branding-04-1200x800.jpg',
            '/images/lamalama/lamalama-moov-branding-16-960x1200.jpg',
            '/images/lamalama/lamalama-moov-branding-03-1200x800.jpg',
            '/images/lamalama/lamalama-moov-branding-15-960x1200.jpg',
            '/images/lamalama/Gardners01-1-1200x800.jpg',
            '/images/lamalama/Gardners02-1-960x1200.jpg'
          ];
          img.src = sampleImgs[(index * 2 + sIdx) % sampleImgs.length];
          img.alt = 'Case Preview';
          slide.appendChild(img);
        }
      });

      function openCase() {
        caseItems.forEach(ci => {
          ci.classList.remove('is-open');
          const c = ci.querySelector('.js-content');
          if (c) c.style.height = '0px';
          ci.querySelector('.js-minus')?.classList.add('hidden');
          ci.querySelector('.js-plus')?.classList.remove('hidden');
          const zb = ci.querySelector('.js-zoom-button');
          if (zb) zb.style.opacity = '0';
        });

        item.classList.add('is-open');
        if (contentEl) contentEl.style.height = '420px';
        if (minus) minus.classList.remove('hidden');
        if (plus) plus.classList.add('hidden');
        if (zoomBtn) {
          zoomBtn.style.opacity = '1';
          zoomBtn.style.pointerEvents = 'auto';
        }
      }

      item.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        openCase();
      });

      // Open first item by default
      if (index === 0) {
        openCase();
      }
    });
  }

  /* ===================================================
     9. PITCHDECK MODAL
     =================================================== */
  function initPitchdeck() {
    const openPitchdeckBtn = document.querySelector('.js-open-pitchdeck');
    const pitchdeckContainer = document.querySelector('.js-pitchdeck-container') || document.querySelector('.ll-pitchdeck');
    const closeBtn = document.querySelector('.ll-close-pitchdeck');

    if (!openPitchdeckBtn) return;

    openPitchdeckBtn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerPageTransition(() => {
        alert("Lama Lama Pitchdeck: We craft brands, products, and digital experiences that hit harder.");
      });
    });

    if (closeBtn && pitchdeckContainer) {
      closeBtn.addEventListener('click', () => {
        pitchdeckContainer.classList.remove('is-active');
      });
    }
  }

  /* ===================================================
     10. CONTEXTUAL TRAILING CURSOR
     =================================================== */
  function initCursor() {
    const oldDot = document.querySelector('.ll-cursor-dot');
    const oldRing = document.querySelector('.ll-cursor-ring');
    if (oldDot) oldDot.remove();
    if (oldRing) oldRing.remove();

    const cursorLabel = document.querySelector('.js-cursor-label');
    const cursorText = cursorLabel?.querySelector('.js-text-container');
    if (!cursorLabel) return;

    window.addEventListener('mousemove', (e) => {
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
    });

    function updateCursor() {
      state.cursorX += (state.mouseX - state.cursorX) * 0.18;
      state.cursorY += (state.mouseY - state.cursorY) * 0.18;
      cursorLabel.style.transform = \`translate3d(\${state.cursorX + 16}px, \${state.cursorY + 16}px, 0)\`;
      requestAnimationFrame(updateCursor);
    }
    requestAnimationFrame(updateCursor);

    // Contextual cursor hints on hover
    document.querySelectorAll('a, button, [role="button"], .js-case-item, .swiper-wrapper, .js-backdrop-item, video, .js-nav-item').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursorLabel.style.opacity = '1';
        let tag = 'VIEW';
        if (el.classList.contains('js-case-item') || el.closest('.js-case-item')) {
          tag = 'EXPLORE';
        } else if (el.closest('.swiper-wrapper')) {
          tag = 'DRAG';
        } else if (el.tagName === 'VIDEO' || el.classList.contains('js-backdrop-item') || el.closest('.js-showreel-preview')) {
          tag = 'PLAY';
        } else if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
          tag = el.dataset.text || 'OPEN';
        } else if (el.dataset.text) {
          tag = el.dataset.text;
        }
        if (cursorText) cursorText.textContent = \`[ \${tag} ]\`;
      });
      el.addEventListener('mouseleave', () => {
        cursorLabel.style.opacity = '0';
      });
    });
  }

  /* ===================================================
     11. PAGE TRANSITION SYSTEM
     =================================================== */
  function triggerPageTransition(onComplete) {
    const curtain = document.querySelector('.js-page-transition');
    const counterContainer = document.querySelector('.js-page-transition-counter-container');
    const counterEl = document.querySelector('.js-page-transition-counter');
    if (!curtain || !counterContainer || !counterEl) {
      if (onComplete) onComplete();
      return;
    }

    curtain.classList.remove('hidden');
    curtain.style.display = 'block';
    curtain.classList.remove('is-exiting');
    curtain.classList.add('is-active');
    counterContainer.classList.add('is-active');

    let count = 0;
    const duration = 500;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(1, elapsed / duration);
      count = Math.floor(pct * 100);
      counterEl.textContent = count;

      if (pct >= 1) {
        clearInterval(interval);
        counterEl.textContent = '100';

        setTimeout(() => {
          if (onComplete) onComplete();
          curtain.classList.remove('is-active');
          curtain.classList.add('is-exiting');
          counterContainer.classList.remove('is-active');
          setTimeout(() => {
            curtain.classList.remove('is-exiting');
            curtain.style.display = 'none';
          }, 600);
        }, 150);
      }
    }, 16);
  }

  /* ===================================================
     INITIALIZATION ON DOM READY
     =================================================== */
  function init() {
    initPreloader();
    initNavigation();
    initContactForm();
    initClock();
    initDitherTransition();
    initServicesPixelAnimation();
    initVideoModal();
    initCasesAccordion();
    initPitchdeck();
    initCursor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
`;

fs.writeFileSync(path.join(__dirname, '..', 'public', 'js', 'lamalama-interactive.js'), interactiveCode, 'utf8');
console.log('Updated public/js/lamalama-interactive.js successfully');
