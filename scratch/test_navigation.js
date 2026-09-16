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
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        console.log('[BROWSER]', msg.params.type, text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
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

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function testNativeNav() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');
  await client.call('Page.enable');

  console.log('Navigating to http://localhost:3000/ ...');
  await client.call('Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(4500);

  // Take screenshot of fresh home
  const homeShot = await client.call('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync('scratch/home_fresh.png', Buffer.from(homeShot.data, 'base64'));
  console.log('Saved scratch/home_fresh.png');

  // Trigger page transition to /work/
  console.log('Clicking Work link to trigger page transition...');
  await client.call('Runtime.evaluate', {
    expression: `(() => {
      const link = document.querySelector('a[href*="/work/"]');
      if (link) link.click();
    })()`
  });

  // Sample transition at 300ms, 600ms, 1000ms
  await sleep(300);
  const shot300 = await client.call('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync('scratch/transition_300ms.png', Buffer.from(shot300.data, 'base64'));

  await sleep(400);
  const shot700 = await client.call('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync('scratch/transition_700ms.png', Buffer.from(shot700.data, 'base64'));

  await sleep(800);
  const shotWork = await client.call('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync('scratch/work_arrived.png', Buffer.from(shotWork.data, 'base64'));
  console.log('Saved scratch/work_arrived.png');

  // Now click Back
  console.log('Navigating Back...');
  await client.call('Runtime.evaluate', { expression: `window.history.back()` });

  await sleep(1500);
  const shotBack = await client.call('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync('scratch/home_after_back.png', Buffer.from(shotBack.data, 'base64'));
  console.log('Saved scratch/home_after_back.png');

  client.close();
}

testNativeNav().catch(console.error);
