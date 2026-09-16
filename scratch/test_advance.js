const WebSocket = globalThis.WebSocket;
const ws = new WebSocket('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const ticker = window.$?.instances?.get('ticker');
        const pt = window.$?.instances?.get('pageTransition');
        // Let's check pt.tl.parent
        const tl = pt?.tl;
        const parent = tl?.parent;
        
        // What happens if we manually call parent.totalTime(parent.totalTime() + 0.1)?
        const t0 = parent ? parent.totalTime() : -1;
        if (parent) {
          parent.totalTime(t0 + 0.5);
        }
        const t1 = parent ? parent.totalTime() : -1;

        return {
          t0,
          t1,
          tlTime: tl?.time(),
          inProgress: pt?.inProgress
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
