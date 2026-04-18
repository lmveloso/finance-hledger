# Diagnóstico da planilha & Insights para repensar o Dashboard

**Versão:** 0.2 (questões fechadas, evoluiu para PRD Dashboard 2.0)
**Autor:** Claude + [você]
**Data:** Abril/2026
**Arquivo analisado:** `2026_Controle_financeiro.xlsx`
**Status:** Questões em aberto fechadas na v0.2. Evoluiu para o [PRD Dashboard 2.0](./PRD-dashboard-v2.md).
**Este documento é histórico de análise.** Para decisões finais, ver o PRD.

---

## 1. Como a planilha está organizada

A planilha tem 15 abas:
- `Consolidado` — visão anual de tudo (aba-mãe).
- `Gráfico` — explicitamente fora do escopo desta análise.
- `Janeiro` a `Dezembro` — uma por mês, lançamentos individuais.
- `Planejamento` — objetivos, metas e dívidas de cartão em parcelas.

### 1.1. Fluxo natural de uso

Pelo que observo, o fluxo semanal/mensal é:

1. Abre a aba do **mês atual** (ex: `Abril`).
2. Vê **receitas no topo** (4-6 lançamentos, poucos, grandes).
3. **Totais logo abaixo**: receitas, despesas, resultado líquido.
4. **Meta vs realizado por princípio** (`CUSTOS FIXOS`, `CONFORTO`, etc) — uma matriz de 7 linhas × 4 colunas mostrando % meta, % atual, R$ total, R$ meta.
5. **Lista de despesas** embaixo — muitas linhas, ordenadas por dia, com 6 colunas: controle (PG/PR), dia, descrição, valor, categoria, princípio.

Depois, periodicamente, ele/ela abre `Consolidado` para:
- Ver o ano inteiro de uma vez
- Comparar meses lado a lado
- Ver totais acumulados por categoria

### 1.2. Dupla taxonomia

Isso é o achado mais importante da análise: **toda despesa tem DUAS classificações**, não uma.

**Dimensão 1 — Categoria funcional** (~60 valores):
`Moradia - Energia elétrica`, `Alimentação - Supermercado`, `Transporte - Combustível`, etc. É uma taxonomia de dois níveis: grupo (10 grupos) + subcategoria.

**Dimensão 2 — Princípio/meta** (7 valores):
`CUSTOS FIXOS`, `CONFORTO`, `METAS`, `PRAZERES`, `LIBERDADE FINANCEIRA`, `AUMENTAR RENDA`, `RESERVA DE OPORTUNIDADE`.

Isso é sofisticado. Vem de uma metodologia (DSOP ou similar): a ideia é que você pode orçar por categoria (clássico) **e também** por princípio de vida. O orçamento por princípio é onde vocês definem "40% em custos fixos, 25% em liberdade financeira, 5% em prazeres". Isso é uma visão comportamental/filosófica de gasto, não apenas contábil.

### 1.3. Hierarquia de grupos

Os 10 grupos funcionais:
1. Moradia
2. Alimentação
3. Transporte
4. Saúde
5. Educação
6. Lazer
7. Doações
8. Despesas pessoais
9. Animais
10. Obrigações financeiras

---

## 2. O que funciona na planilha (e precisa sobreviver)

Listando em ordem de importância para a sua esposa:

### 2.1. Ordem "receitas primeiro"

A aba mensal começa com **receitas claramente em destaque no topo**, poucos valores, grandes. Isso não é detalhe estético — é uma afirmação de modelo mental: **"primeiro sei o que entrou; depois decido como gastar"**.

O dashboard atual começa pelo saldo acumulado (que mistura entrada e saída) e por categorias de despesa. A esposa sente que "falta o começo".

### 2.2. Consolidado anual numa tela só

A aba `Consolidado` tem **o ano inteiro visível simultaneamente**: cada categoria é uma linha, cada mês é uma coluna. Você bate o olho e vê:
- "Supermercado explodiu em Março"
- "Telefone está estável"
- "Viagens só teve gasto em Março (viagem de Floripa)"

O dashboard atual **não tem essa visão**. As abas são todas mensais ou de 12 meses agregados (sem granularidade mensal visível ao mesmo tempo por categoria).

### 2.3. Meta por princípio, não só por categoria

