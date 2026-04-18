# PRD — Dashboard 2.0 (Visão Familiar)

**Versão:** 0.1 (rascunho para discussão)
**Autor:** Claude + [você]
**Data:** Abril/2026
**Status:** Rascunho, pronto para revisão
**Documentos relacionados:**
- [Diagnóstico da planilha](./DIAGNOSTICO-planilha-e-dashboard.md) — origem das decisões
- [PRD Magic Import](./PRD-hledger-manager.md) — fase subsequente, depende deste
- [Estabilização](./ESTABILIZACAO-finance-hledger.md) — Fase 0, pré-requisito

---

## 1. Contexto

O dashboard atual é competente como visualizador do hledger, mas não fala a língua que o casal usa para controlar finanças familiares. A planilha antiga usada há anos revela um modelo mental que o dashboard não suporta — e por isso gera fricção no uso conjunto, especialmente para a esposa do usuário.

Este PRD reorganiza o dashboard para falar essa língua, ao mesmo tempo em que corrige vícios da planilha (ver §3 do diagnóstico). O objetivo final é **aposentar a planilha**.

### 1.1. Escopo

- Reestruturar abas e hierarquia de informação do frontend.
- Adicionar dimensão **Princípio** ao modelo de dados (categoria → princípio, herança automática com override por tag).
- Introduzir duas visões novas: **Ano** (matriz categoria × mês) e **Plano** (orçamento + previsão + dívida integrados).
- Redesenhar aba **Fluxo** como grafo de nós baseado em delta de saldo.
- Introduzir **receitas no topo** como princípio de organização da aba Mês.

### 1.2. Fora de escopo

- Ingestão automática de faturas/extratos (isso é o Magic Import, Fase 1).
- Multi-usuário com permissões granulares (Tailscale já autentica; metas são globais do casal).
- Multi-moeda com conversão automática (segue o mesmo princípio do Magic Import: moeda base BRL, multi-moeda simples no MVP).

### 1.3. Pré-requisitos

- **Fase 0 concluída.** O Dashboard atual refatorado em `features/*/` (ver [Estabilização](./ESTABILIZACAO-finance-hledger.md) Ondas 1-3). Mexer em estrutura de abas sobre o monolito de 1833 linhas seria retrabalho.
- Backend com `HledgerClient` tipado, parsers unificados, e endpoints por router. Caso contrário, adicionar conceito de Princípio quebra em múltiplos lugares.

---

## 2. O modelo mental a respeitar

Vem do diagnóstico da planilha. Cinco regras:

1. **Tudo começa pela receita.** Receita é o chão; despesa é o teto.
2. **Mês é a unidade natural de controle.** Ano é uma sequência de 12 meses, não um contínuo.
3. **Categoria responde "em quê", Princípio responde "por quê".** Duas taxonomias, dois propósitos.
4. **Metas são explícitas e comparáveis.** Não basta "gastei X"; é "gastei X vs meta Y".
5. **Dívida é projeto de curto prazo a zerar.** Parcelas têm nome e cronograma; não ficam invisíveis.

A estrutura de abas abaixo opera essas cinco regras explicitamente.

---

## 3. Nova estrutura de abas

| # | Aba | Propósito | Origem |
|---|-----|-----------|--------|
| 1 | **Mês** | Visão do mês atual: receitas → despesas → resultado → meta por princípio → top gastos | Reforma profunda do "Resumo" atual |
| 2 | **Ano** | Matriz categoria × mês do ano todo; segunda vista: princípio × mês | Novo, inspirada no Consolidado da planilha |
| 3 | **Plano** | Próximos 6-12 meses: orçamento vs previsão vs metas + decaimento de dívida | Unifica Orçamento, Previsão e nova Dívida |
| 4 | **Fluxo** | Grafo de nós (contas) com delta destacado; entrada/saída sob demanda | Reforma total — substitui o Sankey atual |
| 5 | **Patrimônio** | Ativos, passivos, net worth, evolução histórica | Renomeia "Contas" |
| 6 | **Transações** | Busca e filtro livres | Mantém |
| 7 | **Importar** | Magic Import — ingestão inteligente de faturas/extratos | Fase 1, placeholder agora |

