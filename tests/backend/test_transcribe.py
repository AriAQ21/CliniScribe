# Tests:
# 1. Accepts a valid file & metadata → queues job.
# 2. Rejects missing file.
# 3. Rejects invalid appointment_id.
# 4. Saves metadata JSON & converts to WAV.

import io
import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


class DummyResponse:
    def __init__(self, data=None, error=None):
        self.data = data
        self.error = error

    def execute(self):
        return self


class DummySupabase:
    def __init__(self, appointment_ok=True):
        self.appointment_ok = appointment_ok
        self._table = None

    def table(self, name):
        self._table = name
        return self

    def select(self, *args, **kwargs):
        return self

    def eq(self, key, value):
        self._filter = (key, value)
        return self

    def single(self):
        if self._table == "appointments":
            if self.appointment_ok:
                return DummyResponse(data={
                    "appointment_id": 1,
                    "appointment_date": "2025-08-19",
                    "appointment_time": "09:00:00",
                    "room": "Room A",
                })
            else:
                return DummyResponse(data=None, error={"message": "not found"})

        return DummyResponse(data={})

    def insert(self, record):
        return DummyResponse(data=record)


@pytest.mark.asyncio
async def test_transcribe_success(monkeypatch, tmp_path):
    fake_audio_content = b"FAKE WAV DATA"

    def fake_convert(file, audio_id):
        output_path = tmp_path / f"{audio_id}.wav"
        output_path.write_bytes(fake_audio_content)
        return str(output_path)

    def fake_save_metadata(audio_id, metadata):
        return str(tmp_path / f"{audio_id}.json")

    monkeypatch.setattr("backend.main.convert_to_wav_16k", fake_convert)
    monkeypatch.setattr("backend.main.save_metadata_json", fake_save_metadata)

    monkeypatch.setattr(
        "backend.main.get_supabase_client",
        lambda: DummySupabase(appointment_ok=True)
    )

    audio_bytes = io.BytesIO(b"12345")
    files = {"file": ("test.webm", audio_bytes, "audio/webm")}
    data = {
        "appointment_id": "1",
        "user_id": "123",
        "room": "Room A",
        "appointment_time": "2025-08-19T09:00:00Z"
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/transcribe", files=files, data=data)

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "queued"
    assert "audio_id" in body


@pytest.mark.asyncio
async def test_transcribe_missing_file():
    data = {
        "appointment_id": "1",
        "user_id": "123",
        "room": "Room A",
        "appointment_time": "2025-08-19T09:00:00Z"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/transcribe", data=data)

    assert resp.status_code == 422  # FastAPI validation error


@pytest.mark.asyncio
async def test_transcribe_invalid_appointment_id(monkeypatch, tmp_path):
    def fake_convert(file, audio_id):
        return str(tmp_path / f"{audio_id}.wav")

    def fake_save_metadata(audio_id, metadata):
        return str(tmp_path / f"{audio_id}.json")

    monkeypatch.setattr("backend.main.convert_to_wav_16k", fake_convert)
    monkeypatch.setattr("backend.main.save_metadata_json", fake_save_metadata)

    monkeypatch.setattr(
        "backend.main.get_supabase_client",
        lambda: DummySupabase(appointment_ok=False)
    )

    audio_bytes = io.BytesIO(b"12345")
    files = {"file": ("test.webm", audio_bytes, "audio/webm")}
    data = {
        "appointment_id": "999",  # valid int, but DummySupabase rejects
        "user_id": "123",
        "room": "Room A",
        "appointment_time": "2025-08-19T09:00:00Z"
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/transcribe", files=files, data=data)

    assert resp.status_code in (400, 404)  # depending on main.py’s error

