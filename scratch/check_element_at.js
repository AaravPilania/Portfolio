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

async function checkEl() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('h1');
      const r = h1.getBoundingClientRect();
      const elAtCenter = document.elementFromPoint(r.left + 50, r.top + 20);
      
      // Also check all canvas elements
      const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
        id: c.id,
        cls: c.className,
        style: c.style.cssText,
        zIndex: window.getComputedStyle(c).zIndex,
        rect: { top: c.offsetTop, height: c.offsetHeight, width: c.offsetWidth }
      }));

      // Check section position & scroll position
      return {
        scrollY: window.scrollY,
        h1Pos: { left: r.left, top: r.top, width: r.width, height: r.height },
        elAtH1: elAtCenter ? { tag: elAtCenter.tagName, cls: elAtCenter.className, id: elAtCenter.id } : null,
        canvases
      };
    })()`,
    returnByValue: true
  });
  console.log('Element at H1:', JSON.stringify(res.result.value, null, 2));
  client.close();
}

checkEl().catch(console.error);
