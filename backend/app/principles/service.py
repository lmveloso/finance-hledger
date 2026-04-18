"""PrincipleService — orchestrates HledgerClient + PrincipleMapping.

The service is the integration point between typed hledger output and the
principles domain. Routes call ``monthly_summary(month)`` and receive a
fully-populated :class:`PrincipleSummary`; no raw hledger JSON leaks out.

Internal flow of ``monthly_summary``:

1. ``hledger print expenses -b BEGIN -e END -O json`` — returns the full
   transactions that touch an ``expenses:*`` account. Unlike ``register``,
   ``print`` preserves ``ptags``/``ttags`` exactly as written.
2. For each posting in each transaction:
   - skip non-expense postings (the contra side on assets/liabilities).
   - merge transaction-level tags with posting-level tags (posting wins).
   - resolve principle via :func:`resolve_principle`.
   - accumulate ``abs(amount)`` per principle.
3. Fetch revenues for the same period via ``incomestatement`` →
   :class:`IncomeStatement` for the denominator.
4. Build :class:`PrincipleBreakdown` rows, one per configured principle,
   always in the order the mapping defines (so the frontend table is
   stable). Empty principles are present with ``valor=0``.
"""

from __future__ import annotations

import logging
from typing import Any

from app.hledger.client import HledgerClient
from app.hledger.helpers import month_bounds
from app.hledger.models import Amount
from app.hledger.parsers import parse_income_statement
from app.principles.mappings import (
    extract_posting_tags,
    extract_transaction_tags,
)
from app.principles.pct import _balance_pct_matrix
from app.principles.models import (
    PrincipleBreakdown,
    PrincipleMapping,
    PrincipleMonthlyTotal,
    PrincipleSummary,
    PrincipleYearly,
    PrincipleYearlyCell,
    PrincipleYearlyRow,
)
from app.principles.resolver import resolve_principle

logger = logging.getLogger("finance-hledger")


class PrincipleService:
    def __init__(self, client: HledgerClient, mapping: PrincipleMapping):
        self._client = client
        self._mapping = mapping

    @property
    def mapping(self) -> PrincipleMapping:
        """Expose the loaded mapping — used by GET /api/principles/mapping."""
        return self._mapping

    def monthly_summary(self, month: str | None = None) -> PrincipleSummary:
        """Aggregate expenses per principle for one month."""
        begin, end = month_bounds(month)
        resolved_month = month or begin[:7]

        totals: dict[str, float] = {p.id: 0.0 for p in self._mapping.principles}
        any_uncovered: set[str] = set()  # principle ids that received fallback
        uncovered_accounts: set[str] = set()

        print_raw = self._client.run("print", "expenses", "-b", begin, "-e", end)
        if isinstance(print_raw, list):
            self._accumulate(print_raw, totals, any_uncovered, uncovered_accounts)

        denominator = self._fetch_revenues(begin, end)
        breakdown = self._build_breakdown(totals, denominator, any_uncovered)

        return PrincipleSummary(
            month=resolved_month,
            denominator=round(denominator, 2),
            breakdown=breakdown,
            uncovered_categories=sorted(uncovered_accounts),
        )

    def yearly_by_principle(self, year: int) -> PrincipleYearly:
        """Build the 7×12 principle/month matrix for one calendar year.

        Iterates month-by-month reusing :meth:`_accumulate`; per-month pct
        is rebalanced with largest-remainder so each column sums to 100.
        """
        months = [f"{year:04d}-{m:02d}" for m in range(1, 13)]
        principle_ids = [p.id for p in self._mapping.principles]
        per_month = {m: self._totals_for_month(m, principle_ids) for m in months}
        pct = _balance_pct_matrix(months, principle_ids, per_month)
        rows = [
            PrincipleYearlyRow(
                principle=p.id,
                display_key=p.display_key,
                target_pct=p.target_pct,
                monthly=[
                    PrincipleYearlyCell(
                        month=m,
                        value=round(per_month[m][p.id], 2),
                        pct=pct[m][p.id],
                    )
                    for m in months
                ],
            )
            for p in self._mapping.principles
        ]
        monthly_totals = [
            PrincipleMonthlyTotal(month=m, value=round(sum(per_month[m].values()), 2))
            for m in months
        ]
        return PrincipleYearly(
            year=year, months=months, principles=rows, monthly_totals=monthly_totals
        )

    def _totals_for_month(
        self, month: str, principle_ids: list[str]
    ) -> dict[str, float]:
        """Per-principle totals for ``month``; zeros when no transactions."""
        begin, end = month_bounds(month)
        totals = {pid: 0.0 for pid in principle_ids}
        raw = self._client.run("print", "expenses", "-b", begin, "-e", end)
        if isinstance(raw, list):
            self._accumulate(raw, totals, set(), set())
        return totals

    # ── internals ────────────────────────────────────────────────────

    def _accumulate(
        self,
        transactions: list[Any],
        totals: dict[str, float],
        any_uncovered: set[str],
        uncovered_accounts: set[str],
    ) -> None:
        for tx in transactions:
            if not isinstance(tx, dict):
                continue
            tx_tags = extract_transaction_tags(tx)
            for posting in tx.get("tpostings", []) or []:
                if not isinstance(posting, dict):
                    continue
                account = posting.get("paccount", "")
                if not account.startswith("expenses"):
                    continue
                amount = abs(Amount.sum_list(posting.get("pamount", [])))
                if amount == 0:
                    continue
                tags = dict(tx_tags)
                tags.update(extract_posting_tags(posting))  # posting wins
                pid, is_default = resolve_principle(account, tags, self._mapping)
                totals[pid] = totals.get(pid, 0.0) + amount
                if is_default:
                    any_uncovered.add(pid)
                    uncovered_accounts.add(account)

    def _fetch_revenues(self, begin: str, end: str) -> float:
        raw = self._client.run("incomestatement", "-b", begin, "-e", end)
        if not isinstance(raw, dict):
            return 0.0
        try:
            stmt = parse_income_statement(raw)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("principle.revenues_parse_failed", extra={"error": str(exc)})
            return 0.0
        return stmt.revenues

    def _build_breakdown(
        self,
        totals: dict[str, float],
        denominator: float,
        any_uncovered: set[str],
    ) -> list[PrincipleBreakdown]:
        rows: list[PrincipleBreakdown] = []
        for p in self._mapping.principles:
            valor = round(totals.get(p.id, 0.0), 2)
            realizado = 0.0
            if denominator > 0:
                realizado = round(100.0 * valor / denominator, 2)
            rows.append(
                PrincipleBreakdown(
                    principle=p.id,
                    display_key=p.display_key,
                    valor=valor,
                    meta_pct=p.target_pct,
                    realizado_pct=realizado,
                    delta_pct=round(realizado - p.target_pct, 2),
                    uncovered=p.id in any_uncovered,
                )
            )
        return rows
