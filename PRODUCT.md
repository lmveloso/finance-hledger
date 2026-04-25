# Product

## Register

product

## Users

A small family (operator + partner, occasionally extended family) reading their own finances on top of a hand-maintained `hledger` journal. The operator is a software engineer who runs the app on a homelab and accesses it via Tailscale — phone first (quick glances during the day), desktop second (longer sessions, planning, reconciliation).

The journal is the source of truth. The dashboard is a lens on it, not a system of record. Sessions split into two shapes:

- **Glance** — open the phone, check the month so far, close. Seconds, not minutes.
- **Sit-down** — desktop, weekend, looking at a year's cash flow, net worth, or budget vs actual together with a partner.

Both modes need to land without one feeling tacked on.

## Product Purpose

Give a family one calm, honest place to look at their money so they can have grown-up conversations about it.

The product exists because spreadsheets don't survive contact with daily use and consumer finance apps optimize for engagement, not honesty. This dashboard's job is to turn an `hledger` journal — already accurate, already structured — into a view that surfaces the truth without dramatizing it.

Success looks like:
- A monthly conversation between partners that starts with the dashboard and stays grounded in it.
- The dashboard never needing to be "interpreted" — what it shows is what's in the journal.
- The phone view being usable enough that checking it becomes a habit, not a chore.

## Brand Personality

**Quiet · Honest · Sharp.**

- **Quiet** — the dashboard never raises its voice. No celebratory moments, no urgency theater, no dopamine. If something matters, it's shown clearly; the user decides how to feel about it.
- **Honest** — every number traces back to the journal. The UI doesn't round emotions into the data: a bad month looks like a bad month, a good month looks like a good month. Trust is the whole product.
- **Sharp** — quiet is not soft. Typography, hierarchy, and information density are deliberate. The user is technical; the interface respects that.

The emotional target is **calm / in-control**, the state needed to have an honest conversation about family finances. Not detached — engaged but unhurried.

## Anti-references

- **Consumer finance app aesthetics** — Mint, Nubank-style dashboards, "spending insights" cards with emojis, gamified savings goals, celebratory toasts when a budget is met. None of that.
- **The hero-metric SaaS template** — big number + tiny label + gradient accent + supporting stats grid. Cliché; banned.
- **Modal-first interaction** — modals are the lazy answer for "show more". Inline expansion is the default; a modal must justify itself with a real reason (focused capture, destructive confirmation, or a flow that genuinely needs to interrupt).
- **The warm-brown editorial palette** — the pre-Fase-U look was deliberately retired. The current indigo-violet system is the committed direction; don't drift back toward "magazine" warmth.
- **Crypto / fintech maximalism** — neon on black, animated gradients, glassmorphism stacks. Wrong register entirely.

## Design Principles

1. **Honesty over flattery.** The UI must reflect the journal exactly — never round, soften, or dramatize. If a number looks wrong, the bug is in the UI, not the journal. Audit Stabilization (the most recent phase) was entirely about restoring this trust; don't re-break it.

2. **Calm before clever.** A clever visualization that demands attention loses to a plain one that rewards it. Animations, color accents, and motion all have to earn their place against the question *"would a family conversation be better without this?"*

3. **Inline before modal.** Show context where the user already is. Expansions, drilldowns, and inline editors over overlays. Modals exist but must be justified per use, not chosen by reflex.

4. **Glance and drill — both first-class.** The phone view is not a "responsive afterthought" of the desktop. A KPI tile on mobile and the same tile on a 27" monitor are different design problems; both deserve the same craft. Density adapts; honesty doesn't.

5. **Respect the operator.** The user runs this on their own homelab and writes the journal by hand. No hand-holding copy, no patronizing empty states, no tutorials, no "tips of the day". Default to assuming competence.

## Accessibility & Inclusion

- Comfortable minimum body text — never sacrifice legibility for density. The phone view is read in real-world ambient light, often one-handed; the desktop view supports longer reading sessions.
- Dual-mode (dark / light) is first-class — neither is the "true" mode. Both must hit the personality (quiet, honest, sharp) without compromise.
- Multilingual: source is English; pt-BR is the only translation today (the family's primary language). All user-facing strings go through `i18n`. Don't bake language assumptions into layout — line lengths and component widths must hold for both.
- Respect `prefers-reduced-motion`. Motion is decoration here, not affordance — users who turn it off lose nothing.
- Color is never the only carrier of meaning (positive/negative, debit/credit, on/off-budget). Pair it with shape, position, or a label.
