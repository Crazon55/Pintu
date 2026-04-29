import ffmpeg from 'fluent-ffmpeg';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { loadSync as opentypeLoad } from 'opentype.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- FFmpeg path setup (required on Windows when ffmpeg is not in PATH) ---
function setupFfmpegPaths() {
  const isWin = process.platform === 'win32';
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
    console.log('✓ Using FFMPEG_PATH:', process.env.FFMPEG_PATH);
  }
  if (process.env.FFPROBE_PATH && existsSync(process.env.FFPROBE_PATH)) {
    ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
    console.log('✓ Using FFPROBE_PATH:', process.env.FFPROBE_PATH);
  }
  // On Windows, try to find ffmpeg in PATH so we can set it explicitly (avoids lookup issues)
  if (isWin && !process.env.FFMPEG_PATH) {
    try {
      const where = execSync('where ffmpeg', { encoding: 'utf-8' });
      const firstPath = where.split('\n')[0]?.trim();
      if (firstPath && existsSync(firstPath)) {
        ffmpeg.setFfmpegPath(firstPath);
        console.log('✓ FFmpeg found (Windows):', firstPath);
      }
    } catch (_) {
      console.warn('⚠ FFmpeg not found in PATH. Set FFMPEG_PATH and FFPROBE_PATH env vars or add ffmpeg to PATH.');
    }
  }
}
function verifyFfmpeg() {
  ffmpeg.getAvailableFormats((err) => {
    if (err) {
      console.error('⚠ FFmpeg check failed:', err.message);
      console.warn('  Server-side export will fail until ffmpeg is installed and in PATH (or set FFMPEG_PATH).');
    } else {
      console.log('✓ FFmpeg is available for server-side export');
    }
  });
}
setupFfmpegPaths();
verifyFfmpeg();

// Register Inter fonts for export overlay generation (headline, footer, watermark).
// Uses fonts from server/assets/fonts/ (Inter_18pt-Regular.ttf, Inter_18pt-Bold.ttf, Inter_18pt-Thin.ttf or Inter-Regular.ttf, Inter-Bold.ttf, Inter-Thin.ttf).
const fontsDir = join(__dirname, 'assets', 'fonts');
const fontNames = {
  regular: ['Inter_18pt-Regular.ttf', 'Inter-Regular.ttf'],
  bold: ['Inter_18pt-Bold.ttf', 'Inter-Bold.ttf'],
  thin: ['Inter_18pt-Thin.ttf', 'Inter-Thin.ttf']
};
function findFont(names) {
  for (const n of names) {
    const p = join(fontsDir, n);
    if (existsSync(p)) return p;
  }
  return null;
}
const interRegular = findFont(fontNames.regular);
const interBold = findFont(fontNames.bold);
const interThin = findFont(fontNames.thin);

if (interRegular) {
  registerFont(interRegular, { family: 'Inter', weight: 'normal' });
  console.log('✓ Inter Regular font registered');
}
if (interBold) {
  registerFont(interBold, { family: 'Inter', weight: 'bold' });
  console.log('✓ Inter Bold font registered');
}
if (interThin) {
  registerFont(interThin, { family: 'Inter', weight: 'normal' });
  console.log('✓ Inter Thin font registered');
} else {
  console.warn('⚠ Inter Thin not found. Tried:', fontNames.thin.join(', '));
}

// Register Poppins for theprimefounder preset. On Windows, node-canvas often fails to match
// family+weight, so register each file as a distinct family name and use those when drawing.
const poppinsRegular = resolve(fontsDir, 'Poppins-Regular.ttf');
const poppinsBold = resolve(fontsDir, 'Poppins-Bold.ttf');
const poppinsThin = resolve(fontsDir, 'Poppins-Thin.ttf');
if (existsSync(poppinsRegular)) {
  registerFont(poppinsRegular, { family: 'Poppins Regular', weight: 'normal', style: 'normal' });
  registerFont(poppinsRegular, { family: 'Poppins', weight: 'normal', style: 'normal' });
  console.log('✓ Poppins Regular font registered');
}
if (existsSync(poppinsBold)) {
  registerFont(poppinsBold, { family: 'Poppins Bold', weight: 'bold', style: 'normal' });
  registerFont(poppinsBold, { family: 'Poppins', weight: 'bold', style: 'normal' });
  // PoppinsBoldM: registered as weight:normal so canvas uses raw TTF metrics without
  // GDI synthetic-bold widening (which over-widens uppercase I/T in Poppins Bold on Windows).
  registerFont(poppinsBold, { family: 'PoppinsBoldM', weight: 'normal', style: 'normal' });
  console.log('✓ Poppins Bold font registered');
}
if (existsSync(poppinsThin)) {
  registerFont(poppinsThin, { family: 'Poppins Thin', weight: 'normal', style: 'normal' });
  console.log('✓ Poppins Thin font registered');
}

// Load Poppins TTF via opentype.js for pixel-accurate advance width measurement.
// Canvas falls back to Sans on Windows (pango can't find unregistered fonts by alias),
// so we bypass canvas measureText entirely for Poppins and read directly from the TTF.
let _otPoppinsReg = null, _otPoppinsBold = null;
try {
  if (existsSync(poppinsRegular)) { _otPoppinsReg = opentypeLoad(poppinsRegular); console.log('✓ Poppins Regular loaded via opentype.js'); }
  if (existsSync(poppinsBold))    { _otPoppinsBold = opentypeLoad(poppinsBold);   console.log('✓ Poppins Bold loaded via opentype.js'); }
} catch(e) { console.warn('opentype.js load failed:', e.message); }

// Measure a string's advance width in px using opentype.js (same metrics FFmpeg uses).
function measurePoppins(text, size, bold) {
  const font = bold ? _otPoppinsBold : _otPoppinsReg;
  if (!font) return size * text.length * 0.6; // fallback if font not loaded
  return font.getAdvanceWidth(text, size);
}

const stripHTML = (html) => (html ? html.replace(/<[^>]*>/g, '') : '');

// --- EMOJI SUPPORT (Twemoji images for color emoji in export) ---
const EMOJI_RE = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})[\uFE0F\u200D\p{Emoji_Presentation}\p{Extended_Pictographic}]*/gu;

