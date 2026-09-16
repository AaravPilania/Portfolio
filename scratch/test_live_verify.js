
const http = require("http");
const fs = require("fs");

http.get("http://localhost:9222/json", res => {
  let raw = "";
  res.on("data", c => raw += c);
  res.on("end", async () => {
    const list = JSON.parse(raw);
    const tab = list.find(t => t.url && t.url.includes("localhost:3000") && !t.url.includes("coded-avatar")) || list[0];
    console.log("Using tab:", tab.title, tab.url);

    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 1000000);
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            ws.removeEventListener("message", handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onopen = async () => {
      console.log("Connected to browser!");
      await send("Page.enable");
      await send("Runtime.enable");

      // Navigate to fresh page
      console.log("Navigating to http://localhost:3000/?test=" + Date.now());
      await send("Page.navigate", { url: "http://localhost:3000/?test=" + Date.now() });

      // Capture intro loader at t = 1.2s
      setTimeout(async () => {
        console.log("Capturing intro loader...");
        const shot1 = await send("Page.captureScreenshot", { format: "png" });
        if (shot1 && shot1.data) {
          fs.writeFileSync("scratch/verify_live_intro_loader.png", Buffer.from(shot1.data, "base64"));
          console.log("Saved scratch/verify_live_intro_loader.png");
        }
      }, 1200);

      // Capture revealed page & navbar at t = 5.5s
      setTimeout(async () => {
        console.log("Capturing navbar & hero...");
        const shot2 = await send("Page.captureScreenshot", { format: "png" });
        if (shot2 && shot2.data) {
          fs.writeFileSync("scratch/verify_live_navbar.png", Buffer.from(shot2.data, "base64"));
          console.log("Saved scratch/verify_live_navbar.png");
        }

        // Now scroll down 600px to capture slide 1 -> 2 transition
        await send("Runtime.evaluate", {
          expression: "window.scrollTo(0, 600); document.documentElement.scrollTop = 600; const s = document.querySelector('.js-scroller'); if (s) s.scrollTop = 600;"
        });

        setTimeout(async () => {
          console.log("Capturing slide 1 -> slide 2 transition...");
          const shot3 = await send("Page.captureScreenshot", { format: "png" });
          if (shot3 && shot3.data) {
            fs.writeFileSync("scratch/verify_live_slide_transition.png", Buffer.from(shot3.data, "base64"));
            console.log("Saved scratch/verify_live_slide_transition.png");
          }
          ws.close();
          process.exit(0);
        }, 1500);

      }, 5500);
    };
  });
});
