"""Unit tests for ``parse_parcelamento_tag`` and ``count_live_for_card``.

Pure functions, no hledger involvement. Models the ADR-011 tag format
(``NAME N/M``) and the live-by-future-occurrence definition.
"""

from __future__ import annotations

import logging
from datetime import date

import pytest

from app.credit_cards.installments import (
    count_live_for_card,
    parse_parcelamento_tag,
    sum_remaining_value_for_card,
)


# ── parse_parcelamento_tag ───────────────────────────────────────


def test_parse_simple():
    assert parse_parcelamento_tag("Decathlon 2/4") == ("Decathlon", 2, 4)


def test_parse_multiword_name():
    assert parse_parcelamento_tag("Anuidade Caixa titular 6/12") == (
        "Anuidade Caixa titular",
        6,
        12,
    )


def test_parse_whitespace():
    assert parse_parcelamento_tag("  Havan Campo Mourao  3/4  ") == (
        "Havan Campo Mourao",
        3,
        4,
    )


@pytest.mark.parametrize(
    "value",
    [
        "only-a-name",
        "NAME 0/3",
        "NAME 3/0",
        "",
        "    ",
        "3/4",  # no name
        "NAME ABC/3",
        "NAME 5x",  # ADR-010 legacy format — must NOT parse
    ],
)
def test_parse_malformed_returns_none(value, caplog):
    caplog.set_level(logging.WARNING, logger="finance-hledger")
    assert parse_parcelamento_tag(value) is None
    assert any("parcelamento" in rec.message for rec in caplog.records)


def test_parse_non_string_returns_none(caplog):
    caplog.set_level(logging.WARNING, logger="finance-hledger")
    assert parse_parcelamento_tag(None) is None  # type: ignore[arg-type]


# ── count_live_for_card ──────────────────────────────────────────


def _tx(tdate: str, account: str, name: str, n: int, m: int):
    """Build a transaction matching the ADR-011 shape (tag on expense posting)."""
    return {
        "tdate": tdate,
        "tpostings": [
            {
                "paccount": "expenses:moradia:equipamentos",
                "pamount": [],
                "ptags": [["parcelamento", f"{name} {n}/{m}"]],
            },
            {"paccount": account, "pamount": []},
        ],
    }


def test_count_live_only_counts_future_occurrences():
    """A series is live when at least one occurrence is strictly after today."""
    today = date(2026, 4, 26)
    txs = [
        # past one-off — does NOT make the series live by itself
        _tx("2026-04-09", "liabilities:cartao:bb-visa", "Decathlon", 2, 4),
        # future occurrence (forecast) — makes the series live
        _tx("2026-05-01", "liabilities:cartao:bb-visa", "Decathlon", 3, 4),
        _tx("2026-06-01", "liabilities:cartao:bb-visa", "Decathlon", 3, 4),
    ]
    assert count_live_for_card(txs, "liabilities:cartao:bb-visa", today) == 1


def test_count_live_with_only_past_returns_zero():
    today = date(2026, 4, 26)
    txs = [
        _tx("2026-03-09", "liabilities:cartao:bb-visa", "Farmacia", 1, 2),
        _tx("2026-04-09", "liabilities:cartao:bb-visa", "Farmacia", 2, 2),
    ]
    assert count_live_for_card(txs, "liabilities:cartao:bb-visa", today) == 0


def test_count_live_distinct_series():
    today = date(2026, 4, 26)
    txs = [
        _tx("2026-05-01", "liabilities:cartao:bb-visa", "Decathlon", 3, 4),
        _tx("2026-05-01", "liabilities:cartao:bb-visa", "Auto Escola", 2, 3),
        _tx("2026-06-01", "liabilities:cartao:bb-visa", "Auto Escola", 2, 3),
    ]
    assert count_live_for_card(txs, "liabilities:cartao:bb-visa", today) == 2


