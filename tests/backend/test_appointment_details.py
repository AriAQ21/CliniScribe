# This tests getting appointment details
# It covers success, not found, and invalid ID cases.
import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.mark.asyncio
async def test_get_appointment_details_success(monkeypatch):
    fake_appointment = {
        "appointment_id": 1,
        "patient_name": "Sarah Johnson",
        "room": "Room A",
        "appointment_date": "2025-08-19",
        "appointment_time": "09:00:00",
        "user_id": 123,
        "doctor_name": "Dr. John Smith",  # Derived from users table
        "doctor_first_name": "John",
        "doctor_last_name": "Smith"
    }

    def fake_get_appointment_by_id(appointment_id: int):
        return fake_appointment

    monkeypatch.setattr("backend.main.get_appointment_by_id", fake_get_appointment_by_id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/appointments/1/details")

    assert response.status_code == 200
    data = response.json()
    assert data["patient_name"] == "Sarah Johnson"
    assert data["doctor_name"] == "Dr. John Smith"


@pytest.mark.asyncio
async def test_get_appointment_details_not_found(monkeypatch):
    def fake_get_appointment_by_id(appointment_id: int):
        return None

    monkeypatch.setattr("backend.main.get_appointment_by_id", fake_get_appointment_by_id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/appointments/999/details")

    assert response.status_code == 404
    assert response.json()["detail"] == "Appointment not found"


@pytest.mark.asyncio
async def test_get_appointment_details_invalid_id():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/appointments/invalid/details")

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid appointment ID"
