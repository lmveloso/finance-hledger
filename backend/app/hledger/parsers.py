"""
Unified parsers for hledger JSON output.

These functions transform raw hledger JSON dicts/lists into Pydantic models.
All cbrSubreports/prrAmounts parsing lives here — routes call these instead
of duplicating the parsing logic.

This module consolidates the parsing that was previously scattered across
/api/cashflow, /api/networth, /api/forecast, /api/account-balance-history.
"""

from __future__ import annotations

from typing import Any

from app.hledger.models import (
    Amount,
    BalanceReport,
    IncomeStatement,
    PeriodReport,
)


def parse_balance_report(raw: Any) -> BalanceReport:
    """Parse hledger balance -O json output into BalanceReport."""
    return BalanceReport.from_raw(raw)


def parse_period_report(raw: Any) -> PeriodReport:
    """Parse hledger incomestatement/balancesheet -O json into PeriodReport.

    Handles the cbrDates + cbrSubreports shape from -M (monthly) reports.
    This is the single point of parsing for all endpoints that iterate
    over monthly periods.
    """
    return PeriodReport.from_raw(raw)


def parse_income_statement(raw: Any) -> IncomeStatement:
    """Parse hledger incomestatement -O json into IncomeStatement."""
    period = PeriodReport.from_raw(raw)
    return IncomeStatement.from_period(period)


def cashflow_from_incomestatement(raw: Any) -> list[dict]:
    """Extract monthly cashflow (receitas/despesas) from incomestatement JSON.

    Returns a list of {"mes": "YYYY-MM", "receitas": float, "despesas": float}
    ready for the /api/cashflow endpoint.
    """
    report = PeriodReport.from_raw(raw)
    result = []

    for date_range in report.dates:
        # date_range is (start_date, end_date), extract YYYY-MM from start
        mes = date_range[0][:7] if date_range else ""

        revenues_sub = report.subreport("revenue", "income")
        expenses_sub = report.subreport("expense")

        receitas = 0.0
        if revenues_sub:
            for row in revenues_sub.rows:
                idx = report.dates.index(date_range) if date_range in report.dates else -1
                if 0 <= idx < len(row.amounts):
                    receitas += abs(row.amounts[idx])

        despesas = 0.0
        if expenses_sub:
            for row in expenses_sub.rows:
                idx = report.dates.index(date_range) if date_range in report.dates else -1
                if 0 <= idx < len(row.amounts):
                    despesas += abs(row.amounts[idx])

        result.append({
            "mes": mes,
            "receitas": round(receitas, 2),
            "despesas": round(despesas, 2),
        })

    return result
