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
 * Find non-speech ranges via ffmpeg's silencedetect — a lightweight, no-extra-
 * dependency stand-in for a real VAD model. Whisper hallucinates words over
 * quiet/noisy non-speech audio instead of returning nothing (verified directly
 * against the API — a clip of pure tone hallucinated a confident "you"); the
 * fix used elsewhere in this file (no_speech_prob/avg_logprob filtering) is a
 * safety net for AFTER transcription, this stops it from ever seeing the
 * noise in the first place, which is more reliable and is what production
 * caption tools do.
 */
function detectSilenceRanges(audioPath, { noiseDb = -30, minDurationSec = 0.6 } = {}) {
  return new Promise((resolve, reject) => {
    const ranges = [];
    let pendingStart = null;
    ffmpeg(audioPath)
      .audioFilters(`silencedetect=noise=${noiseDb}dB:d=${minDurationSec}`)
      .format('null')
      .on('stderr', (line) => {
        const startMatch = line.match(/silence_start:\s*([\d.]+)/);
        if (startMatch) { pendingStart = parseFloat(startMatch[1]); return; }
        const endMatch = line.match(/silence_end:\s*([\d.]+)/);
        if (endMatch && pendingStart !== null) {
          ranges.push({ start: pendingStart, end: parseFloat(endMatch[1]) });
          pendingStart = null;
        }
      })
      .on('error', reject)
      .on('end', () => resolve(ranges))
      .save('-');
  });
}

/**
 * Zero out detected silence/noise ranges in place (does NOT trim — total
 * duration stays identical) so Whisper's word timestamps need no remapping.
 * Ranges are shrunk by a small guard band so a hard cut never clips the
 * onset/decay of an adjacent spoken word.
 */
