# PR-D4: Aba "Ano" (frontend)

**Phase:** Fase D (Dashboard 2.0)  
**Scope:** Implementar aba Ano com 3 vistas (PRD §6)
**Depends on:** PR-D3 (/api/principles/yearly)
**Related PRD:** §6

## Contexto

Aba Ano tem 3 vistas:
1. **Vista 1 — Categoria × Mês** (default): matriz categorias × 12 meses
2. **Vista 2 — Princípio × Mês**: matriz 7 princípios × 12 meses (usa PR-D3)
3. **Vista 3 — Grupo × Mês**: versão enxuta com 10 grupos funcionais

## Endpoints

- GET /api/categories?month=YYYY-MM → para cada mês (Vista 1)
- GET /api/principles/yearly?year=YYYY → Vista 2 (novo PR-D3)
- Filtros: ano (default atual), tipo (despesa/receita/ambos)

## File Structure

frontend/src/features/ano/
├── index.jsx
├── Ano.jsx
├── views/
│   ├── CategoriaMesView.jsx      # Vista 1
│   ├── PrincipioMesView.jsx      # Vista 2
│   └── GrupoMesView.jsx          # Vista 3
├── components/
│   ├── MatrixTable.jsx           # Tabela matriz genérica
│   ├── HeatmapCell.jsx           # Célula com heatmap
│   ├── YearSelector.jsx          # Seletor de ano
│   └── ViewToggle.jsx            # Toggle entre vistas
└── hooks/
    ├── useCategoriaMes.js
    ├── usePrincipioMes.js
    └── useGrupoMes.js

## Layout

- Header: Título "Ano" + YearSelector + ViewToggle + Heatmap toggle
- Body: MatrixTable com scroll horizontal para 12 meses
- Linhas: categorias/princípios/grupos (depende da vista)
- Colunas: Jan, Fev, Mar, ..., Dez
- Totais: linha de totais por mês

## Rules

- Max 200 lines per file
- Reuse theme/tokens.js
- i18n keys: "ano.vista1.title", "ano.vista2.title", etc.
- Commit after each vista implementation