Entrada default do app: **Mês**. Não mais "Resumo" — e a primeira seção dentro de Mês é **Receitas**, não saldo.

---

## 4. A dimensão Princípio

### 4.1. Os 7 princípios (metodologia do curso DSOP)

| Princípio | Meta padrão | Natureza |
|-----------|-------------|----------|
| Custos Fixos | 40% | Obrigações recorrentes inevitáveis (moradia, utilities, escola, plano de saúde) |
| Conforto | 20% | Qualidade de vida, mas não estritamente necessário (empregada, equipamentos, consultas opcionais) |
| Metas | 5% | Reserva para objetivos específicos de médio prazo |
| Prazeres | 5% | Lazer, restaurantes, presentes — o que você faz "porque quer" |
| Liberdade Financeira | 25% | Investimentos, previdência, aplicações — dinheiro que continua seu |
| Aumentar Renda | 5% | Treinamentos, cursos, livros profissionais — gastos para ganhar mais |
| Reserva de Oportunidade | 0% | Gatilho para momento — não tem meta fixa |

Total das metas = 100%. Essas metas são **globais do casal** e editáveis nas Settings inline.

### 4.2. Como princípio é determinado

**Regra 1 — Mapeamento por categoria (default).**

Arquivo `backend/app/config/principles.json`:

```json
{
  "mappings": {
    "expenses:moradia:financiamento-casa":         "custos-fixos",
    "expenses:moradia:manutenção":                 "custos-fixos",
    "expenses:moradia:água":                       "custos-fixos",
    "expenses:moradia:energia-elétrica":           "custos-fixos",
    "expenses:moradia:telefone":                   "custos-fixos",
    "expenses:moradia:internet":                   "custos-fixos",
    "expenses:moradia:tv-a-cabo":                  "conforto",
    "expenses:moradia:empregada-doméstica":        "conforto",
    "expenses:moradia:equipamentos-novos":         "conforto",
    "expenses:alimentação:supermercado":           "custos-fixos",
    "expenses:alimentação:restaurantes":           "prazeres",
    "expenses:alimentação:clube":                  "prazeres",
    "expenses:alimentação:conveniência":           "prazeres",
    "expenses:transporte:combustível":             "custos-fixos",
    "expenses:transporte:escolar":                 "custos-fixos",
    "expenses:transporte:manutenção":              "custos-fixos",
    "expenses:saúde:plano-de-saúde":               "custos-fixos",
    "expenses:saúde:farmácia":                     "custos-fixos",
    "expenses:saúde:consultas-médicas":            "conforto",
    "expenses:saúde:condicionamento-físico":       "conforto",
    "expenses:educação:mensalidade-escolar":       "custos-fixos",
    "expenses:educação:material-escolar":          "custos-fixos",
    "expenses:educação:treinamento-profissional":  "aumentar-renda",
    "expenses:educação:livros":                    "aumentar-renda",
    "expenses:lazer:*":                            "prazeres",
    "expenses:doações:*":                          "custos-fixos",
    "expenses:despesas-pessoais:mesada":           "custos-fixos",
    "expenses:despesas-pessoais:cuidados-pessoais":"conforto",
    "expenses:despesas-pessoais:roupas":           "conforto",
    "expenses:despesas-pessoais:presentes":        "prazeres",
    "expenses:animais:*":                          "prazeres",
    "expenses:obrigações-financeiras:previdência-privada":  "liberdade-financeira",
    "expenses:obrigações-financeiras:aplicação-em-fundos":  "liberdade-financeira",
    "expenses:obrigações-financeiras:taxas-bancárias-e-juros": "custos-fixos"
  },
  "default": "custos-fixos"
}
```

**Resolução:** match mais específico ganha. `expenses:lazer:clube` → `prazeres` via wildcard `expenses:lazer:*`, a menos que tenha mapping mais específico.

**Regra 2 — Override via tag.**

Quando a mesma categoria tem comportamento diferente contextualmente, tag no hledger:

```hledger
2026-04-15 * Restaurante jantar de aniversário
    expenses:alimentação:restaurantes   280.00  ; principio: metas
    assets:banco:nubank
```

Aqui, `restaurantes` default é `prazeres`, mas a tag força `metas` (estava poupando pra esse jantar especial).

