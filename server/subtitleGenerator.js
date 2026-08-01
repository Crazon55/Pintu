/**
 * Generate ASS (Advanced SubStation Alpha) subtitle file from transcript segments.
 * ASS supports bold, outline, shadow, positioning — perfect for reel-style subtitles.
 */

import { createCanvas, registerFont } from 'canvas';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __subtitleDir = dirname(fileURLToPath(import.meta.url));
let _captionMeasureCtx = null;
let _captionFontReady = false;

function ensureCaptionFont() {
  if (_captionFontReady) return;
  _captionFontReady = true;
  const fontPath = join(__subtitleDir, 'assets', 'fonts', 'Montserrat-ExtraBold.ttf');
  if (existsSync(fontPath)) {
    try {
      // Same family name videoProcessor registers — reuse if already loaded.
      registerFont(fontPath, { family: 'MontserratExtraBold', weight: 'normal' });
    } catch {
      /* already registered */
    }
  }
}

/** Advance width for caption layout (matches Montserrat ExtraBold burn font). */
function measureCaptionWidth(text, fontSize) {
  ensureCaptionFont();
  if (!_captionMeasureCtx) {
    _captionMeasureCtx = createCanvas(4, 4).getContext('2d');
  }
  _captionMeasureCtx.font = `${fontSize}px MontserratExtraBold`;
  const w = _captionMeasureCtx.measureText(String(text || '')).width;
  return w > 1 ? w : String(text || '').length * fontSize * 0.55;
}

/**
 * Center-X for each word in a block so every token rises into its own slot.
 * Gap matches the preview (0.28 × fontSize).
 */
function wordCenterXs(texts, fontSize, posX) {
  const gap = fontSize * 0.28;
  const widths = texts.map((t) => measureCaptionWidth(t, fontSize));
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, widths.length - 1);
  let left = posX - total / 2;
  return widths.map((w) => {
    const cx = left + w / 2;
    left += w + gap;
    return Math.round(cx);
  });
}

/**
 * Convert seconds to ASS timestamp format: H:MM:SS.cc
 */
function toASSTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * Generate ASS subtitle content from segments.
 *
 * @param {Array} segments - [{start: number, end: number, text: string}, ...]
 * @param {Object} options - Style options
 * @param {string} options.fontName - Font name (default: 'Inter')
 * @param {number} options.fontSize - Font size (default: 52)
 * @param {string} options.primaryColor - Text color in ASS BGR hex (default: '&H00FFFFFF' white)
 * @param {string} options.outlineColor - Outline color (default: '&H00000000' black)
 * @param {number} options.outline - Outline width (default: 3)
 * @param {number} options.shadow - Shadow depth (default: 1)
 * @param {boolean} options.bold - Bold text (default: true)
 * @param {number} options.marginV - Vertical margin from bottom (default: 60)
 * @param {number} options.resX - Video width (default: 720)
 * @param {number} options.resY - Video height (default: 1280)
 * @returns {string} ASS file content
 */
