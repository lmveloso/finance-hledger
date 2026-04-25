"""Pydantic model for the Mes tab anchor payload.

All field names are English. All amounts are positive floats; ``leftover``
is the only signed field — it goes negative when expense exceeds income.
``month`` is always ``YYYY-MM``.

Frontend uses ``leftover < 0`` to switch the anchor card colour, and
``last_updated`` (journal mtime, ISO-8601) drives the freshness footer.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class MonthSummary(BaseModel):
    """Anchor numbers for the Mes tab."""

    month: str = Field(description="Target month in YYYY-MM format.")

    # Income / expense (accrual basis).
    income: float = Field(
        ge=0.0,
        description="Sum of income:* postings in the month (positive).",
    )
    expense: float = Field(
        ge=0.0,
        description="Sum of expenses:* postings in the month (positive).",
    )
    expense_via_assets: float = Field(
        ge=0.0,
        description="Expense whose contra-posting is assets:* (positive).",
    )
    expense_via_credit_card: float = Field(
        ge=0.0,
        description=(
            "Expense whose contra-posting is liabilities:<card-prefix>:* "
            "(positive). Invariant: expense ~= expense_via_assets + "
            "expense_via_credit_card (within R$ 0.01)."
        ),
    )

    # Cash-flow on credit-card liability.
    credit_card_payment: float = Field(
        ge=0.0,
        description=(
            "Sum of payments to liabilities:<card-prefix>:* in the month "
            "(asset -> liability postings, positive)."
        ),
    )

    # Liability snapshots — absolute values.
    credit_card_debt_today: float = Field(
        ge=0.0,
        description=(
            "Total card debt at server-today, regardless of selected month."
        ),
    )
    debt_start_of_month: float = Field(
        ge=0.0,
        description="|balance at first-day-of-month, --historical|.",
    )
    debt_end_of_month: float = Field(
        ge=0.0,
        description="|balance at last-day-of-month, --historical|.",
    )

    # Derived (signed).
    leftover: float = Field(
        description=(
            "income - expense (signed). Negative when expense > income; "
            "frontend switches the anchor card colour on this sign."
        ),
    )

    # Bookkeeping.
    last_updated: str = Field(
        description=(
            "ISO-8601 timestamp of the journal file mtime — drives the "
            "freshness footer of the Mes tab."
        ),
    )
