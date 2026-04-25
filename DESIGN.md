---
name: Finanças Pessoais
description: A quiet, honest finance dashboard on top of an hledger journal — designed for family conversations.
colors:
  # Identity — carried unchanged across modes
  indigo-anchor: "#6366f1"
  violet-signal: "#8b5cf6"

  # Dark mode neutrals
  dark-bg-page: "#0d0f1a"
  dark-bg-sidebar: "#080a14"
  dark-bg-card: "#12152a"
  dark-bg-card-alt: "#181c32"
  dark-bg-hover: "#1e2240"
  dark-bg-input: "#181c32"
  dark-border-default: "#252848"
  dark-border-subtle: "#1a1d38"
  dark-text-primary: "#e0e6ff"
  dark-text-secondary: "#8b94c4"
  dark-text-muted: "#555c88"
  dark-text-disabled: "#2e3360"
  dark-ledger-green: "#34d399"
  dark-ledger-red: "#f87171"
  dark-amber-caution: "#fbbf24"
  dark-cool-blue: "#60a5fa"
  dark-magenta-flag: "#e879f9"
  dark-violet-soft: "#a78bfa"

  # Light mode neutrals
  light-bg-page: "#f0f1ff"
  light-bg-sidebar: "#ffffff"
  light-bg-card: "#ffffff"
  light-bg-card-alt: "#f4f5ff"
  light-bg-hover: "#eaebff"
  light-bg-input: "#f4f5ff"
  light-border-default: "#dde0f5"
  light-border-subtle: "#ebebfb"
  light-text-primary: "#18193a"
  light-text-secondary: "#4a5280"
  light-text-muted: "#7880aa"
  light-text-disabled: "#b8bcd8"
  light-ledger-green: "#059669"
  light-ledger-red: "#dc2626"
  light-amber-caution: "#d97706"
  light-cool-blue: "#2563eb"
  light-magenta-flag: "#db2777"
typography:
  display:
    fontFamily: "Google Sans Flex, Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  display-emphasis:
    fontFamily: "Google Sans Flex, Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "38px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  brand:
    fontFamily: "Google Sans Flex, Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.15
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.15em"
  micro:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.18em"
rounded:
  card: "4px"
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "22px"
  chip: "3px"
spacing:
  card-padding: "24px"
  inner: "20px"
  row: "14px"
  gap-xs: "6px"
  gap-sm: "10px"
  gap-md: "14px"
  gap-lg: "20px"
components:
  card:
    backgroundColor: "{colors.dark-bg-card}"
    textColor: "{colors.dark-text-primary}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  card-light:
    backgroundColor: "{colors.light-bg-card}"
    textColor: "{colors.light-text-primary}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  kpi:
    backgroundColor: "{colors.dark-bg-card}"
    textColor: "{colors.dark-text-primary}"
    typography: "{typography.display}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.dark-text-secondary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "rgba(99,102,241,0.14)"
    textColor: "{colors.indigo-anchor}"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  chip-credit:
    backgroundColor: "rgba(52,211,153,0.12)"
    textColor: "{colors.dark-ledger-green}"
    typography: "{typography.micro}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  chip-debit:
    backgroundColor: "rgba(248,113,113,0.12)"
    textColor: "{colors.dark-ledger-red}"
    typography: "{typography.micro}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  step-button:
    backgroundColor: "transparent"
    textColor: "{colors.dark-text-secondary}"
    typography: "{typography.body-small}"
    rounded: "{rounded.xs}"
    width: "28px"
    height: "28px"
  theme-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.dark-text-muted}"
    typography: "{typography.body-small}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  primary-button:
    backgroundColor: "{colors.indigo-anchor}"
    textColor: "{colors.dark-bg-page}"
    typography: "{typography.body}"
    rounded: "8px"
    padding: "10px 16px"
---

# Design System: Finanças Pessoais

## 1. Overview

**Creative North Star: "The Quiet Ledger"**

A ledger does not flatter you. It records, in precise rows and consistent columns, what is. Finanças Pessoais is that ledger as a dashboard — quiet enough to read at 7am with coffee, honest enough to hold up under a partner's questions, sharp enough that density feels like care, not clutter.

Visually, the system is monochromatic indigo with a single saturated accent that earns its rarity. There are no gradients carrying decoration, no shadows imitating depth, no celebratory states. When a number is positive it's green; when it's negative it's red; both are stated plainly. Dark mode and light mode are equal citizens — neither is the "true" view, both must hit the same calm.

