# PRD — Fase U: UI/UX Overhaul

**Version:** 0.1
**Date:** April 2026
**Status:** Draft — ready for phased implementation
**Related docs:**
- [Estabilização](./01-ESTABILIZACAO.md) — Fase 0 (prerequisite; completed)
- [PRD Dashboard 2.0](./02-PRD-dashboard-v2.md) — Fase D (prerequisite; completed)
- [PRD Magic Import](./03-PRD-magic-import.md) — Fase 1 (follows Fase U)

**Design source:** handoff bundle from Claude Design (April 2026), archived in this repo at [`docs/design/fase-u/`](./design/fase-u/). Canonical references:
- [`docs/design/fase-u/project/Finance Dashboard.html`](./design/fase-u/project/Finance%20Dashboard.html) — single-file prototype (run locally to preview).
- [`docs/design/fase-u/project/src/theme.js`](./design/fase-u/project/src/theme.js) — source of truth for tokens (palette, fonts, radii).
- [`docs/design/fase-u/project/src/components.jsx`](./design/fase-u/project/src/components.jsx) — shared components (Card, KPI, Sparkline, etc.).
- [`docs/design/fase-u/project/src/tab-*.jsx`](./design/fase-u/project/src/) — per-tab implementations (resumo, mes, ano, fluxo, orcamento, patrimonio).
- [`docs/design/fase-u/project/src/App.jsx`](./design/fase-u/project/src/App.jsx) — nav shell (sidebar + mobile bottom bar).
- [`docs/design/fase-u/chats/chat1.md`](./design/fase-u/chats/chat1.md) — full design conversation, including iterations (heatmap color fix, Orçamento responsive grid, credit-card section, Receitas KPI removal).
- [`docs/design/fase-u/project/src/mock.js`](./design/fase-u/project/src/mock.js) — shape of data the prototype expected (useful as a cross-check against `/api/*` payloads).

When implementing a PR, read the corresponding tab file in `docs/design/fase-u/project/src/` alongside the section here. The prototype is the pixel-level reference; this PRD is the scope/ordering contract.

---

## 1. Context

Fase 0 stabilized the code structure; Fase D reworked the dashboard information architecture around the Principle dimension. Fase U is the **visual and interaction layer overhaul** that reskins the whole app, introduces dark/light mode, and redesigns the visualizations in each tab. It lands before Fase 1 (Magic Import) so that the new ingestion flows are built on top of the final UI system.

## 2. Goals

- **Visual refresh** — replace the warm-brown editorial palette with an indigo-violet system that supports dark and light modes.
- **Navigation rework** — desktop sidebar + mobile bottom tab bar, replacing the top MonthPicker bar as primary navigation.
- **Better visualizations** — KPI sparklines, horizontal category bars, CSS heatmap (Ano), waterfall (Fluxo), SVG donut + responsive rows (Orçamento), native SVG area chart (Patrimônio).
- **Credit-card visibility** — new "Despesas por cartão de crédito" section in Mês.
- **Single opinionated style** — Plus Jakarta Sans + Instrument Serif typography, rounded card radii. No runtime Tweaks panel; user-level toggles limited to dark/light and month navigation.

## 3. Non-goals

