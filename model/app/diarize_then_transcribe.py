#!/usr/bin/env python3
import os
import re
import argparse
import string
from typing import List, Dict, Tuple, Optional

import numpy as np
import torch
import torchaudio
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline as hf_pipeline
from pyannote.audio import Pipeline as PyannotePipeline

# ----------------------------- Formatting utils -----------------------------

def fmt_ts(t: float) -> str:
    m, s = divmod(float(t), 60.0)
    return f"{int(m):02d}:{s:04.1f}"

def rttm_line(uri: str, start: float, end: float, speaker: str) -> str:
    """Format one RTTM line (SPEAKER). Duration is end-start, clipped ≥ 0."""
    dur = max(0.0, float(end) - float(start))
    # SPEAKER <uri> 1 <start> <dur> <NA> <NA> <speaker> <NA> <NA>
    return f"SPEAKER {uri} 1 {start:.3f} {dur:.3f} <NA> <NA> {speaker} <NA> <NA>\n"

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
    min_turn: float,
    merge_gap: float,
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

# ------------------------------- RTTM writer --------------------------------

def write_rttm(rttm_path: str, uri: str, turns_clean_unpadded: List[Dict]) -> None:
    """
    Write RTTM using CLEANED (UNPADDED) diarization turns — appropriate for DER.
    """
    with open(rttm_path, "w", encoding="utf-8") as f:
        for seg in turns_clean_unpadded:
            f.write(rttm_line(uri, seg["start"], seg["end"], seg["speaker"]))

# --------------------------------- Main -------------------------------------

def build_cli():
    p = argparse.ArgumentParser(description="Pipeline 6: Full-audio Whisper + word-level overlap alignment vs diarization.")
    p.add_argument("audio_file", help="Path to input audio (wav/mp3/etc.)")
    p.add_argument("output_file", help="Path to output transcript (.txt). RTTM will be written next to this with .rttm extension.")
    # Diarization hygiene
    p.add_argument("--min-turn", type=float, default=0.5, help="Drop diarization turns shorter than this many seconds (default: 0.5).")
    p.add_argument("--merge-gap", type=float, default=0.3, help="Merge adjacent same-speaker turns when gap <= this (default: 0.3).")
    p.add_argument("--pad-turn", type=float, default=0.25, help="Pad diarization turns by this many seconds on both sides (default: 0.25).")
    p.add_argument("--num-speakers", type=int, default=None, help="(Optional) Force number of speakers for diarization.")
    # Alignment params
    p.add_argument("--min-overlap", type=float, default=0.06, help="Minimum overlap (sec) to accept a label (default: 0.06).")
    # Grouping / readability
    p.add_argument("--max-merge-gap-out", type=float, default=0.6, help="Merge adjacent same-speaker word groups if gap <= this (default: 0.6).")
    # ASR chunking (full-audio)
    p.add_argument("--chunk-length", type=int, default=30, help="Whisper chunk length in seconds (default: 30).")
    p.add_argument("--stride", type=int, default=5, help="Whisper stride in seconds (default: 5).")
    return p

def main():
    args = build_cli().parse_args()

    print(">>> Pipeline 6: Full-audio ASR + word-level overlap alignment")
    print(f"Audio:  {args.audio_file}")
    print(f"Output: {args.output_file}")

    # Device & ASR
    device, dtype, pipe_device = get_device_and_dtype()
    asr = load_whisper_pipeline(device, dtype, pipe_device, chunk_len=args.chunk_length, stride=args.stride)

    # Load audio (mono array for pipeline sample input)
    wav, sr = load_audio_mono(args.audio_file)
    sample = {"array": wav, "sampling_rate": sr}
    audio_dur = len(wav) / float(sr)
    uri = os.path.splitext(os.path.basename(args.audio_file))[0]

    # Full-audio ASR with word timestamps (global timeline)
    print("Transcribing (requesting word-level timestamps)…")
    result = asr(sample, return_timestamps="word")
    words = normalize_words_from_asr_result(result)
    words = collapse_nearby_duplicate_words(words, max_gap=0.35)
    print(f"Collected {len(words)} word items")

    # Diarization hygiene
    print("Running diarization + hygiene…")
    turns_clean = run_diarization(args.audio_file, min_turn=args.min_turn, merge_gap=args.merge_gap, num_speakers=args.num_speakers)
    # Write RTTM from CLEANED (UNPADDED) turns for DER
    out_base, _ = os.path.splitext(args.output_file)
    rttm_path = out_base + ".rttm"
    write_rttm(rttm_path, uri, turns_clean)
    print(f"RTTM (DER source) written: {rttm_path}  —  segments: {len(turns_clean)}")

    # Pad only for alignment robustness
    turns_padded = pad_turns(turns_clean, pad=args.pad_turn, max_time=audio_dur)
    print(f"Cleaned diarization turns (padded for alignment): {len(turns_padded)}")
    bounds = diarization_boundaries(turns_padded)

    # Per-word attribution
    labeled_words = []
    unknown_count = 0
    for w in words:
        spk, _snapped = find_label_for_span(
            w["start"], w["end"], turns_padded, bounds, min_overlap=args.min_overlap
        )
        if spk == "Unknown":
            unknown_count += 1
        labeled_words.append({"start": w["start"], "end": w["end"], "text": w["text"], "speaker": spk})

    # Smooth tiny Unknown islands
    labeled_words = smooth_unknown_islands(labeled_words)
    unknown_count = sum(1 for w in labeled_words if w["speaker"] == "Unknown")
    print(f"Labeled words: {len(labeled_words)} (Unknown after smoothing: {unknown_count})")


    # Group adjacent words with same speaker for readability
    labeled_words.sort(key=lambda x: (x["start"], x["end"]))
    segments = group_labeled_words(labeled_words, max_merge_gap_out=args.max_merge_gap_out)
    segments = coalesce_consecutive_same_speaker(segments)
    for seg in segments:
        seg["text"] = collapse_adjacent_repeated_ngrams(seg["text"], max_n=6)


    # Write human-readable transcript
    with open(args.output_file, "w", encoding="utf-8") as f:
        for seg in segments:
            if seg["end"] <= seg["start"]:
                seg["end"] = seg["start"] + 0.01

            final_text = ' '.join(seg['text']).strip()
            final_text = compact_double_words(final_text)
            line = f"[{seg['speaker']} {fmt_ts(seg['start'])} - {fmt_ts(seg['end'])}]: {final_text}\n"
            
            # line = f"[{seg['speaker']} {fmt_ts(seg['start'])} - {fmt_ts(seg['end'])}]: {' '.join(seg['text']).strip()}\n"
            print(line, end="")
            f.write(line)

    print(f"\nSpeaker-attributed transcript saved to {args.output_file}")
    print(f"RTTM (for DER) saved to {rttm_path} (from CLEANED, UNPADDED diar turns)")

if __name__ == "__main__":
    main()
