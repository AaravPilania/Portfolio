const WebSocket = globalThis.WebSocket;
const fs = require('fs');

function createCdpClient(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  let idCounter = 1;
  const consoleLogs = [];
  const exceptions = [];

  ws.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        consoleLogs.push({ type: msg.params.type, text });
        console.log('[BROWSER]', msg.params.type, text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const err = msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || '');
        exceptions.push(err);
        console.error('[BROWSER EXCEPTION]', err);
      }
    } catch(e) {}
  });
  const ready = new Promise(resolve => ws.addEventListener('open', resolve));
  return {
    async call(method, params = {}) {
      await ready;
      return new Promise((resolve, reject) => {
        const id = idCounter++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    getLogs: () => ({ consoleLogs, exceptions }),
    close() { ws.close(); }
  };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runFullVerification() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');
  await client.call('Page.enable');

  console.log('=== Step 1: Navigating to Home (http://localhost:3000/) ===');
  await client.call('Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(4500); // Allow intro to finish and elements to reveal

  const homeInitialShot = await client.call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/home_initial_verified.png', Buffer.from(homeInitialShot.data, 'base64'));
  console.log('✓ Captured scratch/home_initial_verified.png');

  // Verify initial home state
  const homeInitialState = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('h1');
      return {
        url: window.location.pathname,
        h1Found: !!h1,
        h1Opacity: h1 ? window.getComputedStyle(h1).opacity : null,
        h1Visibility: h1 ? window.getComputedStyle(h1).visibility : null,
        heroCanvasFound: !!document.querySelector('canvas')
      };
    })()`,
    returnByValue: true
  });
  console.log('Home initial state:', homeInitialState.result.value);

  console.log('\n=== Step 2: Clicking Work Link to trigger Page Transition ===');
  await client.call('Runtime.evaluate', {
    expression: `(() => {
      const link = document.querySelector('a[href*="/work/"]');
      if (link) link.click();
    })()`
  });

  // Capture in-flight transition
  await sleep(400);
  const transitionShot = await client.call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/transition_inflight_verified.png', Buffer.from(transitionShot.data, 'base64'));
  console.log('✓ Captured scratch/transition_inflight_verified.png');

  // Check in-flight transition counter
  const inFlightState = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const counter = document.querySelector('.js-page-transition-counter');
      const counterContainer = document.querySelector('.js-page-transition-counter-container');
      const curtain = document.querySelector('.js-page-transition');
      return {
        counterText: counter ? counter.textContent : null,
        counterOpacity: counterContainer ? window.getComputedStyle(counterContainer).opacity : null,
        curtainOpacity: curtain ? window.getComputedStyle(curtain).opacity : null
      };
    })()`,
    returnByValue: true
  });
  console.log('In-flight transition state:', inFlightState.result.value);

  // Wait for transition to finish arriving at /work/
  await sleep(1500);
  const workShot = await client.call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/work_page_verified.png', Buffer.from(workShot.data, 'base64'));
  console.log('✓ Captured scratch/work_page_verified.png');

  const workState = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const curtain = document.querySelector('.js-page-transition');
      const counterContainer = document.querySelector('.js-page-transition-counter-container');
      return {
        url: window.location.pathname,
        curtainDisplay: curtain ? curtain.style.display : null,
        curtainOpacity: curtain ? window.getComputedStyle(curtain).opacity : null,
        counterContainerOpacity: counterContainer ? window.getComputedStyle(counterContainer).opacity : null,
        pointerEvents: document.body.style.pointerEvents,
        hasPostGrid: !!document.querySelector('.js-post-grid, [data-component="blocks/post_grid"]')
      };
    })()`,
    returnByValue: true
  });
  console.log('Work page state:', workState.result.value);

  console.log('\n=== Step 3: Navigating Back to Home ===');
  await client.call('Runtime.evaluate', { expression: `window.history.back()` });
  await sleep(2200); // Allow return transition to complete

  const returnedShot = await client.call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/home_returned_verified.png', Buffer.from(returnedShot.data, 'base64'));
  console.log('✓ Captured scratch/home_returned_verified.png');

  const returnedState = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('h1');
      const curtain = document.querySelector('.js-page-transition');
      const counterContainer = document.querySelector('.js-page-transition-counter-container');
      const counter = document.querySelector('.js-page-transition-counter');
      const heroVideo = document.querySelector('.ll-section--hero_extended video');
      const stickyItems = document.querySelector('.js-sticky-items');
      const stickyBar = document.querySelector('.js-sticky-bar');

      return {
        url: window.location.pathname,
        h1Found: !!h1,
        h1Text: h1 ? h1.innerText.slice(0, 50) : null,
        h1Opacity: h1 ? window.getComputedStyle(h1).opacity : null,
        h1Visibility: h1 ? window.getComputedStyle(h1).visibility : null,
        stickyItemsOpacity: stickyItems ? window.getComputedStyle(stickyItems).opacity : null,
        stickyBarOpacity: stickyBar ? window.getComputedStyle(stickyBar).opacity : null,
        curtainOpacity: curtain ? window.getComputedStyle(curtain).opacity : null,
        counterContainerOpacity: counterContainer ? window.getComputedStyle(counterContainer).opacity : null,
        counterText: counter ? counter.textContent : null,
        pointerEvents: document.body.style.pointerEvents,
        heroHooked: !!window.__heroAvatarEngine
      };
    })()`,
    returnByValue: true
  });
  console.log('Returned Home state:', returnedState.result.value);

  // Check exceptions
  const { exceptions } = client.getLogs();
  console.log('\n=== Exceptions Encountered ===');
  console.log(exceptions.length === 0 ? '✓ ZERO browser exceptions!' : exceptions);

  client.close();
}

runFullVerification().catch(console.error);
