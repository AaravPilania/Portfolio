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

async function inspect() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/1FF2F2665BF710AB7DF09AE8518AD37C');
  await client.call('Runtime.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      // Find app instance
      let app = null;
      for (const k of Object.keys(window)) {
        if (window[k] && window[k].instances instanceof Map) {
          app = k;
          break;
        }
      }
      const curtain = document.querySelector('.js-page-transition');
      const counterContainer = document.querySelector('.js-page-transition-counter-container');
      const counter = document.querySelector('.js-page-transition-counter');
      return {
        appVar: app,
        hasDollar: !!window.$,
        curtainClass: curtain?.className,
        counterContainerClass: counterContainer?.className,
        counterHTML: counter?.outerHTML
      };
    })()`,
    returnByValue: true
  });
  console.log('Result:', res.result.value);
  client.close();
}

inspect().catch(console.error);
