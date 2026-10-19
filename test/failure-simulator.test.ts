import { describe, expect, it, vi } from "vitest";
import {
  type ChaosConfig,
  parseFailureModes,
  SimulatedFailureError,
  simulateGatewayCall,
} from "../src/worker/chaos/failure-simulator.js";

function scriptedRandom(...values: number[]) {
  return () => values.shift() ?? 0;
}

const allModes: ChaosConfig = {
  failureRate: 0.3,
  modes: ["exception", "timeout", "unavailable"],
  timeoutMs: 250,
};

describe("simulateGatewayCall", () => {
  it("succeeds when the random draw is at or above the failure rate", async () => {
    const sleep = vi.fn();

    await expect(
      simulateGatewayCall(allModes, { random: scriptedRandom(0.3), sleep }),
    ).resolves.toBeUndefined();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("never fails with a failure rate of 0", async () => {
    const config = { ...allModes, failureRate: 0 };

    for (let i = 0; i < 100; i++) {
      await expect(simulateGatewayCall(config)).resolves.toBeUndefined();
    }
  });

  it("always fails with a failure rate of 1", async () => {
    const config: ChaosConfig = { ...allModes, failureRate: 1, modes: ["exception"] };

    for (let i = 0; i < 100; i++) {
      await expect(simulateGatewayCall(config)).rejects.toBeInstanceOf(SimulatedFailureError);
    }
  });

  it("throws an exception failure immediately", async () => {
    const sleep = vi.fn();

    await expect(
      simulateGatewayCall(allModes, { random: scriptedRandom(0.1, 0), sleep }),
    ).rejects.toMatchObject({ mode: "exception" });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("waits the configured timeout before failing in timeout mode", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      simulateGatewayCall(allModes, { random: scriptedRandom(0.1, 0.5), sleep }),
    ).rejects.toMatchObject({ mode: "timeout" });
    expect(sleep).toHaveBeenCalledWith(250);
  });

  it("fails as gateway unavailable in unavailable mode", async () => {
    await expect(
      simulateGatewayCall(allModes, { random: scriptedRandom(0.1, 0.99), sleep: vi.fn() }),
    ).rejects.toMatchObject({ mode: "unavailable" });
  });
});

describe("parseFailureModes", () => {
  it("parses a comma separated list ignoring blanks and spaces", () => {
    expect(parseFailureModes(" exception, timeout ,,")).toEqual(["exception", "timeout"]);
  });

  it("rejects an unknown mode", () => {
    expect(() => parseFailureModes("exception,meteor")).toThrow(/meteor/);
  });

  it("rejects an empty list", () => {
    expect(() => parseFailureModes("")).toThrow();
  });
});