What this system explicitly rejects: consumer-finance app aesthetics (Mint, Nubank, "spending insight" emoji cards, gamified savings goals), the hero-metric SaaS template (big number + gradient accent + supporting stats grid), the warm-brown editorial palette this project deliberately retired, and crypto-fintech maximalism (neon on black, animated gradients, glassmorphism stacks).

**Key Characteristics:**
- Indigo-violet identity (`#6366f1` carries across both modes unchanged).
- Dual-mode is first-class; the app remounts on theme flip so every value is honest in either mode.
- Flat by default — depth from 1px borders and tonal layering, never shadows.
- Display type is geometric (Google Sans Flex); body is humanist sans (Plus Jakarta Sans). One pairing, no script, no serif accents.
- Ledger-precise components — chips are tight (3px radius, 10px label), KPI numbers are large but leading-tight (`letter-spacing: -0.02em`).
- Inline before modal: drilldowns expand in place; the only modal-like surface in the app is the Login form.

## 2. Colors: The Indigo Ledger Palette

A monochromatic indigo system carrying one saturated accent across two equal modes. Saturated hues are *only* allowed to mean something — accents for identity, feedback colors for credit/debit/warning/info. Neutrals do everything else.

### Primary

- **Indigo Anchor** (`#6366f1`): the identity color. Used for active nav state, focus rings, primary buttons, and the headline KPI accent. Identical in both modes — this is the one constant that says "this is the same product whether dark or light." Apply sparingly; rarity is the point.

### Secondary

- **Violet Signal** (`#8b5cf6`): differentiation only. Appears in the brand mark italic, the second chart series, and a small handful of overlays. Never co-occurs with Indigo Anchor as a peer — it's the supporting voice, not a duet.

### Tertiary

The chart palette adds five more hues for category multiplicity (`Violet Soft #a78bfa`, `Ledger Green`, `Amber Caution`, `Ledger Red`, `Cool Blue`, `Magenta Flag`). They appear *only* inside Recharts series. Outside charts, the system is two-color (Indigo Anchor + Violet Signal) plus feedback semantics.

### Neutral (Dark)

- **Deep Indigo Night** (`#0d0f1a`): page background. Indigo-tinted near-black, never `#000`.
- **Sidebar Black** (`#080a14`): one notch deeper than the page, separates rail from content without a divider.
- **Card Indigo** (`#12152a`): card surface. Sits above the page; tonal step is the depth cue.
- **Card Indigo Alt** (`#181c32`): nested or expanded surface (drilldowns, secondary panels).
- **Hover Glow** (`#1e2240`): row hover.
- **Border Indigo** (`#252848`) / **Border Indigo Subtle** (`#1a1d38`): 1px borders. Default for cards and dividers; subtle for internal partitions.
- **Text Primary** (`#e0e6ff`), **Text Secondary** (`#8b94c4`), **Text Muted** (`#555c88`), **Text Disabled** (`#2e3360`): four-step text scale; muted is the default for labels and meta.

### Neutral (Light)

- **Indigo Mist** (`#f0f1ff`): page background. Faintly indigo-tinted off-white — never `#fff`.
- **Paper White** (`#ffffff`): card and sidebar surface; the one place the system goes pure white.
- **Card Mist** (`#f4f5ff`): nested surface.
- **Hover Mist** (`#eaebff`): row hover.
- **Border Mist** (`#dde0f5`) / **Border Mist Subtle** (`#ebebfb`): 1px borders.
- Text scale mirrors dark, descending from `#18193a` → `#b8bcd8`.

### Feedback

- **Ledger Green** (dark `#34d399` / light `#059669`): credit, on-budget, positive delta.
- **Ledger Red** (dark `#f87171` / light `#dc2626`): debit, over-budget, negative delta.
- **Amber Caution** (dark `#fbbf24` / light `#d97706`): warning state, threshold approaching.
- **Cool Blue** (dark `#60a5fa` / light `#2563eb`): informational, transferences.

### Named Rules

**The One Voice Rule.** Indigo Anchor and Violet Signal together cover ≤10% of any given screen. If everything is accented, nothing is. The fact that the active nav item glows indigo *means* something only because the other six don't.

**The Honest Color Rule.** Color carries meaning, not decoration. A number is green because it's positive, never because green looks nice. A border is colored only because the element is in a particular state. Decorative color is forbidden.

**The Two-Mode Equality Rule.** Dark and light are not "default + alternate". Every component must hit the same personality in both. If a treatment relies on dark-mode glow to feel right, it's wrong in light mode and must be reworked.

**The Tinted-Neutral Rule.** Pure black (`#000`) and pure white (`#fff`) are forbidden as backgrounds and text. Every neutral carries a faint indigo tint (chroma ≈ 0.005–0.02). The tint is what makes the system feel like one thing.

