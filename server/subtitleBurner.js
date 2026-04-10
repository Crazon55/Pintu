import ffmpeg from 'fluent-ffmpeg';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Burn ASS subtitles into a video using FFmpeg's ass filter.
 *
 * @param {string} videoPath - Input video path
 * @param {string} assPath - ASS subtitle file path
 * @param {string} outputPath - Output video path
 * @returns {Promise<string>} Output file path
 */
export async function burnSubtitles(videoPath, assPath, outputPath) {
  const fontsDir = resolve(__dirname, 'assets', 'fonts');
  // Escape paths for FFmpeg filter (colons and backslashes)
  const assEscaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  const fontsDirEscaped = fontsDir.replace(/\\/g, '/').replace(/:/g, '\\:');

  return new Promise((resolve, reject) => {
    console.log(`[burnSubtitles] Input: ${videoPath}`);
    console.log(`[burnSubtitles] ASS: ${assPath}`);
    console.log(`[burnSubtitles] Output: ${outputPath}`);
    console.log(`[burnSubtitles] Fonts: ${fontsDir}`);

    ffmpeg(videoPath)
      .videoFilters(`ass=${assEscaped}:fontsdir=${fontsDirEscaped}`)
      .outputOptions([
        '-c:v libx264',
        '-preset superfast',
        '-crf 20',
        '-pix_fmt yuv420p',
        '-c:a copy',
      ])
      .on('start', (cmd) => console.log('[burnSubtitles] FFmpeg:', cmd))
      .on('error', (err, stdout, stderr) => {
        console.error('[burnSubtitles] Error:', err.message);
        if (stderr) console.error('[burnSubtitles] stderr:', stderr);
        reject(err);
      })
      .on('end', () => {
        console.log(`[burnSubtitles] Done: ${outputPath}`);
        resolve(outputPath);
      })
      .save(outputPath);
  });
}
