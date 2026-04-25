# PR-F1-3: Mes tab — destructive rebuild to PRD-08 hierarchy

**Phase:** Fase 1 (Monthly view dashboard)
**Scope:** Replace the existing `Mes.jsx` (current 3-KPI grid: Receita / Despesa / Saldo) and `CreditCardSection.jsx` with the four-card vertical hierarchy specified in PRD-08: Sobra (anchor) → Receita → Despesa → Cartões. Implement the mutual-exclusion expansion behavior (the anchor collapses when any of the other three opens) and full-card click-to-expand. Wire the new layout to PR-F1-1 (`/api/month-summary`) and PR-F1-2 (`/api/credit-cards`). Frontend only — no backend changes.
**Depends on:** PR-F1-1 (`/api/month-summary` shipped), PR-F1-2 (`/api/credit-cards` shipped). Both must be merged before this PR is implemented.
**Related ADRs:** "no modals, inline + tokens styling only" is enforced by the `frontend-dev` subagent preamble (`.claude/agents/frontend-dev.md`) and reiterated in `CLAUDE.md` and the existing `Mes.jsx` header comment. There is no formal ADR codifying this rule. This PR follows the convention as-is. If the user wants this codified, write an ADR in a separate PR — do not bundle here.
**Review follow-up consumed:** see `docs/plans/PR-F1-review-followup.md` (the architect review is the source of the file inventory in §File structure and the structural visual commitments in §Tonal-Depth).

---

## Step 0 — `$impeccable shape mes-tab-rebuild` (mandatory before any JSX)

This PR rebuilds the most-visible tab of the product. **Do not write JSX before running `$impeccable shape mes-tab-rebuild` and pasting its output into the PR description as a brief block.** The shape brief must contain, at minimum:

- Feature summary (2–3 sentences) — partner-facing daily glance.
- Primary user action — single sentence ("the partner opens the tab and within 3 seconds knows X").
- Color strategy — explicit pick from {Restrained / Committed / Full palette / Drenched}. Default: **Restrained** (DESIGN.md One Voice, ≤10% accent).
- Theme scene sentence — concrete light/dark scenario.
- 2–3 named anchor references (specific products, not adjectives).
- Layout strategy — vertical four-card stack; anchor is type-emphasis-larger (38px) and tonally identical (same `bg.card`); the three rows are visual peers. Spacing: anchor with `spacing.gap-lg` from header, three rows with `spacing.gap-md` between each, footer separated by `spacing.gap-lg`.
- Typographic hierarchy map (DESIGN.md tokens, no hex). See §Typography below.
- Token map for surfaces. See §Tonal-Depth below.
- All key states for each card: default (collapsed), expanded, loading (`···` not skeleton), error (`ErrorBox`), empty (explicit pt-BR copy), reduced motion (instant).
- Interaction model: full-card click + Enter/Space + `aria-expanded` + `aria-controls`; mutual exclusion rule; click handlers per Open Q4.
- Motion spec: ease-out-quint at 240ms for `max-height`, 200ms for chevron rotation; suppressed under `prefers-reduced-motion`.
- Mobile (375px) vs desktop (1280px) adaptation. Same vertical stack on both — DO NOT widen to a horizontal grid. Max content width 720px on desktop.
- Microcopy list (i18n keys, EN source + pt-BR translation) — see §i18n below.
- Accessibility commitments — `aria-expanded`/`aria-controls`, keyboard parity, focus-visible outline using `border.focus`.
- Recommended impeccable references for craft: `reference/spatial-design.md`, `reference/motion-design.md`, `reference/interaction-design.md`.

After the shape pass, the sequence is: `$impeccable craft` (or freehand JSX guided by the brief) → `$impeccable harden` (empty/loading/error states) → `$impeccable adapt` (375px + 1280px screenshots in dark + light, four screenshots attached to the PR) → `$impeccable critique` + `$impeccable audit` before reviewer hand-off.

The deferred `$impeccable polish` round is what becomes PR-F1-4 (per PRD-08 §5.3 "polish in a follow-up").

