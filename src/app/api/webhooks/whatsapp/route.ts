import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// GET /api/webhooks/whatsapp — Meta webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info("WhatsApp webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  logger.warn("WhatsApp webhook verification failed", { mode, token });
  return NextResponse.json({ ok: false }, { status: 403 });
}

// POST /api/webhooks/whatsapp — Incoming messages and status updates
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Meta expects a 200 response quickly — process async
  processWebhookEvent(body).catch((err) =>
    logger.error("WhatsApp webhook processing error", { err })
  );

  return NextResponse.json({ ok: true });
}

async function processWebhookEvent(body: Record<string, unknown>) {
  const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
  const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
  const value = changes?.value as Record<string, unknown> | undefined;

  if (!value) return;

  // Incoming messages
  const messages = value.messages as Array<Record<string, unknown>> | undefined;
  if (messages?.length) {
    for (const msg of messages) {
      logger.info("WhatsApp message received", {
        from: msg.from,
        type: msg.type,
        id: msg.id,
      });
    }
  }

  // Delivery / read status updates
  const statuses = value.statuses as Array<Record<string, unknown>> | undefined;
  if (statuses?.length) {
    for (const status of statuses) {
      logger.info("WhatsApp message status", {
        id: status.id,
        status: status.status,
        recipientId: status.recipient_id,
      });
    }
  }
}