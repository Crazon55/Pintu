import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import archiver from 'archiver';
import { createVideoProcessor } from './videoProcessor.js';
import { createJobQueue } from './simpleQueue.js'; // Use your simpleQueue or Bull
import { transcribeVideo } from './transcriber.js';
import { generateASS } from './subtitleGenerator.js';
import { burnSubtitles } from './subtitleBurner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use('/outputs', express.static(join(__dirname, 'outputs')));
app.use('/assets', express.static(join(__dirname, 'assets')));

const upload = multer({ dest: join(__dirname, 'uploads') });
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

    console.log(`Processing ${validPresets.length} valid presets:`, validPresets.map(p => p.name));

    const showCredit = req.body.showCredit === 'true' || req.body.showCredit === true;
    
    const jobData = {
      videoPath: req.file.path,
      presets: validPresets,
      headline,
      fontScale: parseFloat(fontScale),
      wordSpacing: parseFloat(wordSpacing),
      videoScale: parseFloat(videoScale),
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
    onProgress: (p) => job.progress(p)
  });
});

// --- TRANSCRIPTION & SUBTITLE ENDPOINTS ---

app.post('/api/transcribe', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file received.' });
    const { modelSize, language } = req.body;
    const job = await jobQueue.add('transcribe', {
      videoPath: req.file.path,
      modelSize: modelSize || 'base',
      language: language || null,
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
  job.progress({ step: 'extracting', percent: 10 });
  const result = await transcribeVideo(job.data.videoPath, tempDir, {
    modelSize: job.data.modelSize,
    language: job.data.language,
  });
  job.progress({ step: 'done', percent: 100 });
  // Store the original video path so burn-subtitles can use it
  result.videoPath = job.data.videoPath;
  return result;
});

app.post('/api/burn-subtitles', express.json(), async (req, res) => {
  try {
    const { videoPath, segments, style } = req.body;
    if (!videoPath || !segments || !segments.length) {
      return res.status(400).json({ error: 'videoPath and segments are required.' });
    }

    const outputDir = join(__dirname, 'outputs', `subtitled-${Date.now()}`);
    await fs.mkdir(outputDir, { recursive: true });

    // Generate ASS file
    const assContent = generateASS(segments, style || {});
    const assPath = join(outputDir, 'subtitles.ass');
    await fs.writeFile(assPath, assContent, 'utf-8');

    // Burn subtitles
    const outputPath = join(outputDir, 'subtitled.mp4');
    await burnSubtitles(videoPath, assPath, outputPath);

    res.json({
      videoPath: outputPath,
      downloadUrl: `/outputs/${outputDir.split('outputs')[1].replace(/\\/g, '/')}subtitled.mp4`,
    });
  } catch (err) {
    console.error('[burn-subtitles] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Serve subtitled video for download
app.get('/api/download-subtitled', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found.' });
  }
  res.download(filePath);
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