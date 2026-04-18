# Estabilização & Plano de Confiabilidade — finance-hledger

**Versão:** 0.3 (coerente com Dashboard 2.0)
**Autor:** Claude + [você]
**Data:** Abril/2026
**Status:** Diagnóstico + plano de execução para a **Fase 0**, que precede Dashboard 2.0 e Magic Import.
**Documentos relacionados:**
- [PRD Dashboard 2.0](./PRD-dashboard-v2.md) — Fase D, subsequente
- [PRD Magic Import](./PRD-hledger-manager.md) — Fase 1, subsequente

---

## 1. Panorama

O projeto está em estado melhor do que o PRD assumiu. Deixa eu ser específico sobre **o que está bom** e **o que é dívida real**, antes de propor qualquer coisa.

### 1.1. O que está melhor do que eu esperava

- **Cobertura de testes é real e bem pensada.** 9 arquivos de teste, journal fixture com tags, cartão de crédito, transferências, periodic budget, saldo inicial. Isso é uma base sólida — não precisa "começar do zero", precisa preencher lacunas específicas.
- **Auth funciona.** Login por senha + token Bearer em memória, validação constant-time (`hmac.compare_digest`). Simples e correto para o contexto atual.
- **PWA de verdade.** Manifest, service worker, pull-to-refresh custom hook. Não é só "tem algum `manifest.json`".
- **Drill-downs inline.** `FluxoDetail` e `AccountDetail` são expansões inline com `borderTop`, não modais em overlay. Já alinhado com tua preferência estética.
- **Parser de JSON do hledger com defesa explícita.** `_extract_one_amount`, `_parse_amount_list` e `_amount` têm fallback documentado para múltiplos shapes (1.40+ até 1.52+). O CLAUDE.md inclusive sinaliza quais endpoints são frágeis (`/api/categories`, `/api/top-expenses` com `--layout=bare`).
- **Skills para hledger-mcp já foram produzidas e usadas.** `hledger-base`, `hledger-extrato`, `hledger-fatura` mostram que você já operou hledger-mcp na prática, fora do backend, via Claude Code. Isso é um ativo: o ADR-04 do PRD (`hledger_client.py` interno) ganha nuance — veja §7.

### 1.2. O que é dívida técnica real

Em ordem de severidade, não de urgência.

**Severidade alta:**

1. **`backend/main.py` com 1277 linhas.** Tudo misturado: config, auth, subprocess wrapper, parsers do shape do hledger, formatters de exibição, 15+ endpoints. Isso bloqueia o Magic Import — não dá pra adicionar `Ingest`, `Extract`, `Enrich`, `Stage`, `Handoff` num arquivo que já está nesse tamanho.
2. **`frontend/src/Dashboard.jsx` com 1833 linhas.** Resumo, Fluxo, FluxoDetail, Sankey custom, Orçamento, Previsão, Contas, AccountDetail, Transações, PullIndicator — tudo num arquivo só. Bloqueia a adição de uma aba Importar não-trivial.
3. **Parsing duplicado do shape `cbrSubreports`/`cbrDates`/`prrAmounts`.** Aparece em `/api/cashflow`, `/api/networth`, `/api/forecast`, `/api/account-balance-history`. É literalmente o mesmo loop com variações pequenas. Toda mudança de versão do hledger exige consertar em 4 lugares.
4. **`_tokens: dict[str, str]` em memória do processo.** Um restart do backend desloga todo mundo. Sem TTL, sem revogação, sem rotação. Não é bug crítico no uso familiar, mas é frágil.
5. **Zero observability.** Sem logs estruturados, sem métricas de tempo do `subprocess hledger`, sem rastreamento de erros. Quando algo der errado no Magic Import (e vai), debugar vai ser por dedução.

**Severidade média:**

