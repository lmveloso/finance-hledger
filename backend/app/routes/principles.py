"""Principle dimension endpoints (Fase D).

Exposes:
- ``GET /api/principles/summary?month=YYYY-MM`` — per-principle totals.
- ``GET /api/principles/mapping`` — full mapping, for Settings/i18n UI.

hledger errors raised by :class:`PrincipleService` bubble through a small
translator so the routes never speak subprocess — all hledger access goes
through :class:`HledgerClient` per ADR-004.
"""

from __future__ import annotations

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps import get_current_user, get_principle_service
from app.hledger.errors import HledgerCallError, HledgerNotFound, HledgerTimeout
from app.principles.models import PrincipleMapping, PrincipleSummary
from app.principles.service import PrincipleService

router = APIRouter(prefix="/api/principles", tags=["principles"])

_MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


@router.get("/summary", response_model=PrincipleSummary)
def principles_summary(
    month: Optional[str] = Query(
        default=None,
        description="Target month in YYYY-MM. Defaults to current month.",
    ),
    service: PrincipleService = Depends(get_principle_service),
    user: Optional[str] = Depends(get_current_user),
) -> PrincipleSummary:
    """Aggregate expenses per principle for one month."""
    if month is not None and not _MONTH_RE.match(month):
        raise HTTPException(422, "month must match YYYY-MM")

    try:
        return service.monthly_summary(month)
    except HledgerNotFound as exc:
        raise HTTPException(503, str(exc)) from exc
    except HledgerTimeout as exc:
        raise HTTPException(504, str(exc)) from exc
    except HledgerCallError as exc:
        raise HTTPException(500, f"hledger: {exc}") from exc


@router.get("/mapping", response_model=PrincipleMapping)
def principles_mapping(
    service: PrincipleService = Depends(get_principle_service),
    user: Optional[str] = Depends(get_current_user),
) -> PrincipleMapping:
    """Return the full category → principle mapping and the 7 principles."""
    return service.mapping