---

## Open questions (resolved)

1. **`MonthContext` reuse — RESOLVED.** The current `Mes.jsx` reads `selectedMonth` and `refreshKey` from `MonthContext`; the rebuild keeps using both. No context API change.

2. **i18n keys — RESOLVED.** Both `frontend/src/i18n/en.js` and `frontend/src/i18n/pt-BR.js` exist and follow the flat-key pattern. This PR adds keys to both files (EN is source; pt-BR is translation per CLAUDE.md). See §i18n.

3. **Visual treatment of expanded panels — RESOLVED.** PRD-08 §5.3 defers final visual *polish*, not structure. The Tonal-Depth assignment below is structural and ships in this PR. Final polish (motion fine-tuning, spacing rhythm by viewport) goes to PR-F1-4.

4. **Drill-down destinations — RESOLVED.**
   - **Click on a category-pai bar** inside the Despesa expansion → `useNav.goToTransactions(category.segmento_raw)` (cross-tab handoff via in-memory context, no URL params — verified in `Transacoes.jsx` and `NavContext.jsx`).
   - **CTA "Ver todas as categorias e maiores gastos"** at the bottom of the Despesa expansion → `useNav.goToTransactions(null)`. Same pattern as today's `MaioresGastosSection`.
   - **Click on a card row** inside the Cartões expansion → no-op + "Em breve" tooltip (PRD-08 §8 drill-down do cartão individual is a separate PR).
   - **No `?type=income` routing.** The `Receita` expansion shows the grouped-by-type list inline (PRD-08 §4.2); there is no requirement to route to a "all income transactions" view.

5. **Retirement of "Contábil × Caixa real × Δ" reconciliation strip — CONFIRMED.** The current `SaldoExpanded.jsx` shows a Caixa-real-vs-Contábil reconciliation panel. PRD-08 does not preserve it. **Confirmed with the user that this retirement is intentional.** If a future tab needs the reconciliation read, it will be re-introduced there — not in Mes.

---

## File structure

This PR is intentionally destructive — the old layout is being replaced. Filename `Mes.jsx` is kept so router wiring is unchanged. Component naming is **all-PT** to match the existing folder convention (`mes/`, `sections/`, `creditCards.*` keys). Generic UI primitives stay in EN (`ExpandableCard.jsx`).

### Action map (validated against the actual filesystem)

| Path (relative to `frontend/src/features/mes/`) | Action |
|---|---|
| `Mes.jsx` | **rewrite** (keep filename; new state machine + new layout) |
| `sections/KpiSection.jsx` | **delete** |
| `sections/ReceitaExpanded.jsx` | **delete** (logic moves into new `Receita.jsx`) |
| `sections/DespesaExpanded.jsx` | **delete** |
| `sections/SaldoExpanded.jsx` | **delete** (Caixa/Δ strip retired — see Open Q5) |
| `sections/CreditCardSection.jsx` | **delete** |
| `sections/CategoriasSection.jsx` | **reuse** (rendered inside new `Despesa.jsx` expansion; remove the outer `<div className="card">` framing only) |
| `sections/CategoriaDrilldown.jsx` | **reuse as-is** (ships with `CategoriasSection`) |
| `sections/MaioresGastosSection.jsx` | **leave in tree, no longer imported here** — consumed by future "Tela completa de despesas" PR (PRD-08 §8). Do not delete. |
| `components/KpiExpander.jsx` | **rename + adapt → `components/ExpandableCard.jsx`** (~80% of the work already exists; relax API from `(id, expandedId, onToggle)` to `(open, onToggle)` so children with independent state work; fix the focus-visible outline to use `border.focus`) |
| `components/CreditCardRow.jsx` | **leave in tree, NOT imported here** — over-specced for PRD-08 §4.4. Future per-card drill-down PR will use it. |
| `components/CreditCardDormantRow.jsx` | **leave in tree, NOT imported here** — over-specced for the simplified Cartões row. Future drill-down. |
| `components/CreditCardCategoryBar.jsx` | **leave in tree, NOT imported here** — bar visualization belongs to the per-card drill-down (PRD-08 §4.4 "barra colorida com legenda fica reservada para o drill-down individual"). |
| `components/CreditCardExpanded.jsx` | **delete** |
| `components/TransacaoRow.jsx` | **leave in tree** — used by future drill-downs. |
| `hooks/useCreditCards.js` | **delete** (after PR-F1-2 ships `/api/credit-cards`; replaced by `useCartoesMes`) |
| `hooks/useReceitas.js` | **reuse as-is** (consumed by new `Receita.jsx`) |
| `hooks/useSparklines.js` | **leave in tree** — no PRD-08 surface uses sparklines on Mes; may resurface in future Ano-tab work. |
| `lib/groupReceitas.js` | **reuse as-is** (consumed by new `Receita.jsx`) |

