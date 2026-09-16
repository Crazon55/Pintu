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
      const w = measureWord(t.text, t.bold);
      const add = cur.length ? measureWord(' ', false) + w : w;
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

/** Poppins handle A-roll (101xf / ISS / FII): Bold highlight + Regular body, handle watermark. */
export const FOUNDERS_AROLL_HIGHLIGHT = '#ff7c15';
export const FOUNDERS_AROLL_REGULAR = '#ffffff';
export const ISS_AROLL_HIGHLIGHT = '#ef5350';
export const FII_AROLL_HIGHLIGHT = '#439eff';
export const IFC_AROLL_HIGHLIGHT = '#32c26c';
/** 101xfounders news ticker highlight — #ff8610 (A-roll stays FOUNDERS_AROLL_HIGHLIGHT). */
export const FOUNDERS_NEWS_HIGHLIGHT = '#ff8610';
/** Unique families — Windows will not pick Inter Bold from `'Inter'` + font-weight:700. */
export const INTER_REGULAR_FAMILY = "'Inter Regular', sans-serif";
export const INTER_MEDIUM_FAMILY = "'Inter Medium', sans-serif";
export const INTER_BOLD_FAMILY = "'Inter Bold', sans-serif";
export const INTER_EXTRABOLD_FAMILY = "'Inter ExtraBold', sans-serif";
/** IFC news hook highlight — same green as IFC A-roll. */
export const IFC_NEWS_HIGHLIGHT = '#32c26c';
/** FII news highlight box. Text on the box stays white. */
export const FII_NEWS_HIGHLIGHT = '#032b92';

export function is101xFoundersAroll(preset) {
  return (preset?.name || '').toLowerCase() === '101xfounders-aroll';
}

export function isIssAroll(preset) {
  return (preset?.name || '').toLowerCase() === 'indiastartupstory';
}

export function isFiiAroll(preset) {
  return (preset?.name || '').toLowerCase() === 'founders-in-india';
}

export function isIfcAroll(preset) {
  return (preset?.name || '').toLowerCase() === 'indian-founders-co';
}

export function isIbcAroll(preset) {
  return (preset?.name || '').toLowerCase() === 'indiabusinesscom';
}

/** Thechangingorder A-roll: Inter Bold highlight + body, 1:1 video hole. */
export function isChangingOrderAroll(preset) {
  return (preset?.name || '').toLowerCase() === 'thechangingorder';
}

export const TCO_AROLL_HIGHLIGHT = '#c7ff3e';
export const TCO_AROLL_REGULAR = '#ffffff';

/** IBC + TCO A-roll: Inter Bold for both highlight and body. */
export function isInterBoldAroll(preset) {
  return isIbcAroll(preset) || isChangingOrderAroll(preset);
}

export const IBC_AROLL_ORANGE = '#ff7838';
export const IBC_AROLL_GREEN = '#3af349';
export const IBC_AROLL_REGULAR = '#ffffff';

/** IBC dual-color: 1st highlight run orange, later runs green, body white. */
export function getIbcArollTokenColor(groupIndex) {
  if (groupIndex === 1) return IBC_AROLL_ORANGE;
  if (groupIndex >= 2) return IBC_AROLL_GREEN;
  return IBC_AROLL_REGULAR;
}

export function isBizzindiaAroll(preset) {
  return (preset?.name || '').toLowerCase() === 'bizzindia';
}

/** IFC2 A-roll (`indianfoundercore`). */
export function isIfc2Aroll(preset) {
  return (preset?.name || '').toLowerCase() === 'indianfoundercore';
}

export const BIZZINDIA_AROLL_HIGHLIGHT = '#f52a46'; // Bizz India A-roll bold hook — never preset.color / #E31D38
export const BIZZINDIA_AROLL_REGULAR = '#ffffff';
export const IFC2_AROLL_HIGHLIGHT = '#ffd412';
export const IFC2_AROLL_REGULAR = '#ffffff';

/** Bizzindia + IFC2: Inter Black highlight / Inter Bold body. */
export function isInterBlackHighlightAroll(preset) {
  return isBizzindiaAroll(preset) || isIfc2Aroll(preset);
}

export function getInterBlackArollColors(preset) {
  if (isIfc2Aroll(preset)) {
    return { highlight: IFC2_AROLL_HIGHLIGHT, regular: IFC2_AROLL_REGULAR };
  }
  return { highlight: BIZZINDIA_AROLL_HIGHLIGHT, regular: BIZZINDIA_AROLL_REGULAR };
}

/** 101xfounders / ISS / FII A-roll: Poppins hook + 40% handle watermark. */
export function isPoppinsHandleAroll(preset) {
  return is101xFoundersAroll(preset) || isIssAroll(preset) || isFiiAroll(preset);
}

