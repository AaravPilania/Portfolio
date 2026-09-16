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

async function checkH1() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('h1');
      return {
        outerHTML: h1 ? h1.outerHTML.slice(0, 300) : null,
        className: h1 ? h1.className : null,
        style: h1 ? h1.style.cssText : null,
        dataset: h1 ? Object.assign({}, h1.dataset) : null,
        matchedCSS: h1 ? Array.from(document.styleSheets).map(s => {
          try {
            return Array.from(s.cssRules).filter(r => r.selectorText && h1.matches(r.selectorText)).map(r => r.cssText);
          } catch(e) { return []; }
        }).flat() : []
      };
    })()`,
    returnByValue: true
  });
  console.log('H1 info:', JSON.stringify(res.result.value, null, 2));
  client.close();
}

checkH1().catch(console.error);
