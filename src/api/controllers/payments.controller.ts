import type { Request, Response } from "express";
import { createPayment, getPaymentById } from "../../services/payment.service.js";

export async function postPayment(req: Request, res: Response): Promise<void> {
  const payment = await createPayment(req.body ?? {});
  res.status(201).json(payment);
}

export async function getPayment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const payment = await getPaymentById(typeof id === "string" ? id : "");
  res.status(200).json(payment);
}
