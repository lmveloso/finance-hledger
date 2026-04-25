# `$impeccable shape mes-tab-rebuild` — Step 0 brief for PR-F1-3

**Command:** `$impeccable shape mes-tab-rebuild`
**Register:** product (the Mes tab is dashboard UI; design serves the product)
**Status:** Step 0 of PR-F1-3 (`docs/plans/PR-F1-3-mes-tab-rebuild.md`). No production JSX may be written before this brief is approved.
**Scope:** Design planning only. This document is **not** code. It is the thinking that makes the rebuild's code precise.

**Authoritative inputs already loaded:** `PRODUCT.md`, `DESIGN.md`, `docs/08-PRD-visao-mensal-dashboard.md`, `docs/07-PRD-dashboard-cartao-credito.md` (adições 1–4), `docs/plans/PR-F1-3-mes-tab-rebuild.md`, `docs/plans/PR-F1-review-followup.md` §(b) and §(d).

**Discovery interview note.** The shape command's Phase 1 discovery questions are pre-answered by the PRDs and the structural commitments in the PR-F1-3 plan. Each section below names the source. No image probes were generated (no native image-generation capability in this harness; the skill says skip in that case). No new questions remain unresolved beyond those flagged in §10.

---

## 1. Feature summary

The Mes tab is the partner-facing **anchor screen** of the dashboard, opened daily on a phone for a calm, second-long check-in on the family's month-to-date. The rebuild replaces today's three-up KPI grid with a single vertical column of four cards — Sobrou no mês (anchor) → Receita → Despesa → Cartões — that answer the partner's natural questions in their natural order: *"Sobrou? De onde veio? Pra onde foi? O que devemos?"*. Each card is a tap-to-expand surface so the same screen serves both the glance and the sit-down session without a modal, a route change, or a second tab.

Source: `PRODUCT.md` (Users — phone-glance + desktop-sit-down), PRD-08 §1 + §2.2.

## 2. Primary user action

The partner opens the tab and within three seconds knows whether the month is in surplus or in red, then taps any of the four cards to follow the question one step deeper without leaving the screen.

Source: PRD-08 §1.

## 3. Design direction

### 3.1 Color strategy — **Restrained**

The Mes tab is the product's quiet centre. The Indigo Anchor (`accent.primary`) appears only on the Sobrou number when leftover ≥ 0; everything else lives in tinted neutrals plus the two semantic feedback colors (`feedback.positive` / `feedback.negative`) where they carry honest meaning. Total accent area on screen stays well under DESIGN.md's One Voice Rule (≤10%).

This pick **matches** the project default per `DESIGN.md` §2 (One Voice Rule). It does not override.

Why not Committed / Full palette / Drenched: PRODUCT.md's "Calm before clever" and the Quiet Ledger metaphor (`DESIGN.md` §1) explicitly reject saturated surface coverage on product UI. Committed would break the rarity that gives Indigo Anchor its meaning.

### 3.2 Theme scene sentence

> The partner reads the tab in bed at 6:50am on a phone before the kids wake up, room half-dark, screen at low brightness; on Sunday afternoon the same tab is open on a 14" laptop in a bright living room while the operator updates the journal next to her.

Both modes are first-class — the dark-mode read at dawn and the light-mode read on Sunday afternoon must hit the same calm, sharp personality. The app remounts on theme flip via `key={mode}`, so verifying both is cheap and is required.

Source: `DESIGN.md` §2 Two-Mode Equality Rule, `PRODUCT.md` Accessibility & Inclusion.

### 3.3 Named anchor references

1. **A printed bank statement on letter paper.** Rows on a quiet ground, type doing the hierarchy, no shadow, no tab navigation — the platonic Quiet Ledger. The four cards are four lines on the same sheet of paper, with the top line set in a larger face because that's the line you read first.
2. **The Things 3 Today list.** A vertical stack of subjects of equal visual weight, each one a tap target whose interior expands without the list shape-shifting. The card surface stays the same when expanded; only its inner compartment changes.
3. **A Bloomberg terminal cell readout (P&L row).** Tight, tabular numerics; sign carried by color *and* a leading symbol; no celebration, no decoration. Specifically the cell pattern, not the chrome — the chrome is hostile, the cell is honest.

