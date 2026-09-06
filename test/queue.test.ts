import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { closeConnection, getChannel } from "../src/queue/connection.js";
import { publishToQueue } from "../src/queue/publisher.js";
import { assertTopology, PAYMENTS_PROCESS_QUEUE } from "../src/queue/topology.js";

describe("RabbitMQ queue scaffolding", () => {
  afterAll(async () => {
    await closeConnection();
  });

  it("publishes a message onto payments.process and consumes it back", async () => {
    const channel = await getChannel();
    await assertTopology(channel);

    const message = { paymentId: randomUUID() };
    publishToQueue(channel, PAYMENTS_PROCESS_QUEUE, message);

    const received = await new Promise((resolve) => {
      channel.consume(PAYMENTS_PROCESS_QUEUE, (msg) => {
        if (!msg) {
          return;
        }
        channel.ack(msg);
        resolve(JSON.parse(msg.content.toString()));
      });
    });

    expect(received).toEqual(message);
  });
});
