"""Tests for GET /api/revenues."""

from datetime import date

import pytest

from app.auth.password import _tokens
from app.config import Settings, get_settings


# ── Basic behavior ──────────────────────────────────────────────────────────


def test_revenues_returns_200_for_month_with_revenues(client):
    # The shared fixture journal has one income entry on 2026-03-01 (12000).
    r = client.get("/api/revenues?month=2026-03")
    assert r.status_code == 200
    data = r.json()
    assert data["month"] == "2026-03"
    assert isinstance(data["revenues"], list)
    assert isinstance(data["total"], (int, float))


def test_revenues_total_matches_sum(client):
    r = client.get("/api/revenues?month=2026-03")
    data = r.json()
    expected_total = round(sum(row["amount"] for row in data["revenues"]), 2)
    assert data["total"] == expected_total
    # Fixture has a single 12000 salary in March.
    assert data["total"] == 12000.00
    assert len(data["revenues"]) == 1
    row = data["revenues"][0]
    assert row["date"] == "2026-03-01"
    assert row["amount"] == 12000.00
    assert "descricao" not in row  # English keys
    assert row["description"] == "Salario"


def test_revenues_item_shape(client):
    r = client.get("/api/revenues?month=2026-03")
    data = r.json()
    for row in data["revenues"]:
        assert set(row.keys()) == {"date", "description", "amount"}
        assert isinstance(row["date"], str)
        assert len(row["date"]) == 10
        assert isinstance(row["description"], str)
        assert isinstance(row["amount"], (int, float))
        assert row["amount"] >= 0


def test_revenues_sorted_by_date_ascending(client):
    r = client.get("/api/revenues?month=2026-03")
    data = r.json()
    dates = [row["date"] for row in data["revenues"]]
    assert dates == sorted(dates)


# ── Empty months ────────────────────────────────────────────────────────────


def test_revenues_empty_month_returns_empty_list(client):
    # January 2026 has only expenses in the fixture.
    r = client.get("/api/revenues?month=2026-01")
    assert r.status_code == 200
    data = r.json()
    assert data["month"] == "2026-01"
    assert data["revenues"] == []
    assert data["total"] == 0.0


def test_revenues_month_with_no_transactions(client):
    # 2025-01 has no transactions at all in the fixture.
    r = client.get("/api/revenues?month=2025-01")
    assert r.status_code == 200
    data = r.json()
    assert data["revenues"] == []
    assert data["total"] == 0.0


# ── Default month ───────────────────────────────────────────────────────────


def test_revenues_defaults_to_current_month_when_omitted(client):
    r = client.get("/api/revenues")
    assert r.status_code == 200
    data = r.json()
    assert data["month"] == date.today().strftime("%Y-%m")


# ── Invalid month → 422 ─────────────────────────────────────────────────────


def test_revenues_rejects_invalid_month_literal(client):
    r = client.get("/api/revenues?month=abc")
    assert r.status_code == 422


def test_revenues_rejects_invalid_month_number(client):
    r = client.get("/api/revenues?month=2026-13")
    assert r.status_code == 422


def test_revenues_rejects_short_month(client):
    r = client.get("/api/revenues?month=2026-1")
    assert r.status_code == 422


# ── Auth ────────────────────────────────────────────────────────────────────


@pytest.fixture
def password_client(client):
    """Flip the app into password mode for auth tests.

    Mirrors the login_client fixture in test_auth.py: overrides get_settings
    via dependency_overrides, clears tokens on teardown.
    """
    import main as main_mod

    overrides = main_mod.app.dependency_overrides
    original = overrides.get(get_settings)

    def override_settings():
        return Settings.model_construct(
            ledger_file=main_mod.LEDGER_FILE,
            hledger_path="hledger",
            cors_origins=["*"],
            auth_mode="password",
            password_lucas="s3cret",
            password_gio=None,
            tailscale_proxy_secret=None,
            log_level="INFO",
            log_format="json",
        )

    overrides[get_settings] = override_settings
    try:
        yield client
    finally:
        if original is None:
            overrides.pop(get_settings, None)
        else:
            overrides[get_settings] = original
        _tokens.clear()


def test_revenues_requires_auth_in_password_mode(password_client):
    r = password_client.get("/api/revenues?month=2026-03")
    assert r.status_code == 401


def test_revenues_accepts_valid_bearer_token(password_client):
    login = password_client.post("/api/login", json={"password": "s3cret"})
    assert login.status_code == 200
    token = login.json()["token"]

    r = password_client.get(
        "/api/revenues?month=2026-03",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["month"] == "2026-03"
