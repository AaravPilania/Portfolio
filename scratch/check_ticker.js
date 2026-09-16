const WebSocket = globalThis.WebSocket;
const ws = new WebSocket('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const ticker = window.$?.instances?.get('ticker');
        const scroller = window.$?.instances?.get('scroller');
        const canvas = window.$?.instances?.get('canvas');
        return {
          hasTicker: !!ticker,
          tickerTime: ticker?.currentTime,
          tickerDelta: ticker?.deltaTime,
          scrollerPaused: scroller?.paused,
          canvasPaused: canvas?.paused
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
