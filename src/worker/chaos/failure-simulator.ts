import { setTimeout as sleepFor } from "node:timers/promises";
import { env } from "../../shared/env.js";

export const FAILURE_MODES = ["exception", "timeout", "unavailable"] as const;

export type FailureMode = (typeof FAILURE_MODES)[number];

export interface ChaosConfig {
  failureRate: number;
  modes: FailureMode[];
  timeoutMs: number;
}

export interface ChaosDependencies {
  random: () => number;
  sleep: (ms: number) => Promise<unknown>;
}

export class SimulatedFailureError extends Error {
  constructor(
    readonly mode: FailureMode,
    message: string,
  ) {
    super(message);
    this.name = "SimulatedFailureError";
  }
}

const defaultDependencies: ChaosDependencies = { random: Math.random, sleep: sleepFor };

function isFailureMode(value: string): value is FailureMode {
  return (FAILURE_MODES as readonly string[]).includes(value);
}

export function parseFailureModes(raw: string): FailureMode[] {
  const modes = raw
    .split(",")
    .map((mode) => mode.trim())
    .filter((mode) => mode.length > 0);
  const unknownModes = modes.filter((mode) => !isFailureMode(mode));
  if (unknownModes.length > 0) {
    throw new Error(
      `unknown FAILURE_MODES: ${unknownModes.join(", ")} (valid: ${FAILURE_MODES.join(", ")})`,
    );
  }
  if (modes.length === 0) {
    throw new Error("FAILURE_MODES must list at least one mode");
  }
  return modes as FailureMode[];
}

export function chaosConfigFromEnv(): ChaosConfig {
  if (!(env.failureRate >= 0 && env.failureRate <= 1)) {
    throw new Error("FAILURE_RATE must be a number between 0 and 1");
  }
  return {
    failureRate: env.failureRate,
    modes: parseFailureModes(env.failureModes),
    timeoutMs: env.chaosTimeoutMs,
  };
}

export async function simulateGatewayCall(
  config: ChaosConfig,
  dependencies: ChaosDependencies = defaultDependencies,
): Promise<void> {
  if (dependencies.random() >= config.failureRate) {
    return;
  }
  const modeIndex = Math.floor(dependencies.random() * config.modes.length);
  const mode = config.modes[modeIndex] ?? config.modes[0] ?? "exception";

  switch (mode) {
    case "exception":
      throw new SimulatedFailureError(mode, "simulated gateway threw an unexpected exception");
    case "timeout":
      await dependencies.sleep(config.timeoutMs);
      throw new SimulatedFailureError(
        mode,
        `simulated gateway timed out after ${config.timeoutMs}ms`,
      );
    case "unavailable":
      throw new SimulatedFailureError(mode, "simulated gateway unavailable (503)");
  }
}
