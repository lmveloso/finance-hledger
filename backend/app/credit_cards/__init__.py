"""Credit-card breakdown domain (Fase 1).

Aggregates the per-card numbers the redesigned Mes tab anchors on:
outstanding debt, this-month spend, and live-installment count.
See ``docs/plans/PR-F1-2-credit-cards-endpoint.md``.
"""

from app.credit_cards.errors import CreditCardError
from app.credit_cards.models import CreditCard, CreditCardsResponse
from app.credit_cards.service import CreditCardsService

__all__ = [
    "CreditCard",
    "CreditCardError",
    "CreditCardsResponse",
    "CreditCardsService",
]
