// One-off test: run export with current videoProcessor (alpha + overlay fix) to verify no black bars.
import { createVideoProcessor } from './videoProcessor.js';
import { resolve } from 'path';
import { existsSync } from 'fs';

const preset101 = {
  id: 1,
  name: '101xfounders',
  handle: '@101xfounders',
  ratio: '4:3',
  color: '#ffa302',
  layout: 'watermark',
  logo: null,
  headline: 'The **trick** to making your employees loyal',
  footer: 'Credit: The Founders Show',
  position: { x: 50, y: 50 },
  creditPosition: { x: 0, y: 0.5 },
  watermarkPosition: { x: 50, y: 16 },
  headlinePosition: { x: 0, y: 0 },
  showLogo: false,
  alignment: 'left',
  lineSpacing: 1.25
};

async function main() {
  const serverDir = resolve(process.cwd());
  // Use an existing export as input (valid video) or an upload
  const candidates = [
    resolve(serverDir, 'outputs', 'export-1773611529056', '101xfounders.mp4'),
    resolve(serverDir, 'outputs', 'export-1773611258147', '101xfounders.mp4'),
    resolve(serverDir, 'uploads', 'eaa8db1da104b7972dbba31e2b448fca'),
  ];
  let videoPath = candidates.find(p => existsSync(p));
  if (!videoPath) {
    console.error('No test video found. Tried:', candidates);
    process.exit(1);
  }
  console.log('Using video:', videoPath);
  const processor = createVideoProcessor();
  try {
    const result = await processor.processVideo({
      videoPath,
      presets: [preset101],
      headline: preset101.headline,
      fontScale: 1,
      wordSpacing: 0.25,
      videoScale: 100,
      fitMode: 'cover',
      showCredit: true,
      ideaName: 'test-alpha-fix',
      onProgress: ({ current, total, preset }) => console.log(`Progress: ${current}/${total} ${preset}`),
    });
    console.log('Export OK:', result);
    console.log('Output files:', result.videoPaths);
  } catch (err) {
    console.error('Export failed:', err.message);
    if (err.stderr) console.error('FFmpeg stderr:', err.stderr.slice(-1500));
    process.exit(1);
  }
}

main();
