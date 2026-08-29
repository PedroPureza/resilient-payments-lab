import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/api/server.js";
import { db } from "../src/db/connection.js";

describe("Payments API", () => {
  const paymentIds: string[] = [];

  afterEach(async () => {
    if (paymentIds.length > 0) {
      await db.deleteFrom("payments").where("id", "in", paymentIds).execute();
      paymentIds.length = 0;
    }
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe("POST /payments", () => {
    it("creates a payment already APPROVED and returns 201", async () => {
      const res = await request(app).post("/payments").send({ amount: "42.50", currency: "BRL" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        amount: "42.50",
        currency: "BRL",
        status: "APPROVED",
        attempts: 0,
      });
      expect(res.body.id).toBeTruthy();
      paymentIds.push(res.body.id);
    });

    it("rejects an invalid amount with 400", async () => {
      const res = await request(app).post("/payments").send({ amount: "free", currency: "BRL" });

      expect(res.status).toBe(400);
    });

    it("rejects an invalid currency with 400", async () => {
      const res = await request(app).post("/payments").send({ amount: "10.00", currency: "reais" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /payments/:id", () => {
    it("returns the payment created previously", async () => {
      const created = await request(app)
        .post("/payments")
        .send({ amount: "10.00", currency: "USD" });
      paymentIds.push(created.body.id);

      const res = await request(app).get(`/payments/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: created.body.id, amount: "10.00", currency: "USD" });
    });

    it("returns 404 for a well-formed id that does not exist", async () => {
      const res = await request(app).get(`/payments/${randomUUID()}`);

      expect(res.status).toBe(404);
    });

    it("returns 400 for a malformed id", async () => {
      const res = await request(app).get("/payments/not-a-uuid");

      expect(res.status).toBe(400);
    });
  });
});
