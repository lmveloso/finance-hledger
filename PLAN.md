# Plano de Implementação — finance-hledger

Fases 0 e 1. Última atualização: 2026-04-11.

---

## Resumo Executivo

| Fase | Objetivo | Tarefas | Esforço estimado |
|------|----------|---------|-----------------|
| 0 | Estabilização — corrigir endpoints quebrados e adicionar testes | 4 tarefas | ~16–22h |
| 1 | Usabilidade diária — navegação por mês, PWA, busca de transações, tags | 5 tarefas | ~24–32h |
| **Total** | | **9 tarefas** | **~40–54h** |

---

## Mapa de Dependências

```
T1 (Parser robusto) ──► T2 (Aba Fluxo)  ──► T5 (Seletor de mês)
                  └──► T3 (Aba Orçamento) ──┘
                  └──► T4 (Testes) ──────────────────────────────► T8 (Busca transações)
                                                                     │
T5 (Seletor de mês) ──► T6 (PWA)                                    │
                      ──► T7 (Pull-to-refresh)                      │
                                                                  T9 (Tags)
```

---

## Fase 0 — Estabilização

### T1 — Refatorar parser robusto do JSON do hledger

**Objetivo:** Tornar o helper `_amount()` e o wrapper `hledger()` resilientes a variações de formato entre versões e ao caso de journal vazio.

**Estado atual:**
- `_amount()` (main.py:82–99) lida com `prrAmounts`, `amount`, `tamount`, `ebalance` mas tem gaps: não trata listas vazias com segurança total, não loga quando encontra formato desconhecido, e não lida com o caso de journal sem transações (hledger pode retornar `[]` ou `{}` dependendo do comando).
- O wrapper `hledger()` (main.py:35–56) faz `json.loads()` e cai para string se falhar, mas não valida o shape retornado.

**Escopo:**
1. Enriquecer `_amount()` com:
   - Suporte a formato `[{acommodity, aquantity: {floatingPoint}}]` direto (sem wrapper de lista aninhada).
   - Suporte a valores numéricos puros (int/float) vindos de versões antigas.
   - Logging estruturado (via `logging.debug`) quando encontra formato não reconhecido — facilita diagnóstico em produção.
   - Retornar `0.0` com warning logado em vez de silenciosamente devolver zero.
2. Criar helper `_parse_amount_list(raw)` que normaliza qualquer formato de lista de amount para `[float]`.
3. Adicionar validação de schema no wrapper `hledger()` — opcional, via parâmetro `expected_type` (dict | list) que dispara warning se o tipo retornado diverge.
4. Criar `conftest.py` (ou inline) com fixtures de JSON mockados para cada formato conhecido — será reutilizado em T4.

**Arquivos:** `backend/main.py`

**Esforço estimado:** 3–4h

**Dependências:** Nenhuma (é a base para T2, T3, T4)

---

### T2 — Aba Fluxo funcional (linha de economia + referência à meta)

**Objetivo:** O endpoint `/api/cashflow` já retorna JSON estruturado (`{months: [{mes, receitas, despesas}]}`). A aba Fluxo já plota barras. Falta adicionar a linha de economia (receitas − despesas) e a ReferenceLine da meta mensal.

**Estado atual:**
- Backend: `/api/cashflow` (main.py:181–230) já parseia o `incomestatement -M` e retorna `receitas` e `despesas` por mês. **Não precisa de alteração no backend.**
- Frontend: `Fluxo()` (Dashboard.jsx:186–219) renderiza `BarChart` com receitas e despesas. Falta a série de economia.

**Escopo:**
1. No componente `Fluxo()`, calcular campo `economia = receitas - despesas` para cada mês.
2. Adicionar `Line` (Recharts) com a série de economia sobre o gráfico de barras.
3. Adicionar `ReferenceLine` horizontal na y = `CONFIG.savingsGoal.monthly` (meta mensal).
4. Adicionar legenda/badge mostrando "meta: R$ X.XXX" no cabeçalho do card.
5. Ajustar tooltip para mostrar os 3 valores (receitas, despesas, economia).

**Arquivos:** `frontend/src/Dashboard.jsx`

**Esforço estimado:** 2–3h

**Dependências:** T1 (para garantir que o parser lida com edge cases do incomestatement)

---

### T3 — Aba Orçamento visual (JSON estruturado + barras de progresso)

