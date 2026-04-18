"""Tests for Tailscale header-based auth + the auth_mode cascade."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.auth.password import _tokens, get_current_user, issue_token
from app.auth.tailscale import (
    HEADER_PROXY_SECRET,
    HEADER_USER_LOGIN,
    HEADER_USER_NAME,
    HEADER_USER_PROFILE_PIC,
    TailscaleUser,
    user_from_request,
)
from app.config import Settings


def _make_request(headers: dict[str, str] | None = None) -> Request:
    header_pairs = [
        (k.lower().encode("latin-1"), v.encode("latin-1"))
        for k, v in (headers or {}).items()
    ]
    scope = {"type": "http", "method": "GET", "path": "/", "headers": header_pairs}
    return Request(scope)


def _settings(*, auth_mode: str, proxy_secret: str | None = None) -> Settings:
    return Settings.model_construct(
        ledger_file="/tmp/fake.journal",
        hledger_path="hledger",
        cors_origins=["*"],
        auth_mode=auth_mode,
        password_lucas=None,
        password_gio=None,
        tailscale_proxy_secret=proxy_secret,
        log_level="INFO",
        log_format="json",
    )


# ── user_from_request ───────────────────────────────────────────────────────


def test_user_from_request_no_secret_reads_headers():
    req = _make_request(
        {
            HEADER_USER_LOGIN: "lucas@example.com",
            HEADER_USER_NAME: "Lucas V.",
            HEADER_USER_PROFILE_PIC: "https://cdn/avatar.png",
        }
    )
    user = user_from_request(req, _settings(auth_mode="tailscale"))
    assert isinstance(user, TailscaleUser)
    assert user.login == "lucas@example.com"
    assert user.name == "Lucas V."
    assert user.profile_pic == "https://cdn/avatar.png"
    assert user.username == "lucas"


def test_user_from_request_missing_login_returns_none():
    req = _make_request({HEADER_USER_NAME: "Nobody"})
    assert user_from_request(req, _settings(auth_mode="tailscale")) is None


def test_user_from_request_defaults_name_to_login():
    req = _make_request({HEADER_USER_LOGIN: "gio"})
    user = user_from_request(req, _settings(auth_mode="tailscale"))
    assert user is not None
    assert user.name == "gio"
    assert user.profile_pic is None
    # No '@' in login → username falls back to the whole string.
    assert user.username == "gio"


def test_user_from_request_rejects_wrong_proxy_secret():
    req = _make_request(
        {HEADER_USER_LOGIN: "lucas@example.com", HEADER_PROXY_SECRET: "wrong"}
    )
    settings = _settings(auth_mode="tailscale", proxy_secret="expected")
    assert user_from_request(req, settings) is None


def test_user_from_request_accepts_correct_proxy_secret():
    req = _make_request(
        {HEADER_USER_LOGIN: "lucas@example.com", HEADER_PROXY_SECRET: "expected"}
    )
    settings = _settings(auth_mode="tailscale", proxy_secret="expected")
    user = user_from_request(req, settings)
    assert user is not None
    assert user.login == "lucas@example.com"


def test_user_from_request_missing_proxy_secret_when_required():
    req = _make_request({HEADER_USER_LOGIN: "lucas@example.com"})
    settings = _settings(auth_mode="tailscale", proxy_secret="required")
    assert user_from_request(req, settings) is None


# ── get_current_user cascade ────────────────────────────────────────────────


def test_get_current_user_none_mode_returns_none():
    req = _make_request({})
    assert get_current_user(request=req, settings=_settings(auth_mode="none")) is None


def test_get_current_user_tailscale_mode_success():
    req = _make_request({HEADER_USER_LOGIN: "lucas@example.com"})
    user = get_current_user(request=req, settings=_settings(auth_mode="tailscale"))
    assert user == "lucas"


def test_get_current_user_tailscale_mode_missing_header_raises_401():
    req = _make_request({})
    with pytest.raises(HTTPException) as exc:
        get_current_user(request=req, settings=_settings(auth_mode="tailscale"))
    assert exc.value.status_code == 401


def test_get_current_user_tailscale_mode_wrong_secret_raises_401():
    req = _make_request(
        {HEADER_USER_LOGIN: "lucas@example.com", HEADER_PROXY_SECRET: "wrong"}
    )
    settings = _settings(auth_mode="tailscale", proxy_secret="expected")
    with pytest.raises(HTTPException) as exc:
        get_current_user(request=req, settings=settings)
    assert exc.value.status_code == 401


def test_cascade_prefers_tailscale_when_both_present():
    token = issue_token("from-password")
    try:
        req = _make_request(
            {
                HEADER_USER_LOGIN: "gio@example.com",
                "authorization": f"Bearer {token}",
            }
        )
        user = get_current_user(
            request=req, settings=_settings(auth_mode="tailscale+password")
        )
        assert user == "gio"
    finally:
        _tokens.pop(token, None)


def test_cascade_falls_back_to_password_when_tailscale_missing():
    token = issue_token("fallback-user")
    try:
        req = _make_request({"authorization": f"Bearer {token}"})
        user = get_current_user(
            request=req, settings=_settings(auth_mode="tailscale+password")
        )
        assert user == "fallback-user"
    finally:
        _tokens.pop(token, None)


def test_cascade_raises_401_when_neither_present():
    req = _make_request({})
    with pytest.raises(HTTPException) as exc:
        get_current_user(
            request=req, settings=_settings(auth_mode="tailscale+password")
        )
    assert exc.value.status_code == 401


def test_cascade_falls_back_when_tailscale_secret_fails():
    """Wrong proxy secret → Tailscale distrusted → password takes over."""
    token = issue_token("secret-fallback")
    try:
        req = _make_request(
            {
                HEADER_USER_LOGIN: "attacker@evil.com",
                HEADER_PROXY_SECRET: "wrong",
                "authorization": f"Bearer {token}",
            }
        )
        settings = _settings(auth_mode="tailscale+password", proxy_secret="expected")
        user = get_current_user(request=req, settings=settings)
        assert user == "secret-fallback"
    finally:
        _tokens.pop(token, None)
