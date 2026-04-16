import Groq from 'groq-sdk';
import { createReadStream } from 'fs';
import { join } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
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
function extractAudio(videoPath, outputPath) {
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

function romanizeWord(word) {
  if (isDevanagari(word)) return transliterate(word);
  return word;
}

/**
 * Transcribe using Groq's Whisper API (fast, free, supports Hindi).
 */
export async function transcribeWithGroq(videoPath, tempDir, options = {}) {
  const language = options.language || 'en';
  const hinglish = language === 'hinglish' || language === 'hi';
  const audioPath = join(tempDir, 'audio.mp3');

  console.log('[groq] Extracting audio...');
  await extractAudio(videoPath, audioPath);

  console.log(`[groq] Transcribing (${hinglish ? 'Hinglish' : 'English'})...`);

  const transcription = await getGroq().audio.transcriptions.create({
    file: createReadStream(audioPath),
    model: 'whisper-large-v3',
    response_format: 'verbose_json',
    timestamp_granularities: ['word', 'segment'],
    language: hinglish ? 'hi' : 'en',
  });

  // Clean up audio
  await fs.unlink(audioPath).catch(() => {});

  // Extract words with timestamps
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
    language: hinglish ? 'hi' : 'en',
    duration: transcription.duration || 0,
    segments: chunks,
    words,
  };
}