def test_count_live_isolates_card():
    today = date(2026, 4, 26)
    txs = [
        _tx("2026-05-01", "liabilities:cartao:bb-visa", "Decathlon", 3, 4),
        _tx("2026-05-01", "liabilities:cartao:xp-visa", "Orto Life Mateus", 2, 3),
    ]
    assert count_live_for_card(txs, "liabilities:cartao:bb-visa", today) == 1
    assert count_live_for_card(txs, "liabilities:cartao:xp-visa", today) == 1


def test_count_live_skips_untagged_transactions():
    today = date(2026, 4, 26)
    txs = [
        {
            "tdate": "2026-05-01",
            "tpostings": [
                {"paccount": "expenses:groceries", "pamount": []},
                {"paccount": "liabilities:cartao:bb-visa", "pamount": []},
            ],
        }
    ]
    assert count_live_for_card(txs, "liabilities:cartao:bb-visa", today) == 0


def test_count_live_accepts_transaction_level_tag():
    """Fallback path: tag on the transaction header rather than posting."""
    today = date(2026, 4, 26)
    tx = {
        "tdate": "2026-05-01",
        "ttags": [["parcelamento", "Fridge 3/6"]],
        "tpostings": [
            {"paccount": "expenses:moradia", "pamount": []},
            {"paccount": "liabilities:cartao:bb-visa", "pamount": []},
        ],
    }
    assert count_live_for_card([tx], "liabilities:cartao:bb-visa", today) == 1


def test_count_live_skips_transactions_not_touching_card():
    today = date(2026, 4, 26)
    txs = [_tx("2026-05-01", "liabilities:cartao:other", "TV", 3, 6)]
    assert count_live_for_card(txs, "liabilities:cartao:bb-visa", today) == 0


def test_count_live_handles_missing_tx_date():
    today = date(2026, 4, 26)
    tx = {
        "tdate": "",
        "tpostings": [
            {
                "paccount": "expenses:x",
                "pamount": [],
                "ptags": [["parcelamento", "Foo 2/5"]],
            },
            {"paccount": "liabilities:cartao:bb-visa", "pamount": []},
        ],
    }
    assert count_live_for_card([tx], "liabilities:cartao:bb-visa", today) == 0


# ── sum_remaining_value_for_card ─────────────────────────────────


def _amt(qty: float) -> dict:
    """Build the ``pamount`` dict shape hledger 1.52 emits."""
    return {
        "acommodity": "BRL",
        "aquantity": {
            "floatingPoint": qty,
            "decimalMantissa": int(round(qty * 100)),
            "decimalPlaces": 2,
        },
    }


def _tx_with_amount(
    tdate: str,
    account: str,
    name: str,
    n: int,
    m: int,
    monthly: float,
):
    """Transaction with a non-empty pamount on the tagged expense leg."""
    return {
        "tdate": tdate,
        "tpostings": [
            {
                "paccount": "expenses:moradia:equipamentos",
                "pamount": [_amt(monthly)],
                "ptags": [["parcelamento", f"{name} {n}/{m}"]],
            },
            {
                "paccount": account,
                "pamount": [_amt(-monthly)],
            },
        ],
    }


def test_sum_remaining_value_simple_future_only():
    """Two future occurrences, total=4 → remaining=2 → 2 × 100.00."""
    today = date(2026, 4, 26)
    txs = [
        _tx_with_amount("2026-05-01", "liabilities:cartao:bb-visa", "Decathlon", 3, 4, 100.0),
        _tx_with_amount("2026-06-01", "liabilities:cartao:bb-visa", "Decathlon", 3, 4, 100.0),
    ]
    assert sum_remaining_value_for_card(
        txs, "liabilities:cartao:bb-visa", today
    ) == 200.0


def test_sum_remaining_value_caps_at_total():
    """Even if forecast emits more rows than total, remaining is capped at M."""
    today = date(2026, 4, 26)
    # Five future occurrences but tag claims total=3; remaining capped at 3.
    txs = [
        _tx_with_amount(d, "liabilities:cartao:bb-visa", "TV", 1, 3, 50.0)
        for d in (
            "2026-05-01",
            "2026-06-01",
            "2026-07-01",
            "2026-08-01",
            "2026-09-01",
        )
    ]
    assert sum_remaining_value_for_card(
        txs, "liabilities:cartao:bb-visa", today
    ) == 150.0


