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
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const mainPage = document.querySelector('main#page');
      return {
        mainPageHTML: mainPage?.outerHTML?.slice(0, 400),
        mainPageStyle: mainPage?.getAttribute('style'),
        mainPageComputedOpacity: mainPage ? window.getComputedStyle(mainPage).opacity : null,
        sections: Array.from(document.querySelectorAll('main#page section')).map(s => ({
          component: s.getAttribute('data-component'),
          classes: s.className,
          style: s.getAttribute('style'),
          opacity: window.getComputedStyle(s).opacity
        }))
      };
    })()`,
    returnByValue: true
  });
  console.log('Main page info:', JSON.stringify(res.result.value, null, 2));
  client.close();
}

run().catch(console.error);