These are products / objects, not adjectives, per the skill's anchor rule. None of them are "modern", "minimal", or "clean".

## 4. Scope

| Dimension | Value |
|---|---|
| Fidelity | **Production-ready.** Ships in PR-F1-3. |
| Breadth | One surface (the Mes tab — four cards + header context + footer). |
| Interactivity | Shipped-quality interactive component (full-card click, keyboard parity, mutual-exclusion state machine). |
| Time intent | Polish-until-it-ships *for the structural layer*. Final spacing-rhythm fine-tuning, motion micro-tuning, and edge-of-animation cases are deferred to PR-F1-4 (`$impeccable polish`) per PRD-08 §5.3. |

Task-scoped — these values do not persist into PRODUCT.md or DESIGN.md.

## 5. Layout strategy

A **single vertical stack** of four cards, in IA order from PRD-08 §2.2:

```
[ Header (existing MonthNavigator + tab title) ]

[ Sobrou no mês ]        ← anchor; type-emphasis-larger
[ Receita ]              ← peer
[ Despesa ]              ← peer
[ Cartões ]              ← peer

[ Última atualização: … ]   ← muted footer
```

### 5.1 Hierarchy mechanics

- The **anchor** carries hierarchy through **type scale + accent color**, not through a different surface, a stripe, or a shadow. Same `bg.card`, same `border.default`, same 4px radius as its three subordinates. The number is Display-Emphasis (38px) in `accent.primary` (or `feedback.negative` when negative); the three peers' numbers are Display (30px) in `text.primary`. (`DESIGN.md` §3 sanctions Display-Emphasis as "the single primary KPI per section, when one matters more than its peers".)
- The three peers are **visual peers** — same surface, same number size. Their order is the IA hierarchy, not a visual ranking.

### 5.2 Spacing rhythm (DESIGN.md tokens)

| Gap | Token | Where |
|---|---|---|
| Header → anchor | `spacing.gap-lg` (20px) | Visible breath before the anchor; signals "this is the headline". |
| Anchor → first peer (Receita) | `spacing.gap-md` (14px) | Tighter than header→anchor; the four cards read as one unit. |
| Peer → peer | `spacing.gap-md` (14px) | Even rhythm down the column. |
| Last peer (Cartões) → footer | `spacing.gap-lg` (20px) | The footer sits "outside" the column. |

This rhythm is asymmetric on purpose — uniform spacing would flatten the anchor's emphasis. Per `$impeccable` shared design law: "Vary spacing for rhythm. Same padding everywhere is monotony."

### 5.3 Responsive shape

Same vertical stack on **375px** (mobile, the dominant view) and **1280px** (desktop, the sit-down view). No horizontal grid at any breakpoint. The desktop adaptation is a **width clamp**, not a re-layout:

| Breakpoint | Adaptation |
|---|---|
| 375px (mobile) | Cards full-width minus 16px page-side padding. Card-padding stays 24px (`spacing.card-padding`). |
| 1280px (desktop) | Same vertical stack, **max content width 720px** centered. Horizontal margins absorb the rest of the viewport. Cards keep the same shape; type scales unchanged. |

PRODUCT.md Principle 4 ("Glance and drill — both first-class") is enforced by giving the desktop view the same craft as the phone — the desktop is not a wider-grid afterthought. The reverse is also true: this is not a desktop layout shrunk down.

## 6. Typographic hierarchy map

All values are DESIGN.md tokens. **No hex literals appear in this map** (per `DESIGN.md` Tinted-Neutral Rule).

