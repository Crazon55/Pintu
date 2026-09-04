import './loadEnv.js';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { dirname, join, basename } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import archiver from 'archiver';
import ffmpeg from 'fluent-ffmpeg';
import { createVideoProcessor } from './videoProcessor.js';
import { createJobQueue } from './simpleQueue.js'; // Use your simpleQueue or Bull
import { transcribeVideo } from './groqTranscriber.js';
import {
  generateASS,
  generateNormalASS,
  generateIndianFounderASS,
  generateWordHighlightASS,
  generateBizzPlaybookASS,
  buildCaptionSpec,
} from './subtitleGenerator.js';
import {
  CAPTION_DEFAULT_STYLE,
  CAPTION_DEFAULT_NORMAL_STYLE,
  CAPTION_DEFAULT_BIZZ_STYLE,
  CAPTION_DEFAULT_BIZZ_INDIA_STYLE,
  CAPTION_DEFAULT_PODCAST_RED_STYLE,
  missingStyleKeys,
} from '../shared/captionDefaults.js';
import { uploadToCloudinary } from './cloudinaryUploader.js';
import { uploadExportToDrive, uploadBaseEditToDrive } from './driveUploader.js';
import { burnSubtitles } from './subtitleBurner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use('/outputs', express.static(join(__dirname, 'outputs')));
app.use('/assets', express.static(join(__dirname, 'assets')));

const upload = multer({
  dest: join(__dirname, 'uploads'),
  limits: { fieldSize: 32 * 1024 * 1024, fileSize: 512 * 1024 * 1024 },
});
const videoProcessor = createVideoProcessor();
const jobQueue = createJobQueue();

// Load presets from file (optional - client can send full preset objects)
let allPresets = [];
const presetsPath = join(__dirname, 'presets.json');
if (existsSync(presetsPath)) {
  try {
    const presetsData = await fs.readFile(presetsPath, 'utf-8');
    const presetsJson = JSON.parse(presetsData);
    allPresets = presetsJson.presets || [];
    console.log(`Loaded ${allPresets.length} presets from presets.json`);
  } catch (error) {
    console.warn('Could not parse presets.json:', error.message);
  }
} else {
  console.log('No presets.json found – using presets from client requests');
}

