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

async function checkCounterStyles() {
  const client = createCdpClient('ws://localhost:9222/devtools/page/1FF2F2665BF710AB7DF09AE8518AD37C');
  await client.call('Runtime.enable');

  const res = await client.call('Runtime.evaluate', {
    expression: `(() => {
      const container = document.querySelector('.js-page-transition-counter-container');
      const counter = document.querySelector('.js-page-transition-counter');
      const curtain = document.querySelector('.js-page-transition');

      const before = window.getComputedStyle(container, '::before');
      const after = window.getComputedStyle(container, '::after');
      const counterStyle = window.getComputedStyle(counter);
      const containerStyle = window.getComputedStyle(container);
      const curtainStyle = window.getComputedStyle(curtain);

      return {
        containerText: container.innerText,
        beforeContent: before.content,
        afterContent: after.content,
        counterFont: counterStyle.fontFamily,
        counterSize: counterStyle.fontSize,
        counterColor: counterStyle.color,
        curtainBg: curtainStyle.backgroundColor,
        curtainZIndex: curtainStyle.zIndex,
        counterZIndex: containerStyle.zIndex
      };
    })()`,
    returnByValue: true
  });
  console.log('Transition Styles on lamalama.com:', res.result.value);
  client.close();
}

checkCounterStyles().catch(console.error);
