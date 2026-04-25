# PRD — Visão Mensal do Dashboard

**Status:** Design conceitual
**Última atualização:** 25/04/2026
**Autor:** Lucas
**Escopo:** Especifica a estrutura, conteúdo e comportamento da tela de visão mensal do dashboard financeiro familiar. Não cobre as telas de detalhamento (drill-downs de cartão, parcelas vivas, categorias) nem a visão anual ou de patrimônio — essas terão specs próprias.

**Documentos relacionados:**
- `07-PRD-dashboard-cartao-credito.md` — fundamentação contábil que motiva a estrutura desta tela
- `adr/010-parcelamento-transacao-unica.md` — decisão de modelagem que sustenta a noção de "compromisso assumido"

---

## 1. Contexto e Objetivo

A visão mensal é a **tela âncora** do dashboard. É onde a esposa entra para responder rapidamente: "como estamos esse mês?". É a tela que ela vai consultar com mais frequência — possivelmente diariamente — em mobile.

O objetivo é permitir que ela responda em poucos segundos:

- Sobrou ou faltou dinheiro esse mês?
- Quanto entrou e quanto saiu?
- Quanto a gente está devendo no cartão?

E que, quando quiser entender mais profundamente, possa expandir cada um desses pontos sem sair da tela ou perder o contexto.

---

## 2. Princípios de Design

### 2.1 Progressive disclosure como princípio central

A tela tem dois níveis de detalhe que coexistem:

- **Estado padrão (compacto):** apenas os números essenciais visíveis. Cinco a seis linhas, escaneáveis em um olhar.
- **Estado expandido:** o usuário aciona um card e revela seu detalhamento, sem sair da tela.

A motivação é evitar poluição visual. Em sessões anteriores, exploramos versões com tudo visível ao mesmo tempo, e o resultado virou um painel denso onde a hierarquia se perde. A regra agora é: **só aparece o que precisa aparecer; o resto está a um clique de distância.**

### 2.2 Hierarquia de informação por importância

A ordem de cima para baixo na tela reflete a sequência de perguntas naturais da esposa:

1. **Sobrou?** (resultado)
2. **De onde veio?** (receita)
3. **Pra onde foi?** (despesa)
4. **O que devemos?** (cartões)

Essa ordem é deliberada e não deve ser alterada sem motivo claro.

### 2.3 Mínima carga conceitual

A esposa não é especialista em contabilidade. A tela deve apresentar números intuitivos sem exigir conhecimento prévio sobre regime de competência, regime de caixa, ou lançamentos contábeis. O modelo subjacente (definido no PRD-04) é correto contabilmente; a tela traduz isso em linguagem natural.

---

## 3. Estrutura da Tela — Estado Padrão

A tela em estado padrão é composta por, em ordem:

### 3.1 Cabeçalho

- Seletor de mês com botões de navegação anterior/posterior
- Atalho para alternar para a visão anual

### 3.2 Card "Sobrou no mês"

- **Rótulo:** "Sobrou no mês"
- **Valor:** o resultado de receita − despesa do mês (regime de competência)
- **Tratamento visual:** número grande, cor positiva quando ≥ 0, cor de alerta quando < 0
- **Indicador de expansão:** ícone que sinaliza que o card pode ser aberto para detalhamento

Este é o card **âncora** da tela. Sua posição (topo) e tamanho (maior) refletem que é a resposta principal.

### 3.3 Linha "Receita"

- Rótulo "Receita"
- Valor total de receitas do mês
- Indicador que o card pode ser expandido para detalhamento

### 3.4 Linha "Despesa"

- Rótulo "Despesa"
- Valor total de despesas do mês (regime de competência — todo consumo do mês, independente de quando o pagamento ocorre)
- Indicador que o card pode ser expandido para detalhamento

### 3.5 Linha "Cartões"

- Rótulo "Cartões"
- Texto auxiliar abaixo do rótulo: "devendo R$ X · ↑/↓ R$ Y" — saldo total devedor e variação no mês
- A variação tem cor (positiva quando dívida diminuiu, alerta quando cresceu) e seta direcional
- Indicador que o card pode ser expandido

### 3.6 Rodapé

- Indicação da data e hora da última atualização dos dados
- Texto discreto, centralizado

**Não aparecem na visão mensal:**

- Patrimônio (tem tela própria)
- Alocação estratégica por tags (foi movida para a visão anual)

