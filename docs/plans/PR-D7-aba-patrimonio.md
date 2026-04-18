# PR-D7: Aba "Patrimônio" (renomeação + melhoria)

**Phase:** Fase D (Dashboard 2.0)
**Scope:** Renomear Contas → Patrimônio, adicionar Hero e evolução histórica
**Depends on:** /api/accounts e /api/networth existem

## Changes

### 1. Renomeação
- Rename features/contas/ → features/patrimonio/
- Update NavContext: "contas" → "patrimônio"
- Update App.jsx route
- Keep AccountCard pattern

### 2. Hero Section (novo)
- Patrimônio Líquido grande (ativos − passivos)
- Delta vs 12 meses atrás
- Sparkline dos últimos 12 meses

### 3. Evolução Histórica (novo)
- Gráfico de linha: ativos (verde), passivos (vermelho), net (azul grosso)
- Período configurável: 6/12/24/36/todo meses
- Toggle para mostrar/ocultar ativos/passivos isolados

### 4. Cards de Contas (mantém)
- Ativos primeiro, passivos depois
- AccountDetail continua funcionando

### 5. Settings Inline
- Select período (6/12/24/36/todo)
- Toggle hideZeroAccounts

## Endpoints
- GET /api/accounts — lista contas
- GET /api/networth?months=N — evolução histórica

## Structure
features/patrimonio/
├── index.jsx, Patrimonio.jsx
├── components/
│   ├── AccountCard.jsx         # existente (renomeado)
│   ├── AccountDetail.jsx       # existente (renomeado)
│   ├── HeroSection.jsx         # novo
│   ├── EvolutionChart.jsx      # novo
│   └── SettingsPanel.jsx       # novo
├── hooks/
│   └── useNetworth.js          # novo

## Rules
- Max 200 lines per file
- Rechart para gráfico de evolução
- Commit: [Fase D / PR-D7] feat: rename Contas to Patrimônio with hero and evolution chart