app.post('/api/export', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file received. Please upload a video.' });
    }
    const { presets: presetsRaw, headline, fontScale, wordSpacing, videoScale, fitMode, ideaName } = req.body;

    if (presetsRaw === undefined || presetsRaw === null) {
      console.error('[export] Presets missing from request body. Keys received:', Object.keys(req.body || {}));
      return res.status(400).json({
        error: 'Template data (presets) was not received. If using ngrok, try again or use a direct connection.'
      });
    }

    let parsedPresets;
    try {
      parsedPresets = typeof presetsRaw === 'string' ? JSON.parse(presetsRaw) : presetsRaw;
    } catch (e) {
      console.error('[export] Invalid presets JSON:', e.message);
      return res.status(400).json({ error: 'Invalid template data (presets) format.' });
    }

    // If presets are IDs, load full objects from presets.json
    let selectedPresets;
    if (Array.isArray(parsedPresets) && parsedPresets.length > 0) {
      if (typeof parsedPresets[0] === 'number' || typeof parsedPresets[0] === 'string') {
        // It's an array of IDs, load from presets.json
        selectedPresets = parsedPresets
          .map(id => allPresets.find(p => p.id === parseInt(id)))
          .filter(p => p !== undefined);
        console.log(`Loaded ${selectedPresets.length} presets from IDs:`, parsedPresets);
      } else {
        // It's already an array of full objects
        selectedPresets = parsedPresets;
        console.log(`Using ${selectedPresets.length} preset objects from request`);
      }
    } else {
      return res.status(400).json({ error: 'Invalid presets format: expected non-empty array.' });
    }

    if (selectedPresets.length === 0) {
      return res.status(400).json({ error: 'No valid presets found.' });
    }

    // Require presets to have template fields so we don't render "raw" video
    const requiredKeys = ['name', 'layout'];
    const validPresets = selectedPresets.filter(p => {
      if (!p || !p.name) {
        console.warn('Skipping invalid preset (missing name):', p);
        return false;
      }
      const missing = requiredKeys.filter(k => p[k] === undefined || p[k] === null);
      if (missing.length > 0) {
        console.warn(`Skipping incomplete preset "${p.name}" (missing: ${missing.join(', ')})`);
        return false;
      }
      return true;
    });

    if (validPresets.length === 0) {
      return res.status(400).json({
        error: 'No valid templates: each preset must include name and layout. If using ngrok, the request may be truncated – try fewer presets or a smaller video.'
      });
    }

    const parsedVideoScale = Number.parseFloat(videoScale);
    const safeVideoScale = Number.isFinite(parsedVideoScale) ? parsedVideoScale : 100;
    // Prefer per-preset baked videoScale from the client; fall back to top-level field
    const presetsWithScale = validPresets.map(p => ({
      ...p,
      videoScale: Number.isFinite(Number(p.videoScale)) ? Number(p.videoScale) : safeVideoScale,
      fitMode: p.fitMode || fitMode || 'cover',
    }));

    console.log(`Processing ${presetsWithScale.length} valid presets:`, presetsWithScale.map(p => p.name));
    console.log(`[export] videoScale=${safeVideoScale} fitMode=${fitMode} perPreset=`,
      presetsWithScale.map(p => `${p.name}:${p.videoScale}%@${p.position?.x ?? 50},${p.position?.y ?? 50}`).join(' | '));

    const showCredit = req.body.showCredit === 'true' || req.body.showCredit === true;

    const jobData = {
      videoPath: req.file.path,
      presets: presetsWithScale,
      headline,
      fontScale: parseFloat(fontScale),
      wordSpacing: parseFloat(wordSpacing),
      videoScale: safeVideoScale,
      fitMode,
      showCredit,
      ideaName: typeof ideaName === 'string' ? ideaName : ''
    };

    const job = await jobQueue.add('process-video', jobData);
    res.json({ jobId: job.id });
  } catch (error) {
    console.error('Error in /api/export:', error);
    res.status(500).json({ error: error.message });
  }
});

// Status and Download routes (Full Logic)
app.get('/api/job/:jobId', async (req, res) => {
  const job = await jobQueue.getJob(req.params.jobId);
  res.json(job ? { state: job.state, progress: job._progress, returnvalue: job.returnvalue, failedReason: job.failedReason } : { error: '404' });
});

