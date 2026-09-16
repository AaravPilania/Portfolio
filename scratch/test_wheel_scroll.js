const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const tabs = JSON.parse(d);
    const tabLocal = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    if (!tabLocal) return console.log('missing tab');

    const ws = new WebSocket(tabLocal.webSocketDebuggerUrl);
    ws.onopen = () => {
      // First ensure scrollTop is 0
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const scroller = document.querySelector('.ll-scroller');
            scroller.scrollTop = 0;
            return scroller.scrollTop;
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        console.log('Reset scrollTop to 0');
        // Dispatch Input.dispatchMouseEvent with mouseWheel
        ws.send(JSON.stringify({
          id: 2,
          method: 'Input.dispatchMouseEvent',
          params: {
            type: 'mouseWheel',
            x: 500,
            y: 500,
            deltaX: 0,
            deltaY: 300
          }
        }));
      } else if (msg.id === 2) {
        console.log('Dispatched mouseWheel event. Checking scrollTop after 200ms...');
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const scroller = document.querySelector('.ll-scroller');
                return {
                  scrollTop: scroller.scrollTop,
                  windowScrollY: window.scrollY
                };
              })()`,
              returnByValue: true
            }
          }));
        }, 300);
      } else if (msg.id === 3) {
        console.log('Scroll result from wheel event:', msg.result?.result?.value);
        ws.close();
        process.exit(0);
      }
    };
  });
});
