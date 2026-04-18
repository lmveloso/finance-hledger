"""Authentication package.

Re-exports the password-based Bearer token flow so callers can import from
`app.auth` directly without knowing the submodule layout.
"""

from app.auth.password import (
    _tokens,
    get_current_user,
    issue_token,
    validate_token,
    verify_password,
)

__all__ = [
    "_tokens",
    "get_current_user",
    "issue_token",
    "validate_token",
    "verify_password",
]
