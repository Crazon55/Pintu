import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, Play, Pause, Loader2, Download, Wand2, Type, RotateCcw, AlertCircle, Check,
} from 'lucide-react';
import { findCaptionFont, fontsForRole } from './captionFonts.js';

// The ASS script is authored against this virtual canvas; the preview maps
// positions proportionally so what you see matches what libass renders.
const PLAY_RES_X = 720;
const PLAY_RES_Y = 1280;

let _measureCanvas = null;
function measurePreviewWidth(text, fontSize, highlight = false, highlightScale = 1.25, style = {}) {
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
  let w = ctx.measureText(str).width;
  if (!(w > 1)) w = str.length * fontSize * (highlight ? 0.58 : 0.62) * hiScale;
  if (spacing && str.length > 1) w += (str.length - 1) * spacing;
  return w;
}

/** Client layout — every line is center-aligned as a group (short or long).
 *  Wrapped line 2+ stays centered under line 1 (tucked-in look). */
function layoutPreviewWords(wordInputs, style) {
  const fontSize = style.fontSize || 56;
  const posY = style.posY ?? 1020;
  const startX = Math.max(10, style.lineStartX ?? 80);
  const maxW = style.maxLineWidth ?? Math.max(200, Math.round(PLAY_RES_X - startX - 40));
  const gap = Math.max(6, Math.round(fontSize * (style.wordGapMul ?? 0.35)));
  const outline = style.outline ?? 2;
  const hiScale = Math.max(0.8, (style.highlightScale ?? 125) / 100);
  const lineCap = Math.max(1, Math.min(4, style.maxLines ?? 1));
  const spacing = Number(style.letterSpacing) || 0;
  const padBase = Math.max(4, Math.round(outline * 2.5));
  const padHi = Math.max(2, Math.round(hiScale * 2));
  const texts = wordInputs.map((w) => (typeof w === 'string' ? w : w.text));
  const highlights = wordInputs.map((w) => (typeof w === 'object' ? !!w.highlight : false));
  const widths = texts.map((t, i) => (
    measurePreviewWidth(t, fontSize, highlights[i], hiScale, style) + (highlights[i] ? padHi : padBase)
  ));

  if (texts.length === 0) return [];

  const lines = [];
  let cur = { indices: [], width: 0 };
  for (let i = 0; i < texts.length; i++) {
    const w = widths[i];
    const next = cur.indices.length === 0 ? w : cur.width + gap + w;
    const canWrap = lines.length + 1 < lineCap;
    if (cur.indices.length > 0 && next > maxW && canWrap) {
      lines.push(cur);
      cur = { indices: [i], width: w };
    } else {
      cur.indices.push(i);
      cur.width = next;
    }
  }
  if (cur.indices.length) lines.push(cur);

  const lineH = fontSize * 1.22;
  const positions = texts.map(() => ({ x: Math.round(PLAY_RES_X / 2), y: posY, line: 0 }));
  // Every line is centered as a group — same flow for 1 word, 2 words, or a full sentence.
  lines.forEach((line, li) => {
    const y = Math.round(posY + li * lineH);
    let left = Math.round(PLAY_RES_X / 2 - line.width / 2);
    for (const idx of line.indices) {
      positions[idx] = { x: Math.round(left + widths[idx] / 2), y, line: li };
      left += widths[idx] + gap;
    }
  });
  return positions;
}

// Motion is baked in: each word rises from below into its own slot (ease-out),
// fades in by 70% travel, then stays until the whole sentence ends.
const DEFAULT_STYLE = {
  fontSize: 37,
  baseColor: '#EDEAE3',
  activeColor: '#FF7A00',
  baseFontName: 'Montserrat Bold',
  fontName: 'Montserrat',
  highlightFontName: 'Playfair Bold Italic',
  outlineColor: '#141414',
  outline: 2,
  slantDeg: 0,
  popFromScale: 100,
  popToScale: 100,
  popDurationMs: 0,
  popSettleScale: 100,
  popSettleMs: 0,
  glow: true,
  baseGlowStrength: 100,
  highlightGlowStrength: 100,
  glowBlur: 10,
  glowBorder: 6,
  highlightScale: 124, // ≈46px when base is 37
  highlightWeight: 0,
  letterSpacing: -2,
  reveal: 'accumulate',
  riseOn: 'word',
  riseY: 36,
  riseMs: 480,
  lingerAfterLast: 2.5,
  posX: 360,
  posY: 1020,
  lineStartX: 80,
  maxLines: 2,
  maxWordsPerBlock: 3,
  maxBlockDuration: 3.5,
  maxLineWidth: 600,
  wordGapMul: 0.05,
};

const round3 = (n) => Math.round(n * 1000) / 1000;

