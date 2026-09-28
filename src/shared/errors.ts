export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class IdempotencyKeyReusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdempotencyKeyReusedError";
  }
}

export class IdempotencyKeyInProgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdempotencyKeyInProgressError";
  }
}
