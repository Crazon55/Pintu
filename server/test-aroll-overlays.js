import { generateArollOverlay } from './videoProcessor.js';
import { resolve, join } from 'path';
import { mkdirSync } from 'fs';

const outDir = resolve('temp', 'aroll-preview-test');
mkdirSync(outDir, { recursive: true });

const presets = [
  {
    name: '101xtechnology-aroll',
    handle: '@101xtechnology',
    ratio: '16:9',
    layout: 'aroll',
    headline: '<b>Deepinder</b> <b>Goyal</b> shows what he eats in a day',
    rules: { hookPosition: 'mid', textLogo: '101xt.', highlightColors: ['#4898ab', '#90d46c'], topGlow: true },
  },
  {
    name: 'indiantechdaily-aroll',
    handle: '@indiantechdaily',
    ratio: '16:9',
    layout: 'aroll',
    logo: 'indiantechdaily.png',
    headline: 'The <b>Creator</b> of AI talks',
    rules: { arollStyle: 'logo_social', hookPosition: 'mid', textLogo: 'Indian Tech Daily', topGlow: false },
  },
];

for (const preset of presets) {
  const path = join(outDir, `${preset.name}.png`);
  await generateArollOverlay(preset, preset.headline, 1, 0.2, path);
  console.log('Wrote', path);
}