**Regra 3 — Princípio vazio.**

Se categoria não está no mapping e não tem tag, assume `default` do arquivo (hoje: `custos-fixos`). Dashboard mostra warning visual ("princípio não definido") para esses casos — sinaliza lacuna no mapping.

### 4.3. Implementação

- Backend: novo módulo `app/principles/` com `resolver.py` (resolve princípio de uma transação), `mappings.py` (carrega JSON), `errors.py`.
- Novo endpoint `/api/principles/summary?month=YYYY-MM` retorna `{princípio: {valor, meta_pct, realizado_pct, delta_pct}}` para a aba Mês.
- Novo endpoint `/api/principles/yearly?year=YYYY` retorna matriz princípio × mês para a aba Ano.
- Settings inline (por aba Mês e por aba Ano) permitem editar o mapping e as metas sem mexer em código — escrita vai para um SQLite local, não para o JSON (que vira o default de fábrica).

---

## 5. Aba Mês — especificação

Substitui a aba Resumo atual. Ordem vertical estrita:

### 5.1. Seção 1 — Receitas (topo, destacada)

- Título "Receitas" com destaque tipográfico.
- Lista de transações de receita do mês: `[dia, descrição, valor]`.
- Quantidade típica: 4-8 linhas (salários + eventuais).
- **Total de receitas** em destaque no final da seção.
- Comparação com mês anterior: `R$ 44.147 (-R$ 1.200 vs Mar)`.

### 5.2. Seção 2 — Saldo e resultado

- Três KPIs grandes lado a lado:
  - **Receitas** (de 5.1)
  - **Despesas** totais do mês
  - **Resultado líquido** (receitas − despesas) com cor condicional: verde se positivo, âmbar se pequeno, vermelho se negativo
- Indicador secundário: **"Sobrou onde?"** — se resultado positivo, para onde foi (ex: "R$ 5.200 → Liberdade Financeira; R$ 800 → Conta Corrente").

### 5.3. Seção 3 — Meta por princípio

Matriz 7 linhas × 4 colunas, uma linha por princípio:

| Princípio | Meta (%) | Realizado (%) | R$ Realizado | Barra visual |
|-----------|----------|----------------|--------------|--------------|
| Custos Fixos | 40% | 52% | R$ 25.485 | [●●●●●●●●●●●○○○] |
| Conforto | 20% | 12% | R$ 5.502 | [●●●●○○○○○○] |
| Metas | 5% | 0% | — | [○○○] |
| Prazeres | 5% | 7% | R$ 3.011 | [●●●●] |
| Liberdade Financeira | 25% | 21% | R$ 9.109 | [●●●●●●●○] |
| Aumentar Renda | 5% | 2% | R$ 1.008 | [●○] |
| Reserva de Oportunidade | — | 0% | — | — |

Barra visual é o ratio realizado/meta — se ultrapassa a meta, a barra estende para direita com cor de alerta.

### 5.4. Seção 4 — Despesas por categoria

Lista flat, ordenada por valor decrescente. Cada linha: nome, valor, % do total, delta vs média 3m.

Click na linha → drill-down inline (já é padrão do dashboard atual, mantém).

### 5.5. Seção 5 — Top 10 transações do mês

Lista simples: data, descrição, valor, categoria. Útil para identificar "o que saiu do normal".

### 5.6. Settings inline desta aba

- Editar metas por princípio (%).
- Escolher quais seções são visíveis.
- Toggle "mostrar delta vs mês anterior" em cada KPI.

---

## 6. Aba Ano — especificação

Nova. Inspirada na aba Consolidado da planilha, **sem** os erros matemáticos dela.

### 6.1. Vista 1 — Categoria × Mês (default)

Matriz com:
- **Linhas:** categorias de despesa, agrupadas por grupo funcional (Moradia, Alimentação, ...). Grupos colapsáveis.
- **Colunas:** 12 meses do ano-calendário.
- **Célula:** valor R$ do mês. Toggle para modo "% do mês" ou "Δ vs média ano".
- **Totais:** linha por grupo, linha total-geral (despesas), linha receitas, linha resultado.
- **Heatmap opcional:** tinge células com intensidade proporcional ao valor.

Filtros no topo: ano (default: atual), tipo (despesa/receita/ambos).

