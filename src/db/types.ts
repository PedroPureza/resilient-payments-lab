/**
 * Schema do banco tipado para o Kysely. Vazio de propósito nesta fase —
 * as tabelas (`payments`, `idempotency_keys`, `payment_events`) e suas
 * migrations entram na Fase 1 (ver planejamento/02-plano-de-implementacao.md
 * e planejamento/01-arquitetura.md §2.3).
 *
 * Cada tabela adicionada aqui deve corresponder a uma migration em
 * src/db/migrations/.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- placeholder até a Fase 1 adicionar as tabelas
export interface Database {}
