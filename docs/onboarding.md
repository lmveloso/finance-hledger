# Onboarding — finance-hledger

Guia completo para configurar o projeto finance-hledger: dashboard, hledger CLI, MCP e skills de IA.

## 1. Pre-requisitos

| Ferramenta | Versao minima | Instalacao |
|---|---|---|
| hledger | 1.52+ | [hledger.org/install](https://hledger.org/install.html) |
| Python | 3.11+ | Sistema ou pyenv |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| hledger-mcp | 1.0+ | `npm install -g @iiatlas/hledger-mcp` |

### Verificar instalacao

```bash
hledger --version        # hledger 1.52
python3 --version        # Python 3.11+
node --version           # v18+
hledger-mcp --help       # deve mostrar ajuda
```

## 2. Setup do Projeto

```bash
git clone <repo-url> finance-hledger
cd finance-hledger

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

## 3. Setup do Journal

### Opcao A: Journal existente

Se voce ja tem um journal hledger:

```bash
export LEDGER_FILE=/caminho/para/seu/main.journal

# Verificar integridade
hledger -f $LEDGER_FILE check
hledger -f $LEDGER_FILE accounts   # deve listar suas contas
```

### Opcao B: Criar novo journal

```bash
mkdir -p ~/finances
```

Criar `~/finances/accounts.journal`:

```hledger
; Chart of Accounts

account assets
account assets:banco:corrente
account assets:banco:poupanca

account liabilities
account liabilities:cartao

account income
account income:salario
account income:rendimentos

account expenses
account expenses:alimentacao
account expenses:moradia
account expenses:transporte
account expenses:saude
account expenses:educacao
account expenses:lazer

account equity
account equity:saldo-inicial
```

Criar `~/finances/main.journal`:

```hledger
include accounts.journal

; Saldos iniciais — usar a data do ultimo extrato bancario
; Ajustar contas e valores para sua realidade
2026-01-01 Saldos iniciais
    assets:banco:corrente          BRL 5000.00
    assets:banco:poupanca          BRL 20000.00
    equity:saldo-inicial

; Budget mensal (opcional — habilita aba Orcamento no dashboard)
~ monthly
    expenses:alimentacao           BRL 2500.00
    expenses:moradia               BRL 4000.00
    expenses:transporte            BRL 1500.00
    expenses:saude                 BRL 1000.00
    expenses:lazer                 BRL 800.00
    assets:banco:corrente          BRL -9800.00
```

Definir variavel de ambiente:

```bash
export LEDGER_FILE=~/finances/main.journal
```

## 4. Configuracao MCP (para agente de IA)

### Claude Code

Adicionar ao `.claude/settings.json` do projeto ou globalmente:

```json
{
  "mcpServers": {
    "hledger": {
      "command": "hledger-mcp",
      "args": ["/caminho/absoluto/para/main.journal"]
    }
  }
}
```

### Outro agente MCP

O hledger-mcp aceita o path do journal como argumento:

```bash
hledger-mcp /caminho/absoluto/para/main.journal
```

Configurar no seu cliente MCP com:
- **command**: `hledger-mcp`
- **args**: `["/caminho/absoluto/para/main.journal"]`
- **timeout**: 30 segundos

> **Importante**: o path deve ser **absoluto** (ex: `/home/user/finances/main.journal`). Paths relativos ou com `~` podem nao funcionar.

### Multiplos journals

Para journals separados (ex: pessoal + empresa), configurar dois servidores MCP:

```json
{
  "mcpServers": {
    "hledger-pessoal": {
      "command": "hledger-mcp",
      "args": ["/home/user/finances/pessoal/main.journal"]
    },
    "hledger-empresa": {
      "command": "hledger-mcp",
      "args": ["/home/user/finances/empresa/main.journal"]
    }
  }
}
```

## 5. Skills de IA

O projeto inclui skills para agentes de IA no diretorio `skills/`:

| Skill | Descricao |
|---|---|
| `hledger-base` | Referencia: MCP tools, estrutura de journal, validacao, pitfalls |
| `hledger-extrato` | Importar extratos bancarios (conta corrente, poupanca) |
| `hledger-fatura` | Importar faturas de cartao de credito |

### Como funciona

Os skills ensinam o agente de IA a:
- Parsear extratos em multiplos formatos (JSON, PDF, CSV, imagem)
- Classificar transacoes automaticamente usando `skills/data/payee-categories.json`
- Perguntar sobre itens ambiguos antes de registrar
- Escrever transacoes no journal via hledger MCP ou arquivo direto
- Validar integridade apos cada importacao

### Usando com Claude Code

Ao abrir o projeto no Claude Code, os skills sao descobertos automaticamente. Basta pedir:

- "Importar este extrato" (anexar PDF/JSON)
- "Registrar esta fatura do cartao XP" (anexar fatura)

### Usando com outro agente

Copiar o conteudo dos SKILL.md para a configuracao de skills/prompts do seu agente. O agente precisa ter acesso ao hledger-mcp e ao arquivo `payee-categories.json`.

## 6. Personalizando Categorias

O arquivo `skills/data/payee-categories.json` contem o mapeamento de payees para contas hledger. Para personalizar:

1. Editar o JSON adicionando seus payees recorrentes
2. Cada entrada tem: `patterns` (substrings para match), `account` (conta hledger), `tag` (tipo orcamentario)
3. Marcar itens que precisam de confirmacao com `"ambiguous": true`

Exemplo:

```json
{
  "patterns": ["Padaria Pao Quente"],
  "account": "expenses:alimentacao:supermercado",
  "tag": "CUSTOS FIXOS",
  "notes": "padaria do bairro"
}
```

## 7. Rodando o Dashboard

### Desenvolvimento

```bash
# Terminal 1 — backend
cd backend && source .venv/bin/activate
export LEDGER_FILE=/caminho/para/main.journal
uvicorn main:app --reload --port 8080

# Terminal 2 — frontend
cd frontend
npm run dev
# Abre em http://localhost:5173
```

### Producao (homelab)

```bash
cd frontend && npm run build
cd ../backend
uvicorn main:app --host 0.0.0.0 --port 8080
# Acesse via http://<ip-da-maquina>:8080
```

Com Tailscale:

```bash
tailscale serve --bg 8080
# Acesse via https://<hostname>.tailnet-name.ts.net
```

### Docker

```bash
export LEDGER_PATH=/caminho/para/diretorio/do/journal
docker compose up --build
# Acesse via http://localhost:8080
```

### systemd

Copiar `finance-hledger.service.example`, ajustar paths e:

```bash
sudo cp finance-hledger.service /etc/systemd/system/
sudo systemctl enable --now finance-hledger
```
