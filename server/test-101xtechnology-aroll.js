import { createVideoProcessor } from './videoProcessor.js';
import { resolve } from 'path';
import { existsSync } from 'fs';

const variants = [
  { name: '101xtechnology-16x9-top', ratio: '16:9', hookPosition: 'top', headline: 'This is a <b>BMW cut in half</b> to show every detail of its engineering precision' },
  { name: '101xtechnology-6x5-top', ratio: '6:5', hookPosition: 'top', headline: 'This is a <b>BMW cut in half</b> to show every detail of its engineering precision' },
  { name: '101xtechnology-2x3-top', ratio: '2:3', hookPosition: 'top', headline: 'This is a <b>BMW cut in half</b> to show every detail of its engineering precision' },
  { name: '101xtechnology-16x9-mid', ratio: '16:9', hookPosition: 'mid', headline: '<b>Deepinder</b> <b>Goyal</b> shows what he eats in a day, spoiler: its not from zomato' },
];

const presets = variants.map((v, i) => ({
  id: 100 + i,
  name: v.name,
  handle: '@101xtechnology',
  ratio: v.ratio,
  color: '#4898ab',
  layout: 'aroll',
  logo: null,
  headline: v.headline,
  footer: '',
  position: { x: 50, y: 50 },
  alignment: 'left',
  lineSpacing: 1.25,
  rules: { hookPosition: v.hookPosition, textLogo: '101xt.', highlightColors: ['#4898ab', '#90d46c'] },
}));

async function main() {
  const videoPath = resolve('test-assets/test-input.mp4');
  if (!existsSync(videoPath)) {
    console.error('Test video missing:', videoPath);
    process.exit(1);
  }

  console.log('=== EXPORT TEST: 101xtechnology-aroll variants ===');
  const processor = createVideoProcessor();
  const result = await processor.processVideo({
    videoPath,
    presets,
    headline: presets[0].headline,
    fontScale: 1,
    wordSpacing: 0.2,
    videoScale: 100,
    fitMode: 'cover',
    showCredit: false,
    ideaName: '101xtechnology',
    onProgress: ({ current, total, preset: name }) => console.log(`Progress: ${current}/${total} – ${name}`),
  });

  console.log('\n=== SUCCESS ===');
  console.log('Output dir:', result.outputDir);
  for (const p of result.videoPaths) console.log('Video:', p);
}

main().catch((err) => {
  console.error('\n=== FAILED ===');
  console.error(err.message);
  if (err.stderr) console.error('FFmpeg stderr:', err.stderr.slice(-2000));
  process.exit(1);
});
