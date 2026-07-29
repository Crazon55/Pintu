/**
 * Generate ASS (Advanced SubStation Alpha) subtitle file from transcript segments.
 * ASS supports bold, outline, shadow, positioning — perfect for reel-style subtitles.
 */

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
export function buildCaptionSpec(words, options = {}) {
  const {
    fontName = 'Montserrat ExtraBold',
    fontSize = 58,
    baseColor = '#FFFFFF',
    activeColor = '#FF0000',
    outlineColor = '#000000',
    slantDeg = -6,
    popFromScale = 85,
    popToScale = 110,
    popDurationMs = 70,
    resX = 720,
    resY = 1280,
  } = options;

  const blocks = buildCaptionBlocks(words, options);

  return {
    meta: {
      resX, resY, fontName, fontSize,
      baseColor, activeColor, outlineColor,
      slantDeg, popFromScale, popToScale, popDurationMs,
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
 * Word-level highlight captions: the whole block stays on screen in white and
 * exactly one word is highlighted at a time, with a scale pop and a soft glow.
 *
 * Emits one Dialogue event per active-word state (rather than \k karaoke, which
 * colours words cumulatively). Each state is drawn twice: a blurred copy on
 * layer 0 for the glow, and the crisp text on layer 1. Inactive words on the
 * glow layer are fully transparent so they still occupy their advance width,
 * which keeps the glow aligned with the word above it.
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
    slantDeg = -6,        // negative tilts clockwise; spec calls for -5 to -8
    popFromScale = 85,
    popToScale = 110,
    popDurationMs = 70,
    popSettleScale = null, // null holds at popToScale
    glow = true,
    glowBlur = 11,
    glowBorder = 7,
    glowColor = null,      // defaults to activeColor
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

  // Scale pop: start small, snap up, optionally settle back.
  const popTags = () => {
    let t = `\\fscx${popFromScale}\\fscy${popFromScale}` +
            `\\t(0,${popDurationMs},\\fscx${popToScale}\\fscy${popToScale})`;
    if (Number.isFinite(popSettleScale)) {
      t += `\\t(${popDurationMs},${popDurationMs * 2},\\fscx${popSettleScale}\\fscy${popSettleScale})`;
    }
    return t;
  };

  const blocks = buildCaptionBlocks(words, options);
  const dialogues = [];

  for (const block of blocks) {
    const ws = block.words;
    for (let j = 0; j < ws.length; j++) {
      const evStart = ws[j].start;
      const evEnd = (j + 1 < ws.length) ? ws[j + 1].start : block.end;
      if (evEnd <= evStart) continue;

      const prefix = `{\\pos(${posX},${posY})\\frz${frz}}`;

      let textLayer = prefix;
      let glowLayer = prefix;

      for (let k = 0; k < ws.length; k++) {
        const token = ASS_ESCAPE(ws[k].text);
        const isActive = k === j;

        if (isActive) {
          textLayer += `{\\c${active}\\3c${outlineC}\\bord${outline}\\blur0${popTags()}}${token}`;
          glowLayer += `{\\alpha&H00&\\c${glowC}\\3c${glowC}\\bord${glowBorder}\\blur${glowBlur}${popTags()}}${token}`;
        } else {
          textLayer += `{\\c${base}\\3c${outlineC}\\bord${outline}\\blur0\\fscx100\\fscy100}${token}`;
          // transparent, but still occupies width so the glow stays aligned
          glowLayer += `{\\alpha&HFF&\\bord0\\blur0\\fscx100\\fscy100}${token}`;
        }

        if (k < ws.length - 1) { textLayer += ' '; glowLayer += ' '; }
      }

      const start = toASSTime(evStart);
      const end = toASSTime(evEnd);
      if (glow) dialogues.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${glowLayer}`);
      dialogues.push(`Dialogue: 1,${start},${end},Default,,0,0,0,,${textLayer}`);
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
