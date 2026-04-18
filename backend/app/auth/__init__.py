"""Authentication package.

Re-exports the public surface so callers can import from ``app.auth`` directly
without knowing which submodule implements which flow.
"""

from app.auth.password import (
    _tokens,
    get_current_user,
    issue_token,
    validate_token,
    verify_password,
)
from app.auth.tailscale import TailscaleUser, user_from_request

__all__ = [
    "_tokens",
    "get_current_user",
    "issue_token",
    "validate_token",
    "verify_password",
    "TailscaleUser",
    "user_from_request",
]