export function generateASS(segments, options = {}) {
  const {
    fontName = 'Neue Haas Grotesk Display Pro',
    fontSize = 48,
    primaryColor = '&H00FFFFFF',
    outlineColor = '&H00000000',
    outline = 3,
    shadow = 1,
    bold = false,
    marginV = 300,
    alignment = 2, // 2 = bottom-center (marginV controls distance from bottom)
    resX = 720,
    resY = 1280,
  } = options;

  const boldFlag = bold ? -1 : 0;

  const header = `[Script Info]
Title: Pintu Subtitles
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF,${outlineColor},&H80000000,${boldFlag},0,0,0,100,100,0,0,1,${outline},${shadow},${alignment},20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const dialogues = segments.map(seg => {
    const start = toASSTime(seg.start);
    const end = toASSTime(seg.end);
    // Escape ASS special chars
    const text = seg.text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
  });

  return header + '\n' + dialogues.join('\n') + '\n';
}

/**
 * Generate ASS for "Indian Founder" style — words accumulate on screen one by one
 * (karaoke build-up), with keyword highlights in yellow/green.
 *
 * How it works:
 * - Words are grouped into phrases (5-8 words, or split at punctuation)
 * - Within each phrase, words appear one at a time and stay on screen
 * - The full phrase shows from first-word-start to last-word-end
 * - Each word has its own timing for the "pop in" moment
 * - Highlighted words render in bold italic yellow
 * - When the phrase ends, screen clears and next phrase starts building
 *
 * @param {Array} words - Word-level timestamps [{start, end, text, highlight?}, ...]
 * @param {Object} options - Style options
 */
export function generateIndianFounderASS(words, options = {}) {
  const {
    fontName = 'Montserrat',
    fontSize = 52,
    primaryColor = '&H00FFFFFF',       // white
    highlightColor = '&H0000FFFF',     // yellow (ASS BGR: 00FFFF = yellow)
    outlineColor = '&H00000000',       // black
    outline = 4,
    shadow = 2,
    posX = 360,
    posY = 900,
    resX = 720,
    resY = 1280,
    maxWordsPerPhrase = 4,
  } = options;

  const header = `[Script Info]
Title: Pintu Subtitles - Indian Founder Style
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},&HFF000000,${outlineColor},&H80000000,-1,0,0,0,100,100,0,0,1,${outline},${shadow},5,40,40,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  // Step 1: Group words into phrases (split at punctuation or maxWordsPerPhrase)
  const PUNCT = /[.,!?;:]$/;
  const phrases = [];
  let current = [];
  for (const w of words) {
    if (!w.text) continue;
    current.push(w);
    const duration = current.length > 0 ? w.end - current[0].start : 0;
    if (current.length >= maxWordsPerPhrase || duration >= 2.0 || PUNCT.test(w.text)) {
      phrases.push([...current]);
      current = [];
    }
  }
  if (current.length > 0) phrases.push(current);

  // Step 2: For each phrase, generate ONE dialogue with karaoke tags
  // ASS \k tags make words appear one at a time — no flicker, perfectly smooth
  // SecondaryColour is transparent so words are invisible until their karaoke time
  const dialogues = [];
  for (const phrase of phrases) {
    if (phrase.length === 0) continue;
    const phraseStart = phrase[0].start;
    const phraseEnd = phrase[phrase.length - 1].end + 0.2; // slight linger

    // Build karaoke text: \kN = duration in centiseconds before this word appears
    let karaokeText = '';
    for (let wi = 0; wi < phrase.length; wi++) {
      const w = phrase[wi];
      const escaped = w.text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}');

      // Duration = time from previous word end (or phrase start) to this word's start
      const prevEnd = wi === 0 ? phraseStart : phrase[wi - 1].end;
      const gap = Math.max(0, w.start - prevEnd);
      const wordDur = w.end - w.start;
      // \k for the gap (invisible pause) + \k for the word itself
      const gapCs = Math.round(gap * 100);
      const wordCs = Math.round(wordDur * 100);

      if (w.highlight) {
        // Highlighted word: yellow, italic, slightly bigger
        if (gapCs > 0) karaokeText += `{\\k${gapCs}}`;
        karaokeText += `{\\k${wordCs}\\c${highlightColor}\\i1\\fscx110\\fscy110}${escaped}{\\c${primaryColor}\\i0\\fscx100\\fscy100} `;
      } else {
        if (gapCs > 0) karaokeText += `{\\k${gapCs}}`;
        karaokeText += `{\\k${wordCs}}${escaped} `;
      }
    }

    const start = toASSTime(phraseStart);
    const end = toASSTime(phraseEnd);
    const posOverride = `{\\pos(${posX},${posY})}`;
    dialogues.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${posOverride}${karaokeText.trim()}`);
  }

  return header + '\n' + dialogues.join('\n') + '\n';
}

/**
 * ASS stores colours as &HAABBGGRR (byte-reversed from web hex).
 * Accepts '#RRGGBB', 'RRGGBB', or a pre-built '&H..' string.
 */
function toAssColor(color, fallback = '&H00FFFFFF&') {
  if (typeof color !== 'string' || !color.trim()) return fallback;
  const raw = color.trim();
  if (raw.startsWith('&H')) return raw.endsWith('&') ? raw : `${raw}&`;
  const hex = raw.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  const [r, g, b] = [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)];
  return `&H00${b}${g}${r}`.toUpperCase() + '&';
}

const ASS_ESCAPE = (s) => String(s)
  .replace(/\\/g, '\\\\')
  .replace(/\{/g, '\\{')
  .replace(/\}/g, '\\}');

/**
 * Group word-level timestamps into short on-screen blocks.
 *
 * Accepts either {text} or {word} as the token key so raw Whisper/Groq output
 * can be passed straight through.
 *
 * @param {Array} words - [{word|text, start, end}, ...]
 * @returns {Array} [{index, start, end, words: [{text, start, end}]}, ...]
 */
export function buildCaptionBlocks(words, options = {}) {
  const {
    maxWordsPerBlock = 4,
    maxBlockDuration = 2.0,
    lingerAfterLast = 0.18,
    minWordDuration = 0.12,
  } = options;

  const PUNCT = /[.,!?;:—]$/;

  const normalized = [];
  for (const w of words || []) {
    const text = String(w?.text ?? w?.word ?? '').trim();
    if (!text) continue;
    const start = Number(w.start);
    if (!Number.isFinite(start) || start < 0) continue;
    let end = Number(w.end);
    if (!Number.isFinite(end) || end <= start) end = start + minWordDuration;
    normalized.push({ text, start, end });
  }
  normalized.sort((a, b) => a.start - b.start);

  const grouped = [];
  let current = [];
  const flush = () => { if (current.length) { grouped.push(current); current = []; } };
  for (const w of normalized) {
    current.push(w);
    const spanned = w.end - current[0].start;
    if (current.length >= maxWordsPerBlock || spanned >= maxBlockDuration || PUNCT.test(w.text)) {
      flush();
    }
  }
  flush();

  const blocks = grouped.map((ws, index) => ({
    index,
    start: ws[0].start,
    end: ws[ws.length - 1].end + lingerAfterLast,
    words: ws,
  }));

  // Never leave two blocks on screen at once.
  for (let i = 0; i < blocks.length - 1; i++) {
    if (blocks[i].end > blocks[i + 1].start) blocks[i].end = blocks[i + 1].start;
  }

  return blocks.filter(b => b.end > b.start);
}

/**
 * Renderer-agnostic caption spec (JSON) for the same layout the ASS output uses.
 * Useful for driving a non-FFmpeg renderer or for validating groupings.
 */
/** Fast start → slow finish (strong settle). Matches preview / ASS rise. */
function easeOutQuint(t) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 5;
}

/**
 * ASS \move is linear only. Approximate ease-out rise with short linear segments
 * along the ease-out curve so words shoot up then decelerate into their slot.
 */
function risingMoveSegments(posX, posY, riseY, riseMs, steps = 8) {
  const segs = [];
  const n = Math.max(3, steps | 0);
  for (let i = 0; i < n; i++) {
    const u0 = i / n;
    const u1 = (i + 1) / n;
    const y0 = Math.round(posY + riseY * (1 - easeOutQuint(u0)));
    const y1 = Math.round(posY + riseY * (1 - easeOutQuint(u1)));
    const t0 = Math.round(riseMs * u0);
    const t1 = Math.round(riseMs * u1);
    segs.push({
      x: posX,
      y0,
      y1,
      t0,
      t1,
      dur: Math.max(1, t1 - t0),
    });
  }
  return segs;
}

export function buildCaptionSpec(words, options = {}) {
  const {
    fontName = 'Montserrat ExtraBold',
    fontSize = 58,
    baseColor = '#FFFFFF',
    activeColor = '#FF0000',
    outlineColor = '#000000',
    slantDeg = 0,
    popFromScale = 88,
    popToScale = 108,
    popDurationMs = 90,
    popSettleScale = 100,
    popSettleMs = 110,
    reveal = 'accumulate',
    riseOn = 'word',
    riseY = 50,
    riseMs = 120,
    resX = 720,
    resY = 1280,
  } = options;

  const blocks = buildCaptionBlocks(words, options);

  return {
    meta: {
      resX, resY, fontName, fontSize,
      baseColor, activeColor, outlineColor,
      slantDeg, popFromScale, popToScale, popDurationMs, popSettleScale, popSettleMs,
      reveal, riseOn, riseY, riseMs,
      wordsPerBlockMax: options.maxWordsPerBlock ?? 4,
    },
    blockCount: blocks.length,
    wordCount: blocks.reduce((n, b) => n + b.words.length, 0),
    blocks: blocks.map(b => ({
      index: b.index,
      start: +b.start.toFixed(3),
      end: +b.end.toFixed(3),
      text: b.words.map(w => w.text).join(' '),
      words: b.words.map((w, i) => ({
        text: w.text,
        start: +w.start.toFixed(3),
        end: +w.end.toFixed(3),
        // window during which this word is the highlighted one
        activeFrom: +w.start.toFixed(3),
        activeTo: +(i + 1 < b.words.length ? b.words[i + 1].start : b.end).toFixed(3),
        activeColor,
        baseColor,
      })),
    })),
  };
}

/**
 * Word-level captions that build a sentence one word at a time: each word
 * rises from below into its own measured X slot (ease-out settle), earlier
 * words stay put, and the line clears when the next block starts.
 *
 * Per word event:
 *   layer 0  glow on the incoming word (same X as its slot)
 *   layer 1  each already-spoken word, anchored at its own centre-X
 *   layer 2  the incoming word, rising on that same centre-X
 *
 * @param {Array} words - Word-level timestamps [{word|text, start, end}, ...]
 * @param {Object} options
 */
export function generateWordHighlightASS(words, options = {}) {
  const {
    fontName = 'Montserrat ExtraBold', // family name of Montserrat-ExtraBold.ttf
    bold = false,                      // that file's subfamily is Regular; forcing bold causes fallback
    fontSize = 58,
    baseColor = '#FFFFFF',
    activeColor = '#FF0000',
    outlineColor = '#000000',
    outline = 4,
    shadow = 2,
    slantDeg = 0,         // flat by default; set negative for CapCut-style tilt
    popFromScale = 88,
    popToScale = 108,
    popDurationMs = 90,
    popSettleScale = 100,  // ease back to resting size as the word lands
    popSettleMs = 110,
    glow = true,
    glowBlur = 11,
    glowBorder = 7,
    glowColor = null,      // defaults to activeColor
    reveal = 'accumulate', // 'accumulate' builds the line word by word; 'all' shows the whole block
    riseOn = 'word',       // which words slide up: every 'word', only each 'block', or 'none'
    riseY = 50,            // distance the incoming word travels upward, in PlayRes px
    riseMs = 120,          // fast start; ease-out segments slow the settle into the slot
    posX = 360,
    posY = 900,
    resX = 720,
    resY = 1280,
  } = options;

  const base = toAssColor(baseColor);
  const active = toAssColor(activeColor, '&H000000FF&');
  const outlineC = toAssColor(outlineColor, '&H00000000&');
  const glowC = toAssColor(glowColor || activeColor, '&H000000FF&');

  const boldFlag = bold ? -1 : 0;
  const frz = ((Number(slantDeg) || 0) % 360 + 360) % 360;
  // ASS \t accel: <1 starts fast and ends slow (ease-out).
  const EASE_OUT = 0.25;

  const header = `[Script Info]
