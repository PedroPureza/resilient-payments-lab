import type { Channel } from "amqplib";
import { publishToQueue } from "../queue/publisher.js";
import { PAYMENTS_DEAD_LETTER_QUEUE, retryQueueName } from "../queue/topology.js";
import { recordPaymentEvent } from "../repositories/payment-event.repository.js";
import {
  startPendingPaymentAttempt,
  updatePaymentStatus,
} from "../repositories/payment.repository.js";
import {
  type ChaosConfig,
  SimulatedFailureError,
  simulateGatewayCall,
} from "./chaos/failure-simulator.js";
import { decideAfterFailure, type RetryPolicy } from "./retry-policy.js";

export interface PaymentProcessMessage {
  paymentId: string;
}

export type ProcessingOutcome = "approved" | "retry_scheduled" | "moved_to_dlq" | "skipped";

export interface ProcessingDependencies {
  channel: Channel;
  chaos: ChaosConfig;
  retryPolicy: RetryPolicy;
  simulate?: (config: ChaosConfig) => Promise<void>;
}

export async function processPayment(
  message: PaymentProcessMessage,
  dependencies: ProcessingDependencies,
): Promise<ProcessingOutcome> {
  const payment = await startPendingPaymentAttempt(message.paymentId);
  if (!payment) {
    return "skipped";
  }
  const attempt = payment.attempts;
  await recordPaymentEvent(payment.id, "PROCESSING", { attempt });

  const simulate = dependencies.simulate ?? simulateGatewayCall;
  try {
    await simulate(dependencies.chaos);
  } catch (error) {
    if (!(error instanceof SimulatedFailureError)) {
      throw error;
    }
    return handleFailedAttempt(message, attempt, error, dependencies);
  }

  await updatePaymentStatus(payment.id, "APPROVED");
  await recordPaymentEvent(payment.id, "APPROVED", { attempt });
  return "approved";
}

async function handleFailedAttempt(
  message: PaymentProcessMessage,
  attempt: number,
  failure: SimulatedFailureError,
  dependencies: ProcessingDependencies,
): Promise<ProcessingOutcome> {
  const { paymentId } = message;
  await recordPaymentEvent(paymentId, "FAILED_ATTEMPT", {
    attempt,
    mode: failure.mode,
    reason: failure.message,
  });

  const decision = decideAfterFailure(dependencies.retryPolicy, attempt);
  if (decision.action === "retry") {
    publishToQueue(dependencies.channel, retryQueueName(decision.delayMs), message);
    await recordPaymentEvent(paymentId, "RETRY_SCHEDULED", {
      attempt,
      nextAttempt: attempt + 1,
      delayMs: decision.delayMs,
    });
    return "retry_scheduled";
  }

  await updatePaymentStatus(paymentId, "FAILED");
  await recordPaymentEvent(paymentId, "FAILED", { attempts: attempt, reason: failure.message });
  publishToQueue(dependencies.channel, PAYMENTS_DEAD_LETTER_QUEUE, {
    ...message,
    attempts: attempt,
    lastError: failure.message,
  });
  await recordPaymentEvent(paymentId, "MOVED_TO_DLQ", { attempts: attempt });
  return "moved_to_dlq";
}
