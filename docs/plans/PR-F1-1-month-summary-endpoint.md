# PR-F1-1: `/api/month-summary` — backend endpoint for the Mes anchor

**Phase:** Fase 1 (Monthly view dashboard)
**Scope:** New backend endpoint that returns, for a single month, the seven numbers the redesigned Mes tab anchors on — income, expense, expense split into the two contra-account buckets (assets vs credit-card liability), credit-card payments in the month, total credit-card debt today, debt at start of month, debt at end of month, and the resulting `leftover`. Reads only — no journal mutation.
**Depends on:** Fase 0 complete (HledgerClient, parsers, modular routes), ADR-010 already merged.
**Does NOT depend on:** PR-F1-2 (`/api/credit-cards`) or PR-F1-3 (frontend rebuild). The two backend PRs can land in either order; the frontend depends on both.
**Related ADRs:** ADR-004 (hledger via HledgerClient), ADR-010 (installments as single transaction), ADR-008 (Principle is unrelated here — explicitly NOT consumed by this endpoint).
**Review follow-up consumed:** see `docs/plans/PR-F1-review-followup.md`. Open Q1's resolution (canonical card-leaf naming) cascades into PR-F1-3: the frontend hook `useCartoesMes` MUST NOT re-introduce a client-side card-prefix filter — the server-side `CARD_PREFIXES` is canonical. Document the resolution as a comment on `MonthSummaryService.CARD_PREFIXES` so PR-F1-2 and PR-F1-3 can quote it.

---

## Open questions (RESOLVED — record in PR description)

1. **Credit-card liability leaf naming — RESOLVED.** Support **all three** prefixes simultaneously at the prefix-filter level. No single canonical form is mandated; the journal can use any combination of:
   - `liabilities:cartão:*` (matches ADR-010 verbatim)
   - `liabilities:cartao:*` (no accent, file-system friendly)
   - `liabilities:credit-card:*` (full English, future-friendly)

   The service constant becomes:
   ```python
   CARD_PREFIXES = (
       "liabilities:cartão:",
       "liabilities:cartao:",
       "liabilities:credit-card:",
   )
   ```
   This decision cascades to PR-F1-2 (same constant) and PR-F1-3 (no client-side filter — server is canonical). Add a comment on `MonthSummaryService.CARD_PREFIXES` quoting this resolution so future readers find it.

2. **`debt_start_of_month` semantics — RESOLVED (b).** Use `balance ... -e <first-day-of-month> --historical -O json`. `--historical` is required so opening-balance declarations are honored.

3. **`credit_card_debt_today` regime — RESOLVED (a).** Always today's real balance, regardless of which month is selected. The variation card (`debt_end_of_month - debt_start_of_month`) is computed separately from `debt_start_of_month` and `debt_end_of_month`.

4. **Sign convention — RESOLVED.** All numeric fields return positive floats (the `leftover` field is the only signed one — explicitly negative when expense > income). Matches existing `/api/summary` and `/api/flow` conventions.

---

## File structure

```
backend/
├── app/
│   ├── month_summary/
│   │   ├── __init__.py
│   │   ├── models.py              # Pydantic: MonthSummary
│   │   ├── service.py             # MonthSummaryService — orchestrates HledgerClient
│   │   └── errors.py              # MonthSummaryError (if needed)
│   ├── routes/
│   │   └── month_summary.py       # APIRouter — /api/month-summary
│   └── deps.py                    # add get_month_summary_service()
└── tests/
    ├── unit/
    │   └── test_month_summary_service.py
    └── test_month_summary_route.py
```

Keep each file ≤ 200 lines (Fase 0 rule).

---

## Pydantic model (`app/month_summary/models.py`)

All field names in English. All amounts are positive floats. `month` is `YYYY-MM`.

