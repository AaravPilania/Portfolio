const fs = require('fs');
const readline = require('readline');
const fileStream = fs.createReadStream('C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.system_generated/logs/transcript_full.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let lineNum = 0;
let baseCss = '';

rl.on('line', (line) => {
  lineNum++;
  if (lineNum === 761) {
    const parsed = JSON.parse(line);
    baseCss = parsed.tool_calls[0].args.CodeContent;
  }
});

rl.on('close', () => {
  console.log('Base CSS length:', baseCss.length);
  fs.writeFileSync('scratch/base_custom_761.css', baseCss);
  console.log('Saved scratch/base_custom_761.css');
});
