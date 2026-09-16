const WebSocket = globalThis.WebSocket;
const ws = new WebSocket('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const ticker = window.$?.instances?.get('ticker');
        // Let's call ticker.coreTick(1000) inside try-catch to see what happens!
        try {
          ticker.coreTick(performance.now());
          return 'coreTick succeeded';
        } catch(err) {
          return { error: err.message, stack: err.stack };
        }
      })()`,
      returnByValue: true
    }
  }));
};
ws.onmessage = (e) => {
  console.log('Result:', JSON.parse(e.data).result.result.value);
  ws.close();
};
