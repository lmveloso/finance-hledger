"""Pydantic models for the per-card breakdown endpoint (Fase 1, PR-F1-2).

Names are English (project language convention). All amounts are positive
floats — refunds are netted into ``spend_this_month`` upstream so the
client never sees a negative spend.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class CreditCard(BaseModel):
    """One row per credit-card liability account."""

    account: str = Field(
        description="Raw hledger account, e.g. 'liabilities:cartão:nubank'.",
    )
    name: str = Field(
        description=(
            "Display name. Primary: alias from the journal's ``account`` "
            "directive (``; alias: <name>``). Fallback: last segment of the "
            "account path, title-cased (``liabilities:cartão:nubank`` → "
            "``Nubank``)."
        ),
    )
    outstanding_debt: float = Field(
        ge=0.0,
        description="Absolute balance at server-today; >= 0.",
    )
    spend_this_month: float = Field(
        ge=0.0,
        description=(
            "Sum of expense postings against this card in the requested "
            "month, net of refunds. Positive expense-side amounts (refunds) "
            "REDUCE the total. Floored at 0."
        ),
    )
    live_installments: int = Field(
        ge=0,
        description=(
            "Count of ``parcelamento:`` transactions whose contra-posting is "
            "this card and whose ``expected_completion = purchase_date + N "
            "months`` is greater than or equal to today."
        ),
    )


class CreditCardsResponse(BaseModel):
    """Output of ``GET /api/credit-cards?month=YYYY-MM``."""

    month: str = Field(description="The queried month, YYYY-MM.")
    cards: list[CreditCard] = Field(default_factory=list)
    last_updated: str = Field(
        description="ISO-8601 timestamp of journal file mtime.",
    )
