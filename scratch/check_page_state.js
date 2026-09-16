const WebSocket = globalThis.WebSocket;

function createCdpClient(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  let idCounter = 1;
  ws.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
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
    close() { ws.close(); }
  };
}

async function checkState() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');
  await client.call('Page.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('h1');
      const textReveals = Array.from(document.querySelectorAll('.ll-text-reveal'));
      const heroSection = document.querySelector('.ll-section--hero_extended');
      const pt = window.$?.instances?.get('pageTransition');
      const curtain = document.querySelector('.js-page-transition');
      const counterContainer = document.querySelector('.js-page-transition-counter-container');
      const counter = document.querySelector('.js-page-transition-counter');

      return {
        url: window.location.pathname,
        h1Found: !!h1,
        h1Opacity: h1 ? window.getComputedStyle(h1).opacity : null,
        h1Visibility: h1 ? window.getComputedStyle(h1).visibility : null,
        h1ParentOpacity: h1?.parentElement ? window.getComputedStyle(h1.parentElement).opacity : null,
        textRevealsCount: textReveals.length,
        textRevealsRevealed: textReveals.filter(el => el.classList.contains('is-revealed')).length,
        textRevealsSampleOpacity: textReveals[0] ? window.getComputedStyle(textReveals[0]).opacity : null,
        heroFound: !!heroSection,
        heroOpacity: heroSection ? window.getComputedStyle(heroSection).opacity : null,
        curtainOpacity: curtain ? window.getComputedStyle(curtain).opacity : null,
        curtainDisplay: curtain ? curtain.style.display : null,
        counterContainerOpacity: counterContainer ? window.getComputedStyle(counterContainer).opacity : null,
        counterText: counter ? counter.textContent : null,
        pointerEvents: document.body.style.pointerEvents,
        ptAnimating: pt?.animating,
        ptInProgress: pt?.inProgress,
        ptOutProgress: pt?.outProgress
      };
    })()`,
    returnByValue: true
  });
  console.log('Returned Page State:', res.result.value);

  // Take screenshot
  const shot = await client.call('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync('scratch/returned_home_test.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved scratch/returned_home_test.png');

  client.close();
}

checkState().catch(console.error);
