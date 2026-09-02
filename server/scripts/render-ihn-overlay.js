import { generateNewsTickerOverlay } from '../videoProcessor.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const preset = {
  id: 104,
  name: 'indianhappeningnow-news',
  handle: '@indianhappeningnow',
  ratio: '9:16',
  color: '#ffa928',
  layout: 'news_ticker',
  logo: 'indianhappeningnow-news-logo.png',
  headline: '<b>Surat Vadapav Vendor Builds</b> Massive Luxury Bunglow Next To His Stall & The Internet Is Stunned',
  footer: 'Despite the immense wealth required to build such a property, the vendor\'s story has drawn attention for emphasizing that no business is too small to achieve success.',
  showLogo: true,
  alignment: 'left',
  lineSpacing: 1.25,
  headlinePosition: { x: 0, y: 0 },
  rules: {
    logoOpacity: 1,
    logoPosition: 'top-left',
    logoCircular: false,
    logoSize: 72,
    logoPadX: 20,
    logoPadY: 84,
    kickerLogo: '101xfounders-news-kicker.png',
    kickerSize: 58,
    bottomMarginPct: 8,
  },
};

const out = join(__dirname, '..', 'test-assets', 'ihn-overlay-check.png');
const r = await generateNewsTickerOverlay(preset, preset.headline, 1, 1, out);
console.log('wrote', r.overlayPath, 'videoH', r.videoH);
