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

_(Última atualização: 24/08/2026)_

**Fase 1 (modelagem de dados) concluída.** Migrations criadas e aplicadas para
as três tabelas centrais — `payments`, `idempotency_keys`, `payment_events` —
com as constraints que sustentam o mecanismo de idempotência (`PRIMARY KEY` em
`idempotency_keys.key`, `FOREIGN KEY`s para `payments`, `CHECK` nos campos de
status). Tipos do Kysely (`src/db/types.ts`) espelham o schema. Teste
automatizado prova a constraint `UNIQUE` sob duplicidade de chave.

Ainda sem API de pagamentos, sem fila conectada e sem lógica de negócio — isso
começa na Fase 2.

**Próximo passo:** Fase 2 — API core síncrona (`POST /payments` e
`GET /payments/:id`, sem fila/idempotência ainda).

## Como rodar

Pré-requisitos: Docker Desktop, Node.js 20+.

```bash
cp .env.example .env
docker compose up -d      # sobe Postgres + RabbitMQ
npm install
npm run db:migrate         # aplica as migrations no banco
npm run dev                # API em http://localhost:3000 (GET /health)
npm test                   # roda a suíte de testes (Vitest)
```
