const WebSocket = globalThis.WebSocket;
const fs = require('fs');

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

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function captureTransitionCounter() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');
  await client.call('Page.enable');

  console.log('Navigating to http://localhost:3000/ ...');
  await client.call('Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(4000);

  console.log('Clicking Work link...');
  await client.call('Runtime.evaluate', {
    expression: `(() => {
      const link = document.querySelector('a[href*="/work/"]');
      if (link) link.click();
    })()`
  });

  // Sample at 900ms and 1100ms
  await sleep(950);
  const shot950 = await client.call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/transition_counter_950ms.png', Buffer.from(shot950.data, 'base64'));

  const st = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const c = document.querySelector('.js-page-transition-counter');
      const cc = document.querySelector('.js-page-transition-counter-container');
      return {
        text: c ? c.textContent : null,
        opacity: cc ? window.getComputedStyle(cc).opacity : null,
        display: cc ? window.getComputedStyle(cc).display : null,
        color: cc ? window.getComputedStyle(cc).color : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Counter at 950ms:', st.result.value);

  await sleep(200);
  const shot1150 = await client.call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/transition_counter_1150ms.png', Buffer.from(shot1150.data, 'base64'));

  client.close();
}

captureTransitionCounter().catch(console.error);
