# CHANGELOG - Fase D: Dashboard 2.0

**Versão:** v1.0.0-faseD  
**Data:** Abril 2026  
**Status:** ✅ Completo e mergeado na `main`

---

## Resumo Executivo

Fase D completa a transformação do dashboard financeiro de visualizador simples para ferramenta de gestão familiar completa, seguindo os 5 princípios do modelo mental: receita primeiro, mês como unidade, categoria+princípio, metas explícitas, e dívida como projeto.

**Impacto:** +5.998 linhas de código, 201 testes backend, 5 novas abas, 4 endpoints REST.

---

## Novas Funcionalidades

### Backend

#### PR-D1: Dimensão Princípio (backend)
- **Novo módulo:** `backend/app/principles/`
  - `models.py` — Pydantic: Principle, PrincipleMapping, PrincipleBreakdown, PrincipleSummary
  - `mappings.py` — Loader de JSON com wildcard support
  - `resolver.py` — Resolução determinística (tag → exact → wildcard → default)
  - `service.py` — PrincipleService integrado com HledgerClient
  - `errors.py` — Exceções tipadas
  - `principles.default.json` — 7 princípios DSOP com regras de mapping
- **Endpoints:**
  - `GET /api/principles/summary?month=YYYY-MM` — Breakdown mensal por princípio
  - `GET /api/principles/mapping` — Export mapping para frontend
- **Testes:** 43 unitários + integração

#### PR-D2a: Endpoint Receitas
- **Endpoint:** `GET /api/revenues?month=YYYY-MM`
- **Retorno:** Lista de receitas com data, descrição, valor + total
- **Testes:** 4 testes de integração

#### PR-D3: Endpoint Yearly
- **Endpoint:** `GET /api/principles/yearly?year=YYYY`
- **Funcionalidade:** Matriz 7 princípios × 12 meses com porcentagens
- **Garantia:** Soma 100% por mês (largest-remainder rounding)
- **Testes:** 11 testes incluindo invariante crítico

#### PR-D5a: Endpoint Parcelamentos
- **Endpoint:** `GET /api/installments`
- **Funcionalidade:** Lista parcelamentos ativos do journal
- **Retorno:** nome, valor mensal, pagas/total, restante, data fim
- **Testes:** 9 testes

---

### Frontend

#### PR-D2b: Aba "Mês" Reformada
Substitui completamente a aba "Resumo" anterior.

**5 Seções verticais:**
1. **Receitas** — Lista transações + total + comparação vs mês anterior
2. **KPIs** — 3 cards: receitas, despesas, resultado (cores condicionais)
3. **Meta por Princípio** — Tabela 7 linhas com barras de progresso
4. **Despesas por Categoria** — Lista ordenada com drill-down
5. **Top 10 Transações** — Maiores gastos do mês

**Estrutura:**
```
features/mes/
├── Mes.jsx
├── sections/
│   ├── ReceitasSection.jsx
│   ├── KpiSection.jsx
│   ├── PrincipiosSection.jsx
│   ├── DespesasSection.jsx
│   └── TopTransacoesSection.jsx
├── components/
│   ├── ReceitaRow.jsx
│   ├── KpiCard.jsx
│   ├── ProgressBar.jsx
│   ├── CategoriaRow.jsx
│   └── TransacaoRow.jsx
└── hooks/
    ├── useReceitas.js
    ├── useKpiData.js
    ├── useDespesas.js
    └── useTransacoes.js
```

**i18n:** 46 chaves em pt-BR + en

---

#### PR-D4: Aba "Ano"
Visão consolidada anual com duas vistas.

**Vista 1 — Categoria × Mês:**
- Matriz categorias × 12 meses
- Ordenado por total anual
- 12 chamadas paralelas a `/api/categories`

**Vista 2 — Princípio × Mês:**
- Matriz 7 princípios × 12 meses
- Dados de `/api/principles/yearly`
- Cores por desvio da meta

**Componentes:**
- `MatrixTable.jsx` — Tabela matriz genérica
- `ViewToggle.jsx` — Alternância entre vistas
- `YearSelector.jsx` — Seletor de ano

---

#### PR-D5b: Aba "Plano"
Planejamento futuro (6-12 meses à frente).

**Vista 1 — Próximos Meses:**
- Tabela: receitas previstas, despesas recorrentes, parcelas
- Projeção de saldo acumulado
- Dados de `/api/forecast?months=6`

**Vista 2 — Decaimento de Dívida:**
- Lista de parcelamentos ativos
- Progresso (ex: 3/10 pagas)
- Total mensal de parcelas
- Valor remanescente

**Componentes:**
- `ForecastTable.jsx` — Tabela de projeção
- `ParcelamentoCard.jsx` — Card de cada dívida

---

#### PR-D6: Aba "Fluxo" Reformada
Substitui o Sankey por grafo de nós baseado em delta.

**Visual:**
- **Left side:** Ativos (banco, poupança, investimento)
- **Right side:** Passivos (cartões, empréstimos)
- **Nodes:** Nome, saldo final, delta destacado
- **Cores:** Verde (asset↑ ou liability↓), Vermelho (asset↓ ou liability↑)

**Interatividade:**
- Hover/click expande entradas, saídas e transferências
- Tabela de movimentações por conta

**KPIs:**
- Receitas totais
- Despesas totais
- Economia contábil
- Δ ativos
- Δ dívida

