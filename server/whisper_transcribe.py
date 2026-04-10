#!/usr/bin/env python3
"""Transcribe audio using faster-whisper (local, no API key needed)."""
import sys
import json
from faster_whisper import WhisperModel

def transcribe(audio_path, model_size="base", language=None):
    model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root="/home/ubuntu/.cache/whisper")

    # For Hinglish: use Hindi language but with Romanized prompt to guide output
    hinglish = language == "hi"
    initial_prompt = None
    if hinglish:
        initial_prompt = "Yeh ek Hinglish podcast hai. Sabse zyada important hai ki output Roman script mein ho, jaise aap, mein, kya, hai, toh, sabse."

    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        word_timestamps=True,
        language=language,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
        initial_prompt=initial_prompt,
    )

    words = []
    for segment in segments:
        if segment.words:
            for w in segment.words:
                words.append({
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                    "text": w.word.strip(),
                })

    # Group words into subtitle chunks — break at punctuation to keep phrases together
    # Rules: break AFTER a word that ends with . , ? ! ; : (punctuation = natural pause)
    # Also break if chunk hits 5 words or 2.5s without punctuation (hard limit)
    import re
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
        # Break after ANY punctuation, or at hard limit of 4 words / 2s
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
