"""Password-based authentication with in-memory Bearer tokens.

Flow:
  1. Client POSTs {"password": "..."} to /api/login.
  2. Backend matches the password against `settings.users` (constant-time).
  3. On success, a random 32-byte hex token is issued and stored in `_tokens`.
  4. Clients send the token as `Authorization: Bearer <token>` on every request.

The token store is process-local. A restart logs everyone out. Persistence is a
planned follow-up (see docs/01-ESTABILIZACAO.md §9.5).

`get_current_user` routes to the right auth backend based on
``settings.auth_mode`` (password, tailscale, tailscale+password, none).
"""

from __future__ import annotations

import hmac
import secrets
from typing import Optional

from fastapi import Depends, HTTPException, Request

from app.auth.tailscale import user_from_request as _tailscale_user
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


def _bearer_user(request: Request) -> Optional[str]:
    """Resolve the current user from the Authorization header (if any)."""
    header = request.headers.get("authorization")
    if not header:
        return None
    token = header.removeprefix("Bearer ").strip()
    return validate_token(token)


def get_current_user(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> Optional[str]:
    """FastAPI dependency: resolve the current user per ``auth_mode``.

    Modes:
      - ``none``                → returns ``None`` unconditionally (dev).
      - ``password``            → requires valid Bearer token.
      - ``tailscale``           → requires trusted Tailscale headers.
      - ``tailscale+password``  → tries Tailscale first, falls back to Bearer.

    Raises ``HTTPException(401)`` when no valid identity can be resolved in a
    mode that requires authentication.
    """
    mode = settings.auth_mode

    if mode == "none":
        return None

    if mode == "password":
        user = _bearer_user(request)
        if user is None:
            if not request.headers.get("authorization"):
                raise HTTPException(401, "Token necessário")
            raise HTTPException(401, "Token inválido")
        return user

    if mode == "tailscale":
        ts = _tailscale_user(request, settings)
        if ts is None:
            raise HTTPException(401, "Tailscale identity required")
        return ts.username

    if mode == "tailscale+password":
        ts = _tailscale_user(request, settings)
        if ts is not None:
            return ts.username
        user = _bearer_user(request)
        if user is None:
            raise HTTPException(401, "Authentication required")
        return user

    # Unknown mode — fail closed.
    raise HTTPException(401, "Unsupported auth mode")
