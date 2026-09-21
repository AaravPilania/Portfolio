const WebSocket = globalThis.WebSocket;
async function test() {
  const tabsRes = await fetch('http://localhost:9222/json');
  const tabs = await tabsRes.json();
  const pageTab = tabs.find(t => t.url.includes(':3010') || t.title.includes('Pacôme'));
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  
  const consoleMessages = [];
  ws.addEventListener('message', (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        consoleMessages.push({ type: msg.params.type, args: msg.params.args.map(a => a.value || a.description) });
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleMessages.push({ type: 'error', error: msg.params.exceptionDetails.text });
      }
    } catch(e) {}
  });

  function send(method, params = {}) {
    return new Promise(resolve => {
      const id = Math.floor(Math.random()*100000);
      const listener = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === id) {
          ws.removeEventListener('message', listener);
          resolve(d.result);
        }
      };
      ws.addEventListener('message', listener);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Page.reload', { ignoreCache: true });

  await new Promise(r => setTimeout(r, 4500));
  console.log('Console messages after reload:', consoleMessages);
  ws.close();
}
test().catch(console.error);
