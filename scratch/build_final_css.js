const fs = require('fs');

const css = `/* ===================================================
   LAMA LAMA RECREATION - CORE STYLES & ANIMATIONS
   =================================================== */

@font-face {
  font-family: SuisseBPIntl;
  src: url('/fonts/SuisseBPIntl-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: SuisseBPIntl;
  src: url('/fonts/SuisseBPIntl-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: SuisseBPIntl;
  src: url('/fonts/SuisseBPIntl-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: SuisseBPIntl;
  src: url('/fonts/SuisseBPIntl-Light.woff2') format('woff2');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: Sometype;
  src: url('/fonts/Sometype-Mono.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}

:root {
  --ll-grid-gap: 1.5rem;
  --ll-grid-margin: 2rem;
}

@media (max-width: 1024px) {
  :root {
    --ll-grid-gap: 1rem;
    --ll-grid-margin: 1rem;
  }
}

html {
  background-color: #000000;
  color: #ffffff;
  font-family: 'Sometype', monospace;
  scroll-behavior: smooth;
  overflow-x: hidden;
}

body {
  background-color: #000000;
  color: #ffffff;
  margin: 0;
  padding: 0;
  font-family: 'Sometype', monospace;
  overflow-x: hidden;
}

/* Headings use SuisseBPIntl */
h1, h2, h3, h4, h5, h6,
.ll-heading-1, .ll-heading-2, .ll-heading-3, .ll-heading-4, .ll-heading-5, .ll-heading-6,
.ll-display-sm, .ll-display-md, .ll-display-lg {
  font-family: 'SuisseBPIntl', sans-serif !important;
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.08;
}

.ll-body-rg, .ll-body-md {
  font-family: 'SuisseBPIntl', sans-serif !important;
  line-height: 1.5;
}

/* Preloader */
.ll-loader {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  background-color: #000000;
  color: #ffffff;
  font-size: 0.75rem;
  font-family: 'Sometype', monospace;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  font-weight: 500;
  transition: transform 0.8s cubic-bezier(0.85, 0, 0.15, 1), opacity 0.5s ease 0.4s;
}

.ll-loader.is-loaded {
  transform: translateY(-100%) !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Page Transition Curtain */
.js-page-transition {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background-color: #000000;
  z-index: 9998;
  transform: translateY(100%);
  pointer-events: none;
  transition: transform 0.6s cubic-bezier(0.77, 0, 0.175, 1);
}

.js-page-transition.is-active {
  transform: translateY(0%);
  pointer-events: auto;
}

.js-page-transition.is-exiting {
  transform: translateY(-100%);
}

.js-page-transition-counter-container {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sometype', monospace;
  font-size: 1rem;
  letter-spacing: 0.05em;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.js-page-transition-counter-container.is-active {
  opacity: 1;
}

/* Reveal states */
.js-header, .js-sticky-items, .js-sticky-bar {
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.is-revealed {
  opacity: 1 !important;
  transform: none !important;
}

.ll-text-reveal {
  opacity: 1 !important;
}

/* Header Dropdown Menu Transitions */
.js-menu {
  transition: max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s ease;
  overflow: hidden;
}

.js-menu-items-container {
  transition: height 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

.js-dropdown-items {
  transition: height 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.js-form-container {
  transition: height 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Nav Item hover lines and icons */
.ll-add-navItem {
  transition: background-color 0.2s ease, color 0.2s ease;
}

.ll-add-navItem:hover .js-backdrop {
  opacity: 1 !important;
}

.ll-add-navItem:hover .js-line {
  transform: scaleX(1) !important;
}

.ll-add-navItemChild:hover .js-backdrop {
  opacity: 1 !important;
}

/* Buttons Hover Animation */
.ll-part--buttons-button {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.ll-part--buttons-button:hover .js-backdrop-hover {
  opacity: 1 !important;
}

.ll-part--buttons-button:hover .js-text {
  opacity: 0 !important;
}

.ll-part--buttons-button:hover .js-text-hover {
  opacity: 1 !important;
}

.ll-part--buttons-button:hover .js-arrow {
  transform: translate(3px, -3px) !important;
}

.ll-part--buttons-button:hover .js-arrow-hover {
  transform: scale(1) translate(0px, 0px) !important;
}

/* Case Highlighted Accordion */
.js-case-item {
  transition: background-color 0.3s ease, border-color 0.3s ease, padding 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.js-case-item .js-content {
  transition: height 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
}

.js-case-item.is-open {
  background-color: rgba(255, 255, 255, 0.03);
}

.js-case-item.is-open .js-minus {
  display: inline-block !important;
}

.js-case-item.is-open .js-plus {
  display: none !important;
}

.js-case-item.is-open .js-zoom-button {
  opacity: 1 !important;
  pointer-events: auto !important;
}

/* Swiper Slider layout */
.swiper-wrapper {
  display: flex;
  overflow-x: auto;
  scroll-behavior: smooth;
  gap: 1rem;
  scrollbar-width: none;
}
.swiper-wrapper::-webkit-scrollbar {
  display: none;
}

.ll-swiper-slide {
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background-color: #161616;
  position: relative;
}

.ll-swiper-slide img,
.ll-swiper-slide video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Clean Default Cursor & Contextual Hints */
html, body {
  cursor: auto !important;
}

button, a, [role="button"], input[type="submit"], .cursor-pointer {
  cursor: pointer !important;
}

.ll-cursor-dot,
.ll-cursor-ring,
[class*="cursor-ring"],
[class*="cursor-dot"],
[class*="cursor-container"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* Contextual Trailing Label Pill Badge */
.js-cursor-label {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 100000;
  will-change: transform;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.js-cursor-label .ll-part--tag-item {
  background: rgba(18, 18, 18, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  padding: 3px 8px;
  font-family: 'Sometype', monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

/* ===================================================
   PIXELATED / DITHER DISSOLVING TRANSITION
   =================================================== */
.ll-dither-transition-container {
  position: relative;
  width: 100%;
  height: 180px;
  margin-top: -90px;
  margin-bottom: -90px;
  z-index: 15;
  pointer-events: none;
  overflow: hidden;
}

.ll-dither-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}

/* Fullscreen Video Modal */
.js-video-modal-container {
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.js-video-modal-container.is-active {
  opacity: 1 !important;
  pointer-events: auto !important;
}

/* Pitchdeck Modal */
.js-pitchdeck-container {
  position: fixed;
  inset: 0;
  z-index: 9990;
  background: #000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}

.js-pitchdeck-container.is-active {
  opacity: 1 !important;
  pointer-events: auto !important;
}

/* Marquee / Logos continuous animation */
@keyframes ll-marquee {
  0% { transform: translateX(0%); }
  100% { transform: translateX(-50%); }
}

.js-logos-track {
  display: flex;
  width: max-content;
  animation: ll-marquee 35s linear infinite;
}

.js-logos-track:hover {
  animation-play-state: paused;
}

/* Red pulsing dot in Clock */
@keyframes ll-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.js-clock .js-ball {
  animation: ll-pulse 2s infinite ease-in-out;
  display: inline-block;
  background-color: #ff3b30 !important;
}
`;

fs.writeFileSync('scratch/final_reverted_custom.css', css);
console.log('Saved scratch/final_reverted_custom.css, length:', css.length);
