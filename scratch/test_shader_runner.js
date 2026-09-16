
const http = require("http");
const fs = require("fs");

http.get("http://localhost:9222/json", res => {
  let raw = "";
  res.on("data", c => raw += c);
  res.on("end", () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes("localhost:3000") && !t.url.includes("coded-avatar"));
    if (!tab) {
      console.log("No tab found on port 9222");
      return;
    }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      const fsCode = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 FragColor;

float checkEqual(float first, float second) {
    float difference = abs(first - second);
    float inverted_number = ceil(1.0 * difference / 20.0);
    return (1.0 - inverted_number);
}

float drawAPLogo(vec2 rect, float opacity, float full, float inverted, float yOffset) {
    float x = clamp(floor(mod(rect.x, 1.0) * 4.0), 0.0, 3.0);
    float y = clamp(floor(mod(rect.y, 1.0) * 4.0), 0.0, 3.0);

    float divider = (12.0 + 4.0 * full);
    float progress = 1.0 / divider;
    float inverted_offset = 16.0 * inverted;
    float offset = 0.0;

    float output_opacity = 0.0;

    float block_1 = step(1.0 - opacity, progress * (abs(inverted_offset - 0.0) + offset));
    float block_2 = step(1.0 - opacity, progress * (abs(inverted_offset - 1.0) + offset));
    float block_3 = step(1.0 - opacity, progress * (abs(inverted_offset - 2.0) + offset));
    float block_4 = step(1.0 - opacity, progress * (abs(inverted_offset - 3.0) + offset));
    float block_5 = step(1.0 - opacity, progress * (abs(inverted_offset - 4.0) + offset));
    float block_6 = step(1.0 - opacity, progress * (abs(inverted_offset - 5.0) + offset));
    float block_7 = step(1.0 - opacity, progress * (abs(inverted_offset - 6.0) + offset));
    float block_8 = step(1.0 - opacity, progress * (abs(inverted_offset - 7.0) + offset));
    float block_9 = step(1.0 - opacity, progress * (abs(inverted_offset - 8.0) + offset));
    float block_10 = step(1.0 - opacity, progress * (abs(inverted_offset - 9.0) + offset));
    float block_11 = step(1.0 - opacity, progress * (abs(inverted_offset - 10.0) + offset));
    float block_12 = step(1.0 - opacity, progress * (abs(inverted_offset - 11.0) + offset));

    float block_13 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 12.0) + offset));
    float block_14 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 13.0) + offset));
    float block_15 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 14.0) + offset));
    float block_16 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 15.0) + offset));

    output_opacity += block_1 * checkEqual(2.0, x) * checkEqual(3.0, y);
    output_opacity += block_2 * checkEqual(2.0, x) * checkEqual(2.0, y);
    output_opacity += block_3 * checkEqual(2.0, x) * checkEqual(1.0, y);
    output_opacity += block_4 * checkEqual(2.0, x) * checkEqual(0.0, y);
    output_opacity += block_5 * checkEqual(0.0, x) * checkEqual(2.0, y);
    output_opacity += block_6 * checkEqual(0.0, x) * checkEqual(1.0, y);
    output_opacity += block_7 * checkEqual(0.0, x) * checkEqual(0.0, y);
    output_opacity += block_8 * checkEqual(1.0, x) * checkEqual(3.0, y);
    output_opacity += block_9 * checkEqual(1.0, x) * checkEqual(1.0, y);
    output_opacity += block_10 * checkEqual(3.0, x) * checkEqual(3.0, y);
    output_opacity += block_11 * checkEqual(3.0, x) * checkEqual(2.0, y);
    output_opacity += block_12 * checkEqual(3.0, x) * checkEqual(1.0, y);

    output_opacity += block_13 * checkEqual(0.0, x) * checkEqual(3.0, y);
    output_opacity += block_14 * checkEqual(1.0, x) * checkEqual(2.0, y);
    output_opacity += block_15 * checkEqual(1.0, x) * checkEqual(0.0, y);
    output_opacity += block_16 * checkEqual(3.0, x) * checkEqual(0.0, y);

    return min(1.0, output_opacity);
}

void main() {
    vec2 uv = v_uv;
    float op = drawAPLogo(uv, 1.0, 0.0, 0.0, 0.0);
    FragColor = vec4(vec3(op), 1.0);
}
`;

      const expr = `(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 200;
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

        gl.viewport(0, 0, 200, 200);
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
          fs.writeFileSync("scratch/webgl_ap_rendered_exact.png", Buffer.from(val.replace(/^data:image\/png;base64,/, ""), "base64"));
          console.log("Successfully rendered shader to scratch/webgl_ap_rendered_exact.png!");
        } else {
          console.log("Result:", val);
        }
        ws.close();
      }
    };
  });
});
