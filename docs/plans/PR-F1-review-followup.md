# PR-F1 review follow-up

Review of `docs/plans/PR-F1-1-month-summary-endpoint.md`, `docs/plans/PR-F1-2-credit-cards-endpoint.md`, and `docs/plans/PR-F1-3-mes-tab-rebuild.md` against the actual state of `frontend/src/features/mes/`, `DESIGN.md`, and `frontend/src/features/transacoes/`. Goal: close gaps before any code is written.

---

## (a) Inventory of `frontend/src/features/mes/`

Source of truth: every file below was read directly. The PR-F1-3 plan has structural mismatches with reality — flagged at the end of this section.

### Files actually present

| Path (relative to `frontend/src/features/mes/`) | What it does today | Action under PR-F1-3 | Where it lands / why |
|---|---|---|---|
| `Mes.jsx` | Top-level layout. Owns mutual-exclusion `expandedKpi` state. Renders `KpiSection` + one of three `*Expanded` panels + `CreditCardSection` always-visible. | **rewrite** (keep filename; PR-F1-3 explicitly destructive) | New IA: anchor + 3 rows + footer. State machine changes per PRD-08 §5.1 (leftover auto-collapse, three-card coexistence). |
| `sections/KpiSection.jsx` | Renders 3 KPI cards (Receita/Despesa/Saldo) in a horizontal grid with `KpiExpander` wrappers + sparklines + YoY DeltaBadge. | **delete** | Old grid is structurally incompatible with PRD-08's vertical anchor-on-top hierarchy. Sparkline/DeltaBadge live in `components/` (project-wide), not here. |
| `sections/ReceitaExpanded.jsx` | Grouped-by-type revenue list with totals row. Consumes `useReceitas` + `groupReceitas`. | **delete** (logic absorbed into new `Receita` row expansion) | New row expansion will reuse `useReceitas` + `groupReceitas` directly; the panel-as-card framing is replaced by inline composition per PRD-08 §5.3. |
| `sections/DespesaExpanded.jsx` | Two-column composer: `CategoriasSection` + `MaioresGastosSection`. | **delete** | New `Despesa` row expansion shows a single category-pai list per PRD-08 §4.3 (with a "Ver todas" footer). The two-column composer is no longer the right shape. |
| `sections/SaldoExpanded.jsx` | "Contábil × Caixa real × Δ" reconciliation strip from `/api/summary` + `/api/flow`. | **delete** | PRD-08 §4.1 redefines the Sobrou expansion as receita / despesa (split assets vs card) / pagamento de fatura. Caixa/Δ strip is NOT in PRD-08 — it's a different mental model and is being retired here. (See Open item §5.) |
| `sections/CategoriasSection.jsx` | Category list with name + % + amount + bar + stacked mini bar; click opens `CategoriaDrilldown` inline. Consumes `/api/categories?month=&depth=2` and `fetchCategoryDetail`. | **reuse** — render inside the new `Despesa` row expansion body | This is exactly what PRD-08 §4.3 describes (name + % + amount + horizontal bar + clickable). The plan mistakenly treats it as net-new. PR-F1-3 must import and render it; remove only the outer `<div className="card">` framing per PRD-08 §5.3. |
| `sections/CategoriaDrilldown.jsx` | Inline subcategoria drill-down used by `CategoriasSection`. | **reuse** as-is — ships with `CategoriasSection`. | Drives the L1→L2 inline drill PRD-08 §4.3 alludes to. The §5.4 three-level drill spec is explicitly out of scope (PRD-08 §8). |
| `sections/MaioresGastosSection.jsx` | Top-5 expense list + "Ver todas (N)" CTA that calls `useNav().goToTransactions(null)`. | **move-to-future-PR** | PRD-08 §4.3 lists "Ver todas as categorias e maiores gastos" as a single CTA that routes to "Tela completa de despesas" (PRD-08 §5.4 / §8). Until then, do not show a top-5 inside the Mes expansion. Component is solid and will be consumed by the future "Tela completa de despesas" PR. |
| `sections/CreditCardSection.jsx` | Always-visible card listing all credit cards with monthly spend, outstanding balance, expand-per-card with category bar + transactions. Consumes `useCreditCards` (N+2 fetches). | **delete** | Replaced by new Cartões row expansion. The "always-visible below KPIs" placement contradicts PRD-08 §3 (Cartões is one of four cards in the same vertical list). The internal "expanded card body" with category bar + transactions is PRD-08 §8 "drill-down do cartão individual" — own spec. |
| `components/CreditCardRow.jsx` | Per-card row variant for active cards: name + "Este mês" + amount + stacked bar + chips + chevron. | **move-to-future-PR** (drill-down do cartão individual) | PRD-08 §4.4's expanded list is much simpler: name + holder + outstanding (right-aligned) + auxiliary "spent · N installments alive". Chips/stacked-bar shape belongs to the future per-card drill-down. Architect plan says "KEEP" but rendering this row inside the new Cartões expansion would re-introduce the abandoned shape — fails fidelity. **Recommend:** keep file in tree (don't delete code) but do NOT import from the new Cartões row; future per-card-drill PR will import it. |
| `components/CreditCardDormantRow.jsx` | Compact variant for cards with outstanding > 0 but zero monthly spend. | **move-to-future-PR** (drill-down do cartão individual) | PR-F1-2's response already filters out cards where both `outstanding == 0` and `spend == 0`. The new Cartões row format handles dormant-but-outstanding cards naturally; the dormant variant is over-specced for PRD-08 §4.4. |
| `components/CreditCardCategoryBar.jsx` | Stacked proportion bar by L1 category. | **move-to-future-PR** | Bar visualization is for the per-card drill, not Mes. PRD-08 §4.4: "A composição visual de despesas (barra colorida com legenda) que existe no design atual fica reservada para o drill-down individual do cartão." |
| `components/CreditCardExpanded.jsx` | Per-card expansion: legend grid + outstanding line + top-10 transactions. | **delete** (architect plan agrees) | Same content belongs in the future per-card drill-down tela (PRD-08 §8). |
| `components/TransacaoRow.jsx` | Row for a single transaction (description + meta + amount, accent.primary). | **move-to-future-PR** | Used by `CreditCardExpanded` today; will be needed again by the per-card drill-down. |
| `components/KpiExpander.jsx` | `role="button"` wrapper around a KPI atom: full-card click, Enter/Space, `aria-expanded`, `aria-controls`, chevron. Mutual-exclusion via `expandedId === id`. | **rewrite as `ExpandableCard.jsx`** (rename + relax mutual-exclusion API) | PR-F1-3 lists "ExpandableCard.jsx — NEW". The existing `KpiExpander` already does ~80% of the work. Reuse the file; rename to `ExpandableCard.jsx`; change contract from `(id, expandedId, onToggle)` to a simpler `(open, onToggle)` so children with independent state work. **Architect plan called it "NEW" — this is rename+adapt, not net-new.** |
| `hooks/useCreditCards.js` | Fans out N+2 fetches client-side: `/api/flow` + `/api/accounts` + N×`/api/transactions`. Aggregates per card. Exports `aggregateCard`, `buildCardList`. | **delete** (after PR-F1-2 ships `/api/credit-cards`) | Replaced by `useMonthCreditCards` (renamed — see naming note below). The pure helpers `aggregateCard` and `buildCardList` are no longer needed: server-side aggregation in PR-F1-2 absorbs both. |
| `hooks/useReceitas.js` | Wraps `useApi('/api/revenues?month=…')`. | **reuse as-is** | New `Receita` row expansion calls this directly. No changes. |
| `hooks/useSparklines.js` | Computes `receitas`/`despesas`/`saldo` 6-month series from `/api/cashflow?months=6`. | **move-to-future-PR** | PRD-08 has no sparkline anywhere on the Mes tab. Don't delete — small file, may resurface in Ano-tab work. |
| `lib/groupReceitas.js` | Pure heuristic that groups revenue postings by derived "type". | **reuse as-is** | New `Receita` row expansion (PRD-08 §4.2) shows "lista de tipos de receita" — exactly what this helper produces. |

