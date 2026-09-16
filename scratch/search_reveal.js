const fs = require('fs');
const readline = require('readline');
const fileStream = fs.createReadStream('C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.system_generated/logs/transcript_full.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if (line.includes('revealEntrance') && lineNum < 1555) {
    console.log('Line', lineNum, line.slice(0, 200));
  }
});
