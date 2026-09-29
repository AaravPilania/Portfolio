const fs = require('fs');

console.log('Running static verification...');

const finalHtml = fs.readFileSync('final/index.html', 'utf8');
const finalCss = fs.readFileSync('final/css/custom.css', 'utf8');

// 1. Check heroMarqueeOutline
if (!finalHtml.includes('id="heroMarqueeOutline"')) {
    console.error('FAIL: heroMarqueeOutline not found in final/index.html');
    process.exit(1);
}
if (!finalHtml.includes('track-line-1 track-outline')) {
    console.error('FAIL: track-line-1 track-outline not found in final/index.html');
    process.exit(1);
}
if (!finalHtml.includes('track-line-2 track-outline')) {
    console.error('FAIL: track-line-2 track-outline not found');
    process.exit(1);
}

// 2. Check clipPath logic
if (!finalHtml.includes('marqueeOutline.style.clipPath')) {
    console.error('FAIL: clipPath logic not found');
    process.exit(1);
}
if (!finalHtml.includes('getBoundingClientRect()')) {
    console.error('FAIL: getBoundingClientRect not used for clipPath');
    process.exit(1);
}

// 3. Check cursor dot styling and tone
if (finalCss.includes('.site-cursor-dot.is-light:not(.is-hovering) {\n  background-color: #000000')) {
    console.error('FAIL: Black cursor rule still present in final/css/custom.css');
    process.exit(1);
}
if (!finalCss.includes('z-index: 99999999 !important;')) {
    console.error('FAIL: z-index 99999999 not found in final/css/custom.css');
    process.exit(1);
}
if (!finalHtml.includes("return 'dark';")) {
    console.error('FAIL: detectTone dark return not found in final/index.html');
    process.exit(1);
}

// 4. Verify inline script syntax
const scriptMatches = finalHtml.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi);
let errorCount = 0;
scriptMatches.forEach((s, idx) => {
    const code = s.replace(/<script[\s\S]*?>/i, '').replace(/<\/script>/i, '');
    if (code.trim().length > 0 && !s.includes('src=')) {
        try {
            new Function(code);
        } catch (e) {
            console.error(`JS Syntax Error in script tag #${idx}:`, e.message);
            errorCount++;
        }
    }
});

if (errorCount > 0) {
    console.error(`FAIL: ${errorCount} script syntax errors found`);
    process.exit(1);
}

console.log('ALL STATIC CHECKS PASSED PERFECTLY!');