def test_sum_remaining_value_distinct_series():
    today = date(2026, 4, 26)
    txs = [
        _tx_with_amount("2026-05-01", "liabilities:cartao:bb-visa", "Decathlon", 3, 4, 100.0),
        _tx_with_amount("2026-06-01", "liabilities:cartao:bb-visa", "Decathlon", 3, 4, 100.0),
        _tx_with_amount("2026-05-01", "liabilities:cartao:bb-visa", "Auto Escola", 2, 3, 80.0),
    ]
    # Decathlon: 2 future × 100 = 200; Auto Escola: 1 future × 80 = 80. Total 280.
    assert sum_remaining_value_for_card(
        txs, "liabilities:cartao:bb-visa", today
    ) == 280.0


def test_sum_remaining_value_isolates_card():
    today = date(2026, 4, 26)
    txs = [
        _tx_with_amount("2026-05-01", "liabilities:cartao:bb-visa", "Decathlon", 3, 4, 100.0),
        _tx_with_amount("2026-05-01", "liabilities:cartao:other", "TV", 1, 6, 200.0),
    ]
    assert sum_remaining_value_for_card(
        txs, "liabilities:cartao:bb-visa", today
    ) == 100.0
    assert sum_remaining_value_for_card(
        txs, "liabilities:cartao:other", today
    ) == 200.0


def test_sum_remaining_value_zero_when_only_past_occurrences():
    """All occurrences ≤ today → series is not live → remaining sum is 0."""
    today = date(2026, 4, 26)
    txs = [
        _tx_with_amount("2026-03-09", "liabilities:cartao:bb-visa", "Farmacia", 1, 2, 50.0),
        _tx_with_amount("2026-04-09", "liabilities:cartao:bb-visa", "Farmacia", 2, 2, 50.0),
    ]
    assert sum_remaining_value_for_card(
        txs, "liabilities:cartao:bb-visa", today
    ) == 0.0


def test_sum_remaining_value_skips_untagged_transactions():
    today = date(2026, 4, 26)
    txs = [
        {
            "tdate": "2026-05-01",
            "tpostings": [
                {"paccount": "expenses:groceries", "pamount": [_amt(50.0)]},
                {"paccount": "liabilities:cartao:bb-visa", "pamount": [_amt(-50.0)]},
            ],
        },
    ]
    assert sum_remaining_value_for_card(
        txs, "liabilities:cartao:bb-visa", today
    ) == 0.0


def test_sum_remaining_value_finished_series_excluded_with_today_at_end():
    """Last forecast occurrence equals today → no future → series excluded."""
    today = date(2026, 4, 26)
    txs = [
        _tx_with_amount("2026-03-26", "liabilities:cartao:bb-visa", "Foo", 1, 2, 50.0),
        _tx_with_amount("2026-04-26", "liabilities:cartao:bb-visa", "Foo", 2, 2, 50.0),
    ]
    assert sum_remaining_value_for_card(
        txs, "liabilities:cartao:bb-visa", today
    ) == 0.0
    # And ``count_live_for_card`` agrees (parallel test).
    assert count_live_for_card(
        txs, "liabilities:cartao:bb-visa", today
    ) == 0


def test_sum_remaining_value_mixed_past_and_future():
    """Past one-off + future forecast (live series, 1 remaining)."""
    today = date(2026, 4, 26)
    txs = [
        _tx_with_amount("2026-04-01", "liabilities:cartao:bb-visa", "TV", 1, 3, 200.0),
        _tx_with_amount("2026-05-01", "liabilities:cartao:bb-visa", "TV", 2, 3, 200.0),
        _tx_with_amount("2026-06-01", "liabilities:cartao:bb-visa", "TV", 3, 3, 200.0),
    ]
    # 2 future occurrences, total=3, capped → 2 × 200 = 400.
    assert sum_remaining_value_for_card(
        txs, "liabilities:cartao:bb-visa", today
    ) == 400.0
