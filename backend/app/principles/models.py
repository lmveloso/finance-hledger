"""Pydantic models for the Principle dimension.

The seven principles come from the DSOP methodology (see docs/02-PRD-dashboard-v2.md §4).
Their ids are stable strings — frontend resolves display names via i18n keys
of the form ``principle.<id>``.

This module only declares models. Loading the JSON mapping and resolving a
principle live in :mod:`app.principles.mappings` and :mod:`app.principles.resolver`
respectively.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

PrincipleId = Literal[
    "custos-fixos",
    "conforto",
    "metas",
    "prazeres",
    "liberdade-financeira",
    "aumentar-renda",
    "reserva-oportunidade",
]

# Materialised set for runtime validation (Literal is static-only).
VALID_PRINCIPLE_IDS: frozenset[str] = frozenset(
    [
        "custos-fixos",
        "conforto",
        "metas",
        "prazeres",
        "liberdade-financeira",
        "aumentar-renda",
        "reserva-oportunidade",
    ]
)


class Principle(BaseModel):
    """Static metadata for one principle."""

    id: PrincipleId
    display_key: str = Field(
        description="i18n key, e.g. 'principle.custos-fixos'. Frontend resolves.",
    )
    target_pct: float = Field(
        ge=0.0,
        le=100.0,
        description="Default DSOP target, as percentage of monthly income.",
    )


class PrincipleMapping(BaseModel):
    """Category → principle mapping loaded from ``principles.json``.

    ``rules`` keys can be exact account names (``expenses:moradia:agua``) or
    prefix wildcards (``expenses:lazer:*``). The resolver picks the most
    specific match — see :func:`app.principles.resolver.resolve_principle`.
    """

    rules: dict[str, PrincipleId] = Field(default_factory=dict)
    default: PrincipleId
    principles: list[Principle] = Field(default_factory=list)


class PrincipleBreakdown(BaseModel):
    """One row of the Principle × Target matrix for a single month."""

    principle: PrincipleId
    display_key: str
    valor: float = Field(description="BRL actually realised in the period.")
    meta_pct: float = Field(ge=0.0, description="Target, % of revenues.")
    realizado_pct: float = Field(
        description="Realised, % of revenues (denominator). Zero if revenues=0.",
    )
    delta_pct: float = Field(description="realizado_pct - meta_pct.")
    uncovered: bool = Field(
        default=False,
        description="True if any transaction fell to the default fallback.",
    )


class PrincipleSummary(BaseModel):
    """Output of ``GET /api/principles/summary?month=YYYY-MM``."""

    month: str = Field(description="Target month in YYYY-MM format.")
    denominator: float = Field(
        description="Revenues in the period — base for realizado_pct."
    )
    breakdown: list[PrincipleBreakdown] = Field(default_factory=list)
    uncovered_categories: list[str] = Field(
        default_factory=list,
        description="Accounts that fell to default — dashboard shows a warning.",
    )


class PrincipleYearlyCell(BaseModel):
    """One cell of the yearly matrix: value + share-of-month percentage."""

    month: str = Field(description="Month in YYYY-MM format.")
    value: float = Field(description="BRL realised for the principle in the month.")
    pct: float = Field(
        description=(
            "Share of monthly expenses, 0–100. Sum across principles == 100 "
            "(largest-remainder rounding) or 0 when the month has no expenses."
        ),
    )


class PrincipleYearlyRow(BaseModel):
    """One row of the yearly matrix: a principle across 12 months."""

    principle: PrincipleId
    display_key: str
    target_pct: float = Field(ge=0.0, description="DSOP target, % of revenues.")
    monthly: list[PrincipleYearlyCell] = Field(default_factory=list)


class PrincipleMonthlyTotal(BaseModel):
    """Monthly total of expenses — denominator used for ``pct`` per cell."""

    month: str
    value: float


class PrincipleYearly(BaseModel):
    """Output of ``GET /api/principles/yearly?year=YYYY``."""

    year: int = Field(ge=1900, le=2999, description="Calendar year.")
    months: list[str] = Field(
        default_factory=list,
        description="Ordered YYYY-MM labels for the 12 columns.",
    )
    principles: list[PrincipleYearlyRow] = Field(default_factory=list)
    monthly_totals: list[PrincipleMonthlyTotal] = Field(default_factory=list)