A tabela de meta na planilha é por **princípio** (CUSTOS FIXOS, CONFORTO, PRAZERES, etc), não por categoria funcional. Isso permite um tipo de leitura comportamental que o dashboard atual não suporta:
- "Estou acima de 40% em custos fixos — está apertando."
- "Estou abaixo de 5% em prazeres — a vida anda dura."
- "Liberdade financeira em 2% em Fevereiro — não investi nada este mês."

### 2.4. Marcação de status da transação

A coluna A tem `PG` (pago) ou `PR` (previsto, imagino). Isso é muito importante: **permite registrar transações futuras sem contaminar o realizado**. É como uma staging area manual.

O dashboard atual não tem esse conceito. Tudo que está no journal é "realidade confirmada".

### 2.5. Descrição original preservada

As despesas lançadas por cartão preservam a descrição bruta do extrato: `MERCADOLIVRE*MERCADOLIVRE`, `RAIA3170`, `SUPERMERCADO RINC`. Isso é útil para:
- Rastrear uma transação de volta à fatura
- Categorização futura (o que o Magic Import vai fazer com RAG)

### 2.6. Planejamento vinculado à execução

A aba `Planejamento` tem:
- Objetivos de longo prazo (O1: redução de dívida, O2: recomposição de poupança, O3: aumentar previdência, O4: planejamento)
- Metas mensais concretas (ex: "Guardar 20% da renda", "Despesas < R$ 7.000")
- Lista de **parcelas de cartão de crédito em aberto** (valor, parcelas pagas, parcelas totais, finalização, cartão)

O último ponto é crucial: **vocês rastreiam dívida ativa de cartão como um backlog a zerar**. Isso é algo que o dashboard não tem e que poderia ser muito útil.

---

## 3. O que não funciona na planilha (e pode/deve aposentar)

### 3.1. Erros matemáticos evidentes

Na seção "Meta vs realizado por princípio" do Consolidado (L126), o total das categorias por mês passa de 100%:
- Janeiro: 109%
- Fevereiro: 53%
- Março: **174%** (!)
- Abril: 70%

Isso denuncia dois problemas:
- **140 transações com princípio `??`** (não classificado) — quase **metade** das despesas. Sem isso, os percentuais não fecham.
- Meta para `RESERVA DE OPORTUNIDADE` e `METAS` sempre zerada, então o 100% idealizado nunca pode ser atingido.

A planilha virou frágil porque depende de disciplina manual de categorização dupla.

### 3.2. Divergência entre abas

Comparando `Janeiro` com o `Consolidado`:
- `Janeiro` diz: Total de despesas = **R$ 48.856,96**
- `Consolidado` diz (L98, Janeiro): Total de despesas = **R$ 48.856,96** ✓

OK, esse fecha. Mas:
- `Consolidado` L93 diz: Total de despesas Jan = **R$ 45.361,00** (!)

Ou seja, o Consolidado tem **duas células de "Total de despesas" com valores diferentes** para o mesmo mês. Erro clássico de planilha grande: fórmulas duplicadas não mantidas em sincronia.

### 3.3. Categoria "Outros" como depósito de lixo

Dentro de quase toda categoria há um `Outros` que vira receptáculo de tudo que não coube. Em Janeiro:
- `Alimentação - Outros`: R$ 644,90 (= uma única transação: "Conveniência Tatu Auto Posto")
- `Despesas pessoais - Outros`: R$ 131,85
- `Educação - Outros`: R$ 1.047,00 (inclui "Aula piano Ana Cecília")

Isso mostra que a taxonomia não cobre casos reais. No novo modelo, ou a taxonomia tem um "nenhuma das anteriores" explícito com revisão obrigatória, ou tem granularidade maior.

### 3.4. Confusão entre receita e movimentação interna

Na aba `Janeiro`, as "receitas" incluem:
- `Retirada Lucas` (2 lançamentos: R$ 35.000 + R$ 2.847) — parece salário/pro-labore
- `Retirada Giovanna` (R$ 3.300)
- `Retirada Poupança` (R$ 3.000) — **isso não é receita, é transferência entre contas**

Misturar transferências com receitas infla o total de receitas e distorce todas as metas de poupança. O hledger resolve isso naturalmente (transferência é transferência, não receita), mas só se a categorização for feita certa.

### 3.5. Dimensão "princípio" subutilizada

Apesar da estrutura permitir orçamento por princípio, **140 de 317 transações em Janeiro têm princípio `??`** (44%). Ou seja, a ferramenta mais poderosa da planilha (classificação dupla) é usada pela metade.

