# PRD — AI-Powered hledger Manager (Privacy First)

**Versão:** 0.2 (integrado com Dashboard 2.0)
**Autor:** Claude + [você], a partir do Project Brief da BA
**Data:** Abril/2026
**Status:** Rascunho para implementação no homelab
**Documentos relacionados:**
- [PRD Dashboard 2.0](./PRD-dashboard-v2.md) — pré-requisito conceitual desta Fase 1
- [Estabilização](./ESTABILIZACAO-finance-hledger.md) — Fase 0, pré-requisito técnico
- [Diagnóstico da planilha](./DIAGNOSTICO-planilha-e-dashboard.md) — contexto do modelo mental do usuário

---

## 1. Contexto e alinhamento com o Brief

Este PRD parte do *Project Brief* entregue pela BA ("AI-Powered hledger Manager — Privacy First") e o refina em três aspectos:

1. **Integra o novo escopo (ingestão inteligente)** com o sistema de visualização já existente no homelab (dashboard FastAPI+React que consome `hledger -O json`).
2. **Fecha decisões técnicas** que estavam em aberto no brief (plataforma, interface com hledger, estratégia de aprendizado, tratamento de transferências e multi-moeda).
3. **Adota a dimensão Princípio** introduzida pelo [PRD Dashboard 2.0](./PRD-dashboard-v2.md) — a ingestão deve sugerir não apenas categoria, mas também princípio (derivado via mapping), e a declaração de parcelamentos como `~ monthly from X to Y` alimenta diretamente a aba Plano.

O resultado é uma **PWA unificada** rodando no homelab, acessível via Tailscale, que cobre os dois lados do ciclo de contabilidade familiar: **ingestão** (novo) e **visualização** (existente + Dashboard 2.0).

### 1.1. Preservado do Brief

- **Conceito:** app local-first que usa IA local para automatizar a ingestão de dados financeiros brutos em arquivos hledger, sem comprometer a privacidade.
- **Problema:** atrito de categorização manual e preocupação com SaaS de nuvem que exigem acesso bancário.
- **Público-alvo primário:** entusiasta de Plain Text Accounting que versiona finanças com git.
- **Público secundário:** freelancer/solopreneur que precisa separar pessoal e profissional no mesmo journal.
- **Proposta de valor:** automação inteligente **com soberania dos dados**, usando hledger como motor de persistência.
- **Meta principal:** reduzir reconciliação bancária semanal de horas para minutos.
- **Métrica central:** ≥85% de acerto da IA na categorização automática.

### 1.2. Refinado / adicionado neste PRD

- App **unificado** com o dashboard existente (em vez de aplicação separada).
- **Web-local no homelab** (FastAPI + React PWA), não desktop nativo.
- **Aprendizado com histórico do journal** (RAG sobre transações passadas) como requisito central para atingir a meta de 85%.
- **Interface com hledger via módulo Python interno** (`hledger_client.py`), encapsulando subprocess ao CLI — ver ADR-04.
- **Git commit automático** após cada lote aprovado pelo usuário.
- **Transferências entre contas** tratadas com heurística automática desde o dia 1 (não v2).
- **Multi-moeda** em modo simples no MVP (preserva moeda original, conversão manual posterior).
- **Princípio sugerido na staging** via mapping categoria → princípio (ver [PRD Dashboard 2.0 §4](./PRD-dashboard-v2.md)).
- **Detecção de parcelamento** em faturas de cartão gera automaticamente declaração `~ monthly from X to Y` no journal — alimenta a aba Plano da Dashboard 2.0.

---

## 2. Decisões de arquitetura (ADRs resumidos)

