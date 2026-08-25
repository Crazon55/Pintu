/**
 * Generate ASS (Advanced SubStation Alpha) subtitle file from transcript segments.
 * ASS supports bold, outline, shadow, positioning — perfect for reel-style subtitles.
 */

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadSync as opentypeLoad } from 'opentype.js';
import { findCaptionFont } from '../captionFonts.js';
import {
  CAPTION_DEFAULT_STYLE,
  CAPTION_DEFAULT_NORMAL_STYLE,
  CAPTION_DEFAULT_BIZZ_STYLE,
  CAPTION_DEFAULT_PODCAST_RED_STYLE,
} from '../shared/captionDefaults.js';
import {
  effectiveMaxLineWidth,
  layoutWrapAllowed,
  sequenceCaptionBlocks,
} from '../shared/captionEngine.js';

const __subtitleDir = dirname(fileURLToPath(import.meta.url));
const _otCache = new Map();

function loadOtFontFile(fileName) {
  if (!fileName) return null;
  if (_otCache.has(fileName)) return _otCache.get(fileName);
  const fontPath = join(__subtitleDir, 'assets', 'fonts', fileName);
  if (!existsSync(fontPath)) {
    _otCache.set(fileName, null);
    return null;
  }
  try {
    const font = opentypeLoad(fontPath);
    _otCache.set(fileName, font);
    console.log(`✓ Caption layout font: ${fileName} (opentype)`);
    return font;
  } catch (e) {
    console.warn(`Caption opentype load failed (${fileName}):`, e.message);
    _otCache.set(fileName, null);
    return null;
  }
}

function resolveFontMeta(assOrId, fallbackFile) {
  const meta = findCaptionFont(assOrId);
  if (meta) return meta;
  return {
    assName: assOrId || 'Montserrat Black',
    file: fallbackFile,
    style: 'normal',
    weight: 700,
  };
}

// DirectWrite maps ASS Fontsize onto WinAscent+WinDescent (the GDI cell), not the
// em-square CSS `font-size` uses. Helvetica Now's cell is 1.47× its em, so a 37
// ASS face comes out ~35% too small and the same \pos slots look like huge gaps.
function gdiFontSize(cssPx, fontFile) {
  const n = Number(cssPx);
  if (!Number.isFinite(n) || n <= 0) return cssPx;
  const font = loadOtFontFile(fontFile);
  const os2 = font?.tables?.os2;
  const em = font?.unitsPerEm || 0;
  const cell = (os2?.usWinAscent || 0) + (os2?.usWinDescent || 0);
  const k = (cell > 0 && em > 0) ? cell / em : 1;
  return Math.max(1, Math.round(n * k));
}

/** Advance width matching the ASS burn font for each word type. */
function measureCaptionWidth(text, fontSize, highlight = false, fontFile = null, letterSpacing = 0) {
  const fallback = highlight ? 'PlayfairDisplay-BoldItalic.ttf' : 'Montserrat-Black.ttf';
  const font = loadOtFontFile(fontFile || fallback);
  const str = String(text || '');
  let w = 0;
  if (font) {
    try {
      const adv = font.getAdvanceWidth(str, fontSize);
      if (Number.isFinite(adv) && adv > 0) w = adv;
    } catch { /* fall through */ }
  }
  if (!(w > 0)) {
    w = str.length * fontSize * (highlight ? 0.58 : 0.62);
  }
  const spacing = Number(letterSpacing) || 0;
  if (spacing && str.length > 1) w += (str.length - 1) * spacing;
  return w;
}

/**
 * Multi-line caption layout: wrap to stay on-screen.
 * EVERY line is center-aligned as a group (1 word, 2 words, or a full sentence).
 * Wrapped line 2+ stays centered under line 1 (tucked-in look).
 * Returns per-word {x,y,line}.
 */
