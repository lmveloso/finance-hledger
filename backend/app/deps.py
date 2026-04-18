"""
FastAPI dependency injection.

Import these in route modules via Depends().
Never instantiate clients directly in route handlers.

Note: `get_current_user` and `_tokens` are re-exported from
`app.auth.password` so existing imports (`from app.deps import
get_current_user`) keep working while the real implementation lives
in the auth package.
"""

from __future__ import annotations

from functools import lru_cache

from fastapi import Depends, HTTPException

from app.auth.password import _tokens, get_current_user
from app.config import Settings, get_settings
from app.principles.errors import PrincipleError
from app.principles.mappings import load_mapping
from app.principles.service import PrincipleService

__all__ = [
    "_tokens",
    "get_current_user",
    "get_principle_service",
]


@lru_cache(maxsize=1)
def _load_default_mapping(path_str: str):
    """Cache the factory mapping by absolute path.

    Keyed on the path string so env/settings overrides create a fresh entry
    without mutating the cached value.
    """
    from pathlib import Path

    return load_mapping(Path(path_str))


def get_principle_service(
    settings: Settings = Depends(get_settings),
) -> PrincipleService:
    """Build a PrincipleService for the current request.

    The hledger client mirrors the one ``main.py`` constructs at startup;
    rebuilding per-request is cheap (no state, no connection). The mapping
    is cached across requests via ``_load_default_mapping``.
    """
    from app.hledger.client import HledgerClient

    try:
        mapping = _load_default_mapping(str(settings.principles_file))
    except PrincipleError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"principles mapping failed to load: {exc}",
        ) from exc

    client = HledgerClient(
        ledger_file=settings.ledger_file, binary=settings.hledger_path
    )
    return PrincipleService(client=client, mapping=mapping)
