import { Router } from "express";
import { getPayment, postPayment } from "../controllers/payments.controller.js";

export const paymentsRouter = Router();

paymentsRouter.post("/payments", postPayment);
paymentsRouter.get("/payments/:id", getPayment);
