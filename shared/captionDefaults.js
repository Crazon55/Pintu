/**
 * Single source of truth for caption style defaults.
 *
 * The preview and the ASS burner used to keep their own copies of these, and 13 of them
 * disagreed — fontSize 37 vs 56, lineHeightMul 2.5 vs 0.78, maxLines 2 vs 1, and so on.
 * Any setting the editor did not explicitly send landed on a different value in the export,
 * so what you previewed was not what you got. Both sides now import from here: the editor
 * seeds its style object with these, and every generator merges incoming options over them.
 *
 * The preview is the reference. If a default changes it changes here, for both.
 */

export const CAPTION_DEFAULT_STYLE = {
  fontSize: 37,
  baseColor: '#EDEAE3',
  activeColor: '#FF7A00',
  baseFontName: 'Helvetica Now Text Bold',
  fontName: 'HelveticaNowText Bold',
  highlightFontName: 'EB Garamond Bold Italic',
  outlineColor: '#0A0A0A',
  // Styled captions lean on the glow, not a border. There is no outline control
  // in the editor, so this stays 0. Normal mode overrides it below.
  outline: 0,
  slantDeg: 0,
  popFromScale: 100,
  popToScale: 100,
  popDurationMs: 0,
  popSettleScale: 100,
  popSettleMs: 0,
  glow: true,
  baseGlowStrength: 469,
  baseInnerGlowStrength: 0,
  highlightGlowStrength: 354,
  highlightInnerGlowStrength: 100,
  glowBlur: 0,
  glowBorder: 35,
  innerGlowBlur: 3,
  highlightScale: 135, // 50px when base is 37
  highlightWeight: 0,
  letterSpacing: -2,
  reveal: 'accumulate',
  riseOn: 'word',
  riseY: 36,
  riseMs: 690,
  lingerAfterLast: 0.5,
  posX: 360,
  posY: 1020,
  lineStartX: 80,
  maxLines: 2,
  maxWordsPerBlock: 4,
  maxBlockDuration: 3.5,
  maxLineWidth: 600,
  // Gap between words as a fraction of font size. Back to a plain positive value: slots are
  // now measured from ink extents rather than advance width, so they already hug the glyphs
  // and no longer need a negative gap to cancel built-in padding.
  wordGapMul: 0.25,
  lineHeightMul: 2.5,
};

export const CAPTION_DEFAULT_NORMAL_STYLE = {
  ...CAPTION_DEFAULT_STYLE,
  fontSize: 42,
  baseColor: '#FFFFFF',
  activeColor: '#FFFFFF',
  baseFontName: 'Inter Bold',
  fontName: 'Inter 18pt',
  highlightFontName: 'Inter Bold',
  outlineColor: '#000000',
  outline: 3,
  glow: false,
  baseGlowStrength: 0,
  highlightGlowStrength: 0,
  highlightInnerGlowStrength: 0,
  glowBlur: 0,
  glowBorder: 0,
  highlightScale: 100,
  letterSpacing: 0,
  reveal: 'all',
  riseOn: 'block',
  riseY: 0,
  riseMs: 40,
  lingerAfterLast: 0.8,
  posY: 1100,
  maxLines: 2,
  maxWordsPerBlock: 6,
  wordGapMul: 0.18,
  lineHeightMul: 1.2,
};

/**
 * Basic (formerly The Bizz Playbook) — two words a line, one line at a time,
 * all-lowercase Helvetica Now Text Bold. Numbers are in the 720×1280 authoring
 * space the editor lays out in; the burn scales them to the clip's real pixels.
 * Emphasis starts white so it stays off until a word is marked.
 */
export const CAPTION_DEFAULT_BIZZ_STYLE = {
  ...CAPTION_DEFAULT_NORMAL_STYLE,
  fontSize: 45,
  baseColor: '#FFFFFF',
  activeColor: '#FFFFFF',
  baseFontName: 'Helvetica Now Text Bold',
  fontName: 'HelveticaNowText Bold',
  highlightFontName: 'Helvetica Now Text Bold',
  textCase: 'lower',
  outlineColor: '#000000',
  outline: 0.5,
  slantDeg: 0,
  // Drop shadow is its own thing here, not the ASS Shadow depth: the burn draws a second
  // blurred copy of the line underneath so the preview's blur/opacity actually survive.
  shadowColor: '#000000',
  shadowOpacity: 100,
  shadowOffsetX: 6,
  shadowOffsetY: 7,
  shadowBlur: 8,
  glow: false,
  letterSpacing: -2.5,
  lineHeightMul: 1.0,
  reveal: 'all',
  riseOn: 'block',
  riseY: 0,
  riseMs: 40,
  lingerAfterLast: 0.05,
  posX: 360,
  posY: 950,
  maxLines: 1,
  maxWordsPerBlock: 2,
  maxCharsPerBlock: 24,
  maxBlockDuration: 2.5,
  wordGapMul: 0.18,
};

/**
 * "Bizz India" — the caption look the Bizz India page cuts with.
 *
 * Same two-word cards, but shouted rather than spoken: uppercase heavy grotesque, smaller
 * at 32, sitting a little higher at 56% of frame, no tracking, and carried by a red glow
 * instead of a drop shadow. Stroke and shadow are both off — the glow is the whole effect.
 *
 * The face is THE BOLD FONT (free version): 121 glyphs, Latin and basic punctuation only.
 * Anything outside that — rupee signs, curly quotes, Devanagari — has no glyph to draw.
 */
