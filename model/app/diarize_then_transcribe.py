#!/usr/bin/env python3
import os
import re
import sys
from typing import List, Dict, Tuple, Optional
import torch
import numpy as np
import torchaudio
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline as hf_pipeline
from pyannote.audio import Pipeline as PyannotePipeline

# ----------------------------- Formatting utils -----------------------------

def fmt_ts(t: float) -> str:
    m, s = divmod(float(t), 60.0)
    return f"{int(m):02d}:{s:04.1f}"

def _norm_token(t: str) -> str:
    # lower + remove punctuation so "today," == "today"
    return re.sub(r"[^\w']+", "", t.lower())

def collapse_adjacent_repeated_ngrams(tokens: List[str], max_n: int = 6) -> List[str]:
    """
    Remove immediate repeated phrases: tokens[i:i+n] == tokens[i+n:i+2n].
    Case/punct-insensitive comparison; preserves original casing in output.
    """
    norm = [_norm_token(t) for t in tokens]
    out: List[str] = []
    i = 0
    while i < len(tokens):
        repeat_n = 0
        for n in range(min(max_n, (len(tokens) - i)//2), 1, -1):
            if norm[i:i+n] and norm[i:i+n] == norm[i+n:i+2*n]:
                repeat_n = n
                break
        out.extend(tokens[i:i+(repeat_n or 1)])
        i += (repeat_n or 1) + (repeat_n or 0)
    return out

def compact_double_words(text: str) -> str:
    """
    Collapse exact repeated words even if separated by punctuation/spaces.
    Examples: "chest? chest?" -> "chest?", "No. No." -> "No."
              "today, today"  -> "today,"
    """
    return re.sub(r"\b([A-Za-z]+(?:'[A-Za-z]+)*)\b(?:\W+\1\b)+", r"\1", text, flags=re.IGNORECASE)

def collapse_nearby_duplicate_words(words: List[Dict], max_gap: float = 0.35) -> List[Dict]:
    """
    Drop adjacent identical tokens created by Whisper's chunk overlap.
    If two consecutive word items have the same text and the second starts
    within `max_gap` seconds of the first's end, remove the second.
    """
    out: List[Dict] = []
    for w in words:
        if out:
            prev = out[-1]
            if (
                # w["text"].strip().lower() == prev["text"].strip().lower()
                _norm_token(w["text"]) == _norm_token(prev["text"])
                and (w["start"] - prev["end"]) <= max_gap
            ):
                continue  # skip duplicate token
        out.append(w)
    return out

# ----------------------------- Audio loading --------------------------------

def load_audio_mono(path: str) -> Tuple[np.ndarray, int]:
    wav, sr = torchaudio.load(path)  # [C, T]
    if wav.size(0) > 1:
        wav = wav.mean(dim=0, keepdim=True)
    return wav[0].numpy(), sr

# ----------------------------- Diarization ----------------------------------

def run_diarization(
    audio_path: str,
    min_turn: float = 0.5,
    merge_gap: float = 0.3,
    num_speakers: Optional[int] = None,
) -> List[Dict]:
    """
    Returns CLEANED diarization turns: list of {"speaker","start","end"}, sorted by start.
    - drop turns shorter than min_turn
    - merge adjacent same-speaker turns when 0 <= gap <= merge_gap
    """
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        raise ValueError("HF_TOKEN environment variable not set")

    dia = PyannotePipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=hf_token)
    kwargs = {}
    if num_speakers is not None:
        kwargs["num_speakers"] = int(num_speakers)

    diarization = dia(audio_path, **kwargs)

    # Collect raw turns
    raw = []
    for turn, _, spk in diarization.itertracks(yield_label=True):
        start = float(turn.start); end = float(turn.end)
        if end - start < min_turn:
            continue
        raw.append({"speaker": spk, "start": start, "end": end})

    raw.sort(key=lambda x: x["start"])

    # Merge small gaps for same speaker
    merged = []
    cur = None
    for seg in raw:
        if cur and cur["speaker"] == seg["speaker"]:
            gap = seg["start"] - cur["end"]
            if 0.0 <= gap <= merge_gap:
                cur["end"] = max(cur["end"], seg["end"])
                continue
        if cur:
            merged.append(cur)
        cur = dict(seg)
    if cur:
        merged.append(cur)

    return merged  # CLEANED (UNPADDED) turns

def pad_turns(turns: List[Dict], pad: float, max_time: float) -> List[Dict]:
    if pad <= 0:
        return turns
    out = []
    for t in turns:
        s = max(0.0, t["start"] - pad)
        e = min(max_time, t["end"] + pad)
        if e > s:
            out.append({"speaker": t["speaker"], "start": s, "end": e})
    return out

def diarization_boundaries(turns: List[Dict]) -> List[float]:
    """Collect unique boundary times from cleaned (possibly padded) turns."""
    b = set()
    for t in turns:
        b.add(t["start"]); b.add(t["end"])
    return sorted(b)

# ------------------------------- ASR (Whisper) ------------------------------

def get_device_and_dtype() -> Tuple[str, torch.dtype, int]:
    try:
        import habana_frameworks.torch.hpu  # noqa: F401
        device = "hpu"
    except Exception:
        device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "hpu":
        dtype = torch.bfloat16; pipe_device = -1
    elif device == "cuda":
        dtype = torch.float16; pipe_device = 0
    else:
        dtype = torch.float32; pipe_device = -1
    return device, dtype, pipe_device

def load_whisper_pipeline(device: str, dtype: torch.dtype, pipe_device: int,
                          chunk_len: int = 30, stride: int = 5):
    model_id = "openai/whisper-large-v3"
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        model_id, torch_dtype=dtype, low_cpu_mem_usage=True, use_safetensors=True
    )
    model.to(device)
    proc = AutoProcessor.from_pretrained(model_id)
    asr = hf_pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=proc.tokenizer,
        feature_extractor=proc.feature_extractor,
        torch_dtype=dtype,
        device=pipe_device,
        chunk_length_s=int(chunk_len),
        stride_length_s=(stride, stride),
    )
    return asr

