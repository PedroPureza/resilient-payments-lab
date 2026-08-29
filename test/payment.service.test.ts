import { describe, expect, it } from "vitest";
import { createPayment, getPaymentById } from "../src/services/payment.service.js";
import { ValidationError } from "../src/shared/errors.js";

describe("PaymentService.createPayment", () => {
  it("rejects an amount that is not a decimal string", async () => {
    await expect(createPayment({ amount: "not-a-number", currency: "BRL" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects a zero amount", async () => {
    await expect(createPayment({ amount: "0.00", currency: "BRL" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects an amount with more than 2 decimal places", async () => {
    await expect(createPayment({ amount: "10.999", currency: "BRL" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects a currency that is not a 3-letter code", async () => {
    await expect(createPayment({ amount: "10.00", currency: "R$" })).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects a missing amount and currency", async () => {
    await expect(createPayment({})).rejects.toThrow(ValidationError);
  });
});

describe("PaymentService.getPaymentById", () => {
  it("rejects an id that is not a valid UUID", async () => {
    await expect(getPaymentById("not-a-uuid")).rejects.toThrow(ValidationError);
  });
});
