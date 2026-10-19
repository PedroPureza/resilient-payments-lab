import amqp, { type Channel } from "amqplib";
import { env } from "../shared/env.js";

let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
let channelPromise: Promise<Channel> | undefined;

async function openChannel(): Promise<Channel> {
  connection = await amqp.connect(env.rabbitmqUrl, { noDelay: true });
  return connection.createChannel();
}

export function getChannel(): Promise<Channel> {
  channelPromise ??= openChannel();
  return channelPromise;
}

export async function closeConnection(): Promise<void> {
  const channel = await channelPromise;
  await channel?.close();
  await connection?.close();
  channelPromise = undefined;
  connection = undefined;
}
