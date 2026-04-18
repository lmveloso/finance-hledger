# PR-D6: Aba "Fluxo" Reformada (frontend)

**Phase:** Fase D (Dashboard 2.0)
**Scope:** Reforma total do Sankey → grafo de nós baseado em delta
**Depends on:** /api/flow já existe

## Contexto

Substituir Sankey atual por grafo de nós com:
- Cada conta = um nó (assets, liabilities)
- Delta destacado (saldo_final − saldo_inicial)
- Cores: verde (positivo), vermelho (negativo)
- Hover/click expande entradas/saídas/transferências

## Endpoint

- GET /api/flow?month=YYYY-MM — já existe

## Structure

frontend/src/features/fluxo-reformado/
├── index.jsx, Fluxo.jsx
├── views/
│   └── GrafoView.jsx           # Grafo de nós principal
├── components/
│   ├── ContaNode.jsx           # Nó individual de conta
│   ├── DeltaBadge.jsx          # Badge de delta com cor
│   ├── TransferLines.jsx       # Linhas de transferência
│   └── FlowKpiCards.jsx        # KPIs complementares
├── hooks/
│   └── useFlow.js
└── utils/
    └── layoutGraph.js          # Layout dos nós

## Features

1. **Nós de conta**: nome, saldo final, delta destacado
   - Assets: lado esquerdo
   - Liabilities: lado direito
   - Delta verde (↑ ativo, ↓ passivo) ou vermelho

2. **Hover/Click**: expande drawer
   - Lista entradas (receitas, transferências recebidas)
   - Lista saídas (despesas, transferências enviadas)
   - Mostra para onde transferiu

3. **KPIs**: receitas, despesas, economia, Δ ativos, Δ dívida

4. **Tabela**: por conta (saldo inicial, entradas, saídas, etc)

## Tab

Replace existing Fluxo tab — keep same route /fluxo

## Rules

- Max 200 lines per file
- Keep existing hooks/useApi pattern
- Commit: [Fase D / PR-D6] feat: reform aba Fluxo with node graph