**Objetivo:** Transformar o `/api/budget` de texto bruto para JSON estruturado e renderizar barras de progresso "orçado vs realizado" por categoria.

**Estado atual:**
- Backend: `/api/budget` (main.py:285–291) chama `hledger balance expenses --budget -O text` e devolve `{month, raw}`. O budget já está configurado no journal com 42 categorias (`~ monthly`), total R$ 26.608/mês.
- Frontend: `Orcamento()` (Dashboard.jsx:222–236) só mostra `<pre>` com texto bruto.

**Escopo — Backend:**
1. Mudar o endpoint para usar `output_format="json"` em vez de `"text"`. O hledger `--budget` com `-O json` retorna estrutura com `ebalance` contendo orçado e realizado.
2. Se o JSON de budget não tiver o shape esperado (versão antiga do hledger), fallback para parse do texto (regex na tabela do hledger budget).
3. Estruturar resposta como:
   ```json
   {
     "month": "2026-04",
     "categorias": [
       {"nome": "Alimentação", "orcado": 2200.00, "realizado": 1850.00, "percentual": 84}
     ],
     "total": {"orcado": 26608.00, "realizado": 21500.00, "percentual": 81}
   }
   ```

**Escopo — Frontend:**
4. Substituir o `<pre>` por barras de progresso horizontais por categoria:
   - Barra de fundo = orçado (cor neutra #3a3632).
   - Barra preenchida = realizado (cor: verde se ≤ 100%, vermelho se > 100%).
   - Label: nome da categoria, R$ realizado / R$ orçado (%).
5. Ordenar por percentual decrescente (maior estouro primeiro).
6. Resumo total no topo com barra agregada.
7. Mostrar apenas categorias com orçado > 0 (filtrar ruído).

**Arquivos:** `backend/main.py`, `frontend/src/Dashboard.jsx`

**Esforço estimado:** 4–6h

**Dependências:** T1 (parser robusto para lidar com formato de budget JSON)

---

### T4 — Testes básicos (pytest)

**Objetivo:** Garantir que os endpoints não quebram em releases futuras. Testes de unidade e integração com journal fixture.

**Estado atual:** Sem testes. CLAUDE.md menciona "No test suite or linter is configured in this repo."

**Escopo:**
1. Criar `backend/tests/` com:
   - `conftest.py` — fixtures:
     - `journal_file` — journal mínimo temporário com ~5 transações, 1 periodic budget, 1 conta de ativo, 1 de passivo.
     - `client` — `TestClient` do FastAPI com `LEDGER_FILE` apontando pro fixture.
   - `test_health.py` — GET `/api/health` retorna 200, campos esperados.
   - `test_summary.py` — GET `/api/summary` retorna estrutura `{month, receitas, despesas, saldo}` com tipos corretos.
   - `test_categories.py` — GET `/api/categories` retorna lista, cada item tem `{nome, valor}`.
   - `test_cashflow.py` — GET `/api/cashflow` retorna `{months}` com itens `{mes, receitas, despesas}`.
   - `test_budget.py` — GET `/api/budget` retorna JSON estruturado (pós-T3).
   - `test_top_expenses.py` — GET `/api/top-expenses` retorna `{transacoes}` ordenado por valor.
   - `test_networth.py` — GET `/api/networth` retorna `{months}` com `{assets, liabilities, net}`.
   - `test_parsers.py` — testes unitários de `_amount()`, `month_bounds()`, `months_back_bounds()` com edge cases (dezembro, journal vazio, formatos variados).
2. Adicionar `pytest` e `httpx` ao `requirements.txt`.
3. Criar `pytest.ini` ou seção `[tool.pytest.ini_options]` em `pyproject.toml`.

**Arquivos novos:** `backend/tests/conftest.py`, `backend/tests/test_*.py`, `backend/pytest.ini`
**Arquivos editados:** `backend/requirements.txt`

**Esforço estimado:** 5–7h

**Dependências:** T1 (fixtures de parser), T3 (endpoint budget estruturado)

---

## Fase 1 — Usabilidade Diária

### T5 — Seletor de mês/período

**Objetivo:** Permitir navegar entre meses e comparar "este mês vs mesmo mês ano passado".

**Estado atual:** Todos os endpoints de mês único aceitam `?month=YYYY-MM` mas o frontend não tem seletor — fica hardcoded no mês atual (os hooks em `api.js` não passam `month`).

**Escopo:**
1. Criar componente `MonthPicker` no `Dashboard.jsx` (ou `components/MonthPicker.jsx` se separar):
   - Setas ◀ ▶ para mês anterior/próximo.
   - Botão "Hoje" para voltar ao mês atual.
   - Display: "Abril 2026" formatado em pt-BR.
2. Criar contexto/estado global de mês selecionado (`selectedMonth` no estado do `Dashboard`).
3. Passar `selectedMonth` como query param para:
   - `/api/summary?month=`
   - `/api/categories?month=`
   - `/api/budget?month=`
   - `/api/top-expenses?month=`
   - `/api/categories/{cat}?month=` (drill-down)
4. Atualizar `useApi` hook para aceitar params dinâmicos (não apenas deps estáticos).
5. Atualizar `fetchCategoryDetail` para receber e passar `month`.
6. Adicionar modo comparação: checkbox "vs mesmo mês ano passado" que faz segunda chamada com `month=YYYY-1-MM` e mostra delta (±%) ao lado dos KPIs.

**Arquivos:** `frontend/src/Dashboard.jsx`, `frontend/src/api.js`

**Esforço estimado:** 5–7h

**Dependências:** T2, T3 (para que os meses anteriores mostrem dados completos)

---

### T6 — PWA com ícone e offline shell

**Objetivo:** Instalar o dashboard na tela inicial do celular (iOS/Android).

**Estado atual:** SPA React pura, sem manifest, sem service worker.

**Escopo:**
1. Criar `frontend/public/manifest.json`:
   - `name`: "Finanças Pessoais"
   - `short_name`: "Finanças"
   - `start_url`: "/"
   - `display`: `standalone`
   - `theme_color`: `#1a1815`, `background_color`: `#1a1815`
   - `icons`: gerar ícone simples (ícone de carteira/piggy bank) em 192x192 e 512x512 PNG.
2. Criar `frontend/public/sw.js` (service worker básico):
   - Cache-first para assets estáticos (JS/CSS/ícones do build).
   - Network-first para chamadas `/api/*`.
   - Shell offline: servir `index.html` quando offline.
3. Registrar SW em `frontend/src/main.jsx`.
4. Adicionar `<link rel="manifest">` e `<meta name="theme-color">` em `frontend/index.html`.
5. Adicionar `<link rel="apple-touch-icon">` para iOS.

**Arquivos novos:** `frontend/public/manifest.json`, `frontend/public/sw.js`, `frontend/public/icon-192.png`, `frontend/public/icon-512.png`
**Arquivos editados:** `frontend/src/main.jsx`, `frontend/index.html`

**Esforço estimado:** 3–4h

**Dependências:** Nenhuma (mas T5 melhora a experiência PWA)

---

### T7 — Pull-to-refresh no mobile

**Objetivo:** Gesto de puxar para baixo recarrega os dados — gesto esperado em iOS/Android.

**Estado atual:** Sem gesture handling. Dados carregam uma vez no mount.

**Escopo:**
1. Criar hook `usePullToRefresh()` em `frontend/src/hooks/usePullToRefresh.js`:
   - Detectar `touchstart`/`touchmove`/`touchend` no container principal.
   - Se scrollTop === 0 e arrastar > threshold (60px), trigger refresh.
   - Mostrar indicador visual (spinner/ícone) durante o pull.
2. Criar função de refresh global: adicionar `refreshKey` ao estado do `Dashboard` e passar como dependência dos hooks `useApi`. Incrementar `refreshKey` no pull-to-refresh dispara re-fetch de todos os endpoints.
3. Estilizar indicador de pull: texto "Solte para atualizar..." / "Atualizando..." no topo.
4. Garantir que o gesto não conflita com scroll normal (só ativa quando scrollTop === 0).

**Arquivos novos:** `frontend/src/hooks/usePullToRefresh.js`
**Arquivos editados:** `frontend/src/Dashboard.jsx`, `frontend/src/api.js`

**Esforço estimado:** 3–4h

**Dependências:** T5 (seletor de mês, para que o refresh respeite o mês selecionado)

---

### T8 — Busca e filtro de transações

**Objetivo:** Nova aba/modal "Transações" com lista paginada, filtro por conta/categoria/descrição. Útil pra perguntas como "quanto gastamos em farmácia esse trimestre?".

**Estado atual:** `/api/top-expenses` retorna top N transações mas não tem busca nem paginação. Não existe endpoint de listagem completa.

**Escopo — Backend:**
1. Criar endpoint `GET /api/transactions` com query params:
   - `month` (YYYY-MM) — obrigatório, para mês único.
   - `start` / `end` (ISO date) — alternativa para ranges arbitrários (ex: trimestre).
   - `category` — filtro por categoria (ex: "Saúde").
   - `search` — busca full-text na descrição (case-insensitive).
   - `limit` (default 50) e `offset` (default 0) para paginação.
   - `sort` — campo de ordenação (date, amount), `order` (asc/desc).
2. Usar `hledger register` com filtros apropriados. Se `search` for passado, adicionar `desc:TERM` ao comando hledger.
3. Retornar:
   ```json
   {
     "total": 234,
     "limit": 50,
     "offset": 0,
     "transactions": [
       {"data": "2026-04-05", "descricao": "Supermercado", "conta": "expenses:Alimentação", "categoria": "Alimentação", "valor": 185.50}
     ]
   }
   ```

**Escopo — Frontend:**
4. Criar componente `Transacoes()` com:
   - Campo de busca (input com debounce 300ms).
   - Filtros: dropdown de categoria, date range picker simples (mês ou start/end).
   - Tabela/lista de transações com colunas: data, descrição, categoria, valor.
   - Paginação: botões "Anterior / Próxima" com contador "1–50 de 234".
   - Ordenação por click no header (data, valor).
5. Adicionar aba "Transações" na nav do Dashboard.
6. Mostrar loading spinner durante fetch.
7. Suporte a range arbitrário: se o usuário seleciona "últimos 3 meses", usar `start`/`end` em vez de `month`.

**Arquivos novos:** (nenhum além dos existentes se manter flat)
**Arquivos editados:** `backend/main.py`, `frontend/src/Dashboard.jsx`

**Esforço estimado:** 6–8h

**Dependências:** T1 (parser robusto), T4 (testes para o novo endpoint), T5 (seletor de mês para popular o range)

---

### T9 — Tags do hledger como dimensão de filtro

**Objetivo:** Expor tags nativas do hledger (`#viagem-floripa`, `tag: pet-luna`) no frontend para filtrar transações.

**Estado atual:** Nenhuma menção a tags no backend ou frontend. O hledger suporta tags nativamente (ex: `2026-03-15 * Passagem aérea ; :viagem-floripa:`).

**Escopo — Backend:**
1. Criar endpoint `GET /api/tags` que lista todas as tags únicas do journal com contagem de transações:
   - Usar `hledger tags` (output format text, parsear linhas).
   - Retornar: `[{"tag": "viagem-floripa", "count": 12}, ...]`.
2. Estender endpoint `/api/transactions` (T8) com query param `tag`:
   - Adicionar `tag:TAG` ao comando hledger register.
   - Suportar combinação com outros filtros.
3. Estender endpoint `/api/categories` com query param `tag`:
   - Mostrar breakdown de gastos filtrado por tag.

**Escopo — Frontend:**
4. Adicionar seção "Tags" na aba Transações (T8):
   - Lista de tags clicáveis com contagem (chips/badges).
   - Click filtra a lista de transações pela tag selecionada.
   - Suporte a multi-select (AND lógico entre tags).
5. Adicionar filtro por tag na aba Resumo (opcional, se tempo permitir):
   - Dropdown de tag que filtra categorias e KPIs.

**Arquivos editados:** `backend/main.py`, `frontend/src/Dashboard.jsx`

**Esforço estimado:** 4–5h

**Dependências:** T8 (aba Transações como base para o filtro de tags)

---

## Ordem de Execução Sugerida

### Sprint 1 — Fundação (Fase 0)

| Ordem | Tarefa | Esforço | Bloqueado por |
|-------|--------|---------|---------------|
| 1 | **T1** — Parser robusto | 3–4h | — |
| 2 | **T3** — Aba Orçamento visual | 4–6h | T1 |
| 3 | **T2** — Aba Fluxo funcional | 2–3h | T1 |
| 4 | **T4** — Testes básicos | 5–7h | T1, T3 |

**Total Sprint 1:** ~14–20h

### Sprint 2 — Usabilidade (Fase 1)

| Ordem | Tarefa | Esforço | Bloqueado por |
|-------|--------|---------|---------------|
| 5 | **T5** — Seletor de mês | 5–7h | T2, T3 |
| 6 | **T6** — PWA | 3–4h | — |
| 7 | **T7** — Pull-to-refresh | 3–4h | T5 |
| 8 | **T8** — Busca transações | 6–8h | T1, T4, T5 |
| 9 | **T9** — Tags hledger | 4–5h | T8 |

**Total Sprint 2:** ~21–28h

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Formato JSON do `--budget` varia entre versões do hledger | T3 quebra em versão diferente de 1.52 | Manter fallback de parse de texto (regex). Testar com hledger 1.52+ explicitamente. |
| Journal vazio ou sem transações em algum mês | Endpoints retornam arrays vazios ou estruturas inesperadas | T1 cobre esse caso. T4 testa com journal mínimo. |
| Pull-to-refresh conflita com scroll do Recharts | UX quebrada em gráficos | Garantir que o listener só ativa quando scrollTop === 0 do container principal, não dos gráficos. |
| Service worker cacheia dados da API | Dados financeiros desatualizados | SW usa network-first para `/api/*`, cache-first só para assets estáticos. |
| `hledger tags` pode não existir em versões antigas | T9 falha silenciosamente | Verificar versão mínima suportada (1.52+). Fallback: endpoint retorna lista vazia se comando falhar. |

---

## Estrutura de Arquivos Após Implementação

```
finance-hledger/
├── backend/
│   ├── main.py                    (editado: T1, T3, T8, T9)
│   ├── requirements.txt           (editado: +pytest, +httpx)
│   ├── pytest.ini                 (novo: T4)
│   └── tests/
│       ├── conftest.py            (novo: T4)
│       ├── test_health.py         (novo: T4)
│       ├── test_summary.py        (novo: T4)
│       ├── test_categories.py     (novo: T4)
│       ├── test_cashflow.py       (novo: T4)
│       ├── test_budget.py         (novo: T4)
│       ├── test_top_expenses.py   (novo: T4)
│       ├── test_networth.py       (novo: T4)
│       └── test_parsers.py        (novo: T4)
├── frontend/
│   ├── public/
│   │   ├── manifest.json          (novo: T6)
│   │   ├── sw.js                  (novo: T6)
│   │   ├── icon-192.png           (novo: T6)
│   │   └── icon-512.png           (novo: T6)
│   ├── src/
│   │   ├── main.jsx               (editado: T6, registro SW)
│   │   ├── Dashboard.jsx          (editado: T2, T3, T5, T7, T8, T9)
│   │   ├── api.js                 (editado: T5, T7)
│   │   ├── config.js              (sem mudanças)
│   │   └── hooks/
│   │       └── usePullToRefresh.js (novo: T7)
│   └── index.html                 (editado: T6, manifest link)
└── PLAN.md                        (este arquivo)
```

---

## Critérios de Aceite por Tarefa

**T1:** Todos os endpoints retornam JSON válido mesmo com journal vazio. `_amount()` loga warning para formatos desconhecidos em vez de retornar 0 silenciosamente.

**T2:** Aba Fluxo mostra barras de receitas/despesas + linha de economia + linha horizontal da meta mensal. Tooltip mostra 3 valores.

**T3:** Endpoint `/api/budget` retorna JSON com `{categorias: [{nome, orcado, realizado, percentual}]}`. Frontend mostra barras de progresso. Categorias com estouro (>100%) ficam destacadas em vermelho.

**T4:** `pytest` passa 100%. Todos os endpoints têm pelo menos 1 teste de sucesso e 1 teste de edge case. CI-ready (pode rodar com `pytest` puro).

**T5:** Seletor de mês permite navegar ±12 meses. Header mostra "Mês Ano" em pt-BR. Todos os cards/gráficos atualizam ao mudar mês. Modo comparação mostra delta % nos KPIs.

**T6:** PWA instalável no Chrome mobile e Safari. Ícone aparece na tela inicial. Offline mostra shell com mensagem "Sem conexão".

**T7:** Puxar para baixo no topo da página mostra indicador e refaz todos os fetches. Não conflita com scroll de gráficos.

**T8:** Aba Transações com busca por texto, filtro por categoria, paginação. Responde a "quanto em farmácia esse trimestre?" em < 2 cliques.

**T9:** Tags listadas como chips clicáveis. Filtrar por tag mostra transações e categorias filtradas. Multi-select funciona (AND).
