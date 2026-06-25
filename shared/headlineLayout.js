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

/** Manual line breaks first; soft-wrap only when there are no explicit line breaks. */
export function layoutHeadlineLines(cleanedHtml, measureWord, maxWidth, spacing) {
  const allLines = [];
  const logicalLines = cleanedHtml.split('\n').map((s) => s.trim()).filter(Boolean);
  const manual = hasManualLineBreaks(cleanedHtml);
  for (const lineHtml of logicalLines) {
    const tokens = tokensFromLineHtml(lineHtml);
    if (!tokens.length) continue;
    if (manual) {
      allLines.push(tokensToSingleLine(tokens, measureWord, spacing));
    } else {
      allLines.push(...wrapTokensToLines(tokens, measureWord, maxWidth, spacing));
    }
  }
  return allLines;
}

/** News ticker: returns array of token arrays [{ text, bold }] */
export function layoutNewsTickerTokenLines(cleanedHtml, measureWord, maxWidth) {
  const allLines = [];
  const logicalLines = cleanedHtml.split('\n').map((s) => s.trim()).filter(Boolean);
  const manual = hasManualLineBreaks(cleanedHtml);
  for (const lineHtml of logicalLines) {
    const tokens = tokensFromLineHtml(lineHtml);
    if (!tokens.length) continue;
    if (manual) {
      allLines.push(tokens.map((t) => ({ ...t })));
      continue;
    }
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

export function getExportNewsMaxLineWidth() {
  return 660;
}
