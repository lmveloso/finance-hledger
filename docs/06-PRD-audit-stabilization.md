# Fase Audit Stabilization — PRD

Post-audit stabilization pass focused on correctness gaps surfaced after the Fase UX-Polish rollout and the handoff to Fase 1. The goal is to restore trust in the dashboard before Magic Import work continues: when the journal says one thing, the UI must not say another.

## Principles

- **Correctness over new capability.** This phase exists to fix misleading or broken current behavior, not to expand scope.
- **Journal is the source of truth.** When the UI and the journal disagree, the implementation must converge to the journal.
- **Fix the contract, not the symptom.** Prefer repairing parser/API/frontend data contracts instead of papering over broken views.
- **Keep scope tight.** Only the audited issues listed here are in scope unless a direct dependency is discovered.
- **Document semantics explicitly.** If a screen shows monthly spend, outstanding balance, or global metadata, the doc and UI copy must say so unambiguously.

## Scope — audited issue set

This phase covers the audit findings opened on GitHub on 2026-04-24:

| # | Area | Summary |
|---|------|---------|
| [#17](https://github.com/lmveloso/finance-hledger/issues/17) | Patrimônio / Net Worth | Net Worth tab shows zero balances, malformed month labels, and empty account lists |
| [#18](https://github.com/lmveloso/finance-hledger/issues/18) | Transações | Tag chips use global journal counts instead of month/range-scoped counts |
| [#19](https://github.com/lmveloso/finance-hledger/issues/19) | Auth / Product consistency | Login screen is cosmetic when backend runs with `auth_mode=none` |
| [#20](https://github.com/lmveloso/finance-hledger/issues/20) | Cartões | BB Visa disappears from the April UI despite imported postings and outstanding balance |

## Goal

Ship a small, explicit stabilization wave that makes the current product internally coherent again so Fase 1 can resume on top of trustworthy foundations.

## Problem statements

### 1. Net worth is currently untrustworthy

The Patrimônio tab is allowed to render zeros and malformed date labels even when `/api/accounts` and the journal contain valid balances. This is worse than a crash: it presents false financial information.

This phase must fix both classes of root cause already identified in the audit:
- parser incompatibility with the current hledger JSON shape
- frontend/backend payload mismatch for account list data

### 2. Transactions filters do not match the visible time scope

The Transações table is month/range-scoped, but the visible tag chips are currently global to the entire journal. This creates false affordances and makes the filter surface lie about the currently inspected period.

This phase must make tag discovery and counts use the same time scope as the table they filter.

### 3. Auth state is ambiguous to the user

The product can present a password login screen while the backend still serves finance data without authentication if `auth_mode=none` is active. That is a product-level correctness bug even if the underlying API behavior is "working as configured".

This phase must ensure the frontend experience reflects the real backend auth mode.

### 4. Credit-card visibility semantics are underspecified

The Mês card-spending section currently discovers cards only from monthly flow and monthly transactions, which makes a card disappear when it has outstanding liability but no purchases posted in the selected month. The BB Visa case exposed that the current behavior is technically explainable but product-wise misleading.

This phase must make card visibility semantics explicit and keep outstanding cards discoverable.

## Product requirements

### R1. Patrimônio must render journal-backed values

- `/api/networth` must produce valid month keys and correct values for assets, liabilities, and net worth.
- The Patrimônio tab must read the real backend payload shape for account lists.
- The Patrimônio hero, chart, and account sections must render non-zero data when the journal has non-zero balances.
- Malformed labels such as `{'conte` must never reach the UI.

### R2. Tag chips must match the active time filter

- In month mode, `/api/tags` (or its replacement contract) must reflect the selected month only.
- In range mode, tag chips and counts must reflect the selected custom date range only.
- Tags outside the visible transaction scope must not appear.

### R3. Auth UX must match backend reality

- If backend auth is effectively disabled, the frontend must not present a misleading password wall.
- If backend auth is enabled (`password`, `tailscale`, `tailscale+password`), the current protected flow must continue to work.
- The solution should be minimal and robust rather than introducing a large auth redesign.

### R4. Outstanding cards must remain visible

- A card with outstanding liability must remain discoverable even when monthly spend is zero.
- The UI must distinguish clearly between:
  - **spend in the selected month**, and
  - **current outstanding balance / liability**
- The BB Visa scenario should be represented correctly without fabricating April purchases.

## Recommended implementation order

1. **#17 Net Worth** — highest trust issue; false zeros must be fixed first.
2. **#18 Scoped tags** — straightforward contract repair with clear acceptance criteria.
3. **#19 Auth consistency** — small but important product correctness fix.
4. **#20 Card visibility** — semantics/UI refinement after the core data contracts are stable.

## Acceptance criteria

### For #17
- [ ] `GET /api/networth?months=12` returns valid `YYYY-MM` month strings.
- [ ] Patrimônio no longer renders zeroed hero/chart/account sections when `/api/accounts` has balances.
- [ ] For the audited April 2026 journal, the tab reflects the expected asset/liability/net totals.

### For #18
- [ ] April 2026 does not show `ajuste 1` in Transações tag chips.
- [ ] Month mode and range mode return distinct tag sets when their scopes differ.
- [ ] Tag counts match the filtered transaction population.

### For #19
- [ ] Frontend behavior changes correctly with backend auth mode.
- [ ] `auth_mode=none` no longer produces a misleading protected-app illusion.
- [ ] Password-based and hybrid auth modes still work.

### For #20
- [ ] BB Visa is discoverable in the relevant UI despite having zero April purchases.
- [ ] The UI communicates whether a figure is monthly card spend or outstanding balance.
- [ ] No fake current-month transactions are introduced.

## Exit criteria

- [ ] Issues #17, #18, #19, and #20 are closed (or explicitly re-scoped in this doc with justification).
- [ ] A manual smoke pass confirms Patrimônio, Transações tags, auth entry flow, and card visibility behave as documented.
- [ ] `CLAUDE.md` marks this phase complete and only then re-activates Fase 1 — Magic Import.

## Out of scope

- New ingestion capability from Fase 1.
- New dashboards, new tabs, or new planning/reporting surfaces beyond what is needed to fix the audited inconsistencies.
- A broad authentication redesign or RBAC model.
- Performance work unrelated to the audited findings.
- Architectural changes that require new ADRs unless a direct contradiction is discovered.

## Status

Phase created on 2026-04-24 after a live audit of the running app against the production journal identified current-state trust gaps that should be closed before further Magic Import expansion.