6. **i18n inexistente.** Strings em PT-BR hardcoded em JSX e em respostas da API (ex: `"hledger: {stderr}"`, `"Token inválido"`). Nada impede usar hoje; vai custar trabalho real quando o EN entrar.
7. **Estilos inline em toda parte.** `style={{}}` em todos os componentes, sem CSS modules, sem tokens de tema. A paleta escura editorial está espalhada em literais (`#d4a574`, `#8a8275`, `#c97b5c`, `#8b9d7a`). Tematização e dark/light switch ficam inviáveis sem refatoração.
8. **Acoplamento `main_mod.LEDGER_FILE = journal_file` no conftest.** O teste precisa reimportar e reescrever atributo de módulo para apontar pra fixture. É sintoma de config via módulo global, não injeção.
9. **Sem linting nem formatter configurado.** `CLAUDE.md` diz "no test suite or linter is configured" (parte dos testes hoje está desatualizada; linter continua verdade). Em um projeto com 3100+ linhas de código ativo, falta barreira contra deriva.
10. **CORS aberto (`*`) por default.** Dado acesso via Tailscale está tudo bem na prática, mas é uma configuração que "esquecemos de apertar" ao invés de uma decisão consciente.

**Severidade baixa (não bloqueia nada, mas notei):**

11. **Timeout de 30s fixo** no subprocess do `hledger`. Suficiente hoje; vai ficar apertado em journals grandes ou comandos com `--forecast`.
12. **Frontend não tem nenhum error boundary.** Um erro em `Resumo` trava tudo.
13. **Endpoint `/api/budget` retorna texto bruto como fallback** com regex de parse (`_parse_budget_text`). É a parte mais frágil do backend; qualquer mudança no output text do hledger quebra.

---

## 2. Como a dívida se relaciona com Dashboard 2.0 e Magic Import

Nem toda dívida precisa ser paga antes da Fase D (Dashboard 2.0) ou Fase 1 (Magic Import). Tabela de decisão:

| # | Dívida | Bloqueia Dashboard 2.0? | Bloqueia Magic Import? | Por quê |
|---|--------|:-----------------------:|:----------------------:|---------|
| 1 | `main.py` monolítico | **Sim** | **Sim** | Ambas as fases adicionam módulos novos. Não cabe em 1277 linhas. |
| 2 | `Dashboard.jsx` monolítico | **Sim** | **Sim** | Dashboard 2.0 reestrutura abas; Magic Import adiciona aba Importar. |
| 3 | Parsing `cbrSubreports` duplicado | **Sim** | **Sim** | Dashboard 2.0 introduz aba Ano com matriz densa; Magic Import usa RAG sobre `register`. Parser unificado economiza semanas de bug hunting. |
| 4 | Tokens em memória | Não | Não | Funciona. Vale modernizar, mas depois. |
| 5 | Zero observability | Parcial | **Sim** | Dashboard 2.0 sobrevive sem; Magic Import não. |
| 6 | i18n inexistente | Não | Não | Pode entrar depois. |
| 7 | Estilos inline | **Parcialmente** | **Parcialmente** | Vale extrair tokens antes de adicionar abas novas. |
| 8 | Config global em módulo | **Sim** | **Sim** | Workers, fila SQLite, testes de integração, Dashboard 2.0 com SQLite de metas — tudo precisa de config injetável. |
| 9 | Sem linter | Não | Não | Vale colocar, não bloqueia. |
| 10 | CORS aberto | Não | Não | Cosmético. |
| 11 | Timeout 30s | Não | Não | Ajustar no `hledger_client.py` quando refatorar. |
| 12 | Sem error boundary | Não | Não | Adicionar junto com refatoração do Dashboard. |
| 13 | `_parse_budget_text` regex | Não | Não | Pode morrer na Fase D (aba Plano substitui `/api/budget` por algo mais rico). |

**Em resumo:** itens 1, 2, 3, 5, 7(parcial), 8 são **Fase 0 obrigatória** antes de qualquer nova fase. Os outros viram Fase 0.5, intercalados ou depois.

---

## 3. Refatoração do backend

