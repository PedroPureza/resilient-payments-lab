# Processamento de Pagamentos em Arquiteturas Distribuídas

Projeto Final II (TCC) — Curso de Análise e Desenvolvimento de Sistemas, UNISINOS.
Pedro Henrique Quadrado Pureza.

Simulador de backend de processamento de pagamentos que explora **idempotência**,
**processamento assíncrono via filas** e **retry sob falha** em sistemas
distribuídos.

## Stack

- Node.js + TypeScript + Express
- PostgreSQL
- RabbitMQ
- Docker Compose

## Como rodar

Pré-requisitos: Docker Desktop, Node.js 20+.

Primeira vez:

```bash
cp .env.example .env
npm install
npm run lab:up              # sobe containers + migrations + API (ver abaixo)
```

Nas vezes seguintes, um único comando reinicia os containers (sem apagar os
dados do Postgres), aplica migrations pendentes e sobe a API:

```bash
npm run lab:up              # API em http://localhost:3000 (GET /health)
```

Passo a passo manual equivalente, caso precise rodar cada parte à parte:

```bash
docker compose up -d       # sobe Postgres + RabbitMQ
npm run db:migrate         # aplica as migrations no banco
npm run dev                # API em http://localhost:3000 (GET /health)
```

O processamento dos pagamentos acontece num processo separado, o worker, que
consome a fila `payments.process`:

```bash
npm run worker             # consome payments.process, aplica retry e DLQ
```

Variáveis do worker (ver `.env.example`):

| Variável | Default | Efeito |
|---|---|---|
| `FAILURE_RATE` | `0` | Probabilidade (0 a 1) de uma tentativa de processamento falhar |
| `FAILURE_MODES` | `exception,timeout,unavailable` | Tipos de falha simulada sorteados quando há falha |
| `CHAOS_TIMEOUT_MS` | `300` | Atraso antes de falhar no modo `timeout` |
| `MAX_ATTEMPTS` | `4` | Tentativas totais por pagamento (`1` desliga o retry) |
| `RETRY_BASE_DELAY_MS` | `1000` | Atraso do 1º retry; cada retry seguinte multiplica por 4 (1s, 4s, 16s) |

Ao esgotar as tentativas, o pagamento fica `FAILED` e a mensagem vai para a fila
`payments.dead-letter`. Toda a linha do tempo de cada pagamento fica em
`payment_events`.

```bash
npm test                   # roda a suíte de testes (Vitest)
```

## Testando com Postman

Com a API no ar (`npm run lab:up`), importe
[`postman/payment-labs.postman_collection.json`](postman/payment-labs.postman_collection.json)
no Postman: cobre o health check, criação de pagamento (caso de sucesso e os
casos de validação de `amount`/`currency`) e consulta por `id` (sucesso, `404`
e `id` malformado). A variável `paymentId` é preenchida automaticamente pela
request "Create Payment" para as demais requests reaproveitarem.

Também roda via CLI (útil pra checar rápido sem abrir o Postman):

```bash
npx newman run postman/payment-labs.postman_collection.json
```