| Surface | Token | Weight | Color | Tracking | Notes |
|---|---|---|---|---|---|
| "SOBROU NO MÊS" label | Label (11px) | 500 | `text.muted` | 0.15em, uppercase | Quiet-Caps. The eyebrow above the anchor number. |
| Sobrou number | Display-Emphasis (38px) | 600 | `accent.primary` if `leftover ≥ 0` else `feedback.negative` | −0.02em | Tight-Number. Single primary KPI of the section. |
| "RECEITA" / "DESPESA" / "CARTÕES" labels | Label (11px) | 500 | `text.muted` | 0.15em, uppercase | Quiet-Caps. Peer eyebrows. |
| Receita number | Display (30px) | 600 | `text.primary` | −0.02em | Tight-Number. Peer to Despesa. |
| Despesa number | Display (30px) | 600 | `text.primary` | −0.02em | Tight-Number. |
| Cartões "devendo R$ X" | Body (13px) | 400 | `text.primary` | default | Auxiliary, not Display — Cartões' headline is the debt amount inline with the variation, not a 30px hero. |
| Cartões "↑/↓ R$ Y" | Body Small (12px) | 400 | `feedback.positive` (debt fell) / `feedback.negative` (debt grew) | default | Pairs with arrow icon — color is **never** the sole sign carrier (Honest Color Rule). |
| Anchor expanded body labels ("Receita", "Despesa", "↳ saiu da conta", "↳ foi pro cartão", "Pagamento de fatura no mês") | Body (13px) | 400 | `text.primary` (main) / `text.secondary` (sub-items "↳ …") | default | Indented sub-items use the unicode arrow `↳`, not a left-stripe or border (no border-left > 1px allowed). |
| Anchor expanded body values | Body (13px) | 600 | `text.primary` | −0.02em | Tabular alignment via `font-variant-numeric: tabular-nums`. |
| Receita expanded list (income type rows) | Body (13px) labels, Body 600 values | per-row | `text.primary` | −0.02em on values | Same row primitive as `.crow`. |
| Despesa expanded category rows | Per existing `CategoriasSection` (reused as-is) | — | — | — | The section is reused; PR removes only its outer `<div className="card">` framing per PRD-08 §5.3. |
| Cartões expanded per-card row name + holder | Body (13px) | 400 + 400 | `text.primary` + `text.muted` | default | Holder is the muted descender. |
| Cartões expanded per-card debt | Display (30px? no — Body 600, right-aligned) | 600 | `text.primary` | −0.02em | Tight-Number. Right-aligned. **Not** Display — too large for a list row. |
| Cartões expanded per-card aux ("gasto R$ X · N parcelas vivas") | Body Small (12px) | 400 | `text.muted` | default | One muted line under each card. |
| Despesa CTA "Ver todas as categorias e maiores gastos" | Body (13px) | 500 | `accent.primary` | default | Inline link styling, not a button. Hover bumps to `text.primary`. |
| Footer "Última atualização: …" | Micro (10px) | 500 | `text.muted` | 0.18em, uppercase optional | Centered. The single Micro element on the screen. |

This map matches the table in `docs/plans/PR-F1-3-mes-tab-rebuild.md` §Typography and the review follow-up §(d). Any deviation is a regression.

## 7. Token map for surfaces

Aligns 1-to-1 with `docs/plans/PR-F1-3-mes-tab-rebuild.md` §Tonal-Depth and `docs/plans/PR-F1-review-followup.md` §(b). **Reading A** — expansion sits inside the same outer card.

