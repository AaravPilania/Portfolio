const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const tab = tabs.find(t => t.url.includes('localhost:3000') && t.webSocketDebuggerUrl);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let msgId = 1;
    const callbacks = {};

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        callbacks[id] = resolve;
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (e) => {
      const resp = JSON.parse(e.data);
      if (resp.id && callbacks[resp.id]) {
        callbacks[resp.id](resp.result);
        delete callbacks[resp.id];
      }
    };

    ws.onopen = async () => {
      const imgBase64 = fs.readFileSync('scratch/intro_step_3.png').toString('base64');
      const evalCode = `(async () => {
        const img = new Image();
        img.src = 'data:image/png;base64,${imgBase64}';
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        const cx = img.naturalWidth / 2;
        const cy = img.naturalHeight / 2;
        ctx.drawImage(img, cx - 150, cy - 150, 300, 300, 0, 0, 300, 300);

        // Analyze bounding box of white pixels
        const data = ctx.getImageData(0, 0, 300, 300).data;
        let minX = 300, maxX = 0, minY = 300, maxY = 0;
        for (let y = 0; y < 300; y++) {
          for (let x = 0; x < 300; x++) {
            const idx = (y * 300 + x) * 4;
            if (data[idx] > 180) { // bright pixel
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const ratio = (width / height).toFixed(3);

        return {
          minX, maxX, minY, maxY,
          width, height, ratio,
          croppedPng: canvas.toDataURL('image/png')
        };
      })()`;

      const res = await send('Runtime.evaluate', {
        expression: evalCode,
        awaitPromise: true,
        returnByValue: true
      });

      const val = res.result?.value;
      console.log('AP Bounding Box Analysis:', {
        width: val.width,
        height: val.height,
        aspectRatioWidthOverHeight: val.ratio
      });

      const base64Data = val.croppedPng.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync('scratch/ap_intro_zoomed.png', Buffer.from(base64Data, 'base64'));
      console.log('Saved scratch/ap_intro_zoomed.png');

      ws.close();
      process.exit(0);
    };
  });
});