### Files referenced by PR-F1-3 plan but absent from reality

- `__tests__/Mes.test.jsx`, `__tests__/ExpandableCard.test.jsx`, `__tests__/CartoesRow.test.jsx` — listed as "NEW" in the plan, which is correct (they don't exist). Just create them.

### Files present in reality but absent from the PR-F1-3 plan

- **`sections/CategoriasSection.jsx`** — plan does not mention it. Critical reuse target for PRD-08 §4.3.
- **`sections/CategoriaDrilldown.jsx`** — plan does not mention it. Ships with `CategoriasSection`.
- **`sections/MaioresGastosSection.jsx`** — plan does not mention it. Needs `move-to-future-PR` decision.
- **`components/CreditCardCategoryBar.jsx`** — plan does not mention it. Needs `move-to-future-PR` decision.
- **`components/CreditCardDormantRow.jsx`** — plan does not mention it. Needs `move-to-future-PR` decision.
- **`components/TransacaoRow.jsx`** — plan does not mention it. Needs `move-to-future-PR` decision.
- **`hooks/useReceitas.js`** — plan implies `IncomeRow` re-fetches but doesn't say from where; this hook is the answer.
- **`hooks/useSparklines.js`** — plan doesn't mention it. Needs `move-to-future-PR` decision.
- **`lib/groupReceitas.js`** — plan implies grouped income but doesn't say how; this helper is the answer.

### Files referenced by PR-F1-3 with wrong action

- The plan lists `components/CreditCardRow.jsx` as **KEEP** ("small per-card row inside CartoesRow expansion"). The existing `CreditCardRow` is ~240 lines, has a stacked category bar, top-3 chips, chevron, dual desktop/mobile layouts — vastly more than PRD-08 §4.4 asks for ("Nome do cartão e titular, saldo devedor total, texto auxiliar com gasto do mês e contagem de parcelas vivas"). Importing as-is into the new Cartões row will re-introduce the visual the PRD explicitly retires. **Recommend:** write a **new, smaller** row component (≤80 lines) inside the new Cartões row file (or as a sibling), and `move-to-future-PR` the existing `CreditCardRow.jsx`.

### Naming consistency (CLAUDE.md says English is source language)

The plan introduces `IncomeRow.jsx`, `ExpenseRow.jsx`, but keeps `CartoesRow.jsx`, `LeftoverAnchor.jsx`, and the `mes/` folder name. That is mixed-language naming — the kind the architect preamble says to refuse.

**Resolution options:**
- (a) Stay aligned with the existing folder convention (`mes/`, `sections/`, `creditCards.*` keys) and rename the new ones to `Receita.jsx` / `Despesa.jsx` / `Cartoes.jsx` / `SobraAncora.jsx`. Smallest surface, smallest churn.
- (b) Rename folder to `month/`, all components in EN, migrate the existing PT keys.
- **Recommendation:** (a) for PR-F1-3. The architect's `IncomeRow` / `ExpenseRow` / `CartoesRow` / `LeftoverAnchor` names should become an all-PT or all-EN set, but **not mixed**.

Also: `useCreditCardsV2.js` literally violates the architect preamble's anti-pattern list ("V2 / New / Old suffixes — refuse"). Rename the destructive replacement to `useMonthCreditCards.js` (or rewrite `useCreditCards.js` in place — the contract changes anyway, so callers are touched regardless).

---

## (b) DESIGN.md → Tonal-Depth mapping for PRD-08 §5.3

PRD-08 §5.3 defers final visual specification but pins three principles:
1. "Não usar o visual de acordeão clássico (linhas empilhadas com bordas marcadas)"
2. "O card expandido deve compor com o background da página, não destacar-se como caixa rígida"
3. "A transição entre estados deve ser suave e preservar a posição do card âncora sempre que possível"

DESIGN.md has the rule that maps to (1) and (2): **The Tonal-Depth Rule** in §4:

> *Three depth levels exist: `bg.page` (the room), `bg.card` (objects on the page), `bg.cardAlt` (something inside an object — a nested drilldown, an expanded panel). Going deeper than three is forbidden; nested cards are forbidden.*

Plus §5 Cards: *"Nesting: forbidden. If a card needs to hold a sub-surface, the sub-surface uses `bg.cardAlt` with no border."*

### Concrete Tonal-Depth assignment for the four cards

| Surface | Collapsed state | Expanded state |
|---|---|---|
| **Page** | `bg.page` (`#0d0f1a` dark / `#f0f1ff` light), no border | unchanged |
| **Sobra anchor card** (open by default) | `bg.card` (`#12152a` / `#ffffff`), `1px solid border.default`, 4px radius, `card-padding` (24px). Display number uses Display-Emphasis (38px). | When **collapsed** by user opening another row, the anchor returns to compact `bg.card` form. It is never simultaneously expanded with another row. |
| **Receita / Despesa / Cartões row** (collapsed) | `bg.card`, `1px solid border.default`, 4px radius, `card-padding`. Display number uses Display (30px) — subordinate to the anchor's 38px. | The expanded body sits **inside the same card**, separated from the row header by `1px solid border.subtle`. The expansion body uses `bg.cardAlt` (`#181c32` / `#f4f5ff`), `card-padding` reduced to `inner` (20px), **no second border**. |
| **Anything inside an expansion** (e.g. category bars in Despesa expansion) | not a third surface — lives directly on `bg.cardAlt`. Rows inside use `1px solid border.subtle` separators. **No nested cards.** | n/a |

### How "anchor differs from the three subordinate cards"

In order of strength:

1. **Type scale.** Anchor uses Display-Emphasis (38px, weight 600, line-height 1, tracking −0.02em). The three subordinate cards use Display (30px). DESIGN.md §3 sanctions: *"the single primary KPI per section, when one matters more than its peers."* Type carries the hierarchy.
2. **Color.** Anchor's number takes `accent.primary` (Indigo Anchor `#6366f1`) when ≥ 0 and `feedback.negative` (Ledger Red) when < 0. PRD-08 §3.2: "cor positiva quando ≥ 0, cor de alerta quando < 0". DESIGN.md §5 KPI: *"If the KPI is the section's primary (destaque), the number takes the accent color."* The three subordinates: Receita uses `text.primary`; Despesa same; Cartões the auxiliary "↑/↓ R$ Y" text takes `feedback.positive`/`negative` per the sign of the variation. **Honest Color Rule**: pair color with arrow + label.
3. **Position.** Anchor is the topmost card. Vertical order is the IA hierarchy from PRD-08 §2.2.
4. **No left-stripe or shadow accent.** DESIGN.md §6 Don'ts: no `border-left > 1px` colored stripe.

### Relation between row card and its expansion panel

Two valid readings of "compose with the page background":

- **Reading A (recommended):** the expansion is a `bg.cardAlt` region **inside the card**, separated by `1px solid border.subtle`. The card itself keeps its outer `1px solid border.default` and its 4px radius — outer shape unchanged so the card never "morphs" between states. The reader's eye sees "the card opened a deeper compartment", not "the card became taller".
- **Reading B:** drop the outer card border on expand, keep `bg.card`/`bg.cardAlt` for the body, expansion bleeds visually toward the page. **Reject this** — DESIGN.md §5 Cards is explicit that *"a card is a container, not an affordance"* and the border is normative. Removing the border on expand makes the card's identity shape-shift.

**Use Reading A.**

### Minimum guide so PR-F1-3 stays on DESIGN.md even though it's "structure-only"

The PR-F1-3 plan calls all visual decisions "TODO visual polish" and pushes to a follow-up. That is too loose — the structure itself encodes Tonal-Depth choices. The structural PR must already commit to:

1. **Outer card surface** for each of the four cards: `bg.card` + `1px solid border.default` + 4px radius + `card-padding`.
2. **Expansion body surface**: `bg.cardAlt` + no border + `inner` (20px) padding inside the same outer card, separated by `1px solid border.subtle` from the row header.
3. **Type scale** as in §(b) above (Display-Emphasis for anchor, Display for the three).
4. **No box-shadow, no `#000`/`#fff`, no `border-left > 1px`**.
5. **Tight-Number** on every numeric value: `letter-spacing: -0.02em`.
6. **Quiet-Caps** on the labels ("RECEITA · DESPESA · CARTÕES · SOBROU NO MÊS"): Label type (11px, 500, 0.15em tracking, uppercase).
7. **Honest Color** on the Cartões variation arrow and the anchor sign — paired with arrow shape (not color alone).
8. **prefers-reduced-motion**: any expand/collapse height transition must be suppressible. Recommended: `max-height` interpolation with `transition: max-height 240ms cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quint), reduced to instant under `prefers-reduced-motion`.

What stays for the follow-up "polish" PR:
- Final spacing rhythm between cards (phone vs desktop) — `$impeccable adapt` pass.
- Motion timing fine-tuning (200ms vs 240ms; whether the anchor "fades while it auto-collapses" or just snaps).
- The exact micro-interaction when a row is being expanded while another is mid-animation.

### DESIGN.md gaps surfaced

DESIGN.md does **not** specify:
- The exact transition curve and duration for inline expand/collapse (existing `KpiExpander` uses `transition: 0.2s ease`, which is `ease`, not the impeccable-shared-law-mandated ease-out-quart/quint/expo).
- Whether expansion bodies inside a card should have an inset shadow or top-border to delineate from the row header (recommendation above is `1px solid border.subtle` based on §4's 1px Border Rule, but DESIGN.md does not show this configuration explicitly).
- Whether the anchor's "auto-collapse on others' open" warrants a distinct visual cue.

**These gaps are not blockers for PR-F1-3.** They warrant a follow-up `$impeccable shape <expansion-motion>` round before PR-F1-4 polish. Do **not** bundle a new ADR or a DESIGN.md amendment into PR-F1-3.

---

## (c) Transacoes query params — confirmation

Sources read: `frontend/src/features/transacoes/Transacoes.jsx` (full file) + `frontend/src/contexts/NavContext.jsx`.

**Reality, line by line:**

- `Transacoes.jsx:26` — destructures `navCategory`, `setNavCategory` from `useNav()`. This is in-memory React context state, NOT URL query params.
- `Transacoes.jsx:41–46` — `useEffect` consumes `navCategory` once on mount (or when context value changes), calls `setCategory(navCategory)`, then `setNavCategory(null)` to clear it. So cross-tab handoff is one-shot via context.
- `NavContext.jsx:34–37` — `goToTransactions(category)` sets `navCategory` and switches `activeTab` to `'transações'`.
- `MaioresGastosSection.jsx:125` — already uses `goToTransactions(null)` for the "Ver todas (N)" button. Precedent exists for the cross-tab call **without category**.

### Concrete answers to PR-F1-3 §Open Q4

**Does `Transacoes` accept `?category=...` query param?**
- **No.** The component does not read `location.search` at all. The app does not have a URL router (no `react-router`); cross-tab routing is `useNav.activeTab` + `useNav.navCategory`, both in-memory.

**Does it accept `?month=...`?**
- **No URL param, but yes via context:** `Transacoes.jsx:25` reads `selectedMonth` from `MonthContext`. The same `MonthContext` drives the Mes tab. The Mes-tab month selector and the Transacoes-tab month filter are the **same** value — no override needed.

**Does it accept `?type=income`?**
- **No.** The endpoint `/api/transactions` does support filters (`category`, `search`, `tag`, sort, date range), but the UI exposes no `type` filter, and no `goToTransactionsByType` action exists. If `Receita` row expansion needs to route to "all income transactions in the month", the cross-tab routing for income alone is not implemented.

### Implications for PR-F1-3

The plan's Open Q4 phrasing "route to `Transacoes?category=...`" is **incorrect in form** but the desired behavior is achievable via the existing `useNav.goToTransactions(category)`. Specifically:

- **CTA "Ver todas as categorias e maiores gastos"** in the new Despesa expansion (PRD-08 §4.3) → `goToTransactions(null)`. Same as today's `MaioresGastosSection`. No new code in `Transacoes`/`NavContext`.
- **Click on a category-pai bar** inside Despesa expansion → `goToTransactions(category.segmento_raw)`. Already works — same handoff pattern that the existing category drill on the Mes tab uses.
- **Click on a card row** inside Cartões expansion → there is no `goToCardDetail` action. Plan's Open Q4 (a) ("no-op + 'Em breve' tooltip") is the right call until the per-card drill-down PR ships.
- **`type=income` for the `Receita` expansion** → not needed at the Mes-tab level. The expansion shows the grouped-by-type list inline (PRD-08 §4.2); there is no PRD-08 requirement to route to a "all income transactions" view. **Strike `?type=income` from the plan** — it is a phantom requirement.

**Net effect on PR-F1-3 scope:**
- No backend change to `/api/transactions` is needed.
- No new query-param parsing in `Transacoes.jsx` is needed.
- No new `useNav` action is needed.
- The plan's Open Q4 should be rewritten as: "Click on a category-pai bar uses existing `useNav.goToTransactions(category)`. The 'Ver todas' CTA uses `goToTransactions(null)`. Card row clicks are no-op + 'Em breve' tooltip until the per-card drill PR." Drop the `?category=` syntax.

---

## (d) `$impeccable` Step 0 checklist for PR-F1-3

The `impeccable` skill is the project mechanism for design/UX-impeccable frontend passes. Step 0 of PR-F1-3 is **`$impeccable shape mes-tab-rebuild`**, run before any JSX. The output is a **design brief**, not code.

### Step 0 deliverables (output of `$impeccable shape mes-tab-rebuild`)

- [ ] **Feature summary (2–3 sentences)** — what the new Mes tab is, who uses it (the partner, mobile-first, daily glance), what success looks like.
- [ ] **Primary user action** — one sentence: "the partner opens the tab and within 3 seconds knows X".
- [ ] **Color strategy** — explicit pick from {Restrained / Committed / Full palette / Drenched}. Default is **Restrained** (DESIGN.md One Voice rule, ≤10% accent).
- [ ] **Theme scene sentence** — one concrete sentence ("Partner glancing at the phone over breakfast in indirect morning light, after the Sunday journal-update routine"). Forces dark vs light. Both modes are first-class.
- [ ] **2–3 named anchor references** — specific products, not adjectives. Examples: a Bloomberg terminal cell readout, a Things 3 Today list, a printed bank statement. NOT "modern", NOT "minimal".
- [ ] **Layout strategy** — vertical four-card stack; anchor card is type-emphasis-larger (38px) and tonally identical (same `bg.card`); the three rows are visually peers. Spacing rhythm: anchor sits with extra top margin (`spacing.gap-lg` 20px from header), the three rows are tighter (`spacing.gap-md` 14px between each). Bottom footer separated by `spacing.gap-lg`.
- [ ] **Typographic hierarchy map** (DESIGN.md tokens, no hex):
  - "Sobrou no mês" label → Label (11px, 500, 0.15em tracking, uppercase, `text.muted`).
  - Sobrou number → Display-Emphasis (38px, 600, tracking −0.02em); color `accent.primary` if ≥ 0 else `feedback.negative`.
  - "Receita / Despesa / Cartões" labels → Label.
  - Receita/Despesa numbers → Display (30px, 600, tracking −0.02em, `text.primary`).
  - Cartões "devendo R$ X" → Body (13px, 400, `text.primary`).
  - Cartões "↑/↓ R$ Y" → Body Small (12px, 400) + arrow icon, color = `feedback.positive`/`negative`.
  - Footer "Última atualização …" → Micro (10px, 500, `text.muted`).
- [ ] **Token map for surfaces**: outer card `bg.card`/`border.default`/4px; expansion body `bg.cardAlt`/no border/separator `border.subtle`; page `bg.page`.
- [ ] **All key states** — for each card:
  - Default (collapsed) — what's visible.
  - Expanded — what reveals.
  - Loading — number renders as `···` (DESIGN.md §5 KPI: *"never as 0 or a skeleton"*).
  - Error — `ErrorBox` inline above the card stack.
  - Empty — month with no income/expense/cards. Explicit copy: "Nenhuma despesa este mês" / "Nenhuma receita este mês" / "Sem cartões cadastrados". No celebratory tone, no emoji.
  - Reduced motion — instant expand/collapse.
- [ ] **Interaction model**:
  - Full card area is clickable (PRD-08 §5.2). `cursor: pointer` on outer wrapper. Keyboard: Tab to focus, Enter/Space to toggle, `aria-expanded` reflects state, `aria-controls` points at the panel id.
  - Mutual exclusion (PRD-08 §5.1): opening any of {Receita, Despesa, Cartões} forces the anchor closed. Receita/Despesa/Cartões coexist freely. Anchor does not auto-reopen when the others all close.
  - Click on a category-pai bar → `useNav.goToTransactions(category.segmento_raw)`.
  - Click on a card row → no-op with "Em breve" tooltip until per-card drill ships.
- [ ] **Motion spec** —
  - Expand/collapse: `max-height` 0 → measured-height with `transition: max-height 240ms cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quint). Disable under `prefers-reduced-motion`.
  - Chevron rotation: 180deg in 200ms with same ease.
  - Anchor auto-collapse: begins concurrently with the new row's expansion, same duration. No fade — collapse alone is the cue.
  - No hover affordances on cards themselves (cards are containers, not affordances). Bars/CTAs inside expansions can have `bg.hover`.
