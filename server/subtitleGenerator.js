/**
 * Generate ASS (Advanced SubStation Alpha) subtitle file from transcript segments.
 * ASS supports bold, outline, shadow, positioning — perfect for reel-style subtitles.
 */

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadSync as opentypeLoad } from 'opentype.js';

const __subtitleDir = dirname(fileURLToPath(import.meta.url));
let _otCaptionBold = null;
let _otCaptionTried = false;

function getCaptionFont() {
  if (_otCaptionTried) return _otCaptionBold;
  _otCaptionTried = true;
  const fontPath = join(__subtitleDir, 'assets', 'fonts', 'Montserrat-ExtraBold.ttf');
  if (existsSync(fontPath)) {
    try {
      _otCaptionBold = opentypeLoad(fontPath);
      console.log('✓ Caption layout font: Montserrat ExtraBold (opentype)');
    } catch (e) {
      console.warn('Caption opentype load failed:', e.message);
    }
  }
  return _otCaptionBold;
}

/** Advance width matching the ASS burn font (Montserrat ExtraBold). */
function measureCaptionWidth(text, fontSize) {
  const font = getCaptionFont();
  const str = String(text || '');
  if (font) {
    try {
      const w = font.getAdvanceWidth(str, fontSize);
      if (Number.isFinite(w) && w > 0) return w;
    } catch { /* fall through */ }
  }
  // Conservative fallback — slightly wide so words don't collide.
  return str.length * fontSize * 0.62;
}

/**
 * Multi-line caption layout: wrap to stay on-screen, centre each line, stack
 * upward from posY (bottom of the caption block). Returns per-word {x,y,line}.
 */
