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
        console.log('[BROWSER]', msg.params.type, text);
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

async function checkEvents() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');

  await client.call('Runtime.evaluate', {
    expression: `(() => {
      // 1. Swup hooks
      const router = window.$?.instances?.get('router');
      if (router?.swup?.hooks) {
        router.swup.hooks.on('visit:start', () => console.log('HOOK: visit:start'));
        router.swup.hooks.on('content:replace', () => console.log('HOOK: content:replace'));
        router.swup.hooks.on('page:view', () => console.log('HOOK: page:view'));
      }
      // 2. eventManager
      const em = window.$?.instances?.get('eventManager');
      if (em) {
        em.subscribe('handleRouteChangeComplete', () => console.log('EM: handleRouteChangeComplete'));
      }
      console.log('Hooks installed successfully');
    })()`
  });

  console.log('Navigating to / ...');
  await client.call('Runtime.evaluate', {
    expression: `(() => {
      const router = window.$?.instances?.get('router');
      if (router?.swup) {
        router.swup.navigate('/');
      } else {
        window.location.href = '/';
      }
    })()`
  });

  await sleep(3000);
  client.close();
}

checkEvents().catch(console.error);