```python
class MonthSummary(BaseModel):
    """Anchor numbers for the Mes tab."""

    month: str                          # "YYYY-MM"

    # Income / expense (accrual basis)
    income: float                       # sum of income:* postings in the month
    expense: float                      # sum of expenses:* postings in the month
    expense_via_assets: float           # expense whose contra-posting is assets:*
    expense_via_credit_card: float      # expense whose contra-posting is liabilities:<card-prefix>:*
    # invariant: expense == expense_via_assets + expense_via_credit_card (±0.01 tolerance)

    # Cash-flow on credit-card liability
    credit_card_payment: float          # sum of payments to liabilities:<card-prefix>:* in the month
                                        # (asset → liability postings)

    # Liability snapshots
    credit_card_debt_today: float       # |sum of liabilities:<card-prefix>:* at today|
    debt_start_of_month: float          # |balance at first-day-of-month, --historical|
    debt_end_of_month: float            # |balance at last-day-of-month, --historical|

    # Derived
    leftover: float                     # income - expense (signed: can be negative)

    # Bookkeeping
    last_updated: str                   # ISO-8601 timestamp of journal mtime, for the footer
```

Note: `leftover` is signed (negative when expense > income). All other amounts are absolute. The frontend uses `leftover < 0` to switch the anchor card color.

---

## Service (`app/month_summary/service.py`)

Pure orchestrator over `HledgerClient`. No `subprocess` import (ADR-004).

```python
class MonthSummaryService:
    # Card-liability prefix accepted (Open Q1 resolved: support all three forms).
    CARD_PREFIXES = (
        "liabilities:cartão:",
        "liabilities:cartao:",
        "liabilities:credit-card:",
    )

    def __init__(self, client: HledgerClient): ...

    def for_month(self, month: str) -> MonthSummary:
        """Compute the anchor numbers for one month.

        Steps:
        1. income & expense — `incomestatement -b X -e Y -O json` (already
           battle-tested in /api/summary).
        2. expense split — `print expenses:* -b X -e Y -O json` and bucket each
           transaction by its contra-posting account prefix:
             - contra is `assets:*`  → expense_via_assets
             - contra is liability + matches CARD_PREFIXES → expense_via_credit_card
             - other (e.g. equity) → log warning, do NOT include in either bucket
                 (this prevents silent leakage; the invariant test catches it).
        3. credit_card_payment — `print -b X -e Y -O json` for transactions whose
           debit posting matches CARD_PREFIXES and credit posting starts with
           `assets:*`. Sum the absolute amounts.
        4. credit_card_debt_today — `balance liabilities:cartão liabilities:cartao
           -O json --historical` (no -b/-e), sum balances absolute.
        5. debt_start_of_month — same balance command with `-e <first-day>`
           and `--historical`.
        6. debt_end_of_month — same balance command with `-e <day-after-last>`
           and `--historical`.
        7. leftover = income - expense (signed).
        8. last_updated — stat the journal file mtime, format ISO-8601.
        """
```

**Hledger command choices:**
- Step 2 uses `print` (not `register`) so the contra-posting structure is preserved — `register` returns positional tuples that have already bitten `/api/top-expenses`.
- Step 3 reuses `print` filtered to transactions touching the card prefix.
- Steps 4–6 use `balance --historical` so opening balance declarations are honored (Open Q2).