function layoutCaptionWords(texts, {
  fontSize = 58,
  posX = 360,
  posY = 1020,
  resX = 720,
  maxLineWidth = null,
  lineHeightMul = 1.22,
  wordGapMul = 0.7,
} = {}) {
  // Real inter-word gap in px. Outline (~4) + italic need headroom.
  const gap = Math.max(18, Math.round(fontSize * wordGapMul));
  const maxW = maxLineWidth ?? Math.round(resX * 0.86);
  const widths = texts.map((t) => measureCaptionWidth(t, fontSize));

  const lines = [];
  let cur = { indices: [], width: 0 };
  for (let i = 0; i < texts.length; i++) {
    const w = widths[i];
    const next = cur.indices.length === 0 ? w : cur.width + gap + w;
    if (cur.indices.length > 0 && next > maxW) {
      lines.push(cur);
      cur = { indices: [i], width: w };
    } else {
      cur.indices.push(i);
      cur.width = next;
    }
  }
  if (cur.indices.length) lines.push(cur);

  const lineH = fontSize * lineHeightMul;
  // Last line sits on posY; earlier lines stack above (bottom-anchored block).
  const firstY = posY - lineH * (lines.length - 1);
  const positions = texts.map(() => ({ x: posX, y: posY, line: 0 }));

  lines.forEach((line, li) => {
    const y = Math.round(firstY + li * lineH);
    let left = posX - line.width / 2;
    for (const idx of line.indices) {
      positions[idx] = {
        x: Math.round(left + widths[idx] / 2),
        y,
        line: li,
      };
      left += widths[idx] + gap;
    }
  });
  return positions;
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
    maxWordsPerBlock = 8,
    maxBlockDuration = 3.5,
    lingerAfterLast = 0.6, // how long the finished sentence stays before clear
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
    normalized.push({ text, start, end, highlight: !!w.highlight });
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
/** Fast from the bottom, smooth decelerate into the slot. Matches preview. */
function easeOutCubic(t) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

/** Opacity ramps 0→1 over the first 70% of travel distance. */
function opacityFromTravel(travel) {
  if (travel >= 0.7) return 1;
  if (travel <= 0) return 0;
  return travel / 0.7;
}

function assAlphaHex(opacity) {
  const a = Math.round((1 - Math.min(1, Math.max(0, opacity))) * 255);
  return a.toString(16).padStart(2, '0').toUpperCase();
}

/**
 * ASS \move is linear only. Approximate ease-out rise with short linear segments
 * along the ease-out curve so words shoot up then decelerate into their slot.
 * Each segment also carries start/end opacity for the 0→100 fade by 70% travel.
 *
 * ASS timestamps only have centisecond precision — keep each segment ≥20ms so
 * events don't collapse into zero-duration (which makes the rise look linear).
 */
function risingMoveSegments(posX, posY, riseY, riseMs, steps = 8) {
  const segs = [];
  const maxByTime = Math.max(4, Math.floor(riseMs / 20));
  const n = Math.max(4, Math.min(steps | 0, maxByTime));
  for (let i = 0; i < n; i++) {
    const u0 = i / n;
    const u1 = (i + 1) / n;
    const travel0 = easeOutCubic(u0);
    const travel1 = easeOutCubic(u1);
    const y0 = Math.round(posY + riseY * (1 - travel0));
    const y1 = Math.round(posY + riseY * (1 - travel1));
    const t0 = Math.round(riseMs * u0);
    const t1 = Math.round(riseMs * u1);
    segs.push({
      x: posX,
      y0,
      y1,
      t0,
      t1,
      dur: Math.max(20, t1 - t0),
      op0: opacityFromTravel(travel0),
      op1: opacityFromTravel(travel1),
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
    popFromScale = 100,
    popToScale = 100,
    popDurationMs = 0,
    popSettleScale = 100,
    popSettleMs = 0,
    reveal = 'accumulate',
    riseOn = 'word',
    riseY = 44,
    riseMs = 220,
    posX = 360,
    posY = 1020,
    resX = 720,
    resY = 1280,
    maxLineWidth = null,
    wordGapMul = 0.7,
  } = options;

  const blocks = buildCaptionBlocks(words, options);

  return {
    meta: {
      resX, resY, fontName, fontSize,
      baseColor, activeColor, outlineColor,
      slantDeg, popFromScale, popToScale, popDurationMs, popSettleScale, popSettleMs,
      reveal, riseOn, riseY, riseMs, posX, posY,
      wordsPerBlockMax: options.maxWordsPerBlock ?? 8,
      maxLineWidth: maxLineWidth ?? Math.round(resX * 0.86),
      wordGapMul,
    },
    blockCount: blocks.length,
    wordCount: blocks.reduce((n, b) => n + b.words.length, 0),
    blocks: blocks.map(b => {
      const layout = layoutCaptionWords(b.words.map((w) => w.text), {
        fontSize, posX, posY, resX, maxLineWidth, wordGapMul,
      });
      return {
        index: b.index,
        start: +b.start.toFixed(3),
        end: +b.end.toFixed(3),
        text: b.words.map(w => w.text).join(' '),
        words: b.words.map((w, i) => ({
          text: w.text,
          start: +w.start.toFixed(3),
          end: +w.end.toFixed(3),
          highlight: !!w.highlight,
          x: layout[i].x,
          y: layout[i].y,
          line: layout[i].line,
          activeFrom: +w.start.toFixed(3),
          activeTo: +(i + 1 < b.words.length ? b.words[i + 1].start : b.end).toFixed(3),
          activeColor,
          baseColor,
        })),
      };
    }),
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
    activeColor = '#FF0000',           // highlighted / active words — red + italic
    outlineColor = '#000000',
    outline = 4,
    shadow = 2,
    slantDeg = 0,         // flat by default; set negative for CapCut-style tilt
    popFromScale = 100,    // no size pop — words arrive at full size
    popToScale = 100,
    popDurationMs = 0,
    popSettleScale = 100,
    popSettleMs = 0,
    glow = true,
    glowBlur = 14,
    glowBorder = 7,
    glowColor = null,      // defaults to activeColor
    reveal = 'accumulate', // 'accumulate' builds the line word by word; 'all' shows the whole block
    riseOn = 'word',       // which words slide up: every 'word', only each 'block', or 'none'
    riseY = 44,            // distance the incoming word travels upward, in PlayRes px
    riseMs = 220,          // smooth rise; ease-out segments slow the settle into the slot
    posX = 360,
    posY = 1020,           // bottom-anchored caption block
    resX = 720,
    resY = 1280,
    maxLineWidth = null,
    wordGapMul = 0.7,
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

  // No scale pop — words always land at full size (rise + fade only).
  const popTagsFrom = () => '\\fscx100\\fscy100';

  const blocks = buildCaptionBlocks(words, options);
  const dialogues = [];

  // Fade alpha from op0→op1 within a rise segment (0→100 by 70% travel).
  const fadeTags = (op0, op1, dur, fill, outlineCol, bord, blur) => {
    const a0 = assAlphaHex(op0);
    const a1 = assAlphaHex(op1);
    const baseTags = `\\alpha&H${a0}&\\c${fill}\\3c${outlineCol}\\bord${bord}\\blur${blur}`;
    if (a0 === a1) return baseTags;
    return `${baseTags}\\t(0,${dur},\\alpha&H${a1}&)`;
  };

  for (const block of blocks) {
    const ws = block.words;
    const layout = layoutCaptionWords(ws.map((w) => w.text), {
      fontSize, posX, posY, resX, maxLineWidth, wordGapMul,
    });
    const blockEndT = toASSTime(block.end);

    for (let j = 0; j < ws.length; j++) {
      const evStart = ws[j].start;
      const nextStart = (j + 1 < ws.length) ? ws[j + 1].start : block.end;
      if (nextStart <= evStart) continue;

      const rises = riseOn === 'word' || (riseOn === 'block' && j === 0);
      const cx = layout[j].x;
      const cy = layout[j].y;
      const isHighlight = !!ws[j].highlight;
      const wordText = ASS_ESCAPE(ws[j].text);
      const paintWord = (anchor, colorTags, scaleTags) => (
        `{${anchor}\\frz${frz}${colorTags}${scaleTags}}${wordText}`
      );

      // Highlighted words stay red + italic; plain words are white.
      const solidPlain = `\\alpha&H00&\\c${base}\\3c${outlineC}\\bord${outline}\\blur0\\i0`;
      const solidHi = `\\alpha&H00&\\c${active}\\3c${outlineC}\\bord${outline}\\blur0\\i1`;
      const solidGlow = (fill) => (
        `\\alpha&H00&\\c${fill}\\3c${fill}\\bord${glowBorder}\\blur${glowBlur}`
      );

      let holdFrom = evStart;

      // Play the FULL riseMs the user set — do not clamp to the next word's
      // audio start (that made rise-speed / rise-height sliders look dead).
      const riseEndAbs = Math.min(block.end, evStart + (riseMs > 0 ? riseMs / 1000 : 0));

      if (rises && riseY > 0 && riseMs > 0) {
        const segs = risingMoveSegments(cx, cy, riseY, riseMs, 8);
        for (const seg of segs) {
          const segStart = evStart + seg.t0 / 1000;
          let segEnd = Math.min(block.end, evStart + seg.t1 / 1000);
          if (segEnd - segStart < 0.01) segEnd = segStart + 0.01;
          if (segEnd <= segStart || segStart >= block.end) continue;
          const eventMs = Math.max(20, Math.round((segEnd - segStart) * 1000));
          const move = `\\move(${seg.x},${seg.y0},${seg.x},${seg.y1},0,${eventMs})`;
          const scaleTags = popTagsFrom(seg.t0);
          const s = toASSTime(segStart);
          const e = toASSTime(segEnd);
          if (s === e) continue;
          // Rising word is always the "active" emphasis: red + italic.
          const riseFill = active;
          const activeTags = fadeTags(seg.op0, seg.op1, eventMs, riseFill, outlineC, outline, 0) + '\\i1';
          const glowTags = fadeTags(seg.op0, seg.op1, eventMs, glowC, glowC, glowBorder, glowBlur);
          if (glow) {
            dialogues.push(`Dialogue: 0,${s},${e},Default,,0,0,0,,${paintWord(move, glowTags, scaleTags)}`);
          }
          dialogues.push(`Dialogue: 2,${s},${e},Default,,0,0,0,,${paintWord(move, activeTags, scaleTags)}`);
        }
        holdFrom = riseEndAbs;
      }

      // Hold in its own multi-line slot until the entire sentence finishes
      // (block.end already includes lingerAfterLast from style).
      // No glow on the hold copy — a second blurred layer looked like a ghost.
      if (holdFrom < block.end) {
        const hs = toASSTime(holdFrom);
        if (hs !== blockEndT) {
          const fixed = `\\pos(${cx},${cy})`;
          const holdTags = isHighlight ? solidHi : solidPlain;
          dialogues.push(
            `Dialogue: 1,${hs},${blockEndT},Default,,0,0,0,,${paintWord(fixed, holdTags, '\\fscx100\\fscy100')}`,
          );
        }
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
