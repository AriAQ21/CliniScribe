import requests
import json
import os

def run_model(audio_path: str) -> dict:
    """Send audio file path to model service for transcription"""
    try:
        # Send file path to model service instead of uploading file again
        payload = {"audio_path": audio_path}
        # Use Docker service name for container communication
        model_url = os.getenv("MODEL_API_URL", "http://localhost:5005")
        response = requests.post(
            f"{model_url}/transcribe", 
            json=payload,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            data = response.json()
            if "transcript" in data:
                return {"transcript": data["transcript"]}
            else:
                raise RuntimeError(f"Unexpected response format: {data}")
        else:
            raise RuntimeError(f"Model API error {response.status_code}: {response.text}")

    except Exception as e:
        raise RuntimeError(f"Failed to call model API: {str(e)}")
