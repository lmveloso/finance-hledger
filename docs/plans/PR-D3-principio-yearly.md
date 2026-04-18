# PR-D3: Endpoint /api/principles/yearly (backend)

**Phase:** Fase D (Dashboard 2.0)  
**Scope:** Endpoint para matriz princípio × mês da aba Ano (PRD §6.2)
**Depends on:** PR-D1 (principles module completo)
**Related ADR:** ADR-008

## Contexto

Vista 2 da aba Ano mostra uma matriz com:
- **Linhas:** 7 princípios
- **Colunas:** 12 meses do ano
- **Células:** valor R$ gasto no princípio naquele mês
- **Total:** 100% por coluna (despesas distribuídas pelos 7 princípios)

A planilha atual tem erro que dá 174% — aqui garantimos 100% por mês.

## Endpoint

### GET /api/principles/yearly?year=YYYY

**Query params:**
- `year` (opcional): ano calendário. Default: ano atual

**Response (200):**
```json
{
  "year": "2026",
  "months": ["2026-01", "2026-02", ..., "2026-12"],
  "principles": [
    {
      "principle": "custos-fixos",
      "display_key": "principle.custos-fixos",
      "target_pct": 40,
      "monthly": [
        {"month": "2026-01", "valor": 22956.44, "pct": 52},
        {"month": "2026-02", "valor": 23100.00, "pct": 51},
        ...
      ]
    },
    ...7 principles total
  ],
  "monthly_totals": [
    {"month": "2026-01", "receitas": 44147, "despesas": 44147, "pct_covered": 100}
  ]
}
```

**Regras de negócio:**
1. Para cada mês, somar despesas por princípio (usando PrincipleService)
2. pct = (valor do princípio / total despesas do mês) × 100
3. Soma dos 7 princípios deve dar 100% por mês (±0.01 tolerância)
4. uncovered vai para "default" principle
5. Receitas vem de income_statement para contexto

## Implementation

**File:** `backend/app/routes/principles.py` (adicionar endpoint)

**Changes needed:**
1. Add `GET /api/principles/yearly` to existing principles router
2. Use PrincipleService.monthly_summary() iterado 12x (um por mês)
3. Ou: novo método PrincipleService.yearly_by_principle(year)
4. Optimização: paralelizar calls se >1.5s (ADR-008 não menciona, mas é good practice)

**Acceptance Criteria:**
- [ ] Endpoint returns 200 with correct shape
- [ ] Each month sums to 100% across 7 principles (test)
- [ ] Year optional defaults to current
- [ ] Invalid year returns 422
- [ ] Auth required
- [ ] Test: compare with 12x monthly calls (sanity check)
- [ ] File size ≤200 lines (add to existing principles.py)

## Tests

- `test_yearly_returns_200`
- `test_yearly_has_12_months`
- `test_yearly_has_7_principles`
- `test_yearly_monthly_pct_sums_to_100` (key test!)
- `test_yearly_respects_year_param`
- `test_yearly_invalid_year_422`
- `test_yearly_principles_match_targets` (target_pct from mapping)

## Notes

- Reuse existing `principles.default.json` for targets
- Phase 2 of this PRD (vista com toggle "vs ano anterior") fica para PR-D4
- Frontend consumirá este endpoint para desenhar matriz 7×12
