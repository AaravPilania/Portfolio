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

async function checkH1Geom() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return 'No H1';
      const rect = h1.getBoundingClientRect();
      const style = window.getComputedStyle(h1);
      const parent = h1.parentElement;
      const pRect = parent ? parent.getBoundingClientRect() : null;
      const pStyle = parent ? window.getComputedStyle(parent) : null;
      
      // Check children of h1
      const children = Array.from(h1.children).map(c => ({
        tag: c.tagName,
        cls: c.className,
        rect: c.getBoundingClientRect(),
        opacity: window.getComputedStyle(c).opacity,
        visibility: window.getComputedStyle(c).visibility,
        transform: window.getComputedStyle(c).transform,
        color: window.getComputedStyle(c).color,
        text: c.innerText
      }));

      return {
        h1Rect: rect,
        h1Color: style.color,
        h1Opacity: style.opacity,
        h1Visibility: style.visibility,
        h1Transform: style.transform,
        h1ZIndex: style.zIndex,
        parentRect: pRect,
        parentOpacity: pStyle?.opacity,
        parentVisibility: pStyle?.visibility,
        children
      };
    })()`,
    returnByValue: true
  });
  console.log('H1 Geometry & Style:', JSON.stringify(res.result.value, null, 2));
  client.close();
}

checkH1Geom().catch(console.error);
