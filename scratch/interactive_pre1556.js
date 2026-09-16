/**
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
    clockInterval: null
  };

  /* ===================================================
     1. PRELOADER & ENTRANCE SEQUENCE
     =================================================== */
  function initPreloader() {
    const loader = document.querySelector('.js-loader');
    const counter = document.querySelector('.js-progress');
    if (!loader || !counter) return;

    let progress = 0;
    const duration = 1000; // ms
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(1, elapsed / duration);
      progress = Math.floor(pct * 100);
      counter.textContent = progress;

      if (pct >= 1) {
        clearInterval(timer);
        counter.textContent = '100';
        loader.classList.add('is-loaded');
        setTimeout(() => {
          loader.style.display = 'none';
          revealEntrance();
        }, 300);
      }
    }, 16);
  }

  function revealEntrance() {
    state.isPreloaded = true;

    // Header reveal
    const header = document.querySelector('.js-header');
    const stickyMenu = document.querySelector('.js-menu');
    if (header) header.classList.add('is-revealed');
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

    // Reveal text elements with staggered fade
    document.querySelectorAll('.ll-text-reveal').forEach((el, i) => {
      setTimeout(() => {
        el.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, i * 80);
    });

    // Start Real-time Clock
    initClock();

    // Start Mono Tag Rotating Reel
    initMonoTextTagCycler();
  }

  /* ===================================================
     2. REAL-TIME AMSTERDAM CLOCK
     =================================================== */
  function initClock() {
    const clockEl = document.querySelector('.js-clock');
    if (!clockEl) return;

    const leftBracket = clockEl.querySelector('.js-bracket-left');
    const rightBracket = clockEl.querySelector('.js-bracket-right');
    const hoursEl = clockEl.querySelector('.js-hours');
    const minutesEl = clockEl.querySelector('.js-minutes');
    const secondsEl = clockEl.querySelector('.js-seconds');
    const ballEl = clockEl.querySelector('.js-ball');
    const colEls = clockEl.querySelectorAll('.js-column');

    if (leftBracket) leftBracket.textContent = '[';
    if (rightBracket) rightBracket.textContent = ']';
    if (colEls[0]) colEls[0].textContent = ':';
    if (colEls[1]) colEls[1].textContent = ':';
    if (ballEl) ballEl.style.opacity = '1';

    function update() {
      // Format time in Europe/Amsterdam timezone
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Amsterdam',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(new Date());
      const h = parts.find(p => p.type === 'hour')?.value || '00';
      const m = parts.find(p => p.type === 'minute')?.value || '00';
      const s = parts.find(p => p.type === 'second')?.value || '00';

      if (hoursEl) hoursEl.textContent = h;
      if (minutesEl) minutesEl.textContent = m;
      if (secondsEl) secondsEl.textContent = s;
    }

    update();
    setInterval(update, 1000);
  }

  /* ===================================================
     3. ROTATING MONO TEXT TAG REEL
     =================================================== */
  function initMonoTextTagCycler() {
    const container = document.querySelector('.js-header-message-container .js-text-container');
    if (!container) return;

    const messages = ['YOU MADE IT', 'LET’S DO DAMAGE', 'LOOKING SHARP TODAY', 'NICE ENTRANCE'];
    let idx = 0;
    container.textContent = messages[0];

    setInterval(() => {
      idx = (idx + 1) % messages.length;
      const target = messages[idx];
      scrambleText(container, target);
    }, 3600);
  }

  function scrambleText(element, targetText) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let iteration = 0;
    const maxIterations = targetText.length * 2;
    const interval = setInterval(() => {
      element.textContent = targetText
        .split('')
        .map((letter, index) => {
          if (letter === ' ') return ' ';
          if (index < iteration / 2) {
            return targetText[index];
          }
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');

      if (iteration >= maxIterations) {
        clearInterval(interval);
        element.textContent = targetText;
      }
      iteration += 1;
    }, 30);
  }

  /* ===================================================
     4. STICKY HEADER PILL & EXPANDING MENU
     =================================================== */
  function initHeaderMenu() {
    const toggleBtn = document.querySelector('.js-menu-toggle-button');
    const toggleArea = document.querySelector('.js-menu-toggle');
    const menuContainer = document.querySelector('.js-menu-items-container');
    const menuBlur = document.querySelector('.js-menu-blur');
    const dropdownToggle = document.querySelector('.js-dropdown-toggle');
    const dropdownItems = document.querySelector('.js-dropdown-items');

    function toggleMenu(forceClose = false) {
      if (forceClose || state.menuOpen) {
        state.menuOpen = false;
        if (menuContainer) menuContainer.style.height = '0px';
        if (menuBlur) {
          menuBlur.classList.add('hidden');
          menuBlur.style.opacity = '0';
        }
        // Reset hamburger lines
        if (toggleBtn) {
          const top = toggleBtn.querySelector('.js-top');
          const mid = toggleBtn.querySelector('.js-middle');
          const bot = toggleBtn.querySelector('.js-bottom');
          if (top) top.style.transform = 'none';
          if (mid) mid.style.opacity = '1';
          if (bot) bot.style.transform = 'none';
        }
        // If form was active, close it
        closeForm();
      } else {
        state.menuOpen = true;
        const targetHeight = 360;
        if (menuContainer) menuContainer.style.height = targetHeight + 'px';
        if (menuBlur) {
          menuBlur.classList.remove('hidden');
          menuBlur.style.opacity = '1';
          menuBlur.style.pointerEvents = 'auto';
        }
        // Animate hamburger to X
        if (toggleBtn) {
          const top = toggleBtn.querySelector('.js-top');
          const mid = toggleBtn.querySelector('.js-middle');
          const bot = toggleBtn.querySelector('.js-bottom');
          if (top) top.style.transform = 'translateY(5px) rotate(45deg)';
          if (mid) mid.style.opacity = '0';
          if (bot) bot.style.transform = 'translateY(-5px) rotate(-45deg)';
        }
      }
    }

    if (toggleBtn) toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
    if (toggleArea) toggleArea.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
    if (menuBlur) menuBlur.addEventListener('click', () => toggleMenu(true));

    // Services Sub-accordion
    if (dropdownToggle && dropdownItems) {
      dropdownToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.servicesOpen = !state.servicesOpen;
        if (state.servicesOpen) {
          dropdownItems.style.height = '160px';
          if (menuContainer) menuContainer.style.height = '500px';
        } else {
          dropdownItems.style.height = '0px';
          if (menuContainer) menuContainer.style.height = '360px';
        }
      });
    }

    // Multi-Step Questionnaire Trigger
    const startProjectBtn = document.querySelector('.js-start-a-project');
    if (startProjectBtn) {
      startProjectBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openForm();
      });
    }

    const cancelFormBtn = document.querySelector('.js-form-cancel');
    if (cancelFormBtn) {
      cancelFormBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeForm();
      });
    }

    // Schedule a call trigger
    const scheduleCallBtn = document.querySelector('a[href="#cal"]');
    if (scheduleCallBtn) {
      scheduleCallBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openForm();
      });
    }
  }

  /* ===================================================
     5. MULTI-STEP PROJECT QUESTIONNAIRE
     =================================================== */
  function openForm() {
    state.formActive = true;
    state.currentStep = 0;

    const navList = document.querySelector('.js-items-inner-container');
    const formContainer = document.querySelector('.js-form-container');
    const menuButtons = document.querySelector('.js-menu-buttons');
    const formButtons = document.querySelector('.js-form-buttons');
    const progressLineContainer = document.querySelector('.js-line-container');
    const menuContainer = document.querySelector('.js-menu-items-container');

    if (navList) navList.style.display = 'none';
    if (formContainer) {
      formContainer.style.height = '300px';
      const formInner = formContainer.querySelector('.js-form-inner');
      if (formInner) formInner.style.opacity = '1';
    }
    if (menuButtons) menuButtons.style.display = 'none';
    if (formButtons) {
      formButtons.style.opacity = '1';
      formButtons.style.pointerEvents = 'auto';
    }
    if (progressLineContainer) progressLineContainer.style.opacity = '1';
    if (menuContainer) menuContainer.style.height = '430px';

    updateFormStep();
  }

  function closeForm() {
    state.formActive = false;
    const navList = document.querySelector('.js-items-inner-container');
    const formContainer = document.querySelector('.js-form-container');
    const menuButtons = document.querySelector('.js-menu-buttons');
    const formButtons = document.querySelector('.js-form-buttons');
    const progressLineContainer = document.querySelector('.js-line-container');
    const menuContainer = document.querySelector('.js-menu-items-container');

    if (navList) navList.style.display = 'block';
    if (formContainer) formContainer.style.height = '0px';
    if (menuButtons) menuButtons.style.display = 'grid';
    if (formButtons) {
      formButtons.style.opacity = '0';
      formButtons.style.pointerEvents = 'none';
    }
    if (progressLineContainer) progressLineContainer.style.opacity = '0';
    if (menuContainer && state.menuOpen) menuContainer.style.height = '360px';
  }

  function updateFormStep() {
    const fields = document.querySelectorAll('#menu-contact-form .js-form-field');
    const progressLine = document.querySelector('.js-progress-line');
    const nextBtn = document.querySelector('.js-form-next');
    const backBtn = document.querySelector('.js-form-back');
    const submitBtn = document.querySelector('.js-form-submit');

    fields.forEach((f, idx) => {
      if (idx === state.currentStep) {
        f.style.display = 'flex';
        f.style.opacity = '1';
      } else {
        f.style.display = 'none';
        f.style.opacity = '0';
      }
    });

    const pct = ((state.currentStep + 1) / fields.length) * 100;
    if (progressLine) progressLine.style.transform = `scaleX(${pct / 100})`;

    if (backBtn) {
      if (state.currentStep > 0) {
        backBtn.classList.remove('hidden');
      } else {
        backBtn.classList.add('hidden');
      }
    }

    if (state.currentStep === fields.length - 1) {
      if (nextBtn) nextBtn.classList.add('hidden');
      if (submitBtn) submitBtn.classList.remove('hidden');
    } else {
      if (nextBtn) nextBtn.classList.remove('hidden');
      if (submitBtn) submitBtn.classList.add('hidden');
    }
  }

  // Bind Form Navigation
  function initFormControls() {
    const nextBtn = document.querySelector('.js-form-next');
    const backBtn = document.querySelector('.js-form-back');
    const submitBtn = document.querySelector('.js-form-submit');
    const form = document.querySelector('#menu-contact-form');
    const successMsg = document.querySelector('.js-form-success');
    const fields = document.querySelectorAll('#menu-contact-form .js-form-field');

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.currentStep < fields.length - 1) {
          state.currentStep++;
          updateFormStep();
        }
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.currentStep > 0) {
          state.currentStep--;
          updateFormStep();
        }
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const loader = submitBtn?.querySelector('.js-form-submit-loader');
        if (loader) loader.classList.remove('hidden');

        setTimeout(() => {
          if (loader) loader.classList.add('hidden');
          form.style.display = 'none';
          if (successMsg) {
            successMsg.style.opacity = '1';
            successMsg.style.pointerEvents = 'auto';
          }
          const successLine = document.querySelector('.js-success-line');
          if (successLine) successLine.style.opacity = '1';
        }, 600);
      });
    }
  }

  /* ===================================================
     6. HERO SHOWREEL PREVIEW & FULLSCREEN MODAL
     =================================================== */
  function initHeroShowreel() {
    const titleToggle = document.querySelector('.js-title-toggle');
    const childrenContainer = document.querySelector('.js-children-container');
    const showreelBtn = document.querySelector('.js-toggle-showreel');
    const videoModal = document.querySelector('.js-video-modal-container');
    const modalVideo = document.querySelector('.js-video-modal-item');
    const closeBtn = document.querySelector('.js-close-video-modal');

    // Title Toggle (+) / (-)
    if (titleToggle && childrenContainer) {
      let isOpen = true;
      titleToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        isOpen = !isOpen;
        if (isOpen) {
          childrenContainer.style.display = 'block';
          titleToggle.querySelector('.js-plus')?.classList.add('hidden');
          titleToggle.querySelector('.js-minus')?.classList.remove('hidden');
        } else {
          childrenContainer.style.display = 'none';
          titleToggle.querySelector('.js-plus')?.classList.remove('hidden');
          titleToggle.querySelector('.js-minus')?.classList.add('hidden');
        }
      });
    }

    // Open Fullscreen Video Modal
    function openModal() {
      if (!videoModal) return;
      videoModal.classList.add('is-active');
      videoModal.style.opacity = '1';
      videoModal.style.pointerEvents = 'auto';
      if (modalVideo) {
        modalVideo.src = '/videos/showreel.mp4';
        modalVideo.style.opacity = '1';
        modalVideo.currentTime = 0;
        modalVideo.play().catch(() => {});
        state.videoPlaying = true;
      }
    }

    function closeModal() {
      if (!videoModal) return;
      videoModal.classList.remove('is-active');
      videoModal.style.opacity = '0';
      videoModal.style.pointerEvents = 'none';
      if (modalVideo) {
        modalVideo.pause();
      }
    }

    if (showreelBtn) showreelBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Video Controls
    const playBtn = document.querySelector('.js-play-button');
    const muteBtn = document.querySelector('.js-mute-button');
    const progressLine = document.querySelector('.js-progress-line');
    const progressBtn = document.querySelector('.js-progress-line-button');
    const currentTimeEl = document.querySelector('.js-video-duration .js-current .js-text-container');
    const durationContainer = document.querySelector('.js-video-duration');

    if (durationContainer) durationContainer.style.opacity = '1';

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
        if (progressLine) progressLine.style.transform = `scaleX(${pct})`;

        const mins = Math.floor(modalVideo.currentTime / 60);
        const secs = Math.floor(modalVideo.currentTime % 60).toString().padStart(2, '0');
        if (currentTimeEl) currentTimeEl.textContent = `${mins}:${secs}`;
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
     7. FEATURED CASES ACCORDION
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
          // Use authentic downloaded images
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
        // Prevent link navigations inside from closing
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
     8. PITCHDECK MODAL
     =================================================== */
  function initPitchdeck() {
    const openPitchdeckBtn = document.querySelector('.js-open-pitchdeck');
    const pitchdeckContainer = document.querySelector('.js-pitchdeck-container') || document.querySelector('.ll-pitchdeck');
    const closeBtn = document.querySelector('.ll-close-pitchdeck');

    if (!openPitchdeckBtn) return;

    openPitchdeckBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Trigger page transition as requested
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
  /* ===================================================
     9. AUTHENTIC CUSTOM CURSOR SYSTEM
     =================================================== */
  function initCursor() {
    // Create cursor dot and ring if not present
    let dot = document.querySelector('.ll-cursor-dot');
    let ring = document.querySelector('.ll-cursor-ring');
    if (!dot) {
      dot = document.createElement('div');
      dot.className = 'll-cursor-dot';
      document.body.appendChild(dot);
    }
    if (!ring) {
      ring = document.createElement('div');
      ring.className = 'll-cursor-ring';
      document.body.appendChild(ring);
    }

    const cursorLabel = document.querySelector('.js-cursor-label');
    const cursorText = cursorLabel?.querySelector('.js-text-container');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let labelX = mouseX;
    let labelY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    });

    function updateCursor() {
      // Smooth lerp for ring and magnetic label pill
      ringX += (mouseX - ringX) * 0.22;
      ringY += (mouseY - ringY) * 0.22;
      ring.style.left = `${ringX}px`;
      ring.style.top = `${ringY}px`;

      if (cursorLabel) {
        labelX += (mouseX - labelX) * 0.15;
        labelY += (mouseY - labelY) * 0.15;
        cursorLabel.style.left = `${labelX}px`;
        cursorLabel.style.top = `${labelY}px`;
      }

      requestAnimationFrame(updateCursor);
    }
    requestAnimationFrame(updateCursor);

    // Contextual cursor hints on hover
    const hoverTargets = 'a, button, [role="button"], .js-case-item, .swiper-wrapper, .js-backdrop-item, video, .js-nav-item';
    document.querySelectorAll(hoverTargets).forEach(el => {
      el.addEventListener('mouseenter', () => {
        ring.classList.add('is-hovering');
        if (cursorLabel) cursorLabel.style.opacity = '1';

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

        if (cursorText) cursorText.textContent = `[ ${tag} ]`;
      });

      el.addEventListener('mouseleave', () => {
        ring.classList.remove('is-hovering');
        if (cursorLabel) cursorLabel.style.opacity = '0';
      });
    });

    document.addEventListener('mouseleave', () => {
      dot.classList.add('is-hidden');
      ring.classList.add('is-hidden');
      if (cursorLabel) cursorLabel.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
      dot.classList.remove('is-hidden');
      ring.classList.remove('is-hidden');
    });
  }

  /* ===================================================
     10. PIXELATED / DITHER DISSOLVING TRANSITION
     =================================================== */
  function initDitherTransition() {
    const heroSection = document.querySelector('.ll-section--hero_extended');
    const workSection = document.querySelector('#work') || document.querySelector('.ll-section--case_highlighted');
    if (!heroSection) return;

    let container = document.querySelector('.ll-dither-transition-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'll-dither-transition-container';
      const canvas = document.createElement('canvas');
      canvas.className = 'll-dither-canvas';
      container.appendChild(canvas);
      if (workSection && workSection.parentNode) {
        workSection.parentNode.insertBefore(container, workSection);
      } else {
        heroSection.parentNode.insertBefore(container, heroSection.nextSibling);
      }
    }

    const canvas = container.querySelector('.ll-dither-canvas');
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

    const pixelSize = 8; // 8px square dither blocks
    let width = 0, height = 0;

    function resize() {
      width = canvas.width = container.offsetWidth || window.innerWidth;
      height = canvas.height = container.offsetHeight || 180;
      renderDither();
    }

    function renderDither() {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / pixelSize);
      const rows = Math.ceil(height / pixelSize);

      const rect = container.getBoundingClientRect();
      const viewH = window.innerHeight;
      let progress = (viewH - rect.top) / (viewH + height);
      progress = Math.max(0, Math.min(1, progress));

      ctx.fillStyle = '#000000';

      for (let y = 0; y < rows; y++) {
        const vGrad = y / rows;
        const thresholdVal = Math.min(1, Math.max(0, vGrad * 1.15 + (progress - 0.5) * 0.35));

        for (let x = 0; x < cols; x++) {
          const bayerIdx = (y % 8) * 8 + (x % 8);
          const bayerThreshold = bayer8[bayerIdx] / 64.0;

          if (thresholdVal > bayerThreshold) {
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

    // Drop Curtain
    curtain.classList.remove('hidden');
    curtain.style.display = 'block';
    curtain.classList.remove('is-exiting');
    curtain.classList.add('is-active');
    counterContainer.classList.add('is-active');

    let count = 0;
    const duration = 500; // fast authentic counter
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const pct = Math.min(1, elapsed / duration);
      count = Math.floor(pct * 100);
      counterEl.textContent = count;

      if (pct < 1) {
        requestAnimationFrame(step);
      } else {
        counterEl.textContent = '100';
        setTimeout(() => {
          if (onComplete) onComplete();

          // Exit Curtain upward
          counterContainer.classList.remove('is-active');
          curtain.classList.add('is-exiting');
          setTimeout(() => {
            curtain.classList.remove('is-active');
            curtain.classList.remove('is-exiting');
            curtain.style.display = 'none';
          }, 600);
        }, 150);
      }
    }
    requestAnimationFrame(step);
  }

  function initPageTransitions() {
    // Intercept navigation links (Work, About us, Careers, Contact, Cases, etc.)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      // Skip external social / target="_blank"
      if (!href || href.startsWith('http') && !href.includes('lamalama.com') && !href.includes('localhost') && !href.includes('127.0.0.1')) {
        return;
      }

      // If linking to /projects, allow normal routing to projects
      if (href === '/projects' || href === '/projects/') {
        return;
      }

      // If internal or anchor, intercept with page transition
      e.preventDefault();

      // Close menu if open
      const toggleBtn = document.querySelector('.js-menu-toggle-button');
      if (state.menuOpen && toggleBtn) {
        toggleBtn.click();
      }

      triggerPageTransition(() => {
        if (href.startsWith('#')) {
          const target = document.querySelector(href);
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }

  /* ===================================================
     BOOTSTRAP
     =================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    // initPreloader(); // Let authentic WebGL intro shader run
    initHeaderMenu();
    initFormControls();
    initHeroShowreel();
    initCasesAccordion();
    initPitchdeck();
    initCursor();
    initDitherTransition();
    // initCanvas(); // Let authentic WebGL canvas engine claim webgl2 context
    initPageTransitions();
  });

})();
