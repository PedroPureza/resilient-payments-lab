import { fileURLToPath } from "node:url";
import type { ConsumeMessage } from "amqplib";
import { getChannel } from "../queue/connection.js";
import { publishConfirmed } from "../queue/publisher.js";
import {
  assertRetryQueues,
  assertTopology,
  PAYMENTS_DEAD_LETTER_QUEUE,
  PAYMENTS_PROCESS_QUEUE,
} from "../queue/topology.js";
import { env } from "../shared/env.js";
import { logger } from "../shared/logger.js";
import { type ChaosConfig, chaosConfigFromEnv } from "./chaos/failure-simulator.js";
import { processPayment, type ProcessingDependencies } from "./payment-processor.js";
import { type RetryPolicy, retryDelays, retryPolicyFromEnv } from "./retry-policy.js";

export interface WorkerOptions {
  chaos?: ChaosConfig;
  retryPolicy?: RetryPolicy;
  simulate?: ProcessingDependencies["simulate"];
  prefetch?: number;
}

export interface RunningWorker {
  stop: () => Promise<void>;
}

export async function startWorker(options: WorkerOptions = {}): Promise<RunningWorker> {
  const channel = await getChannel();
  const retryPolicy = options.retryPolicy ?? retryPolicyFromEnv();
  const dependencies: ProcessingDependencies = {
    channel,
    chaos: options.chaos ?? chaosConfigFromEnv(),
    retryPolicy,
    simulate: options.simulate,
  };
  await assertTopology(channel);
  await assertRetryQueues(channel, retryDelays(retryPolicy));
  const prefetch = options.prefetch ?? env.workerPrefetch;
  await channel.prefetch(prefetch);

  async function handleMessage(msg: ConsumeMessage): Promise<void> {
    const rawContent = msg.content.toString();
    try {
      const message = JSON.parse(rawContent);
      const outcome = await processPayment(message, dependencies);
      logger.info({ paymentId: message.paymentId, outcome }, "payment message handled");
    } catch (err) {
      logger.error({ err }, "unexpected error processing payment message, moving it to DLQ");
      try {
        await publishConfirmed(channel, PAYMENTS_DEAD_LETTER_QUEUE, {
          rawContent,
          lastError: err instanceof Error ? err.message : String(err),
        });
      } catch (publishErr) {
        logger.error({ err: publishErr }, "failed to move message to DLQ, requeueing it");
        channel.nack(msg, false, true);
        return;
      }
    }
    channel.ack(msg);
  }

  const { consumerTag } = await channel.consume(PAYMENTS_PROCESS_QUEUE, (msg) => {
    if (msg) {
      void handleMessage(msg);
    }
  });

  logger.info(
    { chaos: dependencies.chaos, retryPolicy, retryDelaysMs: retryDelays(retryPolicy), prefetch },
    `Worker consumindo ${PAYMENTS_PROCESS_QUEUE}`,
  );

  return {
    stop: async () => {
      await channel.cancel(consumerTag);
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startWorker()
    .then(async () => {
      const channel = await getChannel();
      channel.once("close", () => {
        logger.error("RabbitMQ channel closed, exiting so the worker can be restarted");
        process.exit(1);
      });
    })
    .catch((err: unknown) => {
      logger.error({ err }, "worker failed to start");
      process.exit(1);
    });
}
