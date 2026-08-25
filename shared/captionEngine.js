/**
 * The caption engine both editors run on.
 *
 * Sentence grouping, block timing, style normalization — everything that decides WHAT is
 * on screen and when, with no React and no DOM. It lives here because there are now two
 * surfaces driving captions (the standalone /transcribe page and the Captions section of
 * the playbook editor) and they must group and time words identically, or the same clip
 * would burn differently depending on which screen you started from. The ASS burner reads
 * the same grouping rules from server/subtitleGenerator.js; the defaults both sides merge
 * over live in shared/captionDefaults.js.
 */
import { findCaptionFont } from '../captionFonts.js';
import {
  CAPTION_DEFAULT_STYLE,
  CAPTION_DEFAULT_BIZZ_STYLE,
  CAPTION_DEFAULT_BIZZ_INDIA_STYLE,
  CAPTION_DEFAULT_PODCAST_RED_STYLE,
} from './captionDefaults.js';

/** The virtual canvas the ASS is authored against; previews map into it proportionally. */
export const PLAY_RES_X = 720;
export const PLAY_RES_Y = 1280;

/** Side margin so scaled / skewed glyphs and glow stay inside the frame. */
export const CAPTION_SAFE_MARGIN_X = 72;

/** Glow bleed (authoring px) reserved on each side so heavy bloom stays in-frame while reading. */
export function captionGlowPad(style) {
  if (!style?.glow) return 0;
  const glowStr = Math.max(
    Number(style.baseGlowStrength) || 0,
    Number(style.baseInnerGlowStrength) || 0,
    Number(style.highlightGlowStrength) || 0,
    Number(style.highlightInnerGlowStrength) || 0,
  ) / 100;
  return Math.min(96, (Number(style.glowBlur) || 0) * 0.7 + glowStr * 16);
}

/**
 * Max line width while the card is being read. Exit scale / drift are excluded — those
 * run after the hold and may bleed past the frame once the line has been read.
 */
export function effectiveMaxLineWidth(style, resX = PLAY_RES_X) {
  const fontSize = Math.max(12, Number(style.fontSize) || 56);
  const readScale = Math.max(100, Number(style.popFromScale) || 100) / 100;
  const oblique = Math.abs(Number(style.obliqueDeg) || 0);
  const skewPad = Math.tan((oblique * Math.PI) / 180) * fontSize * 0.55;
  const glowPad = captionGlowPad(style);
  const margin = CAPTION_SAFE_MARGIN_X + Math.round(glowPad * 0.4);
  const configured = Number(style.maxLineWidth);
  const byFrame = resX - 2 * margin - 2 * (skewPad + glowPad);
  const capped = Number.isFinite(configured) && configured > 0
    ? Math.min(configured, byFrame)
    : byFrame;
  return Math.max(120, Math.round(capped / readScale));
}

/** Absolute time when the card stops accumulating and the exit transition may begin. */
export function cardHoldEndTime(block, style = {}) {
  const words = block?.words || [];
  if (!words.length) return Number(block?.start) || 0;

  // Zoom starts the instant the last word appears — no linger gap after the card is up.
  const lastAf = Math.max(...words.map((w) => Number(w.activeFrom ?? w.start) || 0));
  const linger = Math.max(0, Number(style.lingerAfterLast) || 0);
  return Math.max(Number(block.start) || 0, lastAf + linger);
}

/** Index of the first word forced onto a new tier (Podcast Red sentence 2). */
export function tierBreakIndex(wordInputs) {
  return (wordInputs || []).findIndex(
    (w, i) => i > 0 && !!(typeof w === 'object' && w.lineBreak),
  );
}

/** Whether another wrapped row may be opened while laying out word `wordIndex`. */
export function layoutWrapAllowed(style, wordInputs, wordIndex, linesBuilt) {
  const lineCap = Math.max(1, Math.min(4, Number(style.maxLines) || 1));
  const tierBreak = tierBreakIndex(wordInputs);
  if (style.roleBy === 'line' && tierBreak >= 0) {
    if (wordIndex <= tierBreak) return false;
    return linesBuilt + 1 < 4;
  }
  return linesBuilt + 1 < lineCap;
}

// Motion is baked in: each word rises from below into its own slot (ease-out),
// fades in by 70% travel, then stays until the whole sentence ends.
export const GLOW_OUTER_MAX = 500;

// Both defaults live in shared/captionDefaults.js so the editor and the ASS burner
// cannot drift apart. 13 of these used to disagree between preview and export.
export const DEFAULT_STYLE = CAPTION_DEFAULT_STYLE;
export const DEFAULT_BIZZ_STYLE = CAPTION_DEFAULT_BIZZ_STYLE;
export const DEFAULT_BIZZ_INDIA_STYLE = CAPTION_DEFAULT_BIZZ_INDIA_STYLE;
export const DEFAULT_PODCAST_RED_STYLE = CAPTION_DEFAULT_PODCAST_RED_STYLE;