export const CAPTION_DEFAULT_BIZZ_INDIA_STYLE = {
  ...CAPTION_DEFAULT_BIZZ_STYLE,
  fontSize: 34,
  baseFontName: 'The Bold Font',
  fontName: 'THE BOLD FONT FREE VERSION',
  highlightFontName: 'The Bold Font',
  textCase: 'upper',
  letterSpacing: 0,
  lineHeightMul: 1.0,
  posY: 970, // 76% of 1280
  baseColor: '#FFFFFF',
  activeColor: '#FFFFFF',
  outline: 0,
  // Drop shadow off: zero offsets AND zero opacity, so neither the preview nor the burn
  // draws the extra layer.
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  shadowOpacity: 0,
  // The glow is what separates white text from a bright frame here.
  glow: true,
  glowColor: '#FF0000',
  glowBlur: 18,
  glowBorder: 4,
  baseGlowStrength: 100,
};

/**
 * "Podcast Red" — the two-tier look from the reference clip.
 *
 * A red first line in a heavy oblique, with every wrapped continuation line under it in
 * smaller white. Words appear one at a time in place and fade up; nothing rises or pops.
 *
 * The two tiers reuse the styled look's base/highlight pair rather than adding a third set
 * of keys, with `roleBy: 'line'` re-pointing the highlight slot at the continuation lines:
 *   base      = line 1  → red, full size, red glow
 *   highlight = line 2+ → white, 43% size, no glow
 * So "Font size" still means the size of the loud line, which is the one people tune.
 *
 * The slant is synthetic — THE BOLD FONT ships upright only, so obliqueDeg shears it in
 * both the preview and the burn. Drop in a real oblique face and this can go to 0.
 */
export const CAPTION_DEFAULT_PODCAST_RED_STYLE = {
  ...CAPTION_DEFAULT_STYLE,
  roleBy: 'line',
  obliqueDeg: 12,
  textCase: 'upper',
  // Caption lines: red / white at 51% / gap 137%.
  //
  // Sizes are the two lines as drawn: 35 for the red top line, 16 for the white second
  // line (that is what highlightScale 46 works out to), 200% gap between them.
  fontSize: 35,
  baseFontName: 'Anton',
  fontName: 'Anton',
  highlightFontName: 'Anton',
  // 16px when the top line is 35.
  highlightScale: 46,
  baseColor: '#FF0000',
  activeColor: '#FFFFFF',
  outlineColor: '#000000',
  outline: 0,
  // White rim on top-left of red glyphs (stable duplicate layer — not text-shadow).
  baseEdgeHighlight: 3,
  edgeHighlightColor: '#FFFFFF',
  letterSpacing: 0,
  lineHeightMul: 2.0,
  // Red bloom on both lines: loud red on line 1, white text on line 2 still sits in the same red halo.
  glow: true,
  glowColor: '#FF0000',
  baseGlowStrength: 366,
  baseInnerGlowStrength: 500,
  highlightGlowStrength: 466,
  highlightInnerGlowStrength: 500,
  glowBlur: 23,
  glowBorder: 1,
  innerGlowBlur: 12,
  // Pure fade-in — no opposing pop (a 118→100 settle fights the continuous card zoom).
  popFromScale: 100,
  popToScale: 100,
  popSettleScale: 100,
  popDurationMs: 0,
  popSettleMs: 0,
  // Whole card grows the entire time it is on screen (GIF): starts at rest, eases out to ~148%.
  // exitMs only controls the fade at the end — the zoom itself spans block.start → block.end.
  exitFromScale: 100,
  exitMs: 320,
  exitScale: 148,
  exitAccel: 1.35,
  driftPerSec: 0,
  driftMax: 0,
  reveal: 'accumulate',
  riseOn: 'word',
  riseY: 0,
  riseMs: 300,
  lingerAfterLast: 0,
  posX: 360,
  posY: 500,
  maxLines: 2,
  // Line 2 cannot wrap again (maxLines 2), so an over-long card runs off both edges —
  // visible as clipped words. These caps bound a card to what two lines can hold.
  maxWordsPerBlock: 5,
  maxCharsPerBlock: 28,
  maxBlockDuration: 2.6,
  maxLineWidth: 520,
  // A sheared word leans its top ~tan(12deg) x cap-height to the right — about 11 units
  // here — which eats an ordinary gap and makes neighbouring words touch at the top even
  // though their boxes never overlap. The extra tracking pays that back.
  wordGapMul: 0.45,
  shadowOpacity: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
};

/**
 * Report which keys the caller did NOT supply, i.e. which settings the export is filling in
 * rather than taking from the editor. Used to log parity drift on every burn — if this is
 * ever non-empty, the preview is showing something the export is not being told about.
 */
export function missingStyleKeys(options = {}, defaults = CAPTION_DEFAULT_STYLE) {
  return Object.keys(defaults).filter(
    (k) => options[k] === undefined || options[k] === null,
  );
}
