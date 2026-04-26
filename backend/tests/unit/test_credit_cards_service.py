"""Unit tests for CreditCardsService.

Uses a stub HledgerClient that dispatches by command-name prefix so each
test can declare its own canned JSON without touching the hledger binary.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Callable

from app.credit_cards.service import CreditCardsService

TODAY = date(2026, 4, 25)
APRIL_BOUNDS = ("print", "-b", "2026-04-01", "-e", "2026-05-01")


class _StubClient:
    """Minimal HledgerClient stand-in (longest-prefix dispatch)."""

    def __init__(self, dispatch: dict[tuple[str, ...], Any]) -> None:
        self._dispatch = dispatch

    def run(self, *args: str, output_format: str = "json", **_kw):
        for key in sorted(self._dispatch, key=len, reverse=True):
            if args[: len(key)] == key:
                handler = self._dispatch[key]
                if isinstance(handler, Callable):
                    return handler(args)
                return handler
        return "" if output_format == "text" else []


def _amount(qty: float) -> dict:
    return {
        "acommodity": "BRL",
        "aquantity": {
            "floatingPoint": qty,
            "decimalMantissa": int(qty * 100),
            "decimalPlaces": 2,
        },
    }


def _balance(total: float) -> list:
    return [[], [_amount(total)]]


def _accounts(*names: str) -> str:
    return "\n".join(names) + ("\n" if names else "")


def _purchase(account: str, qty: float, expense="expenses:groceries", date_str="2026-04-15"):
    return {
        "tdate": date_str,
        "tdescription": "Purchase",
        "ttags": [],
        "tpostings": [
            {"paccount": expense, "pamount": [_amount(qty)]},
            {"paccount": account, "pamount": [_amount(-qty)]},
        ],
    }


def _payment(account: str, qty: float, date_str="2026-04-20"):
    return {
        "tdate": date_str,
        "tdescription": "Payment",
        "ttags": [],
        "tpostings": [
            {"paccount": "assets:bank", "pamount": [_amount(-qty)]},
            {"paccount": account, "pamount": [_amount(qty)]},
        ],
    }


def _build(extras: dict[tuple[str, ...], Any]) -> _StubClient:
    """Compose a stub from default-empty entries plus per-test overrides."""
    base: dict[tuple[str, ...], Any] = {
        ("accounts", "liabilities:cartão"): _accounts(),
        ("accounts", "liabilities:cartao"): _accounts(),
        ("accounts", "liabilities:credit-card"): _accounts(),
        APRIL_BOUNDS: [],
        ("print", "--forecast", "tag:parcelamento"): [],
    }
    base.update(extras)
    return _StubClient(base)


def _service(client: _StubClient, journal_path=None, today=TODAY):
    return CreditCardsService(client, journal_path=journal_path, today=today)


# ── tests ────────────────────────────────────────────────────────


def test_basic_month_one_card():
    nubank = "liabilities:cartão:nubank"
    client = _build(
        {
            ("accounts", "liabilities:cartão"): _accounts(nubank),
            ("balance", nubank, "--historical"): _balance(-500.0),
            APRIL_BOUNDS: [
                _purchase(nubank, 200.0, date_str="2026-04-10"),
                _purchase(nubank, 100.0, date_str="2026-04-20"),
            ],
        }
    )
    response = _service(client).for_month("2026-04")
    assert len(response.cards) == 1
    card = response.cards[0]
    assert card.account == nubank
    assert card.name == "Nubank"  # last-segment fallback
    assert card.outstanding_debt == 500.0
    assert card.spend_this_month == 300.0
    assert card.live_installments == 0


def test_excludes_dormant_cards():
    nubank = "liabilities:cartão:nubank"
    visa = "liabilities:credit-card:visa"
    client = _build(
        {
            ("accounts", "liabilities:cartão"): _accounts(nubank),
            ("accounts", "liabilities:credit-card"): _accounts(visa),
            ("balance", nubank, "--historical"): _balance(0.0),
            ("balance", visa, "--historical"): _balance(-200.0),
            APRIL_BOUNDS: [_purchase(visa, 50.0)],
        }
    )
    response = _service(client).for_month("2026-04")
    assert [c.account for c in response.cards] == [visa]


def test_sort_by_debt_desc():
    a, b, c = (f"liabilities:cartão:{x}" for x in ("a", "b", "c"))
    balances = {a: -100.0, b: -300.0, c: -200.0}
    client = _build(
        {
            ("accounts", "liabilities:cartão"): _accounts(a, b, c),
            ("balance",): lambda args: _balance(balances[args[1]]),
        }
    )
    response = _service(client).for_month("2026-04")
    assert [card.outstanding_debt for card in response.cards] == [300.0, 200.0, 100.0]
    assert [card.account for card in response.cards] == [b, c, a]


def test_live_installments_active_and_completed():
    """ADR-011: a series is live when at least one occurrence is in the future."""
    nubank = "liabilities:cartão:nubank"
    parcelamento_txs = [
        # Active: past one-off + future forecast occurrence — counts once
        {
            "tdate": "2026-04-09",
            "tpostings": [
                {
                    "paccount": "expenses:moradia",
                    "pamount": [_amount(600.0)],
                    "ptags": [["parcelamento", "TV 2/6"]],
                },
                {"paccount": nubank, "pamount": [_amount(-600.0)]},
            ],
        },
        {
            "tdate": "2026-05-01",
            "tpostings": [
                {
                    "paccount": "expenses:moradia",
                    "pamount": [_amount(600.0)],
                    "ptags": [["parcelamento", "TV 3/6"]],
                },
                {"paccount": nubank, "pamount": [_amount(-600.0)]},
            ],
        },
        # Completed: only past one-offs, no future occurrence — NOT live
        {
            "tdate": "2024-01-01",
            "tpostings": [
                {
                    "paccount": "expenses:outros",
                    "pamount": [_amount(150.0)],
                    "ptags": [["parcelamento", "OLD 3/3"]],
                },
                {"paccount": nubank, "pamount": [_amount(-150.0)]},
            ],
        },
    ]
    client = _build(
        {
            ("accounts", "liabilities:cartão"): _accounts(nubank),
            ("balance", nubank, "--historical"): _balance(-1000.0),
            ("print", "--forecast", "tag:parcelamento"): parcelamento_txs,
        }
    )
    response = _service(client).for_month("2026-04")
    assert response.cards[0].live_installments == 1


def test_card_prefix_all_three_forms_unified():
    accent = "liabilities:cartão:nubank"
    no_accent = "liabilities:cartao:elo"
    english = "liabilities:credit-card:visa"
    client = _build(
        {
            ("accounts", "liabilities:cartão"): _accounts(accent),
            ("accounts", "liabilities:cartao"): _accounts(no_accent),
            ("accounts", "liabilities:credit-card"): _accounts(english),
            ("balance", accent, "--historical"): _balance(-100.0),
            ("balance", no_accent, "--historical"): _balance(-200.0),
            ("balance", english, "--historical"): _balance(-300.0),
        }
    )
    response = _service(client).for_month("2026-04")
    assert {c.account for c in response.cards} == {accent, no_accent, english}


def test_refund_reduces_spend_this_month():
    """A negative expense-side amount (refund) reduces the total."""
    nubank = "liabilities:cartão:nubank"
    refund = {
        "tdate": "2026-04-12",
        "tdescription": "Refund",
        "ttags": [],
        "tpostings": [
            {"paccount": "expenses:groceries", "pamount": [_amount(-50.0)]},
            {"paccount": nubank, "pamount": [_amount(50.0)]},
        ],
    }
    client = _build(
        {
            ("accounts", "liabilities:cartão"): _accounts(nubank),
            ("balance", nubank, "--historical"): _balance(-150.0),
            APRIL_BOUNDS: [_purchase(nubank, 200.0), refund],
        }
    )
    response = _service(client).for_month("2026-04")
    assert response.cards[0].spend_this_month == 150.0


def test_refund_floors_spend_at_zero():
    nubank = "liabilities:cartão:nubank"
    big_refund = {
        "tdate": "2026-04-10",
        "tdescription": "Big refund",
        "ttags": [],
        "tpostings": [
            {"paccount": "expenses:groceries", "pamount": [_amount(-300.0)]},
            {"paccount": nubank, "pamount": [_amount(300.0)]},
        ],
    }
    client = _build(
        {
            ("accounts", "liabilities:cartão"): _accounts(nubank),
            ("balance", nubank, "--historical"): _balance(-200.0),
            APRIL_BOUNDS: [big_refund],
        }
    )
    response = _service(client).for_month("2026-04")
    assert response.cards[0].spend_this_month == 0.0


def test_card_payment_does_not_count_as_spend():
    """assets:bank → card payment must NOT be counted in spend_this_month."""
    nubank = "liabilities:cartão:nubank"
    client = _build(
        {
            ("accounts", "liabilities:cartão"): _accounts(nubank),
            ("balance", nubank, "--historical"): _balance(-100.0),
            APRIL_BOUNDS: [_payment(nubank, 500.0)],
        }
    )
    response = _service(client).for_month("2026-04")
    assert response.cards[0].spend_this_month == 0.0


def test_alias_map_takes_priority_over_fallback(tmp_path):
    nubank = "liabilities:cartão:nubank"
    journal = tmp_path / "j.journal"
    journal.write_text(
        f"account {nubank} ; alias: Nubank Lucas\n", encoding="utf-8"
    )
    client = _build(
        {
            ("accounts", "liabilities:cartão"): _accounts(nubank),
            ("balance", nubank, "--historical"): _balance(-100.0),
        }
    )
    response = _service(client, journal_path=journal).for_month("2026-04")
    assert response.cards[0].name == "Nubank Lucas"
    assert "T" in response.last_updated
