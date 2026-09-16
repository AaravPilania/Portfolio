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
        return {
          tlExists: !!tl,
          tlDuration: tl?.duration(),
          tlTime: tl?.time(),
          tlTotalTime: tl?.totalTime(),
          tlPaused: tl?.paused(),
          tlRawTime: tl?.rawTime(),
          tlStartTime: tl?.startTime(),
          tlParentTime: tl?.parent?.time(),
          tlParentTotalTime: tl?.parent?.totalTime(),
          tlParentPaused: tl?.parent?.paused()
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