// Stop an export: cancel waiting jobs immediately, kill active FFmpeg
app.post('/api/job/:jobId/cancel', async (req, res) => {
  try {
    const result = await jobQueue.cancel(req.params.jobId);
    if (!result.ok && result.reason === 'not_found') {
      return res.status(404).json({ error: 'Job not found' });
    }
    console.log(`[cancel] Job ${req.params.jobId}:`, result);
    res.json(result);
  } catch (err) {
    console.error('[cancel] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/download/:jobId', async (req, res) => {
  const job = await jobQueue.getJob(req.params.jobId);
  if (!job?.returnvalue) return res.status(404).json({ error: 'Not ready' });

  const videoPaths = job.returnvalue.videoPaths || [];
  if (videoPaths.length === 0) return res.status(404).json({ error: 'No videos to download' });

  // Create zip file
  const zipFileName = `export-${req.params.jobId}.zip`;
  const zipPath = join(job.returnvalue.outputDir, zipFileName);

  return new Promise(async (resolve, reject) => {
    // Check if video files exist before creating zip
    const existingVideos = [];
    for (const videoPath of videoPaths) {
      try {
        await fs.access(videoPath);
        existingVideos.push(videoPath);
        console.log(`Video file exists: ${videoPath}`);
      } catch (err) {
        console.warn(`Video file not found: ${videoPath}`, err.message);
      }
    }

    if (existingVideos.length === 0) {
      return res.status(404).json({ error: 'No video files found to zip' });
    }

    console.log(`Creating zip with ${existingVideos.length} video file(s)...`);

    const output = createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level
    });

    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`Zip file created: ${zipPath} (${sizeInMB} MB)`);

      if (archive.pointer() === 0) {
        console.error('Warning: Zip file is empty!');
        return res.status(500).json({ error: 'Zip file is empty' });
      }

      res.download(zipPath, zipFileName, (err) => {
        if (err) {
          console.error('Error sending zip file:', err);
          reject(err);
        } else {
          // Clean up zip file after download (optional, can be done later)
          setTimeout(() => {
            fs.unlink(zipPath).catch(err => console.error('Error deleting zip file:', err));
          }, 60000); // Delete after 60 seconds
          resolve();
        }
      });
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create zip file: ' + err.message });
      reject(err);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Archive warning:', err);
      } else {
        console.error('Archive warning:', err);
      }
    });

    archive.pipe(output);

    // Add all existing video files to the zip (re-check existence to avoid race condition)
    for (const videoPath of existingVideos) {
      try {
        await fs.access(videoPath);
        const fileName = videoPath.split(/[/\\]/).pop();
        console.log(`Adding to zip: ${fileName} from ${videoPath}`);
        archive.file(videoPath, { name: fileName });
      } catch (e) {
        console.warn(`Skipping missing file during zip: ${videoPath}`);
      }
    }

    archive.finalize();
  });
});

app.get('/api/download-file/:jobId/:index', async (req, res) => {
  const job = await jobQueue.getJob(req.params.jobId);
  res.download(job.returnvalue.videoPaths[req.params.index]);
});

// Process Job
jobQueue.process('process-video', 1, async (job) => {
  return await videoProcessor.processVideo({
    ...job.data,
    onProgress: (p) => job.progress(p),
    isCancelled: () => !!job._cancelled,
    registerKill: (killFn) => {
      job._killActive = killFn;
    },
  });
});

// --- TRANSCRIPTION & WORD-LEVEL CAPTIONS ---

