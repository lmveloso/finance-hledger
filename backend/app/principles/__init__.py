"""Principle dimension (Fase D).

Principle is derived deterministically from the category via a JSON mapping
(ADR-008). This package owns the mapping loader, the resolver, and the service
that aggregates per-principle totals for the dashboard.
"""

from app.principles.errors import (
    PrincipleError,
    PrincipleFileNotFound,
    PrincipleMappingError,
)
from app.principles.models import (
    Principle,
    PrincipleBreakdown,
    PrincipleId,
    PrincipleMapping,
    PrincipleSummary,
)
from app.principles.resolver import resolve_principle

__all__ = [
    "Principle",
    "PrincipleBreakdown",
    "PrincipleError",
    "PrincipleFileNotFound",
    "PrincipleId",
    "PrincipleMapping",
    "PrincipleMappingError",
    "PrincipleSummary",
    "resolve_principle",
]
