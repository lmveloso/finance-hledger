# PR-D1: Dimensão Princípio — backend

**Phase:** Fase D (Dashboard 2.0)
**Scope:** Introduzir a dimensão Princípio no backend — mapping categoria → princípio, resolver determinístico com override por tag, e endpoints `/api/principles/summary` (mensal) conforme ADR-008 e `docs/02-PRD-dashboard-v2.md` §4.
**Depends on:** Fase 0 completa (HledgerClient, parsers unificados, modular routes).
**Does NOT depend on:** aba Mês reformada (PR-D2) nem endpoint `/yearly` (PR-D3, separado).
**Related ADRs:** ADR-008 (princípio determinístico), ADR-004 (hledger via HledgerClient).

---

## Open questions (bloqueiam arranque limpo — resolver antes de codar)

1. **Localização do `principles.json`.** O PRD §4.2 diz `backend/app/config/principles.json`, mas hoje `backend/app/config.py` é um módulo-arquivo (não um pacote). Duas opções:
   - **(a)** Promover `config.py` a pacote `config/` (`__init__.py` + `settings.py` + `principles.json`). Maior churn, mas casa com o texto do PRD literal.
   - **(b)** Deixar `config.py` como está e colocar o JSON em `backend/app/principles/principles.default.json` (fica ao lado do módulo que o consome). Menor churn.
   - **Recomendação:** (b). O ADR-008 diz "Mapping vive em `backend/app/config/principles.json`" — é *implementation note*, não Decision. Não requer novo ADR desde que o PR registre a escolha na descrição. Se for (a), fazer a promoção em PR separado de refactor antes deste.

2. **Override persistido em SQLite (ADR-008 / PRD §4.3).** O PRD menciona que edits via Settings inline vão pra SQLite, não pro JSON (que é "default de fábrica"). **Para este PR D1, é SOMENTE LEITURA do JSON.** SQLite de override entra quando a Settings inline for construída (PR-D2 frontend + novo PR backend). Confirmar com o usuário que escrita fica fora deste PR.

3. **Princípios por posting vs por transação.** Tag `; principio: X` pode aparecer:
   - no header da transação (aplica a todos os postings),
   - num posting específico (aplica só àquele posting).
   O PRD §4.2 Regra 2 mostra exemplo **no posting**. Assumindo que a resolução é **por posting**: primeiro tag do posting, depois tag da transação, depois mapping da categoria. Confirmar.

4. **Signo do valor em `summary`.** Princípio é normalmente aplicado a despesas (categorias `expenses:*`). A meta percentual é `% da receita`. Dúvida: o total-base do cálculo de `realizado_pct` é `receitas do mês` ou `despesas totais do mês`?
   - PRD §5.3 mostra coluna "Realizado (%)" que soma 52+12+0+7+21+2 = 94% — sugere denominador = **receitas do mês**, não despesas.
   - Confirmar antes de implementar, ou expor os dois (`pct_da_receita`, `pct_do_total_despesas`).

---

## File structure

```
backend/
├── app/
│   ├── principles/
│   │   ├── __init__.py
│   │   ├── models.py              # Pydantic: Principle, PrincipleMapping, PrincipleBreakdown, PrincipleSummary
│   │   ├── mappings.py            # Load & resolve JSON mapping (pure, no I/O outside ctor)
│   │   ├── resolver.py            # resolve_principle(account, tags) -> principle_id
│   │   ├── service.py             # PrincipleService — orchestra client + resolver
│   │   ├── errors.py              # PrincipleMappingError, PrincipleFileNotFound
│   │   └── principles.default.json  # factory mapping (see Open Q1)
│   ├── routes/
│   │   └── principles.py          # APIRouter — /api/principles/*
│   ├── config.py                  # add principles_file: Path = ... with default pointing to principles.default.json
│   └── deps.py                    # add get_principle_service() dependable
└── tests/
    ├── unit/
    │   ├── test_principle_resolver.py
    │   └── test_principle_mappings.py
    └── test_principles_route.py   # integration: usa client fixture + journal com tags
```

**Rule:** cada arquivo ≤ 200 linhas (mesma regra da Fase 0).

**Settings change (`app/config.py`):**
```python
principles_file: Path = Field(
    default=Path(__file__).parent / "principles" / "principles.default.json",
    description="JSON mapping category → principle",
)
```
Env override: `PRINCIPLES_FILE=/custom/path.json`.

---

## Pydantic models (`app/principles/models.py`)

