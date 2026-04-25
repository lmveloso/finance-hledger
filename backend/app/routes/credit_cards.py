"""Credit-card breakdown endpoint (Fase 1, PR-F1-2).

Exposes ``GET /api/credit-cards`` — one row per credit-card liability
account that is non-zero or had activity in the queried month.

All hledger access goes through :class:`HledgerClient` per ADR-004.
The alias parser reads the journal source file directly, which is
explicitly allowed by ADR-004 (the constraint is on invoking the
binary, not on reading the file).
"""

from __future__ import annotations

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.credit_cards.models import CreditCardsResponse
from app.credit_cards.service import CreditCardsService
from app.deps import get_credit_cards_service, get_current_user
from app.hledger.errors import HledgerCallError, HledgerNotFound, HledgerTimeout

router = APIRouter(prefix="/api/credit-cards", tags=["credit-cards"])

_MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


@router.get("", response_model=CreditCardsResponse)
def credit_cards(
    month: Optional[str] = Query(
        default=None,
        description="Target month in YYYY-MM. Defaults to current month.",
    ),
    service: CreditCardsService = Depends(get_credit_cards_service),
    user: Optional[str] = Depends(get_current_user),
) -> CreditCardsResponse:
    """Return one row per active credit-card liability account."""
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
