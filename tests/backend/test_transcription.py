# tests/backend/test_transcription.py
# Tests:
# GET /transcribe/text/{audio_id} → returns transcript if exists.
# GET /transcribe/text/{audio_id} → 404 if not found.
# POST /transcribe/update/{audio_id} → saves transcript update.
# POST /transcribe/update/{audio_id} → current backend returns 500 if new_text is missing or empty.

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_get_transcript_success(monkeypatch):
    def fake_load_transcript(audio_id):
        return "Fake transcript text"

    monkeypatch.setattr("backend.main.load_transcript", fake_load_transcript)

    response = client.get("/transcribe/text/test123")
    assert response.status_code == 200
    assert response.json()["transcript"] == "Fake transcript text"


def test_get_transcript_not_found(monkeypatch):
    def fake_load_transcript(audio_id):
        return None

    monkeypatch.setattr("backend.main.load_transcript", fake_load_transcript)

    response = client.get("/transcribe/text/doesnotexist")
    assert response.status_code == 404


def test_update_transcript_success(monkeypatch):
    saved_texts = {}

    def fake_save_transcript(*args, **kwargs):
        audio_id, new_text = args[0], args[1]
        saved_texts[audio_id] = new_text

    monkeypatch.setattr("backend.main.save_transcript", fake_save_transcript)
    monkeypatch.setattr("backend.main.update_metadata_json", lambda a, b: None)

    response = client.post(
        "/transcribe/update/test123",
        data={"new_text": "Updated transcript"},
    )
    assert response.status_code == 200
    assert saved_texts["test123"] == "Updated transcript"


def test_update_transcript_missing_text():
    response = client.post(
        "/transcribe/update/test123",
        data={},  # no new_text
    )
    # Current backend behavior: 500 with detail mentioning "Missing new_text"
    assert response.status_code == 500
    assert "missing new_text" in response.json().get("detail", "").lower()


def test_update_transcript_empty_text(monkeypatch):
    saved_texts = {}

    def fake_save_transcript(*args, **kwargs):
        audio_id, new_text = args[0], args[1]
        saved_texts[audio_id] = new_text

    monkeypatch.setattr("backend.main.save_transcript", fake_save_transcript)
    monkeypatch.setattr("backend.main.update_metadata_json", lambda a, b: None)

    response = client.post(
        "/transcribe/update/test123",
        data={"new_text": ""},  # empty string
    )
    # Current backend behavior: 500 with detail mentioning "Missing new_text"
    assert response.status_code == 500
    assert "missing new_text" in response.json().get("detail", "").lower()


def test_update_transcript_special_characters(monkeypatch):
    saved_texts = {}

    def fake_save_transcript(*args, **kwargs):
        audio_id, new_text = args[0], args[1]
        saved_texts[audio_id] = new_text

    monkeypatch.setattr("backend.main.save_transcript", fake_save_transcript)
    monkeypatch.setattr("backend.main.update_metadata_json", lambda a, b: None)

    special_text = "Test with special chars: áéíóú, 中文, emoji 🎉"
    response = client.post(
        "/transcribe/update/test123",
        data={"new_text": special_text},
    )
    assert response.status_code == 200
    assert saved_texts["test123"] == special_text