- [ ] **Mobile (375px) vs desktop (1280px) adaptation** — per DESIGN.md §5 + PRODUCT.md principle 4:
  - Mobile: full-width cards, vertical stack, 16px page-side padding, 24px card-padding inside.
  - Desktop: same vertical stack — DO NOT widen to a horizontal grid. Maximum content width 720px centered. Cards remain the same shape; only horizontal margins grow.
- [ ] **Microcopy list** — every label that ships, in EN (source) + pt-BR (translation), with i18n keys:
  - `mes.anchor.label` — "Leftover this month" / "Sobrou no mês"
  - `mes.anchor.expand.income` — "Revenue" / "Receita"
  - `mes.anchor.expand.expense` — "Expense" / "Despesa"
  - `mes.anchor.expand.viaAssets` — "↳ paid from accounts" / "↳ saiu da conta"
  - `mes.anchor.expand.viaCard` — "↳ on credit card" / "↳ foi pro cartão"
  - `mes.anchor.expand.cardPayment` — "Card invoice payments this month" / "Pagamento de fatura no mês"
  - `mes.row.income.label` — "Revenue" / "Receita"
  - `mes.row.expense.label` — "Expense" / "Despesa"
  - `mes.row.cards.label` — "Credit cards" / "Cartões"
  - `mes.row.cards.aux` — "owing {x} · {arrow} {y}" / "devendo {x} · {arrow} {y}"
  - `mes.row.expense.cta` — "View all categories and largest spends" / "Ver todas as categorias e maiores gastos"
  - `mes.row.cards.installmentsAlive` — "{count} active installments" / "{count} parcelas vivas"
  - `mes.row.cards.spentThisMonth` — "spent {x}" / "gasto {x}"
  - `mes.footer.lastUpdated` — "Last updated: {when}" / "Última atualização: {when}"
  - `mes.row.cards.cta.upcoming` — "Coming soon" / "Em breve"
  - PR-F1-3 must add **all of these to both `frontend/src/i18n/en.js` and `frontend/src/i18n/pt-BR.js`** (both files exist and follow the flat-key pattern).