def normalize_words_from_asr_result(
    result: Dict,
    min_word_dur_s: float = 0.12,
) -> List[Dict]:
    """
    Return list of words with timestamps: [{"start","end","text"}].
    Uses per-chunk 'words'. If those word timestamps are relative to the chunk,
    add the chunk's absolute start (ch['timestamp'][0]).
    Falls back to distributing chunk span if words are unavailable.
    """
    words: List[Dict] = []
    chunks = result.get("chunks", []) or []
    have_word_level = any(("words" in ch) for ch in chunks)

    if have_word_level:
        last_abs_end = 0.0
        for ch in chunks:
            ws = ch.get("words") or []
            ch_ts = ch.get("timestamp")
            ch_abs0 = float(ch_ts[0]) if (ch_ts and ch_ts[0] is not None) else None
            ch_abs1 = float(ch_ts[1]) if (ch_ts and ch_ts[1] is not None) else None
            # decide if word times are relative (end of words fits inside chunk span)
            rel_candidate_max = max(((w.get("timestamp") or (0.0, 0.0))[1] or 0.0) for w in ws) if ws else 0.0
            is_relative = (ch_abs0 is not None and ch_abs1 is not None) and (rel_candidate_max <= (ch_abs1 - ch_abs0 + 0.25))

            t_prev_end = last_abs_end  # ensure global monotonicity across chunks too
            for w in ws:
                t0, t1 = w.get("timestamp") or (None, None)
                text = (w.get("word") or "").strip()
                if not text or t0 is None or t1 is None:
                    continue
                t0 = float(t0); t1 = float(t1)
                if is_relative and (ch_abs0 is not None):
                    t0 += ch_abs0; t1 += ch_abs0
                # enforce monotonicity & min duration
                t0 = max(t0, t_prev_end)
                if t1 - t0 < min_word_dur_s:
                    t1 = t0 + min_word_dur_s
                words.append({"start": t0, "end": t1, "text": text})
                t_prev_end = max(t_prev_end, t1)
            last_abs_end = max(last_abs_end, t_prev_end)
        return words

    # Fallback: no per-word timestamps -> distribute chunk time across whitespace tokens.
    for ch in chunks:
        ts = ch.get("timestamp")
        text = (ch.get("text") or "").strip()
        if not ts or ts[0] is None or ts[1] is None or not text:
            continue
        c0, c1 = float(ts[0]), float(ts[1])
        tokens = [t for t in re.split(r"\s+", text) if t]
        if not tokens:
            continue
        dur = max(c1 - c0, min_word_dur_s * len(tokens))
        step = dur / len(tokens)
        for i, tok in enumerate(tokens):
            t0 = c0 + i * step
            t1 = c0 + (i + 1) * step
            if t1 - t0 < min_word_dur_s:
                t1 = t0 + min_word_dur_s
            words.append({"start": t0, "end": t1, "text": tok})

    return words

