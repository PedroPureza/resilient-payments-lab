import type { Channel, ConfirmChannel } from "amqplib";

export function publishToQueue(channel: Channel, queue: string, message: unknown): boolean {
  return channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
}

export function publishConfirmed(
  channel: ConfirmChannel,
  queue: string,
  message: unknown,
): Promise<void> {
  return new Promise((resolve, reject) => {
    channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
      (err: unknown) => (err ? reject(err) : resolve()),
    );
  });
}
