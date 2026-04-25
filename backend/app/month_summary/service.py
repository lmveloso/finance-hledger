"""MonthSummaryService — orchestrates HledgerClient for the Mes tab.

Pure orchestrator: every hledger call goes through :class:`HledgerClient`
(ADR-004). No ``subprocess`` import here. Bucketing helpers live in
:mod:`app.month_summary.buckets`. Pipeline reference is in the plan
``docs/plans/PR-F1-1-month-summary-endpoint.md`` §Service.
"""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

from app.hledger.client import HledgerClient
from app.hledger.helpers import month_bounds
from app.hledger.models import BalanceReport
from app.hledger.parsers import parse_income_statement
from app.month_summary.buckets import (
    bucket_for,
    classify_postings,
    is_card_payment,
    sum_card_side,
)
from app.month_summary.models import MonthSummary

logger = logging.getLogger("finance-hledger")

# Tolerance for the split invariant (BRL 0.01).
_INVARIANT_TOLERANCE = 0.01


class MonthSummaryService:
    """Read-only orchestrator over :class:`HledgerClient`."""

    # Card-liability prefix accepted (Open Q1 resolved in
    # docs/plans/PR-F1-1-month-summary-endpoint.md).
    # Support all THREE forms simultaneously so the journal can mix any
    # combination and PR-F1-2/PR-F1-3 reuse the same constant. Listed in
    # priority order: ADR-010 verbatim spelling first, file-system friendly
    # ASCII second, future-friendly English third.
    CARD_PREFIXES: tuple[str, ...] = (
        "liabilities:cartão:",
        "liabilities:cartao:",
        "liabilities:credit-card:",
    )

    def __init__(self, client: HledgerClient, journal_path: Path | str | None = None):
        self._client = client
        self._journal_path = Path(journal_path) if journal_path else None

    def for_month(self, month: str | None = None) -> MonthSummary:
        """Compute the eight anchor numbers for ``month`` (default: today)."""
        begin, end = month_bounds(month)
        resolved_month = month or begin[:7]

        income, expense = self._income_and_expense(begin, end)
        via_assets, via_card = self._expense_split(begin, end)
        card_payment = self._credit_card_payment(begin, end)
        debt_today = self._debt_today()
        debt_start = self._debt_at(begin)
        debt_end = self._debt_at(end)
        leftover = income - expense

        self._warn_if_invariant_breaks(expense, via_assets, via_card)

        return MonthSummary(
            month=resolved_month,
            income=round(income, 2),
            expense=round(expense, 2),
            expense_via_assets=round(via_assets, 2),
            expense_via_credit_card=round(via_card, 2),
            credit_card_payment=round(card_payment, 2),
            credit_card_debt_today=round(debt_today, 2),
            debt_start_of_month=round(debt_start, 2),
            debt_end_of_month=round(debt_end, 2),
            leftover=round(leftover, 2),
            last_updated=self._journal_mtime_iso(),
        )

    def _income_and_expense(self, begin: str, end: str) -> tuple[float, float]:
        raw = self._client.run("incomestatement", "-b", begin, "-e", end)
        if not isinstance(raw, dict):
            return 0.0, 0.0
        try:
            stmt = parse_income_statement(raw)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning(
                "month_summary.incomestatement_parse_failed",
                extra={"error": str(exc)},
            )
            return 0.0, 0.0
        return stmt.revenues, stmt.expenses

    def _expense_split(self, begin: str, end: str) -> tuple[float, float]:
        """Bucket every expenses:* transaction by its contra-posting."""
        raw = self._client.run("print", "expenses:", "-b", begin, "-e", end)
        if not isinstance(raw, list):
            return 0.0, 0.0

        via_assets = 0.0
        via_card = 0.0
        for tx in raw:
            if not isinstance(tx, dict):
                continue
            postings = tx.get("tpostings") or []
            expense_total, contras = classify_postings(postings)
            if expense_total == 0:
                continue
            target = bucket_for(contras, self.CARD_PREFIXES, tx)
            if target == "assets":
                via_assets += expense_total
            elif target == "card":
                via_card += expense_total
            # "other" was already logged inside ``bucket_for``.

        return via_assets, via_card

    def _credit_card_payment(self, begin: str, end: str) -> float:
        """Sum |amount| of asset -> card-liability transactions in the month."""
        raw = self._client.run("print", "-b", begin, "-e", end)
        if not isinstance(raw, list):
            return 0.0

        total = 0.0
        for tx in raw:
            if not isinstance(tx, dict):
                continue
            postings = tx.get("tpostings") or []
            if not is_card_payment(postings, self.CARD_PREFIXES):
                continue
            total += sum_card_side(postings, self.CARD_PREFIXES)
        return total

    def _debt_today(self) -> float:
        return self._sum_card_balance(extra_args=())

    def _debt_at(self, end_iso: str) -> float:
        return self._sum_card_balance(extra_args=("-e", end_iso))

    def _sum_card_balance(self, extra_args: tuple[str, ...]) -> float:
        """Run ``balance <card prefixes> --historical`` and sum |total|."""
        args: list[str] = ["balance"]
        args.extend(self.CARD_PREFIXES)
        args.append("--historical")
        args.extend(extra_args)
        raw = self._client.run(*args)
        if not isinstance(raw, list):
            return 0.0
        try:
            report = BalanceReport.from_raw(raw)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning(
                "month_summary.balance_parse_failed",
                extra={"error": str(exc), "hledger_args": args},
            )
            return 0.0
        return abs(report.total)

    def _journal_mtime_iso(self) -> str:
        """Return the journal file mtime as ISO-8601, or empty string."""
        if self._journal_path is None:
            return ""
        try:
            mtime = self._journal_path.stat().st_mtime
        except OSError as exc:
            logger.warning(
                "month_summary.journal_stat_failed path=%s error=%s",
                self._journal_path,
                exc,
            )
            return ""
        return datetime.fromtimestamp(mtime).replace(microsecond=0).isoformat()

    @staticmethod
    def _warn_if_invariant_breaks(
        expense: float, via_assets: float, via_card: float
    ) -> None:
        diff = abs(expense - (via_assets + via_card))
        if diff > _INVARIANT_TOLERANCE:
            logger.warning(
                "month_summary.split_invariant_break",
                extra={
                    "expense": round(expense, 2),
                    "via_assets": round(via_assets, 2),
                    "via_card": round(via_card, 2),
                    "diff": round(diff, 2),
                },
            )
