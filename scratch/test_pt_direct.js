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

  await client.call('Runtime.evaluate', {
    expression: `(() => {
      const pt = window.$?.instances?.get('pageTransition');
      console.log('Testing pt.transitionOut directly...');
      pt.transitionOut();
      console.log('transitionOut started, promise exists:', !!pt.promise);
      pt.promise.then(() => {
        console.log('pt.promise RESOLVED!');
      }).catch(err => {
        console.error('pt.promise REJECTED:', err);
      });
    })()`
  });

  await sleep(1500);

  const check = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const pt = window.$?.instances?.get('pageTransition');
      return {
        inProgress: pt.inProgress,
        tlProgress: pt.tl?.progress(),
        tlActive: pt.tl?.isActive()
      };
    })()`,
    returnByValue: true
  });
  console.log('Check after 1.5s:', check.result.value);

  client.close();
}

run().catch(console.error);
