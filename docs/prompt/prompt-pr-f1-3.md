
  Crie a aba Mês redesenhada (PR-F1-3) seguindo o craft per a especificação Step 0 já aprovada.

  ## Contexto

  Projeto: finance-hledger (CLAUDE.md na raiz). Fase ATIVA: Fase 1 — Monthly view dashboard.

  PR-F1-1 (`/api/month-summary`) e PR-F1-2 (`/api/credit-cards`) já estão em main. O Step 0 do PR-F1-3 (impeccable shape brief) também. Este é o
  **craft** do PR-F1-3 — rebuild destrutivo da aba Mês para a hierarquia de quatro cards de PRD-08.

  ## Inputs autoritativos (leia em ordem)

  1. `CLAUDE.md` — convenções globais, fases, ADRs, subagents.
  2. `PRODUCT.md` — voz, anti-references.
  3. `DESIGN.md` — design system: §3 Hierarchy, §4 Tonal-Depth + 1px Border + Two-Mode Equality + Honest Color, §5 Cards/KPI, §6 Don'ts.
  4. `docs/08-PRD-visao-mensal-dashboard.md` — IA da aba Mês, mutual-exclusion, copy.
  5. `docs/07-PRD-dashboard-cartao-credito.md` — adições 1–4 do Cartões row.
  6. `docs/plans/PR-F1-3-mes-tab-rebuild.md` — **plano autoritativo do PR**. Inventário de delete/reuse/leave-in-tree, contratos por componente,
  Tonal-Depth estrutural, motion spec, i18n keys, acceptance criteria.
  7. `docs/plans/PR-F1-3-impeccable-shape.md` — brief Step 0 com as 5 open questions RESOLVED (h2, accept "1 active installments", absolute time,
  "—" fallback, unicode minus).
  8. `docs/plans/PR-F1-review-followup.md` §(b) e §(d) — Tonal-Depth mapping e Step 0 checklist.
  9. `.claude/agents/frontend-dev.md` — preâmbulo do agente frontend-dev (siga as regras: no modals, inline + tokens, English source para i18n, no
  `V2`/`New`/`Old` suffixes, no mixed-language naming).

  ## Contratos backend já em main
  - `GET /api/month-summary?month=YYYY-MM` retorna `MonthSummary`: `month`, `income`, `expense`, `expense_via_assets`, `expense_via_credit_card`,
  `credit_card_payment`, `credit_card_debt_today`, `debt_start_of_month`, `debt_end_of_month`, `leftover` (signed), `last_updated` (ISO-8601 ou
  string vazia).
  - `GET /api/credit-cards?month=YYYY-MM` retorna `CreditCardsResponse`: `month`, `cards: [{account, name, outstanding_debt, spend_this_month,
  live_installments}]`, `last_updated`. Cards dormentes já filtrados; ordem `outstanding_debt desc, name asc`.

  Use `useApi` hook existente (`frontend/src/api.js`) — segue o padrão `${VITE_API_URL}${path}` que outros hooks já usam.

  ## Naming convention (CRÍTICO — CLAUDE.md + frontend-dev preamble)

  Nomes em **PT** (matches existing `mes/` folder + i18n keys `mes.creditCards.*`). UI primitives genéricas em EN.

  - `Mes.jsx` (rewrite in place)
  - `sections/SobraAncora.jsx` (anchor)
  - `sections/Receita.jsx`
  - `sections/Despesa.jsx`
  - `sections/Cartoes.jsx`
  - `sections/Rodape.jsx` (footer)
  - `components/ExpandableCard.jsx` (genérico EN — rename + adapt do KpiExpander.jsx)
  - `hooks/useResumoMes.js`
  - `hooks/useCartoesMes.js`

  NÃO use `IncomeRow`, `ExpenseRow`, `CartoesRow`, `LeftoverAnchor`, `useMonthSummary`, `useCreditCardsV2`. NÃO crie sufixos `V2`/`New`.

  ## Inventário de arquivos (do plan §File structure)

  **delete**: `sections/{KpiSection,ReceitaExpanded,DespesaExpanded,SaldoExpanded,CreditCardSection}.jsx`, `components/CreditCardExpanded.jsx`,
  `hooks/useCreditCards.js`. Teste arquivos correspondentes (se houver) também deletados.

  **rename + adapt**: `components/KpiExpander.jsx` → `components/ExpandableCard.jsx`. API muda de `(id, expandedId, onToggle)` para `(open,
  onToggle)`. Adicione focus-visible outline usando `border.focus`.

  **reuse as-is** (importe; remova só o outer `<div className="card">` framing onde aplicável):
  - `sections/CategoriasSection.jsx` + `sections/CategoriaDrilldown.jsx` (renderizam dentro da expansão de Despesa)
  - `hooks/useReceitas.js`
  - `lib/groupReceitas.js`

  **leave in tree, NÃO importe daqui**: `sections/MaioresGastosSection.jsx`,
  `components/{CreditCardRow,CreditCardDormantRow,CreditCardCategoryBar,TransacaoRow}.jsx`, `hooks/useSparklines.js`. PRs futuros (drill-down do
  cartão, tela completa de despesas) consumirão.

  **new**: as 5 sections + 2 hooks + 3 testes listados acima.

  ## Tonal-Depth (estrutural — não defere para PR-F1-4)

  - Outer card (collapsed AND expanded): `bg.card` + `1px solid border.default` + 4px radius + `card-padding` (24px). Mesma forma sempre.
  - Expansion body (dentro do mesmo card): `bg.cardAlt` + NO border + `inner` padding (20px). Separator `1px solid border.subtle` do header da row.
  - Anchor surface = idêntica aos 3 subordinados. Diferenciação apenas por type-scale (Display-Emphasis 38px vs Display 30px) + cor (accent.primary
   se leftover ≥ 0 senão feedback.negative — só no número).
  - Page: `bg.page`. Sem nested cards. Sem `box-shadow`. Sem `border-left > 1px`. Sem `#000`/`#fff`. Sem hex literals. Sem modal.

  ## Mutual-exclusion state machine (PRD-08 §5.1)

  ```js
  const [anchorOpen, setAnchorOpen] = useState(true);
  const [openSet, setOpenSet] = useState(new Set());

  - Default: anchor aberto, três fechados.
  - Abrir qualquer de receita/despesa/cartoes → força anchor fechar.
  - Os três coexistem abertos livremente.
  - Fechar todos os três: anchor NÃO reabre automaticamente.
  - Click no anchor fechado → reabre sem fechar os subordinados.

  i18n (EN source, pt-BR translation)

  Adicione TODAS as chaves listadas na tabela §i18n do plan PR-F1-3 a ambos frontend/src/i18n/en.js e frontend/src/i18n/pt-BR.js. Inclui
  mes.row.*.empty strings.

  Click handlers (Open Q4 resolvido)

  - Click em barra de categoria-pai dentro de Despesa → useNav.goToTransactions(category.segmento_raw).
  - CTA "Ver todas as categorias e maiores gastos" → useNav.goToTransactions(null).
  - Click em row de cartão → no-op + tooltip "Em breve".
  - Click em row de receita → no-op (não rotear ?type=income — phantom requirement).

  NÃO use URL query params. Transacoes não os aceita; cross-tab handoff é via useNav em memória.

  5 resolutions do brief

  15.1 — Eyebrows dos 4 cards renderizam como <h2>.
  15.2 — "1 active installments" awkwardness EN aceito por ora.
  15.3 — Footer last-updated ABSOLUTO ("Last updated: Apr 25, 2026 9:14am" / "Última atualização: 25/04/2026 09:14").
  15.4 — last_updated null/empty → render com — fallback.
  15.5 — Sinal negativo unicode minus (U+2212). formatBRL/Intl.NumberFormat já produz por default em pt-BR.

  Motion

  - max-height 0 → measured-height com transition: max-height 240ms cubic-bezier(0.16, 1, 0.3, 1).
  - Chevron 180deg em 200ms mesma curva.
  - Anchor auto-collapse concorrente com expansão da row, mesma duração. Sem fade.
  - Tudo suprimido sob @media (prefers-reduced-motion: reduce).

  Sequência impeccable (este é o craft round)

  Você já está no Step 0 aprovado. Execute:
  1. $impeccable craft mes-tab-rebuild — escreva os componentes guiado pelo brief.
  2. $impeccable harden mes-tab-rebuild — verifique empty/loading/error states (··· no loading, ErrorBox, copy explícita das chaves
  mes.row.*.empty, sem celebração/emoji).
  3. $impeccable adapt mes-tab-rebuild — produza screenshots 375px e 1280px em DARK e LIGHT (4 PNGs total) anexos.
  4. $impeccable critique mes-tab-rebuild + $impeccable audit mes-tab-rebuild — heuristic + a11y/perf/responsive antes do hand-off.

  Acceptance criteria (verifique todos do plan §Acceptance criteria)

  Items chave:
  - Old files deletados, KpiExpander renomeado.
  - 4 cards na ordem Sobrou → Receita → Despesa → Cartões.
  - Default state correto, mutual-exclusion correta.
  - Tonal-Depth tokens corretos.
  - Type-scale: Display-Emphasis 38px anchor, Display 30px subordinados.
  - i18n keys EN+pt-BR. Empty states pt-BR sem celebração.
  - Rodape renderiza last_updated ABSOLUTO + — fallback quando null/empty.
  - Cartões row: "devendo R$ X · ↑/↓ R$ Y" com Honest Color + arrow shape.
  - Click handlers via useNav.goToTransactions. Card row no-op + "Em breve".
  - Motion 240ms ease-out-quint, suppressed under prefers-reduced-motion.
  - Sem backend changes.
  - useCartoesMes NÃO re-introduz client-side card-prefix filter (server canonical).
  - Vitest suite verde (existing + new).
  - 4 screenshots anexos na PR description.

  Workflow operacional

  1. Confirme que está em main com state limpo. Crie branch feat/PR-F1-3-mes-rebuild.
  2. Use o subagente frontend-dev (mode: bypassPermissions) OU rode direto — sua escolha; o frontend-dev preamble é estrito sobre
  tokens/no-modals/naming, então se rodar direto siga as mesmas regras.
  3. Rode npm run dev (proxy para :8080 — backend precisa estar up para integration). Use o dev-run skill se quiser lifecycle automático.
  4. Implemente seguindo a sequência impeccable acima.
  5. Commit incremental por step (craft / harden / adapt) ou um commit final consolidado — sua escolha.
  6. NÃO faça push. Não abra PR no GitHub.
  7. Reporte com: branch, files changed/added/deleted, screenshots paths, test results, qualquer desvio do plan justificado.

  Restrições não-negociáveis

  - Sem modal. Sem hex literal. Sem box-shadow em card. Sem border-left > 1px colored stripe. Sem nested cards. Sem #000/#fff. Sem em-dash em copy.
   Sem emoji. Sem celebração em empty state. Sem URL query params. Sem ?type=income. Sem V2/New/Old em nome de arquivo. Sem mixed-language naming.
  - Tipo de change: SOMENTE frontend. Zero modificação em backend/.
  - ADR compliance: não há ADR específico para este PR; o plan é o contrato.
