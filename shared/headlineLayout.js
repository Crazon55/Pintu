/**
 * Shared headline parsing + line layout for preview (browser) and export (Node).
 * Respects manual line breaks (<br>, Shift+Enter, Enter/div) then soft-wraps each line.
 */

export function cleanHeadlineHtml(html) {
  if (!html) return '';
  let cleaned = html.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
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
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length;
}

/** Font size at 720px export canvas — mirrors server/videoProcessor.js */
export function getExportFontSize(preset, headline, fontScale = 1) {
  const layout = preset?.layout;
  const scale = fontScale || 1;
  if (layout === 'hook_video' || layout === 'aroll') {
    return Math.round(38 * scale);
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
  return 600; // centered brands ~60px side margins + bar padding
}

/** Left inset (px at 720) for left-aligned news tickers. */
export function getNewsTickerLineStartX(preset, totalLineW, canvasW = CANVAS_REF_W) {
  const name = (preset?.name || '').toLowerCase();
  if (name === 'indiabusinesscom-news' || name === 'ifc-news' || name === 'ifc2-news') {
    return Math.round((canvasW - totalLineW) / 2);
  }
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
 * Largest font that keeps the news ticker compact like Canva:
 * soft-wrap within maxLineW, prefer ≤ maxLines, and keep total bar stack ≤ maxTotalBarsH.
 * measureWordAtSize(text, fontSize) must use the same face as render.
 */
export function fitNewsTickerFontSize({
  cleanedHtml,
  measureWordAtSize,
  maxLineW,
  baseFontSize = 54,
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

  const { lines } = layoutAt(fontSize);
  return { fontSize, lines };
}

/** Gap between hook text block and video (px at 720×1280 export canvas). */
export function getHookVideoGap(preset) {
  if (Number.isFinite(preset?.hookVideoGap)) return Math.round(preset.hookVideoGap);

  if (preset?.layout === 'hook_video') return 25;

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
