import { db } from "../db/connection.js";
import {
  lockUnpublishedOutboxMessages,
  markOutboxMessagesPublished,
} from "../repositories/outbox.repository.js";
import { env } from "../shared/env.js";
import { logger } from "../shared/logger.js";
import { getChannel } from "./connection.js";
import { publishConfirmed } from "./publisher.js";
import { assertTopology } from "./topology.js";

export interface OutboxRelayOptions {
  minAgeMs: number;
  batchSize: number;
}

export async function relayPendingOutboxMessages(options: OutboxRelayOptions): Promise<number> {
  const channel = await getChannel();
  await assertTopology(channel);
  return db.transaction().execute(async (trx) => {
    const messages = await lockUnpublishedOutboxMessages(trx, options.minAgeMs, options.batchSize);
    for (const message of messages) {
      await publishConfirmed(channel, message.queue, message.payload);
    }
    if (messages.length > 0) {
      await markOutboxMessagesPublished(
        messages.map((message) => message.id),
        trx,
      );
    }
    return messages.length;
  });
}

export function startOutboxRelay(): () => void {
  let running = false;
  const timer = setInterval(() => {
    if (running) {
      return;
    }
    running = true;
    relayPendingOutboxMessages({ minAgeMs: env.outboxRelayMinAgeMs, batchSize: 100 })
      .then((relayed) => {
        if (relayed > 0) {
          logger.warn({ relayed }, "outbox relay published messages the fast path had missed");
        }
      })
      .catch((err: unknown) => logger.error({ err }, "outbox relay failed"))
      .finally(() => {
        running = false;
      });
  }, env.outboxRelayIntervalMs);
  return () => clearInterval(timer);
}
