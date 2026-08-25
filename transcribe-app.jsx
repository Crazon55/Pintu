import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, Play, Pause, Loader2, Download, Wand2, Type, RotateCcw, AlertCircle, Check, ChevronDown,
} from 'lucide-react';
import { findCaptionFont, fontsForRole } from './captionFonts.js';
// Grouping, timing and style normalization are shared with the playbook editor's
// Captions section — see shared/captionEngine.js. Only the styled look's canvas text
// measuring and its motion curves stay here; nothing else drives what is on screen.
import {
  PLAY_RES_X, PLAY_RES_Y, GLOW_OUTER_MAX,
  DEFAULT_STYLE, DEFAULT_BIZZ_STYLE, MODE_DEFAULTS, CAPTION_STYLE_BY_MODE, MODE_LABELS,
  round3, blockToPreviewLineWords, stampAutoSentenceBreaks, wordsToSentences,
  sentencesToWords, buildPreviewBlocks, normalizeStyle, captionTextShadow,
  measurePreviewWidth, layoutPreviewWords, findActiveCaptionBlock, usesHighlightSlot,
} from './shared/captionEngine.js';
import { CaptionWordOverlay } from './captionTool.jsx';

// Same tokens the Bizz India Playbook panel uses, dark values only — the
// captions editor has no light mode yet, but the classes stay identical so
// the two panels can share components later.
const PINTU_DARK_VARS = {
  '--pintu-card-bg': 'rgba(255,255,255,0.03)',
  '--pintu-card-border': 'rgba(255,255,255,0.2)',
  '--pintu-card-header-bg': 'rgba(255,255,255,0.05)',
  '--pintu-card-header-border': 'rgba(255,255,255,0.1)',
  '--pintu-text-primary': '#ffffff',
  '--pintu-text-secondary': '#d4d4d4',
  '--pintu-text-muted': '#a3a3a3',
  '--pintu-text-faint': '#737373',
  '--pintu-accent': '#a78bfa',
  '--pintu-input-bg': '#171717',
  '--pintu-input-border': '#404040',
  '--pintu-track-bg': '#404040',
  '--pintu-toggle-bg': 'rgba(255,255,255,0.05)',
  '--pintu-toggle-border': 'rgba(255,255,255,0.1)',
};

/** Format seconds as m:ss for the transport scrubber. */
function fmtTime(s) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Collapsible group, same shape as the Bizz India Playbook panel so both
// editors feel like one product.
function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[var(--pintu-card-header-bg)] rounded-lg border border-[var(--pintu-card-header-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
      >
        <span className="text-[11px] font-medium text-[var(--pintu-text-secondary)]">{title}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--pintu-text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-3.5 pb-3.5 space-y-3">{children}</div>}
    </div>
  );
}

function FontSelect({ label, value, role, onChange, hint }) {
  const options = fontsForRole(role);
  return (
    <label className="block space-y-1">
      <span className="block text-[11px] font-medium text-[var(--pintu-text-secondary)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-xs text-[var(--pintu-text-primary)] bg-[var(--pintu-input-bg)]
                   border border-[var(--pintu-input-border)] rounded-md focus:outline-none focus:border-violet-500
                   focus:ring-2 focus:ring-violet-500/20 transition-all"
      >
        {options.map((f) => (
          <option key={f.id} value={f.id}>{f.id}</option>
        ))}
      </select>
      {hint && <p className="text-[10px] text-[var(--pintu-text-faint)] leading-relaxed">{hint}</p>}
    </label>
  );
}

function Slider({ label, value, min, max, step = 1, suffix = '', onChange, hint }) {
  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--pintu-text-secondary)]">{label}</span>
        <span className="text-[10px] font-mono text-[var(--pintu-accent)] bg-violet-500/10 px-1.5 py-0.5 rounded-full min-w-[2.25rem] text-center">
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
        className="w-full h-1.5 bg-[var(--pintu-track-bg)] rounded-lg appearance-none cursor-pointer accent-violet-500"
      />
      {hint && <p className="text-[10px] text-[var(--pintu-text-faint)] leading-relaxed">{hint}</p>}
    </label>
  );
}