## 3. Typography

**Display Font:** Google Sans Flex (with Plus Jakarta Sans, system-ui, sans-serif fallback)
**Body Font:** Plus Jakarta Sans (with system-ui, sans-serif fallback)

**Character:** A geometric variable display paired with a humanist sans body. The display is for moments of weight (the brand mark, KPI numbers, large month labels); the body carries everything else. No serif, no script, no alternate display. The one pairing must do all the work.

### Hierarchy

- **Display** (Google Sans Flex, 600, 30px, line-height 1, letter-spacing −0.02em): KPI headline numbers. Tight tracking is doing real work — the numbers must read as one shape, not seven digits.
- **Display Emphasis** (Google Sans Flex, 600, 38px, same tracking): the single primary KPI per section, when one matters more than its peers.
- **Brand** (Google Sans Flex, 600, 20px, line-height 1.15): "Finanças" in the sidebar, with "Pessoais" as italic Violet Signal underneath. The one place italic is sanctioned.
- **Title** (Plus Jakarta Sans, 600, 13px): active nav item, section headings inside cards.
- **Body** (Plus Jakarta Sans, 400, 13px, line-height 1.5): default reading size. Deliberately not 14–16px — the dashboard is dense by design.
- **Body Small** (Plus Jakarta Sans, 400, 12px): row labels, supporting copy, the compact MonthNavigator label.
- **Label** (Plus Jakarta Sans, 500, 11px, uppercase, letter-spacing 0.15em): KPI eyebrows ("RECEITA · DESPESAS · SALDO"). The eyebrow is the one place we shout in caps, and only ever softly.
- **Micro** (Plus Jakarta Sans, 500, 10px, uppercase, letter-spacing 0.05–0.18em): TipoChips, brand subscript ("hledger · família"), version stamp.

### Named Rules