### 6.2. Vista 2 — Princípio × Mês

Mesma estrutura, mas linhas são os 7 princípios. Totaliza **100% por coluna** (ao contrário da planilha atual, que dá 174% em Março por classificação incompleta).

Linha extra de meta fixa (40/20/5/5/25/5/0) em contraste visual — fica óbvio "onde o mês saiu da linha".

### 6.3. Vista 3 — Grupo × Mês (simplificação)

Versão enxuta da Vista 1: só os 10 grupos funcionais, sem subcategorias. Bom para olhada rápida sem sobrecarga.

### 6.4. Comparação anual

Toggle "vs ano anterior" adiciona linha fantasma de cada categoria/princípio com o valor do ano passado no mesmo mês. Requer ≥13 meses de histórico.

### 6.5. Settings inline desta aba

- Escolher vista default (categoria / princípio / grupo).
- Toggle heatmap.
- Toggle comparação anual.

---

## 7. Aba Plano — especificação

Unifica Orçamento + Previsão + Dívida. Tema: **o futuro**. 6-12 meses à frente.

### 7.1. Pré-requisito: recorrentes declaradas

Para a aba Plano funcionar, o journal precisa ter:

**Recorrentes** (receitas e despesas fixas):
```hledger
~ monthly from 2026-01-01
    assets:banco:nubank                    35000.00  ; Retirada Lucas
    income:salário

~ monthly from 2026-01-01
    expenses:moradia:água                    450.00  ; ~média
    assets:banco:nubank

~ monthly from 2026-01-01
    expenses:educação:mensalidade-escolar    746.00
    assets:banco:nubank
```

**Parceladas** (despesas com fim):
```hledger
~ monthly from 2026-05-01 to 2026-12-01
    expenses:moradia:equipamentos-novos      371.79  ; parcelamento: ELECTROLUX 3/10
    liabilities:cartão:nubank
```

O Magic Import vai gerar essas declarações automaticamente na Fase 1. No MVP desta aba, o usuário declara manualmente ou usa a skill `hledger-fatura` via Claude Code que já existe.

### 7.2. Vista 1 — Próximos meses (default)

Tabela com colunas: Maio, Junho, Julho, Agosto, Setembro, Outubro.

Linhas agrupadas:
- **Receitas previstas** (do `~ monthly`)
- **Despesas recorrentes** (agrupadas por grupo)
- **Parcelas** (uma linha por parcelamento ativo, com "fim em Dez/26")
- **Total previsto** (receita − despesa)
- **Saldo acumulado projetado** (somando resultados)

Última coluna: total do semestre.

### 7.3. Vista 2 — Decaimento de dívida

Lista de parcelamentos ativos, cada um com:
- Nome/descrição
- Valor da parcela
- Parcelas pagas / total (ex: 3/10)
- Valor restante
- Data de fim

Gráfico: linha descendente de dívida total ao longo dos próximos 24 meses, com queda a cada "fim de parcelamento". Picos de alívio destacados.

Ação: "Simular pagamento adiantado" — slider que permite ver o impacto de quitar parcelas antecipadamente.

### 7.4. Vista 3 — Metas vs projeção

Metas de longo prazo (vêm da aba Planejamento da planilha antiga):

| Meta | Valor | Prazo | Progresso | Projeção |
|------|-------|-------|-----------|----------|
| Recompor poupança | R$ 90.000 | Dez/26 | R$ 23k | 🟡 Falta R$ 67k em 8 meses → R$ 8.4k/mês |
| Quitar cartões | R$ 0 | Dez/26 | R$ 11.520 restante | 🟢 Ritmo atual quita em Nov/26 |

O dashboard sinaliza: verde se projeção bate com prazo, âmbar se aperta, vermelho se inviável.

### 7.5. Settings inline desta aba

- Horizonte de projeção (6 / 12 / 24 meses).
- Editar metas de longo prazo (CRUD de metas).
- Incluir/excluir categorias da projeção.

---

## 8. Aba Fluxo — especificação (reforma total)

O Sankey atual é substituído por um **grafo de nós baseado em delta**.

### 8.1. Visual principal