| # | Decisão | Alternativas consideradas | Racional |
|---|---------|---------------------------|----------|
| ADR-01 | PWA unificada (ingestão + dashboard no mesmo app) | Apps separados compartilhando journal | Um ícone na tela inicial, autenticação única, navegação coerente. A aba Importar é responsiva: tabela densa no desktop, cards stacked verticalmente no mobile — mesmas ações em ambos. |
| ADR-02 | Web-local no homelab (FastAPI + React) | Tauri/Electron desktop; CLI puro | Reutiliza stack já dominada e o acesso Tailscale existente; zero dependência nova de toolchain. Ollama já pode rodar na mesma máquina. |
| ADR-03 | RAG sobre journal histórico como contexto do LLM | LLM zero-shot; regras manuais apenas | Meta de 85% é inatingível sem memória. Journal do usuário é o dataset de few-shot perfeito e mantém privacidade (tudo local). |
| ADR-04 | Módulo Python interno `hledger_client.py` encapsulando subprocess ao `hledger` CLI | MCP estrito (`iiAtlas/hledger-mcp`); CLI estrito ad-hoc; escrita direta no arquivo | MCP faz sentido quando se comunica com um cliente externo que não controlamos. Como backend e CLI vivem na mesma máquina sob nosso controle, MCP adiciona um processo Node, serialização JSON e latência de stdio sem benefício real. Um módulo Python nosso é testável (mock de subprocess), rápido, debugável num único stack trace e preserva o princípio "journal é sagrado". **Observação de uso real:** o hledger-mcp já foi testado no projeto via Claude Code (skills `hledger-base/extrato/fatura`) e funciona, mas os agentes tendem a contornar o MCP e escrever texto direto no journal — esse risco não existe no Magic Import porque o LLM devolve JSON estruturado e é o backend Python (determinístico) quem persiste. Se no futuro quisermos expor este cliente como servidor MCP para ferramentas externas, é aditivo, não substitutivo. |
| ADR-05 | Transferências detectadas por heurística automática | Só manual no MVP; só manual sempre | Solicitação explícita do usuário: "dinheiro sai de uma conta e tem que entrar em outra". Duplicidade é o pior bug possível aqui. |
| ADR-06 | Multi-moeda simples no MVP (preserva moeda original) | First-class desde dia 1 | Uso real é eventual (viagens). Complexidade de taxa de conversão automática não se paga no MVP. |
| ADR-07 | Git commit automático após lote aprovado | Commit manual; sem git no MVP | Journal já é versionado; audit trail gratuito e reversibilidade por `git revert` se algo der errado. |
| ADR-08 | Princípio sugerido via mapping categoria → princípio (não via LLM) | LLM sugere princípio junto com categoria; princípio é só metadata manual | Princípio é função determinística da categoria no caso geral (ver [Dashboard 2.0 §4](./PRD-dashboard-v2.md)). Deixar LLM inferir adicionaria aleatoriedade sem ganho. Override via tag `principio:` cobre os casos de exceção. |
| ADR-09 | Parcelamentos detectados geram `~ monthly from X to Y` no journal | Lançamento de N transações uma por vez; metadata externa em SQLite | Usa o mecanismo nativo do hledger para recorrência. Alimenta automaticamente a aba Plano (Dashboard 2.0) sem integração extra. Futuras alterações (adiantamento de quitação) ficam em um único lugar no journal. |

---

## 3. Usuários e cenários de uso

### 3.1. Persona primária — "Você"

- Engenheiro, usa homelab com Tailscale, versiona journal no git.
- Acompanha finanças com a esposa; quer que ela também use sem atrito.
- Desktop-first para tarefas densas (importar PDFs, revisar lotes), mobile-first para consulta do dia-a-dia.
- Conforto técnico alto; zero tolerância para dados financeiros em SaaS externo.

### 3.2. Persona secundária — cônjuge (consumidora)

- Usa mais o celular, raramente o desktop.
- Quer ver saldo, gastos do mês, meta de economia — não quer editar journal.
- Pode, eventualmente, aprovar um lote importado pelo parceiro.

### 3.3. Cenários-chave

**C1. Importação mensal de fatura de cartão** (primário, semanal ou quinzenal)
Usuário baixa PDF da fatura → arrasta no navegador → sistema extrai, categoriza, marca transferências → usuário revisa na staging (5-10 min) → aprova → lote vira transações no journal + git commit.

**C2. Consulta rápida pelo celular** (diária, ambos)
Abre PWA → vê saldo do mês, progresso da meta, top 5 gastos. Nenhuma escrita acontece nessa jornada.

**C3. Investigação de gasto** (ocasional)
"Quanto gastei em farmácia no trimestre?" → aba Transações → filtro por categoria + período.