**Causa provável:** custo cognitivo de classificar duas vezes. **Solução no dashboard:** deduzir automaticamente o princípio a partir da categoria funcional + descrição, com confidence baixa forçando revisão.

### 3.6. Sem patrimônio líquido

A planilha só olha fluxo (receita − despesa = saldo mensal). Não tem visão de **estoque** (ativos − passivos = patrimônio). Isso é o que o dashboard já faz bem na aba `Patrimônio`, e deveria ser mais visível.

### 3.7. Sem transferência entre contas explícita

Transferências entre Conta Corrente ↔ Poupança ↔ Cartão aparecem como "movimentação indistinguível". Na aba Janeiro, não há modo nativo de registrar "saiu R$ 3.000 da poupança, entrou R$ 3.000 na conta corrente". Isso já é um problema conhecido do PRD e foi decidido resolver no Magic Import (ADR-05).

### 3.8. Previdência aparece como despesa

`Obrigações financeiras - Previdência Privada` é classificado como despesa. Mas contabilmente, **previdência privada é investimento, não despesa** (o dinheiro continua seu, só muda de conta). Classificar como despesa parece inflar o "consumo" e esconder o "patrimônio crescendo".

O princípio `LIBERDADE FINANCEIRA` tenta corrigir isso ao agrupar, mas a confusão permanece no nível da categoria funcional.

### 3.9. Totais manuais e congelados

Os totais mensais do `Consolidado` parecem estar **hardcoded** (valores sem fórmula). Assim que um lançamento é adicionado na aba mensal, o Consolidado fica desatualizado até alguém mexer nele. Isso é a fonte dos totais divergentes da §3.2.

### 3.10. Controle `PG`/`PR` inconsistente

A coluna de controle está preenchida em 26 de 280+ transações em Janeiro. A maioria não está marcada. Impossível saber se isso significa "todas pagas" ou "nem todas marcadas". Um status de fato só funciona se é obrigatório.

---

## 4. O modelo mental da sua esposa (e de vocês dois juntos)

Sintetizando em 5 regras:

**R1. Tudo começa pela receita.**
A receita é o chão; a despesa é o teto. Você não olha despesas sem antes saber o piso do mês.

**R2. Mês é a unidade natural de controle.**
Um mês tem começo (receita cai), meio (gastos acontecem) e fim (resultado líquido). O ano é uma sequência de 12 meses, não um agregado contínuo.

**R3. Categoria responde "em quê", princípio responde "por quê".**
"Gastei em supermercado" é factual; "gastei em custos fixos" é valorativo. Vocês querem ver as duas coisas.

**R4. Metas são explícitas e comparáveis.**
Não basta "gastei R$ 48 mil". É "a meta era R$ 40 mil, gastei R$ 48 mil, passei 20%".

**R5. Dívida é um projeto de curto prazo a zerar.**
Parcelas de cartão têm nome, valor, cronograma. Não ficam invisíveis no "total de cartão".

---

## 5. Onde o dashboard atual choca com esse modelo

Mapeando R1-R5 contra as abas atuais:

| Modelo mental | Dashboard atual | Fricção |
|---|---|---|
| R1. Receita primeiro | Aba Resumo começa com "Saldo do mês" como KPI principal, depois categorias de despesa | **Alta.** Saldo não é receita. Receita nem aparece como seção dedicada. |
| R2. Mês como unidade | Aba Resumo é mensal, mas o "ano todo" (Consolidado) não existe | **Alta.** A aba Consolidado da planilha não tem equivalente no dashboard. |
| R3. Categoria + princípio | Dashboard só tem categoria | **Total.** Princípio não existe no modelo de dados nem na UI. |
| R4. Metas comparáveis | Aba Orçamento compara, mas só por categoria (periodic transactions). Não por princípio. Não por grupo. | **Média.** Funciona em parte. |
| R5. Dívida ativa | Não existe no dashboard | **Total.** Nenhuma aba fala de parcelas de cartão ou dívida projetada. |

**Conclusão curta:** o dashboard atual é competente como visualizador de hledger, mas não fala a língua do casal. Ele é "view sobre o journal", não "painel de controle familiar".

---

## 6. Propostas de mudança

Dividindo em três tiers: **obrigatório**, **recomendado**, **nice-to-have**.

### 6.1. Obrigatório (se quiser aposentar a planilha)

