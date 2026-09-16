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

async function inspectLocal() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const keys = [];
      if (window.$?.instances) {
        window.$.instances.forEach((v, k) => {
          keys.push({ key: typeof k === 'string' ? k : k?.tagName + '.' + k?.className?.slice(0, 30), valType: v?.constructor?.name });
        });
      }
      return {
        hasDollar: !!window.$,
        instanceCount: window.$?.instances?.size,
        keys: keys.slice(0, 25)
      };
    })()`,
    returnByValue: true
  });
  console.log('Local instances:', res.result.value);
  client.close();
}

inspectLocal().catch(console.error);
