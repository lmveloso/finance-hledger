"""
Password-based authentication with in-memory Bearer tokens.

Flow:
  1. Client POSTs {"password": "..."} to /api/login.
  2. Backend matches the password against `settings.users` (constant-time).
  3. On success, a random 32-byte hex token is issued and stored in `_tokens`.
  4. Clients send the token as `Authorization: Bearer <token>` on every request.

The token store is process-local. A restart logs everyone out. Persistence is a
planned follow-up (see docs/01-ESTABILIZACAO.md §9.5).
"""

from __future__ import annotations

import hmac
import secrets
from typing import Optional

from fastapi import Depends, Header, HTTPException

from app.config import Settings, get_settings

# In-memory token store: token -> username.
# Module-level so the mapping survives across requests within a process.
_tokens: dict[str, str] = {}


def verify_password(password: str, users: dict[str, str]) -> Optional[str]:
    """Return the username whose stored password matches, or None.

    Uses `hmac.compare_digest` to avoid timing attacks. Iterates all users so
    the comparison cost does not depend on user ordering.
    """
    matched: Optional[str] = None
    for username, stored in users.items():
        if hmac.compare_digest(password, stored):
            matched = username
    return matched


def issue_token(username: str) -> str:
    """Mint a fresh Bearer token for `username` and remember it."""
    token = secrets.token_hex(32)
    _tokens[token] = username
    return token


def validate_token(token: str) -> Optional[str]:
    """Return the username bound to `token`, or None if unknown/expired."""
    if not token:
        return None
    return _tokens.get(token)


def get_current_user(
    authorization: Optional[str] = Header(None),
    settings: Settings = Depends(get_settings),
) -> Optional[str]:
    """FastAPI dependency: validate the Bearer token.

    Behavior:
      - When `auth_mode == "none"` (dev), return None without checking anything.
      - Otherwise require `Authorization: Bearer <token>` and raise 401 if the
        header is missing or the token is unknown.
    """
    if settings.auth_mode == "none":
        return None
    if not authorization:
        raise HTTPException(401, "Token necessário")
    token = authorization.removeprefix("Bearer ").strip()
    user = validate_token(token)
    if not user:
        raise HTTPException(401, "Token inválido")
    return user
