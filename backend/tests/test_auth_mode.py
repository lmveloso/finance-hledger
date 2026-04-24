"""Tests for GET /api/auth/mode (PR-AS3)."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from app.auth.password import _tokens
from app.config import Settings, get_settings


def _settings_for(mode: str) -> Settings:
    """Build a Settings stub for the given auth mode, bypassing env parsing."""
    return Settings.model_construct(
        ledger_file="/tmp/fake.journal",
        hledger_path="hledger",
        cors_origins=["*"],
        auth_mode=mode,
        password_lucas=None,
        password_gio=None,
        tailscale_proxy_secret=None,
        log_level="INFO",
        log_format="json",
    )


@pytest.fixture
def mode_client(client):
    """Yield the shared TestClient after installing a swappable settings override.

    The override reads ``current_mode`` on each call, so a single test can flip
    modes without rebuilding the fixture.
    """
    import main as main_mod

    overrides = main_mod.app.dependency_overrides
    original = overrides.get(get_settings)

    state = {"mode": "none"}

    def override_settings():
        return _settings_for(state["mode"])

    overrides[get_settings] = override_settings
    try:
        yield client, state
    finally:
        if original is None:
            overrides.pop(get_settings, None)
        else:
            overrides[get_settings] = original
        _tokens.clear()


@pytest.mark.parametrize(
    "mode",
    ["none", "password", "tailscale", "tailscale+password"],
)
def test_auth_mode_reports_configured_mode(mode_client, mode):
    """Endpoint returns 200 + correct shape in every auth mode, no Bearer needed."""
    client, state = mode_client
    state["mode"] = mode

    # No Authorization header is sent — the endpoint must be unauthenticated.
    resp = client.get("/api/auth/mode")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["mode"] == mode
    assert payload["required"] is (mode != "none")


def test_auth_mode_is_public_while_other_routes_stay_protected(mode_client):
    """In password mode, /api/auth/mode is open but /api/summary still 401s."""
    client, state = mode_client
    state["mode"] = "password"

    # Public discovery endpoint — no token, still 200.
    mode_resp = client.get("/api/auth/mode")
    assert mode_resp.status_code == 200
    assert mode_resp.json() == {"mode": "password", "required": True}

    # Same client, no token → protected route must reject.
    summary_resp = client.get("/api/summary?month=2026-01")
    assert summary_resp.status_code == 401
