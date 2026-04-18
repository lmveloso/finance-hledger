"""Pydantic models for hledger JSON output.

Only the fields routes actually use are modeled. hledger emits a lot
of metadata (astyle, sourceColumn, decimalMantissa) that is dropped
in ``from_raw`` constructors to keep the models narrow.

``from_raw`` is defensive: hledger JSON has shifted between 1.25, 1.40
and 1.52. Known shapes are accepted; :class:`HledgerParseError` is
raised only when the top-level structure is wholly missing.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from .errors import HledgerParseError

PostingStatus = Literal["Unmarked", "Pending", "Cleared"]


class Amount(BaseModel):
    commodity: str = ""
    quantity: float = 0.0

    @classmethod
    def from_raw(cls, raw: Any) -> "Amount":
        """Extract a single Amount from hledger's amount dict or a bare number."""
        if isinstance(raw, (int, float)):
            return cls(quantity=float(raw))
        if not isinstance(raw, dict):
            return cls()
        commodity = raw.get("acommodity", "") or ""
        aq = raw.get("aquantity")
        if isinstance(aq, dict):
            return cls(commodity=commodity, quantity=float(aq.get("floatingPoint", 0)))
        if isinstance(aq, (int, float)):
            return cls(commodity=commodity, quantity=float(aq))
        return cls(commodity=commodity)

    @classmethod
    def sum_list(cls, raw: Any) -> float:
        """Sum amount dicts (flat list or list-of-lists) into a single float."""
        if raw is None:
            return 0.0
        if isinstance(raw, (int, float)):
            return float(raw)
        if isinstance(raw, dict):
            return cls.from_raw(raw).quantity
        if not isinstance(raw, list):
            return 0.0
        total = 0.0
        for item in raw:
            if isinstance(item, list):
                for inner in item:
                    total += cls.from_raw(inner).quantity
            else:
                total += cls.from_raw(item).quantity
        return total


class Account(BaseModel):
    name: str
    depth: int = 0
    balance: float = 0.0


class Posting(BaseModel):
    account: str
    amount: float
    status: PostingStatus = "Unmarked"
    comment: str = ""

    @classmethod
    def from_raw(cls, raw: dict) -> "Posting":
        return cls(
            account=raw.get("paccount", ""),
            amount=Amount.sum_list(raw.get("pamount", [])),
            status=raw.get("pstatus", "Unmarked"),
            comment=raw.get("pcomment", "") or "",
        )


class Transaction(BaseModel):
    date: str
    description: str
    status: PostingStatus = "Unmarked"
    postings: list[Posting] = Field(default_factory=list)
    comment: str = ""

    @classmethod
    def from_raw(cls, raw: dict) -> "Transaction":
        return cls(
            date=raw.get("tdate", ""),
            description=raw.get("tdescription", ""),
            status=raw.get("tstatus", "Unmarked"),
            postings=[Posting.from_raw(p) for p in raw.get("tpostings", [])],
            comment=raw.get("tcomment", "") or "",
        )


class BalanceReport(BaseModel):
    """Output of ``hledger balance -O json``.

    Shape: ``[[[name, display, depth, amounts], ...], [total_amounts]]``.
    """

    accounts: list[Account] = Field(default_factory=list)
    total: float = 0.0

    @classmethod
    def from_raw(cls, raw: Any) -> "BalanceReport":
        if not isinstance(raw, list) or len(raw) < 1:
            raise HledgerParseError("balance JSON must be a two-element list")
        rows_raw = raw[0] if isinstance(raw[0], list) else []
        totals_raw = raw[1] if len(raw) > 1 else []
        accounts: list[Account] = []
        for row in rows_raw:
            if not isinstance(row, list) or len(row) < 4:
                continue
            name = row[0] if isinstance(row[0], str) else ""
            depth = row[2] if isinstance(row[2], int) else 0
            accounts.append(
                Account(name=name, depth=depth, balance=Amount.sum_list(row[3]))
            )
        return cls(accounts=accounts, total=Amount.sum_list(totals_raw))


class PeriodRow(BaseModel):
    name: str
    amounts: list[float] = Field(default_factory=list)
    total: float = 0.0


class PeriodSubreport(BaseModel):
    name: str
    rows: list[PeriodRow] = Field(default_factory=list)
    totals: list[float] = Field(default_factory=list)


class PeriodReport(BaseModel):
    """Output of ``hledger incomestatement/balancesheet -O json``."""

    dates: list[tuple[str, str]] = Field(default_factory=list)
    subreports: list[PeriodSubreport] = Field(default_factory=list)

    @classmethod
    def from_raw(cls, raw: Any) -> "PeriodReport":
        if not isinstance(raw, dict):
            raise HledgerParseError("period report JSON must be an object")
        dates = [
            (str(p[0]), str(p[1]))
            for p in raw.get("cbrDates", [])
            if isinstance(p, list) and len(p) == 2
        ]
        subreports: list[PeriodSubreport] = []
        for sub in raw.get("cbrSubreports", []):
            if not isinstance(sub, list) or len(sub) < 2:
                continue
            name = sub[0] if isinstance(sub[0], str) else ""
            body = sub[1] if isinstance(sub[1], dict) else {}
            rows = [
                PeriodRow(
                    name=r.get("prrName", ""),
                    amounts=[Amount.sum_list(a) for a in r.get("prrAmounts", [])],
                    total=Amount.sum_list(r.get("prrTotal", [])),
                )
                for r in body.get("prRows", [])
            ]
            totals = [
                Amount.sum_list(a)
                for a in (body.get("prTotals") or {}).get("prrAmounts", [])
            ]
            subreports.append(PeriodSubreport(name=name, rows=rows, totals=totals))
        return cls(dates=dates, subreports=subreports)

    def subreport(self, *needles: str) -> Optional[PeriodSubreport]:
        """Find a subreport by case-insensitive substring match."""
        for sub in self.subreports:
            low = sub.name.lower()
            if any(n.lower() in low for n in needles):
                return sub
        return None


class IncomeStatement(BaseModel):
    revenues: float = 0.0
    expenses: float = 0.0
    net: float = 0.0
    raw: PeriodReport

    @classmethod
    def from_period(cls, report: PeriodReport) -> "IncomeStatement":
        rev = report.subreport("revenue", "income")
        exp = report.subreport("expense")
        revenues = abs(sum(rev.totals)) if rev else 0.0
        expenses = abs(sum(exp.totals)) if exp else 0.0
        return cls(revenues=revenues, expenses=expenses, net=revenues - expenses, raw=report)
