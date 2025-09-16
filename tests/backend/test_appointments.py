# This tests:
# 1. Successful fetch → returns a list of appointments.
# 2. Error in DB call → returns HTTP 500.

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.mark.asyncio
async def test_get_user_appointments_success(monkeypatch):
    fake_appointments = [
        {"id": 1, "patientName": "Linda Lou", "doctorName": "Dr. John Smith", "date": "2025-08-19", "time": "09:00"}
    ]

    def fake_get_appointments_by_user(user_id, is_dummy=None):
        return fake_appointments

    monkeypatch.setattr("backend.main.get_appointments_by_user", fake_get_appointments_by_user)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/appointments/user/123")

    assert response.status_code == 200
    data = response.json()
    assert "appointments" in data
    assert len(data["appointments"]) == 1
    assert data["appointments"][0]["patientName"] == "Linda Lou"


@pytest.mark.asyncio
async def test_get_user_appointments_failure(monkeypatch):
    def fake_get_appointments_by_user(user_id, is_dummy=None):
        raise Exception("DB error")

    monkeypatch.setattr("backend.main.get_appointments_by_user", fake_get_appointments_by_user)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/appointments/user/123")

    assert response.status_code == 500
    assert response.json()["detail"] == "Error fetching appointments"
