import type { Channel } from "amqplib";

export const PAYMENTS_PROCESS_QUEUE = "payments.process";

export async function assertTopology(channel: Channel): Promise<void> {
  await channel.assertQueue(PAYMENTS_PROCESS_QUEUE, { durable: true });
}
