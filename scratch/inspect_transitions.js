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

async function inspectLama() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/1FF2F2665BF710AB7DF09AE8518AD37C');
  await client.call('Runtime.enable');
  await client.call('Page.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const pt = window.$?.instances?.get('pageTransition');
      const router = window.$?.instances?.get('router');
      return {
        ptKeys: pt ? Object.keys(pt) : null,
        ptProto: pt ? Object.getOwnPropertyNames(Object.getPrototypeOf(pt)) : null,
        routerKeys: router ? Object.keys(router) : null,
        hasSwup: !!router?.swup,
        swupPlugins: router?.swup?.plugins?.map(p => p.name || p.constructor?.name),
        curtainEl: !!document.querySelector('.js-page-transition'),
        counterEl: !!document.querySelector('.js-page-transition-counter-container')
      };
    })()`,
    returnByValue: true
  });
  console.log('Lama Lama Transition Setup:', res.result.value);
  client.close();
}

inspectLama().catch(console.error);