function layoutCaptionWords(wordInputs, {
  fontSize = 58,
  posX = 360,
  posY = 1020,
  resX = 720,
  maxLineWidth = null,
  lineHeightMul = 0.78,
  wordGapMul = 0.05,
  outline = 2,
  highlightScale = 125,
  highlightWeight = 0,
  lineStartX = 80,
  maxLines = 1,
  letterSpacing = 0,
  roleBy = 'word',
  textCase = 'none',
  popFromScale = 100,
  exitScale = 100,
  driftMax = 0,
  obliqueDeg = 0,
  glow = false,
  glowBlur = 0,
  glowBorder = 0,
  baseGlowStrength = 0,
  baseInnerGlowStrength = 0,
  highlightGlowStrength = 0,
  highlightInnerGlowStrength = 0,
  baseFontFile = 'Montserrat-Black.ttf',
  highlightFontFile = 'PlayfairDisplay-BoldItalic.ttf',
} = {}) {
  const texts = wordInputs.map((w) => applyTextCase(typeof w === 'string' ? w : w.text, textCase));
  const highlights = wordInputs.map((w) => (typeof w === 'object' ? !!w.highlight : false));
  const hiMul = Math.max(0.2, Math.min(3, (Number(highlightScale) || 125) / 100));
  // Gap scales with the slot — a 43% continuation line must not get full-size gaps.
  const gapAt = (lineIdx) => Math.round(
    fontSize * (Number(wordGapMul) || 0)
    * (roleBy === 'line' && lineIdx > 0 ? hiMul : 1),
  );
  const maxW = effectiveMaxLineWidth({
    fontSize,
    maxLineWidth,
    popFromScale,
    obliqueDeg,
    glow,
    glowBlur,
    glowBorder,
    baseGlowStrength,
    baseInnerGlowStrength,
    highlightGlowStrength,
    highlightInnerGlowStrength,
  }, resX);
  const layoutStyle = { roleBy, maxLines };
  const spacing = Number(letterSpacing) || 0;
  // Which slot a word uses can depend on the line it lands on (Podcast Red styles
  // continuation lines, not marked words), and its width depends on that slot — so width
  // is asked for per candidate line instead of computed once up front.
  const usesHi = (i, lineIdx) => (roleBy === 'line' ? lineIdx > 0 : highlights[i]);
  const widthAt = (i, lineIdx) => {
    const hi = usesHi(i, lineIdx);
    const file = hi ? highlightFontFile : baseFontFile;
    // Measure at the size libass will actually render, not the CSS size. The Style row
    // carries gdiFontSize(fontSize), which for THE BOLD FONT is 1.2x the CSS value — so
    // measuring at fontSize handed every word a slot a fifth too narrow and the words
    // overlapped. This only bites when the editor sends no layout; when it does, its own
    // widths win and each word is scaled into them.
    const raw = measureCaptionWidth(texts[i], gdiFontSize(fontSize, file), hi, file, spacing);
    return raw * (hi ? hiMul : 1);
  };

  if (texts.length === 0) return [];

  const lines = [];
  let cur = { indices: [], width: 0 };
  for (let i = 0; i < texts.length; i++) {
    const li = lines.length;
    const w = widthAt(i, li);
    const next = cur.indices.length === 0 ? w : cur.width + gapAt(li) + w;
    const forcedBreak = i > 0 && !!(typeof wordInputs[i] === 'object' && wordInputs[i].lineBreak);
    const canWrap = layoutWrapAllowed(layoutStyle, wordInputs, i, lines.length);
    if (cur.indices.length > 0 && (forcedBreak || (canWrap && next > maxW))) {
      lines.push(cur);
      cur = { indices: [i], width: widthAt(i, lines.length) };
    } else {
      cur.indices.push(i);
      cur.width = next;
    }
  }
  if (cur.indices.length) lines.push(cur);

  const lineH = fontSize * lineHeightMul;
  const positions = texts.map(() => ({ x: Math.round(resX / 2), y: posY, line: 0 }));

  lines.forEach((line, li) => {
    const y = Math.round(posY + li * lineH);
    // Always center the whole line group on the frame.
    let left = Math.round(resX / 2 - line.width / 2);
    for (const idx of line.indices) {
      const w = widthAt(idx, li);
      positions[idx] = {
        x: Math.round(left + w / 2),
        y,
        line: li,
      };
      left += w + gapAt(li);
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
function blockWordsToAssLines(ws) {
  const lines = [];
  let cur = [];
  for (const w of ws || []) {
    if (w.lineBreak && cur.length) {
      lines.push(cur.join(' '));
      cur = [];
    }
    const t = String(w.text || '').trim();
    if (t) cur.push(t);
  }
  if (cur.length) lines.push(cur.join(' '));
  return lines
    .map((line) => ASS_ESCAPE(line))
    .filter(Boolean)
    .join('\\N');
}

/**
 * Classic lower-third captions: one cue per sentence group, all words on
 * screen at once, single font + outline. Built from the same sentence grouping
 * as word-highlight so transcript edits still apply.
 */
export function generateNormalASS(words, rawOptions = {}) {
  // Defaults come from the shared table so the burn cannot diverge from the preview.
  const options = { ...CAPTION_DEFAULT_NORMAL_STYLE, ...rawOptions };
  const {
    fontSize = 42,
    baseColor = '#FFFFFF',
    outlineColor = '#000000',
    outline = 3,
    shadow = 1,
    posX = 360,
    posY = 1100,
    resX = 720,
    resY = 1280,
    letterSpacing = 0,
    baseFontName,
    fontName,
  } = options;

  const meta = resolveFontMeta(baseFontName || fontName, 'Inter-Bold.ttf');
  const fill = toAssColor(baseColor, '&H00FFFFFF&');
  const outlineC = toAssColor(outlineColor, '&H00000000&');
  const spacing = Number(letterSpacing) || 0;
  const bord = Math.max(0, Number.isFinite(Number(outline)) ? Number(outline) : 3);
  const italic = (meta.style || '').toLowerCase() === 'italic' ? -1 : 0;
  const boldFlag = (meta.weight || 700) >= 700 ? -1 : 0;
  const fsp = spacing ? `\\fsp${spacing}` : '';

  const header = `[Script Info]
Title: Pintu Subtitles - Normal
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
LayoutResX: ${resX}
LayoutResY: ${resY}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${meta.assName},${gdiFontSize(fontSize, meta.file)},${fill},&H000000FF,${outlineC},&H80000000,${boldFlag},${italic},0,0,100,100,${spacing},0,1,${bord},${shadow},5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const segments = buildCaptionBlocks(words || [], options).map((b) => ({
    start: b.start,
    end: b.end,
    text: blockWordsToAssLines(b.words),
  }));

  const dialogues = segments.filter((seg) => seg.text).map((seg) => {
    const start = toASSTime(seg.start);
    const end = toASSTime(seg.end);
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,{\\an5\\pos(${posX},${posY})${fsp}}${seg.text}`;
  });

  return header + '\n' + dialogues.join('\n') + '\n';
}

/** Lower-cased / upper-cased line text, or left alone. Preview does the same with CSS. */
function applyTextCase(text, textCase) {
  if (textCase === 'lower') return String(text).toLowerCase();
  if (textCase === 'upper') return String(text).toUpperCase();
  return String(text);
}

/**
 * "The Bizz Playbook" captions: two lowercase words a card, centred at 70% height,
 * white Helvetica Bold with a black stroke and a hard offset drop shadow.
 *
 * Same one-cue-per-group shape as normal mode, with two things the ASS Style row
 * cannot express:
 *   - the drop shadow is a second, blurred copy of the line drawn underneath at the
 *     x/y offset, because ASS's Shadow field is a hard diagonal at a single depth with
 *     no blur, no separate axes and no opacity of its own;
 *   - emphasised words switch colour inline, which is only affordable here because the
 *     whole line is one \pos'd event, so no per-word layout has to be reproduced.
 */
export function generateBizzPlaybookASS(words, rawOptions = {}) {
  const options = { ...CAPTION_DEFAULT_BIZZ_STYLE, ...rawOptions };
  const {
    fontSize = 43,
    baseColor = '#FFFFFF',
    activeColor = '#FFFFFF',
    outlineColor = '#000000',
    outline = 3,
    posX = 360,
    posY = 896,
    resX = 720,
    resY = 1280,
    letterSpacing = -5,
    textCase = 'lower',
    shadowColor = '#000000',
    shadowOpacity = 100,
    shadowOffsetX = 5,
    shadowOffsetY = 5,
    shadowBlur = 10,
    glow = false,
    glowColor = null,
    glowBlur = 0,
    glowBorder = 0,
    baseGlowStrength = 100,
    baseFontName,
    fontName,
  } = options;

  const meta = resolveFontMeta(baseFontName || fontName, 'HELVETICANOWTEXT-BOLD-DEMO.TTF');
  const fill = toAssColor(baseColor, '&H00FFFFFF&');
  const hiFill = toAssColor(activeColor, fill);
  const outlineC = toAssColor(outlineColor, '&H00000000&');
  const shadowC = toAssColor(shadowColor, '&H00000000&');
  const spacing = Number(letterSpacing) || 0;
  const bord = Math.max(0, Number(outline) || 0);
  const italic = (meta.style || '').toLowerCase() === 'italic' ? -1 : 0;
  const boldFlag = (meta.weight || 700) >= 700 ? -1 : 0;
  const fsp = spacing ? `\\fsp${spacing}` : '';
  const shadowAlpha = assAlphaHex(Math.max(0, Math.min(100, Number(shadowOpacity) || 0)) / 100);
  // CSS text-shadow's blur radius is roughly twice libass's gaussian strength.
  const blur = Math.max(0, (Number(shadowBlur) || 0) / 2);
  const dx = Number(shadowOffsetX) || 0;
  const dy = Number(shadowOffsetY) || 0;
  const drawsShadow = shadowAlpha !== 'FF' && (dx || dy || blur);

  // Glow: the same trick as the shadow copy, but centred and in its own colour — a blurred,
  // spread copy of the line under everything else. Bizz India runs white text over a red
  // glow with no stroke and no shadow, so this layer is the only thing separating the
  // caption from a bright frame. Blur halves for libass the same way the shadow's does.
  const glowOn = glow === true && ((Number(glowBlur) || 0) > 0 || (Number(glowBorder) || 0) > 0);
  const glowC = toAssColor(glowColor || baseColor, fill);
  const glowSpread = Math.max(0, Number(glowBorder) || 0);
  const glowBlurAss = Math.max(0, (Number(glowBlur) || 0) / 2);
  const glowAlpha = assAlphaHex(Math.max(0, Math.min(500, Number(baseGlowStrength) ?? 100)) / 100);

  const header = `[Script Info]
Title: Pintu Subtitles - The Bizz Playbook
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
LayoutResX: ${resX}
LayoutResY: ${resY}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${meta.assName},${gdiFontSize(fontSize, meta.file)},${fill},&H000000FF,${outlineC},&H80000000,${boldFlag},${italic},0,0,100,100,${spacing},0,1,${bord},0,5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  // Characters the caption face has no glyph for — currency signs, accents, fractions —
  // are drawn from Inter for those characters only, then the run switches straight back.
  // Without this THE BOLD FONT (121 glyphs) renders a rupee sign as nothing at all.
  const escape = (t) => assEscapeWithGlyphFallback(t, meta.file, meta.assName);

  // One cue per group. `emphasis` off gives the plain silhouette the shadow copy needs.
  const lineText = (ws, { emphasis }) => {
    const lines = [];
    let cur = [];
    for (const w of ws || []) {
      if (w.lineBreak && cur.length) { lines.push(cur); cur = []; }
      const t = applyTextCase(String(w.text || '').trim(), textCase);
      if (t) cur.push({ text: t, highlight: !!w.highlight });
    }
    if (cur.length) lines.push(cur);
    return lines
      .map((line) => line
        .map((w) => (emphasis && w.highlight && hiFill !== fill
          ? `{\\c${hiFill}}${escape(w.text)}{\\c${fill}}`
          : escape(w.text)))
        .join(' '))
      .filter(Boolean)
      .join('\\N');
  };

  const blocks = buildCaptionBlocks(words || [], options);
  const dialogues = [];
  for (const b of blocks) {
    const body = lineText(b.words, { emphasis: true });
    if (!body) continue;
    const start = toASSTime(b.start);
    const end = toASSTime(b.end);
    if (glowOn) {
      const bloom = lineText(b.words, { emphasis: false });
      dialogues.push(
        `Dialogue: 0,${start},${end},Default,,0,0,0,,`
        + `{\\an5\\pos(${posX},${posY})\\c${glowC}\\3c${glowC}`
        + `\\bord${glowSpread}\\shad0\\blur${glowBlurAss}\\alpha&H${glowAlpha}&${fsp}}${bloom}`,
      );
    }
    if (drawsShadow) {
      // Layer 0: the silhouette — fill and stroke both in the shadow colour — offset and blurred.
      const ghost = lineText(b.words, { emphasis: false });
      dialogues.push(
        `Dialogue: 1,${start},${end},Default,,0,0,0,,`
        + `{\\an5\\pos(${posX + dx},${posY + dy})\\c${shadowC}\\3c${shadowC}`
        + `\\bord${bord}\\shad0\\blur${blur}\\alpha&H${shadowAlpha}&${fsp}}${ghost}`,
      );
    }
    dialogues.push(
      `Dialogue: 2,${start},${end},Default,,0,0,0,,`
      + `{\\an5\\pos(${posX},${posY})\\c${fill}\\3c${outlineC}\\bord${bord}\\shad0${fsp}}${body}`,
    );
  }

  return header + '\n' + dialogues.join('\n') + '\n';
}

export function generateASS(segments, options = {}) {
  return generateNormalASS(segments, { ...options, fontName: options.fontName || 'Neue Haas Grotesk Display Pro' });
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
LayoutResX: ${resX}
LayoutResY: ${resY}
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

function otHasGlyph(font, ch) {
  if (!font || !ch) return false;
  try {
    const g = font.charToGlyph(ch);
    return !!(g && g.index > 0 && g.name !== '.notdef');
  } catch {
    return false;
  }
}

/**
 * Escape ASS text; for glyphs missing from the burn font (e.g. ₹ in Helvetica World),
 * temporarily switch to Inter so libass can draw them.
 */
function assEscapeWithGlyphFallback(
  text,
  primaryFile,
  primaryAssName,
  fallbackFile = 'Inter_18pt-Bold.ttf',
  fallbackAssName = 'Inter 18pt',
) {
  const str = String(text ?? '');
  if (!str) return '';
  const primary = loadOtFontFile(primaryFile);
  const fallback = loadOtFontFile(fallbackFile);
  if (!primary || !fallback || primaryFile === fallbackFile) return ASS_ESCAPE(str);

  let out = '';
  let run = '';
  let usingFallback = null;
  const flush = () => {
    if (!run) return;
    const escaped = ASS_ESCAPE(run);
    out += usingFallback
      ? `{\\fn${fallbackAssName}}${escaped}{\\fn${primaryAssName}}`
      : escaped;
    run = '';
  };
  for (const ch of str) {
    const needFb = !otHasGlyph(primary, ch) && otHasGlyph(fallback, ch);
    if (usingFallback !== null && needFb !== usingFallback) flush();
    usingFallback = needFb;
    run += ch;
  }
  flush();
  return out;
}

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
    maxCharsPerBlock = 0, // 0 = no cap; Bizz Playbook uses 24 so a line never overruns
    maxBlockDuration = 3.5,
    lingerAfterLast = 2.5, // how long the finished sentence stays before clear
    exitMs = 0,
    minWordDuration = 0.12,
    manualGrouping = false, // honor breakBefore + array order (user-edited sentences)
    maxLines = 2,
  } = options;

  const PUNCT = /[.,!?;:—]$/;

  const normalized = [];
  for (let i = 0; i < (words || []).length; i++) {
    const w = words[i];
    const text = String(w?.text ?? w?.word ?? '').trim();
    if (!text) continue;
    const start = Number(w.start);
    if (!Number.isFinite(start) || start < 0) continue;
    let end = Number(w.end);
    if (!Number.isFinite(end) || end <= start) end = start + minWordDuration;
    normalized.push({
      text,
      start,
      end,
      highlight: !!w.highlight,
      breakBefore: !!w.breakBefore,
      id: w.id || `w-${i}-${start}`,
    });
  }

  const grouped = [];
  let current = [];
  const flush = () => { if (current.length) { grouped.push(current); current = []; } };

  if (manualGrouping) {
    // User-defined sentences: preserve order, split only on breakBefore.
    for (let i = 0; i < normalized.length; i++) {
      const w = normalized[i];
      if (i > 0 && w.breakBefore) flush();
      current.push(w);
    }
    flush();
  } else {
    const charCap = Math.max(0, Number(maxCharsPerBlock) || 0);
    const runLength = (ws, next) => ws.reduce((n, x) => n + x.text.length + 1, -1) + 1 + next.length;
    normalized.sort((a, b) => a.start - b.start);
    for (const w of normalized) {
      // Break before the word that would push the line past the cap, not after it.
      if (charCap && current.length && runLength(current, w.text) > charCap) flush();
      current.push(w);
      const spanned = w.end - current[0].start;
      if (
        current.length >= maxWordsPerBlock
        || (current.length >= 3 && (spanned >= maxBlockDuration || PUNCT.test(w.text)))
      ) {
        flush();
      }
    }
    flush();
  }

  // Pair consecutive sentences into one on-screen frame (each sentence = one centered line).
  const pairN = Math.max(1, Math.min(4, Number(maxLines) || 1));
  const frames = [];
  if (pairN > 1 && grouped.length > 1) {
    for (let i = 0; i < grouped.length; i += pairN) {
      const chunk = grouped.slice(i, i + pairN);
      const wordsOut = [];
      chunk.forEach((sent, si) => {
        sent.forEach((w, wi) => {
          wordsOut.push({ ...w, lineBreak: si > 0 && wi === 0 });
        });
      });
      frames.push(wordsOut);
    }
  } else {
    frames.push(...grouped);
  }

  const blocks = frames.map((ws, index) => {
    const end = Math.max(...ws.map((w) => w.end))
      + Math.max(0, Number(lingerAfterLast) || 0)
      + Math.max(0, Number(exitMs) || 0) / 1000;
    return {
      index,
      start: Math.min(...ws.map((w) => w.start)),
      end,
      words: ws.map((w, i) => ({
        ...w,
        activeFrom: w.start,
        activeTo: i + 1 < ws.length ? ws[i + 1].start : end,
      })),
    };
  });

  // Each card keeps its hold + exit; the next card waits rather than cutting the scale-out short.
  blocks.sort((a, b) => a.start - b.start);
  return sequenceCaptionBlocks(blocks, { lingerAfterLast, exitMs });
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

/**
 * Every word (highlight or not) reveals at its own natural audio start time.
 * Word timestamps are already chronological, so this is trivially in reading
 * order with zero perceptible lag — earlier versions artificially delayed the
 * highlighted word (to "wait for the sentence to settle" before its punch-in),
 * but that wait (hundreds of ms) is longer than the gap between fast-spoken
 * Hinglish words, so the next word regularly finished its own rise animation
 * and appeared BEFORE the still-waiting highlight — reading as a skipped word.
 * The highlight still reads as distinct through color/font/italic/scale, not
 * a forced time offset.
 */
export function computeRevealStarts(ws) {
  return ws.map((w) => (
    Number.isFinite(Number(w.activeFrom)) ? Number(w.activeFrom) : w.start
  ));
}

export function buildCaptionSpec(words, rawOptions = {}) {
  const options = { ...CAPTION_DEFAULT_STYLE, ...rawOptions };
  const {
    fontName = options.baseFontName || 'Montserrat Black',
    baseFontName = fontName,
    highlightFontName = 'Playfair Bold Italic',
    fontSize = 56,
    baseColor = '#EDEAE3',
    activeColor = '#FF7A00',
    outlineColor = '#141414',
    slantDeg = 0,
    popFromScale = 100,
    popToScale = 100,
    popDurationMs = 0,
    popSettleScale = 100,
    popSettleMs = 0,
    reveal = 'accumulate',
    riseOn = 'word',
    riseY = 36,
    riseMs = 460,
    posX = 360,
    posY = 1020,
    resX = 720,
    resY = 1280,
    maxLineWidth = null,
    wordGapMul = 0.05,
    highlightScale = 125,
    highlightWeight = 0,
    lineStartX = 80,
    maxLines = 1,
    letterSpacing = 0,
    lineHeightMul = 0.78,
  } = options;

  const blocks = buildCaptionBlocks(words, options);
  const startX = Math.max(10, Number(lineStartX) || 80);
  const linesCap = Math.max(1, Math.min(4, Number(maxLines) || 1));
  const spacing = Number(letterSpacing) || 0;
  const baseMeta = resolveFontMeta(baseFontName || fontName, 'Montserrat-Black.ttf');
  const hiMeta = resolveFontMeta(highlightFontName, 'PlayfairDisplay-BoldItalic.ttf');
  const resolvedBase = baseMeta.assName;
  const resolvedHi = hiMeta.assName;

  return {
    meta: {
      resX, resY,
      fontName: resolvedBase,
      baseFontName: resolvedBase,
      highlightFontName: resolvedHi,
      fontSize,
      baseColor, activeColor, outlineColor,
      slantDeg, popFromScale, popToScale, popDurationMs, popSettleScale, popSettleMs,
      reveal, riseOn, riseY, riseMs, posX, posY, lineStartX: startX, maxLines: linesCap,
      wordsPerBlockMax: options.maxWordsPerBlock ?? 8,
      maxLineWidth: maxLineWidth ?? Math.max(200, Math.round(resX - startX - 40)),
      wordGapMul,
      letterSpacing: spacing,
      lineHeightMul: Number.isFinite(Number(lineHeightMul)) ? Number(lineHeightMul) : 0.78,
      lingerAfterLast: options.lingerAfterLast ?? 2.5,
      highlightScale,
      highlightWeight: 0,
      glow: options.glow !== false,
      glowBlur: options.glowBlur ?? 0,
      glowBorder: options.glowBorder ?? 35,
      baseGlowStrength: options.baseGlowStrength ?? options.glowStrength ?? 469,
      highlightGlowStrength: options.highlightGlowStrength ?? options.glowStrength ?? 354,
      highlightInnerGlowStrength: options.highlightInnerGlowStrength ?? 100,
      innerGlowBlur: options.innerGlowBlur ?? 3,
    },
    blockCount: blocks.length,
    wordCount: blocks.reduce((n, b) => n + b.words.length, 0),
    blocks: blocks.map(b => {
      const layout = layoutCaptionWords(b.words, {
        fontSize, posX, posY, resX, maxLineWidth, wordGapMul,
        lineHeightMul: Number.isFinite(Number(lineHeightMul)) ? Number(lineHeightMul) : 0.78,
        outline: options.outline ?? 2,
        highlightScale,
        highlightWeight: 0,
        lineStartX: startX,
        maxLines: linesCap,
        letterSpacing: spacing,
        popFromScale,
        obliqueDeg,
        glow: options.glow !== false,
        glowBlur: options.glowBlur ?? 0,
        glowBorder: options.glowBorder ?? 0,
        baseGlowStrength: options.baseGlowStrength ?? options.glowStrength ?? 0,
        baseInnerGlowStrength: options.baseInnerGlowStrength ?? 0,
        highlightGlowStrength: options.highlightGlowStrength ?? options.glowStrength ?? 0,
        highlightInnerGlowStrength: options.highlightInnerGlowStrength ?? 0,
        baseFontFile: baseMeta.file,
        highlightFontFile: hiMeta.file,
      });
      const revealStarts = computeRevealStarts(b.words, { riseMs });
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
          activeFrom: Number.isFinite(Number(w.activeFrom))
            ? +Number(w.activeFrom).toFixed(3)
            : +revealStarts[i].toFixed(3),
          activeTo: +(i + 1 < b.words.length ? revealStarts[i + 1] : b.end).toFixed(3),
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
export function generateWordHighlightASS(words, rawOptions = {}) {
  // Podcast Red (roleBy: line) must not inherit Flow defaults — that is how export lost
  // The Bold Font / red glow / oblique / edge highlight while the preview kept them.
  const lookDefaults = rawOptions?.roleBy === 'line'
    ? CAPTION_DEFAULT_PODCAST_RED_STYLE
    : CAPTION_DEFAULT_STYLE;
  const options = { ...lookDefaults, ...rawOptions };
  const {
    fontName = options.baseFontName || 'Montserrat Black',
    baseFontName = fontName,
    highlightFontName = 'Playfair Bold Italic',
    bold = false,
    fontSize = 56,
    baseColor = '#EDEAE3',
    activeColor = '#FF7A00',
    outlineColor = '#141414',
    outline = 2,
    shadow = 0,
    slantDeg = 0,
    // Podcast Red styles the continuation lines rather than marked words — see roleBy.
    roleBy = 'word',
    textCase = 'none',
    // Synthetic italic: a shear that leaves the baseline flat. slantDeg rotates the whole
    // line instead, which is a different effect and stays available alongside this.
    obliqueDeg = 0,
    // Card exit: fade out over exitMs while scaling to exitScale, instead of cutting.
    exitMs = 0,
    exitScale = 100,
    // ASS interpolates a 	 as ((t-t1)/(t2-t1))^accel, so >1 holds the card near its
    // resting size and then lets it go late, instead of moving hardest on the first frame.
    exitAccel = 1,
    // Card drift: how fast it grows (% per second) and how far it may go in total (%).
    driftPerSec = 0,
    driftMax = 0,
    popFromScale = 100,
    popToScale = 100,
    popDurationMs = 0,
    popSettleScale = 100,
    popSettleMs = 0,
    glow = true,
    glowStrength = 35,
    baseGlowStrength = null,
    baseInnerGlowStrength = 0,
    highlightGlowStrength = null,
    highlightInnerGlowStrength = 100,
    glowBlur = 0,
    glowBorder = 35,
    innerGlowBlur = 4,
    glowColor = null,
    glowOpacity = null,
    highlightScale = 125,
    highlightWeight = 0,
    reveal = 'accumulate',
    riseOn = 'word',
    riseY = 36,
    riseMs = 460,
    posX = 360,
    posY = 1020,
    resX = 720,
    resY = 1280,
    maxLineWidth = null,
    wordGapMul = 0.05,
    lineStartX = 80,
    maxLines = 1,
    letterSpacing = 0,
    lineHeightMul = 0.78,
    baseEdgeHighlight = 0,
    edgeHighlightColor = '#FFFFFF',
  } = options;

  // Floor was 80: an emphasis word never shrinks much. Podcast Red's second tier is 43%
  // of the first, which is a size relationship rather than emphasis, so the range opens up.
  const hiScale = Math.max(20, Math.min(300, Number(highlightScale) || 125));
  const startX = Math.max(10, Number(lineStartX) || 80);
  const linesCap = Math.max(1, Math.min(4, Number(maxLines) || 1));
  const spacing = Number(letterSpacing) || 0;
  const baseMeta = resolveFontMeta(baseFontName || fontName, 'Montserrat-Black.ttf');
  const hiMeta = resolveFontMeta(highlightFontName, 'PlayfairDisplay-BoldItalic.ttf');
  const resolvedBase = baseMeta.assName;
  const resolvedHi = hiMeta.assName;
  const hiItalic = (hiMeta.style || '').toLowerCase() === 'italic';
  // libass picks a face by family + the bold/italic flags. Some of our families already
  // encode weight in the NAME ("HelveticaNowText Bold", "Montserrat Black") and their
  // internal subfamily is Regular, so they need no flag. Others ("EB Garamond") carry the
  // weight in the subfamily, so without 1 libass loads the REGULAR italic face while the
  // editor measured and drew the BOLD italic one. Bold is wider, so the editor reserved
  // wide slots that narrow glyphs then sat inside — that is the gap between words.
  const needsBoldTag = (meta) => (Number(meta?.weight) || 400) >= 600
    && !/bold|black|heavy/i.test(String(meta?.assName || ''));
  const hiBoldTag = needsBoldTag(hiMeta) ? '\\b1' : '\\b0';
  const baseBoldTag = needsBoldTag(baseMeta) ? '\\b1' : '\\b0';
  const base = toAssColor(baseColor);
  const active = toAssColor(activeColor, '&H000000FF&');
  const outlineC = toAssColor(outlineColor, '&H00000000&');
  // Mirror of the editor's `textShadow: 0 1.4px 2.24px rgba(0,0,0,0.75)` — an offset dark
  // shadow, not an outline. a&H40& is 75% opaque.
  // No shadow. It only applied to the hold state, not the rise, so it ticked in as each
  // word landed. Contrast comes from the glow behind the word instead.
  const baseShadow = '\\shad0';
  const glowC = toAssColor(glowColor || activeColor, '&H000000FF&');
  const baseGlowC = toAssColor(baseColor, '&H00FFFFFF&');
  const edgeHiPx = Math.max(0, Math.min(8, Number(baseEdgeHighlight) || 0));
  const edgeHiC = toAssColor(edgeHighlightColor || '#FFFFFF');
  const bevelForBase = roleBy === 'line' && edgeHiPx > 0;

  const offsetAnchor = (anchor, dx, dy) => {
    const pos = anchor.match(/\\pos\(([-\d.]+),([-\d.]+)\)/);
    if (pos) {
      return anchor.replace(
        /\\pos\([-\d.]+,[-\d.]+\)/,
        `\\pos(${(Number(pos[1]) + dx).toFixed(2)},${(Number(pos[2]) + dy).toFixed(2)})`,
      );
    }
    const mov = anchor.match(/\\move\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+),(\d+),(\d+)\)/);
    if (mov) {
      return anchor.replace(
        /\\move\([-\d.]+,[-\d.]+,[-\d.]+,[-\d.]+,\d+,\d+\)/,
        `\\move(${(Number(mov[1]) + dx).toFixed(2)},${(Number(mov[2]) + dy).toFixed(2)},`
          + `${(Number(mov[3]) + dx).toFixed(2)},${(Number(mov[4]) + dy).toFixed(2)},${mov[5]},${mov[6]})`,
      );
    }
    return anchor;
  };

  // The editor strokes with -webkit-text-stroke under `paint-order: stroke fill`, so the
  // fill covers the inner half and only half the width is ever visible. ASS ord draws
  // entirely outside the glyph, so the same number renders a stroke twice as heavy — which
  // is why the export showed hard border lines the preview does not have.
  const assOutline = Math.max(0, (Number(outline) || 0) / 2);
  const boldFlag = bold ? -1 : 0;
  const frz = ((Number(slantDeg) || 0) % 360 + 360) % 360;
  // Synthetic oblique. \fax shears the glyphs horizontally and leaves the baseline flat,
  // which is what an italic of a upright face looks like; \frz would tilt the whole line.
  // tan() converts the angle to a shear factor, NEGATED: libass leans glyphs LEFT for a
  // positive ax (measured, not assumed), while the preview's CSS skewX leans them right.
  // Unnegated, every burned caption slanted backwards against the preview.
  const obliq = Math.max(-45, Math.min(45, Number(obliqueDeg) || 0));
  const faxTag = obliq ? `\\fax${(-Math.tan((obliq * Math.PI) / 180)).toFixed(3)}` : '';
  const fnBase = `\\fn${resolvedBase}`;
  const fnHi = `\\fn${resolvedHi}`;
  const fsp = `\\fsp${spacing}`;
  // ASS \t accel: <1 starts fast and ends slow (ease-out).
  const EASE_OUT = 0.25;

  const header = `[Script Info]
Title: Pintu Subtitles - Word Highlight
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
LayoutResX: ${resX}
LayoutResY: ${resY}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${resolvedBase},${gdiFontSize(fontSize, baseMeta.file)},${base},${base},${outlineC},&H80000000,${boldFlag},0,0,0,100,100,${spacing},0,1,${assOutline},${shadow},5,40,40,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  // No scale pop — words always land at full size (rise + fade only).
  // Highlight scale is applied by callers so it isn't wiped by a trailing \fscx100.
  const popTagsFrom = (highlight = false) => (
    highlight
      ? `\\fscx${hiScale}\\fscy${hiScale}`
      : '\\fscx100\\fscy100'
  );

  // Grouping must come from the editor too — its own positions only make sense against
  // its own blocks, so taking the words from here and the layout from there would misalign.
  const suppliedBlocks = Array.isArray(options.previewBlocks)
    ? options.previewBlocks.filter((b) => Array.isArray(b?.words) && b.words.length > 0)
    : null;
  const usingPreviewLayout = !!(suppliedBlocks && suppliedBlocks.length);
  const blocks = usingPreviewLayout ? suppliedBlocks : buildCaptionBlocks(words, options);
  console.log(`[word-highlight] layout source: ${usingPreviewLayout
    ? `editor (${blocks.length} blocks, positions supplied)`
    : 'server recompute (editor sent none)'}`);
  const dialogues = [];

  // Fade alpha from op0→op1 within a rise segment (0→100 by 70% travel).
  const fadeTags = (op0, op1, dur, fill, outlineCol, bord, blur) => {
    const a0 = assAlphaHex(op0);
    const a1 = assAlphaHex(op1);
    const baseTags = `\\alpha&H${a0}&\\c${fill}\\3c${outlineCol}\\bord${bord}\\blur${blur}`;
    if (a0 === a1) return baseTags;
    return `${baseTags}\\t(0,${dur},\\alpha&H${a1}&)`;
  };

  // Soft OUTER glow underlay — strength is per font (Montserrat vs Playfair).
  const legacyStrength = Number.isFinite(Number(glowStrength)) ? Number(glowStrength) : 35;
  const baseStr = Number.isFinite(Number(baseGlowStrength)) ? Number(baseGlowStrength) : legacyStrength;
  const hiStr = Number.isFinite(Number(highlightGlowStrength)) ? Number(highlightGlowStrength) : legacyStrength;
  const baseInnerStr = Math.max(0, Math.min(500, Number.isFinite(Number(baseInnerGlowStrength))
    ? Number(baseInnerGlowStrength)
    : 0));
  const hiInnerStr = Math.max(0, Math.min(500, Number.isFinite(Number(highlightInnerGlowStrength))
    ? Number(highlightInnerGlowStrength)
    : 75));
  const gBord = Number.isFinite(Number(glowBorder)) ? Math.max(0, Number(glowBorder)) : 35;
  const gBlur = Number.isFinite(Number(glowBlur)) ? Math.max(0, Number(glowBlur)) : 0;
  const gInnerBlur = Number.isFinite(Number(innerGlowBlur)) ? Math.max(0, Number(innerGlowBlur)) : 4;
  const innerStrFor = (isHi) => (isHi ? hiInnerStr : baseInnerStr);
  const innerGlowHold = (fill, italic, isHi) => {
    const mul = Math.max(0, innerStrFor(isHi) / 100);
    if (mul <= 0.01) return null;
    const op = Math.min(0.85, 0.35 + mul * 0.35);
    const blur = Math.max(1, Math.round(gInnerBlur * Math.max(0.6, mul)));
    return `${bloomTags(op, fill, blur, 0)}${italic ? '\\i1' : '\\i0'}`;
  };
  const innerGlowFade = (op0, op1, dur, fill, isHi) => {
    const mul = Math.max(0, innerStrFor(isHi) / 100);
    if (mul <= 0.01) return null;
    const peak = Math.min(0.85, 0.35 + mul * 0.35);
    const blur = Math.max(1, Math.round(gInnerBlur * Math.max(0.6, mul)));
    return bloomFade(op0 * peak, op1 * peak, dur, fill, blur, 0);
  };
  const outerGlowParams = (isHi) => {
    const mul = Math.max(0, (isHi ? hiStr : baseStr) / 100);
    // \bord and \blur are absolute script units, so a fixed cap means the glow is a soft
    // halo on a 150-unit caption and a solid blob on a 37-unit one. Both must track the
    // font. The old constants (spread clamped to 18, blur floored at 3) put a half-glyph
    // hard-edged ring around every word with nothing to soften it — that is the "pill".
    const glyph = Math.max(8, Number(fontSize) || 56);
    const spreadCap = Math.max(2, Math.round(glyph * 0.10));
    const spread = Math.min(spreadCap, Math.max(0, Math.round(gBord * Math.max(0.15, mul) * 0.35)));
    // Glow only reads as glow when the blur clearly exceeds the spread. Otherwise the
    // padded glyph keeps a hard edge and renders as a filled shape behind the word.
    const blur = Math.min(
      72,
      Math.max(spread * 2.5, Math.round(gBlur * Math.max(0.35, mul)), Math.round(glyph * 0.22)),
    );
    return {
      // A strength of exactly 0 means off. Without this the floor term (0.2) still drew a
      // faint bloom, which put a halo on Podcast Red's white line where it wants none.
      opacity: mul <= 0 ? 0 : Math.min(isHi ? 0.72 : 0.58, 0.2 + mul * 0.14),
      // Blur the glyph fill — never a hollow \bord ring (that glows inside letter holes).
      blur,
      spread,
    };
  };
  const glowOpFor = (isHi) => outerGlowParams(isHi).opacity;
  // Soft filled bloom: same color fill+outline so counters stay filled, not outlined.
  const bloomTags = (op, fill, blur, spread = 0) => {
    const a = assAlphaHex(op);
    return `\\alpha&H${a}&\\c${fill}\\3c${fill}\\bord${spread}\\blur${blur}\\shad0`;
  };
  const bloomFade = (op0, op1, dur, fill, blur, spread = 0) => {
    const a0 = assAlphaHex(op0);
    const a1 = assAlphaHex(op1);
    const tags = bloomTags(op0, fill, blur, spread);
    if (a0 === a1) return tags;
    return `${tags}\\t(0,${dur},\\alpha&H${a1}&)`;
  };
  const outerGlowFade = (op0, op1, dur, fill, isHi) => {
    const { opacity: gOp, blur, spread } = outerGlowParams(isHi);
    return bloomFade(op0 * gOp, op1 * gOp, dur, fill, blur, spread);
  };
  const outerGlowHold = (fill, italic, isHi) => {
    const { opacity: gOp, blur, spread } = outerGlowParams(isHi);
    return `${bloomTags(gOp, fill, blur, spread)}${italic ? '\\i1' : '\\i0'}`;
  };

  for (const block of blocks) {
    const ws = block.words;
    // Prefer the layout the editor drew. Recomputing it here measured words with raw
    // opentype advance widths while the editor measured with ctx.measureText, so the same
    // algorithm produced wider lines and visible gaps between words. When the editor
    // supplies positions they are authoritative — that is what the operator saw.
    const supplied = usingPreviewLayout
      && ws.length > 0
      && ws.every((w) => Number.isFinite(Number(w.x)) && Number.isFinite(Number(w.y)));
    const layout = supplied
      ? ws.map((w) => ({ x: Math.round(Number(w.x)), y: Math.round(Number(w.y)), line: Number(w.line) || 0 }))
      : layoutCaptionWords(ws, {
        fontSize, posX, posY, resX, maxLineWidth, wordGapMul, outline,
        lineHeightMul: Number.isFinite(Number(lineHeightMul)) ? Number(lineHeightMul) : 0.78,
        highlightScale: hiScale, highlightWeight: 0, lineStartX: startX, maxLines: linesCap,
        letterSpacing: spacing,
        roleBy,
        textCase,
        popFromScale,
        obliqueDeg,
        glow,
        glowBlur,
        glowBorder,
        baseGlowStrength: options.baseGlowStrength ?? options.glowStrength ?? 0,
        baseInnerGlowStrength: options.baseInnerGlowStrength ?? 0,
        highlightGlowStrength: options.highlightGlowStrength ?? options.glowStrength ?? 0,
        highlightInnerGlowStrength: options.highlightInnerGlowStrength ?? 0,
        baseFontFile: baseMeta.file,
        highlightFontFile: hiMeta.file,
      });
    // Centre of the card, so the drift can push every word outward from one point.
    const blockXs = layout.map((l) => l.x);
    const blockYs = layout.map((l) => l.y);
    const blockCx = (Math.min(...blockXs) + Math.max(...blockXs)) / 2;
    const blockCy = (Math.min(...blockYs) + Math.max(...blockYs)) / 2;
    const blockEndT = toASSTime(block.end);
    const revealStarts = computeRevealStarts(ws, { riseMs });

    for (let j = 0; j < ws.length; j++) {
      const evStart = revealStarts[j];
      const nextStart = (j + 1 < ws.length) ? ws[j + 1].start : block.end;
      if (nextStart <= evStart) continue;

      const rises = riseOn === 'word' || (riseOn === 'block' && j === 0);
      const cx = layout[j].x;
      const cy = layout[j].y;
      const isHighlight = roleBy === 'line'
        ? (Number(layout[j].line) || 0) > 0
        : !!ws[j].highlight;
      const primaryFile = isHighlight ? hiMeta.file : baseMeta.file;
      const primaryAss = isHighlight ? resolvedHi : resolvedBase;
      const wordText = assEscapeWithGlyphFallback(
        applyTextCase(ws[j].text, textCase), primaryFile, primaryAss,
      );
      const useItalic = isHighlight && hiItalic;
      const wordBold = isHighlight ? hiBoldTag : baseBoldTag;

      // Make the word occupy exactly the width the editor gave it. libass rasterises with
      // different metrics than the browser, so a word centred at the editor's x but drawn
      // narrower leaves the difference as whitespace on both sides — that is the gap. The
      // editor's width is authoritative; scale horizontally to fill it. Clamped so a wild
      // mismatch distorts rather than exploding, and the clamp is logged.
      // No width correction. The editor now sizes slots from INK extents, not advance
      // width, so a word deliberately renders narrower than its advance — scaling it to
      // fill the advance would stretch the glyphs instead of closing the gap. Render at
      // the nominal scale and let the editor's ink-based positions do the spacing.
      const fscxWord = isHighlight ? hiScale : 100;
      const fscyWord = isHighlight ? hiScale : 100;
      const wordScaleTags = `\\fscx${fscxWord}\\fscy${fscyWord}`;
      const fsTag = `\\fs${gdiFontSize(fontSize, primaryFile)}`;

      const paintWord = (anchor, colorTags, scaleTags, fontTag = fnBase) => (
        `{${anchor}\\frz${frz}${faxTag}${fontTag}${wordBold}${fsTag}${fsp}${colorTags}${scaleTags}}${wordText}`
      );
      const pushMainDialogue = (layer, start, end, anchor, colorTags, scaleTags, fontTag) => {
        if (bevelForBase && !isHighlight) {
          // Crisp white copy under the red fill — same as the preview duplicate glyph.
          const dx = -Math.max(1, Math.round(edgeHiPx * 0.35));
          const dy = -Math.max(1, Math.round(edgeHiPx * 0.22));
          const tags = `\\alpha&H00&\\c${edgeHiC}\\3c${edgeHiC}\\bord0\\blur0\\shad0\\i0`;
          dialogues.push(
            `Dialogue: ${layer},${start},${end},Default,,0,0,0,,${paintWord(
              offsetAnchor(anchor, dx, dy), tags, scaleTags, fnBase,
            )}`,
          );
          dialogues.push(
            `Dialogue: ${layer + 1},${start},${end},Default,,0,0,0,,${paintWord(anchor, colorTags, scaleTags, fontTag)}`,
          );
          return;
        }
        dialogues.push(
          `Dialogue: ${layer},${start},${end},Default,,0,0,0,,${paintWord(anchor, colorTags, scaleTags, fontTag)}`,
        );
      };

      // No stroke on the glyph — the editor's -webkit-text-stroke is sub-pixel at preview
      // scale, so any \bord here reads as an inner border it does not have. The editor gets
      // its contrast from a drop shadow instead: textShadow 0 / k / k*1.6 at 75% black,
      // k = 1.4 in this coordinate space. Port that rather than leaving white text bare on
      // a bright frame.
      const softPlain = `\\alpha&H00&\\c${base}\\3c${outlineC}\\bord0\\blur0${baseShadow}\\i0`;
      const softHi = `\\alpha&H00&\\c${active}\\3c${outlineC}\\bord0\\blur0\\shad0${useItalic ? '\\i1' : '\\i0'}${wordScaleTags}`;
      const riseFont = isHighlight ? fnHi : fnBase;
      const riseFill = isHighlight ? active : base;

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
          // Same per-word scale as the hold state. Using the nominal highlightScale here
          // meant the word rose at 135% then snapped to its width-corrected value (132-137%)
          // the moment it landed — read as the highlight zooming in as it appeared.
          const scaleTags = wordScaleTags;
          const s = toASSTime(segStart);
          const e = toASSTime(segEnd);
          if (s === e) continue;
          // No stroke during the rise either — otherwise the border the operator asked us to
          // drop reappears for the duration of every word's entrance animation.
          const riseBord = 0;
          const activeTags = fadeTags(seg.op0, seg.op1, eventMs, riseFill, outlineC, riseBord, 0)
            + (useItalic ? '\\i1' : '\\i0');
          const wordGlowOp = glowOpFor(isHighlight);
          const gFill = isHighlight ? glowC : (glowColor ? glowC : baseGlowC);
          const innerFill = isHighlight ? active : gFill;
          if (glow && wordGlowOp > 0.01 && (gBlur > 0 || gBord > 0)) {
            const glowTags = outerGlowFade(seg.op0, seg.op1, eventMs, gFill, isHighlight)
              + (useItalic ? '\\i1' : '\\i0');
            dialogues.push(`Dialogue: 0,${s},${e},Default,,0,0,0,,${paintWord(move, glowTags, scaleTags, riseFont)}`);
            const p = outerGlowParams(isHighlight);
            const tight = bloomFade(
              seg.op0 * Math.min(0.9, p.opacity * 1.15),
              seg.op1 * Math.min(0.9, p.opacity * 1.15),
              eventMs,
              gFill,
              Math.max(2, Math.round(p.blur * 0.4)),
              0,
            ) + (useItalic ? '\\i1' : '\\i0');
            dialogues.push(`Dialogue: 1,${s},${e},Default,,0,0,0,,${paintWord(move, tight, scaleTags, riseFont)}`);
          }
          const riseInner = glow ? innerGlowFade(seg.op0, seg.op1, eventMs, innerFill, isHighlight) : null;
          if (riseInner) {
            dialogues.push(
              `Dialogue: 1,${s},${e},Default,,0,0,0,,${paintWord(move, riseInner + (useItalic ? '\\i1' : '\\i0'), scaleTags, riseFont)}`,
            );
          }
          pushMainDialogue(2, s, e, move, activeTags, scaleTags, riseFont);
        }
        holdFrom = riseEndAbs;
      }

      // Hold until the sentence ends. Soft glow underlay matches the reference bloom.
      if (holdFrom < block.end) {
        const hs = toASSTime(holdFrom);
        if (hs !== blockEndT) {
          const holdMs = Math.max(0, (block.end - holdFrom) * 1000);
          const outMs = Math.round(Math.min(Number(exitMs) || 0, holdMs));
          // 0.7 x riseMs, because that is the window the preview fades a word in over
          // (riseMs is the rise duration; the fade finishes at 70% of it). ad(riseMs)
          // made every word arrive 43% slower in the export than on screen.
          const inMs = (!rises || riseY <= 0) && riseMs > 0 ? Math.round(riseMs * 0.7) : 0;
          const holdFade = (inMs > 0 || outMs > 0) ? `\\fad(${inMs},${outMs})` : '';

          // Card zoom must match the preview: CSS scale() on the whole card grows
          // glyphs AND the gaps between them from one centre. Per-word \fscx alone
          // (without \move) grows each glyph from its own centre and words collide —
          // that is the mashed "AGARAAPKAHEENZERO" export.
          const cardDur = Math.max(0.05, block.end - block.start);
          const accel = Math.max(0.5, Math.min(5, Number(exitAccel) || 1.35));
          const fromMul = Math.max(0.5, (Number(options.exitFromScale) || 100) / 100);
          const toMul = Math.max(fromMul, (Number(exitScale) || 100) / 100);
          const driftCap = Math.max(0, Number(driftMax) || 0) / 100;
          const kAt = (t) => {
            const raw = Math.min(1, Math.max(0, (t - block.start) / cardDur));
            const p = 1 - ((1 - raw) ** accel);
            return fromMul + (toMul - fromMul) * p + driftCap * p;
          };
          const kFrom = kAt(holdFrom);
          const kTo = kAt(block.end);
          const driftMs = holdMs;
          const scaleChanges = Math.abs(kTo - kFrom) > 0.002;
          const drifts = driftMs > 0 && scaleChanges;
          const moveDelayMs = 0;
          const at = (v, centre, k) => +(centre + (v - centre) * k).toFixed(2);
          // Always spread positions when scale changes — never \pos + \fscx alone.
          const fixed = drifts
            ? `\\move(${at(cx, blockCx, kFrom)},${at(cy, blockCy, kFrom)},`
              + `${at(cx, blockCx, kTo)},${at(cy, blockCy, kTo)},${moveDelayMs},${Math.round(driftMs)})${holdFade}`
            : `\\pos(${at(cx, blockCx, kFrom)},${at(cy, blockCy, kFrom)})${holdFade}`;
          const holdTags = isHighlight ? softHi : softPlain;
          const holdFont = isHighlight ? fnHi : fnBase;
          // Base words must hold at the SAME per-word scale they rose at. Hard-coding 100
          // here made every white word snap narrower the instant it settled — visible as a
          // scale-in, and the width it lost became the gap beside it. Highlights pass ''
          // because softHi already carries wordScaleTags.
          const holdScale = isHighlight ? '' : wordScaleTags;

          // Glyph sizes at the two ends of the drift, so every transform below lands on the
          // card's current scale rather than on a bare 100.
          const sFromX = Math.round(fscxWord * kFrom);
          const sFromY = Math.round(fscyWord * kFrom);
          const sToX = Math.round(fscxWord * kTo);
          const sToY = Math.round(fscyWord * kTo);

          // Entrance: the word lands slightly large and settles onto the card's scale.
          // Tied to the no-rise path for the same reason \fad is — a look that rises
          // already has an entrance.
          const popsIn = (!rises || riseY <= 0)
            && Number(popDurationMs) > 0
            && Number(popFromScale) !== 100;
          const popMs = popsIn ? Math.round(popDurationMs) : 0;
          const popTags = popsIn
            ? `\\fscx${Math.round(sFromX * (Number(popFromScale) / 100))}`
              + `\\fscy${Math.round(sFromY * (Number(popFromScale) / 100))}`
              + `\\t(0,${popMs},\\fscx${sFromX}\\fscy${sFromY})`
            : `\\fscx${sFromX}\\fscy${sFromY}`;
          // Growth to match the slot spread, picking up where the entrance leaves off.
          // ASS accel < 1 = ease-out (fast start, soft landing) — matches preview 1-(1-t)^n.
          const assAccel = Math.max(0.4, Math.min(1, 1 / accel)).toFixed(2);
          const driftTags = drifts
            ? `\\t(0,${Math.round(driftMs)},${assAccel},\\fscx${sToX}\\fscy${sToY})`
            : '';
          const exitTags = '';
          if (glow && glowOpFor(isHighlight) > 0.01 && (gBlur > 0 || gBord > 0)) {
            const gFill = isHighlight ? glowC : (glowColor ? glowC : baseGlowC);
            const hiScaleTags = wordScaleTags;
            const holdGlow = outerGlowHold(gFill, useItalic, isHighlight) + hiScaleTags;
            dialogues.push(
              `Dialogue: 0,${hs},${blockEndT},Default,,0,0,0,,${paintWord(fixed, holdGlow, holdScale + popTags + driftTags + exitTags, holdFont)}`,
            );
            const p = outerGlowParams(isHighlight);
            const holdTight = `${bloomTags(Math.min(0.9, p.opacity * 1.15), gFill, Math.max(2, Math.round(p.blur * 0.4)), 0)}${useItalic ? '\\i1' : '\\i0'}${hiScaleTags}`;
            dialogues.push(
              `Dialogue: 1,${hs},${blockEndT},Default,,0,0,0,,${paintWord(fixed, holdTight, holdScale + popTags + driftTags + exitTags, holdFont)}`,
            );
          }
          {
            const gFill = isHighlight ? glowC : (glowColor ? glowC : baseGlowC);
            const innerFill = isHighlight ? active : gFill;
            const holdInner = glow ? innerGlowHold(innerFill, useItalic, isHighlight) : null;
            if (holdInner) {
              dialogues.push(
                `Dialogue: 1,${hs},${blockEndT},Default,,0,0,0,,${paintWord(fixed, holdInner + wordScaleTags, holdScale + popTags + driftTags + exitTags, holdFont)}`,
              );
            }
          }
          pushMainDialogue(
            2, hs, blockEndT, fixed, holdTags, holdScale + popTags + driftTags + exitTags, holdFont,
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
