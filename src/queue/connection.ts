import amqp, { type ConfirmChannel } from "amqplib";
import { env } from "../shared/env.js";
import { logger } from "../shared/logger.js";

let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
let channelPromise: Promise<ConfirmChannel> | undefined;

function forgetConnection(): void {
  channelPromise = undefined;
  connection = undefined;
}

async function openChannel(): Promise<ConfirmChannel> {
  const opened = await amqp.connect(env.rabbitmqUrl, { noDelay: true });
  opened.on("error", (err: unknown) => logger.error({ err }, "RabbitMQ connection error"));
  opened.on("close", () => {
    if (connection === opened) {
      logger.warn("RabbitMQ connection closed, it will be reopened on next use");
      forgetConnection();
    }
  });
  connection = opened;
  const channel = await opened.createConfirmChannel();
  channel.on("error", (err: unknown) => logger.error({ err }, "RabbitMQ channel error"));
  channel.on("close", () => {
    if (connection === opened) {
      forgetConnection();
      opened.close().catch(() => undefined);
    }
  });
  return channel;
}

export function getChannel(): Promise<ConfirmChannel> {
  if (!channelPromise) {
    channelPromise = openChannel();
    channelPromise.catch(() => forgetConnection());
  }
  return channelPromise;
}

export async function closeConnection(): Promise<void> {
  const openConnection = connection;
  const channel = await channelPromise?.catch(() => undefined);
  forgetConnection();
  await channel?.close().catch(() => undefined);
  await openConnection?.close().catch(() => undefined);
}
