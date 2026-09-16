const fs = require('fs');
const readline = require('readline');
const fileStream = fs.createReadStream('C:/Users/gaura/.gemini/antigravity-ide/brain/2ded929c-541a-4bfa-b747-b56cd87797e7/.system_generated/logs/transcript_full.jsonl');
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let lineNum = 0;
const edits = [];

rl.on('line', (line) => {
  lineNum++;
  if ([817, 825, 1189, 1521, 1525].includes(lineNum)) {
    const parsed = JSON.parse(line);
    const tc = parsed.tool_calls[0];
    edits.push({
      lineNum,
      targetContent: tc.args.TargetContent,
      replacementContent: tc.args.ReplacementContent,
      description: tc.args.Description
    });
  }
});

rl.on('close', () => {
  let js = fs.readFileSync('scratch/base_interactive_763.js', 'utf-8');
  for (const edit of edits) {
    console.log(`Applying edit ${edit.lineNum}: ${edit.description}`);
    if (!js.includes(edit.targetContent)) {
      console.log(`FAILED to find targetContent for edit ${edit.lineNum}`);
    } else {
      js = js.replace(edit.targetContent, edit.replacementContent);
      console.log(`Successfully applied edit ${edit.lineNum}`);
    }
  }
  fs.writeFileSync('scratch/interactive_pre1556.js', js);
  console.log('Saved scratch/interactive_pre1556.js, length:', js.length);
});