function muteSilenceRanges(audioPath, outputPath, ranges, { guardSec = 0.15 } = {}) {
  if (!ranges.length) {
    return fs.copyFile(audioPath, outputPath).then(() => outputPath);
  }
  const filters = ranges
    .map(({ start, end }) => [start + guardSec, end - guardSec])
    .filter(([start, end]) => end > start)
    .map(([start, end]) => `volume=enable='between(t,${start.toFixed(3)},${end.toFixed(3)})':volume=0`);
  if (!filters.length) {
    return fs.copyFile(audioPath, outputPath).then(() => outputPath);
  }
  return new Promise((resolve, reject) => {
    ffmpeg(audioPath)
      .audioFilters(filters)
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
 *
 * Devanagari consonants carry an implicit "a" vowel (क = "ka") that gets
 * REPLACED -- not appended to -- by a following vowel sign (matra), and
 * SUPPRESSED entirely by a following virama (्, used in conjuncts). Treating
 * every character as an independent lookup (the old approach) ignored that,
 * so है (h + ai-matra) came out as "ha"+"ai" = "haai" instead of "hai".
 * Word-final consonants also drop their implicit "a" (spoken Hindi elides
 * it), so करते becomes "karte" not "karate".
 */
const DEVA_VOWELS = { // independent vowels -- used word-initially or after another vowel
  'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo',
  'ए':'e','ऐ':'ai','ओ':'o','औ':'au','ऋ':'ri','ऑ':'o',
};
const DEVA_CONSONANTS = { // base sound WITHOUT the implicit "a" -- added by the caller when it survives
  'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ng',
  'च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'ny',
  'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n',
  'त':'t','थ':'th','द':'d','ध':'dh','न':'n',
  'प':'p','फ':'ph','ब':'b','भ':'bh','म':'m',
  'य':'y','र':'r','ल':'l','व':'v','श':'sh',
  'ष':'sh','स':'s','ह':'h',
};
const DEVA_MATRAS = { // vowel signs -- replace a consonant's implicit "a"
  'ा':'a','ि':'i','ी':'ee','ु':'u','ू':'oo',
  'े':'e','ै':'ai','ो':'o','ौ':'au','ृ':'ri','ॉ':'o',
};
const DEVA_MODIFIERS = {
  'ं':'n','ः':'h','ँ':'n','़':'','।':'.','॥':'.',
};

function transliterate(text) {
  const chars = Array.from(text);
  let result = '';
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    const consonant = DEVA_CONSONANTS[c];
    if (consonant !== undefined) {
      const next = chars[i + 1];
      if (next === '्') { // virama: suppress the implicit vowel (conjuncts)
        result += consonant;
        i += 2;
        continue;
      }
      const matra = next !== undefined ? DEVA_MATRAS[next] : undefined;
      if (matra !== undefined) {
        result += consonant + matra;
        i += 2;
        continue;
      }
      // Nothing overrides the implicit "a" -- drop it only if this is the
      // last Devanagari sound in the word (spoken-Hindi schwa deletion).
      const rest = chars.slice(i + 1).join('');
      const isWordFinal = !/[ऀ-ॿ]/.test(rest);
      result += isWordFinal ? consonant : consonant + 'a';
      i += 1;
      continue;
    }
    if (DEVA_VOWELS[c] !== undefined) { result += DEVA_VOWELS[c]; i += 1; continue; }
    if (DEVA_MATRAS[c] !== undefined) { result += DEVA_MATRAS[c]; i += 1; continue; } // stray matra
    if (DEVA_MODIFIERS[c] !== undefined) { result += DEVA_MODIFIERS[c]; i += 1; continue; }
    if (c >= 'ऀ' && c <= 'ॿ') { i += 1; continue; } // unknown Devanagari -- skip
    result += c;
    i += 1;
  }
  return result;
}

// The algorithmic transliterator gets single syllables right but can't
// resolve Hindi's syllable-weight-dependent MEDIAL schwa deletion (e.g.
// मतलब -> "matalab" instead of "matlab") -- that's a genuinely hard,
// dictionary-shaped problem, not a regex one. Cover the words creators
// actually say with known-correct casual Hinglish spelling; anything
// outside this list still gets the (now-correct) algorithmic fallback.
const DEVA_COMMON_WORDS = {
  'है':'hai','हैं':'hain','हूँ':'hoon','हो':'ho','था':'tha','थी':'thi','थे':'the',
  'क्या':'kya','नहीं':'nahi','भाई':'bhai','यार':'yaar','मतलब':'matlab',
  'बहुत':'bohot','अच्छा':'achha','ठीक':'theek','बस':'bas','फिर':'phir',
  'कैसे':'kaise','क्यों':'kyun','क्योंकि':'kyunki','तो':'toh','पहले':'pehle',
  'बाद':'baad','वाला':'wala','बिल्कुल':'bilkul','सही':'sahi','देख':'dekh',
  'देखो':'dekho','सुन':'sun','सुनो':'suno','कर':'kar','करते':'karte',
  'करना':'karna','करो':'karo','किया':'kiya','किसी':'kisi','कुछ':'kuch',
  'सब':'sab','सबसे':'sabse','लेकिन':'lekin','अगर':'agar','वैसे':'waise',
  'अभी':'abhi','इसलिए':'isliye','लोग':'log','चीज़':'cheez','पैसा':'paisa',
  'समय':'samay','वक़्त':'waqt','घर':'ghar','दिन':'din','रात':'raat',
  'हम':'hum','तुम':'tum','आप':'aap','मैं':'main','मेरा':'mera','तेरा':'tera',
  'उसका':'uska','हमारा':'hamara','तुम्हारा':'tumhara','उनका':'unka',
  'काम':'kaam','और':'aur','यह':'yeh','वह':'woh','कोई':'koi','जो':'jo',
};

export function romanizeWord(word) {
  const trimmed = String(word || '').trim();
  if (DEVA_COMMON_WORDS[trimmed] !== undefined) return DEVA_COMMON_WORDS[trimmed];
  if (isDevanagari(trimmed)) return transliterate(trimmed);
  return word;
}

/**
 * Bias Whisper toward Roman-script Hinglish (code-switched Hindi + English).
 * Forcing language=hi makes it emit Devanagari; a naive transliterator then
 * mangles captions. Auto-detect + this prompt is the free path that used to
 * work well for creator Hinglish.
 */
const HINGLISH_PROMPT =
  'Transcript of a Hinglish content creator, code-switching between Hindi and ' +
  'English, written entirely in Roman script — never Devanagari, never pure ' +
  'formal Hindi. Example: "Bhai dekho, agar aap yeh cheez karte hain toh ' +
  'aapko bohot fayda hoga, kyunki log isko bilkul sahi samajhte hain, matlab ' +
  'yeh ekdum theek hai." ' +
  'Common words: hai, hain, kya, nahi, bhai, yaar, matlab, bohot, achha, ' +
  'theek, bas, phir, kaise, kyun, kyunki, toh, pehle, baad, wala, bilkul, ' +
  'sahi, dekh, dekho, sun, suno, karo, karna, karte, hoga, hota, hoti, log, ' +
  'cheez, paisa, samay, waqt, abhi, kuch, sabse, isliye, lekin, agar, waise.';

/**
 * Transcribe using Groq Whisper large-v3 (best free multilingual model on Groq).
 */
export async function transcribeWithGroq(videoPath, tempDir, options = {}) {
  const language = options.language || 'en';
  const hinglish = language === 'hinglish' || language === 'hi';
  const audioPath = join(tempDir, 'audio.mp3');

  console.log('[groq] Extracting audio...');
  await extractAudio(videoPath, audioPath);

  console.log('[groq] Detecting silence/noise (pre-VAD)...');
  const cleanAudioPath = join(tempDir, 'audio-clean.mp3');
  let usedCleanAudio = false;
  try {
    const silenceRanges = await detectSilenceRanges(audioPath);
    await muteSilenceRanges(audioPath, cleanAudioPath, silenceRanges);
    usedCleanAudio = true;
    if (silenceRanges.length) {
      console.log(`[groq] Muted ${silenceRanges.length} non-speech range(s) before sending to Whisper.`);
    }
  } catch (err) {
    console.warn('[groq] Silence detection failed, transcribing raw audio:', err.message);
  }

  console.log(`[groq] Transcribing with whisper-large-v3 (${hinglish ? 'Hinglish/roman' : 'English'})...`);

  const request = {
    file: createReadStream(usedCleanAudio ? cleanAudioPath : audioPath),
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
  if (usedCleanAudio) await fs.unlink(cleanAudioPath).catch(() => {});

  // Whisper hallucinates words over silence/noise instead of returning nothing —
  // verified directly against this API: a clip of pure tone+silence still came back
  // with a confidently-timestamped word. Whisper's own verbose_json segments carry
  // no_speech_prob/avg_logprob precisely to flag this; drop words that fall inside
  // a segment Whisper itself doesn't trust was real speech.
  const badSegments = (transcription.segments || []).filter((s) => (
    Number(s.no_speech_prob) >= 0.6 || Number(s.avg_logprob) <= -1.0
  ));
  const isHallucinated = (start, end) => badSegments.some((s) => (
    start < Number(s.end) && end > Number(s.start)
  ));
  if (badSegments.length) {
    console.log(`[groq] Dropping ${badSegments.length} low-confidence segment(s) (no_speech_prob/avg_logprob):`,
      badSegments.map((s) => `"${s.text.trim()}"@${s.start.toFixed(1)}s`).join(', '));
  }

  // Extract words with timestamps; romanize any leftover Devanagari.
  const words = (transcription.words || [])
    .filter((w) => !isHallucinated(Number(w.start), Number(w.end)))
    .map(w => {
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
