import { generateNewsTickerOverlay } from '../videoProcessor.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const shared = {
  ratio: '9:16',
  layout: 'news_ticker',
  headline: 'The <b>trick</b> to making your employees loyal',
  footer: 'The 2026 Summit brings 11 member nations together in New Delhi to discuss trade, technology, energy and global governance. Putin & Xi Jingping both arriving India',
  showLogo: true,
  alignment: 'left',
  lineSpacing: 1.25,
  headlinePosition: { x: 0, y: 0 },
};

const ihn = {
  ...shared,
  id: 104,
  name: 'indianhappeningnow-news',
  color: '#ffa928',
  logo: 'indianhappeningnow-news-logo.png',
  rules: {
    logoSize: 72,
    logoPadX: 56,
    logoPadY: 120,
    kickerLogo: '101xfounders-news-kicker.png',
    kickerSize: 58,
    bottomMarginPct: 8,
  },
};

const founders = {
  ...shared,
  id: 103,
  name: '101xfounders-news',
  color: '#ff7c15',
  logo: 'new-new-101xfounder-logo.png',
  rules: {
    logoSize: 42,
    logoPadX: 56,
    logoPadY: 120,
    kickerLogo: '101xfounders-news-kicker.png',
    kickerSize: 58,
    bottomMarginPct: 8,
  },
};

for (const preset of [ihn, founders]) {
  const out = join(__dirname, '..', 'test-assets', `${preset.name}-overlay-check.png`);
  const r = await generateNewsTickerOverlay(preset, preset.headline, 1, 1, out);
  console.log('wrote', r.overlayPath);
}
