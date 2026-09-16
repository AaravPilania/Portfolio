const fs = require('fs');
const readline = require('readline');
const fileStream = fs.createReadStream('C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.system_generated/logs/transcript_full.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if (lineNum >= 1503 && lineNum <= 1508) {
    const parsed = JSON.parse(line);
    if (parsed.content) console.log('Line ' + lineNum + ' content:\n' + parsed.content.slice(0, 1500));
  }
});
