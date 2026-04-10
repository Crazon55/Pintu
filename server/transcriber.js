import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execFileAsync = promisify(execFile);

/**
 * Extract audio from video as mono 16kHz MP3 (small file for Whisper).
 */
export async function extractAudio(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioFrequency(16000)
      .audioChannels(1)
      .audioBitrate('64k')
      .format('mp3')
      .on('error', reject)
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
}

/**
 * Transcribe audio using faster-whisper (Python).
 * Returns { language, duration, segments: [{start, end, text}], words: [{start, end, text}] }
 */
export async function transcribeAudio(audioPath, modelSize = 'base', language = null) {
  const scriptPath = join(__dirname, 'whisper_transcribe.py');
  const args = [scriptPath, audioPath, modelSize];
  if (language) args.push(language);

  // Use venv Python if available, fallback to system python3
  const pythonPaths = [
    join('/home/ubuntu/whisper-env/bin/python'),
    'python3',
  ];
  let python = pythonPaths[1];
  for (const p of pythonPaths) {
    try { await execFileAsync(p, ['--version']); python = p; break; } catch {}
  }

  console.log(`[transcribe] Running: ${python} ${args.join(' ')}`);
  const { stdout, stderr } = await execFileAsync(python, args, {
    timeout: 600000, // 10 min max
    maxBuffer: 50 * 1024 * 1024, // 50MB
  });

  if (stderr) console.log('[transcribe] stderr:', stderr);

  const result = JSON.parse(stdout);
  console.log(`[transcribe] Done: ${result.segments.length} segments, lang=${result.language}, duration=${result.duration}s`);
  return result;
}

/**
 * Full pipeline: video → extract audio → transcribe → return segments.
 */
export async function transcribeVideo(videoPath, tempDir, options = {}) {
  const audioPath = join(tempDir, 'audio.mp3');
  const modelSize = options.modelSize || 'base';
  const language = options.language || null;

  console.log('[transcribe] Extracting audio...');
  await extractAudio(videoPath, audioPath);

  console.log('[transcribe] Transcribing...');
  const result = await transcribeAudio(audioPath, modelSize, language);

  // Clean up audio file
  await fs.unlink(audioPath).catch(() => {});

  return result;
}
