# Fase UX-Polish — PRD

Post-Fase U feedback pass. After a few days of daily use on the homelab, a set of visual and behavioural issues surfaced that need fixing before Fase 1 (Magic Import) begins. These are tracked as discrete GitHub issues rather than a staged PR plan — each can be picked up independently.

## Principles

- **No new features.** This phase fixes what Fase U shipped. New capability belongs to Fase 1 or a later phase.
- **No new endpoints** unless a bug requires one. Prefer fixing a frontend filter or a formatting helper before reaching for the backend.
- **One issue per PR.** Keeps review surface small and lets the user prioritise what lands when.
- **Visually verify before closing.** Every PR must include screenshots at desktop + mobile, dark + light. See the `frontend-dev` agent's "Visual verification" section.

## Scope — the issues

The full list lives on GitHub under the `ux-polish` label: <https://github.com/lmveloso/finance-hledger/issues?q=is%3Aissue+label%3Aux-polish>

As of the phase kickoff (2026-04-23), seven issues are open:

| # | Area | Summary |
|---|------|---------|
| [#2](https://github.com/lmveloso/finance-hledger/issues/2) | Theme | Swap Instrument Serif → Google Sans Flex everywhere |
| [#3](https://github.com/lmveloso/finance-hledger/issues/3) | Navigation | Merge Resumo + Mês into one tab with click-to-expand KPI cards |
| [#4](https://github.com/lmveloso/finance-hledger/issues/4) | Ano | Move Metas por Princípio to Ano as a month drilldown |
| [#5](https://github.com/lmveloso/finance-hledger/issues/5) | Bug | Credit-card section always renders empty — `tipo_movimento` mismatch |
| [#6](https://github.com/lmveloso/finance-hledger/issues/6) | Fluxo | Split liabilities into a separate "Passivos" section |
| [#7](https://github.com/lmveloso/finance-hledger/issues/7) | Transações | Capitalize category names (currently lowercase fallthrough) |
| [#8](https://github.com/lmveloso/finance-hledger/issues/8) | Orçamento | Desktop: one-line per-category layout (keep mobile as-is) |

## Ordering

The issues have no hard dependencies. Recommended order for minimum churn:

1. **#5 (credit card bug)** — one-line fix + test; unblocks the Cartões section inside the merged Mês tab.
2. **#7 (capitalize categorias)** — backend-only data/formatting fix; lands independently.
3. **#6 (Fluxo passivos section)** — isolated to one component.
4. **#2 (font swap)** — touches many files but is mechanical. Do before #3/#4 so the merged tab doesn't reintroduce Instrument Serif in new code.
5. **#4 (Metas → Ano drilldown)** — needed before #3 so the merged Mês tab can drop Metas without losing the data surface.
6. **#8 (Orçamento desktop)** — isolated to one feature folder.
7. **#3 (Resumo + Mês merge)** — the largest change; lands last to benefit from #2, #4, #5.

The user may re-order based on priority; this is guidance, not a dependency graph.

## Exit criteria

- All seven issues above closed (or moved out of the phase with written justification on this doc).
- `grep -rn "Instrument" frontend/` returns zero matches.
- A smoke pass on the running app (desktop + mobile, dark + light) shows no visible regressions against the pre-polish state.
- `CLAUDE.md` "Current phase" block updated to mark this phase complete and Fase 1 active.

## Out of scope

- New Plano / Previsão tabs. Both stay hidden until Fase 1 or later.
- Accessibility / ARIA audit beyond per-issue requirements.
- Performance / bundle-size work. That's [#1](https://github.com/lmveloso/finance-hledger/issues/1), tracked separately.
- Anything that requires a new ADR. If you hit that, stop and write the ADR under `docs/adr/` first.