**Removido:** `features/fluxo/` antigo (Sankey)

---

#### PR-D7: Aba "Patrimônio"
Renomeação e evolução da antiga "Contas".

**Hero Section:**
- Patrimônio Líquido grande (ativos − passivos)
- Delta vs 12 meses atrás
- Sparkline dos últimos 12 meses

**Evolução Histórica:**
- Gráfico de linha: ativos (verde), passivos (vermelho), net (azul)
- Seletor de período: 6/12/24/36/todos meses

**Cards de Contas:**
- Ativos primeiro, depois passivos
- AccountDetail com transações

**Removido:** `features/contas/` antigo

---

## Alterações de Infraestrutura

### i18n
- **Novo:** `frontend/src/i18n/` com suporte a pt-BR e en
- **Arquivos:** `index.js`, `pt-BR.js`, `en.js`
- **Chaves:** ~150 traduções para novas features

### Navegação
- **Ordem das abas atualizada:**
  ```
  [Mês] [Ano] [Plano] [Resumo] [Fluxo] [Orçamento] [Previsão] [Patrimônio] [Transações]
  ```
- **Padrão:** "Mês" (não mais "Resumo")

### Backend
- **Novas rotas:** 4 endpoints adicionados ao `main.py`
- **Sem breaking changes:** todos os endpoints antigos mantidos

---

## Testes

### Backend: 201 testes totais

| Módulo | Testes |
|--------|--------|
| Auth | ✓ |
| Budget | ✓ |
| Cashflow | ✓ |
| Categories | ✓ |
| Health | ✓ |
| Installments (novo) | 9 |
| Logging | ✓ |
| Networth | ✓ |
| Parsers | ✓ |
| Principles Route | 14 |
| Principles Yearly (novo) | 11 |
| Revenues (novo) | 4 |
| Summary | 7 |
| Tags | ✓ |
| Tailscale Auth | ✓ |
| Top Expenses | ✓ |
| Transactions | ✓ |

### Frontend
- Build passa sem erros
- Todas as features seguem padrão de <200 linhas por arquivo
- Recharts utilizado para gráficos

---

## Performance

| Métrica | Antes | Depois | Nota |
|---------|-------|--------|------|
| Bundle size | ~450KB | 657KB | +feature load |
| Testes | 134 | 201 | +backend coverage |
| Endpoints | 15 | 19 | +25% capacidade |
| Features | 7 | 10 | +3 abas novas |

---

## Documentação

Planos de PR criados em `docs/plans/`:
- `PR-D1-principio-backend.md`
- `PR-D3-principio-yearly.md`
- `PR-D4-aba-ano.md`
- `PR-D5-aba-plano.md`
- `PR-D6-aba-fluxo.md`
- `PR-D7-aba-patrimonio.md`

---

## Pendências Conhecidas (Não-Bloqueantes)

1. **Vista 3 da Aba Ano** — Grupo×Mês (simplificação). PR-D4b opcional.
2. **Vista 3 da Aba Plano** — Metas vs projeção. PR-D5c opcional.
3. **i18n features legadas** — Resumo, Orçamento, Previsão ainda hardcoded pt-BR.
4. **Magic Import** — Placeholder na aba "Importar". Fase 1.
5. **Optimização** — `/api/principles/yearly` faz 12 calls sequenciais (aceitável para MVP).

---

## Commits da Fase D

```
781e67f [Fase D / PR-D7] feat: rename Contas to Patrimonio with hero and evolution chart
2df3221 [Fase D / PR-D6] feat: reform aba Fluxo with node graph view
96ef380 [Fase D / PR-D5b] feat: add aba Plano with forecast and debt views
659936f [Fase D / PR-D5a] feat: add /api/installments endpoint
9f5f8f7 [Fase D / PR-D4] feat: add aba Ano with Principio/Mes view
2011d29 [Fase D / PR-D3] feat: add /api/principles/yearly endpoint
b3f8770 Merge main into PR-D2b — resolve router conflicts
eeb30e2 [Fase D / PR-D2b] feat: wire Mes tab + i18n runtime
af936be [Fase D / PR-D2b] feat: TopTransacoesSection — 10 largest transactions
861da30 [Fase D / PR-D2b] feat: DespesasSection — expenses by category
b444dfe [Fase D / PR-D2b] feat: PrincipiosSection — targets by principle
f75f71c [Fase D / PR-D2b] feat: KpiSection — revenue/expense/result KPIs
0326ff9 [Fase D / PR-D2b] feat: ReceitasSection — month revenues list
a91466e [Fase D / PR-D2a] feat: add /api/revenues endpoint
47b602b [Fase D / PR-D2a] fix: simplify test_revenues.py
6dec582 [Fase D / PR-D1] docs: fix docstring drift per review
614e0e0 [Fase D / PR-D1] refactor: trim test_principles_route.py below 200 lines
ff07649 [Fase D / PR-D1] feat: expose /api/principles/{summary,mapping}
9787c63 [Fase D / PR-D1] feat: add principles module (models, resolver, mappings)
```

---

## Próximos Passos Recomendados

1. **Smoke test manual** — Verificar todas as abas no navegador
2. **Deploy homelab** — `docker compose up`
3. **Iniciar Fase 1** — Magic Import (ingestão automática de faturas)

---

*Fase D completa. Dashboard 2.0 pronto para uso.*
