# PRD — Tratamento de Cartão de Crédito e Zona de Passivos no Dashboard Financeiro

**Status:** Design conceitual
**Última atualização:** 24/04/2026
**Autor:** Lucas
**Escopo:** Adição ao design do dashboard financeiro familiar. Trata do problema de modelagem e visualização do cartão de crédito e dos compromissos financeiros pendentes. Não cobre o redesenho geral do dashboard (documentado separadamente).

---

## 1. Contexto

A família utiliza **hledger** como sistema contábil. Atualmente, a importação de transações é feita por um **agente de IA** equipado com skills específicas dentro do projeto. O **mágico import** é uma evolução prevista para uma fase posterior — a expectativa é estabilizar o sistema atual (modelagem, recursos, visualizações) antes de começar a implementá-lo.

O dashboard está sendo redesenhado para servir melhor à esposa, que é a principal usuária. O foco do dashboard é permitir que ela responda perguntas como "quanto sobrou esse mês?", "pra onde foi o surplus?" e "como está nossa saúde financeira?".

Ao trabalhar a modelagem do cartão de crédito, identificamos que o dashboard precisa explicitar uma dimensão que vai além de fluxo (entradas, saídas, surplus) e patrimônio: **os compromissos financeiros pendentes**, especificamente a dívida de cartão de crédito.

---

## 2. O Problema

### 2.1 Os três tempos do cartão de crédito

Toda fatura de cartão de crédito carrega três "tempos" diferentes que se cruzam:

1. **Quando a despesa foi gerada** (regime de competência) — a data da compra
2. **Quando a fatura fechou** (data de corte) — quando as compras foram consolidadas
3. **Quando o dinheiro saiu da conta** (regime de caixa) — a data de vencimento da fatura

A fatura analisada como exemplo (XP, vencimento 05/04/2026, R$ 13.375,57) ilustra bem:
- Tem uma compra de 28/01/2026 (Parcela 2/2 de viagem) — gerada três meses antes
- Tem compras de 25/02 a 24/03/2026 — geradas ao longo de dois meses
- Fechou em 25/03/2026
- Sai da conta em 05/04/2026

Modelos contábeis ingênuos tentam usar **um único tempo** para tudo, o que gera distorções:

- Lançar tudo na data de pagamento → distorce categorias (R$ 1.155 de viagem aparece em abril, quando a viagem foi em janeiro)
- Lançar tudo na data da compra **sem registrar passivo** → distorce o fluxo de caixa (parece que o dinheiro saiu antes de sair de fato)
- Ignorar o cartão e só registrar o pagamento → perde toda a granularidade categórica

### 2.2 A lacuna de visibilidade dos compromissos pendentes

Mesmo resolvendo a modelagem, sobra uma pergunta que o dashboard precisa responder claramente: **"quanto a gente já deve do cartão hoje?"**

Sem essa visão, é possível ter a falsa sensação de que "sobrou X esse mês" quando na verdade existe Y de fatura crescendo em paralelo. O caso clássico: o mês em que se compra passagens parceladas em 10x — naquele mês o fluxo de caixa parece ótimo (só a primeira parcela saiu), mas acaba-se de assumir um compromisso de 10x aquele valor.

A dívida de cartão **está implícita no patrimônio líquido** (Ativos − Passivos), mas a esposa não vai querer fazer essa conta de cabeça toda vez. Precisa estar visível.

### 2.3 Dores específicas

- Não há clareza imediata sobre **quanto vocês devem hoje** em compromissos de cartão
- Não há visibilidade sobre se a dívida está **crescendo, estável ou diminuindo** mês a mês
- O dashboard pode dar uma sensação enganosamente positiva de "saúde financeira" se ignorar passivos
- A relação entre o **gasto do mês** (competência) e a **fatura paga no mês** (caixa) precisa ficar clara

---

## 3. Solução

### 3.1 Modelagem no hledger: cartão como passivo

Tratar cada cartão de crédito como uma **conta de passivo** (não como despesa). Estrutura proposta:

```
passivo:cartao:xp-lucas
passivo:cartao:xp-giovanna
passivo:cartao:xp-lucas-7993
```

(uma conta por cartão/titular para permitir granularidade quando necessária)

Cada compra é registrada como uma transação dupla:

```
2026-02-26 ANILA RESTAURANTE
    despesas:alimentacao:restaurante    R$ 265,37
    passivo:cartao:xp-lucas
```

Cada pagamento de fatura é registrado como redução da dívida:

```
2026-04-05 Pagamento fatura XP
    passivo:cartao:xp-lucas             R$ 13.375,57
    ativo:banco:conta-corrente
```

**Resultado:** o sistema ganha automaticamente três visões consistentes:

| Visão | Como obter |
|---|---|
| Despesas por categoria (competência) | Soma das transações de despesa por data e categoria |
| Saída de caixa (regime de caixa) | Saída do `ativo:banco:*` na data do pagamento |
| Dívida de cartão hoje | Saldo de `passivo:cartao:*` na data atual |

