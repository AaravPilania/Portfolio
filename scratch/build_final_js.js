const fs = require('fs');

// Read scratch/interactive_pre1556.js
let js = fs.readFileSync('scratch/interactive_pre1556.js', 'utf-8');

// Replace initCursor with the clean cursor implementation (no circular ring, no circular dot)
const cursorStart = js.indexOf('/* ===================================================\n     9. AUTHENTIC CUSTOM CURSOR SYSTEM');
const cursorEnd = js.indexOf('/* ===================================================\n     10. PIXELATED / DITHER DISSOLVING TRANSITION');

const cleanCursorCode = `/* ===================================================
     9. CLEAN CONTEXTUAL TRAILING CURSOR
     =================================================== */
  function initCursor() {
    // Remove any leftover cursor dot or ring elements
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

  `;

if (cursorStart !== -1 && cursorEnd !== -1) {
  js = js.slice(0, cursorStart) + cleanCursorCode + js.slice(cursorEnd);
  console.log('Successfully replaced cursor in interactive js');
} else {
  console.log('Could not find cursor slice bounds:', cursorStart, cursorEnd);
}

// Ensure loader watch in revealEntrance or bootstrap so elements always reveal smoothly
const bootstrapPattern = `document.addEventListener('DOMContentLoaded', () => {
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
  });`;

const enhancedBootstrap = `document.addEventListener('DOMContentLoaded', () => {
    initHeaderMenu();
    initFormControls();
    initHeroShowreel();
    initCasesAccordion();
    initPitchdeck();
    initCursor();
    initDitherTransition();
    initPageTransitions();

    // Ensure entrance elements reveal when authentic Nuxt preloader finishes
    const loaderEl = document.querySelector('.ll-loader') || document.querySelector('.js-loader');
    if (loaderEl) {
      if (loaderEl.classList.contains('is-loaded')) {
        revealEntrance();
      } else {
        const obs = new MutationObserver(() => {
          if (loaderEl.classList.contains('is-loaded')) {
            revealEntrance();
            obs.disconnect();
          }
        });
        obs.observe(loaderEl, { attributes: true, attributeFilter: ['class', 'style'] });
        setTimeout(revealEntrance, 2200);
      }
    } else {
      revealEntrance();
    }
  });`;

if (js.includes(bootstrapPattern)) {
  js = js.replace(bootstrapPattern, enhancedBootstrap);
  console.log('Successfully updated bootstrap in interactive js');
} else {
  console.log('Bootstrap pattern not found exactly, checking substring');
}

fs.writeFileSync('scratch/final_reverted_interactive.js', js);
console.log('Saved scratch/final_reverted_interactive.js, size:', js.length);