**Edge cases:**
- Month with zero activity → all numerics 0.0, response still 200.
- No card accounts in journal yet → debt fields are 0.0, payment field is 0.0, response still 200.
- `last_updated` when the journal file is missing → propagate the existing `HledgerNotFound` 503 path (don't invent a new error).

---

## REST endpoint (`app/routes/month_summary.py`)

### GET `/api/month-summary`

**Query:**
- `month` (optional, `YYYY-MM`): target month. Default: current month (server-local).

**Response (200):** the `MonthSummary` model above.

**Errors:**
- `422` if `month` is not `YYYY-MM`.
- `503` if hledger binary missing (propagate `HledgerNotFound`).
- `504` on timeout.
- `500` on hledger non-zero exit.

**Auth:** `Depends(get_current_user)` — same shape as `/api/principles/summary`.

**Why a new endpoint instead of extending `/api/summary`:**
- `/api/summary` is consumed by the existing tabs and changing its shape would force a frontend-wide cascade.
- The Mes redesign needs a tightly-scoped, well-named payload; mixing it into `/api/summary` would re-introduce the "grow-by-accretion" problem ADR-008 era complained about.
- The two endpoints can coexist; `/api/summary` stays untouched.

---

## Test strategy

### Unit — `tests/unit/test_month_summary_service.py`

Use a stub `HledgerClient` that returns canned JSON. Assert:
- `test_basic_month` — one income tx + one expense via assets + one expense via card → all five totals correct.
- `test_split_invariant` — `expense_via_assets + expense_via_credit_card == expense` to ±0.01.
- `test_zero_month` — empty journal → all zeros, response still constructed.
- `test_card_payment_isolated` — an assets→liability payment does NOT count as expense.
- `test_leftover_negative` — expense > income → `leftover` is negative.
- `test_card_prefix_all_three_forms` — `liabilities:cartão:*`, `liabilities:cartao:*`, AND `liabilities:credit-card:*` are aggregated together (Open Q1 resolved: all three supported).
- `test_other_contra_account_logged` — an expense paid from `equity:*` logs a warning and is not bucketed.

### Integration — `tests/test_month_summary_route.py`

Fixture journal in `tests/data/month_summary.journal` covering:
- Salary income (`income:salary` → `assets:bank`).
- Expense paid via debit (`expenses:groceries` → `assets:bank`).
- Expense paid via credit card (`expenses:dining` → `liabilities:cartão:nubank`).
- Card payment (`assets:bank` → `liabilities:cartão:nubank`).
- An installment from ADR-010 (single tx with full amount + `; parcelamento:` tag).

Tests:
- `test_returns_200_with_full_payload`.
- `test_invariant_split_holds_with_real_journal`.
- `test_debt_start_and_end_match_balance_command` (independently call HledgerClient and compare).
- `test_installment_full_amount_lands_in_expense_via_credit_card` (anti-regression for ADR-010).
- `test_invalid_month_returns_422`.
- `test_unauth_returns_401` (when `auth_mode != none`).

Skip perf bench here — perf for the redesigned Mes is measured in PR-F1-3 once the frontend is wired.

---

## Acceptance criteria

- [ ] `app/month_summary/` exists with `models.py`, `service.py`, `errors.py` (if needed), `__init__.py`.
- [ ] `MonthSummary` Pydantic model has all eight numeric fields + `month` + `last_updated`, names per §Pydantic model.
- [ ] `GET /api/month-summary?month=YYYY-MM` returns `MonthSummary` per §REST.
- [ ] Invariant `expense ≈ expense_via_assets + expense_via_credit_card` holds within R$ 0.01 (covered by automated test).
- [ ] `debt_start_of_month` and `debt_end_of_month` use `--historical` (Open Q2 confirmed).
- [ ] `credit_card_debt_today` is computed at server-today regardless of selected month (Open Q3 confirmed).
- [ ] No new `subprocess` import outside `HledgerClient` (ADR-004).
- [ ] `main.py` registers the new router. No existing endpoint shape changes.
- [ ] PR description records the resolution of Open Q1 (canonical card-leaf naming) and Open Q2/Q3/Q4 confirmations.
- [ ] Existing test suite still green; new unit + integration tests pass.

---

## Estimated effort

**2-3 days** of active development (1 senior dev):
- 0.5d — scaffold + Pydantic model + Settings/deps wiring.
- 1.0d — `MonthSummaryService` (the bucketing logic in step 2 is the hardest part; `print` JSON shape needs verification on hledger 1.52).
- 0.5d — route + integration fixture journal.
- 0.5d — tests + edge cases + PR description writeup.

---

## Out of scope (for future PRs)

- **PR-F1-2:** per-card breakdown (`/api/credit-cards`) — this PR only returns aggregates.
- **Drill-down into category-level expense composition** — PRD-08 §4.3 covers expansion of the Despesa card; that consumes existing `/api/categories`, not this endpoint.
- **Receita type breakdown** — PRD-08 §4.2 expansion uses existing `/api/flow` or `/api/transactions?type=income`, not this endpoint.
- **Year-over-year delta on `leftover`** — out of scope for the monthly view.
- **Persisted snapshot / cache** — recompute every call. Latency budget (PRD-08 §13 referenced from Fase D) is plenty for this payload.
