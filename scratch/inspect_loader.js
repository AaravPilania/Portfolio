const fs = require('fs');

const js = fs.readFileSync('lusion/_astro/hoisted.CUO_IjfL.js', 'utf8');

const classStart = js.indexOf('class TransitionOverlay');
let classEnd = js.indexOf('const transitionOverlay=', classStart);
if (classEnd === -1) {
  classEnd = js.indexOf('new TransitionOverlay', classStart);
}

console.log('TransitionOverlay class start:', classStart, 'end:', classEnd);
if (classStart !== -1) {
  console.log('TransitionOverlay class content:\n', js.substring(classStart, classEnd + 50));
}
