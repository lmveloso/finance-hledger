"""Unit tests for :class:`MonthSummaryService`.

Use a stub :class:`HledgerClient` that returns canned JSON keyed on the
first arguments (the subcommand). No subprocess, no journal file.

Canned-shape helpers and the stub live in ``_month_summary_helpers`` so
this file stays under the 200-line cap.
"""

from __future__ import annotations

import logging

from app.month_summary.service import MonthSummaryService
from tests.unit._month_summary_helpers import (
    StubHledgerClient,
    balance_total,
    income_statement,
    posting,
    tx,
)


def _service(responses) -> MonthSummaryService:
    return MonthSummaryService(client=StubHledgerClient(responses))


_BAL_KEY = (
    "balance", "liabilities:cartão:", "liabilities:cartao:",
    "liabilities:credit-card:", "--historical",
)


def test_basic_month():
    """One income, one debit-card expense, one credit-card expense."""
    responses = {
        ("incomestatement", "-b", "2026-04-01", "-e", "2026-05-01"):
            income_statement(revenues=10000.0, expenses=350.0),
        ("print", "expenses:", "-b", "2026-04-01", "-e", "2026-05-01"): [
            tx("2026-04-05", "Mercado",
               [posting("expenses:groceries", 200.0),
                posting("assets:bank", -200.0)]),
            tx("2026-04-10", "Restaurante",
               [posting("expenses:dining", 150.0),
                posting("liabilities:cartão:nubank", -150.0)]),
        ],
        ("print", "-b", "2026-04-01", "-e", "2026-05-01"): [
            tx("2026-04-15", "Pagamento fatura",
               [posting("liabilities:cartão:nubank", 100.0),
                posting("assets:bank", -100.0)]),
        ],
        _BAL_KEY: balance_total(-450.0),
        _BAL_KEY + ("-e", "2026-04-01"): balance_total(0.0),
        _BAL_KEY + ("-e", "2026-05-01"): balance_total(-50.0),
    }
    s = _service(responses).for_month("2026-04")

    assert s.month == "2026-04"
    assert s.income == 10000.0
    assert s.expense == 350.0
    assert s.expense_via_assets == 200.0
    assert s.expense_via_credit_card == 150.0
    assert s.credit_card_payment == 100.0
    assert s.credit_card_debt_today == 450.0
    assert s.debt_start_of_month == 0.0
    assert s.debt_end_of_month == 50.0
    assert s.leftover == 9650.0


def test_split_invariant():
    """expense ~= via_assets + via_card within R$0.01 (the critical test)."""
    responses = {
        ("incomestatement", "-b", "2026-04-01", "-e", "2026-05-01"):
            income_statement(revenues=0.0, expenses=300.05),
        ("print", "expenses:", "-b", "2026-04-01", "-e", "2026-05-01"): [
            tx("2026-04-05", "A",
               [posting("expenses:x", 100.01),
                posting("assets:bank", -100.01)]),
            tx("2026-04-06", "B",
               [posting("expenses:y", 99.99),
                posting("assets:bank", -99.99)]),
            tx("2026-04-07", "C",
               [posting("expenses:z", 100.05),
                posting("liabilities:cartao:visa", -100.05)]),
        ],
    }
    s = _service(responses).for_month("2026-04")
    assert abs(s.expense - (s.expense_via_assets + s.expense_via_credit_card)) <= 0.01


def test_zero_month():
    """Empty journal -> all numerics zero, response constructs cleanly."""
    s = _service({}).for_month("2026-04")
    assert s.income == s.expense == 0.0
    assert s.expense_via_assets == s.expense_via_credit_card == 0.0
    assert s.credit_card_payment == 0.0
    assert s.credit_card_debt_today == 0.0
    assert s.debt_start_of_month == s.debt_end_of_month == 0.0
    assert s.leftover == 0.0
    assert s.month == "2026-04"


def test_card_payment_isolated():
    """Pure card-payment tx must NOT count as expense."""
    responses = {
        ("print", "expenses:", "-b", "2026-04-01", "-e", "2026-05-01"): [],
        ("print", "-b", "2026-04-01", "-e", "2026-05-01"): [
            tx("2026-04-15", "Pagamento",
               [posting("liabilities:cartão:nubank", 500.0),
                posting("assets:bank", -500.0)]),
        ],
    }
    s = _service(responses).for_month("2026-04")
    assert s.expense == 0.0
    assert s.expense_via_assets == 0.0
    assert s.expense_via_credit_card == 0.0
    assert s.credit_card_payment == 500.0


def test_leftover_negative():
    """expense > income -> leftover is negative (signed)."""
    responses = {
        ("incomestatement", "-b", "2026-04-01", "-e", "2026-05-01"):
            income_statement(revenues=1000.0, expenses=1500.0),
    }
    s = _service(responses).for_month("2026-04")
    assert s.leftover == -500.0


def test_card_prefix_all_three_forms():
    """Open Q1: cartão / cartao / credit-card aggregate together."""
    responses = {
        ("print", "expenses:", "-b", "2026-04-01", "-e", "2026-05-01"): [
            tx("2026-04-05", "A",
               [posting("expenses:x", 10.0),
                posting("liabilities:cartão:nubank", -10.0)]),
            tx("2026-04-06", "B",
               [posting("expenses:y", 20.0),
                posting("liabilities:cartao:itau", -20.0)]),
            tx("2026-04-07", "C",
               [posting("expenses:z", 30.0),
                posting("liabilities:credit-card:amex", -30.0)]),
        ],
    }
    s = _service(responses).for_month("2026-04")
    assert s.expense_via_credit_card == 60.0
    assert s.expense_via_assets == 0.0


def test_other_contra_account_logged(caplog):
    """Expense paid from equity:* logs a warning and is NOT bucketed."""
    responses = {
        ("incomestatement", "-b", "2026-04-01", "-e", "2026-05-01"):
            income_statement(revenues=0.0, expenses=42.0),
        ("print", "expenses:", "-b", "2026-04-01", "-e", "2026-05-01"): [
            tx("2026-04-05", "Opening adjustment",
               [posting("expenses:setup", 42.0),
                posting("equity:opening", -42.0)]),
        ],
    }
    caplog.set_level(logging.WARNING, logger="finance-hledger")
    s = _service(responses).for_month("2026-04")
    assert s.expense_via_assets == 0.0
    assert s.expense_via_credit_card == 0.0
    messages = [rec.message for rec in caplog.records]
    assert any("expense_other_contra" in m for m in messages)
    assert any("split_invariant_break" in m for m in messages)


def test_credit_card_debt_today_uses_no_period():
    """Open Q3: debt_today is at server-today regardless of month arg."""
    captured = StubHledgerClient({_BAL_KEY: balance_total(-77.0)})
    s = MonthSummaryService(client=captured).for_month("2026-04")
    assert s.credit_card_debt_today == 77.0
    today_calls = [c for c in captured.calls if c[0] == "balance" and "-e" not in c]
    assert today_calls, "debt_today must call balance without -e"


def test_debt_at_start_and_end_uses_historical():
    """Open Q2: --historical must be passed for both bracket calls."""
    captured = StubHledgerClient({})
    MonthSummaryService(client=captured).for_month("2026-04")
    historical_with_e = [
        c for c in captured.calls
        if c[0] == "balance" and "--historical" in c and "-e" in c
    ]
    assert len(historical_with_e) == 2
    e_values = [c[c.index("-e") + 1] for c in historical_with_e]
    assert "2026-04-01" in e_values
    assert "2026-05-01" in e_values