### 3.1. Estrutura-alvo

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # só wiring: cria app, registra routers, middlewares
│   ├── config.py            # Settings Pydantic, carregado do env
│   ├── deps.py              # FastAPI Depends: get_settings, get_hledger_client, get_current_user
│   ├── hledger/
│   │   ├── __init__.py
│   │   ├── client.py        # HledgerClient: subprocess wrapper tipado
│   │   ├── parsers.py       # unifica cbr*, prr*, amount lists → modelos Pydantic
│   │   ├── models.py        # Transaction, Posting, Amount, PeriodReport, etc.
│   │   └── errors.py        # HledgerError, HledgerTimeout, HledgerNotFound
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── password.py      # fluxo atual (login/token)
│   │   └── tailscale.py     # middleware lendo header Tailscale-User-Login
│   ├── formatting/
│   │   ├── __init__.py
│   │   └── accounts.py      # format_category, format_account_name, display_segment
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── summary.py
│   │   ├── categories.py
│   │   ├── cashflow.py
│   │   ├── networth.py
│   │   ├── budget.py
│   │   ├── flow.py
│   │   ├── transactions.py
│   │   ├── accounts.py
│   │   ├── forecast.py
│   │   ├── alerts.py
│   │   ├── seasonality.py
│   │   └── spa.py           # catch-all + estáticos do PWA
│   └── observability/
│       ├── __init__.py
│       ├── logging.py       # structlog com request_id
│       └── metrics.py       # contadores + histogramas (Prometheus-compatível)
├── tests/
│   ├── conftest.py          # fixtures continuam
│   ├── unit/
│   │   ├── test_parsers.py      # foco no parsers isolado
│   │   └── test_formatting.py
│   ├── integration/
│   │   └── test_routes_*.py     # testes atuais, renomeados
│   └── data/
│       └── fixtures.journal     # fixture externa, não inline em conftest
├── pyproject.toml           # migra de requirements.txt + pytest.ini; adiciona ruff
├── Dockerfile
└── .env.example
```

**Princípio:** cada arquivo ≤ 200 linhas. Se passar, é sinal que o módulo tem mais de uma responsabilidade.

### 3.2. `HledgerClient` — a classe central

Esse é o módulo que o PRD chama de `hledger_client.py`. Design:

```python
# app/hledger/client.py (esqueleto, não completo)
class HledgerClient:
    def __init__(self, ledger_file: Path, binary: str = "hledger",
                 timeout: int = 30):
        self._ledger = ledger_file
        self._binary = binary
        self._timeout = timeout

    # Leitura — todos retornam modelos Pydantic, não dicts
    def version(self) -> str: ...
    def accounts(self) -> list[Account]: ...
    def balance(self, *query, begin=None, end=None,
                flat=False, historical=False, depth=None) -> BalanceReport: ...
    def register(self, *query, begin=None, end=None,
                 limit=None) -> list[Transaction]: ...
    def income_statement(self, begin=None, end=None,
                         monthly=False) -> PeriodReport: ...
    def balance_sheet(self, begin=None, end=None,
                      monthly=False, historical=False) -> PeriodReport: ...
    def print_tx(self, *query, begin=None, end=None) -> list[Transaction]: ...
    def budget(self, begin, end) -> BudgetReport: ...

    # Escrita (Fase 1 / Magic Import) — ainda não implementa
    def add_transaction(self, tx: Transaction,
                        dry_run: bool = False) -> AddResult: ...
    def check(self) -> CheckResult: ...

    # Infra
    def _run(self, *args, text_output=False) -> dict | list | str: ...
```

Pontos importantes:
- Cada método sabe que flags passar. Os routes não conhecem mais `-O json`, `-b`, `-e`, `--layout=bare`.
- Retornos são modelos Pydantic. Os routes fazem `report.total()` ou `tx.postings`, não `data.get("cbrSubreports", [{}])[0].get("prTotals", {}).get("prrAmounts", [])`.
- `_run` é um único ponto de invocação subprocess — onde entra timeout, logging estruturado, métrica de latência, tratamento de erro.

### 3.3. Parsing unificado

Os 4 endpoints que iteram `cbrSubreports` viram uma função:

```python
# app/hledger/parsers.py
def parse_period_report(raw: dict) -> PeriodReport:
    """Transforma o shape { cbrDates, cbrSubreports[{prTotals, prRows}] }
    em um modelo com séries mensais por sub-report."""
