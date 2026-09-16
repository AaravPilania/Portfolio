const WebSocket = globalThis.WebSocket;
const ws = new WebSocket('ws://localhost:9222/devtools/page/536E7BFFADDEEAABBD0B68015DC27F69');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const h1 = document.querySelector('h1');
        const matched = [];
        for (let sheet of document.styleSheets) {
          try {
            for (let rule of sheet.cssRules) {
              if (rule.selectorText && h1.matches(rule.selectorText)) {
                if (rule.style.visibility || rule.cssText.includes('visibility')) {
                  matched.push({
                    selector: rule.selectorText,
                    visibility: rule.style.visibility,
                    css: rule.cssText,
                    sheet: sheet.href
                  });
                }
              }
            }
          } catch(e) {}
        }
        return matched;
      })()`,
      returnByValue: true
    }
  }));
};
ws.onmessage = (e) => {
  console.log('Matched CSS rules with visibility:', JSON.stringify(JSON.parse(e.data).result.result.value, null, 2));
  ws.close();
};
