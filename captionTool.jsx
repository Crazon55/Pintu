/**
 * The Captions section of the playbook editor.
 *
 * Sits directly under the video drop zone: pick a language, transcribe, glance at the
 * words, then burn them into the clip. The burn replaces the editor's source video with
 * the captioned A-roll, so everything downstream — preset previews, hook layout, export —
 * carries the captions without knowing anything about them.
 *
 * Burning into the A-roll rather than the finished frame is deliberate: it means captions
 * ride along with whatever crop/scale a preset applies to the video, and it needs no
 * changes to the export pipeline. The trade-off is that a preset which shrinks the clip
 * shrinks the captions with it — the in-panel preview shows the A-roll, which is exactly
 * what gets burned.
 *
 * Grouping, timing and style defaults come from shared/captionEngine.js, the same module
 * the standalone /transcribe page runs on, so a clip captioned here and a clip captioned
 * there come out identical.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Wand2, Check, RotateCcw } from 'lucide-react';
import { findCaptionFont, fontsForRole } from './captionFonts.js';
import {
  PLAY_RES_X,
  PLAY_RES_Y,
  MODE_DEFAULTS,
  MODE_LABELS,
  CAPTION_STYLE_BY_MODE,
  round3,
  blockToPreviewLineWords,
  stampAutoSentenceBreaks,
  wordsToSentences,
  buildPreviewBlocks,
  normalizeStyle,
  captionTextShadow,
  layoutPreviewWords,
  measurePreviewWidth,
  usesHighlightSlot,
  hexToRgba,
  riseTravelAt,
  popScaleAt,
  riseOffsetAt,
  riseOpacityAt,
  cardExitMotion,
  outerGlowFactors,
} from './shared/captionEngine.js';

/* ------------------------------------------------------------------ overlay */

/**
 * The caption as it will be burned. Same line-and-word structure the standalone editor
 * draws, scaled to whatever box it is handed.
 */