# ------------------------- Overlap-based attribution ------------------------

def find_label_for_span(
    start: float,
    end: float,
    turns: List[Dict],
    boundaries: List[float],
    min_overlap: float,
) -> Tuple[str, bool]:
    """
    Assign the speaker label for [start, end] by:
      1) max temporal overlap,
      2) midpoint inside a turn,
      3) boundary snap (±120 ms),
      4) nearest-turn fallback (≤ 0.35 s from word midpoint).
    Returns (label, snapped_flag).
    """
    # 1) Max-overlap
    best_spk = "Unknown"
    best_ov = 0.0
    for t in turns:
        ov = max(0.0, min(end, t["end"]) - max(start, t["start"]))
        if ov > best_ov:
            best_ov = ov
            best_spk = t["speaker"]
    if best_ov >= min_overlap:
        return best_spk, False

    # 2) Midpoint inside a turn
    mid = 0.5 * (start + end)
    for t in turns:
        if t["start"] <= mid <= t["end"]:
            return t["speaker"], True

    # 3) Boundary snap (±120 ms)
    EPS = 0.12
    for b in boundaries:
        if (start - EPS) < b < (end + EPS):
            eps = 1e-4
            left_t = b - eps
            right_t = b + eps
            left_spk = None
            right_spk = None
            for t in turns:
                if t["start"] <= left_t <= t["end"]:
                    left_spk = t["speaker"]
                if t["start"] <= right_t <= t["end"]:
                    right_spk = t["speaker"]
            if left_spk and right_spk:
                return (left_spk if (mid >= b) else right_spk), True
            if left_spk:
                return left_spk, True
            if right_spk:
                return right_spk, True

    # 4) Nearest-turn fallback (if very close to a turn edge)
    nearest_spk = "Unknown"
    nearest_dt = 1e9
    MAX_DT = 0.35  # seconds
    for t in turns:
        if t["start"] <= mid <= t["end"]:
            return t["speaker"], True  # safety
        dt = min(abs(mid - t["start"]), abs(mid - t["end"]))
        if dt < nearest_dt:
            nearest_dt = dt
            nearest_spk = t["speaker"]
    if nearest_dt <= MAX_DT:
        return nearest_spk, True

    return "Unknown", False

# ------------------------------- Assembly -----------------------------------

def group_labeled_words(words: List[Dict], max_merge_gap_out: float) -> List[Dict]:
    segments = []
    cur = {"speaker": None, "start": None, "end": None, "text": []}
    for w in words:
        if cur["speaker"] == w["speaker"] and cur["end"] is not None:
            gap = w["start"] - cur["end"]
            # merge if the next piece starts before or shortly after the current end
            if gap <= max_merge_gap_out:  # NOTE: no lower bound (negative allowed)
                cur["end"] = max(cur["end"], w["end"])
                cur["text"].append(w["text"])
                continue
        if cur["speaker"] is not None:
            segments.append(cur)
        cur = {"speaker": w["speaker"], "start": w["start"], "end": w["end"], "text": [w["text"]]}
    if cur["speaker"] is not None:
        segments.append(cur)
    return segments


