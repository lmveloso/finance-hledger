# PR-D5: Aba "Plano" (frontend)

**Phase:** Fase D (Dashboard 2.0)
**Scope:** Implementar aba Plano — 3 vistas de planejamento (PRD §7)
**Depends on:** Orçamento via /api/budget, Previsão via /api/forecast

## Contexto

Aba Plano = futuro. 6-12 meses à frente.
Pré-requisito: recorrentes declaradas no journal (~ monthly).

## 3 Vistas

### Vista 1 — Próximos meses (default)
Tabela com colunas: 6 meses à frente (Maio, Jun, Jul, Ago, Set, Out).
Linhas:
- Receitas previstas (do ~ monthly)
- Despesas recorrentes (agrupadas)
- Parcelas (uma linha por parcelamento)
- Total previsto (receita − despesa)
- Saldo acumulado projetado

### Vista 2 — Decaimento de dívida
Lista parcelamentos ativos:
- Nome, valor parcela, parcelas pagas/total (ex: 3/10)
- Valor restante, data de fim
- Gráfico: linha descendente dívida total 24 meses

### Vista 3 — Metas vs projeção (deferred for now)
Comparar metas DSOP com projeção real.

## Endpoints

- GET /api/forecast (já existe — previsão próximos meses)
- GET /api/budget (já existe — orçamento)
- **NOVO:** GET /api/installments (parcelamentos ativos)

## Implementation

Feature: frontend/src/features/plano/

Structure:
features/plano/
├── index.jsx, Plano.jsx
├── views/
│   ├── ProximosMesesView.jsx    # Vista 1
│   └── DividaView.jsx           # Vista 2
├── components/
│   ├── ParcelamentoRow.jsx
│   ├── ProjecaoTable.jsx
│   └── DividaChart.jsx
└── hooks/
    ├── useForecast.js
    ├── useBudget.js
    └── useParcelamentos.js

## Rules

- Max 200 lines per file
- Reuse patterns from features/mes/, features/ano/
- i18n keys: "plano.proximos", "plano.divida"
- Commit after each vista
