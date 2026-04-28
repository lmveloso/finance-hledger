# PR: Mês + Fluxo — visibility for parcelamentos comprometidos

**Phase:** Fase 1 (Monthly view dashboard)
**Scope:** Surface "compromisso futuro" (parcelas projected via `~ monthly` per ADR-011) on the Mês credit-card detail and on the Fluxo passivo detail panel, without reactivating the Plano tab.
**Depends on:** PR-F1-x (Mês card detail already shipped), Fluxo-reformado (already shipped).
**Related ADRs:** ADR-011 (canonical model), ADR-008 (no impact), ADR-004 (all hledger access via `app/hledger/client.py`).
**Related PRDs:** `docs/07-PRD-dashboard-cartao-credito.md` §3.4 + Errata; `docs/08-PRD-visao-mensal-dashboard.md` §3.5/§4.4 (Cartões row + drilldown).

## Summary

Today, two surfaces understate the family's commitment to credit cards. The Mês card detail's "Dívida Total" tile only reflects the outstanding invoice balance (`saldo` of `liabilities:cartão:*`), hiding the value already locked in by `~ monthly` parcelamentos in `parcelamentos.journal` (ADR-011). On the Fluxo tab, the passivo detail panel advertises "INCLUI PARCELAS FUTURAS" but the data fetch is bounded to the selected month, so the parcelas it claims to include never actually appear. Neither surface shows the `parcelamento: NAME N/M` tag, so a transaction can hide its installment lineage. Per ADR-011 the truth lives in `/api/installments`. This PR exposes the `account` per row on that endpoint, adds a per-card "comprometido" sum to the Mês detail (`Dívida Total = fatura + comprometido`), drops the misleading copy in Fluxo and replaces it with a discrete "Compromisso Futuro" section, and pills `parcelamento` rows with `N/M`. No new ADR; an ADR-011 implementation-notes append records the placement.

## User decisions already made (NOT to relitigate)

1. Mês "Dívida Total" tile **replaces** the current "Devendo" tile and shows the **sum** `outstanding_debt + installments_remaining_value`. A discreet breakdown line under the value: `Fatura R$ X · Comprometido R$ Y`.
2. Fluxo panel: **drop** the misleading "INCLUI PARCELAS FUTURAS" copy. Keep "Lançamentos do mês" strictly month-bound. Add a new **separate** section below it called "Compromisso Futuro" populated from `/api/installments` filtered by the current account.
3. Single PR (backend + both frontends).
4. Do NOT reactivate Plano in the nav.

## Open questions (need approval before code)

1. **Tile key.** `mes.creditCards.detail.owingTile` is currently "Dívida Total" in pt-BR but still "Owing" in en. Two paths: (a) keep the key, fix en value; (b) rename to `mes.creditCards.detail.totalDebtTile`, drop `owingTile`. **Recommend (b)** for honesty with the new semantics.

2. **Where does `useInstallments` live?** Currently at `frontend/src/features/plano/hooks/useInstallments.js`. **Recommend** moving to `frontend/src/hooks/useInstallments.js` (shared) and merging per-card aggregate inside `useCreditCards.js` so `CreditCardDetail` keeps a flat prop shape.

3. **`/api/credit-cards` symmetry.** Mês UI currently builds cards from `/api/flow + /api/accounts + per-card /api/transactions`. Adding `installments_remaining_value` to `/api/credit-cards` is consistent but not directly consumed yet. **Recommend** adding it for contract symmetry and tests; future consolidation as follow-up.

4. **Tag exposure on `/api/transactions`.** Add `tags` only on the `account=…` branch (used by Mês detail and Fluxo panel) or both branches. **Recommend account-branch only**; global branch is Transações-tab and out of scope.

5. **End-date format.** `MM/AA` (e.g. `06/26`) vs. `Mai/26`. **Recommend `MM/AA`** for tabular alignment.