- No new data endpoints. All tabs continue to read the existing `/api/*` surface.
- No Magic Import work (that's Fase 1).
- No redesign of `plano`/`previsão` tabs — they're hidden from nav, code preserved for later.
- No structural redesign of `transações` — design bundle skipped it; we apply new tokens only.

## 4. Scope

### 4.1. Tabs in final nav (7)

Order: **Resumo · Mês · Ano · Fluxo · Orçamento · Patrimônio · Transações**.

Hidden from nav (code retained): `plano`, `previsão`.

### 4.2. Design tokens (replace)

`frontend/src/theme/tokens.js` is **replaced** by dual-mode indigo-violet tokens. Shape mirrors the design bundle's `theme.js`:

- `bg` (page/sidebar/card/cardAlt/hover/input)
- `border` (default/subtle/focus)
- `text` (primary/secondary/muted/disabled)
- `accent` (primary/secondary + muted variants)
- `feedback` (positive/negative/warning/info + muted variants)
- `chart.colors` — 7-color category palette, differs per mode
- `radius` — `rounded` variant only (xs/sm/md/lg)
- `padding.card`, `padding.inner`

Dark palette: `bg.page #0d0f1a`, accents `#6366f1` / `#a78bfa`.
Light palette: `bg.page #f0f1ff`, accents `#6366f1` / `#8b5cf6`.

### 4.3. Typography

Single pairing: **Plus Jakarta Sans** (body) + **Instrument Serif** (display). Load via Google Fonts. No font switching at runtime.

### 4.4. Out of scope

- Runtime Tweaks panel (font/radii/density switcher from the prototype).
- Redesign of `plano`, `previsão`, `transações` (transações gets token polish only).
- Mock data swap (everything stays wired to `/api/*`).

## 5. Phased delivery

Nine PRs. **PR-U0 unblocks everything**; **PR-U1 unblocks U2–U8**; U2–U8 are independent after U1.

### PR-U0 — Foundation

**Goal:** replace tokens + add theme context. No tab redesign yet.

- Replace `frontend/src/theme/tokens.js` with dual-mode `light` + `dark` token trees.
- Add `frontend/src/contexts/ThemeContext.jsx` — exposes `{ mode, tokens, toggle }`, persists `mode` to `localStorage` under `finance.theme`.
- Wire `<ThemeProvider>` at the root of `main.jsx` / `App.jsx`.
- Update every tab's token import to read from `useTheme()` (or a `color` proxy that resolves per-mode) — mechanical swap, no visual redesign.
- Load Plus Jakarta Sans + Instrument Serif; retire Fraunces + Inter.
- Hide `plano` + `previsão` tabs from nav (routes kept).

**Acceptance:** every current tab still renders; dark ↔ light toggle works; fonts loaded; no warm-brown hex anywhere in `src/`.

### PR-U1 — Nav shell

**Goal:** replace the top MonthPicker bar with the new nav.

- Desktop (≥768px): left sidebar (`bg.sidebar`), tab list, month navigator + compare toggle, theme toggle, version stamp at bottom.
- Mobile (<768px): bottom tab bar, month navigator moves into a compact top header.
- Tab order: Resumo · Mês · Ano · Fluxo · Orçamento · Patrimônio · Transações.

**Acceptance:** nav works on mobile and desktop; month state preserved across tab switches (unchanged `MonthContext`).

### PR-U2 — Resumo

- KPI cards with inline sparklines (saldo, despesas). **No Receitas KPI card** — removed per design iteration.
- Horizontal category bars with percentage labels + stacked proportion bar.
- Princípios progress bars (targets vs realizado).
- Maiores Gastos list: amounts in `text.primary` (not negative red).

### PR-U3 — Mês

- Princípios: single-row grid layout with header row, bars in chart-palette colors at ~75% opacity, over-budget indicated by bolding the % only.
- New **Despesas por cartão de crédito** section at bottom: card list (total + stacked category proportion bar + mini category breakdown), expand to list top transactions per card. Data source: `/api/accounts?type=passivo` + `/api/top-expenses?account=<card>`.
- Inline expansion only — no modals (per frontend-dev convention).

### PR-U4 — Ano heatmap

- 7 categories × 12 months CSS grid heatmap.
- Color intensity scaled **per-category** (so each row's max = full saturation).
- Dark mode uses lighter violet `#a78bfa`; light mode uses indigo `#6366f1`.
- Monthly totals shown as mini bars under the heatmap.

### PR-U5 — Fluxo

- Waterfall chart: receita → each expense category → saldo.
- Account delta cards (per-account begin/end/delta).
- Replace current node-graph view (shipped in PR-D6) — retire the graph component once waterfall lands.

### PR-U6 — Orçamento

- SVG donut for total budget vs realizado.
- Per-category rows: colored bar (chart palette), realizado, orçado, %.
- Over-budget: % text turns red; no red bar, no red badges. Surplus shown as a small positive chip.
- Responsive: desktop 5-column table; mobile CSS Grid template areas (row 1: `[● name] [realizado]`; row 2: full-width bar; row 3: `[orçado] [%]`).

### PR-U7 — Patrimônio

- Hero number with assets/liabilities split.
- Native SVG area chart for net-worth evolution (no Recharts dependency for this chart).
- Per-account breakdown retains current tabular form, restyled.

### PR-U8 — Transações

- Token + typography polish only. Keep existing filters and table structure.
- Ensure compare mode, type chips, and month filter all match new palette.

### PR-U9 — Polish & cleanup

- Audit all `/api/*` wiring end-to-end.
- Pull-to-refresh theming.
- Mobile density pass across all tabs.
- Remove dead code: `plano`/`previsão` nav entries (routes kept for re-enablement), any Fraunces/Inter references, any `fallbackBudget` paths that are no longer exercised.
- Verify no Recharts CDN fallbacks remain outside `Patrimônio` decision.

## 6. Constraints

- **Inline styles + tokens** (per `docs/01-ESTABILIZACAO.md` §4.3).
- **No modals** — inline expansions only.
- **Real `/api/*` data** — no mock swap, no new endpoints.
- **i18n** — all user-facing strings continue to go through the existing i18n layer.
- **Single-process deploy** — FastAPI serves `frontend/dist/` unchanged.

## 7. Open questions

- Theme toggle default: follow `prefers-color-scheme` on first load? (Proposed: **yes**.)
- Sparkline data source: reuse `/api/cashflow?months=6` slices, or add a dedicated lightweight series endpoint? (Proposed: **reuse**.)
- Credit-card section: include in mobile Mês tab as-is, or collapse to "tap to view" affordance to avoid long scroll? (Proposed: **collapsed by default on mobile**.)

Decide before starting PR-U2 / PR-U3.

## 8. Definition of done (Fase U)

- All 9 PRs merged.
- Fase U section in `CLAUDE.md` marked complete; Fase 1 becomes active.
- All 7 in-scope tabs render cleanly in dark and light mode on desktop and mobile.
- No references to Fraunces, Inter, warm-brown hexes, or Tweaks-panel scaffolding in `frontend/src/`.
- Reviewer subagent has approved each PR before merge.
