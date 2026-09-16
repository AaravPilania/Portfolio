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

  await client.call('Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(2000);

  // Monkey-patch transitionIn and transitionOut to log every single step!
  const hookRes = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const pt = window.$?.instances?.get('pageTransition');
      if (!pt) return 'no pageTransition';

      const origOut = pt.transitionOut.bind(pt);
      pt.transitionOut = function() {
        console.log('[PT] transitionOut called, animating:', pt.animating);
        return origOut();
      };

      const origIn = pt.transitionIn.bind(pt);
      pt.transitionIn = async function() {
        console.log('[PT] transitionIn started');
        try {
          const res = await origIn();
          console.log('[PT] transitionIn finished successfully');
          return res;
        } catch(err) {
          console.error('[PT] transitionIn ERROR:', err);
          throw err;
        }
      };

      return 'hooked';
    })()`,
    returnByValue: true
  });
  console.log('Hook result:', hookRes.result.value);

  console.log('Clicking Work button...');
  await client.call('Runtime.evaluate', {
    expression: `document.querySelector('a.js-sticky-button[href*="/work/"]').click()`
  });

  await sleep(4000);

  client.close();
}

run().catch(console.error);