**M1. Aba Ano (equivalente ao Consolidado).**
Uma aba nova que mostra **matriz categoria × mês** do ano inteiro, com totais de linha e coluna. Leitura clássica de planilha, que é o que a esposa sabe ler. Pode ter toggle entre "valor R$" e "% do mês". Heatmap opcional, mas não essencial.

**M2. Seção "Receitas" no topo da aba Resumo.**
Antes de mostrar saldo e categorias de despesa, uma seção dedicada às receitas do mês: lista de 4-6 linhas grandes (descrição + valor), total destacado. Só depois vêm despesas.

**M3. Conceito de Princípio no modelo de dados.**
O journal precisa saber que cada transação pertence a um princípio. Três opções:
- **Tag no hledger** (`; princípio: custos-fixos`) — mais leve, não muda o plano de contas.
- **Sub-conta** (`expenses:custos-fixos:moradia:...`) — mais estrutural, mas duplica a hierarquia.
- **Mapeamento por categoria** (`expenses:moradia:energia` sempre é `custos-fixos`) — simples, mas não permite exceções.

Minha recomendação: **tag do hledger**, com fallback para mapeamento padrão por categoria. Exceções ficam como tags explícitas; regra geral fica inferida.

**M4. Aba Orçamento por princípio.**
Além do orçamento atual por categoria, adicionar modo de visualização **por princípio**, com as metas 40/20/5/5/25/5/0 do DSOP como sugestão padrão. Permitir editar as metas.

### 6.2. Recomendado

**M5. Aba Dívida.**
Lista de parcelas ativas de cartão (nome, valor parcela, parcelas pagas/total, valor restante, data de fim). Isso vem de tags no hledger (`; parcelamento: X/Y; fim: YYYY-MM`) ou de um arquivo auxiliar. Visão gráfica: barra empilhada mostrando o decaimento previsto da dívida ao longo dos próximos meses.

**M6. Status da transação (confirmada vs prevista).**
Equivalente ao `PG`/`PR` da planilha. hledger já suporta via `!` (pendente) e `*` (cleared) ou via tags. Dashboard mostra transações previstas em cinza/opaco, separadas das confirmadas.

**M7. "Saldo depois das contas fixas".**
Conceito da planilha por princípio: quanto sobra após custos fixos. Indicador-chave: **receita - custos fixos = discricionário**. Motiva o comportamento de decisão: "tenho R$ X pra distribuir entre lazer, confortos e investimentos este mês".

**M8. Heatmap ano × categoria.**
Versão visual da aba Ano, mostrando intensidade de gasto. Permite detectar picos e sazonalidade de um olhar.

### 6.3. Nice-to-have

**M9. Comparação ano anterior.**
Jan 2026 ao lado de Jan 2025, categoria por categoria. Exige histórico de pelo menos 13 meses.

**M10. Projeção simples.**
"Se você mantiver esse ritmo, vai gastar R$ X no ano". Extrapolação linear é suficiente.

**M11. Alertas de anomalia.**
"Supermercado está 40% acima da média dos últimos 3 meses" — algo parecido com o que o backend atual já faz (`/api/alerts`), mas mais destacado na UI.

---

## 7. Proposta de nova estrutura de abas

Atual (7 abas): Resumo, Fluxo, Orçamento, Previsão, Contas, Transações, [Importar futuro]

Proposta (reorganização, não adição):

| Aba | Foco | Status |
|-----|------|--------|
| **Mês** | (era "Resumo") Visão do mês atual: receitas → despesas → resultado → meta por princípio → top gastos | Reformar |
| **Ano** | (nova) Matriz categoria × mês do ano todo, com totais | Nova |
| **Fluxo** | Mantém — movimentação entre contas | OK |
| **Orçamento** | Dois modos: por categoria (atual) OU por princípio (novo) | Estender |
| **Patrimônio** | (era "Contas") Ativos, passivos, net worth, evolução | Renomear |
| **Dívidas** | (nova) Parcelas de cartão ativas + projeção de decaimento | Nova |
| **Transações** | Mantém — busca e filtro | OK |
| **Importar** | Fase 1 / Magic Import | Futura |

E **aposentar "Previsão"** ao integrá-la como sub-visão de Orçamento e Dívidas.

A entrada default do app muda: em vez de cair em "Resumo", cai em **"Mês"** — mas a primeira seção dessa aba é receitas, não saldo. Isso resolve R1 e R2 de uma vez.

