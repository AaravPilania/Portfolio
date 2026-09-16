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

async function run() {
  const clientLama = createCdpClient('ws://localhost:9222/devtools/page/1FF2F2665BF710AB7DF09AE8518AD37C');
  const res = await clientLama.call('Runtime.evaluate', {
    expression: `(() => {
      const router = window.$?.instances?.get('router');
      const swup = router?.swup;
      return {
        options: swup ? {
          animateHistoryBrowsing: swup.options?.animateHistoryBrowsing,
          cache: swup.options?.cache,
          linkSelector: swup.options?.linkSelector,
          containers: swup.options?.containers
        } : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Lama swup options:', JSON.stringify(res.result.value, null, 2));
  clientLama.close();
}

run().catch(console.error);
