"""CreditCardsService — orchestrates HledgerClient + alias parser.

Returns one ``CreditCard`` per liability account that is either
non-zero or had activity in the queried month. No subprocess access:
all hledger calls go through :class:`HledgerClient` per ADR-004; the
alias map is read straight from the journal source via
:mod:`app.credit_cards.aliases`.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

from app.credit_cards.aliases import (
    display_name,
    parse_account_aliases,
    safe_mtime_iso,
)
from app.credit_cards.installments import count_live_for_card
from app.credit_cards.models import CreditCard, CreditCardsResponse
from app.hledger.client import HledgerClient
from app.hledger.helpers import month_bounds
from app.hledger.models import Amount

logger = logging.getLogger("finance-hledger")


class CreditCardsService:
    """Per-card aggregator for the Mes tab Cartões expansion."""

    # PR-F1-1 Open Q1 (RESOLVED): support all three liability prefixes
    # simultaneously. Journals can mix any combination of:
    #   - liabilities:cartão:*  (matches ADR-011 verbatim)
    #   - liabilities:cartao:*  (no accent, file-system friendly)
    #   - liabilities:credit-card:*  (full English, future-friendly)
    # The frontend MUST NOT re-introduce a client-side filter — this
    # constant is canonical (PR-F1-3 ``useCartoesMes``).
    CARD_PREFIXES = (
        "liabilities:cartão:",
        "liabilities:cartao:",
        "liabilities:credit-card:",
    )

    def __init__(
        self,
        client: HledgerClient,
        journal_path: Optional[Path] = None,
        today: Optional[date] = None,
    ) -> None:
        self._client = client
        self._journal_path = journal_path
        self._today = today  # injectable for tests; None -> date.today()

    # ── public API ────────────────────────────────────────────────

    def for_month(self, month: Optional[str] = None) -> CreditCardsResponse:
        """Compute per-card numbers for ``month`` (default: current month)."""
        begin, end = month_bounds(month)
        resolved_month = month or begin[:7]

        accounts = self._discover_card_accounts()
        aliases = self._load_aliases()
        today = self._today or date.today()

        cards: list[CreditCard] = []
        for acct in sorted(accounts):
            outstanding = self._outstanding_debt(acct)
            spend = self._spend_this_month(acct, begin, end)
            live = self._live_installments(acct, today)
            if outstanding == 0 and spend == 0:
                continue
            cards.append(
                CreditCard(
                    account=acct,
                    name=display_name(acct, aliases),
                    outstanding_debt=round(outstanding, 2),
                    spend_this_month=round(max(spend, 0.0), 2),
                    live_installments=live,
                )
            )

        cards.sort(key=lambda c: (-c.outstanding_debt, c.name))
        return CreditCardsResponse(
            month=resolved_month,
            cards=cards,
            last_updated=self._last_updated(),
        )

    # ── steps ─────────────────────────────────────────────────────

    def _discover_card_accounts(self) -> set[str]:
        """Return the set of card-leaf accounts present in the journal.

        ``hledger accounts`` does NOT support ``-O json`` — it returns
        plain text, one account per line. We pass ``output_format="text"``
        and split. Filter to entries that strictly start with one of
        CARD_PREFIXES so a top-level ``liabilities:cartão`` declaration
        without children is dropped.
        """
        out: set[str] = set()
        for prefix in self.CARD_PREFIXES:
            raw = self._client.run(
                "accounts", prefix.rstrip(":"), output_format="text"
            )
            if not isinstance(raw, str):
                continue
            for line in raw.splitlines():
                line = line.strip()
                if line.startswith(prefix):
                    out.add(line)
        return out

    def _outstanding_debt(self, account: str) -> float:
        """``balance <account> --historical`` summed and absolute-valued."""
        raw = self._client.run("balance", account, "--historical")
        return abs(_sum_balance_total(raw))

    def _spend_this_month(self, account: str, begin: str, end: str) -> float:
        """Sum expense postings whose contra-posting is ``account``.

        Refunds (positive expense-side amounts) reduce the total. The
        caller floors the result at 0 before exposing it.

        Sign convention: a hledger expense posting is positive for an
        outflow; a refund posts a negative number on the same expense
        leg, so summing signed amounts gives the net spend.
        """
        raw = self._client.run("print", "-b", begin, "-e", end)
        if not isinstance(raw, list):
            return 0.0
        total = 0.0
        for tx in raw:
            if not isinstance(tx, dict):
                continue
            postings = tx.get("tpostings") or []
            if not _has_account(postings, account):
                continue
            for posting in postings:
                if not isinstance(posting, dict):
                    continue
                if not posting.get("paccount", "").startswith("expenses"):
                    continue
                total += Amount.sum_list(posting.get("pamount", []))
        return total

    def _live_installments(self, account: str, today: date) -> int:
        """Count distinct parcelamento series with future occurrences on this card.

        Forecast is required so series whose remaining installments live
        in ``parcelamentos.journal`` (`~ monthly`) are visible. Without
        ``--forecast`` we'd only see past one-offs and undercount live
        commitments to zero in many cases.
        """
        raw = self._client.run("print", "--forecast", "tag:parcelamento")
        if not isinstance(raw, list):
            return 0
        return count_live_for_card(raw, account, today=today)

    def _load_aliases(self) -> dict[str, str]:
        if self._journal_path is None:
            return {}
        return parse_account_aliases(self._journal_path)

    def _last_updated(self) -> str:
        """ISO-8601 mtime of the journal file, or ``now`` when unavailable."""
        if self._journal_path is not None:
            stamp = safe_mtime_iso(self._journal_path)
            if stamp is not None:
                return stamp
        return datetime.now(tz=timezone.utc).isoformat()


def _has_account(postings: Iterable[Any], account: str) -> bool:
    for posting in postings:
        if isinstance(posting, dict) and posting.get("paccount") == account:
            return True
    return False


def _sum_balance_total(raw: Any) -> float:
    """Pull the total out of a ``balance -O json`` response.

    Shape is ``[[rows], [totals]]``. ``rows`` may be empty when no
    transactions touch the account; ``totals`` then is also empty.
    """
    if not isinstance(raw, list) or len(raw) < 2:
        return 0.0
    return Amount.sum_list(raw[1])