**C4. Aprendizado da IA ao longo do tempo** (contínuo, invisível)
A cada lote aprovado, sistema registra associações (descrição → conta hledger) que serão usadas como few-shot em futuras extrações.

---

## 4. Escopo do MVP

### 4.1. In-scope (Must Have)

**Módulos novos (Magic Import):**
- M1. Ingest — upload de PDF/CSV/texto, fila de processamento
- M2. Extract — LLM local extrai transações estruturadas do arquivo bruto
- M3. Enrich — categorização via RAG sobre journal + detecção de transferências
- M4. Stage — interface de revisão (desktop-first) com edição inline
- M5. Handoff — escrita via `hledger_client` com dry-run, git commit, rollback em falha

**Módulos existentes (a manter e integrar):**
- Dashboard: Resumo, Fluxo, Orçamento, Patrimônio (já implementados)
- Aba Transações (do roadmap Fase 1 do dashboard — entra junto com o MVP do import porque reutiliza os mesmos endpoints de query do `hledger_client`)

**Infra:**
- PWA (manifest + service worker básico)
- Autenticação via header `Tailscale-User-Login` (identificação, não autorização complexa)
- Persistência de estado de lotes pendentes em SQLite local (não é dado financeiro — é fila de trabalho)

### 4.2. Out-of-scope (explícito, alinhado com Brief)

- Sincronização com nuvem própria (usar git do usuário)
- Conexão direta com bancos (Open Finance, scraping, agregadores)
- Multi-usuário com permissões granulares (Tailscale já autentica; sem RBAC)
- Multi-moeda com conversão automática
- Mobile-first para a tela de importação (mobile só mostra status dos lotes)
- Integrações com outras ferramentas de PTA (beancount, ledger original)

---

## 5. Fluxo fim-a-fim — Jornada de Importação

