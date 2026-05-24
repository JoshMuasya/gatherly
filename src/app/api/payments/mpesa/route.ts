import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError } from "@/lib/api/auth";
import { ok, badRequest, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sanitizeString, sanitizeNumber } from "@/lib/api/sanitize";
import { adminDb } from "@/lib/firebase/firebase-admin";
import { initiateStkPush } from "@/lib/mpesa/daraja";
import { logger } from "@/lib/logger";

// GET /api/payments/mpesa?pendingId=xxx — poll status of a pending STK push
export async function GET(request: NextRequest) {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limited = await checkRateLimit(`mpesa-status:${ip}`);
    if (limited) return limited;

    try {
        const auth = await requireOrgAuth(request);
        if (isAuthError(auth)) return auth;

        const pendingId = request.nextUrl.searchParams.get("pendingId");
        if (!pendingId) return badRequest("pendingId is required");

        const doc = await adminDb.collection("mpesaPendingPayments").doc(pendingId).get();
        if (!doc.exists || doc.data()?.orgId !== auth.orgId) {
            return badRequest("Pending payment not found");
        }

        const data = doc.data()!;
        return ok({
            status: data.status as "pending" | "completed" | "failed",
            mpesaCode: data.mpesaCode ?? null,
            failureReason: data.failureReason ?? null,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to check status";
        logger.error("STK status check error", { error: String(error) });
        return err(message, 500);
    }
}

// POST /api/payments/mpesa — initiate STK Push and store a pending record
export async function POST(request: NextRequest) {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limited = await checkRateLimit(`mpesa-stk:${ip}`);
    if (limited) return limited;

    try {
        const auth = await requireOrgAuth(request);
        if (isAuthError(auth)) return auth;

        const body = await request.json();
        const phone = sanitizeString(body.phone);
        const amount = sanitizeNumber(body.amount);
        const eventId = sanitizeString(body.eventId);
        const registrationId = sanitizeString(body.registrationId ?? "");

        if (!phone || amount <= 0 || !eventId) {
            return badRequest("phone, amount, and eventId are required");
        }

        // Fetch event to use title as account reference
        const eventDoc = await adminDb.collection("events").doc(eventId).get();
        if (!eventDoc.exists || eventDoc.data()?.orgId !== auth.orgId) {
            return badRequest("Event not found");
        }
        const eventTitle: string = eventDoc.data()?.title ?? "Event";

        const result = await initiateStkPush({
            phone,
            amount,
            accountRef: eventId.slice(0, 12),
            description: eventTitle.slice(0, 13),
        });

        // Persist a pending payment record; the webhook will mark it completed
        const pendingDoc = {
            orgId: auth.orgId!,
            userId: auth.uid,
            userName: auth.name,
            eventId,
            eventTitle,
            registrationId: registrationId || null,
            amount,
            method: "mpesa",
            status: "pending",
            checkoutRequestId: result.checkoutRequestId,
            merchantRequestId: result.merchantRequestId,
            createdAt: new Date().toISOString(),
        };

        const ref = await adminDb.collection("mpesaPendingPayments").add(pendingDoc);

        logger.info("STK push initiated", { checkoutRequestId: result.checkoutRequestId, orgId: auth.orgId });

        return ok({ pendingId: ref.id, checkoutRequestId: result.checkoutRequestId, message: "STK push sent to phone" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "STK push failed";
        logger.error("STK push error", { error: String(error) });
        return err(message, 502);
    }
}
