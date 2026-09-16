const WebSocket = globalThis.WebSocket;
const ws = new WebSocket('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const h1 = document.querySelector('h1');
        const rect = h1.getBoundingClientRect();
        return {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          scrollY: window.scrollY,
          color: window.getComputedStyle(h1).color,
          display: window.getComputedStyle(h1).display,
          parentSection: h1.closest('section')?.className,
          parentRect: h1.closest('section')?.getBoundingClientRect()
        };
      })()`,
      returnByValue: true
    }
  }));
};
ws.onmessage = (e) => {
  console.log('Result:', JSON.parse(e.data).result.result.value);
  ws.close();
};
