"""Single source of truth for the parcelamento forecast query.

Both the ``/api/installments`` route and :class:`CreditCardsService`
need the same forecast-enabled view of parcelamento transactions to
agree on per-card ``remaining_value``. Without explicit bounds,
``hledger print --forecast`` defaults to a narrow window (~6 months)
that hides series with longer horizons and creates a horizon mismatch
between the two callers.

This module centralises the query so both callers run it identically.
ADR-011 is the data model; ADR-004 is the access pattern.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from app.hledger.client import HledgerClient

# 24 months ahead is enough to cover any reasonable credit-card
# installment plan (cards typically cap at 12x-18x). Both the route
# and the service share this constant so their horizons are aligned.
FORECAST_MONTHS_AHEAD = 24

# Far-past begin captures all historical one-offs that carry the
# parcelamento tag. The ``to`` clause inside each periodic declaration
# bounds the top end naturally; we still pass an explicit ``-e`` so
# the forecast window is symmetric across callers.
_FAR_PAST_BEGIN = "1900-01-01"


def forecast_parcelamento_transactions(
    client: HledgerClient,
    *,
    months_ahead: int = FORECAST_MONTHS_AHEAD,
    today: Optional[date] = None,
) -> list[dict]:
    """Return parcelamento transactions over a fixed forecast window.

    Runs ``hledger print --forecast tag:parcelamento`` with explicit
    ``-b 1900-01-01`` (capture all past one-offs with the tag) and
    ``-e <today + months_ahead>`` (forecast horizon symmetric across
    callers). Returns the parsed list, or an empty list when hledger
    returns a non-list payload.

    Parameters
    ----------
    client:
        The :class:`HledgerClient` instance to invoke.
    months_ahead:
        How many months past ``today`` to include in the forecast.
        Defaults to :data:`FORECAST_MONTHS_AHEAD` (24).
    today:
        Anchor date for the forecast end. ``None`` resolves to
        ``date.today()``; injectable for tests.
    """
    today = today or date.today()
    end_date = _add_months(today.replace(day=1), months_ahead)
    end_iso = end_date.isoformat()

    raw = client.run(
        "print",
        "--forecast",
        "tag:parcelamento",
        "-b",
        _FAR_PAST_BEGIN,
        "-e",
        end_iso,
    )
    return raw if isinstance(raw, list) else []


def _add_months(anchor: date, months: int) -> date:
    """Return ``anchor`` shifted forward by ``months`` whole months.

    ``anchor`` is expected to be the first of a month; the result is
    also the first of a month. This is a closed-form variant of the
    loop in :func:`app.hledger.helpers.months_forward_bounds` and
    keeps the helper self-contained.
    """
    total = anchor.year * 12 + (anchor.month - 1) + months
    year, month_zero = divmod(total, 12)
    return date(year, month_zero + 1, 1)
