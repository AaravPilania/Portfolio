const fs = require('fs');

const file = 'public/assets/app-zxjZQ-wy.js';
let content = fs.readFileSync(file, 'utf8');

// 1. In Fi: guard player call with WebGLTexture check
const fiOld = 'r.value&&r.value.player&&`player`in r.value?(r.value.player&&Hi(r.value.player,e,r.value.texture,i),e.uniform1i(o,i)):r.value&&r.value.texture instanceof WebGLTexture&&(Ii(e,r.value.texture,i,a),e.uniform1i(o,i))';
const fiNew = 'r.value&&r.value.player&&`player`in r.value?(r.value.player&&(r.value.texture instanceof WebGLTexture)&&Hi(r.value.player,e,r.value.texture,i),e.uniform1i(o,i)):r.value&&r.value.texture instanceof WebGLTexture&&(Ii(e,r.value.texture,i,a),e.uniform1i(o,i))';

// 2. In Ii: guard t with (t instanceof WebGLTexture)
const iiOld = 'Ii=(e,t,n,r=`canvas`)=>{!$.instances.get(r)||!t||(typeof n==`number`&&Number.isInteger(n)&&e.activeTexture(e.TEXTURE0+n),e.bindTexture(e.TEXTURE_2D,t))}';
const iiNew = 'Ii=(e,t,n,r=`canvas`)=>{!$.instances.get(r)||!t||!(t instanceof WebGLTexture)||(typeof n==`number`&&Number.isInteger(n)&&e.activeTexture(e.TEXTURE0+n),e.bindTexture(e.TEXTURE_2D,t))}';

// 3. In Hi: guard n with (n instanceof WebGLTexture)
const hiOld = 'Hi=(e,t,n,r)=>{if(!n||typeof r!=`number`||!e)return;let i=t.RGBA,a=t.RGBA,o=t.UNSIGNED_BYTE;Ii(t,n,r),t.texImage2D(t.TEXTURE_2D,0,i,a,o,e)}';
const hiNew = 'Hi=(e,t,n,r)=>{if(!n||!(n instanceof WebGLTexture)||typeof r!=`number`||!e)return;let i=t.RGBA,a=t.RGBA,o=t.UNSIGNED_BYTE;Ii(t,n,r),t.texImage2D(t.TEXTURE_2D,0,i,a,o,e)}';

if (!content.includes(fiOld) || !content.includes(iiOld) || !content.includes(hiOld)) {
  console.error('Target string not found in', file);
  process.exit(1);
}

content = content.replace(fiOld, fiNew);
content = content.replace(iiOld, iiNew);
content = content.replace(hiOld, hiNew);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched app-zxjZQ-wy.js with WebGL texture guards!');
