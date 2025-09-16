import os
import sys
import torch
import torchaudio
from pyannote.audio import Pipeline
from transformers import pipeline as hf_pipeline, AutoModelForSpeechSeq2Seq, AutoProcessor
import soundfile as sf

from tempfile import NamedTemporaryFile


def diarize_then_transcribe(audio_path, output_path):
    print(">>> Starting diarization-first pipeline")
    print(f"Audio path: {audio_path}")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    torch_dtype = torch.float16 if device != "cpu" else torch.float32

    # Step 1: Load diarization pipeline
    hf_token = os.getenv("HF_TOKEN")
    if hf_token is None:
        raise ValueError("HF_TOKEN environment variable not set")

    diarization_pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token=hf_token
    )
    diarization = diarization_pipeline(audio_path)

    print("Diarization complete.")

    # Step 2: Load full audio
    waveform, sr = torchaudio.load(audio_path)
    waveform = waveform[0].numpy()  # mono

    # Step 3: Load Whisper pipeline
    model_id = "openai/whisper-large-v3"
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        model_id,
        torch_dtype=torch_dtype,
        low_cpu_mem_usage=True,
        use_safetensors=True,
    )
    model.to(device)

    processor = AutoProcessor.from_pretrained(model_id)
    whisper_pipe = hf_pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        torch_dtype=torch_dtype,
        device=0 if device != "cpu" else -1,
    )

    # Step 4: Loop over segments
    segments = []

    for turn, _, speaker in diarization.itertracks(yield_label=True):
        start_sample = int(turn.start * sr)
        end_sample = int(turn.end * sr)
        audio_chunk = waveform[start_sample:end_sample]

        with NamedTemporaryFile(suffix=".wav", delete=True) as temp_wav:
            sf.write(temp_wav.name, audio_chunk, sr)
            result = whisper_pipe(temp_wav.name)

        text = result["text"].strip()
        segments.append({
            "speaker": speaker,
            "start": turn.start,
            "end": turn.end,
            "text": text
        })

    # Step 5: Write output
    with open(output_path, "w", encoding="utf-8") as f:
        for seg in segments:
            sm, ss = divmod(seg["start"], 60)
            em, es = divmod(seg["end"], 60)
            line = f"[{seg['speaker']} {int(sm):02d}:{ss:04.1f} - {int(em):02d}:{es:04.1f}]: {seg['text']}\n"
            print(line, end="")
            f.write(line)

    print(f"\n\nSpeaker-attributed transcript saved to {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python diarize_then_transcribe.py <audio_file> <output_file>")
        sys.exit(1)

    audio_path = sys.argv[1]
    output_path = sys.argv[2]

    diarize_then_transcribe(audio_path, output_path)