/**
 * The looks the editor offers, in switcher order. Plain "Normal" was dropped — nobody cut
 * with it once The Bizz Playbook landed. The burner still answers to captionStyle 'normal'
 * (it is the fallback for any request that names no style), so nothing there had to go.
 */
export const MODE_DEFAULTS = {
  styled: DEFAULT_STYLE,
  bizz: DEFAULT_BIZZ_STYLE,
  bizzindia: DEFAULT_BIZZ_INDIA_STYLE,
  podcastred: DEFAULT_PODCAST_RED_STYLE,
};

/** Editor look -> the generator the burn should run. */
// Both line looks burn through the same generator; only the style values differ.
export const CAPTION_STYLE_BY_MODE = {
  styled: 'word-highlight',
  bizz: 'bizz-playbook',
  bizzindia: 'bizz-playbook',
  // Same word-highlight generator as Flow; roleBy:'line' selects Podcast Red defaults.
  podcastred: 'word-highlight',
};

export const MODE_LABELS = {
  styled: 'Flow',
  bizz: 'Basic',
  bizzindia: 'Strong',
  podcastred: 'Podcast Red',
};

/**
 * Split a block into lines, each line a list of words rather than one joined string —
 * The Bizz Playbook colours emphasised words individually, so the line-based preview
 * needs the words to stay separate.
 */
export function blockToPreviewLineWords(blockWords) {
  const lines = [];
  let cur = [];
  for (const w of blockWords || []) {
    if (w.lineBreak && cur.length) {
      lines.push(cur);
      cur = [];
    }
    const t = String(w.text || '').trim();
    if (t) cur.push({ ...w, text: t });
  }
  if (cur.length) lines.push(cur);
  return lines;
}

export const round3 = (n) => Math.round(n * 1000) / 1000;

/** Auto-split words into sentences (mirrors server auto rules), stamp breakBefore. */
export function stampAutoSentenceBreaks(words, style = {}) {
  const maxWords = Math.max(1, Number(style.maxWordsPerBlock) || 8);
  const maxChars = Math.max(0, Number(style.maxCharsPerBlock) || 0);
  const maxDur = Math.max(0.4, Number(style.maxBlockDuration) || 3.5);
  const PUNCT = /[.,!?;:—]$/;
  const sorted = [...words].sort((a, b) => a.start - b.start);
  const stamped = [];
  let count = 0;
  let chars = 0;
  let blockStart = null;
  for (let i = 0; i < sorted.length; i++) {
    const w = sorted[i];
    // Break before the word that would push the line past the cap, not after it.
    if (maxChars && count > 0 && chars + 1 + String(w.text || '').length > maxChars) {
      count = 0;
      chars = 0;
      blockStart = null;
    }
    const isFirstOfBlock = count === 0;
    if (isFirstOfBlock) blockStart = w.start;
    stamped.push({
      id: w.id || `w-${round3(w.start)}-${i}`,
      text: w.text,
      start: w.start,
      end: w.end,
      highlight: !!w.highlight,
      breakBefore: isFirstOfBlock && stamped.length > 0,
    });
    count += 1;
    chars += (chars ? 1 : 0) + String(w.text || '').length;
    const spanned = w.end - blockStart;
    if (count >= maxWords || (count >= 3 && (spanned >= maxDur || PUNCT.test(w.text)))) {
      count = 0;
      chars = 0;
      blockStart = null;
    }
  }
  return stamped;
}

export function wordsToSentences(words) {
  const sentences = [];
  let cur = [];
  (words || []).forEach((w, i) => {
    if (i > 0 && w.breakBefore) {
      if (cur.length) sentences.push(cur);
      cur = [];
    }
    cur.push({ ...w, _idx: i });
  });
  if (cur.length) sentences.push(cur);
  return sentences;
}

export function sentencesToWords(sentences) {
  const flat = [];
  sentences.forEach((sent, si) => {
    sent.forEach((w, wi) => {
      flat.push({
        id: w.id,
        text: w.text,
        start: w.start,
        end: w.end,
        highlight: !!w.highlight,
        breakBefore: si > 0 && wi === 0,
      });
    });
  });
  return flat;
}

/**
 * Same reveal timing as server — preview must match burn.
 *
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
export function computePreviewRevealStarts(ws) {
  return ws.map((w) => w.start);
}

/**
 * When a caption card leaves the screen: hold at full size after the last word finishes,
 * then play the exit scale/fade. block.end must cover both or the card vanishes mid-phrase.
 */
