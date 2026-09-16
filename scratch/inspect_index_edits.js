const fs = require('fs');
const readline = require('readline');

const fileStream = fs.createReadStream('C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.system_generated/logs/transcript_full.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if ([1704, 1708, 1766, 1849].includes(lineNum)) {
    try {
      const parsed = JSON.parse(line);
      console.log(`=== LINE ${lineNum} ===`);
      for (const tc of parsed.tool_calls || []) {
        console.log(`Tool: ${tc.name}`);
        console.log(`TargetFile: ${tc.args.TargetFile}`);
        console.log(`TargetContent:\n${tc.args.TargetContent}`);
        console.log(`ReplacementContent:\n${tc.args.ReplacementContent}`);
      }
    } catch(e) {}
  }
});
