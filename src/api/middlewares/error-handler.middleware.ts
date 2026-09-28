import type { ErrorRequestHandler } from "express";
import {
  IdempotencyKeyReusedError,
  IdempotencyKeyInProgressError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof IdempotencyKeyReusedError) {
    res.status(422).json({ error: err.message });
    return;
  }
  if (err instanceof IdempotencyKeyInProgressError) {
    res.status(409).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
};
