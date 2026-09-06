import type { Channel } from "amqplib";

export function publishToQueue(channel: Channel, queue: string, message: unknown): boolean {
  return channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
}
