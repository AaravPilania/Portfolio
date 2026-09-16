const fs = require('fs');
const readline = require('readline');

const fileStream = fs.createReadStream('C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.system_generated/logs/transcript.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let lineNum = 0;
const history = [];

rl.on('line', (line) => {
  lineNum++;
  if (lineNum <= 1555) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.tool_calls) {
        for (const tc of parsed.tool_calls) {
          if (['replace_file_content', 'multi_replace_file_content', 'write_to_file'].includes(tc.name)) {
            const target = tc.args.TargetFile || '';
            if (target.includes('lamalama-interactive.js') || target.includes('custom.css') || target.includes('index.html')) {
              history.push({ lineNum, tool: tc.name, file: target, desc: tc.args.Description });
            }
          }
        }
      }
    } catch(e) {}
  }
});

rl.on('close', () => {
  console.log(JSON.stringify(history, null, 2));
});
