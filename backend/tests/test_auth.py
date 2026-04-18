"""Tests for password-based Bearer auth (app.auth.password + /api/login)."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import HTTPException

from app.auth.password import (
    _tokens,
    get_current_user,
    issue_token,
    validate_token,
    verify_password,
)
from app.config import Settings, get_settings


# ── verify_password ─────────────────────────────────────────────────────────


def test_verify_password_success_returns_username():
    users = {"lucas": "hunter2", "gio": "correct-horse"}
    assert verify_password("hunter2", users) == "lucas"
    assert verify_password("correct-horse", users) == "gio"


def test_verify_password_failure_returns_none():
    users = {"lucas": "hunter2"}
    assert verify_password("wrong", users) is None
    assert verify_password("", users) is None
    assert verify_password("hunter2", {}) is None


# ── issue_token ─────────────────────────────────────────────────────────────


def test_issue_token_shape_and_registration():
    token = issue_token("lucas")
    try:
        # 32 bytes hex => 64 chars of [0-9a-f]
        assert isinstance(token, str)
        assert len(token) == 64
        assert all(c in "0123456789abcdef" for c in token)
        # And it is now retrievable from the store.
        assert _tokens[token] == "lucas"
    finally:
        _tokens.pop(token, None)


# ── validate_token ──────────────────────────────────────────────────────────


def test_validate_token_success_and_unknown():
    token = issue_token("gio")
    try:
        assert validate_token(token) == "gio"
    finally:
        _tokens.pop(token, None)

    # Empty and unknown tokens return None without raising.
    assert validate_token("") is None
    assert validate_token("deadbeef" * 8) is None
    # After removal, the same token is "expired" from the store's point of view.
    assert validate_token(token) is None


# ── get_current_user ────────────────────────────────────────────────────────


def _password_settings() -> Settings:
    """Build a Settings instance in password mode, bypassing env parsing."""
    return Settings.model_construct(
        ledger_file="/tmp/fake.journal",
        hledger_path="hledger",
        cors_origins=["*"],
        auth_mode="password",
        password_lucas=None,
        password_gio=None,
        log_level="INFO",
    )


def test_get_current_user_valid_bearer_returns_username():
    settings = _password_settings()
    token = issue_token("lucas")
    try:
        user = get_current_user(
            authorization=f"Bearer {token}", settings=settings
        )
        assert user == "lucas"
    finally:
        _tokens.pop(token, None)


def test_get_current_user_missing_header_raises_401():
    settings = _password_settings()
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization=None, settings=settings)
    assert exc.value.status_code == 401


def test_get_current_user_invalid_token_raises_401():
    settings = _password_settings()
    with pytest.raises(HTTPException) as exc:
        get_current_user(authorization="Bearer not-a-real-token", settings=settings)
    assert exc.value.status_code == 401


# ── End-to-end: POST /api/login through the FastAPI app ─────────────────────


@pytest.fixture
def login_client(client):
    """Flip the app into password mode with a known user for one test."""
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
            log_level="INFO",
        )

    overrides[get_settings] = override_settings
    try:
        yield client
    finally:
        # Restore previous state and drop any tokens this test created.
        if original is None:
            overrides.pop(get_settings, None)
        else:
            overrides[get_settings] = original
        _tokens.clear()


def test_login_flow_issues_token_and_rejects_wrong_password(login_client):
    # Wrong password → 401.
    bad = login_client.post("/api/login", json={"password": "nope"})
    assert bad.status_code == 401

    # Correct password → 200 with {token, user}; token unlocks /api/summary.
    ok = login_client.post("/api/login", json={"password": "s3cret"})
    assert ok.status_code == 200
    payload = ok.json()
    assert payload["user"] == "lucas"
    assert isinstance(payload["token"], str) and len(payload["token"]) == 64

    token = payload["token"]
    # Without token → 401.
    assert login_client.get("/api/summary?month=2026-01").status_code == 401
    # With token → 200.
    authed = login_client.get(
        "/api/summary?month=2026-01",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert authed.status_code == 200
