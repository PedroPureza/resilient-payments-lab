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

## Status atual

*(Última atualização: 15/08/2026)*

**Fase 0 (setup do ambiente) concluída.** `docker compose up` sobe PostgreSQL +
RabbitMQ (management UI em `:15672`); projeto Node + TypeScript inicial com
Express, Kysely (driver Postgres), Vitest e `pino` configurados; endpoint
`GET /health` funcionando e coberto por teste de integração.

Ainda sem tabelas/migrations, sem fila conectada e sem lógica de negócio —
isso começa na Fase 1.

**Próximo passo:** Fase 1 — modelagem de dados (migrations `payments`,
`idempotency_keys`, `payment_events`).

## Como rodar

Pré-requisitos: Docker Desktop, Node.js 20+.

```bash
cp .env.example .env
docker compose up -d      # sobe Postgres + RabbitMQ
npm install
npm run dev                # API em http://localhost:3000 (GET /health)
npm test                   # roda a suíte de testes (Vitest)
```