- [ ] **Accessibility commitments** — `aria-expanded`/`aria-controls`, keyboard parity, semantic heading order. Confirm focus-visible outline uses `border.focus` per DESIGN.md §5 Inputs gap noted there — apply that fix on the new `ExpandableCard` wrapper.
- [ ] **Recommended impeccable references** — for this surface: `reference/spatial-design.md` (vertical hierarchy + tonal layering), `reference/motion-design.md` (expand/collapse curves), `reference/interaction-design.md` (keyboard/aria contract).
- [ ] **Open questions** — any visual/IA decisions the shape pass surfaces that need user confirmation before craft.

### Sequencing (the order of `$impeccable` invocations across PR-F1-3)

1. **Step 0 — `$impeccable shape mes-tab-rebuild`** — produces the brief above. Output checked into the PR description. **Frontend-dev does not write JSX before this is approved.**
2. **Step 1 — `$impeccable craft mes-tab-rebuild`** (or freehand JSX guided by the brief). The destructive rebuild happens here.
3. **Step 2 — `$impeccable harden mes-tab-rebuild`** — empty/loading/error states verified at component level.
4. **Step 3 — `$impeccable adapt mes-tab-rebuild`** — explicit phone-vs-desktop pass; output is 375px and 1280px screenshots in dark + light (4 screenshots) attached to the PR.
5. **Step 4 (pre-merge) — `$impeccable critique mes-tab-rebuild` + `$impeccable audit mes-tab-rebuild`** — UX critique + a11y/perf/responsive. Both run before reviewer hand-off.

