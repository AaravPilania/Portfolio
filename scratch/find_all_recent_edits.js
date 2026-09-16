const fs = require('fs');
const readline = require('readline');

const fileStream = fs.createReadStream('C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.system_generated/logs/transcript.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if (lineNum >= 1556 && lineNum <= 2221) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.tool_calls) {
        for (const tc of parsed.tool_calls) {
          if (['replace_file_content', 'multi_replace_file_content', 'write_to_file'].includes(tc.name)) {
            console.log(`Line ${lineNum} [${tc.name}]: Target: ${tc.args.TargetFile}`);
            console.log(`   Description: ${tc.args.Description || tc.args.Instruction}`);
          }
        }
      }
    } catch(e) {}
  }
});
