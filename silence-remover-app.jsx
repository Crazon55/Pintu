import React, { useState, useRef, useCallback, useEffect } from 'react';

const SERVER_URL = (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || window.location.origin.includes('ngrok')) return '';
    return `http://${host}:3002`;
})();

export default function SilenceRemoverApp() {
    const [step, setStep] = useState('upload'); // upload | processing | done
    const [videoFile, setVideoFile] = useState(null);
    const [videoSrc, setVideoSrc] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const [silenceThreshold, setSilenceThreshold] = useState(-30);
    const [minSilenceDuration, setMinSilenceDuration] = useState(0.5);
    const [padding, setPadding] = useState(0.1);

    const pollRef = useRef(null);

    const handleFileChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setVideoFile(file);
        setVideoSrc(URL.createObjectURL(file));
        setStep('upload');
        setResult(null);
        setError(null);
    }, []);

    const startProcessing = useCallback(async () => {
        if (!videoFile) return;
        setStep('processing');
        setError(null);
        setProgress('Uploading video...');

        try {
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('silenceThreshold', silenceThreshold.toString());
            formData.append('minSilenceDuration', minSilenceDuration.toString());
            formData.append('padding', padding.toString());

            const res = await fetch(`${SERVER_URL}/api/remove-silence`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Processing failed');

            setJobId(data.jobId);
            setProgress('Detecting silences...');

            pollRef.current = setInterval(async () => {
                try {
                    const statusRes = await fetch(`${SERVER_URL}/api/job/${data.jobId}`);
                    const statusData = await statusRes.json();

                    if (statusData.state === 'completed') {
                        clearInterval(pollRef.current);
                        setResult(statusData.returnvalue);
                        setStep('done');
                        setProgress(null);
                    } else if (statusData.state === 'failed') {
                        clearInterval(pollRef.current);
                        setError(statusData.failedReason || 'Processing failed');
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
    }, [videoFile, silenceThreshold, minSilenceDuration, padding]);

    const downloadVideo = useCallback(async () => {
        if (!result?.outputPath) return;
        try {
            const res = await fetch(`${SERVER_URL}/api/download-silence-removed?path=${encodeURIComponent(result.outputPath)}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'no-silence.mp4';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError('Download failed: ' + err.message);
        }
    }, [result]);

    const sendToBatcher = useCallback(() => {
        if (result?.outputPath) {
            localStorage.setItem('subtitledVideoPath', result.outputPath);
            window.location.href = '/';
        }
    }, [result]);

    const startFresh = useCallback(() => {
        setStep('upload');
        setVideoFile(null);
        setVideoSrc(null);
        setResult(null);
        setError(null);
        setProgress(null);
    }, []);

    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const formatDuration = (s) => {
        if (!s && s !== 0) return '—';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* Header */}
            <div className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight text-orange-500">PINTU</h1>
                    <span className="text-neutral-500">|</span>
                    <span className="text-sm text-neutral-400">Silence Remover</span>
                </div>
                <div className="flex items-center gap-4">
                    {step !== 'upload' && (
                        <button onClick={startFresh} className="text-sm text-red-400 hover:text-red-300 transition-colors">
                            Clear & Reset
                        </button>
                    )}
                    <a href="/transcribe.html" className="text-sm text-neutral-400 hover:text-neutral-300 transition-colors">
                        Transcribe
                    </a>
                    <a href="/" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">
                        Back to Batcher
                    </a>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-8">
                {/* Error */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                        <button onClick={() => setError(null)} className="ml-4 text-red-300 hover:text-white">Dismiss</button>
                    </div>
                )}

                {/* Progress */}
                {progress && (
                    <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-sm flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        {progress}
                    </div>
                )}

                {/* Upload */}
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
                            <video src={videoSrc} controls className="w-full rounded-lg" />
                        </div>
                    )}
                </div>

                {/* Settings */}
                {step === 'upload' && videoFile && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4">2. Silence Settings</h2>
                        <div className="space-y-5 bg-neutral-900 rounded-lg p-5">
                            <div>
                                <label className="text-sm text-neutral-400 block mb-2">
                                    Silence Threshold: <span className="text-white font-medium">{silenceThreshold} dB</span>
                                </label>
                                <input
                                    type="range"
                                    min="-60" max="-10" step="1"
                                    value={silenceThreshold}
                                    onChange={(e) => setSilenceThreshold(parseInt(e.target.value))}
                                    className="w-full"
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    Lower = only remove very quiet parts. Higher = more aggressive removal.
                                </p>
                            </div>

                            <div>
                                <label className="text-sm text-neutral-400 block mb-2">
                                    Minimum Silence Duration: <span className="text-white font-medium">{minSilenceDuration}s</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.2" max="3" step="0.1"
                                    value={minSilenceDuration}
                                    onChange={(e) => setMinSilenceDuration(parseFloat(e.target.value))}
                                    className="w-full"
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    Only remove silences longer than this. Keeps natural pauses.
                                </p>
                            </div>

                            <div>
                                <label className="text-sm text-neutral-400 block mb-2">
                                    Padding: <span className="text-white font-medium">{padding}s</span>
                                </label>
                                <input
                                    type="range"
                                    min="0" max="0.5" step="0.05"
                                    value={padding}
                                    onChange={(e) => setPadding(parseFloat(e.target.value))}
                                    className="w-full"
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    Keep a small buffer around each cut for smoother transitions.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={startProcessing}
                            className="mt-6 px-8 py-3 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition-colors"
                        >
                            Remove Silences
                        </button>
                    </div>
                )}

                {/* Results */}
                {step === 'done' && result && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4">3. Done!</h2>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-neutral-900 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-white">{formatDuration(result.originalDuration)}</div>
                                <div className="text-xs text-neutral-500 mt-1">Original</div>
                            </div>
                            <div className="bg-neutral-900 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-green-400">{formatDuration(result.newDuration)}</div>
                                <div className="text-xs text-neutral-500 mt-1">After Removal</div>
                            </div>
                            <div className="bg-neutral-900 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-orange-400">{formatDuration(result.removedDuration)}</div>
                                <div className="text-xs text-neutral-500 mt-1">Removed</div>
                            </div>
                        </div>

                        <p className="text-sm text-neutral-400 mb-4">
                            Found {result.silences?.length || 0} silent segments. Kept {result.segments?.length || 0} non-silent segments.
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={downloadVideo}
                                className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
                            >
                                Download Video
                            </button>
                            <button
                                onClick={sendToBatcher}
                                className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition-colors"
                            >
                                Send to Pintu Batcher
                            </button>
                            <button
                                onClick={startFresh}
                                className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium transition-colors"
                            >
                                Start Fresh
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