/** Handle watermark A-rolls — same placement/opacity/size; IFC uses Inter instead of Poppins. */
export function isHandleWatermarkAroll(preset) {
  return isPoppinsHandleAroll(preset) || isIfcAroll(preset);
}

export function getPoppinsArollHighlight(preset) {
  if (isIssAroll(preset)) return ISS_AROLL_HIGHLIGHT;
  if (isFiiAroll(preset)) return FII_AROLL_HIGHLIGHT;
  if (isIfcAroll(preset)) return IFC_AROLL_HIGHLIGHT;
  return FOUNDERS_AROLL_HIGHLIGHT;
}

export function is101xFoundersNews(preset) {
  return (preset?.name || '').toLowerCase() === '101xfounders-news';
}

export function isIhnNews(preset) {
  return (preset?.name || '').toLowerCase() === 'indianhappeningnow-news';
}

export function isBizzindiaNews(preset) {
  return (preset?.name || '').toLowerCase() === 'bizzindia-news';
}

export const BIZZINDIA_NEWS_HIGHLIGHT = '#f52a46';
export const BIZZINDIA_NEWS_REGULAR = '#ffffff';
/** Unique families — Windows cannot be trusted to pick Thin vs SemiBold by numeric weight. */
export const IVYPRESTO_HEADLINE_THIN_FAMILY = "'IvyPresto Headline Thin', serif";
export const IVYPRESTO_HEADLINE_SEMIBOLD_FAMILY = "'IvyPresto Headline SemiBold', serif";
export const BIZZINDIA_NEWS_LOGO_FILE = 'bizzindia-news-logo.png';
export const BIZZINDIA_NEWS_LOGO_H = 88;
/** Operator 2026/India lockup (FS News Formats.png). Taller source pad than 101xf. */
export const BIZZINDIA_NEWS_KICKER_FILE = 'bizzindia-news-kicker.png';
export const BIZZINDIA_NEWS_KICKER_H = 93;
export const BIZZINDIA_NEWS_LINE_GAP = 0.18;

/** 9:16 Inter news tickers with PNG header + supporting line (101xf + IHN). */
export function isInterNewsTicker(preset) {
  return is101xFoundersNews(preset) || isIhnNews(preset);
}

/** PNG wordmark + 2026/India kicker (101xf, IHN, Bizz India, FII news). */
export function isPngHeaderNewsTicker(preset) {
  return isInterNewsTicker(preset) || isBizzindiaNews(preset) || isFiiNews(preset);
}

export const IHN_NEWS_HIGHLIGHT = '#ffa928';
export const IHN_NEWS_REGULAR = '#ffffff';
export const IHN_NEWS_SUBTEXT = '#b4b4b4';
/** First hook line as a fraction of frame height (Brief India lockup). */
export const IHN_NEWS_HOOK_TOP = 0.62;

/** Supporting paragraph under Inter-news hooks. Ignores leftover Credit: footers. */
export function usesNewsSupportingCopy(preset) {
  return isInterNewsTicker(preset) || isExtraBoldBoxNews(preset);
}

export function getNewsSupportingText(preset) {
  if (!usesNewsSupportingCopy(preset)) return '';
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
  const canva = getNewsTickerCanvaType(preset);
  if (canva?.subSize) return canva.subSize;
  const scale = isIhnNews(preset) ? 0.40 : 0.42;
  return Math.max(13, Math.round(hookFs * scale));
}

export function getNewsSupportingLineHeight(preset, supportFs) {
  const canva = getNewsTickerCanvaType(preset);
  const ratio = canva?.subLineHeight ?? 1.28;
  return Math.round(supportFs * ratio);
}

export function getNewsSupportingTracking(preset) {
  const canva = getNewsTickerCanvaType(preset);
  return canva && Number.isFinite(canva.subTracking) ? canva.subTracking : 0;
}

export function getNewsSupportingColor(preset) {
  return isIhnNews(preset) ? IHN_NEWS_SUBTEXT : FOUNDERS_AROLL_REGULAR;
}

