"""
FastAPI dependency injection.

Import these in route modules via Depends().
Never instantiate clients directly in route handlers.

Note: `get_current_user` and `_tokens` are re-exported from
`app.auth.password` so existing imports (`from app.deps import
get_current_user`) keep working while the real implementation lives
in the auth package.
"""

from app.auth.password import _tokens, get_current_user

__all__ = ["_tokens", "get_current_user"]