export function blockDisplayEnd(words, style = {}) {
  if (!words?.length) return 0;
  const lastEnd = Math.max(...words.map((w) => Number(w.end) || 0));
  const linger = Math.max(0, Number(style.lingerAfterLast) || 0);
  const exitSec = Math.max(0, Number(style.exitMs) || 0) / 1000;
  return lastEnd + linger + exitSec;
}

/**
 * Keep each card's natural audio timing. Earlier versions delayed the next card until the
 * previous exit finished — that made every sentence after the first lag behind speech.
 * Overlapping exit + entrance is fine: findActiveCaptionBlock prefers the later card.
 */
export function sequenceCaptionBlocks(blocks, style = {}) {
  if (!blocks?.length) return [];
  const sorted = [...blocks].sort((a, b) => a.start - b.start);

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    const naturalStart = Number(b.start) || 0;
    b.revealDelay = 0;
    b.start = +naturalStart.toFixed(3);
    b.end = +blockDisplayEnd(b.words, style).toFixed(3);

    if (b.words?.length) {
      b.words = b.words.map((w, wi) => {
        const af = Number(w.activeFrom ?? w.start) || 0;
        return {
          ...w,
          activeFrom: +af.toFixed(3),
          activeTo: +(wi + 1 < b.words.length
            ? (b.words[wi + 1].activeFrom ?? b.words[wi + 1].start)
            : b.end).toFixed(3),
        };
      });
    }

    // Soft-clip exit when the next card's audio starts — don't leave a stale card up.
    if (i + 1 < sorted.length) {
      const nextStart = Number(sorted[i + 1].start) || 0;
      if (nextStart > b.start && b.end > nextStart) {
        b.end = +nextStart.toFixed(3);
      }
    }
  }

  return sorted.filter((b) => b.end > b.start);
}

/** Active card at `time`. Later blocks win during edge overlaps so an exiting card stays visible. */
export function findActiveCaptionBlock(blocks, time) {
  if (!blocks?.length) return null;
  let active = null;
  for (const b of blocks) {
    if (time >= b.start && time < b.end) active = b;
  }
  return active;
}

/**
 * Build caption blocks on the client so transcript edits/drags update the
 * overlay immediately (no round-trip / silent API miss).
 */