Cada conta é um nó:
- **Ativos** (assets:*) em um lado
- **Passivos** (liabilities:*) em outro
- Nó apresenta: nome da conta, saldo final, **delta destacado** (saldo_final − saldo_inicial) com cor e seta
- Tamanho do nó proporcional ao saldo (opcional via setting)

Exemplo textual do que seria visualizado:

```
Ativos                              Passivos
┌──────────────┐                    ┌──────────────┐
│ Nubank       │                    │ Cartão Visa  │
│ R$ 12.450    │  ← delta −R$ 800   │ R$ 3.200     │  ← delta +R$ 1.200
│              │                    │              │
├──────────────┤                    └──────────────┘
│ Poupança     │
│ R$ 45.000    │  ← delta −R$ 3.000
├──────────────┤
│ Investimento │
│ R$ 28.000    │  ← delta +R$ 8.000
└──────────────┘
```

Deltas em verde (positivo ativo / negativo passivo) ou vermelho (negativo ativo / positivo passivo).

### 8.2. Movimentação sob demanda

Hover/click num nó expande:
- **Entradas** (para ativos: receitas, transferências recebidas; para passivos: pagamentos recebidos)
- **Saídas** (para ativos: despesas pagas, transferências enviadas; para passivos: novas compras)
- **Transferências explícitas** entre este nó e outros — linhas/setas desenhadas sob demanda

Isso resolve a crítica do usuário: "fluiu X pra investimento mas tiramos Y da poupança" fica visível em 2 cliques, sem sobreposição visual.

### 8.3. KPIs complementares (do FluxoDetail atual)

Mantém os KPIs que já existem e são bons:
- Receitas totais
- Despesas totais
- Economia contábil (rec − desp)
- Fluxo de caixa líquido (Δ ativos)
- Δ Dívida (se houver passivos)

### 8.4. Tabela "Por conta"

Abaixo do grafo, tabela similar à atual (saldo inicial, entradas, saídas, transfers, saldo final). Redundância proposital — o grafo é pra olhar rápido, a tabela é pra conferir número.

### 8.5. Settings inline desta aba

- Ocultar contas zeradas.
- Ordem dos nós (alfabética / por tamanho / manual).
- Mostrar/ocultar transferências como linhas permanentes.

---

## 9. Aba Patrimônio — especificação (renomeação + melhoria leve)

Rename de "Contas". Conteúdo quase igual ao atual, com ajustes:

### 9.1. Hero: Patrimônio Líquido

No topo, KPI grande: **Patrimônio Líquido** (ativos − passivos), com:
- Valor atual
- Delta vs 12 meses atrás
- Sparkline dos últimos 12 meses

### 9.2. Cards de contas

Mantém o padrão atual de `AccountCard` — ativos primeiro, passivos depois. Sem mudança substantiva.

### 9.3. Evolução histórica

Gráfico de linha: patrimônio líquido mensal dos últimos N meses (N configurável, default 12). Decomposto em: ativos (verde), passivos (vermelho), net (linha grossa).

### 9.4. Settings inline

- Período da evolução (6 / 12 / 24 / 36 / todo).
- Ocultar contas zeradas.

---

## 10. Aba Transações — manutenção

Mantém função atual. Pequenas melhorias:

- Filtro por **princípio** (novo, a partir desta feature).
- Filtro por status (confirmada / pendente) — requer §11.
- Coluna de princípio visível (opcional, via setting da aba).

---

## 11. Requisito transversal: status de transação

Inspirado no `PG`/`PR` da planilha. hledger já suporta nativamente:

- `*` = **cleared** (confirmada no banco/fatura)
- `!` = **pending** (lançada mas não confirmada)
- Sem marca = estado padrão, tratado como realizado por hora

Dashboard visualiza:
- **Cleared:** renderização normal.
- **Pending:** cor mais clara + ícone de relógio. Separada nos totais com seção "pendentes" quando o status importa.
- **Previstas** (do `~ monthly` do futuro): cor ainda mais clara, marcação "projetada".

Settings global: "contar pendentes nos totais do mês?" (sim/não).

---

## 12. Internacionalização

Segue a estratégia leve definida no doc de Estabilização §6: `t()` resolve pelo dicionário da lingua, fallback pra chave.

