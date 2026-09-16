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
        const parent = tl?.parent;
        // Let's see parent._time, parent._totalTime
        return {
          _time: parent?._time,
          _totalTime: parent?._totalTime,
          _dur: parent?._dur,
          _tDur: parent?._tDur,
          tl_start: tl?._start,
          tl_time: tl?._time
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
