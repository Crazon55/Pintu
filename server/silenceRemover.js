import ffmpeg from 'fluent-ffmpeg';
import { join } from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';

/**
 * Detect silent segments in a video using FFmpeg's silencedetect filter.
 * Returns an array of { start, end } objects representing silent ranges.
 */
function detectSilence(videoPath, { silenceThreshold = -30, minSilenceDuration = 0.5 } = {}) {
  return new Promise((resolve, reject) => {
    const silences = [];
    let currentStart = null;

    ffmpeg(videoPath)
      .audioFilters(`silencedetect=noise=${silenceThreshold}dB:d=${minSilenceDuration}`)
      .format('null')
      .output('-')
      .on('stderr', (line) => {
        const startMatch = line.match(/silence_start:\s*([\d.]+)/);
        const endMatch = line.match(/silence_end:\s*([\d.]+)/);

        if (startMatch) {
          currentStart = parseFloat(startMatch[1]);
        }
        if (endMatch && currentStart !== null) {
          silences.push({ start: currentStart, end: parseFloat(endMatch[1]) });
          currentStart = null;
        }
      })
      .on('error', reject)
      .on('end', () => resolve(silences))
      .run();
  });
}

/**
 * Get total duration of a video in seconds.
 */
function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

/**
 * Given silent ranges + total duration, return the non-silent segments to keep.
 * Adds a small padding around cuts to avoid abrupt audio jumps.
 */
function getNonSilentSegments(silences, totalDuration, padding = 0.1) {
  if (silences.length === 0) return [{ start: 0, end: totalDuration }];

  const segments = [];
  let cursor = 0;

  for (const silence of silences) {
    const segStart = cursor;
    const segEnd = Math.min(silence.start + padding, totalDuration);

    if (segEnd - segStart > 0.05) {
      segments.push({ start: segStart, end: segEnd });
    }
    cursor = Math.max(silence.end - padding, 0);
  }

  if (cursor < totalDuration) {
    segments.push({ start: cursor, end: totalDuration });
  }

  return segments;
}

/**
 * Remove silent parts from a video by concatenating the non-silent segments.
 * Uses FFmpeg's complex filter with trim + concat.
 */
function concatenateSegments(videoPath, segments, outputPath) {
  return new Promise((resolve, reject) => {
    const n = segments.length;

    // Build the complex filter: trim each segment, then concat them all
    const filterParts = [];
    const concatInputs = [];

    for (let i = 0; i < n; i++) {
      const { start, end } = segments[i];
      filterParts.push(
        `[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[v${i}]`
      );
      filterParts.push(
        `[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a${i}]`
      );
      concatInputs.push(`[v${i}][a${i}]`);
    }

    filterParts.push(
      `${concatInputs.join('')}concat=n=${n}:v=1:a=1[outv][outa]`
    );

    const filterComplex = filterParts.join(';');

    ffmpeg(videoPath)
      .complexFilter(filterComplex, ['outv', 'outa'])
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 20',
        '-pix_fmt yuv420p',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
      ])
      .on('start', (cmd) => console.log('[silenceRemover] FFmpeg:', cmd))
      .on('error', (err, stdout, stderr) => {
        console.error('[silenceRemover] Error:', err.message);
        if (stderr) console.error('[silenceRemover] stderr:', stderr);
        reject(err);
      })
      .on('end', () => {
        console.log(`[silenceRemover] Done: ${outputPath}`);
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

/**
 * Full pipeline: detect silences, compute non-silent segments, concatenate.
 *
 * @param {string} videoPath - Input video file
 * @param {string} outputDir - Directory for output
 * @param {object} options
 * @param {number} options.silenceThreshold - dB threshold (default -30)
 * @param {number} options.minSilenceDuration - Min silence length in seconds (default 0.5)
 * @param {number} options.padding - Seconds of padding around cuts (default 0.1)
 * @param {function} options.onProgress - Progress callback
 * @returns {{ outputPath, silences, segments, originalDuration, newDuration, removedDuration }}
 */
export async function removeSilence(videoPath, outputDir, options = {}) {
  const {
    silenceThreshold = -30,
    minSilenceDuration = 0.5,
    padding = 0.1,
    onProgress,
  } = options;

  await fs.mkdir(outputDir, { recursive: true });

  onProgress?.({ step: 'Detecting silences', percent: 10 });
  console.log(`[silenceRemover] Detecting silence (threshold=${silenceThreshold}dB, min=${minSilenceDuration}s)...`);

  const [silences, totalDuration] = await Promise.all([
    detectSilence(videoPath, { silenceThreshold, minSilenceDuration }),
    getVideoDuration(videoPath),
  ]);

  console.log(`[silenceRemover] Found ${silences.length} silent segments in ${totalDuration.toFixed(1)}s video`);

  if (silences.length === 0) {
    onProgress?.({ step: 'No silences found', percent: 100 });
    // Copy the original file as-is
    const outputPath = join(outputDir, 'no-silence.mp4');
    await fs.copyFile(videoPath, outputPath);
    return {
      outputPath,
      silences: [],
      segments: [{ start: 0, end: totalDuration }],
      originalDuration: totalDuration,
      newDuration: totalDuration,
      removedDuration: 0,
    };
  }

  const segments = getNonSilentSegments(silences, totalDuration, padding);
  const newDuration = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
  const removedDuration = totalDuration - newDuration;

  console.log(`[silenceRemover] Keeping ${segments.length} segments, removing ${removedDuration.toFixed(1)}s of silence`);

  onProgress?.({ step: 'Removing silences', percent: 40 });

  const outputPath = join(outputDir, 'no-silence.mp4');
  await concatenateSegments(videoPath, segments, outputPath);

  onProgress?.({ step: 'Done', percent: 100 });

  return {
    outputPath,
    silences,
    segments,
    originalDuration: totalDuration,
    newDuration,
    removedDuration,
  };
}
