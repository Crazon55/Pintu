/**
 * Shared headline parsing + line layout for preview (browser) and export (Node).
 * Respects manual line breaks (<br>, Shift+Enter, Enter/div) then soft-wraps each line.
 */

export function cleanHeadlineHtml(html) {
  if (!html) return '';
  // Case-insensitive: applyHookCasing() uppercases entities too (&nbsp; -> &NBSP;)
  // for ALL-CAPS presets, so a case-sensitive match here would leave them undecoded.
  let cleaned = html.replace(/&nbsp;/gi, ' ');
  cleaned = cleaned.replace(/&amp;/gi, '&');
  cleaned = cleaned.replace(/&lt;/gi, '<');
  cleaned = cleaned.replace(/&gt;/gi, '>');
  cleaned = cleaned.replace(/&quot;/gi, '"');
  cleaned = cleaned.replace(/&#39;/gi, "'");
  cleaned = cleaned.replace(/\*\*(\S(?:[\s\S]*?\S)?)\*\*/g, '<b>$1</b>');
  cleaned = cleaned.replace(/\*(\S(?:[\s\S]*?\S)?)\*/g, '<b>$1</b>');
  cleaned = cleaned.replace(/<\/?strong>/gi, (m) => m.toLowerCase().replace('strong', 'b'));
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/div\s*>/gi, '\n');
  cleaned = cleaned.replace(/<\/p\s*>/gi, '\n');
  cleaned = cleaned.replace(/<div[^>]*>/gi, '');
  cleaned = cleaned.replace(/<p[^>]*>/gi, '');
  cleaned = cleaned.replace(/<(?!\/?b\b)[^>]*>/gi, '');
  cleaned = cleaned.replace(/<b\s[^>]*>/gi, '<b>');
  cleaned = cleaned.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n');
  return cleaned.trim();
}

export function tokensFromLineHtml(lineHtml) {
  const tokens = [];
  lineHtml.split(/(<b>.*?<\/b>)/i).forEach((part) => {
    if (!part) return;
    const isB = /^<b>/i.test(part);
    part.replace(/<\/?b>/gi, '').split(/\s+/).forEach((w) => w && tokens.push({ text: w, bold: isB }));
  });
  return tokens;
}

export function hasManualLineBreaks(cleanedHtml) {
  return Boolean(cleanedHtml && cleanedHtml.includes('\n'));
}

function tokensToSingleLine(tokens, measureWord, spacing) {
  let width = 0;
  const measured = tokens.map((t) => {
    const w = measureWord(t.text, t.bold);
    width += w + spacing;
    return { ...t, measuredWidth: w };
  });
  if (measured.length) width -= spacing;
  return { tokens: measured, width: Math.max(0, width) };
}

/** Soft-wrap tokens into lines of { tokens, width } */
export function wrapTokensToLines(tokens, measureWord, maxWidth, spacing) {
  const lines = [];
  let cur = { tokens: [], width: 0 };
  for (const t of tokens) {
    const w = measureWord(t.text, t.bold);
    const advance = w + spacing;
    if (cur.width + advance > maxWidth && cur.tokens.length > 0) {
      lines.push(cur);
      cur = { tokens: [], width: 0 };
    }
    cur.tokens.push({ ...t, measuredWidth: w });
    cur.width += advance;
  }
  if (cur.tokens.length > 0) lines.push(cur);
  return lines;
}

/**
 * Manual line breaks force a new on-screen line; each logical line is still soft-wrapped
 * so a long forced line cannot overflow the frame.
 */
export function layoutHeadlineLines(cleanedHtml, measureWord, maxWidth, spacing) {
  const allLines = [];
  const logicalLines = cleanedHtml.split('\n').map((s) => s.trim()).filter(Boolean);
  for (const lineHtml of logicalLines) {
    const tokens = tokensFromLineHtml(lineHtml);
    if (!tokens.length) continue;
    allLines.push(...wrapTokensToLines(tokens, measureWord, maxWidth, spacing));
  }
  return allLines;
}

/** News ticker: returns array of token arrays [{ text, bold }] */
export function layoutNewsTickerTokenLines(cleanedHtml, measureWord, maxWidth) {
  const allLines = [];
  const logicalLines = cleanedHtml.split('\n').map((s) => s.trim()).filter(Boolean);
  for (const lineHtml of logicalLines) {
    const tokens = tokensFromLineHtml(lineHtml);
    if (!tokens.length) continue;
    let cur = [];
    let curW = 0;
    for (const t of tokens) {
      const w = measureWord(t.text);
      const add = cur.length ? measureWord(' ') + w : w;
      if (curW + add > maxWidth && cur.length) {
        allLines.push(cur);
        cur = [t];
        curW = w;
      } else {
        cur.push(t);
        curW += add;
      }
    }
    if (cur.length) allLines.push(cur);
  }
  return allLines;
}

