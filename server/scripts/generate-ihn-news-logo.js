/**
 * Generate indianhappeningnow-news-logo.png — stacked INDIA / NOW with an
 * 8-point star above the I. White on transparent, for the 9:16 IHN header.
 *
 * Run from server dir: node scripts/generate-ihn-news-logo.js
 */
import { createCanvas, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
const outPath = path.join(__dirname, '..', 'assets', 'logos', 'indianhappeningnow-news-logo.png');

const extraBold = path.join(fontsDir, 'Inter_18pt-ExtraBold.ttf');
const black = path.join(fontsDir, 'Inter_18pt-Black.ttf');
const bold = path.join(fontsDir, 'Inter-Bold.ttf');
const face = fs.existsSync(extraBold) ? extraBold : (fs.existsSync(black) ? black : bold);
registerFont(face, { family: 'IhnWordmark', weight: 'bold' });

function drawEightPointStar(ctx, cx, cy, outerR) {
  const innerR = outerR * 0.38;
  const points = 8;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

const fontSize = 160;
const lineGap = Math.round(fontSize * 0.86);
const starR = Math.round(fontSize * 0.13);
const starGap = Math.round(fontSize * 0.10);
const padX = 12;
const padY = 8;

const measure = createCanvas(4, 4).getContext('2d');
measure.font = `bold ${fontSize}px IhnWordmark`;
measure.textBaseline = 'alphabetic';
const indiaW = measure.measureText('INDIA').width;
const nowW = measure.measureText('NOW').width;
const iW = measure.measureText('I').width;
const textW = Math.max(indiaW, nowW);

const starTop = padY;
const indiaBaseline = starTop + starR * 2 + starGap + fontSize * 0.78;
const nowBaseline = indiaBaseline + lineGap;
const canvasW = Math.ceil(padX * 2 + textW);
const canvasH = Math.ceil(nowBaseline + fontSize * 0.22 + padY);

const canvas = createCanvas(canvasW, canvasH);
const ctx = canvas.getContext('2d');
ctx.clearRect(0, 0, canvasW, canvasH);
ctx.fillStyle = '#FFFFFF';
ctx.font = `bold ${fontSize}px IhnWordmark`;
ctx.textAlign = 'left';
ctx.textBaseline = 'alphabetic';
ctx.fillText('INDIA', padX, indiaBaseline);
ctx.fillText('NOW', padX, nowBaseline);

const starCx = padX + iW / 2;
const starCy = starTop + starR;
drawEightPointStar(ctx, starCx, starCy, starR);

fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
console.log('Wrote', outPath, `${canvasW}x${canvasH}`, 'font=', path.basename(face));