---

## 8. Relação com o trabalho de refatoração já planejado

Este trabalho não é independente — tem interseção pesada com o documento de Estabilização.

**Bom:** a refatoração do frontend (Ondas 2-3 do plano de estabilização) vai quebrar o `Dashboard.jsx` em `features/<aba>/`. **Isso precisa acontecer antes** de começar a mexer na estrutura de abas, ou vamos refatorar em cima de código que vai ser reorganizado. Seria retrabalho.

**Ordem sugerida:**

1. **Fase 0 (refatoração)** — conforme já planejado.
2. **Fase 0.5 (este documento)** — repensar abas depois que já é fácil mexer em cada feature isoladamente.
3. **Fase 1 (Magic Import)** — entra com as abas novas já alinhadas.

**Não recomendo** executar este trabalho em paralelo com a refatoração. Vamos misturar "mudança estrutural" com "mudança visível" e perder rastreabilidade do que quebrou.

Exceção: o **M2 (Receitas no topo da aba Resumo)** é barato e autocontido. Poderia ser feito sem refatoração grande, como um "respiro rápido" pra sua esposa antes do trabalho pesado.

---

## 9. Questões fechadas (evoluíram para o PRD Dashboard 2.0)

Respostas confirmadas nas próximas rodadas de discussão:

1. **Taxonomia de princípios:** mantida. Os 7 princípios vêm de um curso de finanças (DSOP). Metas: Custos Fixos 40%, Conforto 20%, Metas 5%, Prazeres 5%, Liberdade Financeira 25%, Aumentar Renda 5%, Reserva de Oportunidade 0%.
2. **Como registrar princípio no journal:** **mapeamento categoria → princípio** como regra geral (arquivo JSON no backend), com **override via tag** (`; principio: X`) apenas quando o caso específico foge do default. Zero fricção no uso diário.
3. **Metas de princípio:** globais do casal, editáveis nas Settings inline.
4. **Dívida como parcelamento:** derivada de transações periódicas `~ monthly from X to Y` no journal, com tag opcional `parcelamento:X/Y`. O Magic Import vai gerar essas declarações automaticamente. Por enquanto, usuário declara manualmente ou usa a skill `hledger-fatura`.
5. **Aba Ano:** ano-calendário (Jan-Dez) por padrão.
6. **Previsão sobrevive ou dissolve?** **Reposicionada.** Previsão deixa de ser aba e vira sub-vista dentro de uma nova aba **Plano**, que une Orçamento + Previsão + Dívida. Vocês já fazem previsão manual na planilha (copiando recorrentes); o hledger pode fazer automaticamente via `~ monthly` e `--forecast`.
7. **Aposentar planilha:** decisão tomada. Dashboard precisa cobrir o essencial, corrigir os vícios documentados em §3, e pode ser melhor que ela (não precisa replicar erros matemáticos).

### 9.1. Descobertas adicionadas na rodada subsequente

- **Aba Fluxo atual é confusa**: Sankey fica encavalado com sobreposição visual quando há muitas contas. Decisão: substituir por **grafo de nós** com delta destacado e expansão sob demanda. Pattern: "mostrar o estado" com "fluxo sob demanda" em vez de "mostrar o fluxo continuamente".
- **Previsão é função central, não nice-to-have.** A planilha permite ver o futuro copiando recorrentes para meses seguintes. O dashboard deve fazer o mesmo, porém automaticamente a partir de declarações `~ monthly` — e pode ir além (decaimento de dívida, metas vs projeção).
- **Pergunta-chave do casal é "sobrou onde, saiu de onde?"**. Não é sobre análise analítica; é sobre rastreabilidade do dinheiro. Afeta design da aba Mês (indicador "sobrou onde?") e Fluxo (deltas explícitos por conta).

---

## 10. Próximos passos (atualizado)

Este documento cumpriu seu papel. Evoluiu para:

- **[PRD Dashboard 2.0](./PRD-dashboard-v2.md)** — especificação completa da reforma.
- Impactos no [PRD Magic Import](./PRD-hledger-manager.md) — dimensão Princípio entra no modelo de dados da staging.
- Impactos no doc de [Estabilização](./ESTABILIZACAO-finance-hledger.md) — Dashboard 2.0 é fase intermediária entre Fase 0 e Fase 1.

---

*Fim do documento v0.2.*
