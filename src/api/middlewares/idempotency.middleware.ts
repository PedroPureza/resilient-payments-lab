import type { NextFunction, Request, Response } from "express";
import {
  claimIdempotencyKey,
  completeIdempotencyKey,
  hashRequestBody,
  releaseIdempotencyKey,
} from "../../services/idempotency.service.js";
import { env } from "../../shared/env.js";
import { logger } from "../../shared/logger.js";
import {
  IdempotencyKeyInProgressError,
  IdempotencyKeyReusedError,
  ValidationError,
} from "../../shared/errors.js";

export async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!env.idempotencyEnabled) {
    next();
    return;
  }

  const key = req.header("Idempotency-Key");
  if (!key) {
    next(new ValidationError("Idempotency-Key header is required"));
    return;
  }

  const body = req.body ?? {};
  const requestHash = hashRequestBody(body.amount, body.currency);
  const result = await claimIdempotencyKey(key, requestHash);

  switch (result.outcome) {
    case "mismatch":
      next(
        new IdempotencyKeyReusedError(
          "Idempotency-Key was already used with a different request body",
        ),
      );
      return;
    case "in_progress":
      next(
        new IdempotencyKeyInProgressError(
          "a request with this Idempotency-Key is already in progress",
        ),
      );
      return;
    case "replay":
      res.status(202).json(result.cachedResponse);
      return;
    case "claimed": {
      const originalJson = res.json.bind(res);
      let responseBody: unknown;
      res.json = (jsonBody: unknown) => {
        responseBody = jsonBody;
        return originalJson(jsonBody);
      };
      const { lockToken } = result;
      res.on("finish", () => {
        if (res.statusCode < 300) {
          const paymentId = (responseBody as { id: string }).id;
          completeIdempotencyKey(key, lockToken, paymentId, responseBody)
            .then((completed) => {
              if (!completed) {
                logger.warn(`idempotency key ${key} expired and was taken over before completing`);
              }
            })
            .catch((err: unknown) => {
              logger.error(err, `failed to complete idempotency key ${key}`);
            });
        } else {
          releaseIdempotencyKey(key, lockToken).catch((err: unknown) => {
            logger.error(err, `failed to release idempotency key ${key}`);
          });
        }
      });
      next();
      return;
    }
  }
}
