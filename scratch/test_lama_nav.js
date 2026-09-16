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

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function testLamaNav() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/1FF2F2665BF710AB7DF09AE8518AD37C');
  await client.call('Runtime.enable');
  await client.call('Page.enable');

  console.log('Current URL on Lama:', (await client.call('Runtime.evaluate', { expression: 'window.location.href' })).result.value);

  // Install a mutation & style observer to spy on transition
  await client.call('Runtime.evaluate', {
    expression: `(() => {
      window.__transitionLog = [];
      const curtain = document.querySelector('.js-page-transition');
      const counterContainer = document.querySelector('.js-page-transition-counter-container');
      const counter = document.querySelector('.js-page-transition-counter');

      const start = performance.now();
      function record(label) {
        window.__transitionLog.push({
          time: Math.round(performance.now() - start),
          label,
          curtainDisplay: curtain ? curtain.style.display : null,
          curtainOpacity: curtain ? window.getComputedStyle(curtain).opacity : null,
          curtainBg: curtain ? window.getComputedStyle(curtain).backgroundColor : null,
          counterContainerOpacity: counterContainer ? window.getComputedStyle(counterContainer).opacity : null,
          counterText: counter ? counter.textContent : null,
          url: window.location.pathname
        });
      }

      const poll = setInterval(() => {
        record('tick');
        if (performance.now() - start > 4000) clearInterval(poll);
      }, 50);

      // Click Work
      const workLink = document.querySelector('a[href*="/work/"]');
      if (workLink) workLink.click();
    })()`
  });

  await sleep(4200);

  const logs = await client.call('Runtime.evaluate', {
    expression: 'window.__transitionLog',
    returnByValue: true
  });
  console.log('Transition log sample (every 200ms):');
  const items = logs.result.value || [];
  for (let i = 0; i < items.length; i += 4) {
    console.log(items[i]);
  }

  client.close();
}

testLamaNav().catch(console.error);
