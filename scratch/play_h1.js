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
            if (k === h1 || k?.contains(h1) || h1?.contains(k)) h1Instance = v;
          });
        }
        if (h1Instance) {
          h1Instance.tl.play();
          return {
            played: true,
            h1Opacity: window.getComputedStyle(h1).opacity,
            h1Text: h1.innerText
          };
        }
        return { played: false };
      })()`,
      returnByValue: true
    }
  }));
};
ws.onmessage = (e) => {
  console.log('Result:', JSON.parse(e.data).result.result.value);
  ws.close();
};
