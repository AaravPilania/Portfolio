const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/assets/app-zxjZQ-wy.js');
let code = fs.readFileSync(filePath, 'utf8');

const target = `float isInsideAP(vec2 p) {
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

float drawAPLogo(vec2 rect, float opacity, float full, float inverted) {
    if (opacity <= 0.0) return 0.0;
    vec2 p = fract(rect);
    float inside = isInsideAP(p);
    if (inverted > 0.5) inside = 1.0 - inside;
    float val = mix(inside, 1.0, full);
    return val * min(1.0, opacity);
}





void main() {

    vec2 uv = v_uv;

    float columns = u_resolution.x / (u_pixel_size);
    float rows = u_resolution.y / (u_pixel_size);

    float y = uv.y;

    float roundedX = round((uv.x) * columns + 0.5) / columns;
    float roundedY = round((y) * rows + 0.5) / rows;

    vec2 roundedUV = vec2(roundedX, roundedY);
    // Gap

    float strengh = 0.05;
    vec2 gh = vec2(roundedUV.x, roundedUV.y * (1.0 - strengh * 2.0) + strengh + strengh * noise(roundedUV * 10.0));

    vec2 uv_resolution = vec2(uv.x * columns, uv.y * rows);


    // ----------------------------------- Render -----------------------------------


    vec4 tex = texture(u_input, uv);




    // float cursor_g = drawAPLogo(uv_resolution, tex.g, 1.0, 0.0);
    // float cursor_r = cursor_f - cursor_g;


    float cursor_f = drawAPLogo(uv_resolution, tex.b, 1.0, 0.0);
    vec3 colour = u_theme * cursor_f / 255.0;
    // vec3 colour_second = u_theme_second * cursor_g / 255.0;

    FragColor = vec4(colour, cursor_f);
}`;

const replacement = `float checkEqual(float first, float second) {
    float difference = abs(first - second);
    float inverted_number = ceil(1.0 * difference / 20.0);

    return (1.0 - inverted_number);
}



float drawLLLogo(vec2 rect, float opacity, float full, float inverted) {

    float x = mod(round(mod(rect.x, 1.0) * 4.0 + 0.5 + 1.0), 4.0);
    float y = mod(round(mod(rect.y, 1.0) * 4.0 + 0.5), 4.0);

    float divider = (7.0 + 9.0 * full);
    float progress = 1.0 / divider;
    float inverted_offset = 16.0 * inverted;
    float offset = 0.0;

    float output_opacity = 0.0;

    // Opacity
    float block_1 = step(1.0 - opacity, progress * (abs(inverted_offset - 0.0) + offset));
    float block_2 = step(1.0 - opacity, progress * (abs(inverted_offset - 1.0) + offset));
    float block_3 = step(1.0 - opacity, progress * (abs(inverted_offset - 2.0) + offset));
    float block_4 = step(1.0 - opacity, progress * (abs(inverted_offset - 3.0) + offset));
    float block_5 = step(1.0 - opacity, progress * (abs(inverted_offset - 4.0) + offset));
    float block_6 = step(1.0 - opacity, progress * (abs(inverted_offset - 5.0) + offset));
    float block_7 = step(1.0 - opacity, progress * (abs(inverted_offset - 6.0) + offset));

    // Full
    float block_8 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 7.0) + offset));
    float block_9 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 8.0) + offset));
    float block_10 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 9.0) + offset));
    float block_11 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 10.0) + offset));
    float block_12 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 11.0) + offset));
    float block_13 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 12.0) + offset));
    float block_14 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 13.0) + offset));
    float block_15 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 14.0) + offset));
    float block_16 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 15.0) + offset));

    //
    output_opacity += block_1 * checkEqual(0.0, x) * checkEqual(0.0, y);
    output_opacity += block_2 * checkEqual(0.0, x) * checkEqual(2.0, y);
    output_opacity += block_3 * checkEqual(2.0, x) * checkEqual(1.0, y);
    output_opacity += block_4 * checkEqual(3.0, x) * checkEqual(3.0, y);
    output_opacity += block_5 * checkEqual(1.0, x) * checkEqual(3.0, y);
    output_opacity += block_6 * checkEqual(0.0, x) * checkEqual(1.0, y);
    output_opacity += block_7 * checkEqual(2.0, x) * checkEqual(0.0, y);

    // Full
    output_opacity += block_8 * checkEqual(0.0, x) * checkEqual(3.0, y);
    output_opacity += block_9 * checkEqual(1.0, x) * checkEqual(2.0, y);
    output_opacity += block_10 * checkEqual(3.0, x) * checkEqual(2.0, y);
    output_opacity += block_11 * checkEqual(3.0, x) * checkEqual(0.0, y);
    output_opacity += block_12 * checkEqual(2.0, x) * checkEqual(3.0, y);
    output_opacity += block_13 * checkEqual(2.0, x) * checkEqual(2.0, y);
    output_opacity += block_14 * checkEqual(1.0, x) * checkEqual(0.0, y);
    output_opacity += block_15 * checkEqual(1.0, x) * checkEqual(1.0, y);
    output_opacity += block_16 * checkEqual(3.0, x) * checkEqual(1.0, y);

    return min(1.0, output_opacity) * ceil(opacity);
}





void main() {

    vec2 uv = v_uv;

    float columns = u_resolution.x / (u_pixel_size);
    float rows = u_resolution.y / (u_pixel_size);

    float y = uv.y;

    float roundedX = round((uv.x) * columns + 0.5) / columns;
    float roundedY = round((y) * rows + 0.5) / rows;

    vec2 roundedUV = vec2(roundedX, roundedY);
    // Gap

    float strengh = 0.05;
    vec2 gh = vec2(roundedUV.x, roundedUV.y * (1.0 - strengh * 2.0) + strengh + strengh * noise(roundedUV * 10.0));

    vec2 uv_resolution = vec2(uv.x * columns, uv.y * rows);


    // ----------------------------------- Render -----------------------------------


    vec4 tex = texture(u_input, uv);




    // float cursor_g = drawLLLogo(uv_resolution, tex.g, 1.0, 0.0);
    // float cursor_r = cursor_f - cursor_g;


    float cursor_f = drawLLLogo(uv_resolution, tex.b, 1.0, 0.0);
    vec3 colour = u_theme * cursor_f / 255.0;
    // vec3 colour_second = u_theme_second * cursor_g / 255.0;

    FragColor = vec4(colour, cursor_f);
}`;

// Normalize newlines for replacement
const normCode = code.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');

if (normCode.includes(normTarget)) {
  const updated = normCode.replace(normTarget, replacement.replace(/\r\n/g, '\n'));
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully replaced shader aa with authentic drawLLLogo!');
} else {
  console.error('Target not found in file!');
}