Title: Pintu Subtitles - Word Highlight
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${base},${base},${outlineC},&H80000000,${boldFlag},0,0,0,100,100,0,0,1,${outline},${shadow},5,40,40,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  // Scale pop: shoot up with ease-out, then settle to resting size with ease-out.
  // When the rising word is split across Dialogue events, each event must resume
  // the pop timeline from the elapsed ms since word onset (\t is per-event).
  const settleTo = Number.isFinite(popSettleScale) ? popSettleScale : 100;
  const settleMs = Number.isFinite(popSettleMs) ? popSettleMs : popDurationMs;
  const scaleAt = (ms) => {
    if (ms <= 0) return popFromScale;
    if (ms < popDurationMs) {
      const p = easeOutQuint(ms / popDurationMs);
      return popFromScale + (popToScale - popFromScale) * p;
    }
    if (ms < popDurationMs + settleMs) {
      const p = easeOutQuint((ms - popDurationMs) / settleMs);
      return popToScale + (settleTo - popToScale) * p;
    }
    return settleTo;
  };
  const popTagsFrom = (elapsedMs) => {
    const total = popDurationMs + settleMs;
    const cur = Math.round(scaleAt(elapsedMs));
    if (elapsedMs >= total) return `\\fscx${settleTo}\\fscy${settleTo}`;
    if (elapsedMs < popDurationMs) {
      return `\\fscx${cur}\\fscy${cur}` +
        `\\t(0,${popDurationMs - elapsedMs},${EASE_OUT},\\fscx${popToScale}\\fscy${popToScale})` +
        `\\t(${popDurationMs - elapsedMs},${total - elapsedMs},${EASE_OUT},\\fscx${settleTo}\\fscy${settleTo})`;
    }
    return `\\fscx${cur}\\fscy${cur}` +
      `\\t(0,${total - elapsedMs},${EASE_OUT},\\fscx${settleTo}\\fscy${settleTo})`;
  };

  const accumulate = reveal !== 'all';
  const blocks = buildCaptionBlocks(words, options);
  const dialogues = [];

  for (const block of blocks) {
    const ws = block.words;
    const centers = wordCenterXs(ws.map((w) => w.text), fontSize, posX);

    for (let j = 0; j < ws.length; j++) {
      const evStart = ws[j].start;
      const evEnd = (j + 1 < ws.length) ? ws[j + 1].start : block.end;
      if (evEnd <= evStart) continue;

      const rises = riseOn === 'word' || (riseOn === 'block' && j === 0);
      const cx = centers[j];
      const start = toASSTime(evStart);
      const end = toASSTime(evEnd);
      const wordText = ASS_ESCAPE(ws[j].text);

      const paintWord = (anchor, colorTags, scaleTags) => (
        `{${anchor}\\frz${frz}${colorTags}${scaleTags}}${wordText}`
      );

      // Settled neighbours stay at their own X — never ride the rising move.
      for (let k = 0; k < ws.length; k++) {
        if (k === j) continue;
        const show = accumulate ? k < j : true;
        if (!show) continue;
        const settled = ASS_ESCAPE(ws[k].text);
        dialogues.push(
          `Dialogue: 1,${start},${end},Default,,0,0,0,,` +
          `{\\pos(${centers[k]},${posY})\\frz${frz}\\alpha&H00&\\c${base}\\3c${outlineC}\\bord${outline}\\blur0\\fscx100\\fscy100}${settled}`,
        );
      }

      const activeColorTags = `\\alpha&H00&\\c${active}\\3c${outlineC}\\bord${outline}\\blur0`;
      const glowColorTags = `\\alpha&H00&\\c${glowC}\\3c${glowC}\\bord${glowBorder}\\blur${glowBlur}`;

      if (rises && riseY > 0 && riseMs > 0) {
        const segs = risingMoveSegments(cx, posY, riseY, riseMs, 8);
        for (const seg of segs) {
          const segStart = evStart + seg.t0 / 1000;
          const segEnd = Math.min(evEnd, evStart + seg.t1 / 1000);
          if (segEnd <= segStart) continue;
          const move = `\\move(${seg.x},${seg.y0},${seg.x},${seg.y1},0,${seg.dur})`;
          const scaleTags = popTagsFrom(seg.t0);
          const s = toASSTime(segStart);
          const e = toASSTime(segEnd);
          if (glow) {
            dialogues.push(`Dialogue: 0,${s},${e},Default,,0,0,0,,${paintWord(move, glowColorTags, scaleTags)}`);
          }
          dialogues.push(`Dialogue: 2,${s},${e},Default,,0,0,0,,${paintWord(move, activeColorTags, scaleTags)}`);
        }
        const riseEnd = evStart + riseMs / 1000;
        if (riseEnd < evEnd) {
          const s = toASSTime(riseEnd);
          const scaleTags = popTagsFrom(riseMs);
          const fixed = `\\pos(${cx},${posY})`;
          if (glow) {
            dialogues.push(`Dialogue: 0,${s},${end},Default,,0,0,0,,${paintWord(fixed, glowColorTags, scaleTags)}`);
          }
          dialogues.push(`Dialogue: 2,${s},${end},Default,,0,0,0,,${paintWord(fixed, activeColorTags, scaleTags)}`);
        }
      } else {
        const scaleTags = popTagsFrom(0);
        const fixed = `\\pos(${cx},${posY})`;
        if (glow) {
          dialogues.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${paintWord(fixed, glowColorTags, scaleTags)}`);
        }
        dialogues.push(`Dialogue: 2,${start},${end},Default,,0,0,0,,${paintWord(fixed, activeColorTags, scaleTags)}`);
      }
    }
  }

  return header + '\n' + dialogues.join('\n') + '\n';
}

/**
 * Generate SRT subtitle content (simpler format, less styling).
 */
export function generateSRT(segments) {
  return segments.map((seg, i) => {
    const start = toSRTTime(seg.start);
    const end = toSRTTime(seg.end);
    return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
  }).join('\n');
}

function toSRTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}
