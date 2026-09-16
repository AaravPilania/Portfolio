const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/assets/app-zxjZQ-wy.js');
let code = fs.readFileSync(filePath, 'utf8');

// Target the hideLoader method
const oldSnippet = `hideLoader=async()=>{this.promise&&await this.promise,this.trackLoadingCompleteEvent(),this.handleAppProgress(1);let e=b.timeline({onStart:()=>{$.enterApp()},onComplete:()=>{this.loader.remove(),this.canvas?.remove(this),this.canvas?.pause(),this.canvas?.clear(),this.destroy(),ta=!0}});e.to(this.progress,{yPercent:-100,clipPath:\`inset(100% 0% 0% 0%)\`,ease:\`power4.in\`,duration:.45},0),e.to(this,{showLogo:1,ease:\`none\`,duration:.35},0),e.to(this,{LOGO_START_GRID_SIZE:this.LOGO_GRID_SIZE,ease:\`power3.in\`,duration:3.75,onUpdate:()=>{this.introLayer?.uniforms.set(\`u_logo_pixel_size\`,{value:this.LOGO_START_GRID_SIZE}),this.gridLayer?.uniforms.set(\`u_logo_pixel_size\`,{value:this.LOGO_START_GRID_SIZE})}},0),e.to(this,{logoProgress:1,ease:\`power3.in\`,duration:2.75},0),e.to(this,{colorProgress:1,ease:\`power4.inOut\`,duration:4.25},0),e.to(this,{fullProgress:1,ease:\`power4.in\`,duration:3.25},.5),e.to(this,{hideProgress:1,ease:\`power4.in\`,duration:1.45},2.35),e.to(this.loader,{opacity:0,pointerEvents:\`none\`,ease:\`power4.out\`,duration:.65},0)}`;

const newSnippet = `hideLoader=async()=>{this.promise&&await this.promise,this.trackLoadingCompleteEvent(),this.handleAppProgress(1);let e=b.timeline({onStart:()=>{$.enterApp();window.__startHeroTransition&&window.__startHeroTransition();},onComplete:()=>{this.loader.remove(),this.canvas?.remove(this),this.canvas?.pause(),this.canvas?.clear(),this.destroy(),ta=!0;window.__completeHeroTransition&&window.__completeHeroTransition();}});e.to(this.progress,{yPercent:-100,clipPath:\`inset(100% 0% 0% 0%)\`,ease:\`power4.in\`,duration:.45},0),e.to(this,{showLogo:1,ease:\`none\`,duration:.35},0),e.to(this,{LOGO_START_GRID_SIZE:this.LOGO_GRID_SIZE,ease:\`power3.in\`,duration:3.75,onUpdate:()=>{this.introLayer?.uniforms.set(\`u_logo_pixel_size\`,{value:this.LOGO_START_GRID_SIZE}),this.gridLayer?.uniforms.set(\`u_logo_pixel_size\`,{value:this.LOGO_START_GRID_SIZE});const p=Math.min(1,Math.max(0,(160-this.LOGO_START_GRID_SIZE)/(160-16)));window.__updateHeroTransition&&window.__updateHeroTransition(p);}},0),e.to(this,{logoProgress:1,ease:\`power3.in\`,duration:2.75},0),e.to(this,{colorProgress:1,ease:\`power4.inOut\`,duration:4.25},0),e.to(this,{fullProgress:1,ease:\`power4.in\`,duration:3.25},.5),e.to(this,{hideProgress:1,ease:\`power4.in\`,duration:1.45,onUpdate:()=>{window.__updateHeroFade&&window.__updateHeroFade(this.hideProgress);}},2.35),e.to(this.loader,{opacity:0,pointerEvents:\`none\`,ease:\`power4.out\`,duration:.65},0)}`;

if (code.includes(oldSnippet)) {
  code = code.replace(oldSnippet, newSnippet);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully hooked hideLoader in app-zxjZQ-wy.js!');
} else {
  console.error('Could not find oldSnippet in app-zxjZQ-wy.js');
}
