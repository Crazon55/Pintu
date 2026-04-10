import React, { useState, useRef, useCallback, useEffect } from 'react';

const SERVER_URL = (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || window.location.origin.includes('ngrok')) return '';
    return `http://${host}:3002`;
})();

export default function TranscribeApp() {
    const [step, setStep] = useState('upload'); // upload | transcribing | edit | burning | done
    const [videoFile, setVideoFile] = useState(null);
    const [videoSrc, setVideoSrc] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [progress, setProgress] = useState(null);
    const [segments, setSegments] = useState([]);
    const [videoPath, setVideoPath] = useState(null);
    const [subtitledUrl, setSubtitledUrl] = useState(null);
    const [subtitledPath, setSubtitledPath] = useState(null);
    const [error, setError] = useState(null);
    const [style, setStyle] = useState({
        fontName: 'Neue Haas Grotesk Display Pro',
        fontSize: 48,
        bold: false,
        outline: 3,
        marginV: 10,
        alignment: 5,
        posX: 360,  // center of 720px width
        posY: 900,  // lower third area of 1280px height
    });
    const videoRef = useRef(null);
    const pollRef = useRef(null);

    // Handle video upload
    const handleFileChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setVideoFile(file);
        setVideoSrc(URL.createObjectURL(file));
        setStep('upload');
        setSegments([]);
        setSubtitledUrl(null);
        setError(null);
    }, []);

    // Start transcription
    const startTranscribe = useCallback(async () => {
        if (!videoFile) return;
        setStep('transcribing');
        setError(null);
        setProgress('Uploading video...');

        try {
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('modelSize', 'small');

            const res = await fetch(`${SERVER_URL}/api/transcribe`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Transcription failed');

            setJobId(data.jobId);
            setProgress('Transcribing audio...');

            // Poll for completion
            pollRef.current = setInterval(async () => {
                try {
                    const statusRes = await fetch(`${SERVER_URL}/api/job/${data.jobId}`);
                    const statusData = await statusRes.json();

                    if (statusData.state === 'completed') {
                        clearInterval(pollRef.current);
                        const result = statusData.returnvalue;
                        setSegments(result.segments || []);
                        setVideoPath(result.videoPath);
                        setStep('edit');
                        setProgress(null);
                    } else if (statusData.state === 'failed') {
                        clearInterval(pollRef.current);
                        setError(statusData.failedReason || 'Transcription failed');
                        setStep('upload');
                        setProgress(null);
                    } else {
                        const p = statusData.progress;
                        if (p?.step) setProgress(`${p.step}... ${p.percent || 0}%`);
                    }
                } catch (err) {
                    console.error('Poll error:', err);
                }
            }, 2000);
        } catch (err) {
            setError(err.message);
            setStep('upload');
            setProgress(null);
        }
    }, [videoFile]);

    // Update segment text
    const updateSegment = useCallback((idx, field, value) => {
        setSegments(prev => prev.map((seg, i) => i === idx ? { ...seg, [field]: value } : seg));
    }, []);

    // Delete segment
    const deleteSegment = useCallback((idx) => {
        setSegments(prev => prev.filter((_, i) => i !== idx));
    }, []);

    // Add segment
    const addSegment = useCallback(() => {
        const lastEnd = segments.length > 0 ? segments[segments.length - 1].end : 0;
        setSegments(prev => [...prev, { start: lastEnd, end: lastEnd + 2, text: '' }]);
    }, [segments]);

    // Burn subtitles
    const burnSubs = useCallback(async () => {
        if (!videoPath || segments.length === 0) return;
        setStep('burning');
        setError(null);
        setProgress('Burning subtitles...');

        try {
            const res = await fetch(`${SERVER_URL}/api/burn-subtitles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoPath, segments, style }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Subtitle burning failed');

            setSubtitledUrl(data.downloadUrl);
            setSubtitledPath(data.videoPath);
            setStep('done');
            setProgress(null);
        } catch (err) {
            setError(err.message);
            setStep('edit');
            setProgress(null);
        }
    }, [videoPath, segments, style]);

    // Send to Pintu batcher
    const sendToBatcher = useCallback(() => {
        if (subtitledPath) {
            localStorage.setItem('subtitledVideoPath', subtitledPath);
            window.location.href = '/';
        }
    }, [subtitledPath]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = (s % 60).toFixed(1);
        return `${m}:${sec.padStart(4, '0')}`;
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* Header */}
            <div className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight text-orange-500">PINTU</h1>
                    <span className="text-neutral-500">|</span>
                    <span className="text-sm text-neutral-400">Transcribe & Subtitle</span>
                </div>
                <a href="/" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">
                    Back to Batcher
                </a>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Error banner */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                        <button onClick={() => setError(null)} className="ml-4 text-red-300 hover:text-white">Dismiss</button>
                    </div>
                )}

                {/* Progress banner */}
                {progress && (
                    <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-sm flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        {progress}
                    </div>
                )}

                {/* Step 1: Upload */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-4">1. Upload Video</h2>
                    <div className="flex items-center gap-4">
                        <label className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-lg cursor-pointer text-sm font-medium transition-colors">
                            Choose Video
                            <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                        </label>
                        {videoFile && <span className="text-sm text-neutral-400">{videoFile.name}</span>}
                    </div>
                    {videoSrc && (
                        <div className="mt-4 max-w-md">
                            <video ref={videoRef} src={videoSrc} controls className="w-full rounded-lg" />
                        </div>
                    )}
                </div>

                {/* Transcribe button */}
                {step === 'upload' && videoFile && (
                    <button
                        onClick={startTranscribe}
                        className="mb-8 px-8 py-3 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition-colors"
                    >
                        Transcribe Video
                    </button>
                )}

                {/* Step 2: Edit Transcript */}
                {(step === 'edit' || step === 'burning' || step === 'done') && segments.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4">2. Edit Transcript</h2>
                        <p className="text-sm text-neutral-500 mb-4">Edit the text or adjust timestamps. Delete segments you don't need.</p>

                        <div className="space-y-2">
                            {segments.map((seg, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-neutral-900 rounded-lg p-3">
                                    <div className="flex flex-col gap-1 shrink-0">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={seg.start}
                                            onChange={(e) => updateSegment(idx, 'start', parseFloat(e.target.value) || 0)}
                                            className="w-20 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-center"
                                        />
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={seg.end}
                                            onChange={(e) => updateSegment(idx, 'end', parseFloat(e.target.value) || 0)}
                                            className="w-20 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-center"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={seg.text}
                                        onChange={(e) => updateSegment(idx, 'text', e.target.value)}
                                        className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
                                        placeholder="Subtitle text..."
                                    />
                                    <button
                                        onClick={() => deleteSegment(idx)}
                                        className="text-red-500 hover:text-red-400 text-sm px-2"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={addSegment}
                            className="mt-3 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm transition-colors"
                        >
                            + Add Segment
                        </button>
                    </div>
                )}

                {/* Style options */}
                {(step === 'edit') && segments.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4">3. Subtitle Style</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs text-neutral-500 block mb-1">Position X (0-720)</label>
                                <input
                                    type="range"
                                    min="100" max="620" value={style.posX}
                                    onChange={(e) => setStyle(s => ({ ...s, posX: parseInt(e.target.value) }))}
                                    className="w-full"
                                />
                                <span className="text-xs text-neutral-500">{style.posX} px</span>
                            </div>
                            <div>
                                <label className="text-xs text-neutral-500 block mb-1">Position Y (0-1280)</label>
                                <input
                                    type="range"
                                    min="100" max="1200" value={style.posY}
                                    onChange={(e) => setStyle(s => ({ ...s, posY: parseInt(e.target.value) }))}
                                    className="w-full"
                                />
                                <span className="text-xs text-neutral-500">{style.posY} px</span>
                            </div>
                            <div>
                                <label className="text-xs text-neutral-500 block mb-1">Font Size</label>
                                <input
                                    type="number"
                                    value={style.fontSize}
                                    onChange={(e) => setStyle(s => ({ ...s, fontSize: parseInt(e.target.value) || 48 }))}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-neutral-500 block mb-1">Outline Width</label>
                                <input
                                    type="number"
                                    value={style.outline}
                                    onChange={(e) => setStyle(s => ({ ...s, outline: parseInt(e.target.value) || 3 }))}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={style.bold}
                                        onChange={(e) => setStyle(s => ({ ...s, bold: e.target.checked }))}
                                        className="rounded"
                                    />
                                    Bold
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Burn button */}
                {step === 'edit' && segments.length > 0 && (
                    <button
                        onClick={burnSubs}
                        className="mb-8 px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
                    >
                        Burn Subtitles into Video
                    </button>
                )}

                {/* Step 3: Done */}
                {step === 'done' && subtitledUrl && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4">4. Done!</h2>
                        <div className="flex items-center gap-4">
                            <a
                                href={`${SERVER_URL}${subtitledUrl}`}
                                download
                                className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors inline-block"
                            >
                                Download Subtitled Video
                            </a>
                            <button
                                onClick={sendToBatcher}
                                className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition-colors"
                            >
                                Send to Pintu Batcher
                            </button>
                        </div>
                        <div className="mt-4 max-w-md">
                            <video src={`${SERVER_URL}${subtitledUrl}`} controls className="w-full rounded-lg" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