| Surface | Background | Border | Radius | Padding |
|---|---|---|---|---|
| Page (canvas) | `bg.page` | none | — | page-side 16px (mobile) / clamp to 720px content (desktop) |
| Outer card — collapsed (all four) | `bg.card` | `1px solid border.default` | 4px (`rounded.card`) | `spacing.card-padding` (24px) |
| Outer card — expanded (all four) | `bg.card` | `1px solid border.default` (unchanged) | 4px (unchanged) | row header keeps `spacing.card-padding`; expansion body sits below |
| Separator between row header and expansion body | `1px solid border.subtle` | — | — | full inner width |
| Expansion body | `bg.cardAlt` | **none** | — | `spacing.inner` (20px) |
| Anchor card (collapsed AND expanded) | `bg.card` (identical to peers) | `1px solid border.default` (identical to peers) | 4px | 24px |
| Rows inside expansions (e.g. each category-pai bar, each income-type line, each card row) | direct on `bg.cardAlt` | `1px solid border.subtle` between rows (last row has none) | — | 14px vertical (`spacing.row`) |
| Hover affordance inside expansion (rows) | `bg.hover` (covers full width via the `.crow` negative-margin pattern) | unchanged | — | unchanged |
| Outer card hover | **none** — cards are containers, not affordances. The card itself does not change on hover; its `cursor: pointer` is the affordance. | | | |
| Focus-visible (outer card, when keyboard-focused) | unchanged | 2px outline in `border.focus` (Indigo Anchor, on `:focus-visible` only) | — | — |

**Forbidden in this PR (re-stated for the implementer):**

- `box-shadow` on cards / KPIs / chips / buttons.
- `border-left` or `border-right` greater than 1px as a colored stripe.
- Nested cards (no `bg.card` inside `bg.card`).
- Color literals: `#000`, `#fff`, or any non-tinted neutral.
- Color as the sole sign carrier on the Cartões variation.
- Modal anywhere in this surface (PRODUCT.md "Inline before modal").

## 8. Key states (per card)

For each of the four cards: default (collapsed), expanded, loading, error, empty, reduced-motion. The `ErrorBox` lives **above the card stack**, not inside an individual card — a tab-level fetch failure compromises the whole stack.

### 8.1 Sobra (anchor)

| State | Visible content |
|---|---|
| Default (collapsed, open by default on page load) | Eyebrow `mes.anchor.label` + Display-Emphasis number + chevron rotated 180deg (because expanded by default). Number color: `accent.primary` (≥0) or `feedback.negative` (<0). The leading sign is rendered explicitly ("R$ 1.234,56" for positive, "−R$ 1.234,56" for negative — the minus is a sign carrier, not just color). |
| Expanded (default state) | Inside the same outer card, separated by `1px solid border.subtle`: the decomposition per PRD-08 §4.1 — `mes.anchor.expand.income` value, `mes.anchor.expand.expense` value, two indented sub-items `mes.anchor.expand.viaAssets` (`expense_via_assets`) and `mes.anchor.expand.viaCard` (`expense_via_credit_card`), then a second `1px solid border.subtle` separator, then `mes.anchor.expand.cardPayment` value (`credit_card_payment`) — informative, not part of the equation. No emoji, no celebration, no equation glyph. |
| Collapsed (after user opens any of Receita/Despesa/Cartões) | Same compact layout as default. Auto-collapse begins concurrently with the new row's expansion (same 240ms duration). The anchor does **not** auto-reopen when the subordinates close. |
| Loading | Number renders as `···` (three middots). Eyebrow stays visible. Chevron remains in default-rotation. (`DESIGN.md` §5 KPI: "never as `0` or a skeleton".) |
| Error | `ErrorBox` rendered above the entire card stack. Per-card body is not rendered until the fetch resolves. |
| Empty | The anchor cannot be empty in the structural sense (a month with zero income and zero expense returns a leftover of `R$ 0,00`, which is honest data, not "empty"). No empty copy needed for the anchor. |
| Reduced motion | Expand/collapse is instant (no `max-height` interpolation). Chevron snaps. |

### 8.2 Receita

| State | Visible content |
|---|---|
| Default (collapsed) | Eyebrow `mes.row.income.label` + Display number (`text.primary`) + chevron. |
| Expanded | Inside the same outer card on `bg.cardAlt`: list of income-type rows from `useReceitas` + `lib/groupReceitas` — one row per type, label on the left (`text.primary`), value right-aligned (`text.primary`, weight 600, tabular-nums). Last row is a totals line with `1px solid border.subtle` above it. PRD-08 §4.2 explicitly admits this is light. No external routing — partner is meant to see the breakdown inline. |
| Loading | Number renders as `···`. |
| Error | Tab-level `ErrorBox`. |
| Empty | Number renders as `R$ 0,00`. Expanded body shows a single muted line: `mes.row.income.empty` ("Nenhuma receita este mês"). No emoji, no encouragement, no celebration. |
| Reduced motion | Instant expand/collapse. |