Convenções: seguir o estilo de `app/hledger/models.py` — `from_raw` classmethod onde faz sentido, `Field(default_factory=...)` para coleções, docstrings curtas.

```python
PrincipleId = Literal[
    "custos-fixos", "conforto", "metas", "prazeres",
    "liberdade-financeira", "aumentar-renda", "reserva-oportunidade",
]

class Principle(BaseModel):
    id: PrincipleId
    display_key: str          # e.g. "principle.custos-fixos" — frontend i18n resolves
    target_pct: float         # 0..100, meta padrão DSOP

class PrincipleMapping(BaseModel):
    """Loaded from principles.json."""
    rules: dict[str, PrincipleId]    # "expenses:moradia:*" -> "custos-fixos"
    default: PrincipleId
    principles: list[Principle]      # seven static principles + targets

    @classmethod
    def from_file(cls, path: Path) -> "PrincipleMapping": ...
    def resolve(self, account: str, tags: dict[str, str] | None = None) -> PrincipleId: ...

class PrincipleBreakdown(BaseModel):
    """One row of the Meta × Princípio matrix."""
    principle: PrincipleId
    valor: float              # BRL realizado no período
    meta_pct: float           # 0..100
    realizado_pct: float      # 0..100 vs denominador (ver Open Q4)
    delta_pct: float          # realizado_pct - meta_pct
    uncovered: bool = False   # true se foi pro default por falta de mapping

class PrincipleSummary(BaseModel):
    month: str                # "YYYY-MM"
    denominator: float        # o valor contra o qual % é computado (receitas do mês)
    breakdown: list[PrincipleBreakdown]
    uncovered_categories: list[str]  # categorias que caíram no default — warning pro dashboard
```

---

## Resolver — regras (`app/principles/resolver.py`)

Função pura, zero I/O. Recebe uma `PrincipleMapping` pré-carregada.

**Ordem de resolução (ADR-008 §Decision):**
1. Se `tags["principio"]` existe e é um `PrincipleId` válido → retorna.
2. Senão, procura match no `mapping.rules` pela conta (ex: `expenses:alimentação:restaurantes`):
   - **exact match** primeiro;
   - depois prefix + wildcard: `expenses:alimentação:*` vale para qualquer subconta, e **o mais específico ganha** (mais segmentos antes do `*`).
3. Se nenhum match, retorna `mapping.default` (e flag `uncovered=True` propagado pela service).

**Casos de erro:**
- Tag com valor desconhecido (ex: `; principio: xyz`) → ignora a tag e cai no mapping (comportamento defensivo); loga warning.
- Mapping vazio ou `default` não está na lista dos 7 → `PrincipleMappingError` no load, não no resolve.

**Assinatura:**
```python
def resolve_principle(
    account: str,
    tags: dict[str, str] | None,
    mapping: PrincipleMapping,
) -> tuple[PrincipleId, bool]:
    """Return (principle_id, is_default_fallback)."""
```

---

## PrincipleService (`app/principles/service.py`)

Orquestra `HledgerClient` (já existe) + `PrincipleMapping`.

```python
class PrincipleService:
    def __init__(self, client: HledgerClient, mapping: PrincipleMapping): ...

    def monthly_summary(
        self, month: str | None = None
    ) -> PrincipleSummary:
        """For month YYYY-MM (or current), compute per-principle totals.

        Internally:
        1. Calls self._client.run('print', 'expenses', '-b', begin, '-e', end)
           to get full transactions with tags (register doesn't expose ptags reliably).
        2. For each posting in each transaction:
             - extract account (paccount)
             - extract tags: merge transaction tags (ttags) + posting tags (ptags)
             - resolve principle
             - sum abs(amount) per principle
        3. Fetch revenues for the same month via income_statement for denominator.
        4. Build PrincipleBreakdown[] with target_pct from mapping.principles,
           realizado_pct = 100 * valor / denominator, delta_pct = real - target.
        """
```

**Hledger command choice:** `hledger print expenses -b X -e Y -O json` retorna as transações com `tpostings[].ptags` e `ttags` preservados. Evita `register` cujos arrays posicionais já mordem o backend (ver `/api/top-expenses`).

