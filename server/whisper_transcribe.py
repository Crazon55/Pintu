#!/usr/bin/env python3
"""Transcribe audio using faster-whisper (local, no API key needed)."""
import sys
import json
import re
import unicodedata
from faster_whisper import WhisperModel


def is_devanagari(text):
    """Check if text contains Devanagari characters."""
    for ch in text:
        if '\u0900' <= ch <= '\u097F':
            return True
    return False


# Devanagari to Roman transliteration mapping
DEVANAGARI_MAP = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऋ': 'ri',
    'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
    'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
    'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
    'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
    'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
    'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha',
    'ष': 'sha', 'स': 'sa', 'ह': 'ha',
    'क्ष': 'ksha', 'त्र': 'tra', 'ज्ञ': 'gya',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ृ': 'ri',
    '्': '', 'ं': 'n', 'ः': 'h', 'ँ': 'n',
    '।': '.', '॥': '.', '़': '',
    'ऑ': 'o', 'ॉ': 'o', 'फ़': 'fa', 'ज़': 'za', 'ड़': 'da', 'ढ़': 'dha',
}


def transliterate_devanagari(text):
    """Convert Devanagari text to Roman script."""
    result = []
    i = 0
    while i < len(text):
        # Try 2-char match first (conjuncts, vowel signs after consonants)
        if i + 1 < len(text) and text[i:i+2] in DEVANAGARI_MAP:
            result.append(DEVANAGARI_MAP[text[i:i+2]])
            i += 2
        elif text[i] in DEVANAGARI_MAP:
            result.append(DEVANAGARI_MAP[text[i]])
            i += 1
        elif '\u0900' <= text[i] <= '\u097F':
            # Unknown Devanagari char, skip
            i += 1
        else:
            # Non-Devanagari (English, punctuation, etc.) — keep as-is
            result.append(text[i])
            i += 1
    return ''.join(result)


def romanize_word(word):
    """If a word has Devanagari, transliterate it. Otherwise keep as-is."""
    if is_devanagari(word):
        return transliterate_devanagari(word)
    return word


def transcribe(audio_path, model_size="base", language=None):
    model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root="/home/ubuntu/.cache/whisper")

    hinglish = language == "hinglish" or language == "hi"
    # Hinglish: force Hindi so Whisper accurately detects Hindi words
    # Then transliterate Devanagari → Roman, English words pass through
    whisper_lang = "hi" if hinglish else language

    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        word_timestamps=True,
        language=whisper_lang,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
    )

    words = []
    for segment in segments:
        if segment.words:
            for w in segment.words:
                text = w.word.strip()
                # For Hinglish: transliterate Devanagari to Roman
                if hinglish and text:
                    text = romanize_word(text)
                words.append({
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                    "text": text,
                })

    # Group words into subtitle chunks
    PUNCT_END = re.compile(r'[.,!?;:]$')

    chunks = []
    current = {"start": 0, "end": 0, "words": []}
    for w in words:
        if not w["text"]:
            continue
        if not current["words"]:
            current["start"] = w["start"]
        current["words"].append(w["text"])
        current["end"] = w["end"]
        duration = current["end"] - current["start"]
        has_punct = PUNCT_END.search(w["text"])
        at_hard_limit = len(current["words"]) >= 4 or duration >= 2.0
        at_soft_limit = has_punct and len(current["words"]) >= 1
        if at_hard_limit or at_soft_limit:
            chunks.append({
                "start": current["start"],
                "end": current["end"],
                "text": " ".join(current["words"]),
            })
            current = {"start": 0, "end": 0, "words": []}
    if current["words"]:
        chunks.append({
            "start": current["start"],
            "end": current["end"],
            "text": " ".join(current["words"]),
        })

    return {
        "language": info.language,
        "duration": info.duration,
        "segments": chunks,
        "words": words,
    }

if __name__ == "__main__":
    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else None
    result = transcribe(audio_path, model_size, language)
    print(json.dumps(result))