export function CaptionLineOverlay({ block, style, scale }) {
  if (!block || !(scale > 0)) return null;
  const meta = findCaptionFont(style.baseFontName || style.fontName);
  const fs = style.fontSize * scale;
  const stroke = Math.max(0, (style.outline ?? 0) * scale);
  const shadow = captionTextShadow(style, scale);
  const textCase = style.textCase === 'lower'
    ? 'lowercase'
    : style.textCase === 'upper' ? 'uppercase' : 'none';

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: `${(style.posY / PLAY_RES_Y) * 100}%`,
          transform: 'translate(-50%, -50%)',
          width: '86%',
          textAlign: 'center',
        }}
      >
        {blockToPreviewLineWords(block.words).map((line, i) => (
          <div
            key={`line-${i}-${line[0]?.id || line[0]?.text || ''}`}
            style={{
              // Inter sits second on purpose: it is the same face the burn substitutes for
              // characters the caption font has no glyph for, so a stray ₹ or é previews
              // as what will actually be rendered rather than the browser's default sans.
              fontFamily: `"${meta?.cssFamily || 'Helvetica Now Text Bold'}", "Inter Bold Caption", "Segoe UI Emoji", sans-serif`,
              fontWeight: meta?.weight || 700,
              fontStyle: meta?.style || 'normal',
              fontSize: `${fs}px`,
              lineHeight: style.lineHeightMul || 1,
              letterSpacing: `${(style.letterSpacing || 0) * scale}px`,
              color: style.baseColor || '#FFFFFF',
              textTransform: textCase,
              WebkitTextStrokeWidth: stroke > 0 ? `${stroke}px` : undefined,
              WebkitTextStrokeColor: stroke > 0 ? (style.outlineColor || '#000') : undefined,
              paintOrder: stroke > 0 ? 'stroke fill' : undefined,
              textShadow: shadow,
              whiteSpace: 'pre-wrap',
            }}
          >
            {line.map((w, wi) => {
              const isHi = usesHighlightSlot(style, w, i);
              const hiScale = (style.highlightScale ?? 125) / 100;
              const hiMeta = findCaptionFont(style.highlightFontName);
              const wordMeta = isHi ? hiMeta : meta;
              return (
                <span
                  key={w.id || `${i}-${wi}`}
                  style={{
                    color: isHi ? (style.activeColor || style.baseColor || '#FFFFFF') : undefined,
                    fontFamily: isHi
                      ? `"${hiMeta?.cssFamily || meta?.cssFamily || 'Helvetica Now Text Bold'}", "Inter Bold Caption", "Segoe UI Emoji", sans-serif`
                      : undefined,
                    fontWeight: wordMeta?.weight || (isHi ? 700 : meta?.weight || 700),
                    fontStyle: wordMeta?.style || 'normal',
                    fontSize: isHi ? `${fs * hiScale}px` : undefined,
                  }}
                >
                  {wi > 0 ? ' ' : ''}{w.text}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Word-by-word animated overlay — Flow and Podcast Red. Each word fades in (and optionally
 * rises / pops) at its audio time; the card drifts outward and recedes on exit.
 */
export function CaptionWordOverlay({ block, style, scale, time = 0 }) {
  if (!block || !(scale > 0)) return null;
  const sStyle = normalizeStyle(style);
  const layoutWords = layoutPreviewWords(block.words, sStyle).map((pos, i) => ({
    ...block.words[i],
    x: pos.x,
    y: pos.y,
    line: pos.line,
  }));
  const xs = layoutWords.map((w) => (Number.isFinite(w.x) ? w.x : sStyle.posX));
  const ys = layoutWords.map((w) => (Number.isFinite(w.y) ? w.y : sStyle.posY));
  const driftCentre = layoutWords.length
    ? { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
    : { x: PLAY_RES_X / 2, y: sStyle.posY };
  const { scale: cardScale, fade: exitFade } = cardExitMotion(time, block, sStyle);
  // Clip only at rest — once the continuous zoom starts, the card may bleed past the frame.
  const reading = cardScale <= 1.02;

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${reading ? 'overflow-hidden' : ''}`}
      style={{
        transform: `scale(${cardScale})`,
        transformOrigin: `${(driftCentre.x / PLAY_RES_X) * 100}% ${(driftCentre.y / PLAY_RES_Y) * 100}%`,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      {layoutWords.map((w, i) => {
        const spoken = sStyle.reveal === 'all' || time >= w.activeFrom;
        const rises = sStyle.riseOn === 'word' || (sStyle.riseOn === 'block' && i === 0);
        const travel = spoken ? riseTravelAt(time, w, sStyle) : 1;
        const isRising = rises && spoken && sStyle.riseY > 0 && travel < 1;
        const isHi = usesHighlightSlot(sStyle, w, w.line);
        const dy = isRising ? riseOffsetAt(time, w, sStyle) * scale : 0;
        const popPct = (sStyle.riseY > 0 || !sStyle.popDurationMs)
          ? 100
          : popScaleAt(time, w, sStyle);
        const fadeIn = sStyle.riseY > 0
          ? 1
          : Math.min(1, Math.max(0, ((time - w.activeFrom) * 1000) / Math.max(1, sStyle.riseMs * 0.7)));
        const opacity = (!spoken
          ? 0
          : (isRising ? riseOpacityAt(time, w, sStyle, true) : fadeIn)) * (1 - exitFade);
        const color = isHi ? sStyle.activeColor : sStyle.baseColor;
        const restX = Number.isFinite(w.x) ? w.x : sStyle.posX;
        const restY = Number.isFinite(w.y) ? w.y : sStyle.posY;
        const x = restX;
        const y = restY;
        const hiScale = (sStyle.highlightScale ?? 125) / 100;
        const fs = sStyle.fontSize * scale * (isHi ? hiScale : 1);
        const stroke = isHi ? 0 : Math.max(0, (sStyle.outline ?? 1) * scale);
        const glowPx = (sStyle.glowBlur ?? 12) * scale;
        const glowThick = (sStyle.glowBorder ?? 7) * scale;
        const outerGlow = outerGlowFactors(
          isHi ? sStyle.highlightGlowStrength : sStyle.baseGlowStrength,
          isHi,
        );
        // Inner core: highlight words use highlightInnerGlowStrength; the loud base line
        // (Podcast Red's red tier) uses baseInnerGlowStrength so red can carry both blooms.
        const innerMul = Math.max(0, (
          isHi
            ? (sStyle.highlightInnerGlowStrength ?? 0)
            : (sStyle.baseInnerGlowStrength ?? 0)
        ) / 100);
        const innerAmt = Math.min(1, innerMul * 0.7);
        const innerBlur = Math.max(0, (sStyle.innerGlowBlur ?? 3) * scale * Math.max(1, innerMul));
        const shadowParts = [];
        if (opacity > 0.05) {
          const k = Math.max(0.6, 1.1 * scale);
          shadowParts.push(`0 ${k}px ${k * 1.8}px rgba(0,0,0,0.45)`);
        }
        if (sStyle.glow && opacity > 0.05 && outerGlow.mul > 0.01) {
          const glowFill = sStyle.glowColor || (isHi ? sStyle.activeColor : color);
          const r = Math.max(2, (glowPx + glowThick * 0.4) * outerGlow.sizeMul);
          const a = outerGlow.alpha;
          shadowParts.push(
            `0 0 ${Math.max(1, r * 0.4)}px ${hexToRgba(glowFill, Math.min(1, a))}`,
            `0 0 ${Math.max(3, r * 0.9)}px ${hexToRgba(glowFill, a * 0.7)}`,
            `0 0 ${Math.max(6, r * 1.6)}px ${hexToRgba(glowFill, a * 0.32)}`,
          );
        }
        if (sStyle.glow && opacity > 0.05 && innerAmt > 0.01) {
          // White continuation line: inner core stays white so glyphs don't pick up red.
          const glowFill = isHi
            ? (sStyle.activeColor || '#FFFFFF')
            : (sStyle.glowColor || color);
          const ib = Math.max(1, innerBlur);
          shadowParts.push(
            `0 0 ${Math.max(1, ib * 0.45)}px ${hexToRgba(glowFill, Math.min(1, innerAmt))}`,
            `0 0 ${Math.max(2, ib * 0.95)}px ${hexToRgba(glowFill, innerAmt * 0.5)}`,
          );
        }
        // White edge is a duplicate glyph layer (below), not text-shadow — shadows
        // re-rasterize every frame of the card zoom and flicker between letters.
        const shadow = shadowParts.length ? shadowParts.join(', ') : 'none';
        const edgePx = (!isHi && sStyle.roleBy === 'line')
          ? Math.max(0, Number(sStyle.baseEdgeHighlight) || 0) * scale
          : 0;
        const edgeColor = sStyle.edgeHighlightColor || '#FFFFFF';
        const hiMeta = findCaptionFont(sStyle.highlightFontName);
        const baseMeta = findCaptionFont(sStyle.baseFontName || sStyle.fontName);
        const fontMeta = isHi ? hiMeta : baseMeta;
        const wordTransform = `translate(-50%, -50%) rotate(${-sStyle.slantDeg}deg)`
          + ` skewX(${-(sStyle.obliqueDeg || 0)}deg) translateY(${dy}px)`
          + ` scale(${popPct / 100})`;
        return (
          <span
            key={`${w.id || w.start}-${w.text}-${i}`}
            style={{
              position: 'absolute',
              left: `${(x / PLAY_RES_X) * 100}%`,
              top: `${(y / PLAY_RES_Y) * 100}%`,
              display: 'inline-block',
              opacity,
              transform: wordTransform,
              // One compositor layer for the whole word so edge + fill zoom together.
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              fontFamily: `"${fontMeta?.cssFamily || (isHi ? 'Playfair Display Bold Italic' : 'Montserrat Black')}", "Segoe UI Emoji", "Apple Color Emoji", "Twemoji Mozilla", sans-serif`,
              fontWeight: fontMeta?.weight || (isHi ? 700 : 900),
              fontStyle: fontMeta?.style || (isHi ? 'italic' : 'normal'),
              fontSize: `${fs}px`,
              letterSpacing: `${(sStyle.letterSpacing || 0) * scale}px`,
              textTransform: sStyle.textCase === 'lower'
                ? 'lowercase'
                : sStyle.textCase === 'upper' ? 'uppercase' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {edgePx > 0 && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  // Integer px offset — fractional shadows were the flicker source.
                  transform: `translate(${-Math.round(edgePx * 0.35)}px, ${-Math.round(edgePx * 0.22)}px)`,
                  color: edgeColor,
                  textShadow: 'none',
                  WebkitTextStroke: 'none',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {w.text}
              </span>
            )}
            <span
              style={{
                position: 'relative',
                color,
                WebkitTextStrokeWidth: stroke > 0 ? `${stroke}px` : undefined,
                WebkitTextStrokeColor: stroke > 0 ? (sStyle.outlineColor || '#000') : undefined,
                paintOrder: stroke > 0 ? 'stroke fill' : undefined,
                textShadow: shadow,
              }}
            >
              {w.text}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ controls */

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-[var(--pintu-text-muted)]">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-[var(--pintu-text-faint)]">{hint}</span>}
    </label>
  );
}

function Slider({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[var(--pintu-text-muted)]">{label}</span>
        <span className="text-[10px] tabular-nums text-violet-300 bg-violet-500/10 rounded px-1.5 py-0.5">
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-violet-500"
      />
    </div>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-[var(--pintu-text-muted)] flex-1">{label}</span>
      <input
        type="color"
        value={value || '#FFFFFF'}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="w-7 h-7 rounded border border-[var(--pintu-input-border)] bg-transparent cursor-pointer"
      />
      <input
        value={value || '#FFFFFF'}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="w-20 bg-[var(--pintu-card-header-bg)] border border-[var(--pintu-input-border)] rounded px-1.5 py-1
                   text-[11px] font-mono text-[var(--pintu-text-secondary)] focus:outline-none focus:border-violet-500"
      />
    </div>
  );
}

function Section({ title, open, onToggle, children }) {
  return (
    <div className="rounded-lg border border-[var(--pintu-card-header-border)] bg-[var(--pintu-card-header-bg)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase
                   tracking-wider text-[var(--pintu-text-secondary)] hover:text-[var(--pintu-text-primary)]"
      >
        {title}
        <span className="text-[var(--pintu-text-faint)]">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-3 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ section */

const LANGUAGES = [
  { key: 'hinglish', label: 'Hinglish' },
  { key: 'en', label: 'English' },
];

/**
 * @param {string|null} videoSrc      current editor source (blob url)
 * @param {object} videoFileRef       ref holding the File the export uploads
 * @param {string} serverUrl          API origin
 * @param {(file: File) => void} onCaptionedVideo  hand back the burned clip
 */
export default function CaptionsSection({
  videoSrc, videoFileRef, serverUrl, onCaptionedVideo, onCaptionsChange,
}) {
  const [language, setLanguage] = useState('hinglish');
  const [phase, setPhase] = useState('idle'); // idle | transcribing | burning
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [words, setWords] = useState([]);
  const [serverVideoPath, setServerVideoPath] = useState(null);
  // Which caption look this cut uses. Both burn through the same generator — the preset
  // only decides the starting values, and any slider moved afterwards stays moved.
  const [look, setLook] = useState('bizz');
  const [style, setStyle] = useState(MODE_DEFAULTS.bizz);
  const [burned, setBurned] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const [editing, setEditing] = useState(null);

  // The clip captions are cut from. A re-burn always goes back to this, never to the
  // already-captioned result — otherwise a second pass would stack two sets of captions.
  const sourceFileRef = useRef(null);
  // Burning swaps the editor's video, which lands back here as a videoSrc change. That is
  // our own doing, not a new upload, so it must not wipe the transcript we just used.
  const selfChangeRef = useRef(false);

  const busy = phase !== 'idle';
  const sStyle = useMemo(() => normalizeStyle(style), [style]);
  const setS = (patch) => setStyle((prev) => normalizeStyle({ ...prev, ...patch }));

  // Podcast Red's line sizes live under Caption style — open it so the bottom-line control is visible.
  useEffect(() => {
    if (look === 'podcastred') setOpenSection('style');
  }, [look]);

  // A new clip invalidates the transcript — it belongs to the old audio.
  useEffect(() => {
    if (selfChangeRef.current) { selfChangeRef.current = false; return; }
    setWords([]); setServerVideoPath(null); setBurned(false); setError(null);
    setPhase('idle'); setProgress(null);
    sourceFileRef.current = null;
  }, [videoSrc]);

  // Mirror the transcript and style up so the preset cards can draw the same captions.
  // `burned` tells the parent to stop drawing them: at that point they are in the pixels.
  useEffect(() => {
    if (!onCaptionsChange) return;
    onCaptionsChange(words.length ? { words, style: sStyle, burned } : null);
  }, [words, sStyle, burned, onCaptionsChange]);

  const blocks = useMemo(
    () => buildPreviewBlocks(words, { ...sStyle, manualGrouping: true }),
    [words, sStyle],
  );
  const sentences = useMemo(() => wordsToSentences(words), [words]);

  const transcribe = useCallback(async () => {
    const file = sourceFileRef.current || videoFileRef?.current;
    if (!file) { setError('Upload a video first.'); return; }
    if (sourceFileRef.current !== file) {
      sourceFileRef.current = file;
    }
    setPhase('transcribing'); setError(null); setProgress({ step: 'uploading', percent: 5 });
    try {
      const fd = new FormData();
      fd.append('video', file);
      fd.append('language', language);
      const res = await fetch(`${serverUrl}/api/transcribe`, { method: 'POST', body: fd });
      const started = await res.json();
      if (!res.ok) throw new Error(started.error || 'Transcription request failed');

      for (;;) {
        await new Promise((r) => setTimeout(r, 1200));
        const jr = await fetch(`${serverUrl}/api/job/${started.jobId}`);
        const job = await jr.json();
        if (job.progress) setProgress(job.progress);
        if (job.state === 'completed') {
          const rv = job.returnvalue || {};
          setWords(stampAutoSentenceBreaks((rv.words || []).map((w, i) => ({
            text: w.text,
            start: w.start,
            end: w.end,
            highlight: !!w.highlight,
            id: `w-${round3(w.start)}-${i}`,
          })), normalizeStyle(style)));
          setServerVideoPath(rv.videoPath || null);
          setPhase('idle'); setProgress(null);
          return;
        }
        if (job.state === 'failed' || job.state === 'cancelled') {
          throw new Error(job.failedReason || 'Transcription failed');
        }
      }
    } catch (e) {
      setError(e.message);
      setPhase('idle'); setProgress(null);
    }
  }, [language, serverUrl, style, videoFileRef]);

  const burn = useCallback(async () => {
    if (!serverVideoPath || !words.length) return;
    setPhase('burning'); setError(null);
    try {
      const styleN = normalizeStyle(style);
      const lookDefaults = MODE_DEFAULTS[look] || MODE_DEFAULTS.bizz;
      const burnStyle = { ...lookDefaults, ...styleN, manualGrouping: true };
      const hiScaleN = Math.max(0.2, (burnStyle.highlightScale ?? 125) / 100);
      const previewBlocks = buildPreviewBlocks(words, burnStyle).map((b) => {
        const pos = layoutPreviewWords(b.words, burnStyle);
        return {
          ...b,
          words: b.words.map((w, i) => {
            const line = pos[i]?.line ?? 0;
            const isHi = usesHighlightSlot(burnStyle, w, line);
            return {
              ...w,
              x: pos[i]?.x,
              y: pos[i]?.y,
              line,
              w: measurePreviewWidth(w.text, burnStyle.fontSize, isHi, hiScaleN, burnStyle),
            };
          }),
        };
      });
      const res = await fetch(`${serverUrl}/api/burn-subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: serverVideoPath,
          words,
          previewBlocks,
          style: burnStyle,
          // Prefer roleBy on the style for routing; keep token for older servers too.
          captionStyle: burnStyle.roleBy === 'line'
            ? 'word-highlight'
            : (CAPTION_STYLE_BY_MODE[look] || 'bizz-playbook'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Burn failed');

      // Pull the captioned clip back into the editor as a File so the export path — which
      // uploads a File — needs no changes at all.
      const mp4 = await fetch(`${serverUrl}${data.downloadUrl}`);
      if (!mp4.ok) throw new Error('Captioned video could not be downloaded.');
      const blob = await mp4.blob();
      const base = (sourceFileRef.current?.name || 'video.mp4').replace(/\.[^.]+$/, '');
      selfChangeRef.current = true;
      onCaptionedVideo(new File([blob], `${base}-captioned.mp4`, { type: 'video/mp4' }));
      setBurned(true);
      setPhase('idle');
    } catch (e) {
      setError(e.message);
      setPhase('idle');
    }
  }, [serverVideoPath, words, style, serverUrl, onCaptionedVideo, look]);

  const restoreOriginal = useCallback(() => {
    const original = sourceFileRef.current;
    if (!original) return;
    selfChangeRef.current = true;
    onCaptionedVideo(original);
    setBurned(false);
  }, [onCaptionedVideo]);

  const toggleEmphasis = (id) => setWords((prev) => prev.map((w) => (
    w.id === id ? { ...w, highlight: !w.highlight } : w
  )));
  const updateWord = (id, text) => setWords((prev) => prev.map((w) => (
    w.id === id ? { ...w, text } : w
  )));
  const regroup = () => setWords((prev) => stampAutoSentenceBreaks(prev, sStyle));

  if (!videoSrc) return null;

  return (
    <div className="space-y-3 rounded-lg border border-[var(--pintu-card-border)] bg-[var(--pintu-card-bg)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--pintu-text-primary)]">Captions</span>
        {burned && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <Check className="w-3 h-3" /> burned in
          </span>
        )}
      </div>

      {/* which look this cut uses — defaults per preset, tweakable after */}
      <div className="flex flex-wrap bg-[var(--pintu-toggle-bg)] rounded-md p-0.5 border border-[var(--pintu-toggle-border)]">
        {['bizz', 'bizzindia', 'podcastred'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setLook(m); setStyle(MODE_DEFAULTS[m]); }}
            disabled={busy}
            className={`flex-1 px-2 py-1 text-[11px] rounded transition-all disabled:opacity-40 ${
              look === m
                ? 'bg-violet-500 text-white font-semibold'
                : 'text-[var(--pintu-text-muted)] hover:text-[var(--pintu-text-secondary)]'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* language + transcribe */}
      <div className="flex items-center gap-2">
        <div className="flex bg-[var(--pintu-toggle-bg)] rounded-md p-0.5 border border-[var(--pintu-toggle-border)]">
          {LANGUAGES.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLanguage(l.key)}
              disabled={busy}
              className={`px-2.5 py-1 text-[11px] rounded transition-all disabled:opacity-40 ${
                language === l.key
                  ? 'bg-violet-500 text-white font-semibold'
                  : 'text-[var(--pintu-text-muted)] hover:text-[var(--pintu-text-secondary)]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={transcribe}
          disabled={busy}
          className="flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-[11px]
                     font-semibold rounded-md px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
        >
          {phase === 'transcribing'
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Wand2 className="w-3.5 h-3.5" />}
          {phase === 'transcribing' ? 'Transcribing…' : words.length ? 'Re-transcribe' : 'Transcribe'}
        </button>
        {progress && (
          <span className="text-[10px] text-[var(--pintu-text-faint)]">
            {progress.step} {progress.percent ? `${progress.percent}%` : ''}
          </span>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-300 bg-red-950/40 border border-red-900/60 rounded px-2 py-1.5">
          {error}
        </p>
      )}

      {words.length > 0 && (
        <>
          {/* Live preview lives on the A-roll player under Captions (play + scrub with sound).
              Preset cards on the right mirror the same timing. */}
          <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-400">
                  {words.length} words · {blocks.length} cards
                </span>
                <button
                  type="button"
                  onClick={regroup}
                  className="text-[10px] text-[var(--pintu-text-faint)] hover:text-[var(--pintu-text-secondary)]"
                >
                  Re-group
                </button>
              </div>
              <div className="max-h-[190px] overflow-y-auto pintu-scroll pr-1 space-y-1.5">
                {sentences.map((sent, si) => (
                  <div key={`s-${si}-${sent[0]?.id || si}`} className="flex flex-wrap gap-1">
                    {sent.map((w) => (editing === w.id ? (
                      <input
                        key={w.id}
                        autoFocus
                        defaultValue={w.text}
                        onBlur={(e) => { updateWord(w.id, e.target.value.trim() || w.text); setEditing(null); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') setEditing(null);
                        }}
                        className="bg-neutral-800 border border-violet-500 rounded px-1 py-0.5 text-[11px] w-20
                                   text-white focus:outline-none"
                      />
                    ) : (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleEmphasis(w.id)}
                        onDoubleClick={() => setEditing(w.id)}
                        title="Click to emphasise · double-click to edit"
                        className={`rounded px-1 py-0.5 text-[11px] transition-colors ${
                          w.highlight
                            ? 'bg-violet-500/25 text-violet-200'
                            : 'text-[var(--pintu-text-muted)] hover:bg-white/5'
                        }`}
                      >
                        {w.text}
                      </button>
                    )))}
                  </div>
                ))}
            </div>
          </div>

          {/* settings — defaults are the Bizz Playbook preset, so most cuts touch nothing */}
          <Section
            title="Caption style"
            open={openSection === 'style'}
            onToggle={() => setOpenSection((v) => (v === 'style' ? null : 'style'))}
          >
            <Field label="Font">
              <select
                value={sStyle.baseFontName}
                onChange={(e) => {
                  const meta = findCaptionFont(e.target.value);
                  setS({ baseFontName: meta?.id || e.target.value, fontName: meta?.assName || e.target.value });
                }}
                className="w-full bg-[var(--pintu-card-header-bg)] border border-[var(--pintu-input-border)] rounded
                           px-2 py-1.5 text-[11px] text-[var(--pintu-text-secondary)] focus:outline-none
                           focus:border-violet-500"
              >
                {fontsForRole('base').map((f) => (
                  <option key={f.id} value={f.id}>{f.id}</option>
                ))}
              </select>
            </Field>
            {look === 'podcastred' ? (
              <>
                <Slider
                  label="Top line size"
                  value={sStyle.fontSize}
                  min={28}
                  max={96}
                  onChange={(v) => setS({ fontSize: v })}
                />
                <Slider
                  label="Bottom line size"
                  value={Math.round(sStyle.fontSize * (sStyle.highlightScale ?? 51) / 100)}
                  min={16}
                  max={120}
                  onChange={(v) => {
                    const pct = Math.round((v / Math.max(1, sStyle.fontSize)) * 100);
                    setS({ highlightScale: Math.max(20, Math.min(300, pct)) });
                  }}
                />
                <Slider
                  label="Line gap"
                  value={Math.round(sStyle.lineHeightMul * 100)}
                  min={50}
                  max={200}
                  step={1}
                  suffix="%"
                  onChange={(v) => setS({ lineHeightMul: v / 100 })}
                />
                <ColorInput label="Top line colour" value={sStyle.baseColor} onChange={(v) => setS({ baseColor: v })} />
                <ColorInput label="Bottom line colour" value={sStyle.activeColor} onChange={(v) => setS({ activeColor: v })} />
              </>
            ) : (
              <>
                <Slider label="Font size" value={sStyle.fontSize} min={20} max={96} onChange={(v) => setS({ fontSize: v })} />
                <ColorInput label="Text colour" value={sStyle.baseColor} onChange={(v) => setS({ baseColor: v })} />
                <ColorInput label="Emphasis colour" value={sStyle.activeColor} onChange={(v) => setS({ activeColor: v })} />
              </>
            )}
            <Slider label="Words / card" value={sStyle.maxWordsPerBlock} min={1} max={8} onChange={(v) => setS({ maxWordsPerBlock: v })} />
            <Slider label="Max characters" value={sStyle.maxCharsPerBlock} min={0} max={60} onChange={(v) => setS({ maxCharsPerBlock: v })} />
            <Slider label="Caption height" value={sStyle.posY} min={200} max={1200} step={10} onChange={(v) => setS({ posY: v })} />
            <Slider label="Letter spacing" value={sStyle.letterSpacing} min={-12} max={16} step={0.5} suffix="px" onChange={(v) => setS({ letterSpacing: v })} />
            <Slider
              label="Sentence hold"
              value={sStyle.lingerAfterLast}
              min={0}
              max={4}
              step={0.05}
              suffix="s"
              onChange={(v) => setS({ lingerAfterLast: v })}
            />
            <label className="flex items-center gap-2 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={sStyle.textCase === 'lower'}
                onChange={(e) => setS({ textCase: e.target.checked ? 'lower' : 'none' })}
                className="w-3.5 h-3.5 rounded accent-violet-500"
              />
              <span className="text-[11px] text-[var(--pintu-text-secondary)]">all lowercase</span>
            </label>
          </Section>

          <Section
            title="Glow, shadow & stroke"
            open={openSection === 'shadow'}
            onToggle={() => setOpenSection((v) => (v === 'shadow' ? null : 'shadow'))}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!sStyle.glow}
                onChange={(e) => setS({ glow: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-violet-500"
              />
              <span className="text-[11px] text-[var(--pintu-text-secondary)]">glow</span>
            </label>
            {sStyle.glow && (
              <>
                <ColorInput
                  label="Glow colour"
                  value={sStyle.glowColor || sStyle.baseColor}
                  onChange={(v) => setS({ glowColor: v })}
                />
                <Slider label="Glow size" value={sStyle.glowBorder} min={0} max={40} onChange={(v) => setS({ glowBorder: v })} />
                <Slider label="Glow blur" value={sStyle.glowBlur} min={0} max={80} onChange={(v) => setS({ glowBlur: v })} />
                <Slider label="Outer glow" value={sStyle.baseGlowStrength} min={0} max={500} suffix="%" onChange={(v) => setS({ baseGlowStrength: v })} />
                <Slider label="Inner glow" value={sStyle.baseInnerGlowStrength} min={0} max={500} suffix="%" onChange={(v) => setS({ baseInnerGlowStrength: v })} />
                <Slider label="Inner glow blur" value={sStyle.innerGlowBlur} min={0} max={24} step={0.5} onChange={(v) => setS({ innerGlowBlur: v })} />
                {look === 'podcastred' && (
                  <>
                    <Slider
                      label="Red edge highlight"
                      value={sStyle.baseEdgeHighlight ?? 3}
                      min={0}
                      max={5}
                      step={0.5}
                      suffix="px"
                      onChange={(v) => setS({ baseEdgeHighlight: v })}
                    />
                    <ColorInput
                      label="Edge highlight colour"
                      value={sStyle.edgeHighlightColor || '#FFFFFF'}
                      onChange={(v) => setS({ edgeHighlightColor: v })}
                    />
                  </>
                )}
              </>
            )}
            <ColorInput label="Shadow colour" value={sStyle.shadowColor} onChange={(v) => setS({ shadowColor: v })} />
            <Slider label="Shadow X" value={sStyle.shadowOffsetX} min={-20} max={20} suffix="px" onChange={(v) => setS({ shadowOffsetX: v })} />
            <Slider label="Shadow Y" value={sStyle.shadowOffsetY} min={-20} max={20} suffix="px" onChange={(v) => setS({ shadowOffsetY: v })} />
            <Slider label="Shadow blur" value={sStyle.shadowBlur} min={0} max={40} onChange={(v) => setS({ shadowBlur: v })} />
            <Slider label="Shadow opacity" value={sStyle.shadowOpacity} min={0} max={100} suffix="%" onChange={(v) => setS({ shadowOpacity: v })} />
            <Slider label="Stroke width" value={sStyle.outline} min={0} max={12} step={0.5} suffix="px" onChange={(v) => setS({ outline: v })} />
          </Section>

          {/* burn */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={burn}
              disabled={busy || !serverVideoPath}
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500
                         text-white text-[11px] font-semibold rounded-md px-3 py-2 disabled:opacity-40
                         disabled:cursor-not-allowed transition-colors"
            >
              {phase === 'burning'
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Burning captions…</>
                : burned ? 'Re-burn with these settings' : 'Burn captions into video'}
            </button>
            {burned && (
              <button
                type="button"
                onClick={restoreOriginal}
                disabled={busy}
                title="Put the original clip back"
                className="flex items-center gap-1 text-[11px] text-[var(--pintu-text-faint)]
                           hover:text-[var(--pintu-text-secondary)] px-2 py-2 disabled:opacity-40"
              >
                <RotateCcw className="w-3 h-3" /> Undo
              </button>
            )}
          </div>
          <p className="text-[10px] text-[var(--pintu-text-faint)] leading-relaxed">
            Captions are burned into the clip itself, so every preset picks them up. Do this
            before the hook — then switch to Text &amp; Layout and lay out the rest.
          </p>
        </>
      )}
    </div>
  );
}
