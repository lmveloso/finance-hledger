"""Month summary domain (Fase 1).

Anchor numbers for the redesigned Mes tab — income, expense, the two
contra-bucket splits (assets vs credit-card liability), card payment in
the month, total card debt today, debt at start/end of month, and
``leftover`` (the only signed field).

Surfaced via ``GET /api/month-summary?month=YYYY-MM`` (see
``app.routes.month_summary``). All hledger access flows through
:class:`HledgerClient` per ADR-004 — this package is a pure orchestrator.
"""

from app.month_summary.models import MonthSummary
from app.month_summary.service import MonthSummaryService

__all__ = ["MonthSummary", "MonthSummaryService"]
