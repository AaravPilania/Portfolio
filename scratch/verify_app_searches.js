const fs = require('fs');

const path = 'public/assets/app-zxjZQ-wy.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Check Fi target
const fiSearch = 'r.value&&r.value.player&&`player`in r.value?(r.value.player&&Hi(r.value.player,e,r.value.texture,i),e.uniform1i(o,i)):r.value&&r.value.texture instanceof WebGLTexture&&(Ii(e,r.value.texture,i,a),e.uniform1i(o,i))';
console.log('fiSearch match:', content.includes(fiSearch));

// 2. Check Ii target
const iiSearch = 'Ii=(e,t,n,r=`canvas`)=>{!$.instances.get(r)||!t||(typeof n==`number`&&Number.isInteger(n)&&e.activeTexture(e.TEXTURE0+n),e.bindTexture(e.TEXTURE_2D,t))}';
console.log('iiSearch match:', content.includes(iiSearch));

// 3. Check Hi target
const hiSearch = 'Hi=(e,t,n,r)=>{if(!n||typeof r!=`number`||!e)return;let i=t.RGBA,a=t.RGBA,o=t.UNSIGNED_BYTE;Ii(t,n,r),t.texImage2D(t.TEXTURE_2D,0,i,a,o,e)}';
console.log('hiSearch match:', content.includes(hiSearch));
