"""Month-summary endpoint (Fase 1).

Exposes ``GET /api/month-summary?month=YYYY-MM`` — the anchor numbers for
the redesigned Mes tab. Why a new endpoint instead of extending
``/api/summary``: the old one is consumed across the existing tabs and
changing its shape would force a frontend-wide cascade. The two coexist.

hledger errors raised by :class:`MonthSummaryService` bubble through the
same translator used by ``/api/principles/*`` so this route never speaks
subprocess (ADR-004).
"""

from __future__ import annotations

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps import get_current_user, get_month_summary_service
from app.hledger.errors import HledgerCallError, HledgerNotFound, HledgerTimeout
from app.month_summary.models import MonthSummary
from app.month_summary.service import MonthSummaryService

router = APIRouter()

_MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


@router.get("/api/month-summary", response_model=MonthSummary)
def month_summary(
    month: Optional[str] = Query(
        default=None,
        description="Target month in YYYY-MM. Defaults to current month.",
    ),
    service: MonthSummaryService = Depends(get_month_summary_service),
    user: Optional[str] = Depends(get_current_user),
) -> MonthSummary:
    """Return the eight anchor numbers for the Mes tab."""
    if month is not None and not _MONTH_RE.match(month):
        raise HTTPException(422, "month must match YYYY-MM")

    try:
        return service.for_month(month)
    except HledgerNotFound as exc:
        raise HTTPException(503, str(exc)) from exc
    except HledgerTimeout as exc:
        raise HTTPException(504, str(exc)) from exc
    except HledgerCallError as exc:
        raise HTTPException(500, f"hledger: {exc}") from exc