### 8.3 Despesa

| State | Visible content |
|---|---|
| Default (collapsed) | Eyebrow `mes.row.expense.label` + Display number + chevron. |
| Expanded | Inside the same outer card on `bg.cardAlt`: existing `CategoriasSection` rendered without its outer `<div className="card">` framing (PRD-08 §4.3). Each category-pai row shows name + percentage of total + amount + horizontal proportional bar. Click-through pattern is unchanged. Below the list: a single inline link CTA `mes.row.expense.cta` ("Ver todas as categorias e maiores gastos"). |
| Loading | Number `···`. Expanded body shows the existing CategoriasSection's loading state. |
| Error | Tab-level `ErrorBox`. |
| Empty | Number `R$ 0,00`. Expanded body shows `mes.row.expense.empty` ("Nenhuma despesa este mês") — single muted line, no CTA. |
| Reduced motion | Instant. |

### 8.4 Cartões

| State | Visible content |
|---|---|
| Default (collapsed) | Eyebrow `mes.row.cards.label` + auxiliary line `mes.row.cards.aux` ("devendo {x} · {arrow} {y}") on the same row. The arrow glyph is `↑` (debt grew, paired with `feedback.negative`) or `↓` (debt fell, paired with `feedback.positive`); when variation is exactly zero, no arrow renders, color stays `text.muted`. Color is never the only sign carrier — the arrow shape is the primary signal, color reinforces it. |
| Expanded | Inside the same outer card on `bg.cardAlt`: list of cards from `useCartoesMes`, one row per card. Each row: name (Body, `text.primary`) and holder (Body, `text.muted`) on the left; outstanding debt right-aligned (Body 600, tabular-nums, Tight-Number); a muted aux line below the card name with `mes.row.cards.spentThisMonth` ("gasto {x}") and `mes.row.cards.installmentsAlive` ("{count} parcelas vivas") joined by ` · `. |
| Loading | Aux line renders as `··· · ··· R$ ···`. |
| Error | Tab-level `ErrorBox`. |
| Empty (no cards registered) | Aux line renders as `mes.row.cards.empty` ("Sem cartões cadastrados") in `text.muted`. Expanded body, if user opens it anyway, repeats the same line — no fake card rows. |
| Reduced motion | Instant. |

## 9. Interaction model

### 9.1 Card affordance

Every card is a button-like surface. The whole card, header and number area, is the click target — not just the chevron.