```

E os routes de cashflow/networth/forecast/balance-history viram cada um uma dúzia de linhas em cima do modelo. O parse difícil deixa de estar espalhado.

### 3.4. Config via Pydantic Settings

```python
# app/config.py
class Settings(BaseSettings):
    ledger_file: Path
    hledger_path: str = "hledger"
    cors_origins: list[str] = ["*"]
    auth_mode: Literal["password", "tailscale", "none"] = "none"
    password_users: dict[str, SecretStr] = {}  # username -> password
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_nested_delimiter="__")
```

E `get_settings()` vira Dependable. No teste, você sobrescreve com `app.dependency_overrides[get_settings]` — sem reimportar módulos.

### 3.5. Migração — sem big-bang

A refatoração pode ser feita em PRs pequenos, nessa ordem:

1. **PR-1:** Criar `app/config.py` e `app/deps.py`. `main.py` passa a chamar `get_settings()`. Zero mudança de comportamento.
2. **PR-2:** Extrair `HledgerClient` — primeiro como wrapper fino sobre o `hledger()` atual. Routes continuam usando a função, mas passam pela classe.
3. **PR-3:** Criar `app/hledger/parsers.py` e `models.py`. Migrar `/api/cashflow` pra usar `parse_period_report`. Testes passam, nada visível muda.
4. **PR-4:** Migrar `/api/networth`, `/api/forecast`, `/api/account-balance-history` pro parser unificado. Deleta 200+ linhas duplicadas.
5. **PR-5:** Criar `app/routes/` e mover endpoints um a um (3-4 por PR). `main.py` encolhe pra ~50 linhas de wiring.
6. **PR-6:** Mover auth pra `app/auth/password.py`. Preparar terreno para adicionar `tailscale.py`.
7. **PR-7:** `observability/logging.py` com structlog, `request_id` por requisição, timing de cada chamada ao hledger.

Cada PR deve: (a) manter os testes atuais passando sem mudança, (b) adicionar pelo menos 1 teste novo do módulo extraído.

---

## 4. Refatoração do frontend

### 4.1. Estrutura-alvo

```
frontend/src/
├── main.jsx
├── App.jsx                  # roteamento top-level + auth guard (hoje é o "Dashboard")
├── api/
│   ├── client.js            # hoje é o api.js, virando um pouco mais rico
│   ├── hooks.js             # useApi, useSummary, useCategories, etc.
│   └── types.js             # JSDoc typedefs (alternativa ao TS)
├── theme/
│   ├── tokens.js            # cores, spacing, tipografia como constantes
│   ├── global.css           # reset, fonts
│   └── helpers.js           # styled vs inline (ver §4.3)
├── i18n/
│   ├── index.js             # resolve idioma + t()
│   ├── pt-BR.js
│   └── en.js
├── components/
│   ├── KPI.jsx
│   ├── Spinner.jsx
│   ├── ErrorBox.jsx
│   ├── DeltaBadge.jsx
│   ├── MonthPicker.jsx
│   ├── TipoChip.jsx
│   ├── InlineDetail.jsx     # wrapper reutilizável pro padrão FluxoDetail/AccountDetail
│   └── SettingsInline.jsx   # ver §5
├── features/
│   ├── resumo/
│   │   ├── Resumo.jsx
│   │   └── index.js
│   ├── fluxo/
│   │   ├── Fluxo.jsx
│   │   ├── FluxoDetail.jsx
│   │   ├── Sankey.jsx       # SankeyNode + buildSankey
│   │   └── index.js
│   ├── orcamento/
│   │   ├── Orcamento.jsx
│   │   ├── BudgetBar.jsx
│   │   └── index.js
│   ├── previsao/
│   ├── contas/
│   │   ├── Contas.jsx
│   │   ├── AccountDetail.jsx
│   │   ├── AccountCard.jsx
│   │   └── index.js
│   ├── transacoes/
│   └── login/
│       └── Login.jsx
├── contexts/
│   ├── MonthContext.jsx
│   ├── NavContext.jsx
│   └── I18nContext.jsx
└── hooks/
    └── usePullToRefresh.js
