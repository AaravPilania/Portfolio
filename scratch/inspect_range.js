const fs = require('fs');
const readline = require('readline');

const fileStream = fs.createReadStream('C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.system_generated/logs/transcript.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if (lineNum >= 1435 && lineNum <= 1560) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.tool_calls) {
        for (const tc of parsed.tool_calls) {
          console.log(`Line ${lineNum} [TOOL CALL]: ${tc.name} ${JSON.stringify(tc.args ? Object.keys(tc.args) : {})}`);
          if (tc.args && (tc.args.TargetFile || tc.args.CommandLine)) {
            console.log(`   File/Cmd: ${tc.args.TargetFile || tc.args.CommandLine}`);
          }
        }
      }
    } catch(e) {}
  }
});