The deferred `$impeccable polish` round is what becomes PR-F1-4 (per PRD-08 §5.3 "polish in a follow-up").

---

## Open items (gaps and contradictions found)

1. **Plan PR-F1-3 file inventory is incomplete** — at least nine files in the existing `mes/` folder are not accounted for. Section (a) above provides the missing inventory; copy it into the plan before code starts.

2. **`useCreditCardsV2.js` and `ExpandableCard.jsx` are mislabeled "NEW"** — `useCreditCardsV2` violates the architect anti-pattern list (V2 suffix). Rename to `useMonthCreditCards.js` or rewrite `useCreditCards.js` in place. `ExpandableCard.jsx` is ~80% the existing `KpiExpander.jsx` — call it a rename+adapt.

3. **Plan's component naming is mixed-language** — `IncomeRow` next to `CartoesRow`, `LeftoverAnchor`. Pick one direction (recommendation: stay PT to match the folder `mes/` and existing keys `mes.creditCards.*`).

4. **Plan's Open Q4 misstates the routing mechanism** — `Transacoes` does not accept URL query params; cross-tab routing is in-memory via `useNav.goToTransactions(category)`. Rewrite the question and resolution. Drop `?type=income`.

5. **`SaldoExpanded.jsx`'s "Contábil × Caixa real × Δ" reconciliation strip** is being silently retired by the rebuild. PRD-08 does not preserve it. **Confirm with the user** that this is intentional. If kept, it goes in a Fluxo or Patrimônio tab follow-up — not back into Mes.