function splitEmojiText(text) {
  const parts = [];
  let last = 0;
  let m;
  EMOJI_RE.lastIndex = 0;
  while ((m = EMOJI_RE.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    parts.push({ type: 'emoji', value: m[0] });
    last = EMOJI_RE.lastIndex;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}

function textHasEmoji(text) { EMOJI_RE.lastIndex = 0; return EMOJI_RE.test(text); }

function emojiCodepoint(emoji) {
  return [...emoji].map(c => c.codePointAt(0).toString(16)).filter(h => h !== 'fe0f').join('-');
}

const emojiCache = {};
async function loadTwemoji(emoji) {
  const cp = emojiCodepoint(emoji);
  if (cp in emojiCache) return emojiCache[cp];
  const cacheDir = join(__dirname, 'assets', 'emoji-cache');
  const cachePath = join(cacheDir, `${cp}.png`);
  try {
    if (existsSync(cachePath)) { const img = await loadImage(cachePath); emojiCache[cp] = img; return img; }
    await fs.mkdir(cacheDir, { recursive: true });
    const res = await fetch(`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${cp}.png`);
    if (!res.ok) { emojiCache[cp] = null; return null; }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(cachePath, buf);
    const img = await loadImage(buf);
    emojiCache[cp] = img;
    return img;
  } catch (e) { console.warn(`Emoji load failed (${cp}):`, e.message); emojiCache[cp] = null; return null; }
}

// Measure token width, using emoji image size for emoji parts
function measureTokenWidth(ctx, text, fontSize, bold, fontFamily) {
  if (!textHasEmoji(text)) {
    ctx.font = `${bold ? 'bold' : 'normal'} ${fontSize}px ${fontFamily}`;
    return ctx.measureText(text).width;
  }
  let w = 0;
  for (const p of splitEmojiText(text)) {
    if (p.type === 'emoji') { w += fontSize * 0.85; }
    else { ctx.font = `${bold ? 'bold' : 'normal'} ${fontSize}px ${fontFamily}`; w += ctx.measureText(p.value).width; }
  }
  return w;
}

// Pre-load all emoji images found in rich lines
async function preloadEmojis(richLines) {
  const promises = [];
  const seen = new Set();
  for (const line of richLines) {
    for (const t of line.tokens) {
      if (textHasEmoji(t.text)) {
        for (const p of splitEmojiText(t.text)) {
          if (p.type === 'emoji' && !seen.has(p.value)) { seen.add(p.value); promises.push(loadTwemoji(p.value)); }
        }
      }
    }
  }
  await Promise.all(promises);
}

// Clean HTML entities, normalize <br> to newline (so it never shows as literal text), and normalize spaces
const cleanHTML = (html) => {
  if (!html) return '';
  let cleaned = html.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  // Support WhatsApp-style *word* / **word** syntax as bold: convert to <b>word</b>
  // Order matters: handle **...** first so it doesn't get partially consumed by the single-* pass.
  cleaned = cleaned.replace(/\*\*(\S(?:[\s\S]*?\S)?)\*\*/g, '<b>$1</b>');
  cleaned = cleaned.replace(/\*(\S(?:[\s\S]*?\S)?)\*/g, '<b>$1</b>');
  // Replace <br> / <br/> / <br /> with newline so line breaks show in export (and literal "<br>" never appears)
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  // Block elements (DIV, P) from editor Enter key -> newline so multi-line hook matches preview
  cleaned = cleaned.replace(/<\/div\s*>/gi, '\n');
  cleaned = cleaned.replace(/<\/p\s*>/gi, '\n');
  cleaned = cleaned.replace(/<div[^>]*>/gi, '');
  cleaned = cleaned.replace(/<p[^>]*>/gi, '');
  // Strip any remaining HTML tags (span, font, i, etc.) but keep <b>/</b> for bold detection
  cleaned = cleaned.replace(/<(?!\/?b\b)[^>]*>/gi, '');
  // Normalize <b style="..."> or <b class="..."> to plain <b>
  cleaned = cleaned.replace(/<b\s[^>]*>/gi, '<b>');
  // Collapse spaces/tabs only (keep newlines so multi-line headlines work)
  cleaned = cleaned.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n');
  return cleaned.trim();
};

/**
 * Generate overlay for hook_video layout: black bg, hook text at top,
 * transparent video hole in the middle, black at bottom.
 * Logo is NOT drawn on canvas — it's overlaid in FFmpeg with opacity.
 */
async function generateHookVideoOverlay(preset, headline, fontScale, wordSpacingMultiplier, savePath) {
  const canvas = createCanvas(720, 1280);
  const ctx = canvas.getContext('2d', { alpha: true });

  // Full black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 720, 1280);

  // --- Parse hook text (bold words get brand color, regular words white) ---
  let cleanedHtml = cleanHTML(headline || '');
  cleanedHtml = cleanedHtml.replace(/<\/?strong>/gi, (m) => m.toLowerCase().replace('strong', 'b'));
  cleanedHtml = cleanedHtml.replace(/<\/?b>/gi, (m) => m.toLowerCase());

  const hookColor = preset.color || '#7F53FF';
  const fontSize = Math.round(38 * (fontScale || 1));
  const lineHeight = fontSize * 1.35;
  const maxTextW = 620;
  const textToVideoGap = 25;

  // Tokenize + wrap, preserving explicit newlines (<br> / Shift+Enter) as hard line breaks.
  const spacing = (wordSpacingMultiplier || 0.2) * fontSize;
  const lines = [];
  const logicalLines = cleanedHtml.split('\n').map(s => s.trim()).filter(Boolean);
  for (const lineHtml of logicalLines) {
    const tokens = [];
    lineHtml.split(/(<b>.*?<\/b>)/i).forEach(p => {
      if (!p) return;
      const isB = /^<b>/i.test(p);
      p.replace(/<\/?b>/gi, '').split(/\s+/).forEach(w => w && tokens.push({ text: w, bold: isB }));
    });

    let curLine = { tokens: [], width: 0 };
    for (const t of tokens) {
      ctx.font = `${t.bold ? 'bold' : 'normal'} ${fontSize}px Inter`;
      const w = ctx.measureText(t.text).width;
      const advance = w + spacing;
      if (curLine.width + advance > maxTextW && curLine.tokens.length > 0) {
        lines.push(curLine);
        curLine = { tokens: [], width: 0 };
      }
      curLine.tokens.push({ ...t, measuredWidth: w });
      curLine.width += advance;
    }
    if (curLine.tokens.length > 0) lines.push(curLine);
  }

  const showHookEyebrow = preset.showHookEyebrow === true;
  const hookEyebrowPlain = (preset.hookEyebrow && String(preset.hookEyebrow).trim()) || '';
  const eyebrowSizeScale = Number.isFinite(Number(preset.hookEyebrowSizeScale)) ? Number(preset.hookEyebrowSizeScale) : 1.1;
  const eyebrowGapScale = Number.isFinite(Number(preset.hookEyebrowGapScale)) ? Number(preset.hookEyebrowGapScale) : 7.0;
  const eyebrowAlignment = (preset.hookEyebrowAlignment === 'center') ? 'center' : 'left';
  const eyebrowFontSize = Math.max(12, Math.round(24 * (fontScale || 1) * eyebrowSizeScale));
  const eyebrowLineHeight = eyebrowFontSize * 1.35;
  const eyebrowGapBeforeHook = Math.round(16 * eyebrowGapScale);
  let eyebrowLines = [];
  if (showHookEyebrow && hookEyebrowPlain) {
    ctx.font = `500 ${eyebrowFontSize}px Inter`;
    const words = hookEyebrowPlain.split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxTextW && cur) {
        eyebrowLines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) eyebrowLines.push(cur);
  }
  const nEyebrow = eyebrowLines.length;
  const eyebrowH = nEyebrow
    ? (eyebrowFontSize + (nEyebrow - 1) * eyebrowLineHeight + eyebrowGapBeforeHook)
    : 0;

  // --- Calculate video dimensions ---
  const aspectRatio = preset.ratio || '4:3';
  const [wRatio, hRatio] = aspectRatio.split(':').map(Number);
  let videoH = Math.round(720 * (hRatio / wRatio));
  if (videoH % 2 !== 0) videoH += 1;

  // --- Center entire stack (text + gap + video) vertically in frame ---
  const totalTextH = eyebrowH + lines.length * lineHeight;
  const totalStackH = totalTextH + textToVideoGap + videoH;
  const startY = Math.round((1280 - totalStackH) / 2);

  ctx.textBaseline = 'top';
  if (nEyebrow) {
    for (let ei = 0; ei < eyebrowLines.length; ei++) {
      const el = eyebrowLines[ei];
      ctx.font = `500 ${eyebrowFontSize}px Inter`;
      ctx.fillStyle = '#FFFFFF';
      const tw = ctx.measureText(el).width;
      const ex = eyebrowAlignment === 'center' ? ((720 - tw) / 2) : 50;
      // Start eyebrow block at startY; eyebrowH already accounts for font size + gap.
      const ey = startY + ei * eyebrowLineHeight;
      ctx.fillText(el, ex, ey);
    }
  }

  // Draw hook text centered
  let drawY = startY + eyebrowH + fontSize;
  for (const line of lines) {
    let drawX = (720 - line.width + spacing) / 2;
    for (const t of line.tokens) {
      ctx.font = `${t.bold ? 'bold' : 'normal'} ${fontSize}px Inter`;
      ctx.fillStyle = t.bold ? hookColor : '#FFFFFF';
      ctx.fillText(t.text, drawX, drawY);
      drawX += t.measuredWidth + spacing;
    }
    drawY += lineHeight;
  }

  // Video position: right after text + gap
  let videoTopY = startY + Math.round(totalTextH) + textToVideoGap;
  if (videoTopY % 2 !== 0) videoTopY += 1;

  // Clear transparent hole where video goes
  ctx.clearRect(0, videoTopY, 720, videoH);

  await fs.writeFile(savePath, canvas.toBuffer('image/png'));

  // Resolve logo path for FFmpeg overlay
  let logoPath = null;
  if (preset.logo && preset.showLogo !== false) {
    const logoFile = join(__dirname, 'assets', 'logos', preset.logo);
    if (existsSync(logoFile)) logoPath = logoFile;
  }

  return {
    overlayPath: savePath,
    videoY: videoTopY,
    videoX: 0,
    videoW: 720,
    videoH: videoH,
    watermark: null,
    logoOverlay: logoPath ? {
      path: logoPath,
      position: preset.rules?.logoPosition || 'top-right',
      size: 80,
      opacity: preset.rules?.logoOpacity || 0.5,
      circular: true,
    } : null,
  };
}

export function createVideoProcessor() {
  return {
    async processVideo({ videoPath, presets, headline, fontScale, wordSpacing, videoScale, fitMode, showCredit = true, ideaName = '', onProgress }) {
      const batchId = `export-${Date.now()}`;
      const outputDir = join(__dirname, 'outputs', batchId);
      const tempDir = join(__dirname, 'temp', batchId);
      await fs.mkdir(outputDir, { recursive: true });
      await fs.mkdir(tempDir, { recursive: true });

      const processedVideos = [];

      // Use absolute paths for FFmpeg (avoids issues on Windows with cwd and relative paths)
      const videoPathAbs = resolve(videoPath);
      if (!existsSync(videoPathAbs)) {
        throw new Error(`Video file not found: ${videoPathAbs}`);
      }
      console.log(`[processVideo] Starting: video=${videoPathAbs}, presets=${presets.length} (${presets.map(p => p?.name).join(', ')})`);

      for (let i = 0; i < presets.length; i++) {
        const preset = presets[i];
        try {
          // Validate preset has required properties
          if (!preset || !preset.name) {
            console.error(`Skipping preset at index ${i}: missing name property`, preset);
            continue;
          }

          const baseName = ideaName
            ? `${ideaName} - ${preset.name}`
            : preset.name;
          const safeName = baseName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '');
          const outputPath = resolve(outputDir, `${safeName}.mp4`);
          const overlayPath = resolve(tempDir, `ovl-${preset.id || i}.png`);

          // 1. GENERATE OVERLAY (WITH UI ASPECT RATIOS) - use per-preset fontScale/wordSpacing when set
          const presetFontScale = preset.fontScale ?? fontScale;
          const presetWordSpacing = preset.wordSpacing ?? wordSpacing;
          console.log(`[processVideo] Preset ${i + 1}/${presets.length}: "${preset.name}" – generating overlay...`);
          const layout = await generateLayoutOverlay(preset, headline, presetFontScale, presetWordSpacing, overlayPath, showCredit);
          layout.overlayPath = resolve(layout.overlayPath || overlayPath);
          if (!existsSync(layout.overlayPath)) {
            throw new Error(`Overlay file was not created: ${layout.overlayPath}`);
          }

          // 2. FFmpeg CROP & PAD (pass absolute paths)
          await processFFmpeg(videoPathAbs, outputPath, preset, layout, videoScale, fitMode);

          processedVideos.push(outputPath);
          onProgress?.({ current: i + 1, total: presets.length, preset: preset.name });
        } catch (error) {
          const presetName = preset?.name || `preset at index ${i}`;
          console.error(`[processVideo] Error processing "${presetName}":`, error.message);
          console.error('[processVideo] Full error:', error);
          if (error.stderr) console.error('[processVideo] FFmpeg stderr:', error.stderr);
          if (error.stack) console.error('[processVideo] Stack:', error.stack);
        }
      }

      if (processedVideos.length === 0 && presets.length > 0) {
        throw new Error('Export failed: no videos were produced. Check server console for FFmpeg/overlay errors.');
      }

      return {
        outputDir,
        videoPaths: processedVideos
      };
    }
  };
}