### 3.2 Tratamento de compras parceladas

**Decisão:** lançar a despesa total e o passivo total **na data da compra original**, e tratar parcelas subsequentes apenas como cronograma de quitação (sem gerar novas despesas).

**Justificativa:** o **fato gerador da dívida** acontece na data da compra. Quando você compra algo em 5x, naquele momento você assumiu R$ 5×Y de compromisso, ponto. As parcelas são apenas o cronograma de pagamento — não são "novas despesas" nascendo mês a mês.

**Exemplo:** uma compra de R$ 5.000 em 5x feita em 15/01/2026 é lançada uma única vez:

```
2026-01-15 LOJA TAL
    despesas:lazer:viagem               R$ 5.000,00
    passivo:cartao:xp-lucas
```

Nas faturas dos meses seguintes, as linhas "Parcela 2/5", "Parcela 3/5" etc. **não geram lançamentos novos** — são apenas o cronograma da dívida que já está registrada.

**Consequência visual no dashboard:** o mês da compra parcelada aparece com a despesa total (refletindo o consumo real e a assunção do compromisso). Os meses seguintes não mostram essa despesa novamente, mas mostram a **redução do passivo** conforme as parcelas são pagas.

Os três números do dashboard contam a história inteira:

- **Despesa por categoria** (competência) → mostra os R$ 5.000 em janeiro, que é o consumo real
- **Saída de caixa** → mostra R$ 1.000/mês saindo, que é o impacto no orçamento mensal
- **Variação da dívida de cartão** → mostra +R$ 4.000 em janeiro (compromisso assumido) e −R$ 1.000/mês depois (pagando)

### 3.3 Regras para importação de fatura

Estas regras se aplicam ao processo atual (agente de IA com skills) e devem ser preservadas no mágico import quando ele for implementado.

#### 3.3.1 Identificação de parcelas

A fatura informa a **data da compra original** em todas as linhas de parcela, não a data de cobrança da parcela. Por exemplo, "PORTO RICO AQUA P - Parcela 2/2" com data 28/01/26 indica que a compra original ocorreu em 28/01/26 — esta é a data que importa para o lançamento.

#### 3.3.2 Regra única de processamento (auto-cura)

Para cada linha da fatura, o agente de importação verifica:

> Existe no hledger uma transação na data **D** (data da compra original) com valor total **Y × N** e descrição compatível?

| Resultado | Ação |
|---|---|
| **Existe** | Pular a linha — a compra já está registrada |
| **Não existe** | Lançar a transação retroativamente em D, com valor total e passivo |

Esta regra única funciona uniformemente para todos os casos:

| Caso | Comportamento |
|---|---|
| Compra à vista (sem indicador de parcela) | Lança normalmente na data da linha |
| Parcela 1/N de uma compra nova | Lança o total Y × N na data D |
| Parcela X/N de uma compra já registrada | Pula |
| Parcela X/N de uma compra anterior ao sistema (ou que escapou) | Lança retroativamente o total Y × N na data D |

A consequência elegante é que **não existe caso especial de migração inicial**. Quando o sistema começa a operar, ou se uma compra escapou por qualquer motivo, a parcela seguinte na fatura é suficiente para o sistema reconstruir a transação retroativamente. O hledger se mantém consistente independente do histórico.

#### 3.3.3 Match aproximado de descrição

A verificação de existência não pode ser feita só por data e valor (pode haver mais de uma compra no mesmo dia pelo mesmo valor). O match deve considerar:

- Data da compra (D) — exata
- Valor total esperado (Y × N) — exato
- Descrição — match aproximado (substring, fuzzy), porque faturas frequentemente truncam ou abreviam nomes ("PORTO RICO AQUA P" pode ter sido lançado como "PORTO RICO AQUA PARK" se outra fonte deu o nome completo)

Se a confiança do match for baixa (ex: descrição não bate, mas data e valor sim), o agente deve **levantar para confirmação humana** em vez de decidir automaticamente.

#### 3.3.4 Reconciliação contra a fatura

Ao final do processamento de uma fatura, deve ser verificado:

> O pagamento da fatura abate exatamente o valor cobrado do passivo? E o saldo restante do passivo corresponde a parcelas futuras + compras já feitas mas ainda não cobradas?

Se sim, a reconciliação está correta. Se não, há uma discrepância que precisa ser investigada antes de fechar o processamento.

### 3.4 Adições ao dashboard

**Adição 1 — Decomposição do patrimônio**

A zona superior deve mostrar o patrimônio decomposto, e não apenas o número líquido:

- Ativos líquidos (o que vocês têm)
- Dívidas de cartão (o que devem no curto prazo)
- Patrimônio líquido (a diferença)

Isso responde "pra onde foi o surplus?" de forma honesta — às vezes o surplus do mês foi simplesmente reduzir a dívida de cartão, e isso é bom mas não é "investimento".

**Adição 2 — Variação da dívida de cartão no mês**

Métrica: *Δ dívida de cartão = saldo no fim do mês − saldo no início do mês*

