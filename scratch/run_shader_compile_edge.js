const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const appJs = fs.readFileSync('public/assets/app-zxjZQ-wy.js', 'utf8');
const backdropJs = fs.readFileSync('public/assets/backdrop_theme-MLvCd1KU.js', 'utf8');
const segmentJs = fs.readFileSync('public/assets/segment-DtAQyFoF.js', 'utf8');

function getShaders(src, filename) {
  const list = [];
  let idx = 0;
  while ((idx = src.indexOf('#version 300 es', idx)) !== -1) {
    const startBacktick = src.lastIndexOf('`', idx);
    const endBacktick = src.indexOf('`', idx);
    const shader = src.substring(startBacktick + 1, endBacktick);
    const varName = src.substring(Math.max(0, startBacktick - 20), startBacktick).trim();
    list.push({ filename, varName, shader });
    idx = endBacktick + 1;
  }
  return list;
}

const allShaders = [
  ...getShaders(appJs, 'app'),
  ...getShaders(backdropJs, 'backdrop'),
  ...getShaders(segmentJs, 'segment')
];

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9225;
  const edge = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--no-sandbox',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  http.get(`http://localhost:${port}/json`, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      const list = JSON.parse(raw);
      const tab = list.find(t => t.type === 'page');
      if (!tab) {
        edge.kill();
        console.error('No tab found in Edge');
        process.exit(1);
      }
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      ws.onopen = () => {
        const code = `
          (() => {
            const shaders = ${JSON.stringify(allShaders)};
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2');
            if (!gl) return { error: 'No webgl2 context' };

            const results = [];
            for (const s of shaders) {
              const isVertex = s.shader.includes('gl_Position');
              const sh = gl.createShader(isVertex ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
              gl.shaderSource(sh, s.shader);
              gl.compileShader(sh);
              const success = gl.getShaderParameter(sh, gl.COMPILE_STATUS);
              if (!success) {
                const log = gl.getShaderInfoLog(sh);
                results.push({ filename: s.filename, varName: s.varName, error: log });
              } else {
                results.push({ filename: s.filename, varName: s.varName, ok: true });
              }
            }
            return results;
          })()
        `;
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression: code, returnByValue: true }
        }));
      };

      ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.id === 1) {
          const res = msg.result?.result?.value;
          console.log('Shader compilation results:\n', JSON.stringify(res, null, 2));
          ws.close();
          edge.kill();
          process.exit(0);
        }
      };
    });
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
