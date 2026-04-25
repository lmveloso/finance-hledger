"""Shared canned-shape helpers for month_summary unit tests.

Pulled out so the test file itself stays under the 200-line cap.
The fixtures here mirror the hledger 1.52 JSON shapes consumed by
:mod:`app.month_summary.service`.
"""

from __future__ import annotations

from typing import Any


class StubHledgerClient:
    """In-memory stand-in keyed on (subcommand, *positional_args)."""

    def __init__(self, responses: dict[tuple[str, ...], Any]):
        self._responses = responses
        self.calls: list[tuple[str, ...]] = []

    def run(self, *args: str, output_format: str = "json", **_: Any) -> Any:
        self.calls.append(args)
        for length in range(len(args), 0, -1):
            key = args[:length]
            if key in self._responses:
                return self._responses[key]
        if args[0] == "incomestatement":
            return {}
        if args[0] == "balance":
            # Real hledger returns [[], []] for empty queries; mirror that
            # so :class:`BalanceReport.from_raw` doesn't trip on a bare ``[]``.
            return [[], []]
        if args[0] == "print":
            return []
        return ""


def amt(value: float) -> dict:
    """One element of the hledger ``pamount`` list."""
    return {"acommodity": "", "aquantity": {"floatingPoint": value}}


def posting(account: str, value: float) -> dict:
    return {"paccount": account, "pamount": [amt(value)]}


def tx(date: str, description: str, postings: list[dict]) -> dict:
    return {"tdate": date, "tdescription": description, "tpostings": postings}


def income_statement(revenues: float, expenses: float) -> dict:
    """Minimal cbrSubreports JSON for ``incomestatement -O json``."""
    return {
        "cbrDates": [],
        "cbrSubreports": [
            [
                "Revenues",
                {"prRows": [], "prTotals": {"prrAmounts": [[amt(-revenues)]]}},
                False,
            ],
            [
                "Expenses",
                {"prRows": [], "prTotals": {"prrAmounts": [[amt(expenses)]]}},
                False,
            ],
        ],
    }


def balance_total(value: float) -> list:
    """Minimal ``balance -O json`` shape: ``[[rows...], [totals...]]``."""
    return [[], [amt(value)]]