/** Plain-text rows for the manual line-layout editor (one row = one on-screen line). */
export function headlineHtmlToPlainLines(html) {
  const cleaned = cleanHeadlineHtml(html || '');
  if (!cleaned) return [''];
  const lines = cleaned.split('\n').map((line) => line.replace(/<\/?b>/gi, '').trim());
  return lines.length ? lines : [''];
}

/** All words + bold flags from headline HTML, in reading order. */
export function headlineHtmlToTokens(html) {
  const cleaned = cleanHeadlineHtml(html || '');
  if (!cleaned) return [];
  const tokens = [];
  for (const lineHtml of cleaned.split('\n')) {
    tokens.push(...tokensFromLineHtml(lineHtml.trim()));
  }
  return tokens;
}

/** Apply manual line rows back to headline HTML, preserving bold from the source when possible. */
export function plainLinesToHeadlineHtml(plainLines, sourceHtml) {
  const sourceTokens = headlineHtmlToTokens(sourceHtml || '');
  const lineWordLists = (plainLines || [])
    .map((line) => String(line).trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(/\s+/).filter(Boolean));
  if (!lineWordLists.length) return '';

  let tokenIdx = 0;
  const htmlLines = [];
  for (const words of lineWordLists) {
    const lineParts = [];
    for (const word of words) {
      let token = null;
      for (let i = tokenIdx; i < sourceTokens.length; i++) {
        if (sourceTokens[i].text === word) {
          token = sourceTokens[i];
          tokenIdx = i + 1;
          break;
        }
      }
      const bold = token?.bold ?? false;
      lineParts.push(bold ? `<b>${word}</b>` : word);
    }
    htmlLines.push(lineParts.join(' '));
  }
  return htmlLines.join('<br>');
}

export const CANVAS_REF_W = 720;

export function canvasPxToPercent(px) {
  return `${(px / CANVAS_REF_W) * 100}%`;
}

export function stripHtmlLen(html) {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim().length;
}

/**
 * Hook/A-roll base font before the operator's scale. IBC and IFC2 run 35 instead of the
 * usual 38 — their hooks are ALL CAPS, which reads noticeably heavier at the same size.
 * Still a base, not a lock: the per-preset font slider scales from here like everywhere else.
 */
const HOOK_BASE_FONT_OVERRIDES = { indiabusinesscom: 35, indianfoundercore: 35 };
export function getHookBaseFontSize(preset) {
  return HOOK_BASE_FONT_OVERRIDES[(preset?.name || '').toLowerCase()] ?? 38;
}

/** 101xfounders A-roll: Inter Bold highlight / Inter Regular body, handle watermark. */
export const FOUNDERS_AROLL_HIGHLIGHT = '#fda207';
export const FOUNDERS_AROLL_REGULAR = '#f5f3f5';

export function is101xFoundersAroll(preset) {
  return (preset?.name || '').toLowerCase() === '101xfounders-aroll';
}

export function is101xFoundersNews(preset) {
  return (preset?.name || '').toLowerCase() === '101xfounders-news';
}

export function isIhnNews(preset) {
  return (preset?.name || '').toLowerCase() === 'indianhappeningnow-news';
}

/** 9:16 Inter news tickers with PNG header + supporting line (101xf + IHN). */
export function isInterNewsTicker(preset) {
  return is101xFoundersNews(preset) || isIhnNews(preset);
}

export const IHN_NEWS_HIGHLIGHT = '#ffa928';
export const IHN_NEWS_REGULAR = '#ffffff';
export const IHN_NEWS_SUBTEXT = '#b4b4b4';

/** Supporting paragraph under Inter-news hooks. Ignores leftover Credit: footers. */
export function getNewsSupportingText(preset) {
  if (!isInterNewsTicker(preset)) return '';
  const raw = String(preset?.footer || '').trim();
  if (!raw || /^credit:/i.test(raw)) return '';
  return raw;
}

/** @deprecated use getNewsSupportingText */
export function getFoundersNewsSupportingText(preset) {
  if (!is101xFoundersNews(preset)) return '';
  return getNewsSupportingText(preset);
}

export function getNewsSupportingFontSize(preset, hookFs) {
  const scale = isIhnNews(preset) ? 0.40 : 0.42;
  return Math.max(13, Math.round(hookFs * scale));
}

export function getNewsSupportingColor(preset) {
  return isIhnNews(preset) ? IHN_NEWS_SUBTEXT : FOUNDERS_AROLL_REGULAR;
}