```

**Princípio:** cada aba é uma pasta em `features/`, cada componente tem seu próprio arquivo (≤ 300 linhas). `App.jsx` é só navegação + contextos + guards.

### 4.2. Sem reescrever — mover e fatiar

Não é pra reescrever lógica. É pra **recortar** o arquivo atual. Plano por PR:

1. **PR-F1:** Criar `theme/tokens.js` com a paleta atual como constantes. Importar nos lugares, mas manter inline styles. Zero mudança visual.
2. **PR-F2:** Extrair componentes "puros" (`KPI`, `Spinner`, `ErrorBox`, `DeltaBadge`, `TipoChip`) para `components/`.
3. **PR-F3:** Mover `MonthContext` + `MonthPicker` para `contexts/` e `components/`.
4. **PR-F4:** Extrair `features/resumo/`. `Dashboard.jsx` importa de lá.
5. **PR-F5:** Extrair `features/fluxo/` (incluindo Sankey custom).
6. **PR-F6:** Extrair `features/orcamento/`, `features/previsao/`.
7. **PR-F7:** Extrair `features/contas/` (incluindo `AccountDetail`).
8. **PR-F8:** Extrair `features/transacoes/`.
9. **PR-F9:** Renomear `Dashboard.jsx` → `App.jsx`, limpar. Deve sobrar ~150 linhas.

Feito isso, o monolito morreu, e cada futura adição (aba Importar) nasce no lugar certo.

### 4.3. Sobre estilos: decidir a estratégia antes de PR-F1

Três opções realistas:

| Opção | Pros | Contras |
|-------|------|---------|
| **CSS Modules** (`Resumo.module.css`) | Nativo no Vite, zero runtime, seletores isolados | Muda muito código; precisa reescrever todos `style={{}}` |
| **vanilla-extract** ou **PandaCSS** | Tokens tipados, zero-runtime, ótima DX | Adiciona toolchain |
| **Manter inline + tokens** (mais pragmático) | Mínima mudança; só substitui literais `"#d4a574"` por `tokens.accent.warm` | Continua verboso; dark/light ainda precisa prop drilling |

Minha recomendação: **começar por "inline + tokens"** no PR-F1 (mudança barata, ganho imediato de consistência), e avaliar migração para CSS Modules depois do PR-F9, quando a estrutura de arquivos já estiver certa. Não tomar decisão grande de CSS com o monolito ainda de pé.

---

## 5. Settings inline por aba (estilo Tailscale)

Você disse duas coisas sobre UX:
- Quer settings **inline, por aba**, estilo Tailscale — não uma página `/settings` separada.
- Não gosta de modais.

O padrão Tailscale que vale copiar: uma barra/seção **abaixo do título da aba**, colapsável, que mostra os settings relevantes **àquele contexto**. Ex:

- Aba **Resumo:** meta de economia mensal/anual, moeda base, quais KPIs mostrar.
- Aba **Fluxo:** se mostra transferências entre contas, cor do Sankey, agrupamento.
- Aba **Orçamento:** fallback budget do `config.js` se não tiver periodic no journal.
- Aba **Contas:** ordem (alfabética vs por saldo), ocultar contas zeradas.
- Aba **Transações:** paginação default, agrupamento por dia/mês.
- Aba **Importar** (futura, Fase 1): modelo Ollama ativo, diretório inbox, backup retention.

Design sugerido:

```
┌──────────────────────────────────────────────────────────────┐
│  RESUMO                                         ⚙ Ajustes ▼   │
├──────────────────────────────────────────────────────────────┤
│  ┌ Ajustes desta aba ────────────────────────────────────┐   │
│  │  Meta mensal     [R$ 11.000    ]                       │   │
│  │  Meta anual      [R$ 120.000   ]                       │   │
│  │  KPIs visíveis   ☑ Receitas  ☑ Despesas  ☐ Reserva    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  [conteúdo normal da aba]                                    │
└──────────────────────────────────────────────────────────────┘
```

Implementação: componente `<InlineSettings tab="resumo" />` que abre/fecha inline, com `borderTop/borderBottom` — mesmo padrão visual dos `FluxoDetail`/`AccountDetail` que já existem. Nada de overlay, nada de portal.

**Settings globais** (idioma, tema, identidade do usuário Tailscale, logout) ficam num **menu de perfil inline no header**, também expansível, ao lado do `MonthPicker`. Não em modal.

Vale fazer isso **antes do Magic Import** ou **junto**? **Junto.** O PR-F1 + PR-F9 (refatoração do frontend) são pré-requisito, mas o componente `<InlineSettings>` pode nascer já como parte da aba Importar e ser retrofitado nas outras abas depois. Proponho tratar como item **Fase 0.5**: faz sentido ter antes da aba Importar ficar pronta, mas não bloqueia o início do trabalho.

---

## 6. Internacionalização (i18n)

Você disse: **inglês é idioma oficial, português é secundário, hoje só tem PT.**

Implicação importante: isso inverte a lógica. Os strings-fonte que vão no código ficam em **inglês**, e o PT-BR é uma tradução. Não é "traduzir o que já tem pra inglês" — é "retroativamente tratar os strings atuais como traduções PT-BR do eventual source em EN".

### 6.1. Estratégia mínima

Não precisa `react-i18next` nem `lingui`. Para o tamanho deste projeto:

```js
// frontend/src/i18n/index.js
const dictionaries = { 'en': enDict, 'pt-BR': ptDict };
const current = navigator.language.startsWith('pt') ? 'pt-BR' : 'en';
export const t = (key, params={}) =>
  interpolate(dictionaries[current][key] ?? key, params);
