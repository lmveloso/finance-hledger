"""Credit-card breakdown domain (Fase 1).

Aggregates the per-card numbers the redesigned Mes tab anchors on:
outstanding debt, this-month spend, and live-installment count.
See ``docs/plans/PR-F1-2-credit-cards-endpoint.md``.
"""

# Canonical credit-card account prefixes. Shared by:
#   - ``app.credit_cards.service.CreditCardsService`` to discover card
#     accounts from the journal.
#   - ``app.routes.installments`` to pick the card leg out of each
#     forecast posting.
# Journals can mix any combination of:
#   - ``liabilities:cartão:*`` (matches ADR-011 verbatim)
#   - ``liabilities:cartao:*`` (no accent, file-system friendly)
#   - ``liabilities:credit-card:*`` (full English, future-friendly)
CARD_PREFIXES: tuple[str, ...] = (
    "liabilities:cartão:",
    "liabilities:cartao:",
    "liabilities:credit-card:",
)

from app.credit_cards.models import CreditCard, CreditCardsResponse
from app.credit_cards.service import CreditCardsService

__all__ = [
    "CARD_PREFIXES",
    "CreditCard",
    "CreditCardsResponse",
    "CreditCardsService",
]
