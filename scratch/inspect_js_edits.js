const fs = require('fs');
const readline = require('readline');

// Let's find the content of lamalama-interactive.js around line 1521-1525 or read it from transcript
const fileStream = fs.createReadStream('C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.system_generated/logs/transcript_full.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if ([1521, 1525, 1722, 1861].includes(lineNum)) {
    try {
      const parsed = JSON.parse(line);
      console.log(`=== LINE ${lineNum} ===`);
      for (const tc of parsed.tool_calls || []) {
        console.log(`Tool: ${tc.name}`);
        console.log(`TargetFile: ${tc.args.TargetFile}`);
        console.log(`Description: ${tc.args.Description}`);
        console.log(`StartLine: ${tc.args.StartLine}, EndLine: ${tc.args.EndLine}`);
        console.log(`TargetContent length: ${tc.args.TargetContent ? tc.args.TargetContent.length : 0}`);
        console.log(`ReplacementContent length: ${tc.args.ReplacementContent ? tc.args.ReplacementContent.length : 0}`);
      }
    } catch(e) {}
  }
});
