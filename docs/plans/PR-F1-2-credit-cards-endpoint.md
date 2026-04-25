# PR-F1-2: `/api/credit-cards` — per-card breakdown for the Cartões expansion

**Phase:** Fase 1 (Monthly view dashboard)
**Scope:** New backend endpoint that returns one row per credit-card liability account, with the four numbers PRD-07 §3.4 (Adições 1–4) and PRD-08 §4.4 require: outstanding debt, this-month spend on this card, count of live installments, and the journal's last-updated timestamp. The Mes tab's Cartões expansion consumes this endpoint instead of fanning out N transaction queries from the client (the current `useCreditCards.js` strategy).
**Depends on:** Fase 0 complete (HledgerClient), ADR-010 merged. Does NOT depend on PR-F1-1.
**Does NOT depend on:** PR-F1-3 (frontend). The two backend PRs land independently; the frontend rebuild waits on both.
**Related ADRs:** ADR-004 (hledger via HledgerClient), ADR-010 (installments — `parcelamento:` tag is the source of "live installments" count).
**Review follow-up consumed:** see `docs/plans/PR-F1-review-followup.md`. The server-side `CARD_PREFIXES` filter is canonical — PR-F1-3's `useCartoesMes` hook MUST NOT re-introduce a client-side card-prefix filter. Quote PR-F1-1's Open Q1 resolution in this PR's description and in a comment on `CreditCardsService.CARD_PREFIXES`.

---

## Open questions (RESOLVED — record in PR description)

1. **Card-prefix support — RESOLVED (inherits PR-F1-1 Q1).** Support **all three** prefixes simultaneously. The service constant matches PR-F1-1 verbatim:
   ```python
   CARD_PREFIXES = (
       "liabilities:cartão:",
       "liabilities:cartao:",
       "liabilities:credit-card:",
   )
   ```
   Quote PR-F1-1's Open Q1 resolution in this PR's description and in a comment on `CreditCardsService.CARD_PREFIXES`.

2. **"Live installments" definition — RESOLVED (b).** Parse the `parcelamento: NAME Nx` tag, compute `expected_completion = purchase_date + N months`, count rows where `expected_completion >= today` AND the contra-posting is this specific card. The parser lives in `app/credit_cards/installments.py` (`parse_parcelamento_tag()` + `live_installments()`).

