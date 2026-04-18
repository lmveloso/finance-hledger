"""Typed exceptions for the principles module.

These are raised at load time by :class:`PrincipleMapping.from_file` so the
application fails fast if the factory JSON is malformed. The resolver itself
is pure and never raises — invalid runtime inputs fall back to the default
principle with a warning log (see :mod:`app.principles.resolver`).
"""


class PrincipleError(Exception):
    """Base exception for principle operations."""


class PrincipleFileNotFound(PrincipleError):
    """principles.json was not found at the configured path."""


class PrincipleMappingError(PrincipleError):
    """principles.json is malformed or references unknown principle ids."""
