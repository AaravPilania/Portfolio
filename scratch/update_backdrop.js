const fs = require('fs');

let code = fs.readFileSync('public/assets/backdrop_theme-MLvCd1KU.js', 'utf8');

// Replace init
const oldInit = 'this.createScrollTrigger()}}';
const newInit = 'this.createScrollTrigger();if(this.section.classList.contains(`ll-section--hero_extended`)||(this.section.getBoundingClientRect().top<=0&&this.section.getBoundingClientRect().bottom>0)){this.inView=!0,this.canvas?.add(this),this.stepGrid()}}}';
if (!code.includes(oldInit)) {
  console.error('Could not find oldInit');
  process.exit(1);
}
code = code.replace(oldInit, newInit);

// Replace stepGrid
const oldStep = 'stepGrid=()=>{this.canUseWebGL()&&this.composer?.step({layer:this.gridLayer,input:[{key:`u_cursor`,layer:this.cursor?.advectionLayer}],output:this.gridLayer})};';
const newStep = 'stepGrid=()=>{if(!this.canUseWebGL())return;if(this.section.classList.contains(`ll-section--hero_extended`)){let gl=this.composer?.gl,heroTex=this.backdropItem?.texture,animCanvas=heroTex?.player||window.__heroAvatarEngine?.getCanvas();gl&&heroTex?.texture&&animCanvas&&(gl.bindTexture(gl.TEXTURE_2D,heroTex.texture),gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,animCanvas))}this.composer?.step({layer:this.gridLayer,input:[{key:`u_cursor`,layer:this.cursor?.advectionLayer}],output:this.gridLayer})};';
if (!code.includes(oldStep)) {
  console.error('Could not find oldStep');
  process.exit(1);
}
code = code.replace(oldStep, newStep);

fs.writeFileSync('public/assets/backdrop_theme-MLvCd1KU.js', code, 'utf8');
console.log('Successfully updated public/assets/backdrop_theme-MLvCd1KU.js');
