import { fileURLToPath } from "node:url";
import { getChannel } from "../queue/connection.js";
import { assertTopology, PAYMENTS_PROCESS_QUEUE } from "../queue/topology.js";
import { logger } from "../shared/logger.js";
import { processPayment } from "./payment-processor.js";

export async function startWorker(): Promise<void> {
  const channel = await getChannel();
  await assertTopology(channel);
  await channel.prefetch(1);

  await channel.consume(PAYMENTS_PROCESS_QUEUE, (msg) => {
    if (!msg) {
      return;
    }
    processPayment(JSON.parse(msg.content.toString()))
      .then(() => channel.ack(msg))
      .catch((err: unknown) => {
        logger.error({ err }, "failed to process payment message");
        channel.nack(msg, false, false);
      });
  });

  logger.info(`Worker consumindo ${PAYMENTS_PROCESS_QUEUE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startWorker();
}
