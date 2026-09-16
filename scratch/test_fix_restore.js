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

async function testFix() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
  await client.call('Runtime.enable');
  await client.call('Page.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      // Add is-revealed to all text reveals and sticky items
      document.querySelectorAll('.ll-text-reveal').forEach(el => el.classList.add('is-revealed'));
      document.querySelectorAll('.js-header, .js-menu, .js-sticky-items, .js-sticky-bar, .js-sticky-item').forEach(el => el.classList.add('is-revealed'));
      
      // Hook hero avatar
      let hooked = false;
      if (window.__heroAvatarEngine) {
        hooked = window.__heroAvatarEngine.hook();
      }

      const h1 = document.querySelector('h1');
      return {
        hooked,
        h1Opacity: h1 ? window.getComputedStyle(h1).opacity : null,
        h1Visibility: h1 ? window.getComputedStyle(h1).visibility : null,
        h1Text: h1 ? h1.innerText : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Fix test result:', res.result.value);

  // Capture screenshot to see if it restored
  const shot = await client.call('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync('scratch/restored_visual_check.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved scratch/restored_visual_check.png');

  client.close();
}

testFix().catch(console.error);
