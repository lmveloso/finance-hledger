"""
FastAPI dependency injection.

Import these in route modules via Depends().
Never instantiate clients directly in route handlers.
"""

from typing import Optional

from fastapi import Depends, Header, HTTPException

from app.config import Settings, get_settings

# Token store — in-memory, survives until process restart.
# Will be migrated to SQLite in a later PR.
_tokens: dict[str, str] = {}  # token -> username


def get_current_user(
    authorization: Optional[str] = Header(None),
    settings: Settings = Depends(get_settings),
) -> Optional[str]:
    """Validate Bearer token. Returns username or None if auth disabled."""
    if settings.auth_mode == "none":
        return None
    if not authorization:
        raise HTTPException(401, "Token necessário")
    token = authorization.removeprefix("Bearer ").strip()
    user = _tokens.get(token)
    if not user:
        raise HTTPException(401, "Token inválido")
    return user