def coalesce_consecutive_same_speaker(segments: List[Dict]) -> List[Dict]:
    if not segments:
        return segments
    out = []
    cur = segments[0].copy()
    cur["text"] = cur["text"][:]  # ensure list copy
    for s in segments[1:]:
        if s["speaker"] == cur["speaker"]:
            cur["end"] = max(cur["end"], s["end"])
            cur["text"].extend(s["text"])
        else:
            out.append(cur)
            cur = s.copy()
            cur["text"] = cur["text"][:]
    out.append(cur)
    return out
    
def smooth_unknown_islands(words: List[Dict]) -> List[Dict]:
    """
    If a single Unknown word is sandwiched between the same speaker on both sides
    within small gaps, relabel it to that speaker.
    """
    if not words:
        return words
    out = words[:]
    for i in range(1, len(out) - 1):
        left, cur, right = out[i - 1], out[i], out[i + 1]
        if cur["speaker"] == "Unknown" and left["speaker"] == right["speaker"] and left["speaker"] != "Unknown":
            if (cur["start"] - left["end"] <= 0.2) and (right["start"] - cur["end"] <= 0.2):
                out[i]["speaker"] = left["speaker"]
    return out

# ------------------------------- Public API ---------------------------------

def diarize_then_transcribe(audio_path: str, output_path: str):
    print(">>> Starting diarization-first pipeline")
    print(f"Audio path: {audio_path}")

    # Load ASR
    device, dtype, pipe_device = get_device_and_dtype()
    asr = load_whisper_pipeline(device, dtype, pipe_device)

    # Load audio
    wav, sr = load_audio_mono(audio_path)
    sample = {"array": wav, "sampling_rate": sr}

    # Step 1: Transcribe
    print("Transcribing…")
    result = asr(sample, return_timestamps="word")
    words = collapse_nearby_duplicate_words(normalize_words_from_asr_result(result))

    # Step 2: Diarization
    print("Running diarization…")
    turns_clean = run_diarization(audio_path)
    bounds = diarization_boundaries(turns_clean)
    print("Diarization complete.")

    # Step 3: Label words with speakers
    labeled_words = []
    for w in words:
        spk, _ = find_label_for_span(w["start"], w["end"], turns_clean, bounds, min_overlap=0.06)
        labeled_words.append({**w, "speaker": spk})

    # Step 4: Smooth Unknown islands
    labeled_words = smooth_unknown_islands(labeled_words)

    # Step 5: Group into segments
    labeled_words.sort(key=lambda x: (x["start"], x["end"]))
    segments = group_labeled_words(labeled_words, max_merge_gap_out=0.6)
    segments = coalesce_consecutive_same_speaker(segments)

    # Step 6: Clean repeated phrases
    for seg in segments:
        seg["text"] = collapse_adjacent_repeated_ngrams(seg["text"], max_n=6)

    # Step 7: Write merged transcript
    with open(output_path, "w", encoding="utf-8") as f:
        for seg in segments:
            if seg["end"] <= seg["start"]:
                seg["end"] = seg["start"] + 0.01
            final_text = " ".join(seg["text"]).strip()
            final_text = compact_double_words(final_text)
            line = f"[{seg['speaker']} {fmt_ts(seg['start'])} - {fmt_ts(seg['end'])}]: {final_text}\n"
            print(line, end="")
            f.write(line)

    print(f"\nSpeaker-attributed transcript saved to {output_path}")


# ----------------------------- CLI entrypoint -------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python diarize_then_transcribe.py <audio_file> <output_file>")
        sys.exit(1)
    diarize_then_transcribe(sys.argv[1], sys.argv[2])
