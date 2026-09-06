import { updatePaymentStatus } from "../repositories/payment.repository.js";

interface PaymentProcessMessage {
  paymentId: string;
}

export async function processPayment(message: PaymentProcessMessage): Promise<void> {
  await updatePaymentStatus(message.paymentId, "APPROVED");
}
