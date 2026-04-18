"""
App configuration via Pydantic Settings.

All config comes from environment variables (or .env file).
Never import LEDGER_FILE or HLEDGER directly — use get_settings().
"""

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ledger_file: Path = Field(
        default=Path.home() / "finances" / "2026.journal",
        description="Path to hledger journal file",
    )
    hledger_path: str = Field(
        default="hledger",
        description="Path to hledger binary",
    )
    cors_origins: list[str] = Field(
        default=["*"],
        description="Allowed CORS origins (comma-separated in env)",
    )
    auth_mode: Literal["password", "tailscale", "tailscale+password", "none"] = (
        Field(
            default="none",
            description=(
                "Authentication mode. Production should use 'password', "
                "'tailscale', or 'tailscale+password' (Tailscale headers "
                "first, Bearer token as fallback). 'none' is for local dev."
            ),
        )
    )
    password_lucas: str | None = Field(
        default=None,
        alias="PASSWORD_LUCAS",
    )
    password_gio: str | None = Field(
        default=None,
        alias="PASSWORD_GIO",
    )
    tailscale_proxy_secret: str | None = Field(
        default=None,
        alias="TAILSCALE_PROXY_SECRET",
        description=(
            "Shared secret sent by the Tailscale reverse proxy as "
            "X-Tailscale-Proxy-Secret. When set, incoming Tailscale headers "
            "are trusted only if this header matches."
        ),
    )
    log_level: str = Field(default="INFO")
    log_format: Literal["json", "console"] = Field(
        default="json",
        description="Structured log output format. 'console' for local dev.",
    )
    principles_file: Path = Field(
        default=Path(__file__).parent / "principles" / "principles.default.json",
        description=(
            "JSON mapping of category → principle (ADR-008). Env override: "
            "PRINCIPLES_FILE=/custom/path.json."
        ),
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_nested_delimiter="__",
        extra="ignore",
    )

    @property
    def users(self) -> dict[str, str]:
        """Build users dict from individual password fields."""
        u = {}
        if self.password_lucas:
            u["lucas"] = self.password_lucas
        if self.password_gio:
            u["gio"] = self.password_gio
        return u


# Singleton — FastAPI Depends overrides this in tests.
_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reset_settings() -> None:
    """Call in tests to force re-read of env."""
    global _settings
    _settings = None