/** Top-right year / place lockup. hookEyebrow overrides rules when typed. */
export function get101xFoundersNewsKicker(preset) {
  const eyebrow = String(preset?.hookEyebrow || '').trim();
  if (eyebrow) {
    const parts = eyebrow.split(/\s+/);
    return { year: parts[0] || '2026', place: parts.slice(1).join(' ') || 'India' };
  }
  return {
    year: String(preset?.rules?.kickerYear || '2026'),
    place: String(preset?.rules?.kickerPlace || 'India'),
  };
}

/**
 * Header insets at the 720px canvas. Generous top (Reels chrome), small matching
 * left/right so 101xf. and 2026/India sit off the corners as a pair.
 */
export const FOUNDERS_NEWS_PAD_X = 20;
export const FOUNDERS_NEWS_PAD_Y = 84;

export function get101xFoundersNewsHeaderPad() {
  return { padX: FOUNDERS_NEWS_PAD_X, padY: FOUNDERS_NEWS_PAD_Y };
}

/** Operator-supplied wordmark / year-place PNGs (white on transparent). Heights at 720 canvas. */
export const FOUNDERS_NEWS_LOGO_FILE = '101xfounders-news-logo.png';
export const FOUNDERS_NEWS_KICKER_FILE = '101xfounders-news-kicker.png';
export const FOUNDERS_NEWS_LOGO_H = 42;
export const FOUNDERS_NEWS_KICKER_H = 58;

export const IHN_NEWS_LOGO_FILE = 'indianhappeningnow-news-logo.png';
export const IHN_NEWS_KICKER_FILE = FOUNDERS_NEWS_KICKER_FILE;
export const IHN_NEWS_LOGO_H = 72;
export const IHN_NEWS_KICKER_H = FOUNDERS_NEWS_KICKER_H;

// Opaque-row fractions in the cropped header PNGs — align 2026's cap-top
// with 101xf. / INDIA (not the star, not the "India" subtitle).
const FOUNDERS_LOGO_CAP_TOP = 4 / 79;
const IHN_INDIA_CAP_TOP = 29 / 143;
const KICKER_YEAR_CAP_TOP = 4 / 89;

/** Operator PNGs for 101xfounders-news / indianhappeningnow-news headers. */
export function getPngNewsHeaderAssets(preset) {
  if (!isInterNewsTicker(preset)) return null;
  const ihn = isIhnNews(preset);
  const logoH = Math.round(Number(preset.rules?.logoSize) || (ihn ? IHN_NEWS_LOGO_H : FOUNDERS_NEWS_LOGO_H));
  const kickerH = Math.round(Number(preset.rules?.kickerSize) || FOUNDERS_NEWS_KICKER_H);
  const { padX, padY } = get101xFoundersNewsHeaderPad();
  const logoY = padY;
  const typeTop = logoY + logoH * (ihn ? IHN_INDIA_CAP_TOP : FOUNDERS_LOGO_CAP_TOP);
  const kickerY = Math.round(typeTop - kickerH * KICKER_YEAR_CAP_TOP);
  return {
    logoFile: preset.logo || (ihn ? IHN_NEWS_LOGO_FILE : FOUNDERS_NEWS_LOGO_FILE),
    kickerFile: preset.rules?.kickerLogo || FOUNDERS_NEWS_KICKER_FILE,
    logoH,
    kickerH,
    padX,
    padY,
    logoY,
    kickerY,
  };
}

/** Soft-wrap a plain sentence into lines that fit maxWidth. */
export function wrapPlainWords(text, measureWord, maxWidth) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = [];
  let curW = 0;
  for (const word of words) {
    const w = measureWord(word);
    const add = cur.length ? measureWord(' ') + w : w;
    if (curW + add > maxWidth && cur.length) {
      lines.push(cur.join(' '));
      cur = [word];
      curW = w;
    } else {
      cur.push(word);
      curW += add;
    }
  }
  if (cur.length) lines.push(cur.join(' '));
  return lines;
}

/** Font size at 720px export canvas — mirrors server/videoProcessor.js */
export function getExportFontSize(preset, headline, fontScale = 1) {
  const layout = preset?.layout;
  const scale = fontScale || 1;
  if (layout === 'hook_video' || layout === 'aroll' || is101xFoundersAroll(preset)) {
    return Math.round(getHookBaseFontSize(preset) * scale);
  }
  if (layout === 'news_ticker') {
    return Math.round(54 * scale);
  }
  const len = stripHtmlLen(headline);
  const base = len < 25 ? 50 : len < 50 ? 40 : 32;
  return Math.round(base * scale);
}

/** Eyebrow / series line above hook — mirrors export */
export function getExportEyebrowFontSize(preset, fontScale = 1, eyebrowSizeScale = 1.1) {
  const scale = fontScale || 1;
  const sizeScale = eyebrowSizeScale || 1.1;
  const base = preset?.layout === 'hook_video' || preset?.layout === 'aroll' ? 24 : 20;
  return Math.max(12, Math.round(base * scale * sizeScale));
}

