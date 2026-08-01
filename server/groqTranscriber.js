import Groq from 'groq-sdk';
import { createReadStream } from 'fs';
import { File as BufferFile } from 'node:buffer';
import { join } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';

// groq-sdk needs a global File to upload audio. Node 20+ has one; Node 18 (on the
// deploy box) only exposes it from node:buffer. Its check runs per-call, so this is
// in time as long as it happens before the first transcription.
if (!globalThis.File) globalThis.File = BufferFile;

let groq = null;
function getGroq() {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY environment variable is missing. Add it to server/.env');
    groq = new Groq({ apiKey });
  }
  return groq;
}

/**
 * Extract audio from video as MP3.
 */
export function extractAudio(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioFrequency(16000)
      .audioChannels(1)
      .audioBitrate('64k')
      .format('mp3')
      .on('error', reject)
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
}

/**
 * Check if text contains Devanagari characters.
 */
function isDevanagari(text) {
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Transliterate Devanagari to Roman script.
 */
const DEVA_MAP = {
  'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo',
  'ए':'e','ऐ':'ai','ओ':'o','औ':'au','ऋ':'ri',
  'क':'ka','ख':'kha','ग':'ga','घ':'gha','ङ':'nga',
  'च':'cha','छ':'chha','ज':'ja','झ':'jha','ञ':'nya',
  'ट':'ta','ठ':'tha','ड':'da','ढ':'dha','ण':'na',
  'त':'ta','थ':'tha','द':'da','ध':'dha','न':'na',
  'प':'pa','फ':'pha','ब':'ba','भ':'bha','म':'ma',
  'य':'ya','र':'ra','ल':'la','व':'va','श':'sha',
  'ष':'sha','स':'sa','ह':'ha',
  'क्ष':'ksha','त्र':'tra','ज्ञ':'gya',
  'ा':'a','ि':'i','ी':'ee','ु':'u','ू':'oo',
  'े':'e','ै':'ai','ो':'o','ौ':'au','ृ':'ri',
  '्':'','ं':'n','ः':'h','ँ':'n',
  '।':'.','॥':'.','़':'',
  'ऑ':'o','ॉ':'o',
};

function transliterate(text) {
  let result = '';
  let i = 0;
  while (i < text.length) {
    if (i + 1 < text.length && DEVA_MAP[text[i] + text[i+1]] !== undefined) {
      result += DEVA_MAP[text[i] + text[i+1]];
      i += 2;
    } else if (DEVA_MAP[text[i]] !== undefined) {
      result += DEVA_MAP[text[i]];
      i += 1;
    } else if (text[i] >= '\u0900' && text[i] <= '\u097F') {
      i += 1; // skip unknown Devanagari
    } else {
      result += text[i];
      i += 1;
    }
  }
  return result;
}

export function romanizeWord(word) {
  if (isDevanagari(word)) return transliterate(word);
  return word;
}

/**
 * Bias Whisper toward Roman-script Hinglish (code-switched Hindi + English).
 * Forcing language=hi makes it emit Devanagari; a naive transliterator then
 * mangles captions. Auto-detect + this prompt is the free path that used to
 * work well for creator Hinglish.
 */
const HINGLISH_PROMPT =
  'Hinglish conversation written in Roman script only, not Devanagari. ' +
  'Words like: hai, kya, nahi, bhai, yaar, matlab, bohot, achha, theek, bas, ' +
  'phir, kaise, kyun, toh, pehle, baad, wala, nahi, bilkul, sahi, dekh, sun.';

/**
 * Transcribe using Groq Whisper large-v3 (best free multilingual model on Groq).
 */
export async function transcribeWithGroq(videoPath, tempDir, options = {}) {
  const language = options.language || 'en';
  const hinglish = language === 'hinglish' || language === 'hi';
  const audioPath = join(tempDir, 'audio.mp3');

  console.log('[groq] Extracting audio...');
  await extractAudio(videoPath, audioPath);

  console.log(`[groq] Transcribing with whisper-large-v3 (${hinglish ? 'Hinglish/roman' : 'English'})...`);

  const request = {
    file: createReadStream(audioPath),
    model: 'whisper-large-v3',
    response_format: 'verbose_json',
    timestamp_granularities: ['word', 'segment'],
    temperature: 0,
  };

  if (hinglish) {
    // Omit language so Whisper can code-switch; prompt keeps output in Latin script.
    request.prompt = HINGLISH_PROMPT;
  } else {
    request.language = 'en';
  }

  const transcription = await getGroq().audio.transcriptions.create(request);

  // Clean up audio
  await fs.unlink(audioPath).catch(() => {});

  // Extract words with timestamps; romanize any leftover Devanagari.
  const words = (transcription.words || []).map(w => {
    let text = (w.word || '').trim();
    if (hinglish && text) text = romanizeWord(text);
    return { start: w.start, end: w.end, text };
  }).filter(w => w.text);

  // Group into segments
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

  console.log(`[groq] Done: ${chunks.length} segments, ${words.length} words`);

  return {
    engine: 'groq-whisper-large-v3',
    language: hinglish ? 'hi' : 'en',
    duration: transcription.duration || 0,
    segments: chunks,
    words,
  };
}

/**
 * Prefer ElevenLabs Scribe v2 when ELEVENLABS_API_KEY is set (best public match
 * for Kalakar-style desi/Hinglish captions). Fall back to Groq Whisper large-v3.
 */
export async function transcribeVideo(videoPath, tempDir, options = {}) {
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const { transcribeWithElevenLabs } = await import('./elevenLabsTranscriber.js');
      return await transcribeWithElevenLabs(videoPath, tempDir, options);
    } catch (err) {
      console.warn('[transcribe] ElevenLabs failed, falling back to Groq:', err.message);
    }
  }
  return transcribeWithGroq(videoPath, tempDir, options);
}
