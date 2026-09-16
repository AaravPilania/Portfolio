const fs = require('fs');
const path = require('path');

// Let's inspect generating 3 line-boil frames for the base drawing
// In traditional hand-drawn 2D animation, line boil happens at 8 to 12 FPS.
// Each frame has tiny (0.4 - 0.9px) variations in ink stroke positions.
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/portrait_eyeballs_config.json')));
const handDrawn = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/hand_drawn_eyeballs.json')));

console.log('Loaded config and handDrawn');
