import { File as BufferFile } from 'node:buffer';
import { join } from 'path';
import fs from 'fs/promises';
import { extractAudio, romanizeWord } from './groqTranscriber.js';

if (!globalThis.File) globalThis.File = BufferFile;

/**
 * Transcribe with ElevenLabs Scribe v2 — strongest public multilingual STT for
 * creator captions (Hinglish / desi languages). Kalakar does not publish their
 * model; Scribe is the closest widely available match.
 *
 * Requires ELEVENLABS_API_KEY in server/.env
 */
export async function transcribeWithElevenLabs(videoPath, tempDir, options = {}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is missing');

  const language = options.language || 'en';
  const hinglish = language === 'hinglish' || language === 'hi';
  const audioPath = join(tempDir, 'audio-el.mp3');

  console.log('[elevenlabs] Extracting audio...');
  await extractAudio(videoPath, audioPath);

  console.log(`[elevenlabs] Transcribing with scribe_v2 (${hinglish ? 'Hinglish/hi' : 'English'})...`);

  const form = new FormData();
  const buf = await fs.readFile(audioPath);
  form.append('file', new BufferFile([buf], 'audio.mp3', { type: 'audio/mpeg' }));
  form.append('model_id', 'scribe_v2');
  form.append('timestamps_granularity', 'word');
  form.append('tag_audio_events', 'false');
  if (hinglish) form.append('language_code', 'hi');
  else if (language && language !== 'auto') form.append('language_code', language);

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  });

  await fs.unlink(audioPath).catch(() => {});

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ElevenLabs STT ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const rawWords = Array.isArray(data.words) ? data.words : [];

  const words = rawWords
    .filter((w) => (w.type || 'word') === 'word' && (w.text || '').trim())
    .map((w) => {
      let text = String(w.text || '').trim();
      if (hinglish && text) text = romanizeWord(text);
      return {
        start: Number(w.start ?? 0),
        end: Number(w.end ?? w.start ?? 0),
        text,
      };
    })
    .filter((w) => w.text && Number.isFinite(w.start));

  // Group into short caption chunks (same rules as Groq path).
  const PUNCT = /[.,!?;:]$/;
  const chunks = [];
  let current = { start: 0, end: 0, words: [] };
  for (const w of words) {
    if (!current.words.length) current.start = w.start;
    current.words.push(w.text);
    current.end = w.end;
    const dur = current.end - current.start;
    if (current.words.length >= 4 || dur >= 2.0 || PUNCT.test(w.text)) {
      chunks.push({ start: current.start, end: current.end, text: current.words.join(' ') });
      current = { start: 0, end: 0, words: [] };
    }
  }
  if (current.words.length) {
    chunks.push({ start: current.start, end: current.end, text: current.words.join(' ') });
  }

  console.log(`[elevenlabs] Done: ${chunks.length} segments, ${words.length} words`);

  return {
    engine: 'elevenlabs-scribe_v2',
    language: hinglish ? 'hi' : (data.language_code || language || 'en'),
    duration: Number(data.duration || (words.length ? words[words.length - 1].end : 0)),
    segments: chunks,
    words,
  };
}
