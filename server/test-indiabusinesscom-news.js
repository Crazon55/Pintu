import { createVideoProcessor } from './videoProcessor.js';
import { resolve } from 'path';
import { existsSync } from 'fs';

const preset = {
  id: 94,
  name: 'indiabusinesscom-news',
  handle: '@indiabusinesscom',
  ratio: '4:5',
  color: '#FF8932',
  layout: 'news_ticker',
  logo: 'indiabusinesscom.png',
  headline: 'The <b>trick</b> to making your employees loyal',
  footer: '',
  position: { x: 50, y: 50 },
  creditPosition: { x: 0, y: 0.5 },
  watermarkPosition: { x: 50, y: 16 },
  headlinePosition: { x: 0, y: 0 },
  showLogo: true,
  alignment: 'left',
  lineSpacing: 1.25,
  rules: { logoOpacity: 1, logoPosition: 'top-left', logoCircular: false, logoSize: 65 },
};

async function main() {
  const videoPath = resolve('test-assets/test-input.mp4');
  if (!existsSync(videoPath)) {
    console.error('Test video missing:', videoPath);
    process.exit(1);
  }

  console.log('=== EXPORT TEST: indiabusinesscom-news ===');
  console.log('Input:', videoPath);

  const processor = createVideoProcessor();
  const result = await processor.processVideo({
    videoPath,
    presets: [preset],
    headline: preset.headline,
    fontScale: 1,
    wordSpacing: 0.25,
    videoScale: 100,
    fitMode: 'cover',
    showCredit: true,
    ideaName: 'news-test',
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
