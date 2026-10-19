import { describe, expect, it } from "vitest";
import { decideAfterFailure, retryDelayMs, retryDelays } from "../src/worker/retry-policy.js";

const policy = { maxAttempts: 4, baseDelayMs: 1000 };

describe("retry policy", () => {
  it("grows the delay exponentially: 1s, 4s, 16s", () => {
    expect(retryDelayMs(policy, 1)).toBe(1000);
    expect(retryDelayMs(policy, 2)).toBe(4000);
    expect(retryDelayMs(policy, 3)).toBe(16000);
  });

  it("lists one delay per retry, which is maxAttempts - 1", () => {
    expect(retryDelays(policy)).toEqual([1000, 4000, 16000]);
  });

  it("retries while there are attempts left", () => {
    expect(decideAfterFailure(policy, 1)).toEqual({ action: "retry", delayMs: 1000 });
    expect(decideAfterFailure(policy, 3)).toEqual({ action: "retry", delayMs: 16000 });
  });

  it("gives up after the last attempt fails", () => {
    expect(decideAfterFailure(policy, 4)).toEqual({ action: "give_up" });
  });

  it("never retries when maxAttempts is 1", () => {
    const noRetry = { maxAttempts: 1, baseDelayMs: 1000 };

    expect(retryDelays(noRetry)).toEqual([]);
    expect(decideAfterFailure(noRetry, 1)).toEqual({ action: "give_up" });
  });
});
