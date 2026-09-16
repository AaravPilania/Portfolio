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

async function checkUpperCanvas() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const uc = document.querySelector('.js-upper-canvas');
      const pt = window.$?.instances?.get('pageTransition');
      
      // If we hide uc temporarily
      const wasHidden = uc ? uc.style.display : '';
      return {
        ucFound: !!uc,
        ucWidth: uc ? uc.width : 0,
        ucHeight: uc ? uc.height : 0,
        ucDisplay: uc ? uc.style.display : null,
        ucOpacity: uc ? window.getComputedStyle(uc).opacity : null,
        ptAnimating: pt?.animating,
        ptInProgress: pt?.inProgress,
        ptOutProgress: pt?.outProgress
      };
    })()`,
    returnByValue: true
  });
  console.log('Upper Canvas:', res.result.value);

  // Test hiding upperCanvas and taking a screenshot
  await client.call('Runtime.evaluate', {
    expression: `(() => {
      const uc = document.querySelector('.js-upper-canvas');
      if (uc) uc.style.display = 'none';
    })()`
  });
  const shotWithoutUC = await client.call('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync('scratch/check_candA.png', Buffer.from(shotWithoutUC.data, 'base64'));

  // Restore upperCanvas
  await client.call('Runtime.evaluate', {
    expression: `(() => {
      const uc = document.querySelector('.js-upper-canvas');
      if (uc) uc.style.display = '';
    })()`
  });

  client.close();
}

checkUpperCanvas().catch(console.error);
