import { env } from "../shared/env.js";

export const BACKOFF_MULTIPLIER = 4;

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
}

export type RetryDecision = { action: "retry"; delayMs: number } | { action: "give_up" };

export function retryPolicyFromEnv(): RetryPolicy {
  if (!Number.isInteger(env.maxAttempts) || env.maxAttempts < 1) {
    throw new Error("MAX_ATTEMPTS must be an integer >= 1");
  }
  if (!Number.isInteger(env.retryBaseDelayMs) || env.retryBaseDelayMs < 1) {
    throw new Error("RETRY_BASE_DELAY_MS must be an integer >= 1");
  }
  return { maxAttempts: env.maxAttempts, baseDelayMs: env.retryBaseDelayMs };
}

export function retryDelayMs(policy: RetryPolicy, failedAttempt: number): number {
  return policy.baseDelayMs * BACKOFF_MULTIPLIER ** (failedAttempt - 1);
}

export function retryDelays(policy: RetryPolicy): number[] {
  const delays: number[] = [];
  for (let failedAttempt = 1; failedAttempt < policy.maxAttempts; failedAttempt++) {
    delays.push(retryDelayMs(policy, failedAttempt));
  }
  return delays;
}

export function decideAfterFailure(policy: RetryPolicy, failedAttempt: number): RetryDecision {
  if (failedAttempt >= policy.maxAttempts) {
    return { action: "give_up" };
  }
  return { action: "retry", delayMs: retryDelayMs(policy, failedAttempt) };
}