/** Max headline wrap width at 720px — mirrors generateOverlay maxTextWidth logic */
export function getExportMaxTextWidth(preset, canvasW = CANVAS_REF_W) {
  const name = preset?.name || '';
  const nameLower = name.toLowerCase();
  const targetW = canvasW;

  const hookOnlyPresets =
    nameLower === 'theprimefounder' ||
    nameLower === 'aicracked' ||
    nameLower === 'theevolvinggpt' ||
    nameLower === 'foundrsonig' ||
    nameLower === 'indianfoundr' ||
    nameLower === 'indiastartupstory' ||
    nameLower === 'neworderai' ||
    nameLower === 'indiasbestfounders' ||
    nameLower === 'elitefoundrs' ||
    nameLower === 'startupsoncrack' ||
    nameLower === 'millionaire.founders' ||
    nameLower === 'startupscheming' ||
    nameLower === 'startupsxindia' ||
    nameLower === 'nobelfounders' ||
    nameLower === 'foundersxindia' ||
    nameLower === 'the ai phaze' ||
    nameLower === 'that ai page' ||
    nameLower === 'revolution in tech' ||
    nameLower === 'bestindianpodcast' ||
    nameLower === 'risewithcontent';

  const logoGroupPresets =
    nameLower === 'founders.india' ||
    nameLower === 'technology in india' ||
    nameLower === 'daily tech india' ||
    nameLower === 'the prime ai page' ||
    nameLower === 'dhandha india' ||
    nameLower === 'the ai gauntlet';

  const presetsWithNarrowVideo = [
    'wealth lessons india',
    'ceo hustle advice',
    'indian business com',
    'entrepreneurial india',
    'finding good ai',
    'finding good tech',
  ];

  if (hookOnlyPresets) return 620;
  if (logoGroupPresets) return 580;
  if (name === 'indian business com') return targetW - 120;
  if (presetsWithNarrowVideo.includes(nameLower) || ['Entrepreneurial India', 'Finding Good AI', 'Finding Good Tech'].includes(name)) {
    return targetW - 40;
  }
  return 620;
}

/**
 * Max news-ticker wrap width at 720px canvas.
 * Must leave room for left inset + bold bar padding (+4px/side) so lines never clip.
 */
export function getExportNewsMaxLineWidth(preset) {
  const name = (preset?.name || '').toLowerCase();
  // Leave room for left/right inset + bold bar padding (±4px) so lines never clip the frame.
  if (name === 'indiastartupstory-news') return 560; // startX 56 + right pad + bar padding
  if (isInterNewsTicker({ name })) return 620; // left-aligned, ~40px side pads
  if (isPlainTextNewsTicker({ name })) return 500; // hook block spans ~68% of frame width in the reference
  return 600; // centered brands ~60px side margins + bar padding
}

/** Left inset (px at 720) for left-aligned news tickers. */
export function getNewsTickerLineStartX(preset, totalLineW, canvasW = CANVAS_REF_W) {
  const name = (preset?.name || '').toLowerCase();
  if (
    name === 'indiabusinesscom-news' ||
    name === 'ifc-news' ||
    isPlainTextNewsTicker(preset)
  ) {
    return Math.round((canvasW - totalLineW) / 2);
  }
  if (isInterNewsTicker(preset)) return 40;
  if (name === 'indiastartupstory-news') return 56;
  return 28;
}

/** Target bar line-height multiplier used by news ticker export + preview. */
export const NEWS_TICKER_BAR_LINE_HEIGHT = 1.45;

/**
 * Vertical gap between highlight pills (as a fraction of fontSize).
 * Matches preview paddingTop/Bottom (0.12 + 0.12) so export doesn't fuse bars into one block.
 */
export const NEWS_TICKER_LINE_GAP = 0.24;

/** Highlight pill height as a fraction of fontSize (shorter than line box → visible gaps). */
export const NEWS_TICKER_HIGHLIGHT_HEIGHT = 1.12;

/**
 * Line advance for pill-less tickers, as a fraction of fontSize.
 * Without pills there is nothing to keep apart, so lines stack tight (measured 1.00 off
 * the indianfounderscore reference) rather than reserving pill height + gap.
 */
export const NEWS_TICKER_PLAIN_LINE_HEIGHT = 1.0;

/** Extra leading between mixed Inter Regular/Bold news-hook lines. */
export const FOUNDERS_NEWS_LINE_GAP = 0.12;

/**
 * Tickers that paint highlights as coloured text instead of a filled pill behind
 * black text. Drives line advance, so preview and export must agree.
 */
export const PLAIN_TEXT_NEWS_TICKER_NAMES = ['indiafounderscore-news', 'foundersinindia-news'];