6. **PRD-08 §6.3 references Portuguese account paths** (`passivo:cartao:*`). Per persisted memory and CLAUDE.md, account names in code must be English. PR-F1-1 and PR-F1-2 already grapple with this in their Open Q1. Whatever the backend lands as canonical must be reflected in the i18n key strategy and any client-side prefix matching (the new hook must not re-introduce a client-side filter — server-side filter in PR-F1-2 is canonical).

7. **DESIGN.md does not specify expansion motion curve / duration** — current `KpiExpander` uses `transition: 0.2s ease`, which is `ease`. PR-F1-3 has a chance to fix this. Recommendation: ease-out-quint at 240ms for height, 200ms for chevron. **Don't bundle a DESIGN.md amendment into PR-F1-3** — note the gap for a future motion-spec ADR/DESIGN.md addition (separate PR).

8. **PR-F1-3 Open Q1 ("`MonthContext` reuse")** — confirmed reusable as-is. `Mes.jsx` already reads `selectedMonth` and `refreshKey`; the rebuild keeps using them. No context API change needed.

9. **PR-F1-3 estimated effort 3–4 days assumes the existing `CategoriasSection` is rebuilt** — if reused (per §(a)), 0.5–1 day disappears. Net new estimate after the §(a) reuse fixes: **2.5–3 days**.

