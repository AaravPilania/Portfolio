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
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        console.log('[BROWSER CONSOLE]', msg.params.type, text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
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

async function run() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');
  await client.call('Page.enable');

  console.log('Navigating to http://localhost:3000/ ...');
  await client.call('Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(2000);

  // Install a hook on Swup and EventManager to log all events
  await client.call('Runtime.evaluate', {
    expression: `(() => {
      window.__logs = [];
      const log = (msg) => { console.log('[TRACE]', msg); window.__logs.push(msg); };

      const router = window.$?.instances?.get('router');
      if (router?.swup) {
        log('Hooking Swup events');
        router.swup.hooks.before('visit:start', () => log('swup: visit:start'));
        router.swup.hooks.on('link:click', (e) => log('swup: link:click to ' + e.to.url));
        router.swup.hooks.on('transition:start', () => log('swup: transition:start'));
        router.swup.hooks.on('content:replace', () => log('swup: content:replace'));
        router.swup.hooks.on('visit:end', () => log('swup: visit:end'));
        router.swup.hooks.on('page:view', () => log('swup: page:view'));
      }

      window.addEventListener('popstate', () => log('window: popstate'));
    })()`
  });

  console.log('Clicking Work button...');
  await client.call('Runtime.evaluate', {
    expression: `document.querySelector('a.js-sticky-button[href*="/work/"]').click()`
  });
  await sleep(3000);

  console.log('State at /work/:');
  const workState = await client.call('Runtime.evaluate', {
    expression: `({ url: window.location.href, opacity: window.getComputedStyle(document.querySelector('main#page')).opacity })`,
    returnByValue: true
  });
  console.log('Work state:', workState.result.value);

  console.log('Navigating back via window.history.back()...');
  await client.call('Runtime.evaluate', { expression: `window.history.back()` });
  await sleep(1000);

  const backState1 = await client.call('Runtime.evaluate', {
    expression: `({ url: window.location.href, opacity: window.getComputedStyle(document.querySelector('main#page')).opacity })`,
    returnByValue: true
  });
  console.log('State at 1s after back:', backState1.result.value);

  await sleep(3000);
  const backState4 = await client.call('Runtime.evaluate', {
    expression: `({
      url: window.location.href,
      mainOpacity: window.getComputedStyle(document.querySelector('main#page')).opacity,
      mainStyle: document.querySelector('main#page').style.cssText,
      pageTransitionDisplay: document.querySelector('.js-page-transition').style.display,
      pageTransitionClasses: document.querySelector('.js-page-transition').className,
      counterClasses: document.querySelector('.js-page-transition-counter-container').className,
      counterText: document.querySelector('.js-page-transition-counter').textContent,
      pointerEvents: document.body.style.pointerEvents,
      logs: window.__logs
    })`,
    returnByValue: true
  });
  console.log('State at 4s after back:', JSON.stringify(backState4.result.value, null, 2));

  client.close();
}

run().catch(console.error);