- **Pointer:** `cursor: pointer` on the outer wrapper (the `ExpandableCard` element).
- **Keyboard:** the wrapper is `role="button"`, `tabIndex={0}`. `Enter` and `Space` toggle. `Tab` moves between cards.
- **ARIA:** `aria-expanded` reflects state; `aria-controls` points at the panel id (e.g. `mes-anchor-panel`, `mes-receita-panel`, etc.).
- **Focus:** `:focus-visible` shows a 2px outline in `border.focus` (Indigo Anchor). No `:focus` outline (mouse users don't see one).

This formalizes the gap noted in `DESIGN.md` §5 Inputs ("future inputs must add `border.focus` (Indigo Anchor) on `:focus-visible`") for the new `ExpandableCard` wrapper.

### 9.2 Mutual-exclusion rule (PRD-08 §5.1)

| User action | Anchor | Receita | Despesa | Cartões |
|---|---|---|---|---|
| Page load | open | closed | closed | closed |
| User opens Receita | **auto-close** | open | closed | closed |
| User opens Despesa (after Receita) | closed (unchanged) | open (unchanged) | open | closed |
| User opens Cartões (after both) | closed (unchanged) | open (unchanged) | open (unchanged) | open |
| User closes all three subordinates | **stays closed** (does NOT auto-reopen) | closed | closed | closed |
| User clicks the anchor while it is closed | open (re-opens) | open (unchanged — coexists freely) | open (unchanged) | open (unchanged) |

The anchor's auto-collapse and the three subordinates' independent toggles are **two separate state machines** that share only the "anchor closes when any subordinate opens" edge. The plan's `Mes.jsx` state shape (`anchorOpen` boolean + `openSet` Set) encodes exactly this.

### 9.3 Click handlers (drill-downs)

Sourced from `docs/plans/PR-F1-3-mes-tab-rebuild.md` Open Q4 (RESOLVED).

| Surface | Click target | Handler |
|---|---|---|
| Despesa expansion | Category-pai row / its bar | `useNav.goToTransactions(category.segmento_raw)` (in-memory cross-tab handoff via `NavContext`; no URL params) |
| Despesa expansion | CTA "Ver todas as categorias e maiores gastos" | `useNav.goToTransactions(null)` |
| Cartões expansion | Per-card row | **No-op + tooltip** rendering `mes.row.cards.cta.upcoming` ("Em breve"). Per-card drill-down ships in a future PR (PRD-08 §8). |
| Receita expansion | Income-type row | **No click handler.** Inline list only — no `?type=income` route, no cross-tab handoff (PRD-08 has no such requirement). |
| Anchor expansion | Sub-items (`↳ saiu da conta` / `↳ foi pro cartão` / pagamento de fatura) | **No click handler.** Read-only decomposition. |

## 10. Motion

Curves and durations match `docs/plans/PR-F1-3-mes-tab-rebuild.md` §Motion verbatim.

| Element | Property | Duration | Curve |
|---|---|---|---|
| Expand/collapse | `max-height` 0 → measured-height (and reverse) | 240ms | `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quint) |
| Chevron rotation | `transform: rotate(0deg ↔ 180deg)` | 200ms | same curve |
| Anchor auto-collapse | `max-height` (concurrent with the row that opened) | 240ms | same curve |

Notes:

- **Do not animate layout properties** (`width`, `height`, `padding`, `margin`) — only `max-height` and `transform`. Per `$impeccable` shared design law and `DESIGN.md` "ease out with exponential curves".
- **No bounce, no elastic.** The Quiet Ledger does not flex.
- **No fade on auto-collapse.** Collapse alone is the cue. A simultaneous fade would over-egg it and break the "calm before clever" principle.
- **`@media (prefers-reduced-motion: reduce)`** suppresses all transitions. Cards expand/collapse instantly; chevron snaps. Per PRODUCT.md Accessibility ("Motion is decoration here, not affordance — users who turn it off lose nothing").

DESIGN.md does not currently codify expansion motion. This PR adopts the shared-law default; codifying it as a DESIGN.md amendment is **out of scope** for PR-F1-3 (would land as a separate motion-spec PR, per the review follow-up §(b)).

## 11. Mobile (375px) vs desktop (1280px)

Same vertical four-card stack on both. The desktop adaptation is a width clamp, not a re-layout — explicitly **no horizontal grid at any breakpoint**. (The plan's acceptance criteria forbid this.)

| Aspect | 375px (mobile, dominant view) | 1280px (desktop, sit-down view) |
|---|---|---|
| Layout | Single column, full viewport width minus 16px page-side padding | Single column, **max content width 720px**, centered horizontally |
| Card padding | 24px (`spacing.card-padding`) | 24px (unchanged) |
| Card gap | 14px (`spacing.gap-md`) between peers, 20px (`spacing.gap-lg`) header→anchor and last-peer→footer | identical |
| Type scale | unchanged from DESIGN.md tokens | unchanged |
| Header (MonthNavigator) | compact pill variant | sidebar variant (already existing tab-shell behavior; no changes here) |
| Footer "Última atualização" | centered, Micro (10px) | identical |

PRODUCT.md Principle 4 is the contract: "A KPI tile on mobile and the same tile on a 27" monitor are different design problems; both deserve the same craft. Density adapts; honesty doesn't." This brief honors that by **not** denser-packing the desktop view (no two-column variation, no widening the cards) — the desktop view is the same craft, with horizontal margins absorbing the surplus width.

## 12. Microcopy (i18n keys, EN source + pt-BR translation)

**No new keys outside the set already enumerated in `docs/plans/PR-F1-3-mes-tab-rebuild.md` §i18n.** Re-stating verbatim for completeness:

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
| `mes.row.income.empty` | "No revenue this month" | "Nenhuma receita este mês" |
| `mes.row.expense.empty` | "No expense this month" | "Nenhuma despesa este mês" |
| `mes.row.cards.empty` | "No cards registered" | "Sem cartões cadastrados" |

Microcopy notes:

- **No celebratory tone, no emoji, no exclamation marks** anywhere. PRODUCT.md anti-references are explicit.
- **No em dashes** anywhere — the impeccable shared law forbids them. Use commas, colons, periods, parentheses, or the `↳` glyph for indented sub-items.
- **Pluralization in `mes.row.cards.installmentsAlive`** — pt-BR happens to use "parcelas" for both 1 and N (matches Portuguese plural conventions when prefixed by a number); EN source uses "{count} active installments" which reads correctly for `count = 1` ("1 active installments") only awkwardly. Keep as-is for parity with the plan; if the user wants pluralization fidelity in EN, that's a follow-up clarify pass, not a Step-0 deviation.
- All strings flow through `t('key')`; no hard-coded pt-BR in JSX. Matches the project i18n rules.

## 13. Accessibility commitments

- **`aria-expanded`** on every card matches its open/closed state.
- **`aria-controls`** points at the panel id (one id per card: `mes-anchor-panel`, `mes-receita-panel`, `mes-despesa-panel`, `mes-cartoes-panel`).
- **Keyboard parity** — Tab to focus, Enter or Space to toggle. No mouse-only affordance.
- **`:focus-visible`** outline uses `border.focus` (Indigo Anchor). Closes the gap noted in `DESIGN.md` §5 Inputs for the new `ExpandableCard` wrapper.
- **`prefers-reduced-motion`** suppresses all transitions (height, chevron). No exceptions.
- **Honest Color Rule** — sign on Cartões variation is paired with arrow shape; the leading minus sign on a negative leftover is paired with `feedback.negative`. Color is never the only sign carrier.
- **Heading order** — the existing tab shell provides the page-level `<h1>`. Cards do not introduce competing headings; their labels are visually styled labels, not `<h2>`s, to avoid inflating the document outline. The Sobra anchor's label could be argued for `<h2>` if a screen-reader user wants quick navigation across the four sections — flagged as Open Question §15.1 below.
- **Focus order on auto-collapse** — when the anchor auto-collapses while a subordinate opens, focus stays on the subordinate the user just activated. The anchor's `aria-expanded` flips to `false` programmatically; no focus stolen.
- **Touch target size** — each card is well above 44×44pt at every breakpoint (cards are full-width with 24px padding); no cramped chevron-only target.

## 14. Recommended impeccable references for the craft round

When `$impeccable craft` runs (or a freehand JSX pass guided by this brief):

1. **`reference/spatial-design.md`** — vertical hierarchy, tonal layering, the asymmetric spacing rhythm (header→anchor `gap-lg`, peer→peer `gap-md`).
2. **`reference/motion-design.md`** — the ease-out-quint expand/collapse, the no-bounce rule, `prefers-reduced-motion` parity.
3. **`reference/interaction-design.md`** — keyboard contract, `aria-expanded` / `aria-controls`, full-card click vs chevron-only.

`reference/typeset.md` is implicit — the type map is fully fixed by DESIGN.md tokens, so no creative typography decisions remain.

## 15. Open questions

These are surfaced for user resolution before craft. None block the brief from being approved as the foundation; they are micro-decisions the implementer would otherwise have to invent.

### 15.1 Heading semantics for the four card labels

Should the four eyebrows (`mes.anchor.label`, `mes.row.income.label`, `mes.row.expense.label`, `mes.row.cards.label`) be rendered as `<h2>`s for screen-reader landmark navigation, or as styled `<span>`s? `<h2>`s give the partner using a screen reader a quick way to jump between the four sections; `<span>`s keep the document outline shallower (the tab shell already has the page `<h1>`). PRD-08 doesn't specify. Recommend `<h2>` for the partner-glance use case; defer to user.

### 15.2 Pluralization in EN for `mes.row.cards.installmentsAlive`

The current key produces "1 active installments" when `count === 1`. The pt-BR translation is fine because Portuguese uses "1 parcela" / "N parcelas" but the ledger generally has count > 1 in this context. Either:
- (a) Accept the English awkwardness for now (matches the plan) and revisit in a `$impeccable clarify` pass.
- (b) Switch to ICU plurals or two keys (`installmentsAlive.one` / `installmentsAlive.other`).
Recommend (a) — defer to a later clarify pass; not a Step-0 blocker.

### 15.3 Last-updated relative vs absolute time in the footer

`summary.last_updated` (from `/api/month-summary`, per PR-F1-1) is presumably an ISO timestamp. The footer can render it as relative ("3 hours ago") or absolute ("today at 09:14"). PRD-08 §6.4 calls it "data e hora da última atualização" — leans absolute. Recommend absolute (`pt-BR`: "Última atualização: 25/04/2026 09:14"). EN source: "Last updated: Apr 25, 2026 9:14am". Defer to user if relative is preferred.

### 15.4 Behavior when `summary.last_updated` is null

If the backend returns `null` (never imported), the footer should render `t('mes.footer.lastUpdated', { when: '—' })` or hide entirely. Recommend rendering with `—` as a fallback rather than hiding (the partner deserves to see "we have no record of an update" honestly). Not in the plan; flag for confirmation.

### 15.5 Whether the anchor's number leading sign uses the unicode minus (`−`, U+2212) or the ASCII hyphen-minus (`-`)

DESIGN.md does not specify. The unicode minus is typographically tighter and matches the Tight-Number aesthetic. Recommend `−` (U+2212). Localized currency formatting via `Intl.NumberFormat` produces the unicode minus by default in pt-BR for negative values, so this is likely already resolved by `formatBRL`; flagging anyway.

---

## Brand-rule self-check (gate before craft)

Per the frontend-dev preamble: every shape brief should close with a self-check against the named DESIGN.md rules.

| Rule | How this brief honors it |
|---|---|
| One Voice | `accent.primary` appears only on the Sobra number when ≥0; nowhere else. Total accent area on screen ≪10%. |
| Honest Color | Cartões variation pairs color with arrow shape. Anchor sign pairs color with leading minus glyph. Empty states use `text.muted`, not `feedback.negative` ("no revenue this month" is not a bad event). |
| Two-Mode Equality | Theme scene sentence forces both modes (dawn dark, Sunday afternoon light). Token map uses semantic tokens that resolve correctly in both. Acceptance: 4 screenshots (dark+light × mobile+desktop). |
| Tight-Number | All numerics specified with `letter-spacing: -0.02em` in §6. Tabular-nums on aligned columns. |
| Quiet-Caps | Uppercase only on the four 11px labels and the optional 10px footer. Body and titles never uppercased. |
| Flat-By-Default + 1px Border | No `box-shadow` anywhere. All borders 1px. Tonal-Depth: three layers (`bg.page` → `bg.card` → `bg.cardAlt`). No nested cards. |
| Inline before modal | No modals introduced. Drill-downs are inline expansions or cross-tab handoffs (existing `useNav` pattern). |

Every absolute ban (gradient text, glassmorphism, hero-metric template, identical card grids, side-stripe borders, modal-as-first-thought, `#000`/`#fff`, em dashes) is explicitly avoided.

---

**Ready for user approval.** Once this brief is confirmed, the craft round may proceed with the JSX rewrite per `docs/plans/PR-F1-3-mes-tab-rebuild.md`.