10. **`CreditCardSection.jsx` deletion strands `useCreditCards.js`'s pure helpers** (`aggregateCard`, `buildCardList`) which have no other callers but are exported for unit tests. Verify with a directory listing before the PR closes that no orphan tests remain.

11. **PRD-08 §8 references "tela completa de despesas" / per-card drill-down / parcelas vivas** as targets of CTAs from the Mes tab. The follow-up PR(s) for these telas should be acknowledged but **not pre-numbered** in the current plan.

12. **PRD-08 references `passivo:cartao:*` (pt-BR)** versus CLAUDE.md's English-as-source convention. Recommendation: leave the PRD alone (illustrative pt-BR), let PR-F1-1's Open Q1 resolution drive the canonical form, document the resolution in a comment on `MonthSummaryService.CARD_PREFIXES`.

---

## File paths referenced

- `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`
- `docs/08-PRD-visao-mensal-dashboard.md`, `docs/07-PRD-dashboard-cartao-credito.md`
- `docs/adr/README.md`
- `docs/plans/PR-F1-1-month-summary-endpoint.md`, `docs/plans/PR-F1-2-credit-cards-endpoint.md`, `docs/plans/PR-F1-3-mes-tab-rebuild.md`
- `frontend/src/features/mes/Mes.jsx`
- `frontend/src/features/mes/sections/{KpiSection,ReceitaExpanded,DespesaExpanded,SaldoExpanded,CreditCardSection,CategoriasSection,CategoriaDrilldown,MaioresGastosSection}.jsx`
- `frontend/src/features/mes/components/{KpiExpander,CreditCardRow,CreditCardDormantRow,CreditCardCategoryBar,CreditCardExpanded,TransacaoRow}.jsx`
- `frontend/src/features/mes/hooks/{useCreditCards,useReceitas,useSparklines}.js`
- `frontend/src/features/mes/lib/groupReceitas.js`
- `frontend/src/features/transacoes/Transacoes.jsx`
- `frontend/src/contexts/NavContext.jsx`
- `frontend/src/i18n/{index,en,pt-BR}.js`
- `.claude/agents/frontend-dev.md`
- `.claude/skills/impeccable/SKILL.md`, `.claude/skills/impeccable/reference/shape.md`
