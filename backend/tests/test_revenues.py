"""Tests for GET /api/revenues."""


def test_revenues_returns_200(client):
    r = client.get("/api/revenues?month=2026-03")
    assert r.status_code == 200


def test_revenues_has_required_fields(client):
    r = client.get("/api/revenues?month=2026-03")
    data = r.json()
    assert "month" in data
    assert "revenues" in data
    assert "total" in data
    assert isinstance(data["revenues"], list)


def test_revenues_month_optional_defaults_to_current(client):
    r = client.get("/api/revenues")
    assert r.status_code == 200
    data = r.json()
    assert "month" in data


def test_revenues_invalid_month_returns_422(client):
    r = client.get("/api/revenues?month=invalid")
    assert r.status_code == 422