```

`t('resumo.header.subtitle', { month: 'Abril 2026' })` — se a chave não existir, o próprio key vira fallback (visível, então você vê que falta traduzir).

Para o backend, mesma ideia: um módulo `app/i18n.py` que resolve língua pelo header `Accept-Language` e aplica nas mensagens de erro expostas.

### 6.2. Decisão sobre moeda e formato

Hoje o código tem `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })` hardcoded. A moeda (BRL) **não** deve ser função do idioma — é função do journal. O idioma controla separador de milhar, nome de mês, textos de UI. **Moeda é configuração separada**, provavelmente em settings globais. Isso fica alinhado com o plano do MVP (multi-moeda simples: cada transação preserva sua moeda original; dashboard assume moeda base configurada).

### 6.3. Prioridade

**Depois da refatoração do frontend (PR-F9).** Fazer i18n no Dashboard monolítico é trabalho desperdiçado. Depois de componentes modulares, passar um arquivo por vez por um "extrator de strings" é uma tarde de trabalho por aba.

---

## 7. Observability — o mínimo que vale investir agora

Sem observability, debugar Magic Import vai ser pesadelo: LLM alucina às vezes, subprocess hledger pode falhar, git pode estar sujo, FAISS pode devolver matches ruins. Você precisa ver **o que aconteceu e em que ordem**.

### 7.1. Logging estruturado

```python
# app/observability/logging.py
import structlog
structlog.configure(processors=[
    structlog.processors.TimeStamper(fmt="iso"),
    structlog.contextvars.merge_contextvars,
    structlog.processors.dict_tracebacks,
    structlog.processors.JSONRenderer(),
])
```

Cada request ganha um `request_id` via middleware e vira contexto. Cada chamada do `HledgerClient._run` loga:

```json
{"event": "hledger.call", "request_id": "...", "args": ["balance", "expenses"],
 "duration_ms": 142, "exit_code": 0, "stdout_bytes": 8421}
```

Em caso de erro:

```json
{"event": "hledger.error", "request_id": "...", "args": [...],
 "duration_ms": 38, "exit_code": 1, "stderr": "..."}
```

### 7.2. Métricas (opcional no Fase 0, obrigatório na Fase 1)

Prometheus-compat: contador de chamadas ao hledger por comando, histograma de latência, contador de erros por tipo. `prometheus-fastapi-instrumentator` dá 80% disso com 3 linhas.

### 7.3. Frontend

Zero investimento agora além de:
- Error boundary no `App.jsx` e por feature.
- Um `console.error` estruturado quando `useApi` falha (já tem try/catch; só falta formatar).

### 7.4. Prioridade

**Junto com PR-7 do backend.** Antes do primeiro módulo de Magic Import entrar.

---

## 8. Auth Tailscale de volta

Estado atual: login por senha, token Bearer em memória do processo. Isso funciona e pode continuar existindo como fallback.

O que você quer: identificar usuário via header que o `tailscale serve` injeta, similar ao que `tailscale funnel` + headers fazem em setups típicos.

### 8.1. O header real

Quando o frontend é servido atrás de `tailscale serve --bg 8080`, o Tailscale injeta headers identificando o usuário autenticado. Os headers padrão são:

- `Tailscale-User-Login` — email/handle do usuário (ex: `lucas@exemplo.com`)
- `Tailscale-User-Name` — nome de exibição
- `Tailscale-User-Profile-Pic` — URL de foto

Esses headers **só são confiáveis** quando a requisição vem via Tailscale. Se o backend também estiver acessível direto (sem `tailscale serve` na frente), qualquer cliente pode forjar o header. Portanto:

### 8.2. Design do middleware

```python
# app/auth/tailscale.py
async def tailscale_auth(request: Request) -> User | None:
    # Só confia se veio pela interface Tailscale
    # (conferir IP da requisição vs cgnat tailscale 100.64.0.0/10)
    if not _is_tailscale_client(request.client.host):
        return None
    email = request.headers.get("Tailscale-User-Login")
    name = request.headers.get("Tailscale-User-Name")
    if not email:
        return None
    return User(identifier=email, display_name=name or email, method="tailscale")
