# finance-hledger

Dashboard pessoal e familiar de finanças conectado ao [hledger](https://hledger.org/).
Roda inteiro no homelab, acessível via Tailscale no celular e no computador.

![stack](https://img.shields.io/badge/stack-FastAPI%20%2B%20React-d4a574)

## Arquitetura

```
┌──────────────────┐     Tailscale      ┌──────────────────────┐
│ Celular/Desktop  │ ◄────────────────► │ Homelab              │
│ (PWA no browser) │  http://homelab:8080│ ├─ FastAPI (porta 8080)│
└──────────────────┘                    │ │   ├─ /api/* (JSON) │
                                        │ │   └─ / (React SPA) │
                                        │ └─ hledger (CLI)     │
                                        │     └─ .journal      │
                                        └──────────────────────┘
```

Um único processo (FastAPI) serve tanto a API quanto o frontend compilado.
Isso simplifica o deploy no homelab.

> **No futuro:** se quiser separar, basta rodar `npm run dev` no frontend
> apontando para a URL do backend (vide `frontend/.env.example`) e hospedar
> os estáticos em outro lugar (Vercel, Netlify, nginx). O CORS já está
> preparado pra isso.

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export LEDGER_FILE=~/finances/2026.journal   # seu arquivo hledger
uvicorn main:app --reload --port 8080
```

API disponível em `http://localhost:8080/api/*`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev          # dev server com hot-reload
```

Abre em `http://localhost:5173` (proxy automático pro backend via Vite).

### 3. Deploy no homelab

```bash
cd frontend && npm run build    # gera frontend/dist/
cd ../backend
uvicorn main:app --host 100.x.x.x --port 8080   # IP Tailscale
```

Pronto. Acesse `http://<seu-homelab>:8080` pelo Tailscale — o FastAPI serve
o SPA e a API na mesma porta.

Para HTTPS automático com autenticação Tailscale integrada:
```bash
tailscale serve --bg 8080
```

## Configurando budget e metas

No seu `.journal` do hledger:

```hledger
; Orçamento mensal
~ monthly  orçamento
    expenses:moradia           R$ 4000
    expenses:alimentação       R$ 2200
    expenses:transporte        R$ 2000
    expenses:lazer             R$ 1200
    expenses:saúde             R$ 1500
    assets:orçamento
```

Metas de economia são configuradas no frontend via `frontend/src/config.js`.

## Integração com Agente de IA

O projeto inclui skills para agentes de IA (Claude Code, etc.) que auxiliam na
gestão dos journals hledger — importação de extratos bancários, classificação
de despesas e validação de saldos. Veja [docs/onboarding.md](docs/onboarding.md)
para instruções de configuração.

## Estrutura

```
finance-hledger/
├── backend/          # FastAPI + wrapper do hledger
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/         # React + Vite + Recharts
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── skills/           # Skills para agentes de IA
│   ├── hledger-base/
│   ├── hledger-extrato/
│   ├── hledger-fatura/
│   └── data/payee-categories.json
├── docs/
│   └── onboarding.md
├── docker-compose.yml (opcional)
└── README.md
```

## Licença

MIT. Uso pessoal/familiar.