async function generateLayoutOverlay(preset, headline, fontScale, wordSpacingMultiplier, savePath, showCredit = true) {
  if (!preset || !preset.name) {
    throw new Error('Preset is missing required name property');
  }

  // Hook+Video layout: delegate to dedicated handler
  if (preset.layout === 'hook_video') {
    return generateHookVideoOverlay(preset, headline, fontScale, wordSpacingMultiplier, savePath);
  }

  const canvas = createCanvas(720, 1280);
  const ctx = canvas.getContext('2d', { alpha: true });
  const name = preset.name;
  const nameLower = (name || '').toLowerCase().trim();

  // --- 1. ASPECT RATIO MECHANIC ---
  // Use preset's individual ratio if available, otherwise fall back to default. Video uses full width (no frame padding).
  const aspectRatio = preset.ratio || '4:3'; // Default to 4:3 if not specified
  const hasNarrowVideo = ['ceo hustle advice', 'wealth lessons india', 'indian business com', 'entrepreneurial india', 'finding good ai', 'finding good tech'].includes(nameLower) || name === 'Entrepreneurial India' || name === 'Finding Good AI' || name === 'Finding Good Tech';
  const targetW = 720; // Full width for all presets (no left/right video frame padding)
  const [wRatio, hRatio] = aspectRatio.split(':').map(Number);
  let targetH = Math.round(targetW * (hRatio / wRatio));
  if (targetH % 2 !== 0) targetH += 1; // Requirement for FFmpeg

  // --- 2. BRAND SPECIAL RULES ---
  const isStartupMadness = name === 'startup madness';
  const isBestFounderClips = name === 'Best Founder Clips';
  const isBestBusinessClips = name === 'best business clips';
  const isAdsByMarketer = name === 'Ads by marketer';
  const hasHeadline = !isBestFounderClips && !isBestBusinessClips && !isStartupMadness && !isAdsByMarketer;
  const isAllBoldWhite = ['Founders God', 'CEO Mindset India'].includes(name);
  const isWhiteBg = ['founderdaily', 'founderbusinesstips', 'kwazyfounders', 'startup madness'].includes(name);
  const isPeakOfAI = nameLower === 'peakofai';
  const isThePrimeFounder = nameLower === 'theprimefounder';
  const isAICracked = nameLower === 'aicracked';
  const isTheEvolvingGPT = nameLower === 'theevolvinggpt';
  const isFoundrsonig = nameLower === 'foundrsonig';
  const isIndianFoundr = nameLower === 'indianfoundr';
  const isIndianStartupStory = nameLower === 'indiastartupstory';
  const isNewOrderAI = nameLower === 'neworderai';
  const isIndiasBestFounders = nameLower === 'indiasbestfounders';
  const isElitefoundrs = nameLower === 'elitefoundrs';
  const isIntelligenceByAi = nameLower === 'intelligence by ai';
  const isPureCodeAi = nameLower === 'pure code ai';
  const isNobelAiPage = nameLower === 'nobel ai page';
  const isTheAiPhaze = nameLower === 'the ai phaze';
  const isThatAiPage = nameLower === 'that ai page';
  const isRevolutionInTech = nameLower === 'revolution in tech';
  const isStartupsoncrack =
    nameLower === 'startupsoncrack' ||
    nameLower === 'millionaire.founders' ||
    nameLower === 'startupscheming' ||
    nameLower === 'startupsxindia' ||
    nameLower === 'nobelfounders' ||
    nameLower === 'foundersxindia' ||
    nameLower === 'the ai phaze' ||
    nameLower === 'that ai page' ||
    nameLower === 'revolution in tech';
  const isFoundersIndia = nameLower === 'founders.india';
  const isTechnologyInIndia = nameLower === 'technology in india';
  const isDailyTechIndia = nameLower === 'daily tech india';
  const isThePrimeAiPage = nameLower === 'the prime ai page';
  const isDhandhaIndia = nameLower === 'dhandha india';
  const isTheAiGauntlet = nameLower === 'the ai gauntlet';
  const isRealIndiaBusiness = false; // Converted to logo-group tweet-style preset
  const isBestIndianPodcast = nameLower === 'bestindianpodcast';
  const isRiseWithContent = nameLower === 'risewithcontent';
  const isPoppinsHeadlinePreset =
    isPeakOfAI || isThePrimeFounder || isAICracked || isTheEvolvingGPT || isFoundrsonig || isIndianFoundr || isIndianStartupStory || isNewOrderAI || isStartupsoncrack || isRiseWithContent || isIndiasBestFounders || isElitefoundrs || isRealIndiaBusiness;

  // --- 3. LAYOUT CONSTANTS ---
  const GAP = 20;
  const LOGO_BOX_H =
    (preset.layout === 'watermark' || isPeakOfAI || isThePrimeFounder || isAICracked || isTheEvolvingGPT || isFoundrsonig || isIndianFoundr || isIndianStartupStory || isNewOrderAI || isIndiasBestFounders || isElitefoundrs || isIntelligenceByAi || isTheAiPhaze || isThatAiPage || isRevolutionInTech || isStartupsoncrack || isRiseWithContent)
      ? 0
      : (isBestFounderClips ? 120 : (isBestBusinessClips ? 450 : (isAdsByMarketer ? 360 : (isStartupMadness ? 100 : 90))));

  // Use preset headline when set (Per Brand edits, including bold) so export matches preview; else fall back to global
  const rawHeadline = (preset.headline && String(preset.headline).trim()) ? preset.headline : (headline || '');
  const fontSize = (stripHTML(rawHeadline).length < 25 ? 50 : (stripHTML(rawHeadline).length < 50 ? 40 : 32)) * (fontScale || 1);
  const lineHeight = fontSize * (preset.lineSpacing || 1.25);
  const adjSpacing = isAllBoldWhite ? 0.2 : wordSpacingMultiplier;

  // For presets with narrower video (600px), limit text width to stay within video frame
  const presetsWithNarrowVideo = ['wealth lessons india', 'ceo hustle advice', 'indian business com', 'entrepreneurial india', 'finding good ai', 'finding good tech'];
  const videoPadding = 0; // No video frame padding (video is full width)
  // For indian business com, use more conservative width to ensure text stays within video frame
  // Utilize side space: hook-only headline pages use 620 so text sits across frame; logo-group pages keep 580.
  let maxTextWidth;
  if (isThePrimeFounder || isAICracked || isTheEvolvingGPT || isFoundrsonig || isIndianFoundr || isIndianStartupStory || isNewOrderAI || isIndiasBestFounders || isElitefoundrs || isStartupsoncrack || isBestIndianPodcast || isRealIndiaBusiness || isRiseWithContent) {
    // Hook-only headline pages: use full width so preset utilizes side space (wrap keeps text in frame)
    maxTextWidth = 620;
  } else if (isFoundersIndia || isTechnologyInIndia || isDailyTechIndia || isThePrimeAiPage || isDhandhaIndia || isTheAiGauntlet) {
    // Logo group pages: slightly wider but still safe
    maxTextWidth = 580;
  } else if (name === 'indian business com') {
    maxTextWidth = targetW - 120;
  } else if (presetsWithNarrowVideo.includes(nameLower) || ['Entrepreneurial India', 'Finding Good AI', 'Finding Good Tech'].includes(name)) {
    maxTextWidth = targetW - 40;
  } else {
    maxTextWidth = 620;
  }
  // theprimefounder, aicracked, theevolvinggpt and related Poppins presets use Poppins; all other presets use Inter for headline/footer/watermark
  const headlineFontFamily = isPoppinsHeadlinePreset ? 'Poppins' : 'Inter';
  const richLines = hasHeadline ? calculateRichLines(ctx, rawHeadline, maxTextWidth, fontSize, adjSpacing, isAllBoldWhite, headlineFontFamily) : [];
  const textH = hasHeadline ? (richLines.length * lineHeight) : 0;

  // Optional plain line above hook (series / day counter) — same width rules as headline
  const showHookEyebrow = preset.showHookEyebrow === true;
  const hookEyebrowText = (preset.hookEyebrow && String(preset.hookEyebrow).trim()) || '';
  const eyebrowSizeScale = Number.isFinite(Number(preset.hookEyebrowSizeScale)) ? Number(preset.hookEyebrowSizeScale) : 1.1;
  const eyebrowGapScale = Number.isFinite(Number(preset.hookEyebrowGapScale)) ? Number(preset.hookEyebrowGapScale) : 7.0;
  const eyebrowFontSize = Math.max(12, Math.round(20 * (fontScale || 1) * eyebrowSizeScale));
  const eyebrowLineHeight = eyebrowFontSize * 1.35;
  const eyebrowGapBeforeHeadline = Math.round(16 * eyebrowGapScale);
  let eyebrowLines = [];
  if (showHookEyebrow && hookEyebrowText && hasHeadline) {
    ctx.font = `500 ${eyebrowFontSize}px Inter`;
    const words = hookEyebrowText.split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxTextWidth && cur) {
        eyebrowLines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) eyebrowLines.push(cur);
  }
  const eyebrowBlockH = eyebrowLines.length
    ? (eyebrowFontSize + (eyebrowLines.length - 1) * eyebrowLineHeight + eyebrowGapBeforeHeadline)
    : 0;

  const isHookCentered = ['The Rising Founder', 'The Real Founder', 'Inspiring Founder', 'Business Cracked', 'The Founders Show', 'founders cracked'].includes(name);
  // Exclude CEO Mindset India, Founders God, The Founders Show, and Entrepreneurial India from zero gap to match Life Wealth Lessons spacing
  const shouldUseGap = name === 'CEO Mindset India' || name === 'Founders God' || name === 'The Founders Show' || name === 'Entrepreneurial India';
  // For startupcoded, Dhandha India, Finding Good AI/Tech, keep hook sitting closer to the video (smaller gap)
  const isTightGapPreset = name === 'startupcoded' || name === 'Dhandha India' || name === 'kwazyfounders' || name === 'Finding Good AI' || name === 'Finding Good Tech';
  // Same gap logic as 101xfounders for theprimefounder, aicracked, theevolvinggpt (headline on canvas = gap baked in)
  const textToVideoGapBase = (shouldUseGap || !(isAllBoldWhite || isHookCentered)) ? GAP : 0;
  const textToVideoGap = isFoundersIndia ? 0 : (isTightGapPreset ? Math.round(textToVideoGapBase * 0.4) : textToVideoGapBase);
  // For these three presets, use standard GAP like Life Wealth Lessons
  const logoToTextGap = (preset.layout === 'watermark') ? 0 : ((name === 'Business Cracked') ? GAP : (shouldUseGap ? GAP : (isAllBoldWhite ? (GAP + 15) : (isHookCentered ? (GAP + 20) : (isFoundersIndia ? (GAP + 20) : GAP)))));
  const logoToVideoGap_NoHook = (isBestFounderClips || isBestBusinessClips || isAdsByMarketer) ? (GAP * 2) : (isStartupMadness ? (GAP * 3) : GAP);

  const totalStackH = (LOGO_BOX_H) + (hasHeadline ? (logoToTextGap + eyebrowBlockH + textH + textToVideoGap) : logoToVideoGap_NoHook) + targetH + GAP + 30;
  const startY = (1280 - totalStackH) / 2;

  // Background
  ctx.fillStyle = isWhiteBg ? '#FFFFFF' : '#000000';
  ctx.fillRect(0, 0, 720, 1280);

  // --- 4. RENDER LOGO ---
  let videoTopY;
  let logoY;

  // For Ads by marketer, calculate logo position to be right above video
  if (isAdsByMarketer) {
    const adsLogoHeight = 260;
    const adsVideoGap = 0; // No gap - logo sits directly on top of video
    const adsTotalHeight = adsLogoHeight + adsVideoGap + targetH + GAP + 30;
    const adsStartY = (1280 - adsTotalHeight) / 2;
    videoTopY = adsStartY + adsLogoHeight + adsVideoGap;
    logoY = videoTopY - adsLogoHeight + 50; // Add 50px to move logo down
  } else {
    logoY = isAllBoldWhite ? startY - 20 : startY;
  }

  // For peakofai / theprimefounder / aicracked / theevolvinggpt / foundrsonig / indianfoundr / indiastartupstory / neworderai / indiasbestfounders / elitefoundrs / startupsoncrack / bestindianpodcast / realindianbusiness / risewithcontent (hook-only, no logo): set video position explicitly so it is always defined
  if (isPeakOfAI || isThePrimeFounder || isAICracked || isTheEvolvingGPT || isFoundrsonig || isIndianFoundr || isIndianStartupStory || isNewOrderAI || isIndiasBestFounders || isElitefoundrs || isStartupsoncrack || isBestIndianPodcast || isRealIndiaBusiness || isRiseWithContent) {
    videoTopY = (logoY + LOGO_BOX_H + logoToTextGap) + eyebrowBlockH + textH + textToVideoGap;
  }

  // Check if logo should be drawn inside video (not on canvas)
  const isTheRisingFounder = name === 'The Rising Founder';
  const isTheRealFounder = name === 'The Real Founder';
  const isInspiringFounder = name === 'Inspiring Founder';
  const isFoundersCracked = name === 'founders cracked';
  const isIndianBusinessCom = name === 'indian business com';
  const logoInsideVideo = isTheRisingFounder || isTheRealFounder || isInspiringFounder || isFoundersCracked;

  // Check if preset uses logo group (logo + header text + verified checkmark + handle)
  const logoGroupPresets = [
    'Billionaires of Bharat',
    'Founders God',
    'The Founders Show',
    'Business India Lessons',
    'CEO Mindset India',
    'Entrepreneurial India',
    'Finding Good AI',
    'Finding Good Tech',
    'startupsinthelast24hrs',
    'techinthelast24hrs',
    'indianaipage',
    'indiantechdaily',
    '101xtechnology',
    'startupbydog',
    'foundersoncrack',
    'Entrepreneursindia.co',
    'Pure Code AI',
    'Nobel AI Page',
    'therisingai',
    'Revolution in ai',
    'Founders.India',
    'Technology In India',
    'Daily Tech India',
    'The Prime Ai Page',
    'Dhandha India',
    'The Ai Gauntlet',
    'Smart Business.in',
    'Founders wtf',
    'mktg-wtf',
    'Business wtf',
    'Startups wtf',
    'Life Wealth Lessons',
    'startupcoded',
    'founders-in-india',
    'wealth lessons india',
    '101xfounders-tweet',
    'bizzindia-tweet',
    'founders-in-india-tweet',
    'indian-founders-co-tweet'
  ];
  const hasLogoGroup = logoGroupPresets.includes(name) || name === 'Business Cracked' || nameLower === 'startupsinthelast24hrs' || nameLower === 'indian ai future' || nameLower === 'techinthelast24hrs' || nameLower === 'indianaipage' || nameLower === 'indiantechdaily' || nameLower === '101xtechnology' || nameLower === 'startupbydog' || nameLower === 'foundersoncrack' || nameLower === 'entrepreneursindia.co' || nameLower === 'therisingai' || nameLower === 'revolution in ai' || nameLower === 'founders.india' || nameLower === 'technology in india' || nameLower === 'daily tech india' || nameLower === 'the prime ai page' || nameLower === 'dhandha india' || nameLower === 'the ai gauntlet';

  let logoPathForOverlay = null;

  if (preset.logo) {
    try {
      // Find logo locally (try multiple variations)
      const logoName = preset.logo.includes('data:') ? null : (preset.logo.split('/').pop());
      const logoFolder = join(__dirname, 'assets', 'logos');

      // Build list of possible logo filenames to try
      const possibleNames = [];
      if (logoName) {
        possibleNames.push(logoName); // Original
        possibleNames.push(logoName.replace(/-/g, ' ')); // Hyphens to spaces
        possibleNames.push(logoName.replace(/ /g, '-')); // Spaces to hyphens
        possibleNames.push(logoName.replace(/\./g, '-')); // Dots to hyphens
        possibleNames.push(logoName.replace(/-/g, '.')); // Hyphens to dots
      }

      // Also try preset-specific logo names based on preset name
      const presetNameToLogo = {
        'Billionaires of Bharat': 'billionaires-of-bharat.png',
        'Life Wealth Lessons': 'life-wealth-lessons.png',
        'wealth lessons india': 'life-wealth-lessons.png',
        'Business India Lessons': 'business-india-lessons.png',
        'Smart Business.in': 'smart-business.in.png',
        'Founders wtf': 'founders-wtf.png',
        'mktg-wtf': 'mktg-wtf.png',
        'Business wtf': 'business-wtf.png',
        'Startups wtf': 'startups-wtf.png',
        'Business Cracked': 'business-cracked.png',
        'indian business com': 'indian-business-com.png',
        'founders-in-india': 'founders-in-india.png',
        'Entrepreneurial India': 'Entreprenurial-india.png',
        'Finding Good AI': 'finding-good-ai.png',
        'Finding Good Tech': 'finding-good-tech.png',
        'startupsinthelast24hrs': 'startupsinthelast24hrs.png',
        'indian ai future': 'indian-ai-future.png',
        'techinthelast24hrs': 'techinthelast24hrs.png',
        'indianaipage': 'indianaipage.png',
        'indiantechdaily': 'indiantechdaily.png',
        '101xtechnology': '101xtechnology.png',
        'startupbydog': 'startupbydog.png',
        'foundersoncrack': 'foundersoncrack.png',
        'Entrepreneursindia.co': 'Entrepreneursindia.co.png',
        'Pure Code AI': 'Pure-Code-AI.png',
        'Nobel AI Page': 'Nobel-AI-Page.png',
        'therisingai': 'therisingai.png',
        'Revolution in ai': 'Revolution-in-ai.png',
        'Founders.India': 'Founders-India.png',
        'Technology In India': 'Technology-In-India.png',
        'Daily Tech India': 'Daily-Tech-India.png',
        'The Prime Ai Page': 'The-Prime-Ai-Page.png',
        'Dhandha India': 'Dhandha-India.png',
        '101xfounders-tweet': '101xfounders.png',
        'bizzindia-tweet': 'bizzindia.png',
        'founders-in-india-tweet': 'founders-in-india.png',
        'indian-founders-co-tweet': 'indian-founders-co.png',
        'The Ai Gauntlet': 'The-Ai-Gauntlet.png'
      };
      if (presetNameToLogo[name]) {
        possibleNames.push(presetNameToLogo[name]);
      }
      if (nameLower === 'startupsinthelast24hrs') {
        possibleNames.push('startupsinthelast24hrs.png');
      }
      if (nameLower === 'indian ai future') {
        possibleNames.push('startupsinthelast24hrs.png');
      }
      if (nameLower === 'techinthelast24hrs') {
        possibleNames.push('techinthelast24hrs.png');
      }
      if (nameLower === 'indianaipage') {
        possibleNames.push('indianaipage.png');
      }
      if (nameLower === 'indiantechdaily') {
        possibleNames.push('indiantechdaily.png');
      }
      if (nameLower === '101xtechnology') {
        possibleNames.push('101xtechnology.png');
      }
      if (nameLower === 'startupbydog') {
        possibleNames.push('startupbydog.png');
      }
      if (nameLower === 'foundersoncrack') {
        possibleNames.push('foundersoncrack.png');
      }
      if (nameLower === 'entrepreneursindia.co') {
        possibleNames.push('Entrepreneursindia.co.png');
      }
      if (nameLower === 'pure code ai') {
        possibleNames.push('Pure-Code-AI.png');
      }
      if (nameLower === 'nobel ai page') {
        possibleNames.push('Nobel-AI-Page.png');
      }
      if (nameLower === 'therisingai') {
        possibleNames.push('therisingai.png');
      }
      if (nameLower === 'revolution in ai') {
        possibleNames.push('Revolution-in-ai.png');
      }
      if (nameLower === 'founders.india') {
        possibleNames.push('Founders-India.png');
      }
      if (nameLower === 'technology in india' || nameLower === 'daily tech india') {
        possibleNames.push('Technology-In-India.png');
      }
      if (nameLower === 'daily tech india') {
        possibleNames.push('Daily-Tech-India.png');
      }
      if (nameLower === 'the prime ai page') {
        possibleNames.push('The-Prime-Ai-Page.png');
      }
      if (nameLower === 'dhandha india') {
        possibleNames.push('Dhandha-India.png');
      }
      if (nameLower === 'the ai gauntlet') {
        possibleNames.push('The-Ai-Gauntlet.png');
      }

      // Try converting preset name to logo filename format
      const presetBasedName = name.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '-') + '.png';
      possibleNames.push(presetBasedName);

      let logoPath = possibleNames.map(n => join(logoFolder, n)).find(p => existsSync(p));

      if (!logoPath) {
        console.warn(`⚠ Logo not found for preset "${name}". Tried:`, possibleNames.slice(0, 5));
      }

      if (logoPath) {
        // If logo should be inside video, save path for FFmpeg overlay instead of drawing on canvas
        if (logoInsideVideo) {
          logoPathForOverlay = logoPath;
          console.log(`[generateOverlay] Logo found for "${name}": ${logoPath}`);
        } else {
          const img = await loadImage(logoPath);
          if (isBestFounderClips) {
            ctx.drawImage(img, 360 - 60, logoY, 120, 85);
            videoTopY = logoY + 85 + logoToVideoGap_NoHook;
          } else if (isBestBusinessClips) {
            // Keep video frame fixed; place logo a lot lower (closer to / slightly over video top)
            // Maintain aspect ratio to prevent stretching
            const targetHeight = 320;
            const imgAspectRatio = img.width / img.height;
            const bbClipsLogoHeight = targetHeight;
            const bbClipsLogoWidth = bbClipsLogoHeight * imgAspectRatio;
            videoTopY = logoY + bbClipsLogoHeight + logoToVideoGap_NoHook;
            const bbClipsLogoGap = -80; // negative = logo much lower, video unchanged
            const bbClipsLogoY = videoTopY - bbClipsLogoHeight - bbClipsLogoGap;
            const bbClipsLogoX = 360 - (bbClipsLogoWidth / 2); // Center horizontally
            ctx.drawImage(img, bbClipsLogoX, bbClipsLogoY, bbClipsLogoWidth, bbClipsLogoHeight);
          } else if (isAdsByMarketer) {
            // For Ads by marketer: Position logo directly above video (no gap)
            // Calculate video position first, then position logo right on top
            const adsLogoHeight = 260;
            const adsVideoGap = 0; // No gap - logo sits directly on top of video
            const adsTotalHeight = adsLogoHeight + adsVideoGap + targetH + GAP + 30;
            const adsStartY = (1280 - adsTotalHeight) / 2;
            videoTopY = adsStartY + adsLogoHeight + adsVideoGap;
            const adsLogoY = videoTopY - adsLogoHeight + 50; // Add 50px to move logo down
            ctx.drawImage(img, 360 - 180, adsLogoY, 360, 260);
          } else if (isStartupMadness) {
            ctx.drawImage(img, 360 - 40, logoY, 80, 80);
            ctx.font = '900 22px Inter'; ctx.fillStyle = '#000'; ctx.textAlign = 'center';
            ctx.fillText(name.toUpperCase(), 360, logoY + 105);
            videoTopY = logoY + 105 + logoToVideoGap_NoHook;
          } else if (hasLogoGroup) {
            // Logo group: logo + header text + verified checkmark + handle
            // Only apply special positioning for logo group presets
            const logoGroupY = logoY + 25; // Shift logo group lower to reduce gap with hook text
            const headerTextY = logoGroupY + 35; // Keep text at original position

            // Calculate text position first
            ctx.font = 'bold 26px Inter';
            const nameY = headerTextY - 5;
            const displayName = (name === 'founders-in-india' || name === 'founders-in-india-tweet') ? 'Foundersinindia' : (name === '101xfounders-tweet' ? '101xfounders' : (name === 'bizzindia-tweet' ? 'Bizzindia' : (name === 'indian-founders-co-tweet' ? 'Indianfoundersco' : (name === 'foundersoncrack' ? 'Founders on Crack' : (name === 'mktg-wtf' ? 'mktg Wtf' : (name === 'Entrepreneurial India' ? 'Entrepreneurial.India' : name))))));
            const nameWidth = ctx.measureText(displayName).width;

            // Position logo a bit above the text
            // For 26px font, text top is approximately nameY - 22 (font metrics for bold Inter)
            // Position logo so its top aligns slightly above text top
            const textTop = nameY - 22; // Approximate text top (baseline - font height)
            const logoTop = textTop - 3; // A bit above text top (3px above)

            let logoX = 50 + videoPadding;

            // Get logo scale factor for each preset
            let logoScale = 1.6; // Default
            if (name === 'Billionaires of Bharat') logoScale = 1.6;
            else if (name === 'startupcoded' || name === 'founders-in-india') logoScale = 1.6;
            else if (name === 'Life Wealth Lessons' || name === 'Business India Lessons') logoScale = 1.0;
            else if (name === 'wealth lessons india') logoScale = 1.6;
            else if (name === 'The Founders Show') logoScale = 1.6;
            else if (name === 'Founders God') logoScale = 1.6;
            else if (nameLower === 'indianaipage') logoScale = 1.35;
            else if (nameLower === 'startupsinthelast24hrs' || nameLower === 'indian ai future' || nameLower === 'techinthelast24hrs' || nameLower === 'indiantechdaily' || nameLower === '101xtechnology' || nameLower === 'startupbydog' || nameLower === 'foundersoncrack' || nameLower === 'entrepreneursindia.co' || nameLower === 'pure code ai' || nameLower === 'nobel ai page' || nameLower === 'therisingai' || nameLower === 'revolution in ai' || nameLower === 'founders.india' || nameLower === 'technology in india' || nameLower === 'daily tech india' || nameLower === 'the prime ai page' || nameLower === 'dhandha india' || nameLower === 'the ai gauntlet' || nameLower === '101xfounders-tweet' || nameLower === 'bizzindia-tweet' || nameLower === 'founders-in-india-tweet' || nameLower === 'indian-founders-co-tweet') logoScale = 1.2;
            else if (name === 'CEO Mindset India' || name === 'Entrepreneurial India' || name === 'Finding Good AI' || name === 'Finding Good Tech') logoScale = 1.6;
            else if (name === 'Smart Business.in' || name === 'Founders wtf' || name === 'mktg-wtf' || name === 'Business wtf' || name === 'Startups wtf') logoScale = 1.6;

            const logoSize = 70;
            const scaledSize = logoSize * logoScale;
            const offset = (scaledSize - logoSize) / 2;
            // Calculate finalLogoY so that logo top (after offset) aligns with logoTop
            // Move logo higher for specific presets
            const logoTopAdjustment = (nameLower === 'startupsinthelast24hrs' || nameLower === 'indian ai future' || nameLower === 'techinthelast24hrs' || nameLower === 'indianaipage' || nameLower === 'indiantechdaily' || nameLower === '101xtechnology' || nameLower === 'startupbydog' || nameLower === 'foundersoncrack' || nameLower === 'entrepreneursindia.co' || nameLower === 'pure code ai' || nameLower === 'nobel ai page' || nameLower === 'therisingai' || nameLower === 'revolution in ai' || nameLower === 'founders.india' || nameLower === 'technology in india' || nameLower === 'daily tech india' || nameLower === 'the prime ai page' || nameLower === 'dhandha india' || nameLower === 'the ai gauntlet' || nameLower === '101xfounders-tweet' || nameLower === 'bizzindia-tweet' || nameLower === 'founders-in-india-tweet' || nameLower === 'indian-founders-co-tweet') ? -10 : ((name === 'Billionaires of Bharat' || name === 'CEO Mindset India' || name === 'Entrepreneurial India' || name === 'Finding Good AI' || name === 'Finding Good Tech' || name === 'Smart Business.in' || name === 'Founders wtf' || name === 'mktg-wtf' || name === 'Business wtf' || name === 'Startups wtf' || name === 'Founders God' || name === 'The Founders Show' || name === 'startupcoded' || name === 'founders-in-india' || name === 'Business Cracked' || name === 'wealth lessons india') ? -25 : 0);
            const finalLogoY = logoTop + offset + logoTopAdjustment;
            const centerX = logoX + logoSize / 2;
            const centerY = finalLogoY + logoSize / 2;
            const radius = logoSize / 2;

            let actualLogoX = logoX;
            let actualHeaderTextX = logoX + 70 + 8; // Logo-to-text gap for all logo-group presets

            {
              // Draw logo: Founders God = square, Founders wtf / mktg-wtf / Business wtf / Startups wtf = square with rounded corners, others = circle
              ctx.save();
              if (name === 'Founders wtf' || name === 'mktg-wtf' || name === 'Business wtf' || name === 'Startups wtf') {
                const rr = 8, lx = actualLogoX, ly = finalLogoY, sz = 70;
                ctx.beginPath();
                ctx.moveTo(lx + rr, ly);
                ctx.lineTo(lx + sz - rr, ly);
                ctx.quadraticCurveTo(lx + sz, ly, lx + sz, ly + rr);
                ctx.lineTo(lx + sz, ly + sz - rr);
                ctx.quadraticCurveTo(lx + sz, ly + sz, lx + sz - rr, ly + sz);
                ctx.lineTo(lx + rr, ly + sz);
                ctx.quadraticCurveTo(lx, ly + sz, lx, ly + sz - rr);
                ctx.lineTo(lx, ly + rr);
                ctx.quadraticCurveTo(lx, ly, lx + rr, ly);
                ctx.closePath();
                ctx.clip();
              } else if (name !== 'Founders God') {
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.clip();
              }
              ctx.drawImage(img, actualLogoX - offset, finalLogoY - offset, scaledSize, scaledSize);
              ctx.restore();
              // Finding Good AI / Finding Good Tech / startupsinthelast24hrs: white thin border around logo
              if (name === 'Finding Good AI' || name === 'Finding Good Tech' || name === 'wealth lessons india' || nameLower === 'startupsinthelast24hrs' || nameLower === 'indian ai future' || nameLower === 'techinthelast24hrs' || nameLower === 'indianaipage' || nameLower === 'indiantechdaily' || nameLower === '101xtechnology' || nameLower === 'startupbydog' || nameLower === 'foundersoncrack' || nameLower === 'entrepreneursindia.co' || nameLower === 'pure code ai' || nameLower === 'nobel ai page' || nameLower === 'therisingai' || nameLower === 'revolution in ai' || nameLower === 'founders.india' || nameLower === 'technology in india' || nameLower === 'daily tech india' || nameLower === 'the prime ai page' || nameLower === 'dhandha india' || nameLower === 'the ai gauntlet' || nameLower === '101xfounders-tweet' || nameLower === 'bizzindia-tweet' || nameLower === 'founders-in-india-tweet' || nameLower === 'indian-founders-co-tweet') {
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();
              }
            }

            // Draw preset name
            ctx.font = 'bold 26px Inter';
            ctx.textAlign = 'left';
            ctx.fillStyle = isWhiteBg ? '#000000' : '#fff';
            ctx.fillText(displayName, actualHeaderTextX, nameY);

            // Draw verified checkmark - right beside the name with respectable gap, positioned slightly above
            const tickSpacing = 20;
            const tickX = actualHeaderTextX + nameWidth + tickSpacing;
            // Position tick mark slightly above the text baseline
            const tickY = nameY - 7; // Position tick mark slightly above text baseline (7px higher)
            const tickColor = name === 'Billionaires of Bharat' ? '#fbbf24' : '#3b82f6';
            ctx.beginPath();
            ctx.arc(tickX, tickY, 10, 0, Math.PI * 2);
            ctx.fillStyle = tickColor;
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(tickX - 5, tickY - 1);
            ctx.lineTo(tickX - 2, tickY + 3);
            ctx.lineTo(tickX + 5, tickY - 4);
            ctx.strokeStyle = isWhiteBg ? '#000' : '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw handle
            ctx.font = '500 18px Inter';
            ctx.fillStyle = isWhiteBg ? '#4a4a4a' : '#9ca3af';
            const handleY = headerTextY + 25;
            ctx.fillText(preset.handle, actualHeaderTextX, handleY);

            videoTopY = (logoY + LOGO_BOX_H + logoToTextGap) + eyebrowBlockH + textH + textToVideoGap;
          } else {
            if (name === 'Real India Business') {
              // Real India Business: centered logo above hook text (circular)
              const logoScale = preset.rules?.logoScale || 1.2;
              const logoSize = 70;
              const scaledSize = logoSize * logoScale;

              // Calculate headline position to place logo above it (including optional eyebrow line)
              const riBlockOff = (1280 * (preset.headlinePosition?.y / 100 || 0));
              const riStackStart = (logoY + LOGO_BOX_H + logoToTextGap) + riBlockOff;
              const headlineY = riStackStart + eyebrowBlockH;
              // Position logo above headline with some gap
              const logoYPos = headlineY - scaledSize - 10; // 10px gap above headline

              // Center the logo horizontally on canvas (720px wide, center at 360)
              const centerX = 360;
              const centerY = logoYPos + scaledSize / 2;
              const radius = scaledSize / 2;

              // Calculate image position to center it
              const logoXPos = centerX - scaledSize / 2;

              ctx.save();
              ctx.beginPath();
              ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              // Draw the image centered within the circle
              ctx.drawImage(img, logoXPos, logoYPos, scaledSize, scaledSize);
              ctx.restore();

              videoTopY = (logoY + LOGO_BOX_H + logoToTextGap) + eyebrowBlockH + textH + textToVideoGap;
            } else {
              let lx = 50, ly = logoY + 20;
              ctx.save();
              if (name !== 'Founders God') { ctx.beginPath(); ctx.arc(lx + 35, ly + 35, 35, 0, Math.PI * 2); ctx.clip(); }
              ctx.drawImage(img, lx, ly, 70, 70);
              ctx.restore();
              videoTopY = (logoY + LOGO_BOX_H + logoToTextGap) + eyebrowBlockH + textH + textToVideoGap;
            }
          }
        }
      } else if (hasLogoGroup) {
        // Logo group without logo image: draw placeholder circle + name + checkmark + handle (e.g. startupsinthelast24hrs when logo file missing)
        const logoGroupY = logoY;
        const headerTextY = logoGroupY + 35;
        ctx.font = 'bold 26px Inter';
        const nameY = name === 'Business Cracked' ? headerTextY - 15 : headerTextY - 5;
        const displayName = (name === 'founders-in-india' || name === 'founders-in-india-tweet') ? 'Foundersinindia' : (name === '101xfounders-tweet' ? '101xfounders' : (name === 'bizzindia-tweet' ? 'Bizzindia' : (name === 'indian-founders-co-tweet' ? 'Indianfoundersco' : (name === 'foundersoncrack' ? 'Founders on Crack' : (name === 'mktg-wtf' ? 'mktg Wtf' : (name === 'Entrepreneurial India' ? 'Entrepreneurial.India' : name))))));
        const nameWidth = ctx.measureText(displayName).width;
        const textTop = nameY - 22;
        const logoTop = textTop - 3;
        let logoX = 50 + videoPadding;
        const logoSize = 70;
        const offset = 21;
        const logoTopAdjustment = (nameLower === 'startupsinthelast24hrs' || nameLower === 'indian ai future' || nameLower === 'techinthelast24hrs' || nameLower === 'indianaipage' || nameLower === 'indiantechdaily' || nameLower === '101xtechnology' || nameLower === 'startupbydog' || nameLower === 'foundersoncrack' || nameLower === 'entrepreneursindia.co' || nameLower === 'pure code ai' || nameLower === 'nobel ai page' || nameLower === 'therisingai' || nameLower === 'revolution in ai' || nameLower === 'founders.india' || nameLower === 'technology in india' || nameLower === 'daily tech india' || nameLower === 'the prime ai page' || nameLower === 'dhandha india' || nameLower === 'the ai gauntlet' || nameLower === '101xfounders-tweet' || nameLower === 'bizzindia-tweet' || nameLower === 'founders-in-india-tweet' || nameLower === 'indian-founders-co-tweet') ? -10 : ((name === 'Billionaires of Bharat' || name === 'CEO Mindset India' || name === 'Entrepreneurial India' || name === 'Finding Good AI' || name === 'Finding Good Tech' || name === 'Smart Business.in' || name === 'Founders wtf' || name === 'mktg-wtf' || name === 'Business wtf' || name === 'Startups wtf' || name === 'Founders God' || name === 'The Founders Show' || name === 'startupcoded' || name === 'founders-in-india') ? -25 : 0);
        const finalLogoY = logoTop + offset + logoTopAdjustment;
        const centerX = logoX + logoSize / 2;
        const centerY = finalLogoY + logoSize / 2;
        const radius = logoSize / 2;
        let actualLogoX = logoX;
        let actualHeaderTextX = logoX + 70 + 8; // Logo-to-text gap for all logo-group presets
        if (name === 'Business Cracked') {
          const gap = 4, badgeWidth = 20, totalGroupWidth = logoSize + gap + nameWidth + badgeWidth, centerXGroup = (720 - totalGroupWidth) / 2;
          actualLogoX = centerXGroup - 20;
          actualHeaderTextX = centerXGroup + logoSize + gap;
        }
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(actualLogoX + logoSize / 2, finalLogoY + logoSize / 2, radius, 0, Math.PI * 2);
        ctx.fill();
        if (name === 'Finding Good AI' || name === 'Finding Good Tech' || nameLower === 'startupsinthelast24hrs' || nameLower === 'indian ai future' || nameLower === 'techinthelast24hrs' || nameLower === 'indianaipage' || nameLower === 'indiantechdaily' || nameLower === '101xtechnology' || nameLower === 'startupbydog' || nameLower === 'foundersoncrack' || nameLower === 'entrepreneursindia.co' || nameLower === 'pure code ai' || nameLower === 'nobel ai page' || nameLower === 'therisingai' || nameLower === 'revolution in ai' || nameLower === 'founders.india' || nameLower === 'technology in india' || nameLower === 'daily tech india' || nameLower === 'the prime ai page' || nameLower === 'dhandha india' || nameLower === 'the ai gauntlet' || nameLower === '101xfounders-tweet' || nameLower === 'bizzindia-tweet' || nameLower === 'founders-in-india-tweet' || nameLower === 'indian-founders-co-tweet') {
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(actualLogoX + logoSize / 2, finalLogoY + logoSize / 2, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.font = 'bold 26px Inter';
        ctx.textAlign = 'left';
        ctx.fillStyle = isWhiteBg ? '#000000' : '#fff';
        ctx.fillText(displayName, actualHeaderTextX, nameY);
        const tickSpacing = name === 'Business Cracked' ? 28 : 20;
        const tickX = actualHeaderTextX + nameWidth + tickSpacing;
        const tickY = nameY - 7;
        const tickColor = name === 'Billionaires of Bharat' ? '#fbbf24' : '#3b82f6';
        ctx.beginPath();
        ctx.arc(tickX, tickY, 10, 0, Math.PI * 2);
        ctx.fillStyle = tickColor;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tickX - 5, tickY - 1);
        ctx.lineTo(tickX - 2, tickY + 3);
        ctx.lineTo(tickX + 5, tickY - 4);
        ctx.strokeStyle = isWhiteBg ? '#000' : '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = '500 18px Inter';
        ctx.fillStyle = isWhiteBg ? '#4a4a4a' : '#9ca3af';
        const handleY = name === 'Business Cracked' ? headerTextY + 15 : headerTextY + 25;
        ctx.fillText(preset.handle, actualHeaderTextX, handleY);
        videoTopY = (logoY + LOGO_BOX_H + logoToTextGap) + eyebrowBlockH + textH + textToVideoGap;
      }
    } catch (e) { }
  }
  if (!videoTopY) videoTopY = (logoY + LOGO_BOX_H + logoToTextGap) + eyebrowBlockH + textH + textToVideoGap;

  // --- 5. RENDER HEADLINE (REPOSITIONING MECHANIC) ---
  // theprimefounder, aicracked, theevolvinggpt: headline via FFmpeg with Poppins (fontfile=) so export uses Poppins; word gap from client applied without fail
  let headlineDrawtextSegments = null;
  if (hasHeadline) {
    const blockOffsetY = (1280 * (preset.headlinePosition?.y / 100 || 0));
    const stackStart = (logoY + LOGO_BOX_H + logoToTextGap) + blockOffsetY;
    const headlineY = stackStart + eyebrowBlockH;

    if (eyebrowLines.length) {
      ctx.textBaseline = 'top';
      ctx.font = `500 ${eyebrowFontSize}px Inter`;
      ctx.fillStyle = isWhiteBg ? '#000000' : '#FFFFFF';
      for (let ei = 0; ei < eyebrowLines.length; ei++) {
        const lineStr = eyebrowLines[ei];
        let ex;
        if ((preset.hookEyebrowAlignment ?? preset.alignment) === 'center') {
          const tw = ctx.measureText(lineStr).width;
          ex = 360 - tw / 2;
        } else if (nameLower === 'startupsoncrack' || nameLower === 'millionaire.founders' || nameLower === 'startupscheming' || nameLower === 'indian business com') {
          ex = 100 + videoPadding;
        } else {
          ex = 50 + videoPadding;
        }
        ex += (720 * (preset.headlinePosition?.x / 100 || 0));
        // Start eyebrow block at stackStart; eyebrowBlockH already accounts for font size + gap.
        const ey = stackStart + ei * eyebrowLineHeight;
        ctx.fillText(lineStr, ex, ey);
      }
    }

    ctx.textBaseline = 'top';
    const isCenterBlockPreset =
      preset.alignment === 'center' &&
      ['startupscheming', 'startupsxindia', 'nobelfounders', 'foundersxindia', 'startupsoncrack', 'millionaire.founders', 'the ai phaze', 'that ai page', 'revolution in tech']
        .includes(nameLower);
    const centerBlockWidth = (isCenterBlockPreset && richLines.length > 0)
      ? Math.max(...richLines.map(l => l.width || 0))
      : 0;
    await preloadEmojis(richLines);
    // Pre-compute highlight group index for Real India Business dual-color (1st bold = orange, 2nd bold = green)
    let _hlGroup = 0, _prevHL = false;
    const hlGroupMap = [];
    for (const ln of richLines) {
      const lineGroups = [];
      for (const tk of ln.tokens) {
        if (tk.bold) { if (!_prevHL) _hlGroup++; _prevHL = true; lineGroups.push(_hlGroup); }
        else { _prevHL = false; lineGroups.push(0); }
      }
      hlGroupMap.push(lineGroups);
    }
    for (let i = 0; i < richLines.length; i++) {
      const line = richLines[i];
      let cx;
      if (preset.alignment === 'center') {
        const widthForCenter = (isCenterBlockPreset && centerBlockWidth) ? centerBlockWidth : line.width;
        cx = 360 - widthForCenter / 2;
      } else if (nameLower === 'startupsoncrack' || nameLower === 'millionaire.founders' || nameLower === 'startupscheming' || nameLower === 'indian business com') {
        cx = 100 + videoPadding;
      } else {
        cx = 50 + videoPadding;
      }
      cx += (720 * (preset.headlinePosition?.x / 100 || 0));
      const lineY = Math.round(headlineY + (i * lineHeight));
      const baselineY = lineY + Math.round(fontSize * 0.82);
      for (let ti = 0; ti < line.tokens.length; ti++) {
        const t = line.tokens[ti];
        const tokenHLGroup = hlGroupMap[i]?.[ti] || 0;
        const allRegularFont =
          preset.rules?.textFontWeight === 400 ||
          name === 'indian hustle advice' ||
          name === 'Finding Good AI' ||
          name === 'Finding Good Tech' ||
          nameLower === 'startupsinthelast24hrs' || nameLower === 'indian ai future' || nameLower === 'startupbydog';
        const useBold =
          (nameLower === 'techinthelast24hrs')
            ? true
            : (name === 'kwazyfounders')
              ? t.bold
              : (nameLower === 'indianaipage' || nameLower === 'indiantechdaily' || nameLower === '101xtechnology' || nameLower === 'therisingai' || nameLower === 'revolution in ai' || nameLower === 'founders.india' || nameLower === 'technology in india' || nameLower === 'daily tech india' || nameLower === 'the prime ai page' || nameLower === 'dhandha india' || nameLower === 'the ai gauntlet')
                ? t.bold
                : ((isPeakOfAI || isThePrimeFounder || isAICracked || isTheEvolvingGPT || isFoundrsonig || isIndianFoundr || isIndianStartupStory || isNewOrderAI || isStartupsoncrack || isRiseWithContent || isIndiasBestFounders || isElitefoundrs)
                  ? t.bold
                  : ((isStartupMadness || name === 'startupcoded' || name === 'bizzindia' || name === 'foundersoncrack')
                    ? true
                : (name === 'founders-in-india' || name === 'indian-founders-co' || name === 'Real India Business' || name === 'Entrepreneursindia.co')
                    ? t.bold
                    : (allRegularFont || !t.bold ? false : true)));
        if (isPeakOfAI || isThePrimeFounder || isAICracked || isTheEvolvingGPT || isFoundrsonig || isIndianFoundr || isIndianStartupStory || isNewOrderAI || isIntelligenceByAi || isTheAiPhaze || isThatAiPage || isRevolutionInTech || isStartupsoncrack || isFoundersIndia || isTechnologyInIndia || isDailyTechIndia || isThePrimeAiPage || isDhandhaIndia || isTheAiGauntlet || isPureCodeAi || isNobelAiPage || isRiseWithContent || isIndiasBestFounders || isElitefoundrs || isRealIndiaBusiness) {
          // Poppins: measure via opentype.js (exact TTF advance = what FFmpeg drawtext uses).
          // Canvas falls back to Sans on Windows so we bypass ctx.measureText for Poppins entirely.
          // FFmpeg drawtext renders with fontfile= so actual Poppins glyphs appear in the export.
          const segmentColor =
            isDhandhaIndia
              ? (t.bold ? '#FB9C39' : '#FFFFFF')
              : (isThePrimeAiPage || isTheAiGauntlet)
                ? (t.bold ? '#FFCD1D' : '#FFFFFF')
                : ((isFoundersIndia || isTechnologyInIndia || isDailyTechIndia)
                  ? '#FFFFFF'
                  : (isFoundrsonig
                    ? (t.bold ? '#ECECDC' : '#FFFFFF')
                    : (isIndiasBestFounders || isIntelligenceByAi
                      ? (t.bold ? '#ECECDC' : '#FFFFFF')
                      : (isElitefoundrs
                        ? (t.bold ? '#5887FF' : '#FFFFFF')
                      : (isTheAiPhaze
                        ? (t.bold ? '#95C5D1' : '#FFFFFF')
                        : (isThatAiPage
                          ? (t.bold ? '#6523FF' : '#FFFFFF')
                          : (isRevolutionInTech
                            ? (t.bold ? '#FDB05E' : '#FFFFFF')
                            : (isIndianStartupStory
                              ? (t.bold ? '#EF5350' : '#FFFFFF')
                              : (isPureCodeAi || isNobelAiPage
                                ? '#FFFFFF'
                                : (isRiseWithContent
                                  ? (t.bold ? '#E53935' : '#FFFFFF')
                                  : (isIndianFoundr
                                    ? (t.bold ? '#487AF9' : '#FFFFFF')
                                    : ((isPeakOfAI || isAICracked || isTheEvolvingGPT || isNewOrderAI || isStartupsoncrack || isRealIndiaBusiness)
                                      ? '#FFFFFF'
                                      : (t.bold ? '#1DB077' : '#FFFFFF')))))))))))));
          if (!headlineDrawtextSegments) headlineDrawtextSegments = [];
          // For Poppins/FFmpeg drawtext: emojis can't render via fontfile, so draw them on canvas and skip in drawtext
          if (textHasEmoji(t.text)) {
            for (const part of splitEmojiText(t.text)) {
              if (part.type === 'emoji') {
                const emojiImg = emojiCache[emojiCodepoint(part.value)];
                const emojiSize = fontSize * 0.85;
                if (emojiImg) ctx.drawImage(emojiImg, cx, headlineY + (i * lineHeight) + fontSize * 0.15, emojiSize, emojiSize);
                cx += emojiSize;
              } else {
                const partW = measurePoppins(part.value, fontSize, useBold);
                headlineDrawtextSegments.push({ text: part.value, x: Math.round(cx), baselineY, bold: useBold, color: segmentColor, width: partW });
                cx += partW;
              }
            }
            cx += adjSpacing * fontSize;
          } else {
            const measuredW = measurePoppins(t.text, fontSize, useBold);
            headlineDrawtextSegments.push({ text: t.text, x: Math.round(cx), baselineY, bold: useBold, color: segmentColor, width: measuredW });
            cx += measuredW + adjSpacing * fontSize;
          }
        } else {
          // Real India Business: thin 300 / semi-bold 600 Inter
          const fontWeight = (name === 'Real India Business') ? (useBold ? '600' : '300') : (useBold ? 'bold' : 'normal');
          const fillColor = (name === 'Entrepreneursindia.co' ? '#FFFFFF' : (name === 'Real India Business' ? (tokenHLGroup === 1 ? '#FF8323' : tokenHLGroup >= 2 ? '#0DC100' : '#FFFFFF') : (name === 'founders-in-india' ? (t.bold ? '#7F53FF' : '#FFFFFF') : (isBestIndianPodcast ? (t.bold ? '#fde601' : '#FFFFFF') : (name === 'kwazyfounders' ? '#000' : (isPeakOfAI ? '#FFF' : (isAllBoldWhite ? '#FFF' : (allRegularFont ? '#FFF' : (t.bold && !allRegularFont ? preset.color : (isWhiteBg ? '#000' : '#FFF'))))))))));
          // Render token, drawing emojis as Twemoji images for color support
          if (textHasEmoji(t.text)) {
            for (const part of splitEmojiText(t.text)) {
              if (part.type === 'emoji') {
                const emojiImg = emojiCache[emojiCodepoint(part.value)];
                const emojiSize = fontSize * 0.85;
                if (emojiImg) {
                  ctx.drawImage(emojiImg, cx, headlineY + (i * lineHeight) + fontSize * 0.15, emojiSize, emojiSize);
                }
                cx += emojiSize;
              } else {
                ctx.font = `${fontWeight} ${fontSize}px ${headlineFontFamily}`;
                ctx.fillStyle = fillColor;
                ctx.fillText(part.value, cx, headlineY + (i * lineHeight));
                cx += ctx.measureText(part.value).width;
              }
            }
            cx += adjSpacing * fontSize;
          } else {
            ctx.font = `${fontWeight} ${fontSize}px ${headlineFontFamily}`;
            ctx.fillStyle = fillColor;
            ctx.fillText(t.text, cx, headlineY + (i * lineHeight));
            cx += ctx.measureText(t.text).width + adjSpacing * fontSize;
          }
        }
      }
    }
  }

  // --- 6. WATERMARK (Will be added in FFmpeg on top of video) ---
  // Note: Watermark is not drawn on canvas - it will be added as text overlay in FFmpeg

  // Transparent hole where video goes so FFmpeg base (padded video) shows through full width
  ctx.clearRect(0, videoTopY, 720, targetH);

  // --- 7. FOOTER (SYNCED POSITION) ---
  if (showCredit && !isPeakOfAI && !isThePrimeFounder && !isAICracked && !isTheEvolvingGPT && !isFoundrsonig && !isIndianFoundr && !isIndianStartupStory && !isNewOrderAI && !isStartupsoncrack) {
    const footY = videoTopY + targetH + 12 + (1280 * (preset.creditPosition?.y / 100 || 0));
    const footX = (720 - targetW) / 2 + (720 * (preset.creditPosition?.x / 100 || 0));
    ctx.textAlign = 'left'; ctx.font = 'bold 16px Inter';
    ctx.fillStyle = isWhiteBg ? '#000' : '#FFF';
    ctx.fillText(preset.footer, footX, footY);
  }

  await fs.writeFile(savePath, canvas.toBuffer('image/png'));
  const layout = {
    overlayPath: savePath,
    videoY: videoTopY,
    videoX: (720 - targetW) / 2,
    videoW: targetW,
    videoH: targetH,
    isBC: name === 'Business Cracked',
    // aicracked, theevolvinggpt, foundrsonig, indianfoundr, indiastartupstory, neworderai, indiasbestfounders, elitefoundrs, intelligence by ai, the ai phaze, That AI page, Revolution in tech, startupsoncrack, bestindianpodcast, realindianbusiness, risewithcontent must NEVER have watermark in video (force null by name)
    watermark: (isAICracked || isTheEvolvingGPT || isFoundrsonig || isIndianFoundr || isIndianStartupStory || isNewOrderAI || isIndiasBestFounders || isElitefoundrs || isIntelligenceByAi || isTheAiPhaze || isThatAiPage || isRevolutionInTech || isStartupsoncrack || isBestIndianPodcast || isRealIndiaBusiness || isRiseWithContent)
      ? null
      : (preset.layout === 'watermark' && !isPeakOfAI && !isThePrimeFounder)
        ? { text: preset.handle, x: preset.watermarkPosition?.x / 100 || 0.5, y: preset.watermarkPosition?.y || 16 }
        : null,
    logoOverlay: logoPathForOverlay ? {
      path: logoPathForOverlay,
      position: (isTheRisingFounder || isTheRealFounder || isFoundersCracked) ? 'top-right' : 'top-left',
      size: 160
    } : null
  };
  if (headlineDrawtextSegments && headlineDrawtextSegments.length > 0) {
    layout.headlineDrawtextSegments = headlineDrawtextSegments;
    layout.headlineFontSize = fontSize;
    // Word gap from client; minimum 0.12 so spacing never fails (slightly tighter default)
    layout.headlineAdjSpacing = Math.max(adjSpacing, 0.12);
  }
  // Store headlineX/Y for tagline positioning (rich indian ceo)
  layout.headlineX = 50 + (720 * (preset.headlinePosition?.x / 100 || 0));
  {
    const blockOff = (1280 * (preset.headlinePosition?.y / 100 || 0));
    layout.headlineY = (logoY + LOGO_BOX_H + logoToTextGap) + blockOff + eyebrowBlockH;
  }
  if (logoPathForOverlay) {
    console.log(`[generateOverlay] Logo overlay configured for "${name}": ${logoPathForOverlay}, position: ${(isTheRisingFounder || isTheRealFounder || isFoundersCracked) ? 'top-right' : 'top-left'}`);
  } else if (preset.logo && logoInsideVideo) {
    console.warn(`[generateOverlay] ⚠ Logo overlay NOT configured for "${name}" despite logoInsideVideo=true. Logo was: ${preset.logo}`);
  }
  return layout;
}