### New files

```
frontend/src/features/mes/
├── Mes.jsx                              # REWRITTEN
├── sections/
│   ├── SobraAncora.jsx                  # NEW — anchor "Sobrou no mês"
│   ├── Receita.jsx                      # NEW — Receita row + expansion (uses useReceitas + groupReceitas)
│   ├── Despesa.jsx                      # NEW — Despesa row + expansion (renders CategoriasSection inside)
│   ├── Cartoes.jsx                      # NEW — Cartões row + expansion (uses useCartoesMes)
│   └── Rodape.jsx                       # NEW — last-updated footer
├── components/
│   └── ExpandableCard.jsx               # RENAMED from KpiExpander.jsx + relaxed API
├── hooks/
│   ├── useResumoMes.js                  # NEW — calls /api/month-summary
│   └── useCartoesMes.js                 # NEW — calls /api/credit-cards (single round-trip)
└── __tests__/
    ├── Mes.test.jsx                     # NEW — mutual-exclusion behavior
    ├── ExpandableCard.test.jsx          # NEW — keyboard + full-area click
    └── Cartoes.test.jsx                 # NEW
```

**Naming notes (architect preamble compliance):**
- No `V2`, `New`, `Old` suffixes. The destructive replacement of `useCreditCards.js` is named `useCartoesMes.js` (domain-tied, PT, matches the existing `useReceitas.js` convention in the folder).
- Section components in PT (matches folder `mes/` and existing PT keys). Generic UI primitive `ExpandableCard.jsx` in EN (it is reusable and not domain-tied).

**Destruction notice:**
- 6 component files deleted (KpiSection, ReceitaExpanded, DespesaExpanded, SaldoExpanded, CreditCardSection, CreditCardExpanded), 1 hook deleted (useCreditCards), 1 component renamed (KpiExpander → ExpandableCard). 7 new files added (5 sections, 2 hooks). 6 existing files reused unchanged.
- The destruction is necessary because the IA hierarchy in PRD-08 (vertical, anchor-on-top) is structurally incompatible with the existing 3-KPI grid + below-grid expansion. Trying to incrementally morph the grid would leave dead code paths and inconsistent state machines.
- Git history preserves the old layout if rollback is needed.

---

## Component contracts

### `Mes.jsx`

Top-level layout. Owns expansion state for the four cards.

**Mutual-exclusion rule (PRD-08 §5.1):**
- Default state: anchor open, the other three closed.
- Opening any of `receita`, `despesa`, `cartoes` force-closes the anchor.
- `receita`, `despesa`, `cartoes` can coexist open. The anchor and the three subordinates are NOT all in a single mutually-exclusive set.

**State shape:**
```js
const [anchorOpen, setAnchorOpen] = useState(true);
// Independent toggles for the three subordinates.
const [openSet, setOpenSet] = useState(new Set());

// When any subordinate opens, force-close the anchor.
// When all subordinates close, the anchor stays closed (does NOT auto-reopen — user re-opens manually).
// Clicking the anchor while it is closed re-opens it without closing the subordinates (they are independent).
```

