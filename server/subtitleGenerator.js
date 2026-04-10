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
    marginV = 10,
    alignment = 5, // 5 = middle-center, 2 = bottom-center
    posX = null,    // exact X position (null = use alignment)
    posY = null,    // exact Y position (null = use alignment)
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
    // Use \pos(x,y) override for exact positioning when posX/posY are set
    const posOverride = (posX !== null && posY !== null) ? `{\\pos(${posX},${posY})}` : '';
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${posOverride}${text}`;
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
    maxWordsPerPhrase = 7,
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
Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF,${outlineColor},&H80000000,-1,0,0,0,100,100,0,0,1,${outline},${shadow},5,40,40,10,1
Style: Highlight,${fontName},${Math.round(fontSize * 1.15)},${highlightColor},&H000000FF,${outlineColor},&H80000000,-1,-1,0,0,100,100,0,0,1,${outline},${shadow},5,40,40,10,1

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
    if (current.length >= maxWordsPerPhrase || duration >= 3.0 || PUNCT.test(w.text)) {
      phrases.push([...current]);
      current = [];
    }
  }
  if (current.length > 0) phrases.push(current);

  // Step 2: For each phrase, generate accumulating word events
  const dialogues = [];
  for (const phrase of phrases) {
    if (phrase.length === 0) continue;
    const phraseEnd = phrase[phrase.length - 1].end;

    // Each word event: shows from its start time to the phrase end
    // Text = all words up to and including this word (accumulating)
    for (let wi = 0; wi < phrase.length; wi++) {
      const word = phrase[wi];
      const wordStart = toASSTime(word.start);
      // This word's display ends when the NEXT word starts (replaced by next accumulation)
      // Last word in phrase stays until phrase ends
      const wordEnd = (wi < phrase.length - 1)
        ? toASSTime(phrase[wi + 1].start)
        : toASSTime(phraseEnd + 0.15); // slight linger

      // Build accumulated text: all words from 0..wi
      const accText = phrase.slice(0, wi + 1).map(w => {
        const escaped = w.text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
        if (w.highlight) {
          return `{\\rHighlight}${escaped}{\\rDefault}`;
        }
        return escaped;
      }).join(' ');

      const posOverride = `{\\pos(${posX},${posY})}`;
      dialogues.push(`Dialogue: 0,${wordStart},${wordEnd},Default,,0,0,0,,${posOverride}${accText}`);
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