/** Auto-split words into sentences (mirrors server auto rules), stamp breakBefore. */
function stampAutoSentenceBreaks(words, style = {}) {
  const maxWords = Math.max(1, Number(style.maxWordsPerBlock) || 8);
  const maxDur = Math.max(0.4, Number(style.maxBlockDuration) || 3.5);
  const PUNCT = /[.,!?;:—]$/;
  const sorted = [...words].sort((a, b) => a.start - b.start);
  const stamped = [];
  let count = 0;
  let blockStart = null;
  for (let i = 0; i < sorted.length; i++) {
    const w = sorted[i];
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
    const spanned = w.end - blockStart;
    if (count >= maxWords || spanned >= maxDur || PUNCT.test(w.text)) {
      count = 0;
      blockStart = null;
    }
  }
  return stamped;
}

function wordsToSentences(words) {
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

function sentencesToWords(sentences) {
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
function computePreviewRevealStarts(ws) {
  return ws.map((w) => w.start);
}

/**
 * Build caption blocks on the client so transcript edits/drags update the
 * overlay immediately (no round-trip / silent API miss).
 */
function buildPreviewBlocks(words, style = {}) {
  const {
    maxWordsPerBlock = 8,
    maxBlockDuration = 3.5,
    lingerAfterLast = 2.5,
    minWordDuration = 0.12,
    manualGrouping = false,
    riseMs = 460,
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
    const sorted = [...normalized].sort((a, b) => a.start - b.start);
    for (const w of sorted) {
      current.push(w);
      const spanned = w.end - current[0].start;
      if (current.length >= maxWordsPerBlock || spanned >= maxBlockDuration || PUNCT.test(w.text)) {
        flush();
      }
    }
    flush();
  }

  const blocks = grouped.map((ws, index) => {
    const revealStarts = computePreviewRevealStarts(ws, { riseMs });
    return {
      index,
      start: +Math.min(...ws.map((w) => w.start)).toFixed(3),
      end: +(Math.max(...ws.map((w) => w.end)) + lingerAfterLast).toFixed(3),
      words: ws.map((w, i) => ({
        ...w,
        activeFrom: +revealStarts[i].toFixed(3),
        activeTo: +(i + 1 < ws.length ? revealStarts[i + 1] : Math.max(...ws.map((x) => x.end)) + lingerAfterLast).toFixed(3),
      })),
    };
  });

  blocks.sort((a, b) => a.start - b.start);
  for (let i = 0; i < blocks.length - 1; i++) {
    if (blocks[i].end > blocks[i + 1].start) blocks[i].end = blocks[i + 1].start;
  }
  return blocks.filter((b) => b.end > b.start);
}

/** Merge defaults so older sessions / partial style still drive motion sliders. */
function normalizeStyle(s = {}) {
  const out = { ...DEFAULT_STYLE, ...s };
  out.riseMs = Math.max(40, Number(out.riseMs) || DEFAULT_STYLE.riseMs);
  out.riseY = Number.isFinite(Number(out.riseY)) ? Number(out.riseY) : DEFAULT_STYLE.riseY;
  out.lingerAfterLast = Math.max(0, Number(out.lingerAfterLast) || DEFAULT_STYLE.lingerAfterLast);
  out.maxBlockDuration = Math.max(0.4, Number(out.maxBlockDuration) || DEFAULT_STYLE.maxBlockDuration);
  out.maxWordsPerBlock = Math.max(1, Number(out.maxWordsPerBlock) || DEFAULT_STYLE.maxWordsPerBlock);
  out.fontSize = Math.max(12, Number(out.fontSize) || DEFAULT_STYLE.fontSize);
  out.posY = Number.isFinite(Number(out.posY)) ? Number(out.posY) : DEFAULT_STYLE.posY;
  out.posX = Number.isFinite(Number(out.posX)) ? Number(out.posX) : DEFAULT_STYLE.posX;
  out.lineStartX = Math.max(10, Math.min(320, Number.isFinite(Number(out.lineStartX))
    ? Number(out.lineStartX)
    : DEFAULT_STYLE.lineStartX));
  out.maxLines = Math.max(1, Math.min(4, Number(out.maxLines) || DEFAULT_STYLE.maxLines));
  out.wordGapMul = Math.max(0.05, Number(out.wordGapMul) || DEFAULT_STYLE.wordGapMul);
  out.letterSpacing = Math.max(-4, Math.min(20, Number.isFinite(Number(out.letterSpacing))
    ? Number(out.letterSpacing)
    : DEFAULT_STYLE.letterSpacing));
  out.highlightScale = Math.max(80, Math.min(180, Number(out.highlightScale) || DEFAULT_STYLE.highlightScale));
  out.highlightWeight = 0;
  const baseMeta = findCaptionFont(out.baseFontName || out.fontName) || findCaptionFont(DEFAULT_STYLE.baseFontName);
  const hiMeta = findCaptionFont(out.highlightFontName) || findCaptionFont(DEFAULT_STYLE.highlightFontName);
  out.baseFontName = baseMeta?.id || baseMeta?.assName || DEFAULT_STYLE.baseFontName;
  out.fontName = baseMeta?.assName || DEFAULT_STYLE.fontName;
  out.highlightFontName = hiMeta?.id || hiMeta?.assName || DEFAULT_STYLE.highlightFontName;
  out.glowBlur = Math.max(0, Number.isFinite(Number(out.glowBlur)) ? Number(out.glowBlur) : DEFAULT_STYLE.glowBlur);
  out.glowBorder = Math.max(0, Math.min(20, Number.isFinite(Number(out.glowBorder))
    ? Number(out.glowBorder)
    : DEFAULT_STYLE.glowBorder));
  const legacyGlow = Number.isFinite(Number(out.glowStrength)) ? Number(out.glowStrength) : DEFAULT_STYLE.baseGlowStrength;
  out.baseGlowStrength = Math.max(0, Math.min(100, Number.isFinite(Number(out.baseGlowStrength))
    ? Number(out.baseGlowStrength)
    : legacyGlow));
  out.highlightGlowStrength = Math.max(0, Math.min(100, Number.isFinite(Number(out.highlightGlowStrength))
    ? Number(out.highlightGlowStrength)
    : legacyGlow));
  // Never scale-pop — words always render at full size.
  out.popFromScale = 100;
  out.popToScale = 100;
  out.popDurationMs = 0;
  out.popSettleScale = 100;
  out.popSettleMs = 0;
  return out;
}

/** Fast from the bottom, smooth decelerate into the slot (not linear). */
function easeOutCubic(t) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

/** 0 at bottom → 1 at final position (eased travel fraction). */
function riseTravelAt(time, word, style) {
  if (!word || !style.riseMs) return 1;
  const ms = (time - word.activeFrom) * 1000;
  if (ms <= 0) return 0;
  if (ms >= style.riseMs) return 1;
  return easeOutCubic(ms / style.riseMs);
}

/** Scale pop with ease-out, then settle back to 100%. */
function popScaleAt(time, word, style) {
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
function riseOffsetAt(time, word, style) {
  if (!word || !style.riseY) return 0;
  return style.riseY * (1 - riseTravelAt(time, word, style));
}

/**
 * Fade in over the first 70% of travel distance; fully opaque for the settle.
 */
function riseOpacityAt(time, word, style, isRising) {
  if (!isRising || !style.riseY) return 1;
  const travel = riseTravelAt(time, word, style);
  if (travel >= 0.7) return 1;
  return travel / 0.7;
}

function fmtTime(s) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function hexToRgba(hex, alpha = 1) {
  const h = String(hex || '#EDEAE3').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(237,234,227,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

function FontSelect({ label, value, role, onChange }) {
  const options = fontsForRole(role);
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-2.5 py-2 text-[12px] text-neutral-200
                   focus:outline-none focus:border-neutral-600"
      >
        {options.map((f) => (
          <option key={f.id} value={f.id}>{f.id}</option>
        ))}
      </select>
    </label>
  );
}

function Slider({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</span>
        <span className="text-[11px] font-medium text-neutral-300 tabular-nums">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
                   [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-grab"
      />
    </label>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="w-8 h-8 rounded-md bg-transparent border border-neutral-800 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-md px-2 py-1.5
                     text-xs font-mono text-neutral-300 focus:outline-none focus:border-neutral-600"
        />
      </div>
    </label>
  );
}

export default function TranscribeApp() {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [language, setLanguage] = useState('hinglish');

  const [phase, setPhase] = useState('idle'); // idle | transcribing | ready | burning
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const [words, setWords] = useState([]);
  const [manualGrouping, setManualGrouping] = useState(false);
  const [dragWordId, setDragWordId] = useState(null);
  const [dropHint, setDropHint] = useState(null); // { si, wi } insert before wi in sentence si
  const [serverVideoPath, setServerVideoPath] = useState(null);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [aspect, setAspect] = useState(9 / 16);
  const [editing, setEditing] = useState(null); // index into `words`
  const [burnResult, setBurnResult] = useState(null);

  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const dragRef = useRef(null); // { fromSi, fromWi } — more reliable than dataTransfer
  const [stageWidth, setStageWidth] = useState(0);

  // --- upload -------------------------------------------------------------
  const onPickFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setVideoUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
    setWords([]); setServerVideoPath(null);
    setBurnResult(null); setError(null); setPhase('idle');
    setManualGrouping(false); setDragWordId(null); setDropHint(null);
  }, []);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  // --- transcribe ---------------------------------------------------------
  const transcribe = useCallback(async () => {
    if (!file) return;
    setPhase('transcribing'); setError(null); setProgress({ step: 'uploading', percent: 5 });
    try {
      const fd = new FormData();
      fd.append('video', file);
      fd.append('language', language);

      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const started = await res.json();
      if (!res.ok) throw new Error(started.error || 'Transcription request failed');

      // poll
      for (;;) {
        await new Promise((r) => setTimeout(r, 1200));
        const jr = await fetch(`/api/job/${started.jobId}`);
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
          setManualGrouping(true);
          setServerVideoPath(rv.videoPath || null);
          setPhase('ready');
          setProgress(null);
          return;
        }
        if (job.state === 'failed' || job.state === 'cancelled') {
          throw new Error(job.failedReason || 'Transcription failed');
        }
      }
    } catch (e) {
      setError(e.message);
      setPhase('idle');
      setProgress(null);
    }
  }, [file, language, style]);

  // --- playback clock -----------------------------------------------------
  useEffect(() => {
    let raf;
    const tick = () => {
      const v = videoRef.current;
      if (v) setTime(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStageWidth(e.contentRect.width));
    ro.observe(el);
    setStageWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [videoUrl]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  const seek = (t) => {
    const v = videoRef.current;
    if (v) { v.currentTime = t; setTime(t); }
  };

  // --- word editing -------------------------------------------------------
  const indexByStart = useMemo(() => {
    const m = new Map();
    words.forEach((w, i) => m.set(round3(w.start), i));
    return m;
  }, [words]);

  const updateWord = (idx, text) => {
    setWords((prev) => prev.map((w, i) => (i === idx ? { ...w, text } : w)));
  };

  const toggleHighlight = (idx) => {
    setWords((prev) => prev.map((w, i) => (
      i === idx ? { ...w, highlight: !w.highlight } : w
    )));
  };

  const applySentences = (nextSentences) => {
    setManualGrouping(true);
    setWords(sentencesToWords(nextSentences.filter((s) => s.length > 0)));
  };

  const moveWord = (fromSi, fromWi, toSi, toWi) => {
    const sents = wordsToSentences(words);
    if (!sents[fromSi] || fromWi < 0 || fromWi >= sents[fromSi].length) return;
    const next = sents.map((s) => [...s]);
    const [item] = next[fromSi].splice(fromWi, 1);
    let destSi = toSi;
    let destWi = toWi;
    if (fromSi === toSi && fromWi < toWi) destWi -= 1;
    if (destSi >= next.length) {
      const cleaned = next.filter((s) => s.length > 0);
      cleaned.push([item]);
      setManualGrouping(true);
      setWords(sentencesToWords(cleaned));
      const dest = cleaned[cleaned.length - 1];
      if (dest?.length) seek(Math.min(...dest.map((w) => w.start)) + 0.01);
      return;
    }
    if (!next[destSi]) next.push([item]);
    else next[destSi].splice(Math.max(0, destWi), 0, item);
    const cleaned = next.filter((s) => s.length > 0);
    // After splice, dest sentence index may shift if source emptied above it
    let seekSi = destSi;
    if (fromSi < destSi && sents[fromSi].length === 1) seekSi = Math.max(0, destSi - 1);
    seekSi = Math.min(seekSi, cleaned.length - 1);
    setManualGrouping(true);
    setWords(sentencesToWords(cleaned));
    const dest = cleaned[seekSi];
    if (dest?.length) seek(Math.min(...dest.map((w) => w.start)) + 0.01);
  };

  const splitSentenceAfter = (si, wi) => {
    const sents = wordsToSentences(words);
    if (!sents[si] || wi < 0 || wi >= sents[si].length - 1) return;
    const left = sents[si].slice(0, wi + 1);
    const right = sents[si].slice(wi + 1);
    const next = [...sents.slice(0, si), left, right, ...sents.slice(si + 1)];
    applySentences(next);
    if (right.length) seek(Math.min(...right.map((w) => w.start)) + 0.01);
  };

  const reAutoGroup = () => {
    setWords((prev) => stampAutoSentenceBreaks(prev, normalizeStyle(style)));
    setManualGrouping(true);
  };

  // --- burn ---------------------------------------------------------------
  const burn = useCallback(async () => {
    if (!serverVideoPath || !words.length) return;
    setPhase('burning'); setError(null); setBurnResult(null);
    try {
      const res = await fetch('/api/burn-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: serverVideoPath,
          words,
          style: { ...normalizeStyle(style), manualGrouping },
          captionStyle: 'word-highlight',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Burn failed');
      setBurnResult(data);
      setPhase('ready');
    } catch (e) {
      setError(e.message);
      setPhase('ready');
    }
  }, [serverVideoPath, words, style, manualGrouping]);

  // --- derived preview state ---------------------------------------------
  const sStyle = useMemo(() => normalizeStyle(style), [style]);
  const blocks = useMemo(
    () => buildPreviewBlocks(words, { ...sStyle, manualGrouping }),
    [words, sStyle, manualGrouping],
  );
  const sentences = useMemo(() => wordsToSentences(words), [words]);
  const indexById = useMemo(() => {
    const m = new Map();
    words.forEach((w, i) => { if (w.id) m.set(w.id, i); });
    return m;
  }, [words]);
  const activeBlock = useMemo(
    () => blocks.find((b) => time >= b.start && time < b.end) || null,
    [blocks, time],
  );
  const activeWordIdx = useMemo(() => {
    if (!activeBlock) return -1;
    let idx = -1;
    activeBlock.words.forEach((w, i) => { if (time >= w.activeFrom) idx = i; });
    return idx;
  }, [activeBlock, time]);

  // Live layout from current style (Word gap / font size update immediately).
  const layoutWords = useMemo(() => {
    if (!activeBlock) return [];
    const positions = layoutPreviewWords(activeBlock.words, sStyle);
    return activeBlock.words.map((w, i) => ({
      ...w,
      x: positions[i].x,
      y: positions[i].y,
      line: positions[i].line,
    }));
  }, [activeBlock, sStyle]);

  const scale = stageWidth ? stageWidth / PLAY_RES_X : 0;
  const setS = (patch) => setStyle((prev) => normalizeStyle({ ...prev, ...patch }));

  const busy = phase === 'transcribing' || phase === 'burning';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-inter">
      <header className="border-b border-neutral-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Type className="w-4 h-4 text-red-500" />
          <h1 className="text-sm font-semibold tracking-tight">Word-Level Captions</h1>
          <span className="text-[11px] text-neutral-600 ml-1">Groq Whisper large-v3 → ASS burn-in</span>
        </div>
        <a href="/" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
          ← Video Batcher
        </a>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-[1500px] mx-auto">
        {/* ---------------- preview ---------------- */}
        <div className="lg:w-[420px] shrink-0">
          <div
            ref={stageRef}
            className="relative w-full bg-black rounded-xl overflow-hidden border border-neutral-900"
            style={{ aspectRatio: String(aspect) }}
          >
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="absolute inset-0 w-full h-full object-contain"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  setDuration(v.duration || 0);
                  if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
                }}
                onEnded={() => setPlaying(false)}
                playsInline
              />
            ) : (
              <label className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer
                                text-neutral-600 hover:text-neutral-400 transition-colors">
                <Upload className="w-7 h-7" />
                <span className="text-xs">Drop a video or click to select</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
              </label>
            )}

            {/* caption overlay — live from transcript (edits apply immediately) */}
            {activeBlock && scale > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {layoutWords.map((w, i) => {
                  // Montserrat words reveal at audio time; Playfair words wait until
                  // every regular word has risen, then reveal in order.
                  const spoken = sStyle.reveal === 'all' || time >= w.activeFrom;
                  const rises = sStyle.riseOn === 'word' || (sStyle.riseOn === 'block' && i === 0);
                  const travel = spoken ? riseTravelAt(time, w, sStyle) : 1;
                  const isRising = rises && spoken && sStyle.riseY > 0 && travel < 1;
                  const isHi = !!w.highlight;
                  const dy = isRising ? riseOffsetAt(time, w, sStyle) * scale : 0;
                  const opacity = !spoken
                    ? 0
                    : (isRising ? riseOpacityAt(time, w, sStyle, true) : 1);
                  const color = isHi ? sStyle.activeColor : sStyle.baseColor;
                  const x = Number.isFinite(w.x) ? w.x : sStyle.posX;
                  const y = Number.isFinite(w.y) ? w.y : sStyle.posY;
                  const hiScale = (sStyle.highlightScale ?? 125) / 100;
                  const fs = sStyle.fontSize * scale * (isHi ? hiScale : 1);
                  // Playfair: no stroke. Montserrat: thin outline only.
                  const stroke = isHi ? 0 : Math.max(0, (sStyle.outline ?? 2) * scale);
                  const glowPx = (sStyle.glowBlur ?? 10) * scale;
                  const glowSpread = (sStyle.glowBorder ?? 6) * scale * 0.15;
                  const glowAmt = Math.max(0, Math.min(1, (
                    isHi
                      ? (sStyle.highlightGlowStrength ?? 35)
                      : (sStyle.baseGlowStrength ?? 35)
                  ) / 100));
                  const shadow = !sStyle.glow || opacity <= 0.05 || glowAmt <= 0.01
                    ? 'none'
                    : [
                        `0 0 ${Math.max(2, glowPx * 0.35)}px ${hexToRgba(color, glowAmt)}`,
                        `0 0 ${Math.max(4, glowPx * 0.75 + glowSpread)}px ${hexToRgba(color, glowAmt * 0.7)}`,
                        `0 0 ${Math.max(6, glowPx * 1.35 + glowSpread)}px ${hexToRgba(color, glowAmt * 0.4)}`,
                      ].join(', ');
                  const hiMeta = findCaptionFont(sStyle.highlightFontName);
                  const baseMeta = findCaptionFont(sStyle.baseFontName || sStyle.fontName);
                  const fontMeta = isHi ? hiMeta : baseMeta;
                  return (
                    <span
                      key={`${w.id || w.start}-${w.text}-${i}`}
                      style={{
                        position: 'absolute',
                        left: `${(x / PLAY_RES_X) * 100}%`,
                        top: `${(y / PLAY_RES_Y) * 100}%`,
                        display: 'inline-block',
                        opacity,
                        transform: `translate(-50%, -50%) rotate(${-sStyle.slantDeg}deg) translateY(${dy}px)`,
                        fontFamily: `"${fontMeta?.cssFamily || (isHi ? 'Playfair Display Bold Italic' : 'Montserrat Black')}", "Segoe UI Emoji", "Apple Color Emoji", "Twemoji Mozilla", sans-serif`,
                        fontWeight: fontMeta?.weight || (isHi ? 700 : 900),
                        fontStyle: fontMeta?.style || (isHi ? 'italic' : 'normal'),
                        fontSize: `${fs}px`,
                        letterSpacing: `${(sStyle.letterSpacing || 0) * scale}px`,
                        color,
                        WebkitTextStrokeWidth: stroke > 0 ? `${stroke}px` : undefined,
                        WebkitTextStrokeColor: stroke > 0 ? (sStyle.outlineColor || '#000') : undefined,
                        paintOrder: stroke > 0 ? 'stroke fill' : undefined,
                        textShadow: shadow,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {w.text}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* transport */}
          {videoUrl && (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-9 h-9 shrink-0 rounded-full bg-white text-black flex items-center justify-center
                           hover:bg-neutral-200 transition-colors"
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.01}
                value={time}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                           [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-white"
              />
              <span className="text-[11px] text-neutral-500 tabular-nums shrink-0">
                {fmtTime(time)} / {fmtTime(duration)}
              </span>
            </div>
          )}

          {file && (
            <p className="mt-2 text-[11px] text-neutral-600 truncate">
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          )}
          {words.length > 0 && (
            <p className="mt-2 text-[11px] text-amber-500/80 leading-relaxed">
              Only the large styled words are Pintu. Blue/box captions baked into the video
              file cannot be edited — use a clean source clip for export.
            </p>
          )}
        </div>

        {/* ---------------- controls ---------------- */}
        <div className="flex-1 min-w-0 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-900/60 rounded-lg px-3.5 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-200 leading-relaxed">{error}</p>
            </div>
          )}

          {/* step 1 — transcribe */}
          <section className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-neutral-300 mb-3">1 · Transcribe</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="block text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5">Language</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded-md px-2.5 py-1.5 text-xs
                             text-neutral-200 focus:outline-none focus:border-neutral-600"
                >
                  <option value="hinglish">Hinglish (Roman script)</option>
                  <option value="en">English</option>
                </select>
              </label>
              <button
                onClick={transcribe}
                disabled={!file || busy}
                className="flex items-center gap-2 bg-white text-black text-xs font-medium rounded-md
                           px-3.5 py-2 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed
                           transition-colors"
              >
                {phase === 'transcribing'
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Wand2 className="w-3.5 h-3.5" />}
                {phase === 'transcribing' ? 'Transcribing…' : 'Transcribe'}
              </button>
              {progress && (
                <span className="text-[11px] text-neutral-500">
                  {progress.step} {progress.percent ? `${progress.percent}%` : ''}
                </span>
              )}
              {words.length > 0 && (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  {words.length} words · {blocks.length} sentences
                </span>
              )}
            </div>
          </section>

          {/* step 2 — style (simple; motion baked in) */}
          <section className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-semibold text-neutral-300">2 · Style</h2>
              <button
                onClick={() => setStyle(DEFAULT_STYLE)}
                className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
            <p className="text-[11px] text-neutral-600 mb-4">
              Motion updates live in the preview. Re-burn to bake changes into the export.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-4">
              <FontSelect
                label="Base font"
                role="base"
                value={sStyle.baseFontName}
                onChange={(v) => {
                  const meta = findCaptionFont(v);
                  setS({ baseFontName: meta?.id || v, fontName: meta?.assName || v });
                }}
              />
              <FontSelect
                label="Highlight font"
                role="highlight"
                value={sStyle.highlightFontName}
                onChange={(v) => setS({ highlightFontName: findCaptionFont(v)?.id || v })}
              />
              <Slider
                label="Base font size"
                value={sStyle.fontSize}
                min={28}
                max={96}
                onChange={(v) => setS({ fontSize: v })}
              />
              <Slider
                label="Highlight font size"
                value={Math.round(sStyle.fontSize * (sStyle.highlightScale ?? 125) / 100)}
                min={28}
                max={140}
                onChange={(v) => setS({
                  highlightScale: Math.max(80, Math.min(180, Math.round((v / Math.max(1, sStyle.fontSize)) * 100))),
                })}
              />
              <ColorInput label="Highlight color" value={sStyle.activeColor} onChange={(v) => setS({ activeColor: v })} />
              <ColorInput label="Base color" value={sStyle.baseColor} onChange={(v) => setS({ baseColor: v })} />
              <label className="flex items-center gap-2 cursor-pointer self-end pb-1">
                <input
                  type="checkbox"
                  checked={sStyle.glow}
                  onChange={(e) => setS({ glow: e.target.checked })}
                  className="w-3.5 h-3.5 rounded accent-red-500"
                />
                <span className="text-[11px] uppercase tracking-wider text-neutral-500">Outer glow</span>
              </label>
              <Slider
                label="Glow · base font"
                value={sStyle.baseGlowStrength}
                min={0}
                max={100}
                step={1}
                suffix="%"
                onChange={(v) => setS({ baseGlowStrength: v, glow: true })}
              />
              <Slider
                label="Glow · highlight font"
                value={sStyle.highlightGlowStrength}
                min={0}
                max={100}
                step={1}
                suffix="%"
                onChange={(v) => setS({ highlightGlowStrength: v, glow: true })}
              />
              <Slider
                label="Letter spacing"
                value={sStyle.letterSpacing}
                min={-2}
                max={16}
                step={0.5}
                suffix="px"
                onChange={(v) => setS({ letterSpacing: v })}
              />
              <Slider label="Caption height" value={sStyle.posY} min={200} max={1200} step={10} onChange={(v) => setS({ posY: v })} />
              <Slider
                label="Sentence start"
                value={sStyle.lineStartX}
                min={20}
                max={280}
                step={2}
                onChange={(v) => setS({ lineStartX: v })}
              />
              <Slider
                label="Max lines"
                value={sStyle.maxLines}
                min={1}
                max={3}
                step={1}
                onChange={(v) => setS({ maxLines: v })}
              />
              <Slider label="Words / sentence" value={sStyle.maxWordsPerBlock} min={2} max={12} onChange={(v) => setS({ maxWordsPerBlock: v })} />
              <Slider
                label="Word gap"
                value={Math.round(sStyle.wordGapMul * 100)}
                min={5}
                max={120}
                step={5}
                suffix="%"
                onChange={(v) => setS({ wordGapMul: v / 100 })}
              />

              <Slider
                label="Rise speed"
                value={sStyle.riseMs}
                min={100}
                max={800}
                step={10}
                suffix="ms"
                onChange={(v) => setS({ riseMs: v })}
              />
              <Slider
                label="Rise height"
                value={sStyle.riseY}
                min={0}
                max={100}
                onChange={(v) => setS({ riseY: v })}
              />
              <Slider
                label="Sentence hold"
                value={sStyle.lingerAfterLast}
                min={0.1}
                max={4}
                step={0.1}
                suffix="s"
                onChange={(v) => setS({ lingerAfterLast: v })}
              />
            </div>

            <p className="mt-3 text-[10px] text-neutral-600 leading-relaxed">
              Every line is center-aligned. Wrapped line 2+ stays centered under line 1
              (tucked-in). Works the same for 1–2 words or a full sentence.
            </p>

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="mt-4 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              {showAdvanced ? 'Hide advanced' : 'Show advanced'}
            </button>

            {showAdvanced && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-4 border-t border-neutral-900 pt-4">
                <ColorInput label="Outline" value={sStyle.outlineColor} onChange={(v) => setS({ outlineColor: v })} />
                <Slider label="Outline width" value={sStyle.outline} min={0} max={10} onChange={(v) => setS({ outline: v })} />
                <Slider label="Slant" value={sStyle.slantDeg} min={-15} max={15} suffix="°" onChange={(v) => setS({ slantDeg: v })} />
                <Slider label="Max sentence time" value={sStyle.maxBlockDuration} min={0.8} max={5} step={0.1} suffix="s" onChange={(v) => setS({ maxBlockDuration: v })} />
                <Slider label="Outer glow blur" value={sStyle.glowBlur} min={0} max={28} onChange={(v) => setS({ glowBlur: v, glow: true })} />
                <Slider label="Outer glow size" value={sStyle.glowBorder} min={0} max={16} onChange={(v) => setS({ glowBorder: v, glow: true })} />
              </div>
            )}
          </section>

          {/* step 3 — transcript */}
          {words.length > 0 && (
            <section className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h2 className="text-xs font-semibold text-neutral-300">3 · Transcript</h2>
                <button
                  type="button"
                  onClick={reAutoGroup}
                  className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors shrink-0"
                >
                  Re-auto group
                </button>
              </div>
              <p className="text-[11px] text-neutral-600 mb-3">
                Drag words between sentences to regroup — the preview overlay updates live.
                Double-click to edit text. Click to mark Playfair highlight. Right-click to split after.
              </p>
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {sentences.map((sent, si) => {
                  const sentStart = Math.min(...sent.map((w) => w.start));
                  const isNow = activeBlock
                    && activeBlock.words.some((aw) => sent.some((sw) => sw.id === aw.id || round3(sw.start) === round3(aw.start)));
                  return (
                    <div
                      key={`sent-${si}-${sent[0]?.id || si}`}
                      className={`rounded-md px-2 py-2 border transition-colors ${
                        isNow ? 'bg-neutral-800/70 border-neutral-700' : 'border-neutral-900 hover:border-neutral-800'
                      } ${dropHint?.si === si && dropHint?.wi === sent.length ? 'ring-1 ring-red-500/50' : ''}`}
                      onClick={() => seek(sentStart + 0.01)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDropHint({ si, wi: sent.length });
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const src = dragRef.current;
                        if (!src) return;
                        moveWord(src.fromSi, src.fromWi, si, sent.length);
                        dragRef.current = null;
                        setDragWordId(null);
                        setDropHint(null);
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] text-neutral-600 tabular-nums">
                          {sentStart.toFixed(1)}s · sentence {si + 1}
                        </span>
                        <span className="text-[10px] text-neutral-700">{sent.length} words</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center min-h-[28px]">
                        {sent.map((w, wi) => {
                          const idx = indexById.get(w.id) ?? indexByStart.get(round3(w.start));
                          const isEditing = editing === idx && idx !== undefined;
                          const isHi = !!w.highlight;
                          const isDragging = dragWordId === w.id;
                          const showDropBefore = dropHint?.si === si && dropHint?.wi === wi;
                          if (isEditing) {
                            return (
                              <input
                                key={w.id || `${w.start}-${wi}`}
                                autoFocus
                                defaultValue={w.text}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={(e) => { updateWord(idx, e.target.value.trim() || w.text); setEditing(null); }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.currentTarget.blur();
                                  if (e.key === 'Escape') setEditing(null);
                                }}
                                className="bg-neutral-800 border border-neutral-600 rounded px-1.5 py-1
                                           text-xs text-white w-28 focus:outline-none"
                              />
                            );
                          }
                          return (
                            <React.Fragment key={w.id || `${w.start}-${wi}`}>
                              {showDropBefore && (
                                <span className="w-0.5 h-5 bg-red-500 rounded-full self-center" />
                              )}
                              <button
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  dragRef.current = { fromSi: si, fromWi: wi };
                                  e.dataTransfer.setData('text/plain', `${si},${wi}`);
                                  e.dataTransfer.effectAllowed = 'move';
                                  setDragWordId(w.id);
                                }}
                                onDragEnd={() => {
                                  dragRef.current = null;
                                  setDragWordId(null);
                                  setDropHint(null);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDropHint({ si, wi });
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const src = dragRef.current;
                                  if (!src) return;
                                  moveWord(src.fromSi, src.fromWi, si, wi);
                                  dragRef.current = null;
                                  setDragWordId(null);
                                  setDropHint(null);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (idx !== undefined) toggleHighlight(idx);
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  if (idx !== undefined) setEditing(idx);
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  splitSentenceAfter(si, wi);
                                }}
                                title="Drag to regroup · double-click edit · right-click split after"
                                className={`text-xs rounded-md px-2 py-1 border cursor-grab active:cursor-grabbing transition-colors ${
                                  isDragging ? 'opacity-40' : ''
                                } ${
                                  isHi
                                    ? 'text-orange-400 italic font-semibold border-orange-500/30 bg-orange-500/10'
                                    : 'text-neutral-200 border-neutral-800 bg-neutral-900/80 hover:border-neutral-600'
                                }`}
                              >
                                {w.text}
                              </button>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* Drop zone to start a new sentence at the bottom */}
                <div
                  className={`rounded-md border border-dashed px-3 py-2 text-[11px] text-neutral-600 text-center transition-colors ${
                    dropHint?.si === sentences.length ? 'border-red-500/60 text-neutral-400' : 'border-neutral-800'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropHint({ si: sentences.length, wi: 0 });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const src = dragRef.current;
                    if (!src) return;
                    moveWord(src.fromSi, src.fromWi, sentences.length, 0);
                    dragRef.current = null;
                    setDragWordId(null);
                    setDropHint(null);
                  }}
                >
                  Drop here to make a new sentence
                </div>
              </div>
            </section>
          )}

          {/* step 4 — export */}
          {phase !== 'idle' && words.length > 0 && (
            <section className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4">
              <h2 className="text-xs font-semibold text-neutral-300 mb-3">4 · Burn in</h2>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={burn}
                  disabled={busy || !serverVideoPath}
                  className="flex items-center gap-2 bg-red-600 text-white text-xs font-medium rounded-md
                             px-3.5 py-2 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed
                             transition-colors"
                >
                  {phase === 'burning'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Wand2 className="w-3.5 h-3.5" />}
                  {phase === 'burning' ? 'Rendering…' : 'Burn captions'}
                </button>

                {burnResult && (
                  <a
                    href={`/api/download-subtitled?path=${encodeURIComponent(burnResult.videoPath)}`}
                    className="flex items-center gap-2 bg-neutral-800 text-neutral-100 text-xs font-medium
                               rounded-md px-3.5 py-2 hover:bg-neutral-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                )}
              </div>
              <p className="mt-2.5 text-[11px] text-neutral-600">
                Encodes at the source resolution with libx264 · one job at a time.
                Change sliders, then burn again to see them in the download.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