```

O dependable `get_current_user` passa a ter uma cascata:

1. Se `Settings.auth_mode == "tailscale"`, tenta Tailscale; se falhar, 401.
2. Se `auth_mode == "password"`, tenta token; se falhar, 401.
3. Se `auth_mode == "none"`, retorna anônimo (dev).
4. Se `auth_mode == "tailscale+password"` (fallback), tenta Tailscale primeiro, depois token.

### 8.3. Decisão sobre o login-por-senha

Três opções:
- **Manter os dois modos com fallback** (recomendado). Tailscale quando disponível, senha como backup para acesso fora da tailnet (ex: notebook de viagem).
- **Matar o login-por-senha.** Simplifica tudo, mas exige que você nunca acesse fora da tailnet. Não recomendo.
- **Trocar completamente por Tailscale.** Para o uso familiar com a esposa, isso funciona bem porque ambos têm Tailscale na tailnet. Mas perde flexibilidade.

Voto em **manter os dois**, com Tailscale default quando o header chega.

### 8.4. Prioridade

**Depois do PR-6** (extração de auth em módulo). Em um PR próprio, que inclui:
- `app/auth/tailscale.py`
- Middleware de CIDR check
- `auth_mode` em Settings
- Testes que mockam os headers
- Atualização do frontend: se detecta user autenticado via Tailscale, pula a tela de login

---

## 9. Outros itens que não mereciam seção própria

### 9.1. `pyproject.toml` e `ruff`

Migrar de `requirements.txt` + `pytest.ini` para `pyproject.toml`. Adicionar `ruff check` + `ruff format` no CI/pre-commit. Trabalho de meia hora; ganho grande em consistência.

### 9.2. Error boundary no frontend

Um componente `<ErrorBoundary fallback={...}>` ao redor de cada feature em `App.jsx`. Evita que um bug no `Previsao` quebre o resto.

### 9.3. Timeout configurável

`Settings.hledger_timeout: int = 30` em vez de constante. Útil quando `--forecast` ficar grande.

### 9.4. `/api/budget` texto fallback

Vale rodar um experimento: com hledger 1.52, o JSON de `balance --budget` parece estar bem formado (o código já tem o parser). Se o caminho JSON sempre funciona na sua versão, matar `_parse_budget_text` elimina o endpoint mais frágil do backend.

### 9.5. Tokens com persistência

Em vez de `_tokens: dict` em memória, salvar em SQLite (o mesmo que vai guardar fila de batches na Fase 1). Sobrevive a restart. Adicionar TTL (ex: 30 dias) e revogação. Isso é upgrade natural depois da Fase 0.

---

## 10. Sequência proposta de execução (Fase 0)

Organizado em **ondas**, cada onda entrega valor sozinha:

### Onda 1 — Fundação (1 semana)

- PR-1: `app/config.py` + `app/deps.py`
- PR-2: `HledgerClient` como wrapper fino
- PR-3: `parsers.py` + `models.py` + migração do `/api/cashflow`
- PR-F1: `theme/tokens.js` + substituir literais

**Ganho:** config injetável, parser começou a unificar, tokens de cor centralizados. Nada visível pro usuário; base pra tudo que vem.

### Onda 2 — Modularização (1-2 semanas)

- PR-4: migração do restante dos endpoints cbr* pro parser unificado
- PR-5: extrair endpoints em `app/routes/` (3-4 por PR)
- PR-F2 a PR-F4: extrair componentes puros + contexts + `features/resumo/`
- **pyproject.toml + ruff**

**Ganho:** `main.py` ≈ 50 linhas de wiring. `Dashboard.jsx` começou a emagrecer. Linter ativo.

### Onda 3 — Frontend modular (1 semana)

- PR-F5 a PR-F8: extrair `features/fluxo/`, `features/orcamento/`, `features/previsao/`, `features/contas/`, `features/transacoes/`
- PR-F9: renomear `Dashboard.jsx` → `App.jsx`, enxugar

**Ganho:** monolito morre. Terreno preparado pra aba Importar.

### Onda 4 — Confiabilidade e volta do Tailscale (1 semana)

- PR-6: `app/auth/password.py` (extração)
- PR-7: `observability/logging.py` + middleware de request_id + métricas básicas
- PR-8: `app/auth/tailscale.py` + `auth_mode` no Settings + cascata de autenticação
- Error boundaries no frontend

**Ganho:** visibilidade operacional + identidade de usuário via Tailscale + fallback robusto.

### Onda 5 — Polimento (alguns dias, opcional antes da Fase 1)

- i18n mínimo (após frontend modular)
- `InlineSettings` base, aplicado em uma aba como prova
- Matar `_parse_budget_text` se o JSON 1.52 estiver íntegro
- Tokens com persistência (migrar `_tokens: dict` → SQLite)

**Ganho:** projeto pronto pra receber Magic Import com infraestrutura limpa.

### Tempo total

Entre 4 e 6 semanas de esforço de cauda, mais calendário se for meio-período. Pode ser feito totalmente em paralelo com o PRD sendo refinado, e nenhuma mudança aqui bloqueia ajuste posterior do PRD.

---

## 11. Decisões fechadas

As 6 questões em aberto desta versão foram resolvidas:

1. **Estratégia de CSS:** **inline + tokens**. Começar por `theme/tokens.js` com a paleta atual como constantes e substituir literais ao longo dos PRs. Avaliar migração para CSS Modules depois do PR-F9, se fizer sentido.
2. **`auth_mode` default:** **os dois** (cascata). Tailscale quando o header estiver presente; password como fallback para acesso fora da tailnet. Config `auth_mode: "tailscale+password"` vira o default de produção; `"password"` continua como opção pura.
3. **Settings inline por aba:** confirmado. `features/*/Settings.jsx` para settings locais + `components/InlineSettings.jsx` como wrapper visual reutilizável.
4. **Persistência de settings:** SQLite local (mesma base da futura fila de batches da Fase 1).
5. **Staging mobile:** **não é bloqueada**. Fluxo vertical (lista de cards empilhados) em vez de tabela densa. Mesmas ações, layout adaptado. PRD atualizado (RF-4.1, RF-4.5).
6. **Spike MCP vs `hledger_client.py`:** confirmado. Executar spike de 1 dia validando o design do `HledgerClient` Pydantic. **Nota importante do uso real do MCP no projeto:** funciona, mas agentes tendem a ignorá-lo e escrever texto direto no journal. Esse comportamento é irrelevante no Magic Import (o LLM gera JSON; quem persiste é o backend Python), mas confirma que a decisão do ADR-04 é a mais segura. O spike valida o design, não mais a escolha.

---

## 12. Como eu recomendo continuar

1. Abrir board com os 15-20 PRs da §10 como issues.
2. **Onda 0 (spike, 1 dia):** validar `HledgerClient` Pydantic em um branch isolado — 4 métodos (`version`, `balance`, `register`, `income_statement`) + modelos Pydantic + testes. Decide se o design escala antes de comprometer as 4-6 semanas.
3. **Onda 1 (1 semana):** fundação conforme §10.
4. PR-1 (`config.py` + `deps.py`) é o "hello world" da refatoração — ~1h de trabalho conjunto que valida o padrão de PR e o ritmo.

### 12.1. Sequenciamento completo do projeto

A ordem sugerida das fases maiores, em calendário:

```
Semana 1-6   [Fase 0] Estabilização (este doc)
Semana 7-14  [Fase D] Dashboard 2.0 (PRD separado)
Semana 15-20 [Fase 1] Magic Import (PRD separado)
Semana 21+   [Fase 2] Refinamentos pós-uso
```

**Não executar fases em paralelo.** Cada uma é pré-requisito da próxima:
- Fase D não tem onde morar sem Fase 0 (monolito quebrado).
- Fase 1 não sabe que princípio sugerir sem Fase D (sem mapping definido, sem UI pra override).
- Faz sentido pular Fase D? Só se aceitar que o Magic Import nasce sem a dimensão Princípio e a planilha continua em uso. Não recomendo.

### 12.2. Exceção autorizada: M2 do diagnóstico

A única mudança visível que pode ser feita **sem esperar Fase 0** é incluir a seção "Receitas" no topo da aba Resumo atual. É barata, autocontida, e a esposa do usuário sente falta todo dia. Candidata a PR isolado em qualquer momento.

---

*Fim do documento v0.3.*