**The Two-Family Rule.** Google Sans Flex for display, Plus Jakarta Sans for everything else. No third face — no Inter, no Instrument Serif (that pairing was retired in UX-Polish #2), no monospace tabular flourishes.

**The Tight-Number Rule.** All KPI numerals use `letter-spacing: -0.02em`. Currency reads as a single shape; the family conversation lands on the figure, not the digits.

**The Quiet-Caps Rule.** Uppercase is reserved for labels and chips at 10–11px with high tracking (≥0.05em). Body copy is never uppercased; titles are never uppercased. Caps are eyebrows, not voice.

## 4. Elevation

**No shadows.** Surfaces are flat at rest. Depth is conveyed entirely by tonal step (`bg.page` → `bg.card` → `bg.cardAlt`) and 1px borders (`border.default` for primary edges, `border.subtle` for internal partitions). The only animated value in the system is row hover (`bg.hover`), which sits between page and card on the tonal scale.

This is intentional and matches the Quiet Ledger metaphor: a printed ledger has no drop-shadow, just rows on paper.

### Named Rules

**The Flat-By-Default Rule.** A box-shadow on a card, KPI, button, or chip is forbidden. If you find yourself reaching for one to make a surface "lift", reach for a tonal step instead.

**The Tonal-Depth Rule.** Three depth levels exist: `bg.page` (the room), `bg.card` (objects on the page), `bg.cardAlt` (something inside an object — a nested drilldown, an expanded panel). Going deeper than three is forbidden; nested cards are forbidden.

**The 1px Border Rule.** Every card border is `1px solid {border.default}`. Internal partitions are `1px solid {border.subtle}`. Nothing is thicker. Nothing colored.

## 5. Components

Each component leads with its character, then its specifics. Tokens above are normative — what follows is application.

### Cards

The base surface. Quiet, ledger-like, completely flat.

- **Shape:** 4px corner radius (deliberately tight — the global `.card` class). Token scale (`xs 6 / sm 10 / md 16 / lg 22`) exists for buttons and chips, not cards.
- **Surface:** `bg.card` on a `bg.page` background.
- **Border:** `1px solid {border.default}`.
- **Padding:** `24px` (`spacing.card-padding`).
- **No shadow, no inner shadow, no hover state.** A card is a container, not an affordance.
- **Nesting:** forbidden. If a card needs to hold a sub-surface, the sub-surface uses `bg.cardAlt` with no border.

### KPI

A card with a labeled number. The signature element of the dashboard.

- **Layout:** `Label` eyebrow (uppercase, 11px, with optional 12px lucide icon in the accent color), then a large `Display` number (30px, or 38px when this is the section's primary KPI), with an optional `DeltaBadge` (±N%) and an optional `Sparkline` slot below.
- **Color:** the number is `text.primary` by default. If the KPI is the section's primary (`destaque`), the number takes the accent color (`accent.primary` for receita, `feedback.positive` for credits, `feedback.negative` for debits — caller decides).
- **Loading state:** the number renders as `···` (three middots), never as `0` or a skeleton. A missing number is honest about being missing.

> **Known tension to retire over time.** Today, the destaque variant uses a 3px colored left-stripe border; the inline `ErrorBox` does the same. Going forward, **don't introduce new components with colored side-stripes** (see Don'ts). Existing call-sites are grandfathered until next refactor.

### Chips (TipoChip)

The "credit / debit / transfer / opening balance" tag on transaction rows.

- **Shape:** 3px radius, 2×6 padding. Tighter than the token scale because the chip needs to read as metadata, not affordance.
- **Typography:** Micro (10px, uppercase, 0.05em tracking).
- **Color:** background uses a 12% alpha overlay of the feedback color; text is the feedback color full-strength; border is the feedback color at ~20% alpha (`{color}33`).
- **Variants:** `credito` (Ledger Green), `debito` (Ledger Red), `transferencia` (Cool Blue), `saldo_inicial` (`text.muted` on `bg.cardAlt`).

### DeltaBadge

A small ±N% next to a KPI value when comparison mode is active.

- **Typography:** Body Small (11–12px).
- **Color:** Ledger Green for positive delta, Ledger Red for negative.
- **Hidden when:** previous value is null or zero. We don't fabricate "+∞%".

### Sparkline

A 100-unit-wide inline SVG trend, used as the slot below a KPI value.

- **Stroke:** 1.5px, color matches the KPI's accent.
- **Fill:** linear gradient from the same color at 0.28 alpha → 0 alpha (top→bottom).
- **Height:** 36px default.
- **Hidden when:** fewer than 2 data points. No "guess-rendering".

### Buttons

Three voices: outlined step buttons, ghost text buttons, and the lone primary (Login).

- **Step button** (chevrons in MonthNavigator, etc.): 28×28, 1px `border.default`, `xs` (6px) radius, transparent background, `text.secondary`. Hover bumps to `bg.hover` + `text.primary`. Used wherever there's a paired ‹ › action.
- **Theme toggle / "Hoje" pill / outlined utility:** 8–10px vertical padding, 12px horizontal, 1px `border.default`, `sm` (10px) radius, `text.muted`, lucide icon at 12–14px.
- **Primary button** (Login submit): solid `accent.primary`, text in `bg.page` (deliberately the page color, so the button reads as inverse), 8px radius, full-width inside its 320px form. The only solid-fill button in the system. Outside Login, primary actions are inline links or text buttons.

### Inputs (Login)

The system's only field today.

- **Shape:** 8px radius (deliberately rounder than cards because inputs are touch targets).
- **Surface:** `bg.cardAlt` (named `pageAlt` via legacy alias).
- **Border:** `1px solid {border.default}`.
- **Padding:** 0.6rem × 0.8rem.
- **Focus:** outline removed, no built-in focus ring today — known accessibility gap; future inputs must add `border.focus` (Indigo Anchor) on `:focus-visible`.

### Navigation

Two surfaces: the desktop sidebar and the mobile bottom bar. They share state via `NavContext`.

- **Sidebar (desktop, ≥768px):** 208px fixed-width left rail. `bg.sidebar` (one notch deeper than the page), `1px border.default` on the right edge. Sticky to viewport. Stack: brand block · NavList · MonthNavigator (sidebar variant) · ThemeToggle · version stamp. Each section separated by `1px border.subtle`.
- **NavList items:** padding 10×12, radius `sm` (10px), 13px Title type. **Active state:** 3×16 left indicator bar in Indigo Anchor + `accent.primaryMuted` background + Indigo Anchor text + 600 weight. **Inactive:** transparent + `text.secondary`. **Hover (inactive):** `bg.hover` + `text.primary`. The active-state left bar is an *indicator* (3px wide, 16px tall, rounded 2px) — not a "side-stripe border" of the parent card; it's an inline mark, allowed.
- **BottomNav (mobile, <768px):** fixed bottom strip, height 58px + safe-area inset. All 7 tabs share `flex: 1`. Active tab gets a 2px wide / 18px tall top indicator bar in Indigo Anchor + accent text + 600 weight. Tab labels are 9.5px (deliberately small to fit 7 tabs on a phone — read with the indicator color, not the text alone).
- **MonthNavigator:** sidebar variant stacks the month label (Brand type, 18px) above the prev/next chevrons + "Hoje" pill + "vs ano anterior" checkbox. Compact variant is a single `[‹] [Abr 2026] [›]` strip in the mobile top bar.

### Inline Banners (ErrorBox)

The only feedback surface — appears inline above a tab when its data fetch fails.

- **Shape:** card.
- **Visual cue today:** 3px left stripe in Violet Signal + lucide AlertCircle. Future replacement should use a full 1px border in `feedback.negative` + a tinted background, per the Side-Stripe Don't.

### Rows (`.crow`)

The list-row primitive. Used for category drilldowns, transaction lists.

- **Layout:** flex, space-between, 14px vertical padding, `1px border.subtle` bottom (last row has none).
- **Hover:** `bg.hover` background that bleeds into the card padding via negative margin (`margin: 0 -24px; padding: 14px 24px`) — the hover affordance covers the full card width without shifting content.
- **No icons by default.** Rows are dense and quiet; an icon must earn its place.

## 6. Do's and Don'ts

### Do:

- **Do** keep Indigo Anchor (`#6366f1`) and Violet Signal (`#8b5cf6`) at ≤10% of any screen. Their rarity is the point.
- **Do** convey depth through tonal step (`bg.page` → `bg.card` → `bg.cardAlt`), 1px borders, and spacing. Three layers maximum.
- **Do** tint every neutral toward indigo. `#0d0f1a` not `#000`; `#f0f1ff` not `#fff`.
- **Do** show `···` while a number is loading. A missing value is honest about being missing.
- **Do** use feedback colors only with semantic backing — Ledger Green is *credit*, Ledger Red is *debit*. If you're using green to mean "good", you're using it wrong; tie it to a number that is, in fact, positive.
- **Do** prefer inline drilldowns and expansions. Resumo's KPI cards expand in place (UX-Polish #3); follow that pattern.
- **Do** apply `letter-spacing: -0.02em` to every KPI number. Tight tracking is a feature.
- **Do** capitalize body and titles; reserve uppercase for 10–11px labels and chips with ≥0.05em tracking.
- **Do** make dark and light hit the same personality. Verify in both modes before shipping; the app's `key={mode}` remount makes this cheap to A/B.
- **Do** respect `prefers-reduced-motion`. The only animation in the system is the spinner — make sure even that is suppressible.

### Don't:

- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe on cards, KPIs, alerts, or rows. The active-nav 3×16 *indicator* is allowed because it's an inline mark; a parent-element side-stripe is not. (Existing KPI/ErrorBox stripes are grandfathered; new components must not propagate the pattern.)
- **Don't** put a box-shadow on a card, KPI, button, or chip. The system is flat. If you want elevation, step the tone.
- **Don't** use gradient text (`background-clip: text`). Emphasis comes from weight or size.
- **Don't** reach for glassmorphism (`backdrop-filter: blur`) anywhere — it's banned per the impeccable shared design laws and clashes with the Quiet Ledger voice.
- **Don't** introduce a third font family. Google Sans Flex + Plus Jakarta Sans is the pairing. Adding a serif or mono to "feel editorial" rebuilds the warm-brown era this project deliberately retired.
- **Don't** use `#000` or `#fff` anywhere. Both are rejected on principle — every neutral must carry the indigo tint.
- **Don't** build the hero-metric SaaS template (big number + tiny label + gradient accent + supporting stats grid). PRODUCT.md flags this as a banned cliché.
- **Don't** copy consumer-finance app patterns: emoji-laden "spending insight" cards, gamified savings goals, celebratory toasts when budget is met. PRODUCT.md names Mint and Nubank as anti-references; do not drift toward either.
- **Don't** copy crypto / fintech maximalism — neon on black, animated gradients, glassmorphism stacks. Wrong register entirely.
- **Don't** reach for a modal as the first thought. Modals exist only when there's a real reason: focused capture, destructive confirmation, or a flow that genuinely needs to interrupt. "Show more detail" is never a real reason — use an inline expansion. PRODUCT.md's Inline-before-modal principle is enforced here.
- **Don't** drift back toward the warm-brown editorial palette retired in Fase U. If you find Fraunces, Inter, or any `#a0784a`-style hex anywhere in `src/`, it's a regression.
- **Don't** use a shadow, gradient, or animation just because the surface "looks empty". A surface that looks empty in this system is doing its job. If empty means the data is missing, write a one-line text answer that says so plainly.
- **Don't** write celebratory copy. "🎉 You hit your savings goal!" "Great job staying on budget!" — banned. The number is the message; the user decides how to feel about it.
