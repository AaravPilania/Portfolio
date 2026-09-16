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

async function checkNow() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('h1');
      return {
        h1Opacity: h1 ? window.getComputedStyle(h1).opacity : null,
        h1Visibility: h1 ? window.getComputedStyle(h1).visibility : null
      };
    })()`,
    returnByValue: true
  });
  console.log('H1 computed style now:', res.result.value);
  client.close();
}

checkNow().catch(console.error);