**Tags parsing:** verificar se o shape atual de `ptags` em hledger 1.52 vem como `[["principio","metas"], ...]` (lista de pares) ou `{"principio":"metas"}`. Implementar um helper `extract_tags(raw_posting) -> dict[str,str]` em `app/principles/mappings.py` (ou em `app/hledger/models.py` se for reutilizável — preferência). **Caso `ptags` não chegue no JSON**: fallback de parsing do `pcomment` via regex `([a-zA-Z_-]+):\s*([^;,]+)`.

**Denominator (ver Open Q4):** por padrão, soma de `receitas` vindas de `IncomeStatement.revenues` para o mesmo mês. Expor também total de despesas para debug (não na resposta pública).

---

## REST endpoints (`app/routes/principles.py`)

### GET `/api/principles/summary`

**Query:**
- `month` (opcional, `YYYY-MM`): mês alvo. Default: mês corrente (ISO).

**Response (200):**
```json
{
  "month": "2026-04",
  "denominator": 44147.00,
  "breakdown": [
    {
      "principle": "custos-fixos",
      "display_key": "principle.custos-fixos",
      "valor": 22956.44,
      "meta_pct": 40,
      "realizado_pct": 52,
      "delta_pct": 12,
      "uncovered": false
    },
    { "principle": "conforto", "...": "..." }
  ],
  "uncovered_categories": ["expenses:nova-categoria:teste"]
}
```

**Errors:**
- `503` se binário hledger ausente (propaga `HledgerNotFound` do client).
- `500` se `principles.json` malformado (lançado no startup idealmente — ver §Test strategy).
- `422` se `month` não for `YYYY-MM` válido.

**Auth:** `Depends(get_current_user)` igual aos outros routes.

### GET `/api/principles/mapping` (read-only, útil pra frontend popular Settings)

**Response (200):**
```json
{
  "rules": { "expenses:moradia:*": "custos-fixos", ... },
  "default": "custos-fixos",
  "principles": [
    { "id": "custos-fixos", "display_key": "principle.custos-fixos", "target_pct": 40 },
    ...
  ]
}
```

**Why expose now:** o frontend da aba Mês (PR-D2) precisa dos `target_pct` e `display_key` pra desenhar a seção Meta por Princípio. Mais barato expor agora do que em PR separado.

### Out of scope for this PR (explicit)

- `GET /api/principles/yearly?year=` — vai ser PR separado (PR-D3, seção 6 do PRD).
- `PUT /api/principles/mapping` / `PATCH /api/principles/targets` — Settings inline, entra com SQLite de overrides.
- Filtro por princípio em `/api/transactions` — PR-D6 (Transações + polimento).

---

## Test strategy

### Unit — `tests/unit/test_principle_mappings.py`

- `test_from_file_ok`: carrega um JSON fixture mínimo → `PrincipleMapping` com 2 regras.
- `test_from_file_missing_default`: arquivo sem campo `default` → `PrincipleMappingError`.
- `test_from_file_invalid_principle_id`: rule aponta para `"ignorado"` → `PrincipleMappingError`.
- `test_from_file_not_found`: path inexistente → `PrincipleFileNotFound`.

### Unit — `tests/unit/test_principle_resolver.py`

- `test_resolve_exact_match` — `expenses:moradia:água` → `custos-fixos`.
- `test_resolve_wildcard` — `expenses:lazer:clube` resolve via `expenses:lazer:*` → `prazeres`.
- `test_resolve_specificity_wins` — `expenses:alimentação:supermercado` (mapping explícito `custos-fixos`) bate `expenses:alimentação:*` (wildcard `prazeres`).
- `test_resolve_fallback_to_default` — conta sem mapping → `(default_id, True)`.
- `test_resolve_tag_override` — tag `principio: metas` vence mapping.
- `test_resolve_invalid_tag_ignored` — tag `principio: xyz` inválida → fallback ao mapping, warning logado.
- `test_resolve_posting_tag_beats_transaction_tag` — per Open Q3.

### Integration — `tests/test_principles_route.py`

**Fixture journal extensions (em `tests/conftest.py` ou journal separado em `tests/data/principles.journal`):**
- Adicionar 3 transações em 2026-04 cobrindo: (a) categoria mapeada (ex: `expenses:moradia:água`), (b) categoria com wildcard (`expenses:lazer:streaming`), (c) transação com tag `; principio: metas`, (d) categoria **sem** mapping (dispara `uncovered`).
- Adicionar receita `2026-04-01 * Salário / income:salário → assets:banco` para denominator não ser zero.

