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

async function checkLamaCounter() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/1FF2F2665BF710AB7DF09AE8518AD37C');
  await client.call('Runtime.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const c = document.querySelector('.js-page-transition-counter-container');
      const inner = c ? c.firstElementChild : null;
      return {
        containerHTML: c?.outerHTML,
        containerStyle: c ? {
          fontSize: window.getComputedStyle(c).fontSize,
          fontFamily: window.getComputedStyle(c).fontFamily,
          letterSpacing: window.getComputedStyle(c).letterSpacing,
          color: window.getComputedStyle(c).color,
          display: window.getComputedStyle(c).display,
          alignItems: window.getComputedStyle(c).alignItems,
          justifyContent: window.getComputedStyle(c).justifyContent
        } : null,
        innerStyle: inner ? {
          fontSize: window.getComputedStyle(inner).fontSize,
          fontFamily: window.getComputedStyle(inner).fontFamily,
          color: window.getComputedStyle(inner).color
        } : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Lama Lama Counter Container:', JSON.stringify(res.result.value, null, 2));
  client.close();
}

checkLamaCounter().catch(console.error);
