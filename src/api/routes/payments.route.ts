import { Router } from "express";
import { getPayment, postPayment } from "../controllers/payments.controller.js";
import { idempotencyMiddleware } from "../middlewares/idempotency.middleware.js";

export const paymentsRouter = Router();

paymentsRouter.post("/payments", idempotencyMiddleware, postPayment);
paymentsRouter.get("/payments/:id", getPayment);