// Canvas loads the WRONG font for regular Poppins (fallback ~18% narrower than actual TTF).
// FFmpeg uses the actual TTF directly → regular needs 1.18 scale to match FFmpeg rendering.
// Bold: canvas correctly loads Poppins-Bold.ttf after font string fix → FFmpeg ratio ~1.049.
// Scale 1.06 (just above 1.049) gives bold gap ≈ adjSpacing with no overlap.
// Poppins advance widths come from opentype.js (exact TTF metrics = what FFmpeg uses). No scale needed.

function calculateRichLines(ctx, html, maxW, size, spacing, forceBold, fontFamily = 'Inter') {
  let cleanedHtml = cleanHTML(html);
  cleanedHtml = cleanedHtml.replace(/<\/?strong>/gi, (m) => m.toLowerCase().replace('strong', 'b'));
  cleanedHtml = cleanedHtml.replace(/<\/?b>/gi, (m) => m.toLowerCase());
  const usePoppinsFamilies = fontFamily === 'Poppins';
  const allLines = [];
  // Split by newline so <br> becomes real line breaks; process each logical line then word-wrap
  const logicalLines = cleanedHtml.split('\n').map(s => s.trim()).filter(Boolean);
  for (const lineHtml of logicalLines) {
    const tokens = [];
    lineHtml.split(/(<b>.*?<\/b>)/i).forEach(p => {
      if (!p) return;
      const isB = /^<b>/i.test(p);
      p.replace(/<\/?b>/gi, '').split(/\s+/).forEach(w => w && tokens.push({ text: w, bold: isB || forceBold }));
    });
    const lines = []; let cur = { tokens: [], width: 0 };
    tokens.forEach(t => {
      const isBoldWord = t.bold || forceBold;
      // Use same font strings as draw loop so line-break widths match rendered widths exactly.
      // Poppins: use opentype.js for exact TTF advance (canvas falls back to Sans on Windows).
      // Inter/others: use canvas measureText as usual.
      const w = usePoppinsFamilies
        ? measurePoppins(t.text, size, isBoldWord)
        : measureTokenWidth(ctx, t.text, size, isBoldWord, fontFamily);
      const advance = w + spacing * size;
      if (cur.width + advance > maxW && cur.tokens.length > 0) { lines.push(cur); cur = { tokens: [], width: 0 }; }
      cur.tokens.push(t); cur.width += advance;
    });
    if (cur.tokens.length > 0) lines.push(cur);
    allLines.push(...lines);
  }
  return allLines;
}