---

## 4. Estados Expandidos

Cada um dos cards pode ser expandido para revelar detalhamento. O conteúdo de cada expansão é descrito a seguir.

### 4.1 "Sobrou no mês" expandido

Ao expandir, o card revela a decomposição do cálculo:

- **Receita** — valor (mesmo da linha 3.3)
- **Despesa** — valor total (mesmo da linha 3.4), seguido de sub-itens recuados:
  - "↳ saiu da conta" — parcela da despesa que foi paga via débito direto, boletos, transferências
  - "↳ foi pro cartão" — parcela da despesa que foi consumida em cartão de crédito (ainda não paga)
- **Pagamento de fatura no mês** — valor pago em faturas de cartão durante o mês

A subtração visual é receita − despesa = sobra. O pagamento de fatura aparece logo abaixo, sem texto explicativo, mas com tratamento visual diferente (separado do bloco principal de cálculo) para sinalizar que é informação correlata, não componente da soma.

A decomposição "saiu da conta + foi pro cartão" deixa claro que despesa total inclui todo o consumo do mês, mesmo o que foi parar no cartão e ainda não foi pago.

### 4.2 "Receita" expandido

Ao expandir, o card revela:

- Lista de tipos de receita do mês (salário, rendimentos, freelance, etc.) com valores
- Total de receitas

A estrutura espelha o padrão de drill-down de despesas, mas tipicamente com menos hierarquia (receita raramente tem subcategorias profundas).

*Nota: o detalhamento exato de receita pode ter especificação própria em iteração futura. Por ora, basta uma lista simples.*

### 4.3 "Despesa" expandido

Ao expandir, o card revela:

- Lista de categorias-pai do mês com:
  - Nome da categoria
  - Percentual sobre o total de despesas
  - Valor total
  - Barra horizontal proporcional ao valor
  - Indicador de que a categoria tem drill-down próprio
- Botão "Ver todas as categorias e maiores gastos" no final da lista, que leva à tela de drill-down completo

Cada categoria-pai listada é clicável e leva ao **drill-down de despesas em três níveis** (especificação separada). Os três níveis são: categorias-pai → categorias-filhas → transações.

### 4.4 "Cartões" expandido

Ao expandir, o card revela:

- Lista de cartões da família, cada um mostrando:
  - Nome do cartão e titular
  - Saldo devedor total (à direita, como número de destaque)
  - Texto auxiliar com gasto do mês e contagem de parcelas vivas
- Cada cartão é clicável e leva ao **drill-down do cartão individual** (especificação separada)

A composição visual de despesas (barra colorida com legenda) que existe no design atual fica reservada para o drill-down individual do cartão — na visão mensal, a lista de cartões é mais compacta.

---

## 5. Comportamento de Interação

### 5.1 Modelo de expansão híbrido

Quando o usuário expande um card:

- **"Sobrou no mês" é o card âncora.** Quando qualquer outro card é expandido, "Sobrou" volta ao estado fechado. Isso preserva o foco e evita a tela ficar muito carregada com o card âncora aberto desnecessariamente.
- **"Receita", "Despesa" e "Cartões" podem coexistir abertos.** O usuário pode abrir múltiplos para comparar lado a lado.

### 5.2 Acionamento da expansão

Toda a área do card (não apenas o ícone) é clicável para expandir/recolher. Isso aumenta a área útil de toque, especialmente em mobile.

### 5.3 Tratamento visual

O visual exato do estado expandido (cor de fundo, espaçamento, transições) será detalhado em iteração futura. O princípio orientador é:

- **Não usar o visual de acordeão clássico** (linhas empilhadas com bordas marcadas)
- O card expandido deve **compor com o background da página**, não destacar-se como caixa rígida
- A transição entre estados deve ser suave e preservar a posição do card âncora (a sobra) sempre que possível

### 5.4 Navegação para drill-downs

A partir dos estados expandidos, o usuário pode navegar para telas de detalhamento mais profundo:

| Origem                          | Destino                           |
| ------------------------------- | --------------------------------- |
| Categoria de despesa expandida  | Drill-down de despesas (3 níveis) |
| Cartão na lista expandida       | Drill-down do cartão individual   |
| Botão "Ver todas as categorias" | Tela completa de despesas         |

Essas telas-destino têm specs próprias e são consideradas fora do escopo deste PRD.

---

## 6. Considerações Técnicas

