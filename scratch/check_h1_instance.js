const WebSocket = globalThis.WebSocket;
const ws = new WebSocket('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const page = window.$?.instances?.get('page');
        const h1 = document.querySelector('h1');
        let h1Instance = null;
        if (page?.instances) {
          page.instances.forEach((v, k) => {
            if (k === h1 || k?.contains(h1) || h1?.contains(k)) {
              h1Instance = v;
            }
          });
        }
        return {
          h1InPage: !!h1Instance,
          h1HasEnter: h1Instance?.hasEnter,
          h1Completed: h1Instance?.completed,
          h1Hidden: h1Instance?.hidden,
          h1TlExists: !!h1Instance?.tl,
          h1TlProgress: h1Instance?.tl?.progress(),
          h1TlPaused: h1Instance?.tl?.paused(),
          h1SplitTextLines: h1Instance?.splitText?.lines?.length
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