export function buildPreviewBlocks(words, style = {}) {
  const {
    maxWordsPerBlock = 8,
    maxCharsPerBlock = 0,
    maxBlockDuration = 3.5,
    lingerAfterLast = 2.5,
    minWordDuration = 0.12,
    manualGrouping = false,
    riseMs = 460,
    exitMs = 0,
  } = style;
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
      id: w.id || `w-${i}-${start}`,
      text,
      start,
      end,
      highlight: !!w.highlight,
      breakBefore: !!w.breakBefore,
    });
  }

  const grouped = [];
  let current = [];
  const flush = () => { if (current.length) { grouped.push(current); current = []; } };

  if (manualGrouping) {
    for (let i = 0; i < normalized.length; i++) {
      const w = normalized[i];
      if (i > 0 && w.breakBefore) flush();
      current.push(w);
    }
    flush();
  } else {
    const charCap = Math.max(0, Number(maxCharsPerBlock) || 0);
    const runLength = (ws, next) => ws.reduce((n, x) => n + x.text.length + 1, -1) + 1 + next.length;
    const sorted = [...normalized].sort((a, b) => a.start - b.start);
    for (const w of sorted) {
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
  const pairN = Math.max(1, Math.min(4, Number(style.maxLines) || 1));
  if (pairN > 1 && grouped.length > 1) {
    const paired = [];
    for (let i = 0; i < grouped.length; i += pairN) {
      const chunk = grouped.slice(i, i + pairN);
      const words = [];
      chunk.forEach((sent, si) => {
        sent.forEach((w, wi) => {
          words.push({ ...w, lineBreak: si > 0 && wi === 0 });
        });
      });
      paired.push(words);
    }
    grouped.length = 0;
    grouped.push(...paired);
  }

  const blocks = grouped.map((ws, index) => {
    const revealStarts = computePreviewRevealStarts(ws, { riseMs });
    const end = blockDisplayEnd(ws, { lingerAfterLast, exitMs });
    return {
      index,
      start: +Math.min(...ws.map((w) => w.start)).toFixed(3),
      end: +end.toFixed(3),
      words: ws.map((w, i) => ({
        ...w,
        activeFrom: +revealStarts[i].toFixed(3),
        activeTo: +(i + 1 < ws.length ? revealStarts[i + 1] : end).toFixed(3),
      })),
    };
  });

  blocks.sort((a, b) => a.start - b.start);
  return sequenceCaptionBlocks(blocks, { lingerAfterLast, exitMs });
}

/** Merge defaults so older sessions / partial style still drive motion sliders. */
export function normalizeStyle(s = {}) {
  const out = { ...DEFAULT_STYLE, ...s };
  out.riseMs = Math.max(40, Number(out.riseMs) || DEFAULT_STYLE.riseMs);
  out.riseY = Number.isFinite(Number(out.riseY)) ? Number(out.riseY) : DEFAULT_STYLE.riseY;
  out.lingerAfterLast = Math.max(0, Number.isFinite(Number(out.lingerAfterLast))
    ? Number(out.lingerAfterLast)
    : DEFAULT_STYLE.lingerAfterLast);
  out.maxBlockDuration = Math.max(0.4, Number(out.maxBlockDuration) || DEFAULT_STYLE.maxBlockDuration);
  out.maxWordsPerBlock = Math.max(1, Number(out.maxWordsPerBlock) || DEFAULT_STYLE.maxWordsPerBlock);
  // 0 = no cap. Only The Bizz Playbook sets one, so the other looks group by words alone.
  out.maxCharsPerBlock = Math.max(0, Math.min(80, Number(out.maxCharsPerBlock) || 0));
  out.fontSize = Math.max(12, Number(out.fontSize) || DEFAULT_STYLE.fontSize);
  out.posY = Number.isFinite(Number(out.posY)) ? Number(out.posY) : DEFAULT_STYLE.posY;
  out.posX = Number.isFinite(Number(out.posX)) ? Number(out.posX) : DEFAULT_STYLE.posX;
  out.lineStartX = Math.max(10, Math.min(320, Number.isFinite(Number(out.lineStartX))
    ? Number(out.lineStartX)
    : DEFAULT_STYLE.lineStartX));
  out.maxLines = Math.max(1, Math.min(4, Number(out.maxLines) || DEFAULT_STYLE.maxLines));
  out.wordGapMul = Number.isFinite(Number(out.wordGapMul))
    ? Math.max(0, Number(out.wordGapMul))
    : DEFAULT_STYLE.wordGapMul;
  out.lineHeightMul = Number.isFinite(Number(out.lineHeightMul))
    ? Math.max(0.5, Math.min(3, Number(out.lineHeightMul)))
    : DEFAULT_STYLE.lineHeightMul;
  // Floor was -4; The Bizz Playbook tracks in to -5, so the clamp had to open up.
  out.letterSpacing = Math.max(-12, Math.min(20, Number.isFinite(Number(out.letterSpacing))
    ? Number(out.letterSpacing)
    : DEFAULT_STYLE.letterSpacing));
  // Floor was 80. Podcast Red's continuation line is 43% of the loud line, and that is a
  // size relationship, not a highlight emphasis — so the range has to reach down there.
  out.highlightScale = Math.max(20, Math.min(300, Number(out.highlightScale) || DEFAULT_STYLE.highlightScale));
  out.highlightWeight = 0;
  const baseMeta = findCaptionFont(out.baseFontName || out.fontName) || findCaptionFont(DEFAULT_STYLE.baseFontName);
  const hiMeta = findCaptionFont(out.highlightFontName) || findCaptionFont(DEFAULT_STYLE.highlightFontName);
  out.baseFontName = baseMeta?.id || baseMeta?.assName || DEFAULT_STYLE.baseFontName;
  out.fontName = baseMeta?.assName || DEFAULT_STYLE.fontName;
  out.highlightFontName = hiMeta?.id || hiMeta?.assName || DEFAULT_STYLE.highlightFontName;
  out.glowBlur = Math.max(0, Number.isFinite(Number(out.glowBlur)) ? Number(out.glowBlur) : DEFAULT_STYLE.glowBlur);
  out.glowBorder = Math.max(0, Math.min(120, Number.isFinite(Number(out.glowBorder))
    ? Number(out.glowBorder)
    : DEFAULT_STYLE.glowBorder));
  const legacyGlow = Number.isFinite(Number(out.glowStrength)) ? Number(out.glowStrength) : DEFAULT_STYLE.baseGlowStrength;
  out.baseGlowStrength = Math.max(0, Math.min(GLOW_OUTER_MAX, Number.isFinite(Number(out.baseGlowStrength))
    ? Number(out.baseGlowStrength)
    : legacyGlow));
  out.highlightGlowStrength = Math.max(0, Math.min(GLOW_OUTER_MAX, Number.isFinite(Number(out.highlightGlowStrength))
    ? Number(out.highlightGlowStrength)
    : legacyGlow));
  out.baseInnerGlowStrength = Math.max(0, Math.min(GLOW_OUTER_MAX, Number.isFinite(Number(out.baseInnerGlowStrength))
    ? Number(out.baseInnerGlowStrength)
    : (DEFAULT_STYLE.baseInnerGlowStrength ?? 0)));
  out.highlightInnerGlowStrength = Math.max(0, Math.min(GLOW_OUTER_MAX, Number.isFinite(Number(out.highlightInnerGlowStrength))
    ? Number(out.highlightInnerGlowStrength)
    : DEFAULT_STYLE.highlightInnerGlowStrength));
  // Two-line Podcast Red: white continuation lines still sit in the same red halo.
  if (out.roleBy === 'line' && out.glow && out.glowColor
      && Number(out.highlightGlowStrength) === 0
      && Number(out.baseGlowStrength) > 0) {
    out.highlightGlowStrength = CAPTION_DEFAULT_PODCAST_RED_STYLE.highlightGlowStrength;
    if (Number(out.highlightInnerGlowStrength) === 0) {
      out.highlightInnerGlowStrength = CAPTION_DEFAULT_PODCAST_RED_STYLE.highlightInnerGlowStrength;
    }
  }
  // Podcast Red: upgrade weak/old exit motion once. Sentence hold (lingerAfterLast) is
  // user-controlled — never force it back to 0 here.
  if (out.roleBy === 'line' && Number(out.exitMs) > 0) {
    const weakExit = Number(out.exitScale) <= 110 && Number(out.exitFromScale) >= 95;
    if (weakExit) {
      out.exitFromScale = CAPTION_DEFAULT_PODCAST_RED_STYLE.exitFromScale;
      out.exitScale = CAPTION_DEFAULT_PODCAST_RED_STYLE.exitScale;
      out.exitMs = CAPTION_DEFAULT_PODCAST_RED_STYLE.exitMs;
      out.exitAccel = CAPTION_DEFAULT_PODCAST_RED_STYLE.exitAccel;
      out.driftMax = CAPTION_DEFAULT_PODCAST_RED_STYLE.driftMax;
    }
    // Kill the old pop-settle — it scaled words down while the card tried to grow.
    if (Number(out.popFromScale) !== 100 || Number(out.popDurationMs) > 0) {
      out.popFromScale = 100;
      out.popToScale = 100;
      out.popDurationMs = 0;
      out.popSettleMs = 0;
    }
  }
  out.innerGlowBlur = Math.max(0, Math.min(24, Number.isFinite(Number(out.innerGlowBlur))
    ? Number(out.innerGlowBlur)
    : DEFAULT_STYLE.innerGlowBlur));
  // Podcast Red always blooms red — never drop glowColor to null (export would fall back
  // to the fill colour inconsistently vs the preview).
  if (out.roleBy === 'line' && out.glow && !out.glowColor) {
    out.glowColor = CAPTION_DEFAULT_PODCAST_RED_STYLE.glowColor || '#FF0000';
  }
  // Case + drop shadow: only The Bizz Playbook drives these, but they are normalized for
  // every look so a style saved under one mode never lands undefined under another.
  out.textCase = ['lower', 'upper', 'none'].includes(out.textCase) ? out.textCase : 'none';
  out.roleBy = out.roleBy === 'line' ? 'line' : 'word';
  out.obliqueDeg = Math.max(-45, Math.min(45, Number(out.obliqueDeg) || 0));
  // Card zoom: exitFromScale → exitScale over the whole card life; exitMs is fade-only.
  out.exitMs = Math.max(0, Math.min(2000, Number(out.exitMs) || 0));
  out.exitFromScale = Math.max(50, Math.min(200, Number(out.exitFromScale) || 100));
  out.exitScale = Math.max(20, Math.min(300, Number(out.exitScale) || 100));
  out.exitAccel = Math.max(0.5, Math.min(5, Number(out.exitAccel) || 1));
  // Card drift, as a rate: percent growth per second, and a ceiling on the total. A rate
  // rather than a total because a slow enough drift renders as sub-pixel stepping.
  out.driftPerSec = Math.max(0, Math.min(40, Number(out.driftPerSec) || 0));
  out.driftMax = Math.max(0, Math.min(60, Number(out.driftMax) || 0));
  out.shadowColor = typeof out.shadowColor === 'string' ? out.shadowColor : '#000000';
  out.shadowOpacity = Math.max(0, Math.min(100, Number.isFinite(Number(out.shadowOpacity))
    ? Number(out.shadowOpacity)
    : 100));
  out.shadowOffsetX = Math.max(-40, Math.min(40, Number(out.shadowOffsetX) || 0));
  out.shadowOffsetY = Math.max(-40, Math.min(40, Number(out.shadowOffsetY) || 0));
  out.shadowBlur = Math.max(0, Math.min(60, Number(out.shadowBlur) || 0));
  // Glow keys are shared with the styled look, which blooms in the text's own colour;
  // a caption look can override that with glowColor (Bizz India glows red under white).
  out.glowColor = typeof out.glowColor === 'string' && out.glowColor ? out.glowColor : null;
  // Entrance scale. These were pinned to 100 while no look used them; Podcast Red lands
  // each word slightly large and settles it, so they carry values again.
  out.popFromScale = Math.max(20, Math.min(300, Number(out.popFromScale) || 100));
  out.popToScale = Math.max(20, Math.min(300, Number(out.popToScale) || 100));
  out.popDurationMs = Math.max(0, Math.min(1200, Number(out.popDurationMs) || 0));
  out.popSettleScale = Math.max(20, Math.min(300, Number(out.popSettleScale) || 100));
  out.popSettleMs = Math.max(0, Math.min(1200, Number(out.popSettleMs) || 0));
  out.baseEdgeHighlight = Math.max(0, Math.min(8, Number(out.baseEdgeHighlight) || 0));
  out.edgeHighlightColor = typeof out.edgeHighlightColor === 'string' && out.edgeHighlightColor
    ? out.edgeHighlightColor
    : '#FFFFFF';
  return out;
}

export function hexToRgba(hex, alpha = 1) {
  const h = String(hex || '#EDEAE3').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(237,234,227,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

/**
 * The CSS text-shadow stack for a line caption: the glow bloom first (drawn furthest back),
 * then the drop shadow. Kept here because two overlays draw these captions — the standalone
 * editor and the playbook's preset cards — and the burn re-creates the same two layers in
 * ASS. Three stacked radii stand in for a spread, which CSS text-shadow has no notion of.
 *
 * @param {object} style  normalized caption style
 * @param {number} scale  preview px per authoring px
 */
export function captionTextShadow(style, scale) {
  const parts = [];
  const glowOn = style.glow && (style.glowBlur > 0 || style.glowBorder > 0);
  if (glowOn) {
    const color = style.glowColor || style.baseColor || '#FFFFFF';
    const alpha = Math.min(1, Math.max(0, (style.baseGlowStrength ?? 100) / 100));
    const spread = Math.max(0, (style.glowBorder || 0) * scale);
    const blur = Math.max(0, (style.glowBlur || 0) * scale);
    parts.push(
      `0 0 ${Math.max(1, spread + blur * 0.35)}px ${hexToRgba(color, Math.min(1, alpha))}`,
      `0 0 ${Math.max(2, spread + blur * 0.8)}px ${hexToRgba(color, alpha * 0.65)}`,
      `0 0 ${Math.max(3, spread + blur * 1.6)}px ${hexToRgba(color, alpha * 0.35)}`,
    );
  }
  const shadowOn = (style.shadowOpacity ?? 0) > 0
    && ((style.shadowOffsetX || 0) || (style.shadowOffsetY || 0) || (style.shadowBlur || 0));
  if (shadowOn) {
    parts.push(
      `${(style.shadowOffsetX || 0) * scale}px ${(style.shadowOffsetY || 0) * scale}px `
      + `${(style.shadowBlur || 0) * scale}px `
      + hexToRgba(style.shadowColor || '#000000', (style.shadowOpacity ?? 100) / 100),
    );
  }
  return parts.length ? parts.join(', ') : 'none';
}

/**
 * Faint top-left white edge on the red line (Podcast Red). Kept subtle — a thin rim-light,
 * not a heavy glow — matching the reference clip.
 */
export function captionEdgeHighlightShadow(style, scale = 1, isHighlight = false) {
  if (isHighlight || style?.roleBy !== 'line') return '';
  const w = Math.max(0, Number(style.baseEdgeHighlight) || 0) * scale;
  if (w <= 0) return '';
  const white = '#FFFFFF';
  const bSoft = Math.max(0.35, w * 0.45);
  return [
    `${-w * 0.22}px ${-w * 0.14}px 0 ${hexToRgba(white, 0.58)}`,
    `${-w * 0.38}px ${-w * 0.24}px ${bSoft}px ${hexToRgba(white, 0.26)}`,
  ].join(', ');
}

/**
 * Which of the two style slots a word is drawn with.
 *
 * Normally the highlight slot belongs to words the editor marked — that is what "Styled"
 * has always meant. Podcast Red needs the split to run per LINE instead: the first line is
 * the loud one and every wrapped continuation line is the quiet one. Rather than invent a
 * third set of colour/size/glow keys, `roleBy: 'line'` re-points the existing highlight
 * slot at the continuation lines, so activeColor/highlightScale/highlightGlowStrength keep
 * meaning exactly what they say — they just apply to line 2+ rather than to marked words.
 */
/** Lower/upper-cased as the caption will be drawn, so widths are measured on real text. */
export function applyCaptionCase(text, textCase) {
  if (textCase === 'lower') return String(text ?? '').toLowerCase();
  if (textCase === 'upper') return String(text ?? '').toUpperCase();
  return String(text ?? '');
}

export function usesHighlightSlot(style, word, lineIndex = 0) {
  if (style?.roleBy === 'line') return lineIndex > 0;
  return !!(word && typeof word === 'object' ? word.highlight : word);
}

let _measureCanvas = null;

/**
 * Width of a word as the preview will draw it, in authoring units.
 *
 * Measured on INK extents rather than advance width: HelveticaNowText Bold DEMO advances
 * ~54% wider than its glyphs ("having" advances 162px but inks 105px), so measuring .width
 * gave every word a box half again too wide and that padding rendered as a gap.
 */
export function measurePreviewWidth(text, fontSize, highlight = false, highlightScale = 1.25, style = {}) {
  const hiScale = highlight ? highlightScale : 1;
  const spacing = Number(style.letterSpacing) || 0;
  const meta = findCaptionFont(highlight ? style.highlightFontName : (style.baseFontName || style.fontName));
  const family = meta?.cssFamily || (highlight ? 'Playfair Display Bold Italic' : 'Montserrat Black');
  const weight = meta?.weight || (highlight ? 600 : 900);
  const fontStyle = meta?.style || (highlight ? 'italic' : 'normal');
  if (typeof document === 'undefined') {
    const mul = highlight ? 0.58 : 0.62;
    const str = String(text || '');
    return str.length * fontSize * mul * hiScale + Math.max(0, str.length - 1) * spacing;
  }
  if (!_measureCanvas) _measureCanvas = document.createElement('canvas');
  const ctx = _measureCanvas.getContext('2d');
  const sz = fontSize * hiScale;
  ctx.font = `${fontStyle} ${weight} ${sz}px "${family}", sans-serif`;
  const str = String(text || '');
  const m = ctx.measureText(str);
  let w = (Number.isFinite(m.actualBoundingBoxLeft) && Number.isFinite(m.actualBoundingBoxRight))
    ? Math.abs(m.actualBoundingBoxLeft) + Math.abs(m.actualBoundingBoxRight)
    : m.width;
  if (!(w > 1)) w = str.length * fontSize * (highlight ? 0.58 : 0.62) * hiScale;
  if (spacing && str.length > 1) w += (str.length - 1) * spacing;
  return w;
}

/**
 * Client layout — every line is centre-aligned as a group, wrapped lines tucked under.
 * Returns per-word {x, y, line}.
 *
 * Widths are measured against the line a word is about to land on, not up front: under
 * `roleBy: 'line'` a word's size depends on its line, and its line depends on the widths,
 * so measuring first and wrapping second would size every continuation word as if it were
 * still on line 1 and overflow the frame.
 */
export function layoutPreviewWords(wordInputs, style) {
  const fontSize = style.fontSize || 56;
  const posY = style.posY ?? 1020;
  const hiScale = Math.max(0.2, Math.min(3, (style.highlightScale ?? 125) / 100));
  const maxW = effectiveMaxLineWidth(style);
  // Gap scales with the slot. It used to be a flat fontSize x wordGapMul, so Podcast Red's
  // 43% continuation line got the full-size gap between its words and read as loose.
  const gapAt = (lineIdx) => Math.round(
    fontSize * (style.wordGapMul ?? 0.05)
    * (style.roleBy === 'line' && lineIdx > 0 ? hiScale : 1),
  );
  const lineHMul = Number.isFinite(Number(style.lineHeightMul)) ? Number(style.lineHeightMul) : 0.78;
  const texts = wordInputs.map((w) => applyCaptionCase(typeof w === 'string' ? w : w.text, style.textCase));
  const widthAt = (i, lineIdx) => measurePreviewWidth(
    texts[i],
    fontSize,
    usesHighlightSlot(style, wordInputs[i], lineIdx),
    hiScale,
    style,
  );

  if (texts.length === 0) return [];

  const lines = [];
  let cur = { indices: [], width: 0 };
  for (let i = 0; i < texts.length; i++) {
    const li = lines.length;
    const w = widthAt(i, li);
    const next = cur.indices.length === 0 ? w : cur.width + gapAt(li) + w;
    const forcedBreak = i > 0 && !!(typeof wordInputs[i] === 'object' && wordInputs[i].lineBreak);
    const canWrap = layoutWrapAllowed(style, wordInputs, i, lines.length);
    if (cur.indices.length > 0 && (forcedBreak || (canWrap && next > maxW))) {
      lines.push(cur);
      const w2 = widthAt(i, lines.length);
      cur = { indices: [i], width: w2 };
    } else {
      cur.indices.push(i);
      cur.width = next;
    }
  }
  if (cur.indices.length) lines.push(cur);

  const lineH = fontSize * lineHMul;
  const positions = texts.map(() => ({ x: Math.round(PLAY_RES_X / 2), y: posY, line: 0 }));
  lines.forEach((line, li) => {
    const y = Math.round(posY + li * lineH);
    let left = Math.round(PLAY_RES_X / 2 - line.width / 2);
    for (const idx of line.indices) {
      const w = widthAt(idx, li);
      positions[idx] = { x: Math.round(left + w / 2), y, line: li };
      left += w + gapAt(li);
    }
  });
  return positions;
}

/** Fast from the bottom, smooth decelerate into the slot (not linear). */
export function easeOutCubic(t) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

/** 0 at bottom → 1 at final position (eased travel fraction). */
export function riseTravelAt(time, word, style) {
  if (!word || !style.riseMs) return 1;
  const ms = (time - word.activeFrom) * 1000;
  if (ms <= 0) return 0;
  if (ms >= style.riseMs) return 1;
  return easeOutCubic(ms / style.riseMs);
}

/** Scale pop with ease-out, then settle back to 100%. */
export function popScaleAt(time, word, style) {
  if (!word) return style.popSettleScale ?? 100;
  const ms = (time - word.activeFrom) * 1000;
  const settleTo = Number.isFinite(style.popSettleScale) ? style.popSettleScale : 100;
  const settleMs = Number.isFinite(style.popSettleMs) ? style.popSettleMs : style.popDurationMs;
  if (ms <= 0) return style.popFromScale;
  if (ms < style.popDurationMs) {
    const p = easeOutCubic(ms / style.popDurationMs);
    return style.popFromScale + (style.popToScale - style.popFromScale) * p;
  }
  if (ms < style.popDurationMs + settleMs) {
    const p = easeOutCubic((ms - style.popDurationMs) / settleMs);
    return style.popToScale + (settleTo - style.popToScale) * p;
  }
  return settleTo;
}

/** Rise from below into the exact slot — decelerates hard as it lands. */
export function riseOffsetAt(time, word, style) {
  if (!word || !style.riseY) return 0;
  return style.riseY * (1 - riseTravelAt(time, word, style));
}

/** Fade in over the first 70% of travel distance; fully opaque for the settle. */
export function riseOpacityAt(time, word, style, isRising) {
  if (!isRising || !style.riseY) return 1;
  const travel = riseTravelAt(time, word, style);
  if (travel >= 0.7) return 1;
  return travel / 0.7;
}

/**
 * Continuous card zoom matching the reference GIF: the moment the card is on screen
 * it is already growing toward the viewer — smooth ease-out, no hold, no late punch.
 * Fade only runs in the final exitMs window.
 */
export function cardExitMotion(time, block, style) {
  if (!block) return { progress: 0, scale: 1, fade: 0 };

  const start = Number(block.start) || 0;
  const end = Number(block.end) || start;
  const dur = Math.max(0.05, end - start);
  if (time < start) return { progress: 0, scale: 1, fade: 0 };

  const t = Math.min(1, Math.max(0, (time - start) / dur));
  // Ease-out: forward momentum from frame one, decelerates into the fade — not a power punch.
  const accel = Math.max(0.5, Math.min(3, Number(style.exitAccel) || 1.4));
  const p = 1 - ((1 - t) ** accel);

  const from = Math.max(0.5, (Number(style.exitFromScale) || 100) / 100);
  const to = Math.max(from, (Number(style.exitScale) || 100) / 100);
  const driftCap = Math.max(0, Number(style.driftMax) || 0) / 100;
  const scale = from + (to - from) * p + driftCap * p;

  const fadeWin = Math.max(0, Number(style.exitMs) || 0) / 1000;
  const fadeStart = end - fadeWin;
  const fade = fadeWin > 0 && time >= fadeStart
    ? Math.min(1, (time - fadeStart) / fadeWin)
    : (time >= end ? 1 : 0);

  return { progress: t, scale, fade };
}

/** Card scale at `time` (1 while reading, ramps during exit). */
export function cardDriftFactor(time, block, style) {
  return cardExitMotion(time, block, style).scale;
}

/** Strength % → bloom. Opacity plateaus; size keeps growing through 500%. */
export function outerGlowFactors(strengthPct, highlight = false) {
  const mul = Math.max(0, Number(strengthPct) || 0) / 100;
  if (mul <= 0) return { mul: 0, alpha: 0, sizeMul: 0 };
  if (highlight) {
    return {
      mul,
      alpha: Math.min(0.95, 0.4 + mul * 0.18),
      sizeMul: Math.max(0.25, mul),
    };
  }
  return {
    mul,
    alpha: Math.min(0.85, 0.22 + mul * 0.16),
    sizeMul: Math.max(0.2, mul),
  };
}

/** Word-by-word reveal (Flow, Podcast Red) vs whole-line (Basic, Strong). */
export function usesWordAnimation(style) {
  return normalizeStyle(style).reveal === 'accumulate';
}