3. **"This-month spend on this card" — RESOLVED (b).** Sum of `expenses:*` postings in the month whose contra-posting is this card, with **refunds/chargebacks** (positive amounts on the card's expense side) reducing the total. Matches the existing `useCreditCards.js` aggregation behavior.

4. **Card display name — RESOLVED (c with b fallback).** Primary: read alias from the journal's `account` declaration. Convention: a comment-tag of the form `; alias: <display name>` on the `account` directive line, e.g.:
   ```
   account liabilities:cartão:nubank   ; alias: Nubank Lucas
   ```
   If no alias is declared for the card account, fall back to **(b)**: last segment of the account path, title-cased (`liabilities:cartão:nubank` → "Nubank").

   **Implementation scope note (added because (c) was the architect's "defer to future PR" option):**
   - hledger does NOT expose `account`-directive comment metadata via JSON. This PR adds a small journal-file parser at `app/credit_cards/aliases.py`.
   - The parser reads `LEDGER_FILE` (path provided by `Settings.ledger_file`), scans for lines matching `^account\s+(\S+)\s+;\s*alias:\s*(.+?)\s*$`, and returns a `dict[str, str]` mapping account path → alias.
   - Edge cases the parser must handle:
     - The journal can include other files via `include path/to/other.journal`. The parser must follow `include` directives recursively (depth-limited; warn and stop at depth 4).
     - `include` paths can be relative (resolve against the including file's directory) or absolute.
     - Lines with no comment, comments without `alias:`, or malformed alias values are skipped silently.
     - File I/O errors (missing include file, permission denied) log a warning and the parser falls back to (b) for the affected entries.
   - Tests in `tests/unit/test_aliases_parser.py` cover: simple alias, alias with spaces, no alias (fallback), `include` directive resolution, missing include file, malformed alias line.
   - **Effort delta:** +0.5 day vs the original (b)-only estimate.

---

## File structure

```
backend/
├── app/
│   ├── credit_cards/
│   │   ├── __init__.py
│   │   ├── models.py              # Pydantic: CreditCard, CreditCardsResponse
│   │   ├── service.py             # CreditCardsService
│   │   ├── installments.py        # parse_parcelamento_tag(), live_installments()
│   │   ├── aliases.py             # parse_account_aliases(journal_path) — Q4(c)
│   │   └── errors.py
│   ├── routes/
│   │   └── credit_cards.py        # APIRouter — /api/credit-cards
│   └── deps.py                    # add get_credit_cards_service()
└── tests/
    ├── unit/
    │   ├── test_credit_cards_service.py
    │   ├── test_installments_parser.py
    │   └── test_aliases_parser.py
    └── test_credit_cards_route.py
```

Keep each file ≤ 200 lines.

---

## Pydantic models (`app/credit_cards/models.py`)

```python
class CreditCard(BaseModel):
    """One row per credit-card liability account."""

    account: str                        # raw hledger account: "liabilities:cartão:nubank"
    name: str                           # display name (Q4: alias from `account` directive if present,
                                        # else last segment title-cased: "Nubank")
    outstanding_debt: float             # |balance at server-today|, >= 0
    spend_this_month: float             # sum of expense postings against this card in `month`,
                                        # net of refunds (positive expense-side amounts reduce total), >= 0
    live_installments: int              # count of parcelamentos where expected_completion >= today

class CreditCardsResponse(BaseModel):
    month: str                          # the queried month
    cards: list[CreditCard]
    last_updated: str                   # ISO-8601, journal file mtime
```

Notes:
- The list is sorted by `outstanding_debt desc`, then by `name asc` for stable ordering.
- Cards with both `outstanding_debt == 0` and `spend_this_month == 0` are excluded from the response (they add noise — they're paid off and not in use).

---

## Service (`app/credit_cards/service.py`)

Pure orchestrator over `HledgerClient`. No `subprocess`.

```python
class CreditCardsService:
    CARD_PREFIXES = (
        "liabilities:cartão:",
        "liabilities:cartao:",
        "liabilities:credit-card:",
    )  # Open Q1 resolved: support all three forms (matches PR-F1-1)

    def __init__(self, client: HledgerClient): ...

    def for_month(self, month: str) -> CreditCardsResponse:
        """Compute per-card numbers for one month.

        Steps:
        1. Discover card accounts: `accounts liabilities:cartão liabilities:cartao -O json`.
           Filter to leaves matching CARD_PREFIXES. (Use the union of both spellings
           until Open Q1 picks a canonical form.)
        2. For each card account in parallel:
           a. outstanding_debt: `balance <account> --historical -O json` (no -b/-e).
           b. spend_this_month: `print -b X -e Y -O json` filtered to transactions
              whose contra-posting is this card AND whose other posting starts with
              `expenses:*`. Sum |amounts|.
           c. live_installments: `print -O json` for transactions tagged
              `parcelamento:` whose contra-posting is this card. Parse the tag
              ("NAME Nx"), compute expected_completion = purchase_date + N months,
              count rows where completion >= today.
        3. Filter out cards where both outstanding_debt and spend_this_month are 0.
        4. Sort by outstanding_debt desc, then name asc.
        5. last_updated: stat the journal file mtime.
        """
```

**Why a new endpoint instead of expanding `/api/accounts` or reusing `useCreditCards.js`'s client-side aggregation:**
- The current frontend strategy fans out N+2 requests (one `/api/flow`, one `/api/accounts`, then N `/api/transactions` calls — one per card). For a family with 3-4 cards that's 5-6 round-trips per Mes-tab visit. Bundling server-side is cheaper and lets the API-level fixtures cover the contract.
- `/api/accounts` is generic (returns every account) and the frontend has been doing the card-specific filtering. Pushing that filter server-side makes the contract explicit.

**`parse_parcelamento_tag` (`app/credit_cards/installments.py`):**
- Parses `parcelamento: ELECTROLUX 10x` → `("ELECTROLUX", 10)`.
- Tolerates whitespace and case (`10X`, `10 x`).
- Returns `None` on malformed tag (logged warning, not an exception).
- Pure function, easy unit tests.

---

## REST endpoint (`app/routes/credit_cards.py`)

### GET `/api/credit-cards`

**Query:**
- `month` (optional, `YYYY-MM`): target month for `spend_this_month`. Default: current month.

**Response (200):** `CreditCardsResponse` per §Pydantic models.

**Errors:**
- `422` if `month` is not `YYYY-MM`.
- `503` / `504` / `500` for hledger errors (mirror PR-F1-1).

**Auth:** `Depends(get_current_user)`.

---

## Test strategy

### Unit — `tests/unit/test_installments_parser.py`

- `test_parse_simple` — `"ELECTROLUX 10x"` → `("ELECTROLUX", 10)`.
- `test_parse_uppercase_x` — `"VIAGEM 5X"` → `("VIAGEM", 5)`.
- `test_parse_whitespace` — `"  IPHONE  12 x  "` → `("IPHONE", 12)`.
- `test_parse_malformed_returns_none` — `"only-a-name"`, `"NAME 0x"`, empty string → `None`, warning logged.

### Unit — `tests/unit/test_credit_cards_service.py`

Stub HledgerClient. Assert:
- `test_basic_month` — one card, one purchase, one payment → outstanding & spend both correct.
- `test_excludes_dormant_cards` — card with zero balance and zero monthly spend is filtered out.
- `test_sort_by_debt_desc` — three cards with different balances → output ordered correctly.
- `test_live_installments_active_and_completed` — two installment txs, one whose schedule still runs and one already completed → count is 1.
- `test_card_prefix_accent_and_no_accent_unified` — until Open Q1 lands, both spellings appear in the same response.
- `test_refund_reduces_spend_this_month` — a positive expense (refund) on a card reduces `spend_this_month` (Open Q3 = (b)).

### Integration — `tests/test_credit_cards_route.py`

Reuse the fixture journal from PR-F1-1 (or extend it). Add:
- A second card account.
- An installment tx tagged `parcelamento: TV 6x` from 5 months ago (still 1 month live).
- A completed installment from 2 years ago.

Tests:
- `test_returns_200_with_two_cards`.
- `test_installment_count_excludes_completed_schedules`.
- `test_dormant_card_excluded`.
- `test_invalid_month_returns_422`.
- `test_unauth_returns_401`.

---

## Acceptance criteria

- [ ] `app/credit_cards/` exists with `models.py`, `service.py`, `installments.py`, `aliases.py`, `errors.py`.
- [ ] `aliases.py` parses `account <path> ; alias: <name>` directives, follows `include` recursively (depth-limited), and tolerates missing/malformed lines.
- [ ] `CreditCard.name` uses the alias when present, falls back to last-segment-title-cased otherwise.
- [ ] `CreditCard` model has the five fields above (account, name, outstanding_debt, spend_this_month, live_installments).
- [ ] `GET /api/credit-cards?month=YYYY-MM` returns `CreditCardsResponse`.
- [ ] Cards with both `outstanding_debt == 0` and `spend_this_month == 0` are excluded.
- [ ] Sort: outstanding_debt desc, name asc.
- [ ] `live_installments` count derives from the `parcelamento:` tag and the today-vs-expected-completion comparison (Open Q2 = (b)).
- [ ] No new `subprocess` import outside `HledgerClient` (ADR-004).
- [ ] No regression in existing endpoints; `/api/accounts` is untouched.
- [ ] PR description references PR-F1-1's Open Q1 resolution and confirms Open Q2/Q3/Q4.
- [ ] New unit + integration tests pass; existing suite green.

---

## Estimated effort

**2.5-3.5 days** of active development (+0.5d vs original 2-3d after Q4(c) chose alias-from-`account`-directive):
- 0.5d — scaffold + Pydantic models + deps wiring.
- 1.0d — `CreditCardsService` (per-card iteration; `parcelamento:` parsing).
- 0.5d — `aliases.py` parser (journal scan, `include` resolution, edge cases).
- 0.5d — route + fixture journal extension (must include `account ... ; alias: ...` lines).
- 0.5-1d — tests + edge cases + PR writeup.

---

## Out of scope (for future PRs)

- **Per-card category breakdown / top transactions inside a card** — PRD-07 envisions a "drill-down do cartão individual" tela própria. That endpoint (`/api/credit-cards/{account}`) is a separate PR.
- **Card display alias from journal `account` declaration** (Open Q4 option (c)) — defer.
- **Last invoice closing date / next due date** — useful for the drill-down tela, not for the Cartões expansion. Defer.
- **Trend (debt 6 months back)** — Patrimônio tab territory, not Mes.
- **Caching of `outstanding_debt`** — recompute per request; latency is fine for 3-5 cards.
