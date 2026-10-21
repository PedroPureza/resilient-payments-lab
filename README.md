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

Pré-requisitos: Docker Desktop (e Node.js 20+ para desenvolver ou rodar os testes).

### Ambiente completo (um comando)

```bash
docker compose up -d --build
```

Sobe Postgres, RabbitMQ, aplica as migrations (serviço `migrate`) e inicia a
API (http://localhost:3000, `GET /health`) e o worker. A management UI do
RabbitMQ fica em http://localhost:15672 (`payments` / `payments`).

As variáveis da tabela abaixo podem ser passadas na linha de comando, por
exemplo `FAILURE_RATE=0.5 docker compose up -d worker`.

### Desenvolvimento

```bash
cp .env.example .env
npm install
npm run lab:up              # sobe só Postgres + RabbitMQ, aplica migrations e roda a API em watch
npm run worker              # em outro terminal: worker em watch
```

Para desenvolver ou rodar os testes, use só a infraestrutura
(`docker compose up -d postgres rabbitmq`): com a API e o worker do Compose no
ar, a porta 3000 fica ocupada e o worker do container consumiria as mensagens
que os testes esperam encontrar na fila. Se eles estiverem rodando, pare-os com
`docker compose stop api worker`.

```bash
npm test                   # roda a suíte de testes (Vitest)
```

## Como funciona

1. `POST /payments` (header `Idempotency-Key` obrigatório) grava o pagamento
   como `PENDING` e responde `202 Accepted`. Repetir a mesma chave devolve a
   resposta original sem criar outro pagamento (`409` se a primeira ainda está
   em andamento; `422` se o corpo for diferente).
2. Pagamento, evento `CREATED` e a mensagem para a fila são gravados na mesma
   transação (tabela `outbox_messages`). A API publica a mensagem logo após o
   commit; se o RabbitMQ estiver indisponível, um relay periódico publica
   depois.
3. O worker consome `payments.process`, simula o gateway (com falhas
   configuráveis) e aprova o pagamento ou agenda um retry com atraso crescente
   (`payments.retry.<atraso>ms`, TTL + dead-letter exchange de volta para
   `payments.process`).
4. Ao esgotar as tentativas, o pagamento fica `FAILED` e a mensagem vai para
   `payments.dead-letter`. Toda a linha do tempo fica em `payment_events`.

## Variáveis de ambiente

| Variável | Default | Efeito |
|---|---|---|
| `IDEMPOTENCY_ENABLED` | `true` | Liga/desliga o middleware de idempotência |
| `IDEMPOTENCY_LOCK_TIMEOUT_MS` | `30000` | Por quanto tempo uma chave `IN_PROGRESS` fica reservada; depois disso pode ser retomada (ex.: a requisição original caiu) |
| `IDEMPOTENCY_KEY_TTL_MS` | `86400000` | Por quanto tempo uma chave concluída devolve a resposta salva (24 h) |
| `OUTBOX_RELAY_INTERVAL_MS` | `1000` | Intervalo do relay do outbox |
| `OUTBOX_RELAY_MIN_AGE_MS` | `5000` | Idade mínima de uma mensagem pendente para o relay assumir |
| `FAILURE_RATE` | `0` | Probabilidade (0 a 1) de uma tentativa de processamento falhar |
| `FAILURE_MODES` | `exception,timeout,unavailable` | Tipos de falha simulada sorteados quando há falha |
| `CHAOS_TIMEOUT_MS` | `300` | Atraso antes de falhar no modo `timeout` |
| `MAX_ATTEMPTS` | `4` | Tentativas totais por pagamento (`1` desliga o retry) |
| `RETRY_BASE_DELAY_MS` | `1000` | Atraso do 1º retry; cada retry seguinte multiplica por 4 (1s, 4s, 16s) |
| `WORKER_PREFETCH` | `10` | Quantas mensagens o worker processa ao mesmo tempo |

## Experimentos

Com a infraestrutura no ar (`docker compose up -d postgres rabbitmq`) e a
porta 3100 livre:

```bash
npm run experiments -- --repetitions=3          # todos os cenários
npm run experiments -- --only=01-baseline --repetitions=1
npm run experiments:summary                     # consolida em CSV
```

Os cenários estão em `experimentos/scenarios/scenarios.ts`. Cada rodada usa um
banco (`payments_experiments`) e um vhost RabbitMQ (`experiments`) próprios,
sobe uma API e um worker com os parâmetros do cenário, envia a carga
(incluindo requisições duplicadas de propósito) e grava parâmetros e métricas
em `experimentos/resultados/<cenário>/`.

## Testando com Postman

Com a API no ar, importe
[`postman/payment-labs.postman_collection.json`](postman/payment-labs.postman_collection.json)
no Postman: cobre o health check, criação de pagamento (caso de sucesso e os
casos de validação de `amount`/`currency`) e consulta por `id` (sucesso, `404`
e `id` malformado). A variável `paymentId` é preenchida automaticamente pela
request "Create Payment" para as demais requests reaproveitarem.

Também roda via CLI (útil pra checar rápido sem abrir o Postman):

```bash
npx newman run postman/payment-labs.postman_collection.json
```
