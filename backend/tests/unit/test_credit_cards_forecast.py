"""Unit tests for ``forecast_parcelamento_transactions``.

The helper is the single source of truth for the parcelamento forecast
query (ADR-011 §Errata 2026-04-28 followup). Both the
``/api/installments`` route and :class:`CreditCardsService` go through
it so their per-card sums agree.
"""

from __future__ import annotations

from datetime import date

from app.credit_cards.forecast import (
    FORECAST_MONTHS_AHEAD,
    forecast_parcelamento_transactions,
)


class _RecordingClient:
    """Captures the args passed to ``run`` so the test can assert them."""

    def __init__(self, payload):
        self._payload = payload
        self.calls: list[tuple[tuple[str, ...], dict]] = []

    def run(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return self._payload


def test_forecast_calls_print_with_explicit_bounds():
    """Helper passes ``-b 1900-01-01 -e <today + months_ahead>``."""
    client = _RecordingClient([])
    today = date(2026, 4, 28)

    forecast_parcelamento_transactions(client, today=today, months_ahead=24)

    assert len(client.calls) == 1
    args, _ = client.calls[0]
    assert args[:3] == ("print", "--forecast", "tag:parcelamento")
    assert "-b" in args
    assert "-e" in args
    b_idx = args.index("-b")
    e_idx = args.index("-e")
    assert args[b_idx + 1] == "1900-01-01"
    # 2026-04 + 24 months = 2028-04 (anchored to first of month).
    assert args[e_idx + 1] == "2028-04-01"


def test_forecast_default_months_ahead_is_24():
    """Sanity check the public constant matches the implementation."""
    assert FORECAST_MONTHS_AHEAD == 24
    client = _RecordingClient([])
    today = date(2026, 4, 28)

    forecast_parcelamento_transactions(client, today=today)

    args, _ = client.calls[0]
    e_idx = args.index("-e")
    assert args[e_idx + 1] == "2028-04-01"


def test_forecast_returns_list_payload_unchanged():
    payload = [{"tdate": "2026-05-01", "tpostings": []}]
    client = _RecordingClient(payload)
    result = forecast_parcelamento_transactions(client, today=date(2026, 4, 28))
    assert result == payload


def test_forecast_returns_empty_list_on_non_list_payload():
    """Defensive: a string or dict payload (e.g. unparseable JSON) yields []."""
    client = _RecordingClient("oops")
    result = forecast_parcelamento_transactions(client, today=date(2026, 4, 28))
    assert result == []


def test_forecast_handles_year_rollover():
    """``today + months_ahead`` correctly crosses the year boundary."""
    client = _RecordingClient([])
    forecast_parcelamento_transactions(
        client, today=date(2026, 11, 15), months_ahead=24
    )
    args, _ = client.calls[0]
    e_idx = args.index("-e")
    # 2026-11 + 24 months = 2028-11.
    assert args[e_idx + 1] == "2028-11-01"
