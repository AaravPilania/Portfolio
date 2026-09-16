const WebSocket = globalThis.WebSocket;
const ws = new WebSocket('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const pt = window.$?.instances?.get('pageTransition');
        // Let's inspect pt.tl
        const tl = pt?.tl;
        if (!tl) return 'no tl';
        const parent = tl.parent;
        return {
          tl: {
            duration: tl.duration(),
            time: tl.time(),
            paused: tl.paused(),
            isActive: tl.isActive()
          },
          parent: parent ? {
            time: parent.time(),
            totalTime: parent.totalTime(),
            paused: parent.paused(),
            autoRemoveChildren: parent.autoRemoveChildren
          } : null
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
