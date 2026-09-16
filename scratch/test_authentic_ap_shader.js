const http = require('http');
const fs = require('fs');

http.get('http://localhost:9222/json', (res) => {
  let raw = '';
  res.on('data', c => raw += c);
  res.on('end', () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes('localhost:3000'));
    if (!tab) return console.log('No tab');

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const fsCode = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 FragColor;

// Authentic AP Logo geometry (Image 2)
// Normalized coordinates in [0, 1] x [0, 1]
// With y = 0 at bottom, y = 1 at top:
float isInsideAP(vec2 p) {
    // Check if within [0, 1] x [0, 1]
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return 0.0;

    // We can test the 9 rectangles that form the AP glyph:
    // Left leg of A: x in [0.0, 0.124], y in [0.0, 0.853]
    if (p.x >= 0.0 && p.x <= 0.124 && p.y >= 0.0 && p.y <= 0.853) return 1.0;

    // Top roof of A: x in [0.124, 0.439], y in [0.853, 1.0]
    if (p.x >= 0.124 && p.x <= 0.439 && p.y >= 0.853 && p.y <= 1.0) return 1.0;

    // Crossbar of A: x in [0.124, 0.439], y in [0.442, 0.606]
    if (p.x >= 0.124 && p.x <= 0.439 && p.y >= 0.442 && p.y <= 0.606) return 1.0;

    // Middle stem (shared between A and P): x in [0.439, 0.583], y in [0.0, 0.853]
    if (p.x >= 0.439 && p.x <= 0.583 && p.y >= 0.0 && p.y <= 0.853) return 1.0;

    // Top roof of P: x in [0.511, 0.886], y in [0.853, 1.0]
    if (p.x >= 0.511 && p.x <= 0.886 && p.y >= 0.853 && p.y <= 1.0) return 1.0;

    // Top chamfer of P: x in [0.825, 1.0], y in [0.778, 0.853]
    if (p.x >= 0.825 && p.x <= 1.0 && p.y >= 0.778 && p.y <= 0.853) return 1.0;

    // Right wall of P: x in [0.886, 1.0], y in [0.546, 0.778]
    if (p.x >= 0.886 && p.x <= 1.0 && p.y >= 0.546 && p.y <= 0.778) return 1.0;

    // Bottom chamfer of P: x in [0.825, 1.0], y in [0.471, 0.546]
    if (p.x >= 0.825 && p.x <= 1.0 && p.y >= 0.471 && p.y <= 0.546) return 1.0;

    // Bottom bar of P: x in [0.439, 0.879], y in [0.316, 0.471]
    if (p.x >= 0.439 && p.x <= 0.879 && p.y >= 0.316 && p.y <= 0.471) return 1.0;

    return 0.0;
}

void main() {
    // Add 10% padding so we can see the full logo with borders clearly
    vec2 p = (v_uv - 0.1) / 0.8;
    float c = isInsideAP(p);
    FragColor = vec4(vec3(c), 1.0);
}
`;

      const expr = `(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const gl = canvas.getContext("webgl2");
        if (!gl) return "no webgl2";

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, "#version 300 es\\nin vec2 position; out vec2 v_uv; void main() { v_uv = (position + 1.0) / 2.0; gl_Position = vec4(position, 0.0, 1.0); }");
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, ` + JSON.stringify(fsCode) + `);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
          return "FS Error: " + gl.getShaderInfoLog(fs);
        }

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        gl.useProgram(prog);

        const posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -1, -1,  1, -1, -1,  1,
          -1,  1,  1, -1,  1,  1
        ]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(prog, "position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.viewport(0, 0, 400, 400);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        return canvas.toDataURL("image/png");
      })()`;

      ws.send(JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: { expression: expr, returnByValue: true }
      }));
    };

    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.id === 1) {
        const val = msg.result?.result?.value;
        if (val && val.startsWith("data:image/png;base64,")) {
          fs.writeFileSync("scratch/test_authentic_ap_upright.png", Buffer.from(val.replace(/^data:image\/png;base64,/, ""), "base64"));
          console.log("SUCCESS: Saved scratch/test_authentic_ap_upright.png");
        } else {
          console.log("Error / Result:", val);
        }
        ws.close();
        process.exit(0);
      }
    };
  });
});
