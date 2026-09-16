const WebSocket = globalThis.WebSocket;
const ws = new WebSocket('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `document.querySelector('h1').outerHTML`,
      returnByValue: true
    }
  }));
};
ws.onmessage = (e) => {
  console.log('h1 outerHTML:', JSON.parse(e.data).result.result.value);
  ws.close();
};