Interpretação:

- Variação positiva (dívida cresceu) → vocês estão financiando consumo, sinal de alerta
- Variação negativa (dívida diminuiu) → vocês estão se desalavancando
- Variação próxima de zero → estável

Esta métrica complementa o "surplus" tradicional. Surplus positivo com dívida crescendo é menos saudável do que parece; surplus pequeno com dívida caindo é mais saudável do que parece.

**Adição 3 — Saldo da dívida de cartão visível**

Um número claro: "Dívida de cartão hoje: R$ X". Consolidado por padrão (somando todos os cartões e titulares), com possibilidade de detalhar por cartão se necessário.

**Adição 4 — Indicação de "última atualização"**

Como a despesa pode ser lançada retroativamente em qualquer momento (via regra de auto-cura da seção 3.3.2), relatórios de meses passados podem mudar quando uma fatura nova é processada. O dashboard deve indicar a data da última atualização dos dados, deixando claro que números de meses passados podem se ajustar para mais preciso ao longo do tempo.

### 3.5 Posicionamento

A dívida de cartão entra na **zona superior**, junto com receitas/despesas/surplus/patrimônio. Razões:

- É uma informação de status geral (não de detalhamento)
- Complementa diretamente patrimônio líquido
- Precisa estar visível "de relance", sem entrar em telas de detalhe

---

## 4. Decisões e Justificativas

| Decisão | Alternativa rejeitada | Justificativa |
|---|---|---|
| Cartão como passivo no hledger | Cartão como despesa direta | Permite as três visões simultaneamente; é a modelagem contábil correta |
| Despesa total na data da compra | Parcela como despesa no mês da parcela | O fato gerador da dívida é a compra, não cada parcela. Parcelas são apenas cronograma de quitação |
| Regra única de auto-cura para importação | Caso especial de migração inicial | Funciona uniformemente para qualquer histórico; sem evento especial de transição |
| Match aproximado de descrição com fallback humano | Match exato | Faturas truncam/abreviam descrições; agente de IA pode pesar similaridade |
| Granularidade por cartão/titular | Conta única `passivo:cartao` | Permite detalhamento futuro sem perder consolidação |
| Dívida na zona superior | Zona separada de passivos | Hoje só existe cartão como passivo; não justifica zona dedicada |
| Mostrar ativos e passivos separadamente | Apenas patrimônio líquido | Esposa precisa ver os componentes, não só o resultado |

---

## 5. Fora do Escopo

- **Outras dívidas** (financiamentos, empréstimos, consórcios): não existem hoje. Se aparecerem no futuro, a estrutura `passivo:*` já comporta — basta adicionar `passivo:financiamento:*` etc. e a zona pode ser expandida.
- **Investback / cashback** do cartão XP: pode entrar como receita em conta separada quando relevante.
- **Compras em moeda estrangeira** (IOF, conversão): a fatura tem alguns lançamentos em USD com IOF separado. Tratamento detalhado fica para iteração posterior — por ora, lançar pelo valor em R$ já convertido.
- **Mágico import:** este PRD define regras que o agente atual deve seguir e que o mágico import deve preservar. A implementação do mágico import em si é uma fase posterior.

---

## 6. Próximos Passos

1. **Definir taxonomia final** das contas de passivo no hledger (nomes exatos por cartão/titular)
2. **Atualizar as skills do agente de IA** para aplicar as regras da seção 3.3 (parcelas, auto-cura, match aproximado, reconciliação)
3. **Testar com a fatura de abril/2026** (a do exemplo) — validar que os totais batem e a categorização está correta, incluindo a parcela 2/2 da viagem
4. **Implementar as adições do dashboard** (decomposição patrimonial, variação mensal de dívida, saldo visível, indicação de última atualização)
5. **Validar com a esposa** se as informações estão claras e respondem suas perguntas
6. **Quando o sistema estabilizar**, planejar a evolução para o mágico import preservando as regras aqui definidas

---

## 7. Critérios de Aceitação

A modelagem e o dashboard estão corretos quando, olhando para um mês qualquer, é possível responder com clareza:

- Quanto entrou em receita?
- Quanto saiu da conta corrente?
- Quanto a gente *gastou* (despesa por competência) — total e por categoria?
- Quanto a gente devia de cartão no início do mês?
- Quanto a gente deve agora?
- A dívida cresceu ou diminuiu? Em quanto?
- Sobrou dinheiro de fato (considerando a variação da dívida)?

E especificamente sobre o tratamento de fatura:

- Ao processar uma fatura, parcelas de compras já registradas são corretamente puladas?
- Compras anteriores ao sistema (ou que escaparam) são lançadas retroativamente quando uma parcela aparece na fatura?
- O pagamento da fatura abate exatamente o valor cobrado do passivo?
- O saldo do passivo após o processamento corresponde aos compromissos pendentes (parcelas futuras + compras já feitas mas ainda não cobradas)?

Se qualquer uma dessas perguntas exigir cálculo manual ou intervenção, o design ainda não está completo.
