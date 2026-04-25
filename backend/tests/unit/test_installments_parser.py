"""Unit tests for ``parse_parcelamento_tag`` and friends.

Pure functions, no hledger involvement.
"""

from __future__ import annotations

import logging
from datetime import date

import pytest

from app.credit_cards.installments import (
    add_months,
    count_live_for_card,
    is_live,
    parse_parcelamento_tag,
)


# ── parse_parcelamento_tag ───────────────────────────────────────


def test_parse_simple():
    assert parse_parcelamento_tag("ELECTROLUX 10x") == ("ELECTROLUX", 10)


def test_parse_uppercase_x():
    assert parse_parcelamento_tag("VIAGEM 5X") == ("VIAGEM", 5)


def test_parse_whitespace():
    assert parse_parcelamento_tag("  IPHONE  12 x  ") == ("IPHONE", 12)


def test_parse_multiword_name():
    assert parse_parcelamento_tag("GEL FRONTAL 6x") == ("GEL FRONTAL", 6)


@pytest.mark.parametrize(
    "value",
    [
        "only-a-name",
        "NAME 0x",
        "",
        "    ",
        "10x",  # no name
        "NAME ABCx",
    ],
)
def test_parse_malformed_returns_none(value, caplog):
    caplog.set_level(logging.WARNING, logger="finance-hledger")
    assert parse_parcelamento_tag(value) is None
    assert any("parcelamento" in rec.message for rec in caplog.records)


def test_parse_non_string_returns_none(caplog):
    caplog.set_level(logging.WARNING, logger="finance-hledger")
    assert parse_parcelamento_tag(None) is None  # type: ignore[arg-type]


# ── add_months / is_live ─────────────────────────────────────────


def test_add_months_simple():
    assert add_months(date(2026, 1, 15), 3) == date(2026, 4, 15)


def test_add_months_year_rollover():
    assert add_months(date(2026, 11, 10), 4) == date(2027, 3, 10)


def test_add_months_clamps_to_short_month():
    """Jan 31 + 1 month → Feb 28 (not Mar 3)."""
    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)


def test_add_months_clamps_to_leap():
    assert add_months(date(2024, 1, 30), 1) == date(2024, 2, 29)


def test_is_live_completed_in_past():
    assert is_live(date(2024, 1, 1), 6, today=date(2025, 1, 1)) is False


def test_is_live_still_active():
    # 2026-01-01 + 6 months = 2026-07-01; today = 2026-04-01 → live.
    assert is_live(date(2026, 1, 1), 6, today=date(2026, 4, 1)) is True


def test_is_live_exactly_today():
    """Boundary: completion == today still counts as live (>= today)."""
    assert is_live(date(2026, 1, 1), 3, today=date(2026, 4, 1)) is True


# ── count_live_for_card ──────────────────────────────────────────


def _tx(tdate: str, account: str, name: str, n: int):
    return {
        "tdate": tdate,
        "ttags": [["parcelamento", f"{name} {n}x"]],
        "tpostings": [
            {"paccount": "expenses:moradia:equipamentos", "pamount": []},
            {"paccount": account, "pamount": []},
        ],
    }


def test_count_live_only_for_named_card():
    today = date(2026, 5, 1)
    txs = [
        # active for nubank: 2026-02-01 + 6m = 2026-08-01 >= today
        _tx("2026-02-01", "liabilities:cartão:nubank", "TV", 6),
        # finished for nubank: 2025-01-01 + 3m = 2025-04-01 < today
        _tx("2025-01-01", "liabilities:cartão:nubank", "OLD", 3),
        # active for visa, not nubank
        _tx("2026-03-01", "liabilities:credit-card:visa", "PHONE", 12),
    ]
    assert count_live_for_card(txs, "liabilities:cartão:nubank", today) == 1
    assert count_live_for_card(txs, "liabilities:credit-card:visa", today) == 1


def test_count_live_skips_untagged_transactions():
    today = date(2026, 5, 1)
    txs = [
        {
            "tdate": "2026-04-01",
            "ttags": [],
            "tpostings": [
                {"paccount": "expenses:groceries", "pamount": []},
                {"paccount": "liabilities:cartão:nubank", "pamount": []},
            ],
        }
    ]
    assert count_live_for_card(txs, "liabilities:cartão:nubank", today) == 0


def test_count_live_accepts_posting_level_tag():
    today = date(2026, 5, 1)
    tx = {
        "tdate": "2026-02-01",
        "ttags": [],
        "tpostings": [
            {
                "paccount": "expenses:moradia",
                "pamount": [],
                "ptags": [["parcelamento", "FRIDGE 6x"]],
            },
            {"paccount": "liabilities:cartão:nubank", "pamount": []},
        ],
    }
    assert count_live_for_card([tx], "liabilities:cartão:nubank", today) == 1


def test_count_live_skips_transactions_not_touching_card():
    today = date(2026, 5, 1)
    txs = [_tx("2026-02-01", "liabilities:cartão:other", "TV", 6)]
    assert count_live_for_card(txs, "liabilities:cartão:nubank", today) == 0


def test_count_live_handles_invalid_tx_date(caplog):
    today = date(2026, 5, 1)
    tx = {
        "tdate": "not-a-date",
        "ttags": [["parcelamento", "FOO 5x"]],
        "tpostings": [
            {"paccount": "expenses:x", "pamount": []},
            {"paccount": "liabilities:cartão:nubank", "pamount": []},
        ],
    }
    assert count_live_for_card([tx], "liabilities:cartão:nubank", today) == 0
