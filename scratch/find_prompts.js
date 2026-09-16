const fs = require('fs');
const readline = require('readline');

const fileStream = fs.createReadStream('C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.system_generated/logs/transcript.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if (line.includes('USER_INPUT')) {
    try {
      const parsed = JSON.parse(line);
      console.log('Line ' + lineNum + ' [USER_INPUT]: ' + (parsed.content ? parsed.content.slice(0, 120).replace(/\n/g, ' ') : ''));
    } catch(e) {}
  }
});