Implicação específica desta feature: **nomes de princípios e categorias são dados, não texto de UI**. Princípios vivem como identificadores (`custos-fixos`, `conforto`, ...) e cada dicionário traduz pra sua língua:

```js
// i18n/pt-BR.js
{ 'principle.custos-fixos': 'Custos Fixos',
  'principle.conforto': 'Conforto',
  ... }

// i18n/en.js
{ 'principle.custos-fixos': 'Fixed Costs',
  'principle.conforto': 'Comfort',
  ... }
```

Categorias funcionais também traduzidas, mas **vão com o journal** — se o journal usa `expenses:moradia:água`, o identificador fica em PT (é domínio de dado), e o dicionário tem `category.moradia` → "Moradia" / "Housing", `category.água` → "Água" / "Water".

---

## 13. Requisitos não-funcionais

| Categoria | Requisito | Métrica |
|-----------|-----------|---------|
| **Performance — Mês** | Carrega em ≤1.5s | P95 |
| **Performance — Ano** | Carrega em ≤3s (12 meses × muitas categorias) | P95 |
| **Performance — Plano** | Calcula projeção 12m em ≤2s | P95 |
| **Consistência** | Somas do Ano batem com soma dos Meses com erro ≤R$ 0,01 | Teste automatizado |
| **Consistência de princípios** | Em qualquer mês, a soma de % realizado = 100% exato | Teste automatizado |
| **Cobertura mínima** | 100% das transações têm princípio (mapping ou default) | Teste automatizado |
| **Reatividade** | Mudança de mês via MonthPicker atualiza todas as seções da aba em ≤500ms | — |

---

## 14. Métricas de sucesso

Concretas e verificáveis no uso real:

| Métrica | Como medir | Meta |
|---------|------------|------|
| **Aposentadoria da planilha** | Planilha não é mais aberta / atualizada pelo casal | 3 meses após lançamento |
| **Adoção pela esposa** | Sessões dela por semana (Tailscale-User-Login) | ≥5/semana |
| **Confiança na previsão** | Resultado previsto × realizado a cada mês, desvio médio | <15% |
| **Tempo de entendimento** | Tempo entre "abro o app" e "sei se sobrou dinheiro" | <10s (auto-reportado) |
| **Uso da dimensão Princípio** | Transações com tag `principio:` / total (quando override é necessário) | — (só observar) |

---

## 15. Riscos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| R1 | Mapping categoria → princípio incompleto gera classificações erradas | Alta (início) | Médio | Dashboard destaca visualmente categorias sem mapping. Settings inline permitem corrigir sem deploy. Mapeamento inicial vem do diagnóstico da planilha, já cobre ~90% do histórico. |
| R2 | Aba Plano depende de `~ monthly` declarado, e usuário não declara | Alta | Alto | Mensagem clara "Plano está vazio porque você não tem transações periódicas". Link para documentação e para skill `hledger-fatura` (Claude Code). Magic Import (Fase 1) resolve definitivamente. |
| R3 | Reforma da aba Fluxo (grafo de nós custom) é trabalho de visualização pesado | Média | Médio | Implementação incremental: primeiro grafo estático (SVG/canvas), depois interatividade. Recharts tem primitivas (`Scatter`, `Layer`) que aceleram. |
| R4 | Aba Ano fica lenta em journals grandes | Média | Médio | Cache no backend: resultado de `/api/principles/yearly` tem TTL curto, invalidado quando journal muda (hash). |
| R5 | Divergência entre números do dashboard e planilha assusta o casal no início | Baixa | Baixo | Doc de "o que mudou" explicando por que alguns números diferem (ex: transferências não são mais receitas, previdência é investimento não despesa). Ver §3 do diagnóstico. |
| R6 | Overhead cognitivo de aprender princípios | Baixa | Baixo | Eles já usam há anos. Mudança é só "não precisa mais classificar duas vezes". |

---

## 16. Plano de implementação

### 16.1. Pré-requisitos

- **Fase 0 (Estabilização) concluída**, pelo menos Ondas 1-3 (backend modular + frontend em `features/*/`).
- `HledgerClient` tipado em produção.
- `InlineSettings` component disponível (Fase 0, Onda 5).

### 16.2. Fases

**Fase D1 — Fundação do Princípio (~1 semana)**