/** Vertical gap between Inter-news / IFC hook and supporting paragraph. */
export function getNewsSupportingGap(preset, hookFs) {
  if (!usesNewsSupportingCopy(preset)) return 0;
  if (isExtraBoldBoxNews(preset)) return Math.round(hookFs * 0.48);
  return Math.round(hookFs * (isIhnNews(preset) ? 0.55 : 0.78));
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
 * Header insets at the 720px canvas so wordmarks + 2026/India clear
 * Instagram's status bar and rounded corners (Bizz, 101xf, IHN, IFC).
 */
export const NEWS_SAFE_PAD_X = 56;
export const NEWS_SAFE_PAD_Y = 120;
/**
 * 101xf / IHN hook + subtext on the 720 canvas.
 * Same Brief India line length as IHN (~7% / ~14%). The old Reels cutout
 * (80/152) wrapped the hook to 4 short lines and clipped the supporting
 * paragraph after ~3.
 */
export const INTER_NEWS_PAD_LEFT = 56;
export const INTER_NEWS_PAD_RIGHT = 100;
export const IHN_NEWS_PAD_LEFT = 56;
export const IHN_NEWS_PAD_RIGHT = 100;

export function getNewsTickerSidePads(preset) {
  if (isIhnNews(preset) || is101xFoundersNews(preset)) {
    return { left: IHN_NEWS_PAD_LEFT, right: IHN_NEWS_PAD_RIGHT };
  }
  if (isExtraBoldBoxNews(preset)) {
    return { left: IFC_NEWS_PAD_X, right: IFC_NEWS_PAD_X };
  }
  if (isInterNewsTicker(preset)) {
    return { left: INTER_NEWS_PAD_LEFT, right: INTER_NEWS_PAD_RIGHT };
  }
  return { left: 16, right: 16 };
}
/** IBC / ISS news vertical social strip — keep clear of Instagram's right-rail UI. */
export const IBC_NEWS_STRIP_W = 32;
export const IBC_NEWS_STRIP_PAD_X = 32;
export const IBC_NEWS_STRIP_PAD_Y = 48;
export const IBC_NEWS_STRIP_FILE = 'IndianBusinessCom NewsStatic Format (1).png';
export const ISS_NEWS_STRIP_FILE = 'IBC and ISS News.png';

export function getNewsTickerSocialStrip(preset) {
  const name = (preset?.name || '').toLowerCase();
  if (name === 'indiabusinesscom-news') return IBC_NEWS_STRIP_FILE;
  if (name === 'indiastartupstory-news') return ISS_NEWS_STRIP_FILE;
  return null;
}
export const FOUNDERS_NEWS_PAD_X = NEWS_SAFE_PAD_X;
export const FOUNDERS_NEWS_PAD_Y = NEWS_SAFE_PAD_Y;
export const BIZZINDIA_NEWS_PAD_X = NEWS_SAFE_PAD_X;
export const BIZZINDIA_NEWS_PAD_Y = NEWS_SAFE_PAD_Y;
export const IFC_NEWS_PAD_X = NEWS_SAFE_PAD_X;
export const IFC_NEWS_PAD_Y = NEWS_SAFE_PAD_Y;
/** IFC. wordmark height at the 720 canvas (Inter ExtraBold). */
export const IFC_NEWS_LOGO_SIZE = 58;
export const FII_NEWS_LOGO_FILE = 'FS News Formats (1).png';
export const FII_NEWS_KICKER_FILE = 'FS News Formats (2).png';
/** Stacked FOUNDERS IN INDIA lockup height at the 720 canvas. */
export const FII_NEWS_LOGO_H = 88;
/** 2026 kicker height at the 720 canvas. */
export const FII_NEWS_KICKER_H = 72;

export function get101xFoundersNewsHeaderPad() {
  return { padX: NEWS_SAFE_PAD_X, padY: NEWS_SAFE_PAD_Y };
}

/** Operator-supplied wordmark / year-place PNGs (white on transparent). Heights at 720 canvas. */
export const FOUNDERS_NEWS_LOGO_FILE = 'new-new-101xfounder-logo.png';
export const FOUNDERS_NEWS_KICKER_FILE = '101xfounders-news-kicker.png';
export const FOUNDERS_NEWS_LOGO_H = 42;
export const FOUNDERS_NEWS_KICKER_H = 58;

export const IHN_NEWS_LOGO_FILE = 'indianhappeningnow-news-logo.png';
export const IHN_NEWS_KICKER_FILE = 'FS News Formats.png'; // same 2026/India lockup as Bizz
export const IHN_NEWS_LOGO_H = 104;
export const IHN_NEWS_KICKER_H = BIZZINDIA_NEWS_KICKER_H;

// Opaque-row fractions in the cropped header PNGs — align 2026's cap-top
// with 101xf. / INDIA (not the star, not the "India" subtitle).
const FOUNDERS_LOGO_CAP_TOP = 8 / 311;
const IHN_INDIA_CAP_TOP = 29 / 143;
const BIZZ_LOGO_CAP_TOP = 24 / 139;
const FII_LOGO_CAP_TOP = 29 / 155;
const KICKER_YEAR_CAP_TOP = 4 / 89;
const BIZZ_KICKER_YEAR_CAP_TOP = 32 / 143;
const FII_KICKER_YEAR_CAP_TOP = 36 / 131;

/** Operator PNGs for 101xfounders-news / indianhappeningnow-news / bizzindia-news / FII headers. */
export function getPngNewsHeaderAssets(preset) {
  if (!isPngHeaderNewsTicker(preset)) return null;
  const ihn = isIhnNews(preset);
  const bizz = isBizzindiaNews(preset);
  const fii = isFiiNews(preset);
  let logoH = Math.round(Number(preset.rules?.logoSize) || (
    ihn ? IHN_NEWS_LOGO_H : (bizz ? BIZZINDIA_NEWS_LOGO_H : (fii ? FII_NEWS_LOGO_H : FOUNDERS_NEWS_LOGO_H))
  ));
  if (bizz) logoH = Math.max(logoH, BIZZINDIA_NEWS_LOGO_H);
  if (ihn) logoH = Math.max(logoH, IHN_NEWS_LOGO_H);
  if (fii) logoH = Math.max(logoH, FII_NEWS_LOGO_H);
  const kickerH = (bizz || ihn)
    ? BIZZINDIA_NEWS_KICKER_H
    : fii
      ? Math.round(Number(preset.rules?.kickerSize) || FII_NEWS_KICKER_H)
      : Math.round(Number(preset.rules?.kickerSize) || FOUNDERS_NEWS_KICKER_H);
  const { padX, padY } = get101xFoundersNewsHeaderPad();
  const logoY = padY;
  const capTop = fii ? FII_LOGO_CAP_TOP : (ihn ? IHN_INDIA_CAP_TOP : (bizz ? BIZZ_LOGO_CAP_TOP : FOUNDERS_LOGO_CAP_TOP));
  const typeTop = logoY + logoH * capTop;
  const kickerCap = fii ? FII_KICKER_YEAR_CAP_TOP : ((bizz || ihn) ? BIZZ_KICKER_YEAR_CAP_TOP : KICKER_YEAR_CAP_TOP);
  const kickerY = Math.round(typeTop - kickerH * kickerCap);
  return {
    logoFile: preset.logo || (fii ? FII_NEWS_LOGO_FILE : (ihn ? IHN_NEWS_LOGO_FILE : (bizz ? BIZZINDIA_NEWS_LOGO_FILE : FOUNDERS_NEWS_LOGO_FILE))),
    kickerFile: fii
      ? (preset.rules?.kickerLogo || FII_NEWS_KICKER_FILE)
      : (ihn
        ? IHN_NEWS_KICKER_FILE
        : (bizz ? BIZZINDIA_NEWS_KICKER_FILE : (preset.rules?.kickerLogo || FOUNDERS_NEWS_KICKER_FILE))),
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
  if (isBizzindiaNews({ name })) return 580; // centered IvyPresto, ~70px side pads
  if (isExtraBoldBoxNews({ name })) return CANVAS_REF_W - IFC_NEWS_PAD_X - IFC_NEWS_PAD_X;
  if (isInterNewsTicker({ name })) {
    const { left, right } = getNewsTickerSidePads({ name });
    return CANVAS_REF_W - left - right;
  }
  if (isPlainTextNewsTicker({ name })) return 500; // hook block spans ~68% of frame width in the reference
  return 600; // centered brands ~60px side margins + bar padding
}

export function isCenteredNewsTicker(preset) {
  const name = (preset?.name || '').toLowerCase();
  return name === 'indiabusinesscom-news'
    || name === 'ifc-news'
    || name === 'foundersinindia-news'
    || name === 'thechangingorder-news'
    || name === 'indiastartupstory-news'
    || name === 'bizzindia-news'
    || isPlainTextNewsTicker(preset);
}

/** Left inset (px at 720) for left-aligned news tickers. Centered formats sit on the midline. */
export function getNewsTickerLineStartX(preset, totalLineW, canvasW = CANVAS_REF_W) {
  if (isCenteredNewsTicker(preset)) {
    return Math.round((canvasW - totalLineW) / 2);
  }
  if (isInterNewsTicker(preset)) return getNewsTickerSidePads(preset).left;
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
export const PLAIN_TEXT_NEWS_TICKER_NAMES = ['indiafounderscore-news'];

export function isFiiNews(preset) {
  return (preset?.name || '').toLowerCase() === 'foundersinindia-news';
}

/** IFC / FII: Inter ExtraBold ALL-CAPS hook + filled highlight box + centred subtext. */
export function isExtraBoldBoxNews(preset) {
  return isIfcNews(preset) || isFiiNews(preset);
}

export function isPlainTextNewsTicker(preset) {
  return PLAIN_TEXT_NEWS_TICKER_NAMES.includes((preset?.name || '').toLowerCase());
}

/** ifc-news: Inter ExtraBold ALL-CAPS hook + green text highlight + centred subtext. */
export function isIfcNews(preset) {
  return (preset?.name || '').toLowerCase() === 'ifc-news';
}

/** thechangingorder-news: Inter Bold hook + lime pills, same 9:16 treatment as IFC. */
export function isChangingOrderNews(preset) {
  return (preset?.name || '').toLowerCase() === 'thechangingorder-news';
}

export function isInterBoldPillNews(preset) {
  return isIfcNews(preset) || isChangingOrderNews(preset);
}

export const TCO_NEWS_HIGHLIGHT = '#c7ff3e';
export const TCO_NEWS_LOGO_FILE = 'to India.png';
export const TCO_NEWS_LOGO_H = 150;
export const TCO_NEWS_PAD_X = NEWS_SAFE_PAD_X;
export const TCO_NEWS_PAD_Y = NEWS_SAFE_PAD_Y;
/** Condensed display face for the "BREAKING" badge above the TCO news hook. */
export const BEBAS_NEUE_CYRILLIC_FAMILY = "'Bebas Neue Cyrillic', sans-serif";
/**
 * "BREAKING" font size as a multiple of the hook font size. Canva reference: BREAKING's
 * glyph height runs ~3.7x the body line height (measured off the exported PNG, comparing
 * white-glyph pixel bands) — it's a banner, not a small eyebrow tag above the hook.
 */
export const TCO_BADGE_SCALE = 3.0;

/** indiafounderscore-news (ifc2): Helvetica World Bold, yellow highlight, no pills. */
export function isIfc2News(preset) {
  return (preset?.name || '').toLowerCase() === 'indiafounderscore-news';
}

export const IFC2_NEWS_HIGHLIGHT = '#e0e140';
export const HELVETICA_WORLD_BOLD_FAMILY = "'Helvetica World', 'ITC Avant Garde Gothic', 'Inter Bold', sans-serif";

/**
 * A-roll pages whose hooks are always ALL CAPS.
 */
export const UPPERCASE_AROLL_HOOK_NAMES = [
  'indiabusinesscom',
  'indianfoundercore',
  'indian-founders-co',
  'bizzindia',
];

export function isUppercaseArollHook(preset) {
  return UPPERCASE_AROLL_HOOK_NAMES.includes((preset?.name || '').toLowerCase());
}

/** Hooks that always render ALL CAPS (aroll brands + IFC news). */
export function isUppercaseHook(preset) {
  return isUppercaseArollHook(preset) || isExtraBoldBoxNews(preset);
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
  return isUppercaseHook(preset) ? uppercaseHeadlineHtml(html) : html;
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
  '101xfounders-news',
  'bizzindia-news',
  'ifc-news',
  'indianhappeningnow-news',
];

export function isBlackBarAnchoredNewsTicker(preset) {
  return BLACK_BAR_ANCHORED_NEWS_NAMES.includes((preset?.name || '').toLowerCase());
}

/** Full-bleed 9:16 tickers: taller fade and more solid pad, since there is no letterboxing. */
export function isFullBleedNewsTicker(preset) {
  const name = (preset?.name || '').toLowerCase();
  return name === 'ifc-news' || name === 'foundersinindia-news' || name === 'thechangingorder-news' || isPlainTextNewsTicker(preset) || isInterNewsTicker(preset) || isBizzindiaNews(preset);
}

/**
 * Canva type-panel values, applied 1:1 on the 720-wide overlay.
 * `tracking` is Canva letter spacing (thousandths of an em: -50 → -0.05em).
 * `lineHeight` is Canva line spacing (baseline multiplier).
 */
export const NEWS_TICKER_CANVA_TYPE = {
  'indiafounderscore-news': { fontSize: 42.9, tracking: -50, lineHeight: 0.91 },
  'foundersinindia-news': {
    fontSize: 42, tracking: -10, lineHeight: 1.38,
    subSize: 18, subTracking: 0, subLineHeight: 1.35,
  },
  '101xfounders-news': {
    fontSize: 44.1, tracking: -11, lineHeight: 0.99,
    subSize: 23, subTracking: 0, subLineHeight: 1.5,
  },
  // Brief India overlay: Inter Bold hook + Inter Medium body, −1.5% tracking.
  // 50px is the optical match — 38px read as a caption, not a hed.
  'indianhappeningnow-news': {
    fontSize: 44, tracking: -15, lineHeight: 1.08,
    subSize: 22, subTracking: 0, subLineHeight: 1.35,
  },
  'ifc-news': {
    fontSize: 42, tracking: -10, lineHeight: 1.38,
    subSize: 18, subTracking: 0, subLineHeight: 1.35,
  },
  'thechangingorder-news': { fontSize: 35.9, tracking: 12, lineHeight: 1.4 },
  'bizzindia-news': { fontSize: 50.2, tracking: 0, lineHeight: 1.11 },
};

/**
 * Base Canva type values for this preset, with the operator's per-preset Line
 * Spacing slider (lineSpacingScale, default 1 = 100%, i.e. the Canva-matched
 * baseline) applied on top. fontSize is left untouched — that's the separate
 * Text Size slider's job. Letter spacing is handled separately by
 * getNewsTickerTracking — a multiplier can't move a 0 baseline (Bizzindia's
 * Canva tracking is 0), so that one is an additive offset instead.
 */
export function getNewsTickerCanvaType(preset) {
  const base = NEWS_TICKER_CANVA_TYPE[(preset?.name || '').toLowerCase()] || null;
  if (!base) return null;
  const lineScale = Number.isFinite(Number(preset?.lineSpacingScale)) ? Number(preset.lineSpacingScale) : 1;
  if (lineScale === 1) return base;
  return { ...base, lineHeight: base.lineHeight * lineScale };
}

/**
 * Letter spacing (thousandths of an em), Canva baseline plus the operator's
 * per-preset Letter Spacing slider (letterSpacingOffset, additive, default 0).
 * Additive rather than a multiplier so it still works on presets whose Canva
 * baseline is 0 (Bizzindia) — a multiplier can never move off zero.
 */
export function getNewsTickerTracking(preset) {
  const base = getNewsTickerCanvaType(preset)?.tracking ?? 0;
  const offset = Number.isFinite(Number(preset?.letterSpacingOffset)) ? Number(preset.letterSpacingOffset) : 0;
  return base + offset;
}

/**
 * Word Spacing slider for news tickers (newsWordSpacingScale, default 1 =
 * 100% = the font's natural space width). Separate field from the aroll/
 * hook_video `wordSpacing` (a fraction of font size, not of space width) —
 * reusing that field would make every news ticker snap absurdly tight the
 * moment this got wired in, since its default there is 0.25.
 */
export function getNewsTickerWordSpacingScale(preset) {
  return Number.isFinite(Number(preset?.newsWordSpacingScale)) ? Number(preset.newsWordSpacingScale) : 1;
}

/** CSS `letter-spacing` in em, or null when the format has no Canva tracking. */
export function getNewsTickerLetterSpacingEm(preset) {
  if (!getNewsTickerCanvaType(preset)) return null;
  return getNewsTickerTracking(preset) / 1000;
}

/**
 * Extra width from Canva tracking. A lone space also carries the gaps on both
 * sides so wrap width matches CSS letter-spacing on the full line.
 */
export function applyCanvaTracking(baseWidth, text, fontSize, tracking) {
  const t = Number(tracking) || 0;
  if (!t) return baseWidth;
  const n = [...String(text || '')].length;
  if (n === 0) return baseWidth;
  const unit = fontSize * t / 1000;
  if (text === ' ') return baseWidth + 2 * unit;
  return baseWidth + Math.max(0, n - 1) * unit;
}

function newsTickerIsPlainStack(preset) {
  return isPlainTextNewsTicker(preset) || isInterNewsTicker(preset) || isBizzindiaNews(preset);
}

/** Per-line vertical metrics for a news ticker at a given font size. */
export function getNewsTickerLineMetrics(preset, fontSize) {
  const plain = newsTickerIsPlainStack(preset);
  const canva = getNewsTickerCanvaType(preset);
  if (canva) {
    if (plain) {
      const highlightH = Math.round(fontSize * canva.lineHeight);
      const lineGap = (is101xFoundersNews(preset) || isFiiNews(preset))
        ? Math.round(fontSize * 0.14)
        : 0;
      return { plain, highlightH, lineGap, lineAdvance: highlightH + lineGap };
    }
    const highlightH = Math.round(fontSize * NEWS_TICKER_HIGHLIGHT_HEIGHT);
    const lineGap = Math.max(0, Math.round(fontSize * canva.lineHeight) - highlightH);
    return { plain, highlightH, lineGap, lineAdvance: highlightH + lineGap };
  }
  const highlightH = Math.round(
    fontSize * (plain ? NEWS_TICKER_PLAIN_LINE_HEIGHT : NEWS_TICKER_HIGHLIGHT_HEIGHT),
  );
  const lineGap = isBizzindiaNews(preset)
    ? Math.round(fontSize * BIZZINDIA_NEWS_LINE_GAP)
    : isInterNewsTicker(preset)
      ? Math.round(fontSize * FOUNDERS_NEWS_LINE_GAP)
      : (plain ? 0 : Math.round(fontSize * NEWS_TICKER_LINE_GAP));
  return { plain, highlightH, lineGap, lineAdvance: highlightH + lineGap };
}

/** Line-height ratios to hand to fitNewsTickerFontSize so its budget matches the render. */
export function getNewsTickerFitRatios(preset) {
  const plain = newsTickerIsPlainStack(preset);
  const canva = getNewsTickerCanvaType(preset);
  if (canva) {
    if (plain) {
      const extraGap = (is101xFoundersNews(preset) || isFiiNews(preset)) ? 0.14 : 0;
      return { highlightHeightRatio: canva.lineHeight, lineGapRatio: extraGap };
    }
    return {
      highlightHeightRatio: NEWS_TICKER_HIGHLIGHT_HEIGHT,
      lineGapRatio: Math.max(0, canva.lineHeight - NEWS_TICKER_HIGHLIGHT_HEIGHT),
    };
  }
  return {
    highlightHeightRatio: plain ? NEWS_TICKER_PLAIN_LINE_HEIGHT : NEWS_TICKER_HIGHLIGHT_HEIGHT,
    lineGapRatio: isBizzindiaNews(preset)
      ? BIZZINDIA_NEWS_LINE_GAP
      : (isInterNewsTicker(preset) ? FOUNDERS_NEWS_LINE_GAP : (plain ? 0 : NEWS_TICKER_LINE_GAP)),
  };
}

export function getNewsTickerMaxLines(preset) {
  // Inter-news / Bizz / TCO wrap as many lines as the copy needs. The stack
  // lifts from the bottom so 5–6+ hook or body lines stay on the frame.
  if (isInterNewsTicker(preset) || isBizzindiaNews(preset) || isChangingOrderNews(preset) || isExtraBoldBoxNews(preset)) return 20;
  return 3;
}

/** Height left for the hook after reserving support/lockup and the bottom pad. */
export function getNewsTickerHookBudgetH(preset, canvasH, lockupBlockH = 0) {
  const minBottom = Math.round(canvasH * getNewsTickerBottomMarginRatio(preset));
  if (isInterNewsTicker(preset) || isExtraBoldBoxNews(preset)) {
    return Math.max(64, canvasH - minBottom - Math.max(0, lockupBlockH));
  }
  const ratio = isBizzindiaNews(preset) ? 0.36 : 0.28;
  return Math.round(canvasH * ratio) - lockupBlockH;
}

export function getNewsTickerBaseFontSize(preset) {
  const canva = getNewsTickerCanvaType(preset);
  if (canva) return canva.fontSize;
  if (isBizzindiaNews(preset)) return 46;
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
  if (Number.isFinite(pct)) return Math.max(0, Math.min(60, pct)) / 100;
  if (isExtraBoldBoxNews(preset)) return 0.08;
  if (isChangingOrderNews(preset)) return 0.055;
  if (isInterNewsTicker(preset)) return 0.08;
  return 0.10;
}

/** Height of the fade that sits on top of the solid black cover. */
export function getNewsTickerGradientHeight(preset, canvasH) {
  if (is101xFoundersNews(preset) || isIhnNews(preset)) {
    // Same sit-on-the-bar fade as IBC (~18% of frame above the solid).
    return Math.round(canvasH * 0.18);
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
    const defaultTop = Math.max(0, Math.round(canvasH * (1 - ratio)) - (shiftY || 0));
    // 101xf / IHN / IFC: when a long hook+body stack lifts off the 2-line pin, the
    // solid has to rise with it or the extra lines sit on the video / clip.
    if ((isInterNewsTicker(preset) || isExtraBoldBoxNews(preset)) && barY > 0 && fontSize > 0) {
      const twoLineH = getNewsTickerStackHeight(preset, fontSize, 2);
      const riseAboveBar = twoLineH + Math.round(fontSize * 0.35);
      return Math.max(0, Math.min(defaultTop, barY + riseAboveBar));
    }
    return defaultTop;
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
    // IBC: last line kisses the bar. 101xf/IHN type is smaller, so that kiss buries
    // the whole stack in the fade — sit the block just above the solid instead.
    const riseAboveBar = (is101xFoundersNews(preset) || isIhnNews(preset) || isExtraBoldBoxNews(preset))
      ? twoLineH + Math.round(fontSize * 0.35)
      : twoLineH - kissIntoSolid;
    let barY = blackTop - riseAboveBar;
    const minBottom = Math.round(canvasH * (
      (isInterNewsTicker(preset) || isExtraBoldBoxNews(preset)) ? getNewsTickerBottomMarginRatio(preset) : 0.04
    ));
    const stackBottom = barY + totalBarsH + lockupBlockH;
    if (stackBottom > canvasH - minBottom) {
      barY = canvasH - minBottom - lockupBlockH - totalBarsH - (shiftY || 0);
    }
    return Math.max(0, barY);
  }
  const bottomMargin = Math.round(canvasH * getNewsTickerBottomMarginRatio(preset));
  return canvasH - bottomMargin - lockupBlockH - totalBarsH - shiftY;
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
  if (isBizzindiaNews(preset)) {
    return IVYPRESTO_HEADLINE_THIN_FAMILY;
  }
  if (isExtraBoldBoxNews(preset)) {
    return INTER_EXTRABOLD_FAMILY;
  }
  if (isChangingOrderNews(preset)) {
    return INTER_BOLD_FAMILY;
  }
  if (isIhnNews(preset)) {
    return INTER_BOLD_FAMILY;
  }
  if (is101xFoundersNews(preset)) {
    // Inter-Regular.ttf is the 18pt optical cut — at headline size it reads as Thin.
    // Inter Medium is the Regular weight at this size.
    return INTER_MEDIUM_FAMILY;
  }
  if (isInterNewsTicker(preset)) {
    return INTER_REGULAR_FAMILY;
  }
  if (isPlainTextNewsTicker(preset)) {
    return HELVETICA_WORLD_BOLD_FAMILY;
  }
  return "'ITC Avant Garde Gothic', Inter, sans-serif";
}

/** Red rule under the Bizz India news hook (same colour as the highlight). */
export function getBizzindiaNewsRuleMetrics(fontSize, longestLineW = 280) {
  const gap = Math.round(fontSize * 0.45);
  // Even height so yuv420p chroma blocks don't smear a 3px line into maroon.
  const height = Math.max(4, Math.round(fontSize * 0.055 / 2) * 2);
  const width = Math.round(Math.max(140, Math.min(360, longestLineW * 0.52)) / 2) * 2;
  return { gap, height, width, reserve: gap + height };
}

export const PLAIN_TEXT_NEWS_LOCKUP_GAP = 36;

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
    // IFC2's 36px gap is the reference. FII shares the same lockup; ignore stale rules.gap (was 5).
    gap: Math.round(isPlainTextNewsTicker(preset) ? PLAIN_TEXT_NEWS_LOCKUP_GAP : (rule.gap ?? 5)),
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
 * measureWordAtSize(text, fontSize, bold) must use the same face as render.
 * `bold` is true for highlight tokens (e.g. IvyPresto SemiBold vs Thin).
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
  const targetFs = Math.max(minFs, Number(baseFontSize) || minFs);
  const maxFs = Math.max(minFs, Math.floor(targetFs));

  const layoutAt = (fontSize) => {
    const measure = (text, bold) => measureWordAtSize(text, fontSize, bold);
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
        w += measure(line[i].text, line[i].bold) + (i ? measure(' ', false) : 0);
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
    if (fits(targetFs, enforceMaxLines)) return targetFs;
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
  const scaled = Math.max(12, fontSize * (userScale || 1));
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

/**
 * A-roll hook letter spacing (thousandths of an em), Canva-measured per brand.
 * Line spacing for these same 7 presets is the existing `preset.lineSpacing`
 * field (already wired end to end) — just set to each preset's Canva value.
 */
export const AROLL_CANVA_TRACKING = {
  '101xfounders-aroll': -51,
  'indiastartupstory': -51,
  'founders-in-india': -51,
  'indian-founders-co': 0,
  'bizzindia': -51,
  'indianfoundercore': -51,
  'indiabusinesscom': -51,
  'thechangingorder': -51,
};

export function hasArollCanvaTracking(preset) {
  return Object.prototype.hasOwnProperty.call(AROLL_CANVA_TRACKING, (preset?.name || '').toLowerCase());
}

/**
 * Canva baseline tracking plus the operator's per-preset Letter Spacing slider
 * (letterSpacingOffset, additive, default 0 — same field the news formats use,
 * safe to share since a preset is never both news_ticker and hook_video).
 */
export function getArollTracking(preset) {
  const base = AROLL_CANVA_TRACKING[(preset?.name || '').toLowerCase()] ?? 0;
  const offset = Number.isFinite(Number(preset?.letterSpacingOffset)) ? Number(preset.letterSpacingOffset) : 0;
  return base + offset;
}

/** CSS `letter-spacing` in em, or null when this preset has no Canva A-roll tracking. */
export function getArollLetterSpacingEm(preset) {
  if (!hasArollCanvaTracking(preset)) return null;
  return getArollTracking(preset) / 1000;
}
