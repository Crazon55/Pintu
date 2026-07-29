import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, Play, Pause, Loader2, Download, Wand2, Type, RotateCcw, AlertCircle, Check,
} from 'lucide-react';

// The ASS script is authored against this virtual canvas; the preview maps
// positions proportionally so what you see matches what libass renders.
const PLAY_RES_X = 720;
const PLAY_RES_Y = 1280;

const DEFAULT_STYLE = {
  fontSize: 58,
  baseColor: '#FFFFFF',
  activeColor: '#FF0000',
  outlineColor: '#000000',
  outline: 4,
  slantDeg: -6,
  popFromScale: 85,
  popToScale: 110,
  popDurationMs: 70,
  glow: true,
  glowBlur: 11,
  posX: 360,
  posY: 900,
  maxWordsPerBlock: 4,
  maxBlockDuration: 2.0,
};

const round3 = (n) => Math.round(n * 1000) / 1000;

/** Mirrors the ASS \t(0,popDurationMs,\fscx..) ramp so preview timing matches. */
function popScaleAt(time, word, style) {
  if (!word) return style.popToScale;
  const ms = (time - word.activeFrom) * 1000;
  if (ms <= 0) return style.popFromScale;
  if (ms >= style.popDurationMs) return style.popToScale;
  const p = ms / style.popDurationMs;
  return style.popFromScale + (style.popToScale - style.popFromScale) * p;
}

