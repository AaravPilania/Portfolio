const fs = require('fs');
const readline = require('readline');
const fileStream = fs.createReadStream('C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.system_generated/logs/transcript_full.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let lineNum = 0;
let baseJs = '';

rl.on('line', (line) => {
  lineNum++;
  if (lineNum === 763) {
    const parsed = JSON.parse(line);
    baseJs = parsed.tool_calls[0].args.CodeContent;
  }
});

rl.on('close', () => {
  console.log('Base JS length:', baseJs.length);
  fs.writeFileSync('scratch/base_interactive_763.js', baseJs);
  console.log('Saved scratch/base_interactive_763.js');
});