export function isPlainTextNewsTicker(preset) {
  return PLAIN_TEXT_NEWS_TICKER_NAMES.includes((preset?.name || '').toLowerCase());
}

/**
 * A-roll pages whose hooks are always ALL CAPS (IBC + indianfoundercore only).
 * News formats and other a-roll brands keep typed casing.
 */
export const UPPERCASE_AROLL_HOOK_NAMES = [
  'indiabusinesscom',
  'indianfoundercore',
];

export function isUppercaseArollHook(preset) {
  return UPPERCASE_AROLL_HOOK_NAMES.includes((preset?.name || '').toLowerCase());
}

/** @deprecated use isUppercaseArollHook */
export function isUppercaseNewsHook(preset) {
  return isUppercaseArollHook(preset);
}

/** Uppercase text runs in headline HTML; leave tags (<b>, <br>, …) alone. */
export function uppercaseHeadlineHtml(html) {
  if (!html) return html;
  return String(html).replace(/(<[^>]+>)|([^<]+)/g, (m, tag, text) => (
    tag || text.toLocaleUpperCase('en-US')
  ));
}

/** Apply a-roll ALL CAPS rule when the preset opts in. */
export function applyHookCasing(preset, html) {
  return isUppercaseArollHook(preset) ? uppercaseHeadlineHtml(html) : html;
}

/** @deprecated use applyHookCasing */
export function applyNewsHookCasing(preset, html) {
  return applyHookCasing(preset, html);
}

/**
 * News tickers whose hook sits just above a fixed lower-third black bar
 * (same vertical treatment as indianfounderscore / foundersinindia).
 * Does NOT change horizontal alignment or highlight style.
 */
export const BLACK_BAR_ANCHORED_NEWS_NAMES = [
  'indiafounderscore-news',
  'foundersinindia-news',
  'indiabusinesscom-news',
  'indiastartupstory-news',
];

export function isBlackBarAnchoredNewsTicker(preset) {
  return BLACK_BAR_ANCHORED_NEWS_NAMES.includes((preset?.name || '').toLowerCase());
}

/** Full-bleed 9:16 tickers: taller fade and more solid pad, since there is no letterboxing. */
export function isFullBleedNewsTicker(preset) {
  const name = (preset?.name || '').toLowerCase();
  return name === 'ifc-news' || isPlainTextNewsTicker(preset) || isInterNewsTicker(preset);
}

/** Per-line vertical metrics for a news ticker at a given font size. */
export function getNewsTickerLineMetrics(preset, fontSize) {
  const interNews = isInterNewsTicker(preset);
  const plain = isPlainTextNewsTicker(preset) || interNews;
  const highlightH = Math.round(
    fontSize * (plain ? NEWS_TICKER_PLAIN_LINE_HEIGHT : NEWS_TICKER_HIGHLIGHT_HEIGHT),
  );
  const lineGap = interNews
    ? Math.round(fontSize * FOUNDERS_NEWS_LINE_GAP)
    : (plain ? 0 : Math.round(fontSize * NEWS_TICKER_LINE_GAP));
  return { plain, highlightH, lineGap, lineAdvance: highlightH + lineGap };
}

/** Line-height ratios to hand to fitNewsTickerFontSize so its budget matches the render. */
export function getNewsTickerFitRatios(preset) {
  const interNews = isInterNewsTicker(preset);
  const plain = isPlainTextNewsTicker(preset) || interNews;
  return {
    highlightHeightRatio: plain ? NEWS_TICKER_PLAIN_LINE_HEIGHT : NEWS_TICKER_HIGHLIGHT_HEIGHT,
    lineGapRatio: interNews ? FOUNDERS_NEWS_LINE_GAP : (plain ? 0 : NEWS_TICKER_LINE_GAP),
  };
}

export function getNewsTickerMaxLines(preset) {
  return isInterNewsTicker(preset) ? 5 : 3;
}

export function getNewsTickerBaseFontSize(preset) {
  return isInterNewsTicker(preset) ? 42 : 54;
}

/** Height of a stacked block of `lineCount` ticker lines. */
export function getNewsTickerStackHeight(preset, fontSize, lineCount) {
  if (!lineCount) return 0;
  const { highlightH, lineGap } = getNewsTickerLineMetrics(preset, fontSize);
  return lineCount * highlightH + Math.max(0, lineCount - 1) * lineGap;
}

/** Fraction of frame height left empty below the ticker stack (Reels UI clearance). */
export function getNewsTickerBottomMarginRatio(preset) {
  const pct = Number(preset?.rules?.bottomMarginPct);
  if (Number.isFinite(pct) && !is101xFoundersNews(preset)) {
    return Math.max(0, Math.min(60, pct)) / 100;
  }
  if (is101xFoundersNews(preset)) return 0.045;
  if ((preset?.name || '').toLowerCase() === 'ifc-news') return 0.055;
  if (isInterNewsTicker(preset)) return 0.08;
  return 0.10;
}

