import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebase-admin";
import { writeAuditLog } from "@/lib/api/audit";
import { sendPaymentReceipt } from "@/lib/email";
import { logger } from "@/lib/logger";

interface STKCallback {
    Body: {
        stkCallback: {
            MerchantRequestID: string;
            CheckoutRequestID: string;
            ResultCode: number;
            ResultDesc: string;
            CallbackMetadata?: {
                Item: Array<{ Name: string; Value?: string | number }>;
            };
        };
    };
}

// POST /api/webhooks/mpesa — Safaricom STK Push callback (no auth required)
export async function POST(request: NextRequest) {
    let payload: STKCallback;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    const cb = payload.Body?.stkCallback;
    if (!cb) return NextResponse.json({ ok: false }, { status: 400 });

    const { CheckoutRequestID, ResultCode, ResultDesc } = cb;

    logger.info("M-Pesa callback received", { CheckoutRequestID, ResultCode });

    // Find the pending payment record
    const pending = await adminDb
        .collection("mpesaPendingPayments")
        .where("checkoutRequestId", "==", CheckoutRequestID)
        .limit(1)
        .get();

    if (pending.empty) {
        logger.warn("M-Pesa callback: no pending record", { CheckoutRequestID });
        return NextResponse.json({ ok: true });
    }

    const pendingDoc = pending.docs[0];
    const pendingData = pendingDoc.data();

    if (ResultCode !== 0) {
        // Payment failed or was cancelled
        await pendingDoc.ref.update({ status: "failed", failureReason: ResultDesc, updatedAt: new Date().toISOString() });
        logger.info("M-Pesa payment failed", { CheckoutRequestID, ResultDesc });
        return NextResponse.json({ ok: true });
    }

    // Extract metadata
    const items = cb.CallbackMetadata?.Item ?? [];
    const meta = Object.fromEntries(items.map(i => [i.Name, i.Value]));
    const mpesaCode = String(meta["MpesaReceiptNumber"] ?? "");
    const paidAmount = Number(meta["Amount"] ?? pendingData.amount);
    const paymentDate = new Date().toISOString();

    // Write confirmed payment to payments collection
    const paymentData = {
        orgId: pendingData.orgId,
        userId: pendingData.userId,
        userName: pendingData.userName,
        eventId: pendingData.eventId,
        eventTitle: pendingData.eventTitle,
        amount: paidAmount,
        method: "mpesa",
        mpesaCode,
        recordedBy: "mpesa-webhook",
        paymentDate,
        createdAt: paymentDate,
    };

    const paymentRef = await adminDb.collection("payments").add(paymentData);

    // Mark registration as paid
    if (pendingData.registrationId) {
        await adminDb.collection("registrations").doc(pendingData.registrationId).update({
            paymentStatus: "paid",
            updatedAt: paymentDate,
        });
    }

    // Increment attendeesCount on event
    await adminDb.collection("events").doc(pendingData.eventId).update({
        attendeesCount: (await adminDb.collection("events").doc(pendingData.eventId).get()).data()?.attendeesCount + 1 || 1,
    });

    // Mark pending record as completed (store mpesaCode so frontend polling can retrieve it)
    await pendingDoc.ref.update({ status: "completed", paymentId: paymentRef.id, mpesaCode, updatedAt: paymentDate });

    await writeAuditLog({
        action: "payment.recorded",
        orgId: pendingData.orgId,
        actorId: "mpesa-webhook",
        actorName: "M-Pesa",
        targetId: paymentRef.id,
        metadata: { eventId: pendingData.eventId, amount: paidAmount, mpesaCode },
    });

    // Send receipt email (fire and forget — fetch user email from Firestore)
    adminDb.collection("users").doc(pendingData.userId).get().then(userDoc => {
        if (!userDoc.exists) return;
        const email = userDoc.data()?.email;
        if (!email) return;
        sendPaymentReceipt({
            to: email,
            name: pendingData.userName,
            eventTitle: pendingData.eventTitle,
            amount: paidAmount,
            method: "mpesa",
            mpesaCode,
            paymentDate: new Date(paymentDate).toLocaleDateString(),
        }).catch(() => {});
    }).catch(() => {});

    logger.info("M-Pesa payment recorded", { paymentId: paymentRef.id, orgId: pendingData.orgId });

    return NextResponse.json({ ok: true });
}