### 6.1 Cálculo da sobra

A sobra do mês é estritamente:

```
Sobra = Receita do mês (competência) − Despesa do mês (competência)
```

Onde "despesa por competência" inclui todo consumo cuja data de fato gerador caiu no mês, independente de:

- Quando o pagamento foi efetuado
- Se foi pago em conta corrente ou em cartão de crédito
- Se foi parcelado (lançamentos parcelados são reconhecidos integralmente na data da compra original, conforme ADR-010)

Pagamentos de fatura de cartão **não entram** no cálculo da sobra. Eles são amortização de passivo de despesas anteriores.

### 6.2 Decomposição "saiu da conta + foi pro cartão"

No estado expandido de "Sobrou no mês":

- **Saiu da conta** = soma de despesas do mês cuja contrapartida foi um ativo (banco, conta corrente, débito automático)
- **Foi pro cartão** = soma de despesas do mês cuja contrapartida foi um passivo de cartão de crédito

A soma das duas é igual à despesa total do mês.

### 6.3 Variação da dívida

O texto auxiliar "devendo R$ X · ↑/↓ R$ Y" no card de Cartões usa:

- **Saldo devendo** = soma dos saldos atuais de todas as contas `passivo:cartao:*` na data de hoje
- **Variação** = saldo no fim do mês de referência − saldo no início do mês de referência

A seta e a cor refletem o sinal: dívida crescendo é alerta, dívida diminuindo é positivo.

### 6.4 Última atualização retroativa

Como lançamentos podem ser feitos retroativamente (regra de auto-cura definida no PRD-04 §3.3.2), os números de meses passados podem mudar quando uma fatura nova é processada. A indicação de "última atualização" no rodapé existe para que o usuário saiba quando os dados foram atualizados pela última vez.

---

## 7. Critérios de Aceitação

A visão mensal está completa quando:

**Estado padrão:**
- A tela mostra cabeçalho, sobra, receita, despesa, cartões e rodapé — nada além disso
- Cada um dos quatro cards (sobra, receita, despesa, cartões) é claramente acionável
- A linha de cartões mostra saldo devedor total e variação do mês com cor adequada

**Estados expandidos:**
- "Sobrou no mês" expandido decompõe a equação corretamente, mostra o pagamento de fatura como item separado, e reflete a decomposição "saiu da conta + foi pro cartão"
- "Receita" expandido mostra a lista de tipos de receita do mês
- "Despesa" expandido mostra categorias-pai com percentuais, valores e barras, e cada uma é clicável
- "Cartões" expandido mostra a lista de cartões com saldo devedor, gasto do mês e contagem de parcelas vivas

**Comportamento:**
- Expandir Receita, Despesa ou Cartões fecha automaticamente "Sobrou"
- Receita, Despesa e Cartões podem ficar abertos simultaneamente
- Toda a área do card é clicável para expansão
- Cards expandidos compõem visualmente com a página, sem visual de acordeão clássico

**Cálculos:**
- Sobra = receita do mês − despesa do mês (ambas por competência)
- Pagamento de fatura aparece informativamente no detalhamento de "Sobrou", mas não entra no cálculo
- Saldo devedor de cartões = soma de todos os passivos de cartão na data atual
- Variação da dívida = saldo no fim do mês − saldo no início

**Patrimônio e alocação estratégica não aparecem nesta tela.**

---

## 8. Fora do Escopo

- **Tela de patrimônio:** terá spec própria
- **Visão anual:** terá spec própria, incluindo a alocação estratégica por tags
- **Drill-down de despesas em três níveis:** terá spec própria
- **Drill-down de cartão individual:** terá spec própria
- **Drill-down de parcelas vivas:** terá spec própria
- **Tela de transações:** já existe e será iterada separadamente
- **Refinamento visual final:** cores, espaçamentos, transições, tipografia — serão detalhados em iteração de design futura. Este PRD captura apenas estrutura, conteúdo e comportamento.

---

## 9. Próximos Passos

1. **Validar este PRD** com a esposa antes de avançar para implementação
2. **Especificar as telas de drill-down** (cartão individual, parcelas vivas, despesas em três níveis) com PRDs próprios
3. **Especificar a visão anual** com PRD próprio, incluindo a alocação estratégica
4. **Iniciar implementação** do estado padrão, e em seguida cada estado expandido
5. **Iteração visual** uma vez que estrutura e comportamento estejam estáveis