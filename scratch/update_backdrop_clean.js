const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../public/assets/backdrop_theme-MLvCd1KU.js');
let js = fs.readFileSync(targetPath, 'utf8');

// 1. Target for createBackdrop
const targetCreateBackdrop = 'createBackdrop=async(e=!1,n)=>{if(!this.backdropContent){n&&n();return}this.backdropItem?.destroy(),this.backdropContent=this.getContent();let r=this.backdropContent.querySelector(`video`);r&&r.paused&&t(r),await new Promise(e=>{this.backdropItem=new a(this.backdropContent,()=>e(null),!0)}),this.onLoad(e,n)};';

const replacementCreateBackdrop = `createBackdrop=async(e=!1,n)=>{if(!this.backdropContent){n&&n();return}this.backdropItem?.destroy(),this.backdropContent=this.getContent();let r=this.backdropContent.querySelector(\`video\`);r&&r.paused&&t(r),await new Promise(e=>{this.backdropItem=new a(this.backdropContent,()=>e(null),!0);if(this.section.classList.contains('ll-section--hero_extended')){setTimeout(()=>e(null),30);}}),this.onLoad(e,n)};`;

// 2. Target for onLoad
const targetOnLoad = 'onLoad=(e=!1,t)=>{t&&t(),this.gridLayer&&this.backdropItem&&this.backdropItem.texture&&(this.gridLayer.uniforms.set(`u_content_dimensions`,{value:[this.backdropItem.width,this.backdropItem.height]}),this.gridLayer.uniforms.set(`u_content`,{value:this.backdropItem.texture}),this.gridLayer.uniforms.set(`u_nogrid`,{value:+!!this.nogrid}),e?(this.revealProgress=1,this.gridLayer.uniforms.set(`u_reveal_progress`,{value:1})):this.reveal())};';

const replacementOnLoad = `onLoad=(e=!1,t)=>{t&&t();if(this.gridLayer&&this.backdropItem&&this.backdropItem.texture){if(this.section.classList.contains('ll-section--hero_extended')){this.gridLayer.uniforms.set('u_content_dimensions',{value:[1672,941]});this.gridLayer.uniforms.set('u_content',{value:this.backdropItem.texture});this.gridLayer.uniforms.set('u_nogrid',{value:1});this.gridLayer.uniforms.set('u_nogrid_progress',{value:1});this.gridLayer.uniforms.set('u_scale',{value:1});this.revealProgress=1;this.gridLayer.uniforms.set('u_reveal_progress',{value:1});}else{this.gridLayer.uniforms.set(\`u_content_dimensions\`,{value:[this.backdropItem.width,this.backdropItem.height]});this.gridLayer.uniforms.set(\`u_content\`,{value:this.backdropItem.texture});this.gridLayer.uniforms.set(\`u_nogrid\`,{value:+!!this.nogrid});e?(this.revealProgress=1,this.gridLayer.uniforms.set(\`u_reveal_progress\`,{value:1})):this.reveal();}}};`;

// 3. Target for stepGrid
const targetStepGrid = 'stepGrid=()=>{this.canUseWebGL()&&this.composer?.step({layer:this.gridLayer,input:[{key:`u_cursor`,layer:this.cursor?.advectionLayer}],output:this.gridLayer})};';

const replacementStepGrid = `stepGrid=()=>{if(!this.canUseWebGL())return;if(this.section.classList.contains('ll-section--hero_extended')){let gl=this.composer?.gl,heroTex=this.backdropItem?.texture,animCanvas=window.__heroAvatarEngine?.getCanvas();if(gl&&heroTex?.texture&&animCanvas){gl.bindTexture(gl.TEXTURE_2D,heroTex.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,animCanvas);}}this.composer?.step({layer:this.gridLayer,input:[{key:\`u_cursor\`,layer:this.cursor?.advectionLayer}],output:this.gridLayer});};`;

// 4. Target for enter
const targetEnter = 'enter=()=>{this.IS_WEBGL&&(this.stepGrid(),this.cursor=l.instances.get(`cursor`),this.gridLayer.uniforms.set(`u_nocursor`,{value:+!this.cursor?.IS_WEBGL}),this.scale>1&&(v.to(this,{nogrid_progress:1,duration:1.95,ease:`power3.in`,delay:e+.15,onUpdate:()=>{this.gridLayer?.uniforms.set(`u_nogrid_progress`,{value:this.nogrid_progress})}}),v.to(this,{scale:1,duration:3.15,ease:`power4.out`,delay:e-.45,onUpdate:()=>{this.gridLayer?.uniforms.set(`u_scale`,{value:this.scale})}})))};';

const replacementEnter = `enter=()=>{if(this.IS_WEBGL){if(this.section.classList.contains('ll-section--hero_extended')){this.nogrid_progress=1;this.scale=1;this.gridLayer?.uniforms.set('u_nogrid_progress',{value:1});this.gridLayer?.uniforms.set('u_scale',{value:1});}this.stepGrid();this.cursor=l.instances.get(\`cursor\`);this.gridLayer.uniforms.set(\`u_nocursor\`,{value:+!this.cursor?.IS_WEBGL});if(!this.section.classList.contains('ll-section--hero_extended')&&this.scale>1){v.to(this,{nogrid_progress:1,duration:1.95,ease:\`power3.in\`,delay:e+.15,onUpdate:()=>{this.gridLayer?.uniforms.set(\`u_nogrid_progress\`,{value:this.nogrid_progress})}});v.to(this,{scale:1,duration:3.15,ease:\`power4.out\`,delay:e-.45,onUpdate:()=>{this.gridLayer?.uniforms.set(\`u_scale\`,{value:this.scale})}});}}};`;

console.log('Target 1 exists:', js.includes(targetCreateBackdrop));
console.log('Target 2 exists:', js.includes(targetOnLoad));
console.log('Target 3 exists:', js.includes(targetStepGrid));
console.log('Target 4 exists:', js.includes(targetEnter));

if (js.includes(targetCreateBackdrop) && js.includes(targetOnLoad) && js.includes(targetStepGrid) && js.includes(targetEnter)) {
  js = js.replace(targetCreateBackdrop, replacementCreateBackdrop);
  js = js.replace(targetOnLoad, replacementOnLoad);
  js = js.replace(targetStepGrid, replacementStepGrid);
  js = js.replace(targetEnter, replacementEnter);
  fs.writeFileSync(targetPath, js, 'utf8');
  console.log('SUCCESS: Updated public/assets/backdrop_theme-MLvCd1KU.js');
} else {
  console.error('ERROR: One or more targets not found!');
}
