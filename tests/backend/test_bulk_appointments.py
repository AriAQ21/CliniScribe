# tests/backend/test_bulk_appointments.py
# Tests the /appointments/bulk endpoint against the current implementation:
# - success (inserts 1)
# - duplicate handling (1 duplicate skipped, 1 inserted)
# - missing user_id error
# - validation error with user_id present
# - empty list
# - server error (simulated failure in get_supabase_client)

import pytest
from types import SimpleNamespace
from httpx import AsyncClient, ASGITransport
from backend.main import app


# --- Tiny fakes for Supabase client chains ---

class FakeAppointmentsTable:
    def __init__(self, scenario):
        self.scenario = scenario
        self._last_op = None
        self._insert_payload = None
        # Pre-canned "existing" rows for duplicate detection
        # These must match the endpoint's tuple logic exactly.
        self._existing = [
            {
                "patient_name": "John Doe",
                "room": "Room 1",
                "appointment_date": "2024-01-15",
                "appointment_time": "09:00",
                "meeting_type": "GP",
                "is_dummy": False,
            }
        ] if scenario == "duplicate" else []

    # select chain
    def select(self, *_args, **_kwargs):
        self._last_op = "select"
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def single(self):
        # not used on appointments table
        return self

    # insert chain
    def insert(self, payload):
        self._last_op = "insert"
        self._insert_payload = payload
        return self

    def execute(self):
        if self._last_op == "select":
            # Return existing appointments list for duplicate detection
            return SimpleNamespace(data=self._existing)
        elif self._last_op == "insert":
            if self.scenario == "db_error_inline_insert":
                # This exception is caught inside the endpoint and reported as insert_errors,
                # not as a 500. We only use this scenario if we specifically test that branch.
                raise Exception("Database connection failed")
            # Return truthy data to count as inserted
            return SimpleNamespace(data=[{"id": 1}])
        else:
            return SimpleNamespace(data=None)


class FakeUsersTable:
    def __init__(self):
        self._single = False

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def single(self):
        self._single = True
        return self

    def execute(self):
        # Return a valid user row
        return SimpleNamespace(data={"first_name": "Greg", "last_name": "House", "location": "Room 1"})


class FakeSupabase:
    def __init__(self, scenario="success"):
        self.scenario = scenario

    def table(self, name: str):
        if name == "users":
            return FakeUsersTable()
        if name == "appointments":
            return FakeAppointmentsTable(self.scenario)
        # default
        return SimpleNamespace(
            select=lambda *a, **k: SimpleNamespace(eq=lambda *a, **k: SimpleNamespace(execute=lambda: SimpleNamespace(data=None)))
        )


@pytest.mark.asyncio
async def test_bulk_appointments_success(monkeypatch):
    # Patch get_supabase_client to our fake
    monkeypatch.setattr("backend.main.get_supabase_client", lambda: FakeSupabase("success"))

    # NOTE: endpoint expects patientName/date/time keys (frontend shape) + user_id
    appointments_data = [
        {
            "patientName": "John Doe",
            "date": "2024-01-15",
            "time": "09:00",
            # meetingType is optional (defaults to "GP")
        }
    ]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/appointments/bulk", json={"user_id": 123, "appointments": appointments_data})

    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 1
    assert data["duplicates_skipped"] == 0
    assert data["validation_errors"] == 0
    assert data["insert_errors"] == 0


@pytest.mark.asyncio
async def test_bulk_appointments_duplicate_handling(monkeypatch):
    # This fake returns one existing appointment that matches "John Doe" @ 09:00 (duplicate)
    monkeypatch.setattr("backend.main.get_supabase_client", lambda: FakeSupabase("duplicate"))

    appointments_data = [
        {  # duplicate of existing
            "patientName": "John Doe",
            "date": "2024-01-15",
            "time": "09:00",
        },
        {  # new appointment
            "patientName": "Jane Doe",
            "date": "2024-01-15",
            "time": "10:00",
        },
    ]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/appointments/bulk", json={"user_id": 123, "appointments": appointments_data})

    assert response.status_code == 200
    data = response.json()
    # Expect 1 inserted (Jane Doe), 1 duplicate skipped (John Doe)
    assert data["imported"] == 1
    assert data["duplicates_skipped"] == 1


@pytest.mark.asyncio
async def test_bulk_appointments_missing_user_id_returns_400():
    # Missing user_id returns 400 "User ID is required"
    appointments_data = [{"patientName": "John Doe", "date": "2024-01-15", "time": "09:00"}]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/appointments/bulk", json={"appointments": appointments_data})

    assert response.status_code == 400
    assert response.json()["detail"].lower() == "user id is required"


@pytest.mark.asyncio
async def test_bulk_appointments_validation_error_fields(monkeypatch):
    # Provide user_id but invalid appointment object (missing patientName/time)
    monkeypatch.setattr("backend.main.get_supabase_client", lambda: FakeSupabase("success"))

    invalid_appointments = [
        {
            # "patientName" missing
            "date": "2024-01-15",
            # "time" missing -> triggers validation errors and no valid appointments
        }
    ]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/appointments/bulk", json={"user_id": 123, "appointments": invalid_appointments})

    assert response.status_code == 400
    assert "validation" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_bulk_appointments_empty_list():
    # Endpoint checks this first and returns 400
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/appointments/bulk", json={"user_id": 123, "appointments": []})

    assert response.status_code == 400
    assert "no appointments" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_bulk_appointments_server_error(monkeypatch):
    # Simulate a failure BEFORE any inner insert try/except, so the endpoint returns HTTP 500.
    def boom():
        raise Exception("Database connection failed")

    monkeypatch.setattr("backend.main.get_supabase_client", boom)

    appointments_data = [
        {
            "patientName": "John Doe",
            "date": "2024-01-15",
            "time": "09:00",
        }
    ]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/appointments/bulk", json={"user_id": 123, "appointments": appointments_data})

    assert response.status_code == 500
    assert "server error" in response.json()["detail"].lower()