function ColorInput({ label, value, onChange, hint }) {
  return (
    <label className="block space-y-1">
      <span className="block text-[11px] font-medium text-[var(--pintu-text-secondary)]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="w-7 h-7 shrink-0 rounded-md bg-transparent border border-[var(--pintu-input-border)] cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-mono text-[var(--pintu-text-primary)]
                     bg-[var(--pintu-input-bg)] border border-[var(--pintu-input-border)] rounded-md
                     focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
        />
      </div>
      {hint && <p className="text-[10px] text-[var(--pintu-text-faint)] leading-relaxed">{hint}</p>}
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
  const [captionMode, setCaptionMode] = useState('styled'); // styled | bizz | bizzindia | podcastred
  const captionModeRef = useRef('styled');
  const stylePackRef = useRef({
    styled: DEFAULT_STYLE,
    bizz: DEFAULT_BIZZ_STYLE,
    bizzindia: MODE_DEFAULTS.bizzindia,
    podcastred: MODE_DEFAULTS.podcastred,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [aspect, setAspect] = useState(9 / 16);
  const [editing, setEditing] = useState(null); // index into `words`
  const [burnResult, setBurnResult] = useState(null);

  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const replaceInputRef = useRef(null); // swap the clip without leaving the editor
  const dragRef = useRef(null); // { fromSi, fromWi } — more reliable than dataTransfer
  const [stageWidth, setStageWidth] = useState(0);

  // --- upload -------------------------------------------------------------
  const onPickFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setVideoUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
    setWords([]); setServerVideoPath(null);
    setBurnResult(null); setError(null); setPhase('idle'); setProgress(null);
    setManualGrouping(false); setDragWordId(null); setDropHint(null); setEditing(null);
    // Playback state belongs to the old clip: a paused swap left the transport showing
    // Pause, and the scrubber holding the previous timeline until the new metadata landed.
    setPlaying(false); setTime(0); setDuration(0);
  }, []);

  /**
   * Swap the source clip in place. onPickFile already clears the transcript, the burn
   * result and the server-side upload, so the only thing to add is a warning — the
   * transcript and any hand grouping go with the old video. The style is kept: it lives
   * outside this state and is usually the reason you are swapping clips in the first place.
   */
  const replaceVideo = useCallback((f) => {
    if (!f) return;
    if (words.length
      && !window.confirm('Replace the video? The current transcript and its edits are discarded.')) return;
    onPickFile(f);
  }, [words.length, onPickFile]);

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

  const switchCaptionMode = (mode) => {
    if (mode === captionModeRef.current) return;
    stylePackRef.current[captionModeRef.current] = style;
    captionModeRef.current = mode;
    setCaptionMode(mode);
    const next = normalizeStyle(stylePackRef.current[mode] || MODE_DEFAULTS[mode] || DEFAULT_STYLE);
    setStyle(next);
    // Sentence grouping is baked into the words when they arrive, so a look with different
    // limits (Bizz Playbook groups two words a card, Styled four) would otherwise keep
    // showing the old grouping until "Re-auto group" was pressed. Only re-split when the
    // limits actually differ, so switching between looks that group alike keeps hand edits.
    const prev = normalizeStyle(style);
    const regroup = next.maxWordsPerBlock !== prev.maxWordsPerBlock
      || next.maxCharsPerBlock !== prev.maxCharsPerBlock;
    if (regroup) setWords((ws) => (ws.length ? stampAutoSentenceBreaks(ws, next) : ws));
  };

  useEffect(() => {
    stylePackRef.current[captionMode] = style;
  }, [style, captionMode]);

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
      // Ship the layout the preview actually drew, rather than letting the burner
      // recompute it. Both sides run the same algorithm but measure text differently —
      // the editor with ctx.measureText (browser hinting/kerning), the burner with raw
      // opentype advance widths — so recomputing produced different word widths, wider
      // lines and visible gaps. These x/y are in the same 720x1280 space the ASS uses.
      const styleN = normalizeStyle(style);
      const lookDefaults = MODE_DEFAULTS[captionMode] || MODE_DEFAULTS.styled;
      const burnStyle = { ...lookDefaults, ...styleN, manualGrouping };
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
              // Width this word was given on screen. The burner cannot reproduce browser text
              // metrics, so it scales each word to land in exactly this much space instead of
              // measuring for itself — otherwise a narrower glyph leaves the slack as a gap.
              w: measurePreviewWidth(w.text, burnStyle.fontSize, isHi, hiScaleN, burnStyle),
            };
          }),
        };
      });

      const res = await fetch('/api/burn-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: serverVideoPath,
          words,
          previewBlocks,
          style: burnStyle,
          captionStyle: burnStyle.roleBy === 'line'
            ? 'word-highlight'
            : (CAPTION_STYLE_BY_MODE[captionMode] || 'word-highlight'),
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
  }, [serverVideoPath, words, style, manualGrouping, captionMode]);

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
    () => findActiveCaptionBlock(blocks, time),
    [blocks, time],
  );

  const scale = stageWidth ? stageWidth / PLAY_RES_X : 0;
  const setS = (patch) => setStyle((prev) => normalizeStyle({ ...prev, ...patch }));
  // Styled and Podcast Red both reveal word by word and share the same preview, controls
  // and generator; Basic and Strong render a whole line per card.
  const isWordLook = captionMode === 'styled' || captionMode === 'podcastred';

  const busy = phase === 'transcribing' || phase === 'burning';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-inter" style={PINTU_DARK_VARS}>
      <header className="border-b border-neutral-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Type className="w-4 h-4 text-red-500" />
          <h1 className="text-sm font-semibold tracking-tight">Captions</h1>
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
            // Dropping a clip on the stage swaps it, loaded or not — no round trip to the
            // empty state. Word drags from the transcript carry no files, so they fall through.
            onDragOver={(e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); }}
            onDrop={(e) => {
              const f = e.dataTransfer?.files?.[0];
              if (!f || !f.type.startsWith('video/')) return;
              e.preventDefault();
              replaceVideo(f);
            }}
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
            ) : null}

            {videoUrl && (
              <button
                type="button"
                onClick={() => replaceInputRef.current?.click()}
                disabled={busy}
                title="Pick a different clip without leaving the editor"
                className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-md bg-black/70
                           backdrop-blur px-2.5 py-1.5 text-[11px] text-neutral-200 border border-white/15
                           hover:bg-black/85 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed
                           transition-colors"
              >
                <Upload className="w-3 h-3" /> Replace video
              </button>
            )}

            {!videoUrl && (
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
            {activeBlock && scale > 0 && !isWordLook && (
              <div className="absolute inset-0 pointer-events-none">
                {(() => {
                  const isLineLook = !isWordLook;
                  const meta = findCaptionFont(sStyle.baseFontName || sStyle.fontName);
                  const fs = sStyle.fontSize * scale;
                  const stroke = Math.max(0, (sStyle.outline ?? 3) * scale);
                  // Glow and drop shadow both come from the shared builder, which the burn
                  // mirrors layer for layer — Bizz India's red bloom, the Playbook's offset
                  // shadow, or both. Same function the playbook editor's cards draw with.
                  const shadow = captionTextShadow(sStyle, scale);
                  const textCase = sStyle.textCase === 'lower'
                    ? 'lowercase'
                    : sStyle.textCase === 'upper' ? 'uppercase' : 'none';
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: `${(sStyle.posY / PLAY_RES_Y) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '86%',
                        textAlign: 'center',
                      }}
                    >
                      {blockToPreviewLineWords(activeBlock.words).map((line, i) => (
                        <div
                          key={`line-${i}-${line[0]?.id || line[0]?.text || ''}`}
                          style={{
                            // Inter second: the burn substitutes it per character for glyphs
                            // the caption font lacks, so the preview shows the same substitute.
                            fontFamily: `"${meta?.cssFamily || 'Inter Bold Caption'}", "Inter Bold Caption", "Segoe UI Emoji", sans-serif`,
                            fontWeight: meta?.weight || 700,
                            fontStyle: meta?.style || 'normal',
                            fontSize: `${fs}px`,
                            lineHeight: sStyle.lineHeightMul || 1.2,
                            letterSpacing: `${(sStyle.letterSpacing || 0) * scale}px`,
                            color: sStyle.baseColor || '#FFFFFF',
                            textTransform: textCase,
                            WebkitTextStrokeWidth: stroke > 0 ? `${stroke}px` : undefined,
                            WebkitTextStrokeColor: stroke > 0 ? (sStyle.outlineColor || '#000') : undefined,
                            paintOrder: stroke > 0 ? 'stroke fill' : undefined,
                            textShadow: shadow,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {line.map((w, wi) => (
                            <span
                              key={w.id || `${i}-${wi}`}
                              // Emphasis only shows once a different colour is picked, which is
                              // how the Bizz Playbook preset ships (white on white = off).
                              style={isLineLook && w.highlight
                                ? { color: sStyle.activeColor || sStyle.baseColor || '#FFFFFF' }
                                : undefined}
                            >
                              {wi > 0 ? ' ' : ''}{w.text}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
            {activeBlock && scale > 0 && isWordLook && (
              <CaptionWordOverlay
                block={activeBlock}
                style={sStyle}
                scale={scale}
                time={time}
              />
            )}
          </div>

          {/* One input behind both the stage button and the filename link. Clearing value on
              change means picking the same file twice still fires. */}
          <input
            ref={replaceInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; replaceVideo(f); }}
          />

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
            <div className="mt-2 flex items-baseline gap-2 text-[11px] text-neutral-600">
              <span className="truncate">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span>
              <button
                type="button"
                onClick={() => replaceInputRef.current?.click()}
                disabled={busy}
                className="shrink-0 text-neutral-500 underline underline-offset-2 hover:text-neutral-300
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Replace
              </button>
            </div>
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

          {/* step 2 - style. Card + collapsible groups, same shapes as the Bizz India
              Playbook panel. Only the six everyday controls sit up top; everything
              else lives behind "Show advanced" so the panel is not a wall of sliders. */}
          <section className="bg-[var(--pintu-card-bg)] rounded-xl overflow-hidden border border-[var(--pintu-card-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 bg-[var(--pintu-card-header-bg)] px-4 py-2.5 border-b border-[var(--pintu-card-header-border)]">
              <Type className="w-3.5 h-3.5 text-[var(--pintu-accent)]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--pintu-text-secondary)]">Style</h2>
              <button
                onClick={() => setStyle(MODE_DEFAULTS[captionMode] || DEFAULT_STYLE)}
                className="ml-auto flex items-center gap-1.5 text-[11px] text-[var(--pintu-text-faint)] hover:text-[var(--pintu-text-secondary)] transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
                <span className="text-[11px] text-[var(--pintu-text-muted)]">Caption look</span>
                <div className="flex flex-wrap bg-[var(--pintu-toggle-bg)] rounded-md p-0.5 border border-[var(--pintu-toggle-border)]">
                  {['styled', 'bizz', 'bizzindia', 'podcastred'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => switchCaptionMode(mode)}
                      className={`px-2.5 py-1 text-[11px] rounded transition-all ${
                        captionMode === mode ? 'bg-violet-500 text-white font-semibold' : 'text-[var(--pintu-text-muted)] hover:text-[var(--pintu-text-secondary)]'
                      }`}
                    >
                      {MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>
              </div>

              {captionMode === 'podcastred' && (
                <div className="space-y-3 rounded-lg border border-[var(--pintu-card-header-border)] bg-[var(--pintu-card-header-bg)] px-3.5 py-3">
                  <p className="text-[11px] font-medium text-[var(--pintu-text-secondary)]">Caption lines</p>
                  <Slider
                    label="Top line size"
                    value={sStyle.fontSize}
                    min={28}
                    max={96}
                    hint="Red line (first sentence)."
                    onChange={(v) => setS({ fontSize: v })}
                  />
                  <Slider
                    label="Bottom line size"
                    value={Math.round(sStyle.fontSize * (sStyle.highlightScale ?? 51) / 100)}
                    min={16}
                    max={120}
                    hint="White line (second sentence)."
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
                    hint="Space between the red line and the white line."
                    onChange={(v) => setS({ lineHeightMul: v / 100 })}
                  />
                </div>
              )}

              <CollapsibleSection title="Fonts">
                <FontSelect
                  label="Base font"
                  role="base"
                  value={sStyle.baseFontName}
                  hint={isWordLook ? 'The font the ordinary words use.' : 'The font every caption word uses.'}
                  onChange={(v) => {
                    const meta = findCaptionFont(v);
                    setS({ baseFontName: meta?.id || v, fontName: meta?.assName || v });
                  }}
                />
                {isWordLook && (
                <FontSelect
                  label="Highlight font"
                  role="highlight"
                  value={sStyle.highlightFontName}
                  hint="The font the marked word switches to."
                  onChange={(v) => setS({ highlightFontName: findCaptionFont(v)?.id || v })}
                />
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Size">
                {captionMode !== 'podcastred' && (
                <Slider
                  label={isWordLook ? 'Base font size' : 'Font size'}
                  value={sStyle.fontSize}
                  min={28}
                  max={96}
                  hint="How big the ordinary words are on the video."
                  onChange={(v) => setS({ fontSize: v })}
                />
                )}
                {isWordLook && captionMode !== 'podcastred' && (
                <Slider
                  label="Highlight font size"
                  value={Math.round(sStyle.fontSize * (sStyle.highlightScale ?? 125) / 100)}
                  min={16}
                  max={140}
                  hint="How big the marked word grows compared to the rest."
                  onChange={(v) => {
                    const pct = Math.round((v / Math.max(1, sStyle.fontSize)) * 100);
                    setS({
                      highlightScale: Math.max(20, Math.min(300, pct)),
                    });
                  }}
                />
                )}
                <Slider
                  label="Words / line"
                  value={sStyle.maxWordsPerBlock}
                  min={2}
                  max={12}
                  hint="How many words are grouped onto one line."
                  onChange={(v) => setS({ maxWordsPerBlock: v })}
                />
                {!isWordLook && (
                <Slider
                  label="Max characters"
                  value={sStyle.maxCharsPerBlock}
                  min={0}
                  max={60}
                  step={1}
                  hint="Splits earlier when two words would run too long. 0 turns the cap off."
                  onChange={(v) => setS({ maxCharsPerBlock: v })}
                />
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Colour">
                {captionMode === 'podcastred' ? (
                <>
                <ColorInput
                  label="Top line colour"
                  value={sStyle.baseColor}
                  hint="Colour of the red / first line."
                  onChange={(v) => setS({ baseColor: v })}
                />
                <ColorInput
                  label="Bottom line colour"
                  value={sStyle.activeColor}
                  hint="Colour of the white / second line."
                  onChange={(v) => setS({ activeColor: v })}
                />
                </>
                ) : (
                <>
                {isWordLook && (
                <ColorInput
                  label="Highlight colour"
                  value={sStyle.activeColor}
                  hint="Colour of the word being spoken."
                  onChange={(v) => setS({ activeColor: v })}
                />
                )}
                <ColorInput
                  label={isWordLook ? 'Base colour' : 'Text colour'}
                  value={sStyle.baseColor}
                  hint="Colour of the ordinary words."
                  onChange={(v) => setS({ baseColor: v })}
                />
                {!isWordLook && (
                <ColorInput
                  label="Emphasis colour"
                  value={sStyle.activeColor}
                  hint="Colour marked words switch to. Leave it white to keep emphasis off."
                  onChange={(v) => setS({ activeColor: v })}
                />
                )}
                </>
                )}
              </CollapsibleSection>

              {!isWordLook && (
              <CollapsibleSection title="Case & shadow">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sStyle.textCase === 'lower'}
                    onChange={(e) => setS({ textCase: e.target.checked ? 'lower' : 'none' })}
                    className="w-3.5 h-3.5 rounded accent-violet-500"
                  />
                  <span className="text-xs font-medium text-[var(--pintu-text-secondary)]">all lowercase</span>
                </label>
                <ColorInput
                  label="Shadow colour"
                  value={sStyle.shadowColor}
                  hint="Colour of the drop shadow behind the line."
                  onChange={(v) => setS({ shadowColor: v })}
                />
                <Slider label="Shadow X" value={sStyle.shadowOffsetX} min={-20} max={20} step={1} suffix="px" hint="How far right the shadow sits." onChange={(v) => setS({ shadowOffsetX: v })} />
                <Slider label="Shadow Y" value={sStyle.shadowOffsetY} min={-20} max={20} step={1} suffix="px" hint="How far down the shadow sits." onChange={(v) => setS({ shadowOffsetY: v })} />
                <Slider label="Shadow blur" value={sStyle.shadowBlur} min={0} max={40} step={1} hint="How soft the shadow edge is. 0 is a hard offset copy." onChange={(v) => setS({ shadowBlur: v })} />
                <Slider label="Shadow opacity" value={sStyle.shadowOpacity} min={0} max={100} step={1} suffix="%" hint="How solid the shadow is." onChange={(v) => setS({ shadowOpacity: v })} />
                <Slider label="Stroke width" value={sStyle.outline} min={0} max={12} step={0.5} suffix="px" hint="Black outline drawn around each letter." onChange={(v) => setS({ outline: v })} />
              </CollapsibleSection>
              )}

              <p className="text-[10px] text-[var(--pintu-text-faint)] leading-relaxed px-1">
                {!isWordLook
                  ? 'Two words a card, one line, burned as one block: The Bizz Playbook runs lowercase with a drop shadow, Bizz India uppercase with a red glow. Mark a word in the transcript and give emphasis a colour to make it pop.'
                  : 'Motion, glow and spacing are already tuned - open advanced only if you want to change them. Re-burn to bake changes into the export.'}
              </p>

              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-[11px] text-[var(--pintu-text-faint)] hover:text-[var(--pintu-text-secondary)] transition-colors"
              >
                {showAdvanced ? 'Hide advanced' : 'Show advanced'}
              </button>

              {showAdvanced && (
                <div className="space-y-2.5 border-t border-[var(--pintu-card-header-border)] pt-3">
                  {isWordLook && (
                  <CollapsibleSection title="Glow">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sStyle.glow}
                        onChange={(e) => setS({ glow: e.target.checked })}
                        className="w-3.5 h-3.5 rounded accent-violet-500"
                      />
                      <span className="text-xs font-medium text-[var(--pintu-text-secondary)]">Glow on</span>
                    </label>
                    <Slider label="Glow spread" value={sStyle.glowBlur} min={0} max={120} hint="How far the glow bleeds out from the letters." onChange={(v) => setS({ glowBlur: v, glow: true })} />
                    <Slider label="Glow thickness" value={sStyle.glowBorder} min={0} max={80} hint="How fat the glow ring around each letter is." onChange={(v) => setS({ glowBorder: v, glow: true })} />
                    <Slider label="Glow strength - base" value={sStyle.baseGlowStrength} min={0} max={GLOW_OUTER_MAX} step={1} suffix="%" hint="Outer glow brightness on the ordinary / red words." onChange={(v) => setS({ baseGlowStrength: v, glow: true })} />
                    <Slider label="Glow core - base" value={sStyle.baseInnerGlowStrength} min={0} max={GLOW_OUTER_MAX} step={1} suffix="%" hint="Tight centre glow on the ordinary / red words." onChange={(v) => setS({ baseInnerGlowStrength: v, glow: true })} />
                    <Slider label="Glow strength - highlight" value={sStyle.highlightGlowStrength} min={0} max={GLOW_OUTER_MAX} step={1} suffix="%" hint="Outer glow brightness on the marked / white words." onChange={(v) => setS({ highlightGlowStrength: v, glow: true })} />
                    <Slider label="Glow core - highlight" value={sStyle.highlightInnerGlowStrength} min={0} max={GLOW_OUTER_MAX} step={1} suffix="%" hint="Brightness right at the centre of the marked word." onChange={(v) => setS({ highlightInnerGlowStrength: v, glow: true })} />
                    <Slider label="Glow core blur" value={sStyle.innerGlowBlur} min={0} max={24} step={0.5} hint="How soft that centre glow is." onChange={(v) => setS({ innerGlowBlur: v, glow: true })} />
                    {captionMode === 'podcastred' && (
                      <>
                        <Slider
                          label="Red edge highlight"
                          value={sStyle.baseEdgeHighlight ?? 3}
                          min={0}
                          max={5}
                          step={0.5}
                          suffix="px"
                          hint="Very subtle white on the top-left edges of red letters."
                          onChange={(v) => setS({ baseEdgeHighlight: v })}
                        />
                        <ColorInput
                          label="Edge highlight colour"
                          value={sStyle.edgeHighlightColor || '#FFFFFF'}
                          onChange={(v) => setS({ edgeHighlightColor: v })}
                        />
                      </>
                    )}
                  </CollapsibleSection>
                  )}

                  <CollapsibleSection title="Placement & spacing">
                    <Slider label="Caption height" value={sStyle.posY} min={200} max={1200} step={10} hint="How far down the frame the captions sit." onChange={(v) => setS({ posY: v })} />
                    {isWordLook && (
                    <Slider label="Sentence start" value={sStyle.lineStartX} min={20} max={280} step={2} hint="Left margin each sentence starts from." onChange={(v) => setS({ lineStartX: v })} />
                    )}
                    <Slider label="Lines on screen" value={sStyle.maxLines} min={1} max={3} step={1} hint="How many lines stack up at once." onChange={(v) => setS({ maxLines: v })} />
                    <Slider label="Line height" value={Math.round(sStyle.lineHeightMul * 100)} min={50} max={300} step={1} suffix="%" hint="Vertical gap between stacked lines." onChange={(v) => setS({ lineHeightMul: v / 100 })} />
                    <Slider label="Letter spacing" value={sStyle.letterSpacing} min={-12} max={16} step={0.5} suffix="px" hint="Space between letters. Negative tracks the words in tight." onChange={(v) => setS({ letterSpacing: v })} />
                    {isWordLook && (
                    <Slider label="Word gap" value={Math.round(sStyle.wordGapMul * 100)} min={0} max={120} step={1} suffix="%" hint="Space between words on a line." onChange={(v) => setS({ wordGapMul: v / 100 })} />
                    )}
                    <Slider label="Slant" value={sStyle.slantDeg} min={-15} max={15} suffix="°" hint="Tilts the whole caption block." onChange={(v) => setS({ slantDeg: v })} />
                  </CollapsibleSection>

                  <CollapsibleSection title="Timing">
                    {isWordLook && (
                    <>
                    <Slider label="Rise speed" value={sStyle.riseMs} min={100} max={800} step={10} suffix="ms" hint="How quickly each line slides up into place." onChange={(v) => setS({ riseMs: v })} />
                    <Slider label="Rise height" value={sStyle.riseY} min={0} max={100} hint="How far each line travels while rising." onChange={(v) => setS({ riseY: v })} />
                    </>
                    )}
                    <Slider label="Sentence hold" value={sStyle.lingerAfterLast} min={0} max={4} step={0.05} suffix="s" hint="How long a sentence stays after its last word. 0 clears as soon as the last word ends." onChange={(v) => setS({ lingerAfterLast: v })} />
                    <Slider label="Max sentence time" value={sStyle.maxBlockDuration} min={0.8} max={5} step={0.1} suffix="s" hint="Longest a single sentence may stay on screen." onChange={(v) => setS({ maxBlockDuration: v })} />
                  </CollapsibleSection>

                </div>
              )}
            </div>
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
                Double-click to edit text.{isWordLook ? ' Click to mark a highlight word.' : ''}{!isWordLook ? ' Click to mark an emphasised word.' : ''} Right-click to split after.
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