- `backend/app/principles/` com resolver, mappings, testes.
- Endpoint `/api/principles/summary?month=`.
- Arquivo `principles.json` inicial com todo o mapping derivado do diagnóstico.
- **Entregável:** API retorna soma por princípio do mês corretamente. Sem UI nova ainda.

**Fase D2 — Aba Mês reformada (~1 semana)**

- Componente `features/mes/` reformado com 5 seções (Receitas, Saldo, Meta Princípio, Categorias, Top 10).
- Aba "Resumo" renomeada para "Mês".
- Settings inline para editar metas de princípio.
- **Entregável:** usuário abre o app e vê receitas primeiro, metas por princípio funcionando.

**Fase D3 — Aba Ano (~1 semana)**

- Endpoint `/api/principles/yearly?year=`.
- Endpoint `/api/categories/yearly?year=` (já pode existir parcialmente).
- Componente `features/ano/` com as 3 vistas (categoria / princípio / grupo).
- Settings inline de vista default e heatmap.
- **Entregável:** matriz anual funcional, substitui Consolidado da planilha.

**Fase D4 — Aba Plano (~2 semanas)**

- Detectar e listar recorrentes (`~ monthly`) e parceladas do journal via `hledger --forecast` e tags.
- Modelo de metas de longo prazo (persistido em SQLite).
- Componente `features/plano/` com 3 vistas (próximos meses, decaimento, metas).
- Settings inline de horizonte e metas.
- **Entregável:** previsão 6-12m funcional, base para Magic Import.

**Fase D5 — Aba Fluxo reformada (~1-2 semanas)**

- Componente de grafo de nós (SVG custom ou Recharts primitives).
- Interação hover/click para expandir entrada/saída.
- Transferências como linhas sob demanda.
- **Entregável:** Sankey atual aposentado, visão clara de "sobrou onde, saiu de onde".

**Fase D6 — Polimento e status de transação (~1 semana)**

- Renderização diferenciada para cleared/pending/forecast.
- Aba Transações com filtro de princípio.
- Aba Patrimônio renomeada, hero card com sparkline.
- **Entregável:** dashboard coeso, pronto para aposentar a planilha.

### 16.3. Total estimado

**6-8 semanas de trabalho ativo**, em sequência com Fase 0 e precedendo Fase 1 (Magic Import).

### 16.4. Integração com Magic Import

Este PRD é **pré-requisito conceitual** do Magic Import:

- A staging area do Magic Import precisa mostrar o **princípio sugerido** de cada transação (derivado do mapping).
- A revisão na staging pode ajustar categoria **ou** tag de princípio.
- Parcelamentos detectados na fatura viram `~ monthly from X to Y` no journal → alimentam a aba Plano.

---

## 17. Questões em aberto

1. **Metas de longo prazo: onde vivem?** Propus SQLite local. Alternativa: tags no journal (`; meta: poupanca-2026`). SQLite é mais fácil de editar na UI; tag é mais transparente e versionável com git. **Preferência inicial: SQLite**, mas vale discutir.
2. **Simulador de "se eu pagar adiantado"** na aba Plano: MVP ou v2? Tem valor alto, complexidade média.
3. **Visualização do grafo de Fluxo: SVG custom vs Recharts vs biblioteca externa?** Dependendo da complexidade visual que a gente quer, pode valer a pena trazer uma lib (vis.js, d3-force, Cytoscape). Precisa spike visual antes de decidir.
4. **Aba Patrimônio: rename afeta alguma integração/URL?** Se for só UI, trivial. Se endpoint `/api/accounts` vai ser renomeado, precisa alias de compat.
5. **Princípio "Reserva de Oportunidade" com meta 0%:** como visualizar? Some dos princípios mostrados? Mostra só quando tem valor? Aparece sempre com fundo neutro?

---

## 18. Próximos passos

1. **Você revisa** este PRD e marca discordâncias.
2. A gente fecha as 5 questões da §17.
3. Ajusto os outros documentos (Diagnóstico, PRD Magic Import, Estabilização) para coerência com este.
4. Entra na fila **após** Fase 0 (Estabilização). Ideal começar pela Fase D1 assim que o backend modular estiver estável.

---

*Fim do documento v0.1.*
