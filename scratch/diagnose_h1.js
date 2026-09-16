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
      const pt = window.$?.instances?.get('pageTransition');
      const tl = pt?.tl;
      const h1 = document.querySelector('h1');
      return {
        ptTl: tl ? {
          duration: tl.duration(),
          time: tl.time(),
          progress: tl.progress(),
          paused: tl.paused(),
          isActive: tl.isActive()
        } : null,
        h1Info: h1 ? {
          text: h1.innerText,
          style: h1.getAttribute('style'),
          className: h1.className,
          opacity: window.getComputedStyle(h1).opacity,
          visibility: window.getComputedStyle(h1).visibility,
          parentDisplay: window.getComputedStyle(h1.parentElement).display,
          parentOpacity: window.getComputedStyle(h1.parentElement).opacity
        } : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Diagnosis:', JSON.stringify(res.result.value, null, 2));
  client.close();
}

run().catch(console.error);
