const WebSocket = globalThis.WebSocket;
const ws = new WebSocket('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const pt = window.$?.instances?.get('pageTransition');
        const tl = pt?.tl;
        if (!tl) return 'no tl';
        const parent = tl.parent;
        // Let's test calling parent.render or updateRoot or parent.time
        console.log('parent constructor name:', parent.constructor.name);
        console.log('parent._dp:', parent._dp);
        // Is there a globalTimeline?
        const gt = tl.globalTimeline || parent;
        return {
          gtTime: gt.time(),
          gtRawTime: gt.rawTime ? gt.rawTime() : null
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
