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

_(Última atualização: 29/08/2026)_

**Fase 2 (API core síncrona) concluída.** `POST /payments` e
`GET /payments/:id` funcionando de ponta a ponta, de forma totalmente
síncrona — um pagamento é criado e já marcado `APPROVED` na mesma requisição
(sem fila, sem idempotência ainda — isso vem nas Fases 3 e 4). Camadas
`routes` → `controllers` → `services` (`PaymentService`) →
`repositories` (`PaymentRepository`) seguindo `planejamento/01-arquitetura.md`.
Validação de entrada (`amount`, `currency`, formato de `id`) e tratamento de
erro centralizado (`error-handler.middleware.ts`) devolvendo `400`/`404`
apropriados. Testes de unidade do `PaymentService` (validação) e teste de
integração do endpoint (contra Postgres real) cobrindo os casos de sucesso e
erro. Ver `.claude/notes/fase-2.md` para o raciocínio completo, incluindo uma
nota sobre divisão de trabalho diferente do padrão Híbrido do `CLAUDE.md` para
esta fase específica.

**Próximo passo:** Fase 3 — filas e processamento assíncrono (`POST /payments`
passa a responder `202 Accepted` com status `PENDING`, publica na fila
`payments.process`; um worker separado consome e atualiza para `APPROVED`).

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