app.post('/api/transcribe', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file received.' });
    const { language } = req.body;
    const job = await jobQueue.add('transcribe', {
      videoPath: req.file.path,
      language: language && language !== 'undefined' ? language : null,
    });
    res.json({ jobId: job.id });
  } catch (err) {
    console.error('[transcribe] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

jobQueue.process('transcribe', 1, async (job) => {
  const tempDir = join(__dirname, 'temp', `transcribe-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  job.progress({ step: 'transcribing', percent: 20 });
  const result = await transcribeVideo(job.data.videoPath, tempDir, {
    language: job.data.language,
  });
  console.log(`[transcribe] engine=${result.engine || 'unknown'}`);
  job.progress({ step: 'done', percent: 100 });
  // burn-subtitles needs the original video
  result.videoPath = job.data.videoPath;
  return result;
});

// Preview the grouped caption layout (no rendering) — useful for tuning
// word-per-block and timing before spending an encode.
app.post('/api/caption-spec', express.json(), async (req, res) => {
  try {
    const { words, style } = req.body;
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: 'words[] is required.' });
    }
    res.json(buildCaptionSpec(words, style || {}));
  } catch (err) {
    console.error('[caption-spec] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// A burn is a full FFmpeg encode. Bulk callers can fire many of these at once,
// so run them one at a time — otherwise peak memory scales with request count
// instead of staying flat like the export queue.
let burnLane = Promise.resolve();
let burnsWaiting = 0;
function serializeBurn(task) {
  burnsWaiting++;
  const run = burnLane.then(task, task);
  burnLane = run.then(() => { burnsWaiting--; }, () => { burnsWaiting--; });
  return run;
}

// Author-space the caption editor lays out in: x/font against 720, y against 1280.
const CAPTION_AUTHOR_W = 720;
const CAPTION_AUTHOR_H = 1280;

function probeVideoSize(videoPath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return resolve(null);
      const v = metadata?.streams?.find(s => s.codec_type === 'video');
      if (!v?.width || !v?.height) return resolve(null);
      // Rotated phone footage reports pre-rotation dimensions; swap so we match display.
      const rot = Math.abs(Number(v.rotation ?? v.tags?.rotate ?? 0)) % 180;
      resolve(rot === 90
        ? { width: v.height, height: v.width }
        : { width: v.width, height: v.height });
    });
  });
}

/**
 * Map editor 720×1280 layout into the clip's pixels.
 *
 * Use ONE uniform scale (width-based, same as the preview's font scale = stageW/720)
 * for fonts, gaps, glow, AND vertical positions — then letterbox Y into the frame.
 * Scaling X by sx and Y by sy independently was squashing line gaps on landscape
 * clips (1024×768 → sy/sx ≈ 0.42) so the white line crashed into the red line.
 */
function captionResolutionFor(size, style, previewBlocks) {
  if (!size?.width || !size?.height) {
    return { style, previewBlocks, resX: CAPTION_AUTHOR_W, resY: CAPTION_AUTHOR_H };
  }
  const resX = size.width;
  const resY = size.height;
  // Type scales from the content box width / 720, which is what the preview does.
  const s = resX / CAPTION_AUTHOR_W;
  // Vertical placement is a FRACTION OF THE FRAME HEIGHT, because that is what the preview
  // draws: every word is positioned with top: (y / 1280) * 100% of the stage, and the stage
  // carries the clip's own aspect. Scaling y by the width factor and centring the 720x1280
  // canvas instead only agreed with the preview on a 9:16 clip — on 16:9 podcast footage it
  // put the caption 24 points of frame height too high, which is the export/preview drift.
  const sy = resY / CAPTION_AUTHOR_H;
  const mul = (v, k, digits = 2) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return v;
    const f = 10 ** digits;
    return Math.round(n * k * f) / f;
  };

  const scaled = { ...style, resX, resY };
  for (const k of ['fontSize', 'posX', 'lineStartX', 'maxLineWidth', 'letterSpacing', 'outline', 'glowBlur', 'glowBorder', 'innerGlowBlur', 'shadowOffsetX', 'shadowOffsetY', 'shadowBlur', 'baseEdgeHighlight', 'riseY']) {
    if (style?.[k] != null) scaled[k] = mul(style[k], s);
  }
  if (style?.posY != null) {
    scaled.posY = Math.round(mul(style.posY, sy, 1));
  }
  if (Number.isFinite(Number(scaled.fontSize))) {
    scaled.fontSize = Math.max(1, Math.round(Number(scaled.fontSize)));
  }
  if (Number.isFinite(Number(scaled.posX))) scaled.posX = Math.round(Number(scaled.posX));

  const scaledBlocks = Array.isArray(previewBlocks)
    ? previewBlocks.map((b) => ({
      ...b,
      words: (b.words || []).map((w) => ({
        ...w,
        x: Number.isFinite(Number(w.x)) ? Math.round(Number(w.x) * s) : w.x,
        y: Number.isFinite(Number(w.y)) ? Math.round(Number(w.y) * sy) : w.y,
        w: Number.isFinite(Number(w.w)) ? Number(w.w) * s : w.w,
      })),
    }))
    : previewBlocks;
  return { style: scaled, previewBlocks: scaledBlocks, resX, resY };
}

app.post('/api/burn-subtitles', express.json(), async (req, res) => {
  try {
    const { videoPath, segments, words, previewBlocks, style, captionStyle = 'word-highlight' } = req.body;
    if (!videoPath || (!segments?.length && !words?.length)) {
      return res.status(400).json({ error: 'videoPath and segments/words are required.' });
    }
    if (!existsSync(videoPath)) {
      return res.status(404).json({ error: `Video not found: ${videoPath}` });
    }

    const probed = await probeVideoSize(videoPath);
    const { style: fittedStyle, previewBlocks: fittedBlocks, resX, resY } =
      captionResolutionFor(probed, style || {}, previewBlocks);

    // Route by what the style IS, not only the captionStyle string — a mismatched
    // label (e.g. an older client sending an unknown token) used to fall through to
    // generateNormalASS and burn flat red+black-outline captions while the preview
    // showed Podcast Red glow / white edge / two-tone lines.
    const isPodcastRed = style?.roleBy === 'line'
      || captionStyle === 'podcast-red'
      || captionStyle === 'podcastred';
    const isWordHighlight = captionStyle === 'word-highlight' || isPodcastRed;
    const lookDefaults = (() => {
      if (captionStyle === 'bizz-playbook') {
        return style?.glow
          ? CAPTION_DEFAULT_BIZZ_INDIA_STYLE
          : CAPTION_DEFAULT_BIZZ_STYLE;
      }
      if (captionStyle === 'normal' && !isPodcastRed) return CAPTION_DEFAULT_NORMAL_STYLE;
      if (isPodcastRed) return CAPTION_DEFAULT_PODCAST_RED_STYLE;
      if (isWordHighlight) return CAPTION_DEFAULT_STYLE;
      return CAPTION_DEFAULT_STYLE;
    })();
    const mergedStyle = {
      ...lookDefaults,
      ...(isPodcastRed ? { roleBy: 'line', outline: 0, textCase: 'upper' } : {}),
      ...fittedStyle,
      ...(isPodcastRed ? { outline: 0 } : {}),
    };
    const missing = missingStyleKeys(style || {}, lookDefaults);
    if (missing.length) {
      console.warn(`[burn-subtitles] PARITY: ${missing.length} setting(s) not sent by the editor, ` +
        `filled from ${isPodcastRed ? 'podcast-red' : captionStyle} defaults: ${missing.join(', ')}`);
    } else {
      console.log('[burn-subtitles] PARITY: all style settings supplied by the editor');
    }
    console.log(
      `[burn-subtitles] clip=${probed ? `${probed.width}x${probed.height}` : 'unprobed'} ` +
      `PlayRes=${resX}x${resY} fontScale=${probed ? (probed.width / CAPTION_AUTHOR_W).toFixed(3) : 'n/a'} ` +
      `generator=${isWordHighlight ? (isPodcastRed ? 'podcast-red' : 'word-highlight') : captionStyle} ` +
      `font ${style?.fontSize} -> ${mergedStyle.fontSize} posY ${style?.posY} -> ${mergedStyle.posY} ` +
      `roleBy=${mergedStyle.roleBy} baseFont=${mergedStyle.baseFontName} oblique=${mergedStyle.obliqueDeg} ` +
      `glow=${mergedStyle.glow} glowBlur=${mergedStyle.glowBlur} edge=${mergedStyle.baseEdgeHighlight}`
    );

    const stamp = Date.now();
    const outputDir = join(__dirname, 'outputs', `subtitled-${stamp}`);
    await fs.mkdir(outputDir, { recursive: true });

    let assContent;
    if (isWordHighlight) {
      if (!words?.length) {
        return res.status(400).json({ error: 'word-highlight captions require word-level timestamps.' });
      }
      assContent = generateWordHighlightASS(words, { ...mergedStyle, previewBlocks: fittedBlocks });
    } else if (captionStyle === 'bizz-playbook') {
      assContent = generateBizzPlaybookASS(words?.length ? words : segments, mergedStyle);
    } else if (captionStyle === 'indian-founder') {
      assContent = generateIndianFounderASS(words || segments, mergedStyle);
    } else {
      const source = words?.length ? words : segments;
      assContent = generateNormalASS(source, mergedStyle);
    }

    const assPath = join(outputDir, 'subtitles.ass');
    await fs.writeFile(assPath, assContent, 'utf-8');

    const outputPath = join(outputDir, 'subtitled.mp4');
    if (burnsWaiting > 0) console.log(`[burn-subtitles] queued behind ${burnsWaiting} burn(s)`);
    await serializeBurn(() => burnSubtitles(videoPath, assPath, outputPath));

    res.json({
      videoPath: outputPath,
      captionStyle,
      downloadUrl: `/outputs/subtitled-${stamp}/subtitled.mp4`,
    });
  } catch (err) {
    console.error('[burn-subtitles] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/download-subtitled', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found.' });
  }
  res.download(filePath);
});

// --- GOOGLE DRIVE UPLOAD ---

// Upload exported videos to Cloudinary after export completes
app.post('/api/upload-to-cloud', express.json(), async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId is required.' });

    const job = await jobQueue.getJob(jobId);
    if (!job || job.state !== 'completed' || !job.returnvalue?.videoPaths) {
      return res.status(400).json({ error: 'Job not found or not completed.' });
    }

    const videoPaths = job.returnvalue.videoPaths.filter(p => existsSync(p));
    if (videoPaths.length === 0) {
      return res.status(400).json({ error: 'No video files found.' });
    }

    const results = [];
    for (const vp of videoPaths) {
      const result = await uploadToCloudinary(vp, basename(vp));
      results.push(result);
    }
    res.json({ success: true, files: results });
  } catch (err) {
    console.error('[cloudinary] Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload-to-drive', express.json(), async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId is required.' });

    const job = await jobQueue.getJob(jobId);
    if (!job || job.state !== 'completed' || !job.returnvalue?.videoPaths) {
      return res.status(400).json({ error: 'Job not found or not completed.' });
    }

    const ideaName = (typeof job.data?.ideaName === 'string' && job.data.ideaName.trim())
      ? job.data.ideaName.trim()
      : 'untitled';

    // Prefer explicit pageName pairing from export; fall back to presets / basename
    const paired = Array.isArray(job.returnvalue.videos) && job.returnvalue.videos.length > 0
      ? job.returnvalue.videos
        .filter((v) => v?.path && existsSync(v.path))
        .map((v) => ({ path: v.path, pageName: v.pageName || 'unknown-page' }))
      : job.returnvalue.videoPaths
        .filter((p) => existsSync(p))
        .map((path, i) => ({
          path,
          pageName: job.data?.presets?.[i]?.name || basename(path, '.mp4') || 'unknown-page',
        }));

    if (paired.length === 0) {
      return res.status(400).json({ error: 'No video files found.' });
    }

    const results = [];
    for (const { path: vp, pageName } of paired) {
      const result = await uploadExportToDrive(vp, {
        pageName,
        ideaName,
        fileName: basename(vp),
      });
      results.push(result);
    }
    res.json({ success: true, files: results });
  } catch (err) {
    console.error('[drive] Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload-base-edit-file', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file uploaded.' });

    const videoName = req.body.videoName || req.file.originalname || 'base-edit.mp4';
    const withCaptions = req.body.withCaptions === 'true';

    const result = await uploadBaseEditToDrive(req.file.path, { videoName });

    console.log(`[drive] Base edit uploaded: ${videoName} ${withCaptions ? '(with captions)' : ''}`);
    res.json({ success: true, file: result });
  } catch (err) {
    console.error('[drive] Base edit upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use((err, req, res, next) => {
  console.error('[express]', err);
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || (err.name === 'MulterError' ? 400 : 500);
  res.status(status).json({ error: err.message || 'Server error' });
});

const PORT = Number(process.env.PORT) || 3002;
const server = app.listen(PORT, () => console.log(`Server running on ${PORT}`));
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process using it, or set PORT=3001 and restart.`);
    process.exit(1);
  }
  throw err;
});