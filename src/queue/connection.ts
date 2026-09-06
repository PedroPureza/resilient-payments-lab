import amqp, { type Channel } from "amqplib";
import { env } from "../shared/env.js";

let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
let channel: Channel | undefined;

export async function getChannel(): Promise<Channel> {
  if (channel) {
    return channel;
  }
  connection = await amqp.connect(env.rabbitmqUrl);
  channel = await connection.createChannel();
  return channel;
}

export async function closeConnection(): Promise<void> {
  await channel?.close();
  await connection?.close();
  channel = undefined;
  connection = undefined;
}
