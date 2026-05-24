import { logger } from "@/lib/logger";

const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0";

interface PaymentPendingParams {
  to: string;
  userName: string;
  eventTitle: string;
  amount: number;
  mpesaCode: string;
  paymentId: string;
  orgName: string;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("+")) return digits.slice(1);
  return digits;
}

async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    logger.warn("WhatsApp not configured — skipping notification", { to });
    return;
  }

  const normalized = normalizePhone(to);

  const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalized,
      type: "text",
      text: { body: message },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${body}`);
  }
}

export async function sendPaymentPendingNotification(
  params: PaymentPendingParams
): Promise<void> {
  const { to, userName, eventTitle, amount, mpesaCode, paymentId, orgName } =
    params;

  const message =
    `💰 *New Payment Awaiting Approval* — ${orgName}\n\n` +
    `*Member:* ${userName}\n` +
    `*Event:* ${eventTitle}\n` +
    `*Amount:* KSh ${amount.toLocaleString()}\n` +
    `*M-Pesa Code:* ${mpesaCode}\n\n` +
    `Payment ID: ${paymentId}\n\n` +
    `Please log in to the dashboard to approve or reject this payment.`;

  await sendWhatsAppMessage(to, message);
}