/** Height of the fade that sits on top of the solid black cover. */
export function getNewsTickerGradientHeight(preset, canvasH) {
  if (is101xFoundersNews(preset)) {
    // Compact band immediately under the hook — not IHN's tall fade.
    return Math.min(160, Math.round(canvasH * 0.12));
  }
  if (isIhnNews(preset)) {
    return Math.min(380, Math.round(canvasH * 0.30));
  }
  const full = isFullBleedNewsTicker(preset);
  return Math.min(full ? 260 : 160, Math.round(canvasH * (full ? 0.24 : 0.18)));
}

/** Solid black above the first ticker line, so captions can't peek through the fade's tail. */
export function getNewsTickerBlackPadAbove(preset, fontSize) {
  return Math.round(fontSize * (isFullBleedNewsTicker(preset) ? 0.35 : 0.12));
}

/**
 * Absolute Y (from top) where the solid black cover begins.
 *
 * Black-bar-anchored tickers: lower-third band from the frame bottom, shifted
 * up with the hook (`shiftY`) so text + black + gradient move together.
 * Other tickers: pad above the hook bar.
 */
export function getNewsTickerSolidTopY(preset, canvasH, barY, fontSize, totalBarsH, shiftY = 0, lockupBlockH = 0) {
  if (isBlackBarAnchoredNewsTicker(preset)) {
    const bandPct = Number(preset?.rules?.solidBandPct);
    // Default ~30% of frame — matches the Canva lower-third slab.
    const ratio = Number.isFinite(bandPct)
      ? Math.max(0.15, Math.min(0.55, bandPct / 100))
      : 0.30;
    return Math.max(0, Math.round(canvasH * (1 - ratio)) - (shiftY || 0));
  }
  const stackH = totalBarsH + (lockupBlockH || 0);
  if (is101xFoundersNews(preset)) {
    // Fade starts just below the hook so text sits a little above the gradient.
    const gap = Math.round(fontSize * 0.18);
    const fadeStart = barY + totalBarsH + gap;
    const gradientH = getNewsTickerGradientHeight(preset, canvasH);
    return Math.min(canvasH, fadeStart + gradientH);
  }
  if (isIhnNews(preset)) {
    // Solid begins at the last line of hook + subtext — stack sits on the fade,
    // almost at the end of the gradient.
    const kiss = Math.round(fontSize * 0.22);
    return Math.max(0, barY + Math.max(0, stackH - kiss));
  }
  const offset = getNewsTickerSolidTopOffset(preset, fontSize, totalBarsH);
  return Math.max(0, barY - offset);
}

/**
 * Y of the first hook line (from top).
 *
 * Black-bar-anchored: pin the FIRST line to a shared height on the solid bar
 * edge (2-line reference − thin kiss), so IBC/ISS/ifc2 tops match regardless of
 * wrap count. Other tickers: bottom-margin layout.
 */
export function getNewsTickerHookBarY(preset, {
  canvasH,
  fontSize,
  totalBarsH,
  lockupBlockH = 0,
  shiftY = 0,
}) {
  if (isBlackBarAnchoredNewsTicker(preset)) {
    // shiftY lifts solid + hook together (passed into solid top)
    const blackTop = getNewsTickerSolidTopY(preset, canvasH, 0, fontSize, totalBarsH, shiftY);
    // Pin the FIRST line to a shared height so 2-line (IBC) and 3-line (ISS)
    // hooks line up. Rise is "2-line stack + thin kiss into the solid" — a
    // 2-line hook sits on the bar edge; longer hooks grow downward from that top.
    const twoLineH = getNewsTickerStackHeight(preset, fontSize, 2);
    const kissIntoSolid = Math.round(fontSize * 0.2);
    const riseAboveBar = twoLineH - kissIntoSolid;
    let barY = blackTop - riseAboveBar;
    // Keep a tiny floor so lockup / last line never clips the frame bottom.
    const minBottom = Math.round(canvasH * 0.04);
    const stackBottom = barY + totalBarsH + lockupBlockH;
    if (stackBottom > canvasH - minBottom) {
      barY = canvasH - minBottom - lockupBlockH - totalBarsH;
    }
    return Math.max(0, barY);
  }
  const bottomMargin = Math.round(canvasH * getNewsTickerBottomMarginRatio(preset));
  // 101xf: supporting line hangs into the fade, so it must not push the hook up.
  const lockup = is101xFoundersNews(preset) ? 0 : lockupBlockH;
  return canvasH - bottomMargin - lockup - totalBarsH - shiftY;
}