State lives only here; children call up via callbacks.

### `SobraAncora.jsx`

Renders the anchor card. Consumes `useResumoMes()`. Props: `open: bool`, `onToggle: fn`.

- Compact: large `leftover` value with sign-aware color (positive when `leftover >= 0`, alert otherwise per PRD-08 §3.2). Display-Emphasis (38px) + accent.primary or feedback.negative.
- Expanded (PRD-08 §4.1):
  - Receita line (mirrors top of `Receita`'s value).
  - Despesa line with two indented sub-items: "↳ saiu da conta" (`expense_via_assets`) and "↳ foi pro cartão" (`expense_via_credit_card`).
  - Separator (1px solid border.subtle).
  - "Pagamento de fatura no mês" — `credit_card_payment` (informative, not part of the equation).

### `Receita.jsx`

- Compact: "Receita" label (Quiet-Caps, Label tokens) + total (Display 30px).
- Expanded (PRD-08 §4.2): list of income types in the month. Implementation reuses `useReceitas` + `lib/groupReceitas`. PRD-08 admits this expansion is intentionally light ("detalhamento exato pode ter especificação própria em iteração futura"). Inline list, no external routing.

### `Despesa.jsx`

- Compact: "Despesa" label + total.
- Expanded (PRD-08 §4.3): renders the existing `CategoriasSection` (without its outer card framing), which already covers the L1 category list with name + % + amount + horizontal bar + clickable handoff to `CategoriaDrilldown`. The expansion appends a CTA "Ver todas as categorias e maiores gastos" → `useNav.goToTransactions(null)` (Open Q4).

### `Cartoes.jsx`

- Compact: "Cartões" label + auxiliary text "devendo R$ X · ↑/↓ R$ Y" where X is `summary.credit_card_debt_today` and Y is `summary.debt_end_of_month - summary.debt_start_of_month`. Sign-aware color and arrow (Honest Color + arrow shape, never color alone).
- Expanded (PRD-08 §4.4): list of simple per-card rows from `useCartoesMes()`. Each row shows name + holder, outstanding debt (right-aligned, Tight-Number), and auxiliary text "gasto R$ X · N parcelas vivas". Click → no-op + "Em breve" tooltip (Open Q4).

**Per-card row inside this expansion is a NEW small component (≤80 lines), local to `Cartoes.jsx`.** It is NOT the existing `components/CreditCardRow.jsx`, which is over-specced for PRD-08 §4.4 (stacked category bar, top-3 chips, dual layouts) and is reserved for the future per-card drill-down.

### `Rodape.jsx`

Reads `summary.last_updated`, renders muted centered text "Última atualização: <relative or absolute time>" using Micro type tokens (10px, 500, `text.muted`).

### `ExpandableCard.jsx` (renamed + adapted from `KpiExpander.jsx`)

Shared wrapper for all four cards. Full card area is clickable (PRD-08 §5.2), keyboard-accessible (Enter / Space), `aria-expanded` + `aria-controls` set, panel rendered conditionally.

**Adaptation from KpiExpander:**
- API change: `(id, expandedId, onToggle)` → `(open, onToggle)`. The new contract is per-card instead of per-set, which is necessary because `Receita`/`Despesa`/`Cartoes` are independent toggles (the old `expandedId` model assumed mutual exclusion across all children).
- Fix focus-visible outline to use `border.focus` (DESIGN.md §5 Inputs gap noted there — applies to any focusable element).
- No accordion-style hard borders (PRD-08 §5.3); structural Tonal-Depth assignment below.
- Motion: see §Motion.

---

## Tonal-Depth (structural, ships in this PR — NOT deferred)

PRD-08 §5.3 defers final *polish*, not structure. The structural commitments below are required so the PR ships compliant with DESIGN.md §4 (Tonal-Depth Rule) and §5 (Cards) even before the polish round.

| Surface | Token assignment |
|---|---|
| Page (canvas) | `bg.page`, no border |
| Outer card (collapsed AND expanded — same outer shape) | `bg.card` + `1px solid border.default` + 4px radius + `card-padding` (24px) |
| Expansion body (inside the same outer card) | `bg.cardAlt` + no border + `inner` padding (20px); separated from the row header by `1px solid border.subtle` |
| Anchor card | Identical surface to the three subordinates. Differentiated by **type scale** (Display-Emphasis 38px vs Display 30px) + **color** (accent.primary if `leftover >= 0` else feedback.negative on the number only). NO left-stripe, NO box-shadow, NO color override on the card surface itself. |

**Forbidden in this PR:**
- Nested cards (DESIGN.md §5: "Nesting: forbidden. If a card needs to hold a sub-surface, the sub-surface uses `bg.cardAlt` with no border").
- `box-shadow` on cards (DESIGN.md Flat-By-Default).
- `border-left > 1px` colored stripe (DESIGN.md §6 Don'ts).
- `#000` or `#fff` literals.
- Color-only sign indicator on the Cartões variation (must pair with arrow shape — Honest Color Rule).

**Polish reserved for PR-F1-4:**
- Final spacing rhythm by viewport (mobile vs desktop micro-tuning).
- Motion timing fine-tuning (e.g. anchor "fades while it auto-collapses" vs snap).
- Micro-interaction edge cases when a row expands while another is mid-animation.

---

## Typography (DESIGN.md tokens, no hex)

| Surface | Token |
|---|---|
| "SOBROU NO MÊS" / "RECEITA" / "DESPESA" / "CARTÕES" labels | Label (11px, 500, 0.15em tracking, uppercase, `text.muted`) — Quiet-Caps |
| Sobrou number | Display-Emphasis (38px, 600, line-height 1, tracking −0.02em); color `accent.primary` if ≥0 else `feedback.negative` — Tight-Number |
| Receita / Despesa numbers | Display (30px, 600, tracking −0.02em, `text.primary`) — Tight-Number |
| Cartões "devendo R$ X" | Body (13px, 400, `text.primary`) |
| Cartões "↑/↓ R$ Y" | Body Small (12px, 400) + arrow icon, color = `feedback.positive`/`negative` paired with arrow shape |
| Footer "Última atualização …" | Micro (10px, 500, `text.muted`) |

---

## Motion

- Expand/collapse: `max-height` 0 → measured-height with `transition: max-height 240ms cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quint).
- Chevron rotation: 180deg in 200ms with the same curve.
- Anchor auto-collapse: begins concurrently with the new row's expansion, same duration. No fade; collapse alone is the cue.
- All transitions suppressed under `@media (prefers-reduced-motion: reduce)`.

DESIGN.md does not specify expansion motion explicitly. The curve above is the impeccable shared-law default (ease-out-quint). If the user wants this codified, write a separate motion-spec amendment to DESIGN.md — do not bundle here.

---

## Data fetching

- `useResumoMes(month)` — calls `/api/month-summary?month=...`. Returns `{ summary, loading, error }`. Refetches when `selectedMonth` or `refreshKey` changes.
- `useCartoesMes(month)` — calls `/api/credit-cards?month=...`. Returns `{ cards, loading, error }`. Single round-trip (vs the old hook's N+2 strategy). **Server-side filter from PR-F1-2 is canonical — this hook does NOT re-introduce a client-side card-prefix filter.**
- Both hooks live behind suspense-friendly state shape; no `Promise.all` cross-hook coupling.

---

## i18n (EN source, pt-BR translation)

Add to **both** `frontend/src/i18n/en.js` and `frontend/src/i18n/pt-BR.js`:

| Key | EN (source) | pt-BR |
|---|---|---|
| `mes.anchor.label` | "Leftover this month" | "Sobrou no mês" |
| `mes.anchor.expand.income` | "Revenue" | "Receita" |
| `mes.anchor.expand.expense` | "Expense" | "Despesa" |
| `mes.anchor.expand.viaAssets` | "↳ paid from accounts" | "↳ saiu da conta" |
| `mes.anchor.expand.viaCard` | "↳ on credit card" | "↳ foi pro cartão" |
| `mes.anchor.expand.cardPayment` | "Card invoice payments this month" | "Pagamento de fatura no mês" |
| `mes.row.income.label` | "Revenue" | "Receita" |
| `mes.row.expense.label` | "Expense" | "Despesa" |
| `mes.row.cards.label` | "Credit cards" | "Cartões" |
| `mes.row.cards.aux` | "owing {x} · {arrow} {y}" | "devendo {x} · {arrow} {y}" |
| `mes.row.expense.cta` | "View all categories and largest spends" | "Ver todas as categorias e maiores gastos" |
| `mes.row.cards.installmentsAlive` | "{count} active installments" | "{count} parcelas vivas" |
| `mes.row.cards.spentThisMonth` | "spent {x}" | "gasto {x}" |
| `mes.footer.lastUpdated` | "Last updated: {when}" | "Última atualização: {when}" |
| `mes.row.cards.cta.upcoming` | "Coming soon" | "Em breve" |

Empty-state strings (PRD-08 has no celebratory tone, no emoji):

| Key | EN | pt-BR |
|---|---|---|
| `mes.row.income.empty` | "No revenue this month" | "Nenhuma receita este mês" |
| `mes.row.expense.empty` | "No expense this month" | "Nenhuma despesa este mês" |
| `mes.row.cards.empty` | "No cards registered" | "Sem cartões cadastrados" |

---

## Test strategy

Vitest + React Testing Library.

### Behavior — `Mes.test.jsx`

- Renders all four cards in vertical order: Sobra → Receita → Despesa → Cartões.
- Anchor is open by default.
- Opening Receita closes the anchor.
- Opening Receita then Despesa leaves both open (no mutual exclusion among subordinates).
- Closing the last open subordinate does NOT auto-reopen the anchor.
- Clicking the anchor while closed re-opens it without closing the subordinates.

### Component — `ExpandableCard.test.jsx`

- Clicking anywhere on the card toggles expansion.
- Enter and Space keys toggle expansion.
- `aria-expanded` matches state.
- `aria-controls` points at the panel id.

### Component — `Cartoes.test.jsx`

- Displays "devendo R$ X" with `debt_today` value.
- Arrow + color match sign of `(debt_end_of_month - debt_start_of_month)`.
- Expanded list renders one row per card.
- Empty state ("Sem cartões cadastrados") renders when `/api/credit-cards` returns `[]`.

Skip visual regression / pixel tests — final visual polish is deferred to PR-F1-4.

---

## Acceptance criteria

- [ ] Step 0 `$impeccable shape mes-tab-rebuild` brief is pasted into the PR description.
- [ ] Old files deleted: `KpiSection.jsx`, `ReceitaExpanded.jsx`, `DespesaExpanded.jsx`, `SaldoExpanded.jsx`, `CreditCardSection.jsx`, `CreditCardExpanded.jsx`, `useCreditCards.js`.
- [ ] `KpiExpander.jsx` renamed to `ExpandableCard.jsx` with the `(open, onToggle)` API.
- [ ] Reused as-is (with their existing tests): `CategoriasSection.jsx`, `CategoriaDrilldown.jsx`, `useReceitas.js`, `lib/groupReceitas.js`.
- [ ] Left in tree but not imported here: `MaioresGastosSection.jsx`, `CreditCardRow.jsx`, `CreditCardDormantRow.jsx`, `CreditCardCategoryBar.jsx`, `TransacaoRow.jsx`, `useSparklines.js`. Their existing tests stay green.
- [ ] New layout renders four cards in PRD-08 §3 order: Sobrou → Receita → Despesa → Cartões.
- [ ] Default state: anchor open, others closed.
- [ ] Opening any of Receita/Despesa/Cartões collapses the anchor (PRD-08 §5.1).
- [ ] Receita, Despesa, Cartões can coexist open (PRD-08 §5.1).
- [ ] Full card area (not just an icon) is clickable for expand/collapse (PRD-08 §5.2).
- [ ] Tonal-Depth structural commitments met: outer card `bg.card`+`border.default`+4px; expansion body `bg.cardAlt` no border; separator `border.subtle`. No `box-shadow`. No `border-left > 1px` stripe. No `#000`/`#fff` literals.
- [ ] Typography: anchor uses Display-Emphasis (38px); subordinates use Display (30px). Labels Quiet-Caps. All numerics Tight-Number.
- [ ] All user-facing strings go through `i18n` (EN source + pt-BR translation; both dictionaries updated).
- [ ] `Rodape.jsx` renders `last_updated` from `/api/month-summary` with Micro type.
- [ ] Cartões row shows "devendo R$ X · ↑/↓ R$ Y" with sign + arrow + color (Honest Color, arrow paired).
- [ ] Click on a category-pai bar in the Despesa expansion calls `useNav.goToTransactions(category.segmento_raw)`.
- [ ] CTA "Ver todas as categorias e maiores gastos" calls `useNav.goToTransactions(null)`.
- [ ] Click on a card row inside Cartões expansion is a no-op + "Em breve" tooltip.
- [ ] Motion: `max-height` 240ms ease-out-quint; chevron 200ms; suppressed under `prefers-reduced-motion`.
- [ ] No backend changes in this PR.
- [ ] No `?type=income` or any other URL-based cross-tab routing introduced.
- [ ] `useCartoesMes` does NOT introduce a client-side card-prefix filter (server is canonical, per PR-F1-2).
- [ ] New tests pass; existing suite stays green; tests for deleted components are deleted.
- [ ] $impeccable adapt screenshots (375px + 1280px, dark + light, 4 total) attached to the PR.
- [ ] PR description records resolutions of Open Q1–Q5 and points to `docs/plans/PR-F1-review-followup.md`.

---

## Estimated effort

**2.5–3 days** of active development (revised down from 3–4d after the §File-structure reuse fixes — `CategoriasSection`, `useReceitas`, `groupReceitas` reused as-is saves ~1d):

- 0.5d — Step 0 `$impeccable shape` + scaffold new files + delete old + rename KpiExpander.
- 1.0d — `Mes.jsx` state machine + `ExpandableCard.jsx` API adapt + accessibility.
- 0.5d — five section components + hooks integration (heavy reuse means less raw code).
- 0.25d — i18n keys + Rodape + sign-aware coloring on Cartões row.
- 0.25–0.5d — tests + manual QA on mobile viewport + `$impeccable adapt` + PR writeup.

---

## Out of scope (for future PRs)

- **PR-F1-4:** visual polish — final spacing, motion timing fine-tuning, expanded-panel micro-interactions (PRD-08 §5.3 explicitly defers polish).
- **Drill-down de despesas (3 níveis)** — own spec (PRD-08 §8). Click-through is a placeholder until that PR.
- **Drill-down do cartão individual** — own spec; will consume the existing `CreditCardRow`, `CreditCardDormantRow`, `CreditCardCategoryBar`, `TransacaoRow` components left in tree.
- **Drill-down de parcelas vivas** — own spec.
- **Tela completa de despesas** — own spec; will consume the existing `MaioresGastosSection`.
- **Visão anual** — own PRD; may resurrect `useSparklines`.
- **Patrimônio tab additions** (PRD-07 Adição 1 — decomposition of net worth) — explicitly NOT shown on the Mes tab per PRD-08 §3 ("Patrimônio tem tela própria").
- **Sobrou expansion: alternative comparison views** (vs same month last year, vs running average) — deferred.
- **Codifying the "no modals, inline-only" rule as a new ADR** — separate PR if the user wants it formalized.
- **Codifying expansion motion (ease-out-quint at 240ms) as a DESIGN.md amendment** — separate PR.
- **Re-introducing the "Contábil × Caixa real × Δ" reconciliation strip** in another tab — confirmed retired here; if it returns, it goes to a Fluxo or Patrimônio tab PR, not Mes.
