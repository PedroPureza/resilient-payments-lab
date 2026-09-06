import { getChannel } from "../queue/connection.js";
import { publishToQueue } from "../queue/publisher.js";
import { assertTopology, PAYMENTS_PROCESS_QUEUE } from "../queue/topology.js";
import { findPaymentById, insertPendingPayment } from "../repositories/payment.repository.js";
import { NotFoundError, ValidationError } from "../shared/errors.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export interface CreatePaymentRequest {
  amount?: unknown;
  currency?: unknown;
}

function parseAmount(amount: unknown): string {
  if (typeof amount !== "string" || !AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
    throw new ValidationError(
      'amount must be a positive decimal string with up to 2 decimal places, e.g. "10.00"',
    );
  }
  return amount;
}

function parseCurrency(currency: unknown): string {
  if (typeof currency !== "string" || !CURRENCY_PATTERN.test(currency)) {
    throw new ValidationError("currency must be a 3-letter uppercase ISO 4217 code, e.g. BRL");
  }
  return currency;
}

export async function createPayment(request: CreatePaymentRequest) {
  const amount = parseAmount(request.amount);
  const currency = parseCurrency(request.currency);
  const payment = await insertPendingPayment({ amount, currency });
  const channel = await getChannel();
  await assertTopology(channel);
  publishToQueue(channel, PAYMENTS_PROCESS_QUEUE, { paymentId: payment.id });
  return payment;
}

export async function getPaymentById(id: string) {
  if (!UUID_PATTERN.test(id)) {
    throw new ValidationError("id must be a valid UUID");
  }
  const payment = await findPaymentById(id);
  if (!payment) {
    throw new NotFoundError(`payment ${id} not found`);
  }
  return payment;
}