/**
 * Y offset of the solid black cover relative to the first hook line (barY).
 * Positive = solid starts above the hook (covers competitor captions under the text).
 * Negative = solid starts below the first line (hook sits on the gradient above the bar).
 * Prefer getNewsTickerSolidTopY for plain-text presets.
 */
export function getNewsTickerSolidTopOffset(preset, fontSize, totalBarsH) {
  if (isPlainTextNewsTicker(preset) || isIhnNews(preset)) {
    // End of hook stack, minus a thin kiss so the last line still rests on the bar.
    // Hook sits on the fade, near the solid (IHN: on the gradient, almost the end).
    return -(Math.max(0, totalBarsH - Math.round(fontSize * 0.22)));
  }
  return getNewsTickerBlackPadAbove(preset, fontSize);
}

/**
 * CSS / canvas font-family for a news ticker. ifc2 uses Helvetica World Bold when the
 * file is present; everything else stays on ITC Avant Garde Gothic Bold.
 */
export function getNewsTickerFontFamily(preset) {
  // Inter last so browsers can fall back for ₹ / rare currency glyphs missing from
  // Helvetica World and ITC Avant Garde (export uses the same Inter fallback).
  if (isInterNewsTicker(preset)) {
    return "'Inter', sans-serif";
  }
  if (isPlainTextNewsTicker(preset)) {
    return "'Helvetica World', 'ITC Avant Garde Gothic', Inter, sans-serif";
  }
  return "'ITC Avant Garde Gothic', Inter, sans-serif";
}

/**
 * Handle lockup (Instagram + Facebook + handle wordmark PNG) centred under the hook.
 * `width`/`height` describe a fixed layout box at the 720px canvas: the artwork is
 * contained inside it, so the box is reserved whether or not the PNG resolves and
 * preview geometry stays identical to export.
 */
export function getNewsTickerHandleLockup(preset) {
  const rule = preset?.rules?.handleLockup;
  if (!rule?.file) return null;
  return {
    file: rule.file,
    width: Math.round(rule.width ?? 188),
    height: Math.round(rule.height ?? 25),
    gap: Math.round(rule.gap ?? 5),
  };
}

/**
 * Bottom-left news logo (ISS): sit just under the hook stack with a gap so it
 * never touches the text. Follows the hook as it moves; clamps to a bottom pad.
 * Returns logo top Y in canvas pixels.
 */
export function getNewsTickerBottomLogoY({
  canvasH,
  barY,
  totalBarsH,
  logoH,
  gap = 14,
  padBottom = 12,
}) {
  const followY = Math.round(barY + totalBarsH + gap);
  const maxY = Math.round(canvasH - logoH - padBottom);
  return Math.max(0, Math.min(maxY, followY));
}

/** Presets whose bottom logo must track the hook (IBC has top logo only). */
export function newsTickerHasDynamicBottomLogo(preset) {
  const name = (preset?.name || '').toLowerCase();
  return name === 'indiastartupstory-news'
    || (preset?.rules?.logoPosition === 'bottom-left');
}

/**
 * Clamp hook shift (px) so a dynamic bottom logo never collides with the text.
 * Positive shift raises the stack; negative lowers it.
 */
export function clampNewsTickerShiftPx(preset, {
  canvasH,
  fontSize,
  totalBarsH,
  lockupBlockH = 0,
  shiftY = 0,
}) {
  let s = Math.max(
    Math.round(canvasH * -0.22),
    Math.min(Math.round(canvasH * 0.48), Math.round(shiftY || 0)),
  );
  if (!newsTickerHasDynamicBottomLogo(preset)) return s;

  const logoH = Math.round(Number(preset?.rules?.logoSize) || 55);
  const gap = 14;
  const padBottom = 12;
  for (let i = 0; i < 4; i++) {
    const barY = getNewsTickerHookBarY(preset, {
      canvasH, fontSize, totalBarsH, lockupBlockH, shiftY: s,
    });
    const overflow = barY + totalBarsH + gap + logoH + padBottom - canvasH;
    if (overflow <= 0) break;
    s += Math.ceil(overflow); // raise stack so logo fits under hook
  }
  return s;
}

/**
 * Largest font that keeps the news ticker compact like Canva:
 * soft-wrap within maxLineW, prefer ≤ maxLines, and keep total bar stack ≤ maxTotalBarsH.
 * measureWordAtSize(text, fontSize) must use the same face as render.
 */
