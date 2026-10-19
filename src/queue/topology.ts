import type { Channel } from "amqplib";

export const PAYMENTS_PROCESS_QUEUE = "payments.process";
export const PAYMENTS_DEAD_LETTER_QUEUE = "payments.dead-letter";

export function retryQueueName(delayMs: number): string {
  return `payments.retry.${delayMs}ms`;
}

const assertedChannels = new WeakMap<Channel, Promise<void>>();

async function declareMainQueues(channel: Channel): Promise<void> {
  await channel.assertQueue(PAYMENTS_PROCESS_QUEUE, { durable: true });
  await channel.assertQueue(PAYMENTS_DEAD_LETTER_QUEUE, { durable: true });
}

export function assertTopology(channel: Channel): Promise<void> {
  let declaration = assertedChannels.get(channel);
  if (!declaration) {
    declaration = declareMainQueues(channel);
    declaration.catch(() => assertedChannels.delete(channel));
    assertedChannels.set(channel, declaration);
  }
  return declaration;
}

export async function assertRetryQueues(channel: Channel, delaysMs: number[]): Promise<void> {
  for (const delayMs of delaysMs) {
    await channel.assertQueue(retryQueueName(delayMs), {
      durable: true,
      arguments: {
        "x-message-ttl": delayMs,
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": PAYMENTS_PROCESS_QUEUE,
      },
    });
  }
}