6. **ADR-011 update mechanism.** Append a one-paragraph "Implementation notes" block to ADR-011 noting Plano stays hidden in Fase 1 and comprometido surfaces in Mês+Fluxo? Alternative: a one-liner in `docs/04-PRD-ui-ux.md` §4.1. **Recommend ADR-011 append** (it's an implementation note, not a decision change).

## File inventory

### Backend

| Path | Action | Reason |
|---|---|---|
| `backend/app/routes/installments.py` | edit | Add `account` to each row — captured from the non-expense leg of each forecast posting. Update aggregation. |
| `backend/app/credit_cards/installments.py` | edit | Add helper `sum_remaining_value_for_card(transactions, card_account, today)`. Refactor only inside this file: shared per-series state consumed by both `count_live_for_card` and the new helper. |
| `backend/app/credit_cards/models.py` | edit | `CreditCard` gains `installments_remaining_value: float`. |
| `backend/app/credit_cards/service.py` | edit | Replace `_live_installments` with `_installments_aggregate` returning `(count, remaining_value)` so the forecast parse runs once. |
| `backend/app/routes/transactions.py` | edit | `_transactions_for_account` adds `tags: list[list[str]]` per tx, sourced from the OWN posting's `ptags`. Global branch untouched (Open Q4). |
| `backend/tests/test_installments.py` | edit | Tests for `account` per row; series spanning months; isolated tail (Havan 4/4 — ADR-011 §Negativas); ended series. |
| `backend/tests/data/installments.journal` | edit | Fixture extension: two-card stress test, isolated-tail series, ended-today series. |
| `backend/tests/unit/test_installments_parser.py` | edit | Tests for `sum_remaining_value_for_card`. |
| `backend/tests/unit/test_credit_cards_service.py` | edit | Replace `live_installments` assertions with combined `(live_installments, installments_remaining_value)`. |
| `backend/tests/test_transactions.py` | edit | Account-branch responses include `tags`. |

### Frontend — Mês

| Path | Action | Reason |
|---|---|---|
| `frontend/src/features/mes/components/CreditCardDetail.jsx` | edit | (i) Replace tile with "Dívida Total" = outstanding + comprometido; breakdown line shown only when comprometido > 0. (ii) New "PARCELAS FUTURAS" section between CATEGORIAS and MAIORES COMPRAS; hide when empty. (iii) `N/M` pill in `PurchaseRow` when tx has parcelamento tag. |
| `frontend/src/features/mes/hooks/useCreditCards.js` | edit | Fetch `/api/installments` (parallel with existing calls), merge `installmentsRemainingValue` and `installments` (filtered by `account`) into each card row. |
| `frontend/src/features/mes/sections/CreditCardSection.jsx` | reuse | Forwards new card fields. |

### Frontend — Fluxo

| Path | Action | Reason |
|---|---|---|
| `frontend/src/features/fluxo-reformado/components/AccountDetailPanel.jsx` | edit | (i) Drop `forecastNote` span; header stays "LANÇAMENTOS DO MÊS". (ii) New "COMPROMISSO FUTURO" section after the list when `isPassivo` and shared `useInstallments` returns rows for `conta?.conta`; section omitted when empty. (iii) `N/M` pill in `TransactionRow`. (iv) Keep `forecast: true` on `useAccountTransactions` (rationale: future-month navigation still benefits). |
| `frontend/src/features/fluxo-reformado/hooks/useAccountTransactions.js` | reuse | Tags surface naturally because backend now includes them. |

### Frontend — shared

| Path | Action | Reason |
|---|---|---|
| `frontend/src/hooks/useInstallments.js` | new (moved) | Renamed from `features/plano/hooks/useInstallments.js`. Optional `accountFilter` param + derived `byAccount` and `totalRemainingByAccount` maps. |
| `frontend/src/features/plano/views/DividaView.jsx` | edit | Update import path only. |
| `frontend/src/i18n/en.js` | edit | New keys + drop `owingTile`/`forecastNote`. |
| `frontend/src/i18n/pt-BR.js` | edit | New keys + drop `owingTile`/`forecastNote`. |

### Tests — frontend

| Path | Action | Reason |
|---|---|---|
| `frontend/src/features/mes/components/CreditCardDetail.test.jsx` | new | Breakdown line, N/M pill, Parcelas Futuras section. |
| `frontend/src/features/fluxo-reformado/components/AccountDetailPanel.test.jsx` | new | Compromisso Futuro section, dropped misleading copy, N/M pill. |
| `frontend/src/features/mes/hooks/useCreditCards.test.js` | new/edit | `buildCardList` enriches with `installmentsRemainingValue`. |

### Docs

| Path | Action | Reason |
|---|---|---|
| `docs/adr/011-parcelamento-monthly-restaurado.md` | edit (append) | Implementation-notes paragraph: comprometido surfaces in Mês+Fluxo until Plano is reactivated. Pending Open Q6. |

### Verified absent

- `frontend/src/features/mes/hooks/useCartoesMes.js` — does not exist.
- `backend/tests/test_credit_cards.py` — no dedicated integration test; only unit at `backend/tests/unit/test_credit_cards_service.py`.

## Contracts

### `/api/installments` row (additive)

```
{ name, description, monthly_value, paid, total, remaining,
  remaining_value, end_date, account }
```

`account` = the non-expense leg of the forecast posting (typically `liabilities:cartão:<x>`). Decision rule: prefer the leg whose `paccount` starts with one of the canonical card prefixes; fall back to the first non-expense leg with a WARNING log.

### `/api/credit-cards` row (additive)

```
{ ..., installments_remaining_value: float ≥ 0 }
```

Computed in the same `print --forecast tag:parcelamento` pass that produces `live_installments`.

### `/api/transactions?account=…` row (additive)

```
{ ..., tags: [["parcelamento", "Decathlon 3/4"], ...] }
```

Empty list when no tags. Tags from the OWN posting (the leg matching `account`). Format mirrors hledger's native `ptags`.

### `useInstallments({ accountFilter? })`

Returns `{ data, loading, error, byAccount, totalRemainingByAccount }`. Refetches on `MonthContext.refreshKey`.

### `CreditCardDetail` prop additions

- `card.installmentsRemainingValue: number` (≥ 0; 0 hides breakdown line and "PARCELAS FUTURAS" section).
- `card.installments: Installment[]` (already filtered to this card).

## Design routing (DESIGN.md anchors)

- **Tonal-Depth** — new "PARCELAS FUTURAS" / "COMPROMISSO FUTURO" subsections render inside their parent cards as bordered subsections (`border.subtle` partitions). No nested cards.
- **Flat-By-Default** — no shadows added.
- **Honest Color** — breakdown line `Fatura · Comprometido` in `text.muted`; `N/M` pill = `accent.primary` background at ~12% alpha + accent text.
- **Tight-Number** — Dívida Total tile keeps `letter-spacing: -0.02em`.
- **Quiet-Caps** — section labels with 10–11px + `letter-spacing: 0.12–0.15em`.
- **Two-Mode Equality** — pill uses `color.accent.primary` (Indigo Anchor mode-invariant).

`$impeccable` flow:
1. `$impeccable shape mes-credit-card-detail` and `$impeccable shape fluxo-account-detail-panel` (both surfaces gain new structural sections).
2. `$impeccable craft <feature>` during implementation.
3. `$impeccable critique` and `$impeccable audit` before merge.
4. `$impeccable harden` for empty/loading/error paths.

Mandatory: dark + light screenshots at 375px and 1280px in PR description for both surfaces.

## i18n

| Key | en (source) | pt-BR |
|---|---|---|
| `mes.creditCards.detail.totalDebtTile` | Total debt | Dívida Total |
| `mes.creditCards.detail.debtBreakdown` | Invoice {invoice} · Committed {committed} | Fatura {invoice} · Comprometido {committed} |
| `mes.creditCards.detail.installmentsTitle` | Future installments | Parcelas futuras |
| `mes.creditCards.detail.installmentEndDate` | ends {date} | termina {date} |
| `mes.creditCards.detail.installmentMonthly` | {amount}/mo | {amount}/mês |
| `fluxo.accountDetail.commitmentsTitle` | Future commitments | Compromisso futuro |

**Removed** (rename in place; no V2/Old/New):
- `mes.creditCards.detail.owingTile` (replaced by `totalDebtTile`)
- `fluxo.accountDetail.forecastNote` (copy dropped)

`N/M` pill rendered as literal `${n}/${m}` — no key needed.

## Test plan

### Backend (behavior-level)
- `test_installments_row_includes_account` — every row exposes a non-empty `account` matching a canonical card prefix.
- `test_installments_two_cards_isolated` — fixture with parcelamentos on `nubank` and `bb-visa`; rows carry their own card.
- `test_installments_isolated_tail_havan` — only `Havan 4/4` (ADR-011 §Negativas edge case): `paid=1, remaining=3, remaining_value = 3 × monthly`, `account=liabilities:...`.
- `test_installments_finished_series_excluded_with_today_at_end` — last forecast occurrence equals today: still excluded (`paid == total`).
- `test_credit_cards_response_includes_installments_remaining_value` — service emits new field; 0 when no parcelamento touches the card.
- `test_credit_cards_installments_remaining_excludes_other_cards` — values don't bleed.
- `test_transactions_for_account_exposes_tags` — `tags` field populated for parcelamento postings.
- `test_transactions_for_account_tags_empty_when_absent` — `tags == []` otherwise.
- `test_sum_remaining_value_for_card` (unit) — pure-function tests parallel to `count_live_for_card`.

### Frontend
- `CreditCardDetail.test.jsx` — Dívida Total = outstanding + comprometido; breakdown shown iff comprometido > 0; PARCELAS FUTURAS section visibility; `N/M` pill on PurchaseRow.
- `AccountDetailPanel.test.jsx` — forecastNote removed; COMPROMISSO FUTURO present iff isPassivo + rows; `N/M` pill on TransactionRow.
- `useCreditCards.test.js` — buildCardList enriches with `installmentsRemainingValue`.

## Acceptance criteria

- [ ] `/api/installments` rows include `account`.
- [ ] `/api/credit-cards` `cards[*]` includes `installments_remaining_value ≥ 0`.
- [ ] `/api/transactions?account=…` rows include `tags`.
- [ ] Mês card-detail tile shows `outstandingBalance + installmentsRemainingValue` as a single number; breakdown shown iff comprometido > 0.
- [ ] Mês "PARCELAS FUTURAS" section per active series for that card; hidden when empty.
- [ ] Mês `PurchaseRow` `N/M` pill iff `parcelamento` tag.
- [ ] Fluxo panel header has no misleading parenthetical.
- [ ] Fluxo "COMPROMISSO FUTURO" iff `isPassivo && installments_for_this_account > 0`.
- [ ] Fluxo `TransactionRow` `N/M` pill iff `parcelamento` tag.
- [ ] i18n: keys added to en (source) + pt-BR; `owingTile` and `forecastNote` removed.
- [ ] No `#000`/`#fff`, no new `box-shadow`, no `border-{left,right}` >1px stripe, no third font, no modals.
- [ ] Verified dark + light at 375px and 1280px.
- [ ] All listed test files added/updated.
- [ ] No V2/Old/New name suffixes.
- [ ] `useInstallments` moved (not duplicated).
- [ ] ADR-011 implementation-notes append OR PRD note (per Open Q6).
- [ ] PR description records resolution of all Open Questions.
- [ ] `$impeccable shape | craft | critique | audit | harden` run; screenshots in PR.

## Out of scope (follow-ups)

- Consolidating Mês card-data fetch onto `/api/credit-cards`.
- Reactivating Plano in nav.
- Removing grandfathered `box-shadow` on `AccountDetailPanel`.
- Tags on global `/api/transactions` (Transações tab).
- `N/M` pill on Transações tab.
- Per-card breakdown of comprometido on Mês `CreditCardListRow` (decision restricts this PR to detail).

## Recommended PR title

`feat(mes,fluxo): surface comprometido (parcelas futuras) on card detail`

(67 chars.)

## Estimated effort

~3 days focused: backend ~1d, frontend ~1.5d, design routing ~0.5d.
