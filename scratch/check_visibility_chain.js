const WebSocket = globalThis.WebSocket;
const ws = new WebSocket('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const h1 = document.querySelector('h1');
        let cur = h1;
        const chain = [];
        while (cur && cur !== document.body) {
          chain.push({
            tag: cur.tagName,
            class: cur.className,
            visibility: window.getComputedStyle(cur).visibility,
            inlineVisibility: cur.style.visibility
          });
          cur = cur.parentElement;
        }
        return chain;
      })()`,
      returnByValue: true
    }
  }));
};
ws.onmessage = (e) => {
  console.log('Result:', JSON.parse(e.data).result.result.value);
  ws.close();
};
