import { createVideoProcessor } from './videoProcessor.js';
import { resolve, dirname, join } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

const preset = {
  id: 97,
  name: 'ifc2-news',
  handle: '@indianfoundercore',
  ratio: '4:5',
  color: '#ffd412',
  layout: 'news_ticker',
  logo: 'FoundersCORE-white.png',
  headline: '<b>Khan Sir Celebrates RE-NEET 2026 Success with Students,</b><br>Dance Video Viral!',
  footer: 'Credit: The Founders Show', // must be stripped
  showLogo: true,
  alignment: 'center',
  lineSpacing: 1.25,
  rules: { logoOpacity: 1, logoPosition: 'top-left', logoCircular: false, logoSize: 160, logoPadX: 28, logoPadY: 36 },
};

async function main() {
  const videoPath = resolve(__dirname, 'test-assets/test-input.mp4');
  if (!existsSync(videoPath)) {
    console.error('Missing test video');
    process.exit(1);
  }
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
    ideaName: 'ifc2-hook-test',
    onProgress: ({ current, total, preset: name }) => console.log(`Progress: ${current}/${total} – ${name}`),
  });
  console.log('OK', result.videoPaths);
  // Copy latest overlay from temp for visual check
  const tempRoot = join(__dirname, 'temp');
  const dirs = await fs.readdir(tempRoot);
  const latest = dirs.filter(d => d.startsWith('export-')).sort().pop();
  if (latest) {
    const ovl = join(tempRoot, latest, 'ovl-97.png');
    if (existsSync(ovl)) {
      const out = join(__dirname, 'test-assets', 'ifc2-overlay-check.png');
      await fs.copyFile(ovl, out);
      console.log('Overlay copied to', out);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