```
┌─────────────────────────────────────────────────────────────────┐
│  1. UPLOAD                                                       │
│  Usuário arrasta fatura.pdf no desktop                          │
│  → POST /api/import/upload                                       │
│  → arquivo salvo em ~/.hledger-manager/inbox/batches/<uuid>/    │
│  → cria registro em batches (status: pending)                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. EXTRACT                                                      │
│  Worker lê arquivo → invoca Ollama (modelo vision p/ PDF)       │
│  → LLM devolve JSON com [{date, desc, amount, currency}]        │
│  → valida schema; se falhar, marca batch como error             │
│  (status: extracted)                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. ENRICH                                                       │
│  Para cada transação extraída:                                   │
│   a) Busca no journal (via hledger_client.register) últimas 50           │
│      transações com descrição similar (fuzzy + embedding)       │
│   b) Monta prompt few-shot com exemplos recuperados             │
│   c) LLM sugere posting (conta de destino + confiança)          │
│   d) Heurística de transferência: se outra transação no lote    │
│      (ou no journal nos últimos 3 dias) tem valor oposto em     │
│      conta diferente → marca como transferência                  │
│  (status: enriched)                                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. STAGE                                                        │
│  Desktop UI mostra tabela editável:                             │
│   ☑ Data  ☑ Descrição  ☑ Valor  ☑ Conta sugerida  [conf %]     │
│  Usuário pode: editar conta, marcar como ignorar, fundir       │
│  linhas (transferência), dividir 1 linha em múltiplas postings  │
│  → POST /api/import/<uuid>/approve com payload final            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. HANDOFF                                                      │
│  Backend → hledger_client.add_transaction(tx, dry_run=True)      │
│   └ internamente: gera texto, faz cópia .bak, append, check      │
│   └ se check falhar: restaura .bak, devolve erro, lote p/ stage  │
│   └ se ok (dry_run): descarta mudança, chama sem dry_run         │
│  Backend → git add + git commit -m "import: <arquivo> (<N> tx)" │
│  Backend → grava associações no store de aprendizado            │
│   └ (desc_normalizada → conta_aprovada) para RAG futuro         │
│  (status: committed)                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Modelo de aprendizado (RAG sobre journal)

O sistema **não treina modelos**. Ele usa o journal histórico do usuário como memória de longo prazo, recuperada em tempo de inferência.

### 6.1. Indexação (offline, após cada commit)

- Para cada transação do journal (via `hledger_client.register`):
  - Extrai: `descrição_normalizada`, `conta_destino`, `valor`, `data`
  - Normaliza descrição (lowercase, remove acentos, remove números de documento)
  - Gera embedding (modelo local, ex: `nomic-embed-text` via Ollama)
- Armazena em índice vetorial local (FAISS ou sqlite-vec; leve o suficiente para homelab)
- Mantém também índice estatístico simples: `{descrição_normalizada: [(conta, contagem), ...]}`

### 6.2. Recuperação (online, durante Enrich)

Para cada transação nova:
1. **Match exato por descrição normalizada** — se existe e contagem ≥ 3 com mesma conta em ≥80% das vezes → aplica direto, confiança = "alta"
2. **Match por embedding** — top-5 similares → entram no prompt como few-shot
3. **LLM gera sugestão** com esses exemplos no contexto

### 6.3. Cold start

Com journal vazio ou pequeno (<100 tx), o LLM opera em modo zero-shot mas com o **plano de contas** do usuário no prompt (lista de contas existentes, obtida via `hledger_client.accounts`). Isso reduz alucinação ("conta inventada") mesmo sem histórico.

---

## 7. Requisitos funcionais detalhados (critérios de aceitação)

### M1. Ingest

- **RF-1.1** Aceita upload de `.pdf`, `.csv`, `.ofx`, `.txt` via drag-and-drop ou seletor de arquivos.
- **RF-1.2** Arquivos > 10MB são rejeitados com mensagem clara.
- **RF-1.3** Cada upload gera um `batch_id` (UUIDv4) e um diretório isolado.
- **RF-1.4** Estado do batch é persistido em SQLite e sobrevive a restart do backend.
- **Critério de aceite:** fazer upload de fatura do Nubank em PDF resulta em batch visível na UI com status `pending`.

### M2. Extract

- **RF-2.1** PDF é convertido em imagens (pdftoppm) e enviado para modelo vision (ex: `llava`, `qwen2-vl`).
- **RF-2.2** CSV é parseado por heurística (detecta delimitador, header) + LLM só confirma o mapeamento de colunas.
- **RF-2.3** Output é JSON validado por schema Pydantic: `[{date: ISO8601, description: str, amount: Decimal, currency: str}]`.
- **RF-2.4** Falha de parse marca batch como `error` com mensagem recuperável (permite reprocessar).
- **Critério de aceite:** fatura Nubank de 40 linhas vira 40 itens JSON válidos em <60s no homelab.

### M3. Enrich

- **RF-3.1** Para cada item, sistema consulta RAG conforme §6.2.
- **RF-3.2** Output adiciona `suggested_account: str` e `confidence: "alta"|"média"|"baixa"`.
- **RF-3.3** Detecção de transferência compara (valor_absoluto, data ±2 dias, conta ≠) entre itens do lote E entre o lote e o journal dos últimos 3 dias.
- **RF-3.4** Transferências detectadas são marcadas com `is_transfer: true` e `transfer_pair_id`.
- **RF-3.5** Após resolver a categoria, sistema resolve o princípio via `principles.resolver` (ver [Dashboard 2.0 §4.2](./PRD-dashboard-v2.md)). Output adiciona `suggested_principle: str` e `principle_source: "mapping"|"default"|"none"`.
- **RF-3.6** Detecção de parcelamento em faturas: sistema identifica padrões como `PARCELADO 3/10`, `3 DE 10`, `PARC 03/10` na descrição. Output adiciona `installment_info: {current: int, total: int}` quando detectado. Também detecta recorrência em faturas anteriores (ex: valor igual + descrição similar aparecendo em faturas consecutivas).
- **Critério de aceite:** em fatura com 40 itens onde 30 têm descrição reconhecível do histórico, ≥85% recebem sugestão correta validada pelo usuário na staging (métrica medida a posteriori). 100% dos itens com mapping categoria→princípio recebem sugestão de princípio correta.

### M4. Stage

- **RF-4.1** Dois layouts responsivos, mesmo dataset, mesmas ações:
  - **Desktop** (≥900px): tabela com colunas `[checkbox, data, descrição, valor, conta sugerida (editável), princípio (derivado, override disponível), confiança, marcadores (parcelamento/transferência)]`.
  - **Mobile** (<900px): lista vertical de cards empilhados — cada transação ocupa a largura, com campos em labels acima dos valores, conta editável por tap-and-autocomplete, princípio visível em chip, confiança como badge colorido.
- **RF-4.2** Linhas/cards com `is_transfer: true` são visualmente agrupados (par highlighted, conectado visualmente no desktop; no mobile, stack contíguo com borda compartilhada).
- **RF-4.3** Usuário pode: editar conta (autocomplete com contas existentes via `hledger_client.accounts`), marcar linha como ignorar, fundir 2 linhas em uma transferência manual, dividir 1 linha em múltiplas postings. Essas ações estão disponíveis igualmente nos dois layouts.
- **RF-4.4** Barra de ações fixa: "Aprovar lote", "Salvar e sair", "Descartar lote". No mobile, fica sticky no bottom.
- **RF-4.5** Ergonomia mobile é otimizada para lotes pequenos (até ~20 itens, ex: fatura parcial). Lotes grandes continuam funcionando no mobile mas o desktop é recomendado pela densidade.
- **RF-4.6** Princípio derivado do mapping é mostrado como texto secundário/chip ao lado da conta. Usuário pode override clicando num ícone discreto — abre seletor com os 7 princípios. Override grava tag `principio:X` na transação.
- **RF-4.7** Linhas com `installment_info` têm marcador visual (ex: ícone 📎 ou badge "3/10"). Usuário pode:
  - Aceitar a detecção → sistema gera `~ monthly from <data> to <data+total*mês>` no journal para as parcelas **futuras**, além de lançar a parcela atual.
  - Ajustar os parâmetros (parcelas restantes, valor por parcela, data de fim).
  - Rejeitar → lançada como transação única, sem recorrência.
- **Critério de aceite:** revisão de lote de 40 itens leva ≤10 minutos no desktop (medido com usuário real); revisão de lote de 10 itens é viável no mobile (testável a qualquer momento). Parcelamentos detectados geram `~ monthly` corretos com nome/tag identificadoras.

### M5. Handoff

- **RF-5.1** Aprovação chama `hledger_client.add_transaction(tx, dry_run=True)`. O módulo faz cópia `.bak`, append no journal, `hledger check` e, se falhar, restaura do backup.
- **RF-5.2** Se o dry-run falha (desbalanceamento, conta inválida, erro de sintaxe), UI mostra mensagem derivada do stderr do `hledger check` e lote volta para stage.
- **RF-5.3** Se dry-run ok, chama `hledger_client.add_transaction(tx, dry_run=False)` que faz o mesmo fluxo mas mantém a escrita.
- **RF-5.4** Após escrita, sistema executa `git add <journal> && git commit -m "import: <origem> (<N> tx em <data>)"`.
- **RF-5.5** Se git falhar (repo sujo, conflitos), log warning mas não desfaz a escrita (transações já foram validadas pelo hledger).
- **RF-5.6** Após commit, sistema re-indexa as novas transações no RAG.
- **Critério de aceite:** aprovação de lote de 40 tx resulta em 40 entradas no journal, 1 commit no git, e 40 itens novos no índice RAG.

### Dashboard (módulos existentes)

Mantém comportamento atual; adiciona:
- **RF-D.1** Nova aba "Importar" no menu principal.
- **RF-D.2** Aba "Transações" (já planejada no roadmap) reutiliza `hledger_client.register` com filtros.
- **RF-D.3** Badge no ícone de Importar quando há lotes `enriched` aguardando revisão.

---

## 8. Requisitos não-funcionais

| Categoria | Requisito | Métrica |
|-----------|-----------|---------|
| **Privacidade** | Zero egress de dados financeiros | Teste: monitor de rede mostra 0 bytes saindo do homelab para domínios externos durante operação. Ollama local, hledger CLI local, git local. |
| **Performance — Extract** | Fatura de até 50 tx processada em ≤90s | P95 em 5 lotes reais |
| **Performance — Enrich** | Lote de 50 tx enriquecido em ≤30s | P95 |
| **Performance — Dashboard** | Tempo de carregamento da aba Resumo ≤1.5s | P95 |
| **Confiabilidade** | Escrita em journal é atômica | Crash no meio do handoff nunca deixa journal em estado inválido (garantido por fluxo `.bak` → append → `hledger check` → rollback) |
| **Recuperabilidade** | Todo commit é reversível | `git revert <hash>` desfaz lote completo |
| **Auditabilidade** | Todo lote deixa rastro | Mensagem de commit referencia arquivo de origem e número de tx |
| **Acessibilidade** | Funciona em Firefox/Chrome/Safari atuais, mobile e desktop | Teste manual em iOS Safari + Chrome desktop |

---

## 9. Stack e dependências

**Backend (Python 3.12, homelab):**
- FastAPI (existente)
- SQLite + SQLModel (novo — fila de batches)
- sqlite-vec ou FAISS (novo — índice RAG)
- `hledger_client.py` (novo — módulo interno, subprocess wrapper tipado sobre `hledger` CLI)
- Pydantic v2 (validação de schemas e tipagem das respostas do `hledger_client`)
- `gitpython` ou subprocess git

**IA local:**
- Ollama (novo — orquestrador de modelos)
- Modelo vision: avaliar `qwen2-vl:7b` e `llava:13b` (decisão após benchmark com 3 faturas reais)
- Modelo embedding: `nomic-embed-text`
- Modelo texto (categorização/refinamento): `qwen2.5:7b-instruct` ou `llama3.1:8b-instruct`

**hledger:**
- hledger CLI (existente) — invocado via `hledger_client.py`

**Frontend (existente):**
- React + Recharts + Lucide
- Nova rota/aba "Importar"
- PWA manifest + service worker básico

**Infra:**
- Tailscale (existente)
- systemd services: `hledger-manager-api`, `hledger-manager-worker`, `ollama`

---

## 10. Riscos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| R1 | Alucinação do LLM em PDFs de layout complexo (datas erradas, valores errados) | Alta | Alto | Staging obrigatória — nada vai pro journal sem revisão humana. RAG reduz ao dar contas reais como contexto. Benchmark com 5 bancos diferentes antes do release. |
| R2 | Bugs no `hledger_client.py` podem corromper journal | Baixa | Alto | Cobertura de testes forte no módulo (mock de subprocess + testes de integração com journal fixture). Toda escrita passa por `.bak` → append → `check` → rollback em falha. Git commit adiciona camada extra de reversibilidade. |
| R3 | Transferência não detectada → duplicidade no journal | Média | Alto | Heurística agressiva + janela de 3 dias. Alerta visual na staging quando 2 tx de mesmo valor absoluto entram sem par marcado. Relatório pós-lote: "você pode querer revisar essas possíveis transferências." |
| R4 | Performance do LLM vision insuficiente no hardware do homelab | Média | Médio | Benchmark no dia 1. Fallback: usar pdfplumber + LLM de texto (perde qualidade em PDFs escaneados mas mantém pipeline funcionando). |
| R5 | Git repo em estado sujo impede commit automático | Baixa | Baixo | Detectar `git status --porcelain` antes do commit; se sujo, fazer stash automático ou simplesmente pular o commit com warning. |
| R6 | Índice RAG fica inconsistente com journal (ex: usuário edita journal manualmente fora do app) | Média | Médio | Comando "Reindexar tudo" no admin da UI. Hash do journal armazenado com o índice; se bater diferente no startup, sugere reindexar. |
| R7 | Multi-moeda (mesmo no modo simples) gera comparações erradas no dashboard | Baixa | Médio | Dashboard assume moeda base (BRL); transações em outras moedas aparecem na aba Transações mas não no Fluxo/Orçamento no MVP. Documentar. |

---

## 11. Métricas de sucesso operacionalizadas

| Métrica | Como medir | Meta MVP | Meta pós-MVP |
|---------|------------|----------|--------------|
| **Acerto de categorização** | Para cada lote, % de sugestões mantidas sem edição pelo usuário na staging | ≥70% (bootstrap) | ≥85% (após 3 meses de uso) |
| **Tempo de reconciliação** | Do upload ao commit git, tempo total | ≤15 min p/ lote de 50 tx | ≤10 min |
| **Adoção familiar** | Nº de sessões da esposa por semana na PWA (mobile) | ≥3/semana | ≥5/semana |
| **Taxa de falha** | % de lotes que chegam a `error` ou `rejected` no handoff | ≤5% | ≤2% |
| **Backlog de lotes** | Lotes `enriched` parados >48h | 0 (alerta se >1) | 0 |
| **Transferências duplicadas** | Duplicatas detectadas retroativamente no journal | 0 | 0 |

---

## 12. Roadmap integrado

Este MVP convive com os roadmaps já definidos:

### Fase 0 — Estabilização (4-6 semanas)

Ver [doc de Estabilização](./ESTABILIZACAO-finance-hledger.md) §10. Resumo: refatoração de `main.py` em módulos, `Dashboard.jsx` em `features/*/`, `HledgerClient` tipado, observability, volta do Tailscale auth.

**Pré-requisito técnico para tudo que vem depois.**

### Fase D — Dashboard 2.0 (6-8 semanas)

Ver [PRD Dashboard 2.0](./PRD-dashboard-v2.md) §16. Resumo: nova estrutura de abas (Mês, Ano, Plano, Fluxo reformado, Patrimônio, Transações), dimensão Princípio, previsão via `~ monthly`.

**Pré-requisito conceitual do Magic Import** (a staging precisa sugerir princípio e detectar parcelamentos que alimentam a aba Plano).

### Fase 1 — Magic Import MVP (4-6 semanas)

- M1 Ingest + SQLite de batches
- Implementação do `hledger_client.py` extended com `add_transaction` com cobertura de testes e validação em journal de laboratório (parte vem da Fase 0)
- M2 Extract com Ollama (benchmark de modelos inclusive)
- M3 Enrich com RAG + heurística de transferências + resolução de princípio + detecção de parcelamento
- M4 Stage UI desktop e mobile
- M5 Handoff com git auto-commit + geração de `~ monthly` para parcelamentos
- Nova aba "Importar" na PWA

### Fase 2 — Refinamentos pós-uso real (ongoing)

Só abrir depois de 1-2 meses usando o sistema de verdade. Candidatos:
- Regras manuais do usuário (override do LLM) — ("Uber*" sempre vai pra `expenses:transporte:app`)
- Multi-moeda first-class se surgir demanda real
- Exportação de relatórios (CSV/PDF) para contabilidade
- Simulador de "pagamento adiantado" de parcelamento (se não entrou no Dashboard 2.0)

---

## 13. Questões em aberto para próxima rodada

1. **Benchmark de modelos:** quais modelos Ollama testar primeiro? Sugestão: `qwen2-vl:7b` e `llava:13b` para PDF; `qwen2.5:7b` e `llama3.1:8b` para texto.
2. **Estrutura de contas:** você já tem plano de contas estável ou vai evoluir junto? Se evoluir, o RAG precisa lidar com renomes.
3. **Journal monolítico ou `!include`?** hledger CLI lida nativamente com ambos; vale definir a estrutura de arquivos antes (ex: `main.journal` + `2026.journal` por ano). O `hledger_client` só precisa saber o caminho do arquivo raiz.
4. **Backup do journal antes do handoff:** estratégia definida é cópia `.bak` antes de cada append — confirmar no teste se isso é suficiente ou se vale acrescentar retenção de backups em `~/.hledger-manager/backups/` além do git.
5. **Modo escuro / estética:** a estética editorial escura do dashboard deve se estender pra Import, ou Import tem vibe mais "planilha/produtividade"? Preferência pessoal.

---

## 14. Próximos passos

1. **Você revisa este PRD** e marca o que discorda / falta / sobra.
2. Alinhamos a Fase 0 (o que fecha primeiro do dashboard).
3. Montamos em conjunto um plano de sprint para Fase 1 (M1→M5) com issues no seu board.
4. Primeira tarefa técnica: implementar esqueleto do `hledger_client.py` com `register()` e `add_transaction(dry_run)` sobre journal de laboratório, cobertos por testes, e demonstrar ciclo completo de append → check → git commit.

---

*Fim do PRD v0.2.*
