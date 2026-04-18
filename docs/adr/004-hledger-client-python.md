# ADR-004: Interface com hledger via módulo Python interno (`hledger_client.py`)

**Status:** Accepted
**Date:** 2026-04
**Phase origin:** Fase 0 (Estabilização) / Fase 1 (Magic Import)
**Supersedes:** —
**Superseded by:** —

## Context

O backend precisa ler e escrever no journal hledger. Existiam três opções:
1. **MCP estrito** — usar `iiAtlas/hledger-mcp` (servidor MCP em Node) para ler e escrever.
2. **CLI estrito ad-hoc** — cada endpoint invocando `subprocess` do jeito que achar melhor.
3. **Escrita direta no arquivo** — backend manipula o `.journal` diretamente como texto.

## Decision

**Módulo Python interno** `app/hledger/client.py` que encapsula `subprocess` ao `hledger` CLI. Retorna modelos Pydantic. É o **único ponto** do sistema autorizado a invocar o binário do hledger.

- Leitura: `hledger ... -O json`, parse em Pydantic.
- Escrita: geração de texto de transação → cópia `.bak` → append no journal → `hledger check` → rollback se check falhar.
- Nunca chamar `hledger` fora desse módulo. Nunca editar `.journal` fora desse módulo.

## Consequences

### Positivas
- Testável (mock de `subprocess` em unit tests).
- Rápido (zero serialização de protocolo MCP, zero processo Node extra).
- Debugável num único stack trace Python.
- "Journal é sagrado" — toda escrita passa por um ponto de controle.
- Se no futuro quisermos expor esse cliente como servidor MCP (para Claude Desktop, por exemplo), é **aditivo**, não substitutivo.

### Negativas
- Mais uma camada interna para manter.
- Se hledger mudar shape do JSON, o parse quebra (mitigado: parsers unificados e testes com journal fixture).

## Alternatives considered

- **MCP estrito (`iiAtlas/hledger-mcp`)**: MCP faz sentido quando se comunica com um cliente externo que não controlamos. Como backend e CLI vivem na mesma máquina sob nosso controle, MCP adiciona um processo Node, serialização JSON e latência de stdio sem benefício real.
- **CLI estrito ad-hoc**: é o estado atual (que já é uma dor no `main.py`). Sem encapsulamento, parsing se duplica, testes ficam frágeis.
- **Escrita direta no arquivo**: viola "journal é sagrado" — sem `hledger check` antes do commit, bugs de sintaxe vão parar no journal real.

## Observação de uso real

O `hledger-mcp` já foi testado no projeto via Claude Code (skills `hledger-base`, `hledger-extrato`, `hledger-fatura`) e **funciona**, mas os agentes tendem a contornar o MCP e escrever texto direto no journal. Esse risco **não existe no Magic Import** porque o LLM devolve JSON estruturado e é o backend Python (determinístico) quem persiste.

## Related
- `docs/01-ESTABILIZACAO.md` §3.2 (`HledgerClient` como classe central)
- `docs/03-PRD-magic-import.md` §9 (stack)
