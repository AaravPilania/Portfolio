const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/assets/app-zxjZQ-wy.js');
let code = fs.readFileSync(filePath, 'utf8');

const target = `mat2 rotation2d(float angle) {
    float s = sin(angle);
    float c = cos(angle);

    return mat2(
        c, -s,
        s, c
    );
}


float isInsideAP(vec2 p) {
    float x = (p.x - 0.1000) / 0.8000;
    float y = (p.y - 0.1300) / 0.7400;

    if (x < 0.0 || x > 1.0 || y < 0.0 || y > 1.0) return 0.0;

    if (x <= 0.124 && y <= 0.853) return 1.0;
    if (x >= 0.439 && x <= 0.583 && y <= 0.853) return 1.0;
    if (x >= 0.124 && x <= 0.439 && y >= 0.853) return 1.0;
    if (x >= 0.511 && x <= 0.886 && y >= 0.853) return 1.0;
    if (x >= 0.825 && y >= 0.778 && y <= 0.853) return 1.0;
    if (x >= 0.886 && y >= 0.546 && y <= 0.778) return 1.0;
    if (x >= 0.825 && y >= 0.471 && y <= 0.546) return 1.0;
    if (x >= 0.124 && x <= 0.439 && y >= 0.442 && y <= 0.605) return 1.0;
    if (x >= 0.439 && x <= 0.879 && y >= 0.316 && y <= 0.471) return 1.0;

    return 0.0;
}

float drawLLLogo(vec2 rect, float opacity, float full) {`;

const replacement = `mat2 rotation2d(float angle) {
    float s = sin(angle);
    float c = cos(angle);

    return mat2(
        c, -s,
        s, c
    );
}


float checkEqual(float first, float second) {
    float difference = abs(first - second);
    float inverted_number = ceil(1.0 * difference / 20.0);

    return (1.0 - inverted_number);
}



float drawLLLogo(vec2 rect, float opacity, float full) {`;

const normCode = code.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');

if (normCode.includes(normTarget)) {
  const updated = normCode.replace(normTarget, replacement.replace(/\r\n/g, '\n'));
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully restored checkEqual in shader rv!');
} else {
  console.error('Target not found in app-zxjZQ-wy.js!');
}