export function fitNewsTickerFontSize({
  cleanedHtml,
  measureWordAtSize,
  maxLineW,
  baseFontSize = 54,
  userScale = 1,
  minFontSize = 28,
  maxLines = 3,
  maxTotalBarsH = Infinity,
  barLineHeight = NEWS_TICKER_BAR_LINE_HEIGHT,
  lineGapRatio = NEWS_TICKER_LINE_GAP,
  highlightHeightRatio = NEWS_TICKER_HIGHLIGHT_HEIGHT,
}) {
  const minFs = Math.max(12, Math.round(minFontSize));
  const maxFs = Math.max(minFs, Math.round(baseFontSize));

  const layoutAt = (fontSize) => {
    const measure = (text) => measureWordAtSize(text, fontSize);
    const lines = layoutNewsTickerTokenLines(cleanedHtml, measure, maxLineW);
    const highlightH = Math.round(fontSize * highlightHeightRatio);
    const lineGap = Math.round(fontSize * lineGapRatio);
    const lineAdvance = highlightH + lineGap;
    const totalH = lines.length === 0
      ? 0
      : lines.length * highlightH + Math.max(0, lines.length - 1) * lineGap;
    let maxMeasured = 0;
    for (const line of lines) {
      let w = 0;
      for (let i = 0; i < line.length; i++) {
        w += measure(line[i].text) + (i ? measure(' ') : 0);
      }
      if (w > maxMeasured) maxMeasured = w;
    }
    return { lines, barH: highlightH, lineGap, lineAdvance, totalH, maxMeasured };
  };

  const fits = (fontSize, enforceMaxLines) => {
    const { lines, totalH, maxMeasured } = layoutAt(fontSize);
    if (maxMeasured > maxLineW + 0.5) return false;
    if (totalH > maxTotalBarsH) return false;
    if (enforceMaxLines && lines.length > maxLines) return false;
    return true;
  };

  const search = (enforceMaxLines) => {
    let lo = minFs;
    let hi = maxFs;
    let best = minFs;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (fits(mid, enforceMaxLines)) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  };

  // Prefer Canva-like ≤3 lines; if the hook is too long even at min size, fall back to height-only.
  let fontSize = search(true);
  if (!fits(fontSize, true)) {
    fontSize = search(false);
  }

  // Hard guarantee: keep shrinking until every line fits maxLineW (handles odd glyphs / padding).
  while (fontSize > 12 && !fits(fontSize, false)) {
    fontSize -= 1;
  }

  // The operator's font-size slider applies AFTER the auto-fit, not as its search ceiling.
  // As a ceiling it was inert: the binding constraint is almost always maxLineW / total
  // stack height (ifc2's 500px budget in particular), so raising the ceiling changed
  // nothing and lowering it did nothing until it dropped under the already-constrained
  // result — the slider felt dead in both directions. Scaling the fitted size instead
  // gives it authority at every size. Above 1 the hook may exceed the auto-fit budget,
  // which is the operator explicitly asking for bigger text.
  const scaled = Math.max(12, Math.round(fontSize * (userScale || 1)));
  const { lines } = layoutAt(scaled);
  return { fontSize: scaled, lines };
}

/** Gap between hook text block and video (px at 720×1280 export canvas). */
export function getHookVideoGap(preset) {
  if (Number.isFinite(preset?.hookVideoGap)) return Math.round(preset.hookVideoGap);

  // Keep hook close to the video like IG references, with a small breathing gap.
  // Remaining line-box slack is handled by measuring the last line to fontSize.
  if (preset?.layout === 'hook_video') return 18;
  if (preset?.layout === 'aroll') return 18;
  // ISS a-roll: match IFC hook_video gap (was watermark default 20 + last-line slack).
  if ((preset?.name || '').toLowerCase() === 'indiastartupstory') return 18;
  if (is101xFoundersAroll(preset)) return 18;

  const name = preset?.name || '';
  const nameLower = name.toLowerCase();
  const GAP = 20;
  const isAllBoldWhite = name === 'Founders God' || name === 'CEO Mindset India';
  const isHookCentered = ['The Rising Founder', 'The Real Founder', 'Inspiring Founder', 'Business Cracked', 'The Founders Show', 'founders cracked'].includes(name);
  const shouldUseGap = name === 'CEO Mindset India' || name === 'Founders God' || name === 'The Founders Show' || name === 'Entrepreneurial India';
  const isTightGapPreset = name === 'startupcoded' || name === 'Dhandha India' || name === 'kwazyfounders' || name === 'Finding Good AI' || name === 'Finding Good Tech';
  const isFoundersIndia = nameLower === 'founders.india';

  const base = (shouldUseGap || !(isAllBoldWhite || isHookCentered)) ? GAP : 0;
  if (isFoundersIndia) return 0;
  if (isTightGapPreset) return Math.round(base * 0.4);
  return base;
}

export function getEffectiveLineSpacing(preset) {
  const v = Number(preset?.lineSpacing);
  return Number.isFinite(v) && v > 0 ? v : 1.25;
}
