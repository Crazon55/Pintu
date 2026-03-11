/**
 * One-off script to generate founders-wtf.png for the Founders wtf preset.
 * Run from server dir: node scripts/generate-founders-wtf-logo.js
 */
import { createCanvas, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
const outPath = path.join(__dirname, '..', 'assets', 'logos', 'founders-wtf.png');

registerFont(path.join(fontsDir, 'Inter_18pt-Regular.ttf'), { family: 'Inter', weight: 'normal' });
registerFont(path.join(fontsDir, 'Inter_18pt-Bold.ttf'), { family: 'Inter', weight: 'bold' });

const size = 500;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

const purple = '#7C3AED';
const white = '#FFFFFF';

// Purple rect + white border
ctx.fillStyle = purple;
ctx.fillRect(0, 0, size, size);
ctx.strokeStyle = white;
ctx.lineWidth = 4;
ctx.strokeRect(2, 2, size - 4, size - 4);

// "founders" - top
ctx.fillStyle = white;
ctx.font = '600 72px Inter';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('founders', size / 2, 185);

// "W" large + "TF." smaller - bottom, centered as group
ctx.font = '900 120px Inter';
const wWidth = ctx.measureText('W').width;
ctx.font = '600 72px Inter';
const tfWidth = ctx.measureText('TF.').width;
const totalWidth = wWidth + 4 + tfWidth;
let x = (size - totalWidth) / 2;
ctx.font = '900 120px Inter';
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';
ctx.fillText('W', x, 335);
x += wWidth + 4;
ctx.font = '600 72px Inter';
ctx.fillText('TF.', x, 335);

const buf = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buf);
console.log('Wrote', outPath);
