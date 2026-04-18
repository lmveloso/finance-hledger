"""Tailscale-based authentication.

When the backend sits behind ``tailscale serve``, the proxy injects identity
headers for the authenticated tailnet user:

  - ``Tailscale-User-Login``        → email/handle (e.g. lucas@example.com)
  - ``Tailscale-User-Name``         → display name
  - ``Tailscale-User-Profile-Pic``  → avatar URL (optional)

These headers MUST be trusted only when the request actually came through the
proxy. We validate trust via a shared secret header
``X-Tailscale-Proxy-Secret`` compared against ``settings.tailscale_proxy_secret``
using a constant-time comparison. If the secret is not configured, the headers
are accepted as-is (convenient for dev, but document this trade-off).
"""

from __future__ import annotations

import hmac
from dataclasses import dataclass
from typing import Optional

from starlette.requests import Request

from app.config import Settings

HEADER_USER_LOGIN = "Tailscale-User-Login"
HEADER_USER_NAME = "Tailscale-User-Name"
HEADER_USER_PROFILE_PIC = "Tailscale-User-Profile-Pic"
HEADER_PROXY_SECRET = "X-Tailscale-Proxy-Secret"


@dataclass(frozen=True)
class TailscaleUser:
    """Identity extracted from Tailscale-injected headers."""

    login: str
    name: str
    profile_pic: Optional[str] = None

    @property
    def username(self) -> str:
        """Stable identifier used by the rest of the app.

        Returns the local part of the email if possible, otherwise the full
        login string.
        """
        return self.login.split("@", 1)[0] if "@" in self.login else self.login


def _proxy_secret_ok(request: Request, expected: Optional[str]) -> bool:
    """Validate the ``X-Tailscale-Proxy-Secret`` header.

    Returns ``True`` when either no secret is configured (trust-all dev mode)
    or the inbound header matches ``expected`` under constant-time comparison.
    """
    if not expected:
        return True
    provided = request.headers.get(HEADER_PROXY_SECRET, "")
    return hmac.compare_digest(provided, expected)


def user_from_request(
    request: Request, settings: Settings
) -> Optional[TailscaleUser]:
    """Extract the Tailscale user from request headers, if trusted.

    Returns ``None`` if the proxy secret check fails or the login header is
    missing. Never raises — callers decide how to translate ``None`` to HTTP.
    """
    if not _proxy_secret_ok(request, settings.tailscale_proxy_secret):
        return None
    login = request.headers.get(HEADER_USER_LOGIN, "").strip()
    if not login:
        return None
    name = request.headers.get(HEADER_USER_NAME, "").strip() or login
    profile_pic = request.headers.get(HEADER_USER_PROFILE_PIC, "").strip() or None
    return TailscaleUser(login=login, name=name, profile_pic=profile_pic)