async function processFFmpeg(videoPath, outputPath, preset, layout, videoScale, fitMode) {
  const overlayPathAbs = resolve(layout.overlayPath || '');
  const outputPathAbs = resolve(outputPath);
  if (!existsSync(overlayPathAbs)) {
    throw new Error(`Overlay image not found for FFmpeg: ${overlayPathAbs}`);
  }
  console.log(`[processFFmpeg] "${preset.name}" overlay=${overlayPathAbs} out=${outputPathAbs}`);

  return new Promise(async (resolve, reject) => {
    // Get video dimensions for position-based panning
    let originalWidth = 1920; // Default fallback
    let originalHeight = 1080; // Default fallback

    try {
      const videoInfo = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
          if (err) return reject(err);
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          if (videoStream) {
            resolve({
              width: videoStream.width,
              height: videoStream.height
            });
          } else {
            reject(new Error('No video stream found'));
          }
        });
      });

      originalWidth = videoInfo.width;
      originalHeight = videoInfo.height;
    } catch (error) {
      console.warn('Could not probe video dimensions, using defaults:', error.message);
    }

    // No side padding: video always full canvas width (720) at x=0
    const CANVAS_W = 720;
    const sw = Math.round(CANVAS_W / 2) * 2;
    const sh = Math.round(layout.videoH / 2) * 2;
    const sx = 0;
    const sy = Math.round(layout.videoY);

    const posX = preset.position?.x ?? 50;
    const posY = preset.position?.y ?? 50;

    // Cover mode: scale up to cover the frame, then crop using posX/posY (0-100).
    // Formula matches CSS object-position: cropOffset = overflow * pos / 100
    const targetAspect = sw / sh;
    const originalAspect = originalWidth / originalHeight;
    let scaledWidth, scaledHeight;
    if (originalAspect > targetAspect) {
      scaledHeight = sh;
      scaledWidth = Math.round(sh * originalAspect / 2) * 2;
    } else {
      scaledWidth = sw;
      scaledHeight = Math.round(sw / originalAspect / 2) * 2;
    }
    const cropX = Math.max(0, Math.min(scaledWidth - sw, Math.round((scaledWidth - sw) * posX / 100)));
    const cropY = Math.max(0, Math.min(scaledHeight - sh, Math.round((scaledHeight - sh) * posY / 100)));
    const vFilter = `scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=increase,crop=${sw}:${sh}:${cropX}:${cropY}`;

    // Check if preset has rounded corners
    const borderRadius = preset.rules?.videoBorderRadius || 0;
    const hasRoundedCorners = borderRadius > 0;

    // Video as base: pad 720×videoHeight to 720×1280 (video at 0,sy full width), then overlay graphics. Composite alpha first, then convert to yuv420 so transparent hole shows video (no black bars).
    const filterChain = [
      `[0:v]${vFilter},setsar=1[v]`,
      `[v]pad=720:1280:0:${sy}:black[base]`,
      `[1:v]scale=720:1280,format=rgba[graphics]`,
      `[base][graphics]overlay=0:0[ovl]`,
      `[ovl]format=yuv420p[ovl]`
    ];

    if (hasRoundedCorners) {
      const radius = borderRadius;
      const w = sw;
      const h = sh;
      filterChain.length = 0;
      filterChain.push(`[0:v]${vFilter},setsar=1[v]`);
      filterChain.push(`[v]scale=${sw}:${sh}[v2]`);
      filterChain.push(`[v2]format=rgba[valpha]`);
      const maskExpr = `if(lt(min(min(X,${w}-X),min(Y,${h}-Y)),${radius}),0,1)`;
      filterChain.push(`[valpha]geq=a='${maskExpr}'[vrounded]`);
      filterChain.push(`[vrounded]format=yuv420p[v2]`);
      filterChain.push(`[v2]pad=720:1280:0:${sy}:black[base]`);
      filterChain.push(`[1:v]scale=720:1280,format=rgba[graphics]`);
      filterChain.push(`[base][graphics]overlay=0:0[ovl]`);
      filterChain.push(`[ovl]format=yuv420p[ovl]`);
    }

    // Add watermark as text overlay on top of video if needed
    // aicracked, theevolvinggpt and related Poppins presets must NEVER have a watermark (check by normalized name)
    const presetNameLower = (preset.name || '').toLowerCase().trim();
    const noWatermarkPresets = [
      'ceo hustle advice',
      'aicracked',
      'theevolvinggpt',
      'foundrsonig',
      'indianfoundr',
      'indiastartupstory',
      'neworderai',
      'indiasbestfounders',
      'elitefoundrs',
      'intelligence by ai',
      'the ai phaze',
      'that ai page',
      'revolution in tech',
      'startupsoncrack',
      'millionaire.founders',
      'startupscheming',
      'startupsxindia',
      'nobelfounders',
      'foundersxindia',
      'peakofai',
      'theprimefounder',
      'bestindianpodcast',
      'risewithcontent',
      'indian business com'
    ];
    const skipWatermark = noWatermarkPresets.includes(presetNameLower);
    if (layout.watermark && !skipWatermark) {
      // Calculate watermark position relative to video area
      // y position: from bottom of video, positioned higher (increase offset to move up)
      const watermarkY = sy + sh - (layout.watermark.y * 3); // Multiply by 3 to position higher
      const textY = Math.round(watermarkY);

      // For center alignment within the video area
      // Different positioning for different presets
      // bizzindia: 40% (perfect position), 101xfounders: more to the left
      const presetName = preset.name.toLowerCase();
      let xPercentage = 0.40; // Default for bizzindia
      if (presetName === '101xfounders') {
        xPercentage = 0.35; // More to the left for 101xfounders
      }

      // Calculate x position using percentage
      // Use text_align=center which centers the text at the x coordinate
      const videoCenterX = sx + (sw * xPercentage);
      const textX = Math.round(videoCenterX);

      // Use text_align=center to properly center the text at the x position
      // The x coordinate is the center point where text will be centered
      // For most presets watermark uses Inter Thin; for bizzindia and 101xfounders
      // it should be bold like the preview.
      const escapedText = layout.watermark.text.replace(/\\/g, "\\\\").replace(/'/g, '\u2019');
      let fontFileParam = '';
      // Choose bold fontfile only for these two watermark presets
      const isBoldWatermarkPreset = presetName === 'bizzindia' || presetName === '101xfounders' || presetName === 'indian-founders-co';
      if (isBoldWatermarkPreset && existsSync(interBold)) {
        const relativeFontPath = 'assets/fonts/Inter_18pt-Bold.ttf';
        fontFileParam = `:fontfile=${relativeFontPath}`;
      } else if (existsSync(interThin)) {
        // Default watermark font: Inter Thin
        const relativeFontPath = 'assets/fonts/Inter_18pt-Thin.ttf';
        fontFileParam = `:fontfile=${relativeFontPath}`;
      }
      const drawtextFilter = `[ovl]drawtext=text='${escapedText}':expansion=none:fontcolor=white@0.4:fontsize=24:x=${textX}:y=${textY}:text_align=center${fontFileParam}[watermarked]`;
      console.log('Watermark filter:', drawtextFilter);
      filterChain.push(drawtextFilter);

      // Add logo overlay if needed (after watermark)
      let currentOutput = 'watermarked';
      if (layout.logoOverlay) {
        const logoSize = layout.logoOverlay.size || 160;
        let logoX, logoY;
        if (layout.logoOverlay.position === 'top-right') {
          logoX = sx + sw - logoSize - 8;
          logoY = sy + 8;
        } else {
          logoX = sx + 8;
          logoY = sy + 8;
        }
        const logoOpacity = layout.logoOverlay.opacity;
        const opacityFilter = logoOpacity ? `,colorchannelmixer=aa=${logoOpacity}` : '';
        const r = logoSize / 2;
        const circularMask = layout.logoOverlay.circular ? `,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='if(lte(sqrt(pow(X-${r},2)+pow(Y-${r},2)),${r}),alpha(X,Y),0)'` : '';
        filterChain.push(`[2:v]scale=${logoSize}:${logoSize},format=rgba${circularMask}${opacityFilter}[logoscaled]`);
        const logoOverlayFilter = `[${currentOutput}][logoscaled]overlay=${logoX}:${logoY}[logoed]`;
        filterChain.push(logoOverlayFilter);
        currentOutput = 'logoed';
      }

      // Headline segments: use stored x (advance-width-based from canvas) so spacing is font-correct
      if (layout.headlineDrawtextSegments && layout.headlineDrawtextSegments.length > 0) {
        const segs = layout.headlineDrawtextSegments;
        const headlineFontSize = layout.headlineFontSize || 40;
        const poppinsReg = 'assets/fonts/Poppins-Regular.ttf';
        const poppinsBold = 'assets/fonts/Poppins-Bold.ttf';
        for (let i = 0; i < segs.length; i++) {
          const seg = segs[i];
          const drawX = seg.x;
          const fontFile = seg.bold ? poppinsBold : poppinsReg;
          const fontcolor =
            seg.color === '#1DB077' ? '0x1DB077'
              : seg.color === '#ECECDC' ? '0xECECDC'
                : seg.color === '#EF5350' ? '0xEF5350'
                  : seg.color === '#E53935' ? '0xE53935'
                    : seg.color === '#FFCD1D' ? '0xFFCD1D'
                      : seg.color === '#FB9C39' ? '0xFB9C39'
                        : seg.color === '#95C5D1' ? '0x95C5D1'
                          : seg.color === '#6523FF' ? '0x6523FF'
                            : seg.color === '#FDB05E' ? '0xFDB05E'
                              : seg.color === '#5887FF' ? '0x5887FF'
                                : seg.color === '#487AF9' ? '0x487AF9'
                                  : 'white';
          // Escape headline text for FFmpeg drawtext:
          // - '\'  -> '\\'
          // - ':'  -> '\:'
          // - '''  -> '\''
          const textEsc = seg.text
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/'/g, '\u2019');
          const inLabel = i === 0 ? currentOutput : `ht${i}`;
          const outLabel = i === segs.length - 1 ? 'headlineOut' : `ht${i + 1}`;
          filterChain.push(`[${inLabel}]drawtext=text='${textEsc}':expansion=none:fontfile=${fontFile}:fontsize=${headlineFontSize}:x=${drawX}:y=${seg.baselineY}:y_align=baseline:fontcolor=${fontcolor}[${outLabel}]`);
        }
        currentOutput = 'headlineOut';
      }
      // Orange border removed for Business Cracked
      filterChain.push(`[${currentOutput}]copy[out]`);
    } else {
      // Add logo overlay if needed (no watermark)
      let currentOutput = 'ovl';
      if (layout.logoOverlay) {
        const logoSize = layout.logoOverlay.size || 160;
        let logoX, logoY;
        if (layout.logoOverlay.position === 'top-right') {
          logoX = sx + sw - logoSize - 8;
          logoY = sy + 8;
        } else {
          logoX = sx + 8;
          logoY = sy + 8;
        }
        const logoOpacity = layout.logoOverlay.opacity;
        const opacityFilter = logoOpacity ? `,colorchannelmixer=aa=${logoOpacity}` : '';
        const r = logoSize / 2;
        const circularMask = layout.logoOverlay.circular ? `,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='if(lte(sqrt(pow(X-${r},2)+pow(Y-${r},2)),${r}),alpha(X,Y),0)'` : '';
        filterChain.push(`[2:v]scale=${logoSize}:${logoSize},format=rgba${circularMask}${opacityFilter}[logoscaled]`);
        const logoOverlayFilter = `[${currentOutput}][logoscaled]overlay=${logoX}:${logoY}[logoed]`;
        filterChain.push(logoOverlayFilter);
        currentOutput = 'logoed';
      }

      // Headline segments: use stored x (advance-width-based from canvas) so spacing is font-correct
      if (layout.headlineDrawtextSegments && layout.headlineDrawtextSegments.length > 0) {
        const segs = layout.headlineDrawtextSegments;
        const headlineFontSize = layout.headlineFontSize || 40;
        const poppinsReg = 'assets/fonts/Poppins-Regular.ttf';
        const poppinsBold = 'assets/fonts/Poppins-Bold.ttf';
        for (let i = 0; i < segs.length; i++) {
          const seg = segs[i];
          const drawX = seg.x;
          const fontFile = seg.bold ? poppinsBold : poppinsReg;
          const fontcolor =
            seg.color === '#1DB077' ? '0x1DB077'
              : seg.color === '#ECECDC' ? '0xECECDC'
                : seg.color === '#EF5350' ? '0xEF5350'
                  : seg.color === '#E53935' ? '0xE53935'
                    : seg.color === '#FFCD1D' ? '0xFFCD1D'
                      : seg.color === '#FB9C39' ? '0xFB9C39'
                        : seg.color === '#95C5D1' ? '0x95C5D1'
                          : seg.color === '#6523FF' ? '0x6523FF'
                            : seg.color === '#FDB05E' ? '0xFDB05E'
                              : seg.color === '#5887FF' ? '0x5887FF'
                                : seg.color === '#487AF9' ? '0x487AF9'
                                  : 'white';
          // Escape headline text for FFmpeg drawtext:
          // - '\'  -> '\\'
          // - ':'  -> '\:'
          // - '''  -> '\''
          const textEsc = seg.text
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/'/g, '\u2019');
          const inLabel = i === 0 ? currentOutput : `ht${i}`;
          const outLabel = i === segs.length - 1 ? 'headlineOut' : `ht${i + 1}`;
          filterChain.push(`[${inLabel}]drawtext=text='${textEsc}':expansion=none:fontfile=${fontFile}:fontsize=${headlineFontSize}:x=${drawX}:y=${seg.baselineY}:y_align=baseline:fontcolor=${fontcolor}[${outLabel}]`);
        }
        currentOutput = 'headlineOut';
      }
      // Tagline for rich indian ceo - "Premium side of Instagram for Founders" above hook, left aligned
      if (presetNameLower === 'rich indian ceo') {
        const taglineText = 'Premium side of Instagram for Founders';
        const tagEsc = taglineText.replace(/'/g, '\u2019');
        const tagX = 24; // left padding matching px-6
        const tagY = Math.max(10, Math.round(layout.headlineY - 70)); // above hook text with more gap
        const tagInLabel = currentOutput;
        const tagOutLabel = 'taglined';
        filterChain.push(`[${tagInLabel}]drawtext=text='${tagEsc}':expansion=none:fontfile=assets/fonts/Inter_18pt-Bold.ttf:fontsize=20:fontcolor=white:x=${tagX}:y=${tagY}[${tagOutLabel}]`);
        currentOutput = tagOutLabel;
      }
      // Orange border removed for Business Cracked
      filterChain.push(`[${currentOutput}]copy[out]`);
    }

    // Log the full filter chain for debugging
    console.log('Full FFmpeg filter chain:', filterChain);

    // Save current working directory and change to server directory for relative font paths
    const originalCwd = process.cwd();
    process.chdir(__dirname);

    // Build FFmpeg command with inputs
    let ffmpegCmd = ffmpeg(videoPath).input(overlayPathAbs);

    // Add logo as input if needed (input index 2)
    if (layout.logoOverlay) {
      console.log(`[processVideoWithFFmpeg] Adding logo as input: ${layout.logoOverlay.path}`);
      ffmpegCmd = ffmpegCmd.input(layout.logoOverlay.path);
    } else {
      console.log(`[processVideoWithFFmpeg] No logo overlay for preset "${preset.name}"`);
    }

    ffmpegCmd.complexFilter(filterChain)
      .outputOptions(['-map [out]', '-map 0:a?', '-c:v libx264', '-preset superfast', '-crf 20', '-pix_fmt yuv420p'])
      .on('error', (err, stdout, stderr) => {
        console.error('[FFmpeg] error:', err.message);
        if (stderr) console.error('[FFmpeg] stderr:', stderr);
        const enhanced = new Error(err.message + (stderr ? `\nFFmpeg stderr: ${stderr.slice(-800)}` : ''));
        enhanced.stderr = stderr;
        process.chdir(originalCwd);
        reject(enhanced);
      })
      .on('end', () => {
        process.chdir(originalCwd); // Restore original working directory
        if (!existsSync(outputPathAbs)) {
          reject(new Error(`FFmpeg finished but output file was not created: ${outputPathAbs}`));
          return;
        }
        const stat = statSync(outputPathAbs);
        if (stat.size === 0) {
          reject(new Error(`FFmpeg output file is empty: ${outputPathAbs}`));
          return;
        }
        console.log(`[FFmpeg] OK: ${outputPathAbs} (${stat.size} bytes)`);
        resolve();
      }).save(outputPathAbs);
  });
}