function fmtTime(s) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
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
  const [serverVideoPath, setServerVideoPath] = useState(null);
  const [spec, setSpec] = useState(null);
  const [style, setStyle] = useState(DEFAULT_STYLE);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [aspect, setAspect] = useState(9 / 16);
  const [editing, setEditing] = useState(null); // index into `words`
  const [burnResult, setBurnResult] = useState(null);

  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const [stageWidth, setStageWidth] = useState(0);

  // --- upload -------------------------------------------------------------
  const onPickFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setVideoUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
    setWords([]); setSpec(null); setServerVideoPath(null);
    setBurnResult(null); setError(null); setPhase('idle');
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
          setWords((rv.words || []).map((w) => ({ text: w.text, start: w.start, end: w.end })));
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
  }, [file, language]);

  // --- grouping comes from the server so preview == render ----------------
  useEffect(() => {
    if (!words.length) { setSpec(null); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/caption-spec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ words, style }),
        });
        const data = await res.json();
        if (res.ok) setSpec(data);
      } catch { /* preview-only; ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [words, style.maxWordsPerBlock, style.maxBlockDuration, style.activeColor, style.baseColor]);

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
          style,
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
  }, [serverVideoPath, words, style]);

  // --- derived preview state ---------------------------------------------
  const blocks = spec?.blocks || [];
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

  const scale = stageWidth ? stageWidth / PLAY_RES_X : 0;
  const setS = (patch) => setStyle((s) => ({ ...s, ...patch }));

  const busy = phase === 'transcribing' || phase === 'burning';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-inter">
      <header className="border-b border-neutral-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Type className="w-4 h-4 text-red-500" />
          <h1 className="text-sm font-semibold tracking-tight">Word-Level Captions</h1>
          <span className="text-[11px] text-neutral-600 ml-1">Groq transcribe → ASS burn-in</span>
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

            {/* caption overlay — mirrors the ASS layout */}
            {activeBlock && scale > 0 && (
              <div
                className="absolute pointer-events-none whitespace-nowrap"
                style={{
                  left: `${(style.posX / PLAY_RES_X) * 100}%`,
                  top: `${(style.posY / PLAY_RES_Y) * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${-style.slantDeg}deg)`,
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 800,
                  fontSize: `${style.fontSize * scale}px`,
                  lineHeight: 1.15,
                }}
              >
                {activeBlock.words.map((w, i) => {
                  const isActive = i === activeWordIdx;
                  const s = isActive ? popScaleAt(time, w, style) / 100 : 1;
                  return (
                    <span
                      key={`${w.start}-${i}`}
                      style={{
                        display: 'inline-block',
                        transform: `scale(${s})`,
                        color: isActive ? style.activeColor : style.baseColor,
                        WebkitTextStrokeWidth: `${style.outline * scale}px`,
                        WebkitTextStrokeColor: style.outlineColor,
                        paintOrder: 'stroke fill',
                        textShadow: isActive && style.glow
                          ? `0 0 ${style.glowBlur * scale}px ${style.activeColor}, 0 0 ${style.glowBlur * 2 * scale}px ${style.activeColor}`
                          : 'none',
                        marginRight: i < activeBlock.words.length - 1 ? `${0.28 * style.fontSize * scale}px` : 0,
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
                  <option value="hinglish">Hindi → Hinglish (romanized)</option>
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
              {spec && (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  {spec.wordCount} words · {spec.blockCount} blocks
                </span>
              )}
            </div>
          </section>

          {/* step 2 — style */}
          <section className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-neutral-300">2 · Style</h2>
              <button
                onClick={() => setStyle(DEFAULT_STYLE)}
                className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-4">
              <ColorInput label="Base" value={style.baseColor} onChange={(v) => setS({ baseColor: v })} />
              <ColorInput label="Active word" value={style.activeColor} onChange={(v) => setS({ activeColor: v })} />
              <ColorInput label="Outline" value={style.outlineColor} onChange={(v) => setS({ outlineColor: v })} />

              <Slider label="Font size" value={style.fontSize} min={28} max={96} onChange={(v) => setS({ fontSize: v })} />
              <Slider label="Outline" value={style.outline} min={0} max={10} onChange={(v) => setS({ outline: v })} />
              <Slider label="Slant" value={style.slantDeg} min={-15} max={15} suffix="°" onChange={(v) => setS({ slantDeg: v })} />

              <Slider label="Pop from" value={style.popFromScale} min={50} max={100} suffix="%" onChange={(v) => setS({ popFromScale: v })} />
              <Slider label="Pop to" value={style.popToScale} min={100} max={160} suffix="%" onChange={(v) => setS({ popToScale: v })} />
              <Slider label="Pop speed" value={style.popDurationMs} min={20} max={300} step={10} suffix="ms" onChange={(v) => setS({ popDurationMs: v })} />

              <Slider label="Words / block" value={style.maxWordsPerBlock} min={1} max={4} onChange={(v) => setS({ maxWordsPerBlock: v })} />
              <Slider label="Max block time" value={style.maxBlockDuration} min={0.8} max={4} step={0.1} suffix="s" onChange={(v) => setS({ maxBlockDuration: v })} />
              <Slider label="Vertical position" value={style.posY} min={200} max={1200} step={10} onChange={(v) => setS({ posY: v })} />

              <div className="col-span-2 md:col-span-3 flex flex-wrap items-end gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={style.glow}
                    onChange={(e) => setS({ glow: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-red-500"
                  />
                  <span className="text-[11px] uppercase tracking-wider text-neutral-500">Glow</span>
                </label>
                {style.glow && (
                  <div className="w-44">
                    <Slider label="Glow blur" value={style.glowBlur} min={0} max={30} onChange={(v) => setS({ glowBlur: v })} />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* step 3 — transcript */}
          {blocks.length > 0 && (
            <section className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-4">
              <h2 className="text-xs font-semibold text-neutral-300 mb-1">3 · Transcript</h2>
              <p className="text-[11px] text-neutral-600 mb-3">
                Click any word to fix it. Timings stay locked to the audio.
              </p>
              <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                {blocks.map((b) => {
                  const isNow = activeBlock && activeBlock.index === b.index;
                  return (
                    <div
                      key={b.index}
                      className={`flex items-baseline gap-3 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                        isNow ? 'bg-neutral-800/70' : 'hover:bg-neutral-900/70'
                      }`}
                      onClick={() => seek(b.start + 0.01)}
                    >
                      <span className="text-[10px] text-neutral-600 tabular-nums shrink-0 w-9">
                        {b.start.toFixed(1)}s
                      </span>
                      <div className="flex flex-wrap gap-x-1.5 gap-y-1">
                        {b.words.map((w) => {
                          const idx = indexByStart.get(round3(w.start));
                          const isEditing = editing === idx && idx !== undefined;
                          const isActiveWord = isNow &&
                            activeBlock.words[activeWordIdx]?.start === w.start;
                          if (isEditing) {
                            return (
                              <input
                                key={w.start}
                                autoFocus
                                defaultValue={w.text}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={(e) => { updateWord(idx, e.target.value.trim() || w.text); setEditing(null); }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.currentTarget.blur();
                                  if (e.key === 'Escape') setEditing(null);
                                }}
                                className="bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5
                                           text-xs text-white w-24 focus:outline-none"
                              />
                            );
                          }
                          return (
                            <button
                              key={w.start}
                              onClick={(e) => { e.stopPropagation(); if (idx !== undefined) setEditing(idx); }}
                              className={`text-xs rounded px-1 py-0.5 transition-colors ${
                                isActiveWord
                                  ? 'text-red-400 font-semibold'
                                  : 'text-neutral-300 hover:bg-neutral-700/60'
                              }`}
                            >
                              {w.text}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
