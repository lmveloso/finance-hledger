"""
Typed exceptions for hledger operations.

Use these instead of HTTPException so the client is reusable
from workers, scripts, and tests without FastAPI coupling.
"""


class HledgerError(Exception):
    """Base exception for hledger operations."""


class HledgerNotFound(HledgerError):
    """hledger binary not found."""


class HledgerTimeout(HledgerError):
    """hledger subprocess timed out."""


class HledgerCallError(HledgerError):
    """hledger returned non-zero exit code."""