**Tests:**
- `test_summary_returns_200`.
- `test_summary_shape`: campos obrigatórios presentes (`month`, `denominator`, `breakdown`, `uncovered_categories`).
- `test_summary_breakdown_is_length_7` (ou ≤7 se decidirmos omitir vazios — confirmar na PR review).
- `test_summary_sum_of_realizado_matches_expenses_total`: soma dos `valor` em `breakdown` == total de despesas retornado por `/api/summary`. Garante zero "vazamento" no resolver.
- `test_summary_uncovered_surfaces`: transação em categoria não mapeada aparece em `uncovered_categories`.
- `test_summary_tag_override_shifts_value`: transação com tag `principio: metas` soma em `metas`, não em `prazeres`.
- `test_summary_empty_month`: mês sem despesas → breakdown todo em zero, denominator=0, resposta ainda 200.
- `test_mapping_endpoint_returns_seven_principles`.
- `test_summary_unauth_returns_401` (quando `auth_mode != none`).

**Factory mapping test:** adicionar um teste **boot-time sanity** (em `test_principles_route.py` ou num arquivo separado) que carrega `principles.default.json` do disco e valida que ele é parseable e tem os 7 principles — protege contra quebra do JSON em PRs futuros.

### Out of scope for tests in this PR

- Perf bench (PRD §13 menciona ≤1.5s para aba Mês; perf é mensurado na PR-D2 que integra).
- Testes de i18n (frontend).

---

## Acceptance criteria

- [ ] `backend/app/principles/` existe com `models.py`, `mappings.py`, `resolver.py`, `service.py`, `errors.py`, `principles.default.json` (escolha de localização confirmada — Open Q1).
- [ ] `principles.default.json` contém pelo menos todas as regras listadas em PRD §4.2 + os 7 principles com `target_pct`.
- [ ] `Settings.principles_file: Path` adicionado, com env override `PRINCIPLES_FILE`.
- [ ] `get_principle_service()` adicionado em `app/deps.py`, injetável via `Depends`.
- [ ] `/api/principles/summary?month=YYYY-MM` retorna `PrincipleSummary` conforme §REST.
- [ ] `/api/principles/mapping` retorna o mapping pra consumo do frontend.
- [ ] Soma de `valor` em `breakdown` == despesas totais do mês (teste automatizado, tolerância ≤ R$ 0,01).
- [ ] Categorias sem mapping aparecem em `uncovered_categories`.
- [ ] Override por tag `principio: X` desvia o valor do mapping.
- [ ] `main.py` registra o novo router. Nenhum endpoint antigo foi alterado (escopo isolado).
- [ ] Novos testes em `tests/unit/test_principle_*.py` e `tests/test_principles_route.py` passam; suite existente continua verde.
- [ ] Nenhum import novo de `subprocess` fora de `HledgerClient` (ADR-004).
- [ ] Nenhuma chamada a LLM ou heurística estatística na resolução de princípio (ADR-008).
- [ ] PR description registra a decisão sobre Open Q1, Q3, Q4 (escolhas tomadas ou deferidas).

---

## Estimated effort

**3-4 dias** de desenvolvimento ativo (1 dev sênior):
- 0.5d — scaffold + `principles.default.json` a partir do PRD.
- 0.5d — models + mappings loader + resolver puro + unit tests.
- 1.0d — `PrincipleService` + integração com `HledgerClient` + parsing de tags (a incerteza maior; depende do shape real de `ptags` em 1.52).
- 0.5d — routes + integration tests.
- 0.5-1d — fixture journal expandido, edge cases (uncovered, tag override, denominator zero), code review.

---

## Out of scope (for future PRs)

- **PR-D?** `/api/principles/yearly?year=` — matriz princípio × mês (PR-D3).
- **PR-D?** SQLite de overrides — quando Settings inline da aba Mês existir (mapping edit, target edit). Requer modelo de persistência do PR-F (Fase 0 Onda 5 já discutiu).
- **PR-D?** Endpoint `PATCH` para metas percentuais por princípio.
- **PR-D?** Integração com `/api/transactions` — filtro `?principle=metas`.
- **PR-D?** Expor princípio em cada item de `/api/top-expenses` e `/api/transactions` (enrich inline) — útil pro frontend, fora daqui.
- **PR-D?** Métrica Prometheus `principles_resolver_uncovered_total` — observability, quando o módulo `observability/metrics.py` for formalizado.
- **Fase 1:** Magic Import consome `PrincipleService.resolve_principle` pra sugerir princípio na staging. Nada a fazer aqui além de manter o resolver importável.
