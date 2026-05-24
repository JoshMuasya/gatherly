import { adminDb } from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError } from "@/lib/api/auth";
import { ok, badRequest, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sanitizeString, sanitizeNumber } from "@/lib/api/sanitize";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";
import { sendPaymentPendingNotification } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`payment-record:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const { eventId, userId, mpesaCode, cashReceivedBy } = body;
    const method = sanitizeString(body.method) as "cash" | "mpesa";
    const amount = sanitizeNumber(body.amount);
    const userName = sanitizeString(body.userName);

    if (!eventId || !amount || !method || !userId) {
      return badRequest("eventId, amount, method, and userId are required");
    }

    if (!["cash", "mpesa"].includes(method)) {
      return badRequest("method must be 'cash' or 'mpesa'");
    }

    if (method === "mpesa" && !mpesaCode) {
      return badRequest("mpesaCode is required for M-Pesa payments");
    }

    const isAdminRole = ["Admin", "SuperAdmin", "Leader"].includes(auth.role);

    if (!isAdminRole && userId !== auth.uid) {
      return badRequest("You can only record a payment for yourself");
    }

    // Verify event belongs to org
    const eventDoc = await adminDb.collection("events").doc(eventId).get();
    if (!eventDoc.exists || eventDoc.data()?.orgId !== auth.orgId) {
      return badRequest("Event not found");
    }

    // Block duplicate payments for the same user + event
    const duplicate = await adminDb
      .collection("payments")
      .where("orgId", "==", auth.orgId)
      .where("eventId", "==", eventId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (!duplicate.empty) {
      return badRequest("A payment has already been recorded for this user and event");
    }

    // Block duplicate M-Pesa codes globally (prevent code reuse across payments)
    if (method === "mpesa" && mpesaCode) {
      const codeClash = await adminDb
        .collection("payments")
        .where("mpesaCode", "==", sanitizeString(mpesaCode))
        .limit(1)
        .get();

      if (!codeClash.empty) {
        return badRequest("This M-Pesa code has already been used");
      }
    }

    // Cash payments recorded by leaders are auto-approved;
    // M-Pesa payments submitted by users need leader approval.
    const paymentStatus = method === "cash" || isAdminRole ? "approved" : "pending_approval";

    const paymentData: Record<string, unknown> = {
      orgId: auth.orgId,
      eventId,
      eventTitle: eventDoc.data()?.title ?? "",
      amount,
      method,
      userId,
      userName,
      recordedBy: auth.uid,
      paymentStatus,
      createdAt: new Date().toISOString(),
    };

    if (method === "mpesa") paymentData.mpesaCode = sanitizeString(mpesaCode);
    if (method === "cash") paymentData.cashReceivedBy = sanitizeString(cashReceivedBy ?? "");

    const paymentRef = await adminDb.collection("payments").add(paymentData);

    // For approved payments (cash / admin-recorded) mark registration paid immediately
    if (paymentStatus === "approved") {
      const batch = adminDb.batch();
      batch.update(adminDb.collection("events").doc(eventId), {
        attendeesCount: FieldValue.increment(1),
      });

      const regSnapshot = await adminDb
        .collection("registrations")
        .where("orgId", "==", auth.orgId)
        .where("eventId", "==", eventId)
        .where("userId", "==", userId)
        .limit(1)
        .get();

      if (!regSnapshot.empty) {
        batch.update(regSnapshot.docs[0].ref, { paymentStatus: "paid" });
      }

      await batch.commit();
    }

    await writeAuditLog({
      action: "payment.recorded",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: paymentRef.id,
      metadata: { eventId, amount, method, userId, paymentStatus },
    });

    // Notify org leaders/admins via WhatsApp when M-Pesa code needs approval
    if (paymentStatus === "pending_approval") {
      notifyLeaders({
        orgId: auth.orgId!,
        userName,
        eventTitle: eventDoc.data()?.title ?? "",
        amount,
        mpesaCode: sanitizeString(mpesaCode),
        paymentId: paymentRef.id,
      }).catch((e) =>
        logger.error("WhatsApp leader notification failed", { error: String(e) })
      );
    }

    logger.info("Payment recorded", {
      paymentId: paymentRef.id,
      orgId: auth.orgId,
      amount,
      method,
      paymentStatus,
    });

    return ok({
      paymentId: paymentRef.id,
      paymentStatus,
      message:
        paymentStatus === "pending_approval"
          ? "Payment submitted. Awaiting leader approval."
          : "Payment recorded successfully",
    });
  } catch (error) {
    logger.error("Record payment error", { error: String(error) });
    return err("Failed to record payment");
  }
}

async function notifyLeaders(params: {
  orgId: string;
  userName: string;
  eventTitle: string;
  amount: number;
  mpesaCode: string;
  paymentId: string;
}) {
  const orgDoc = await adminDb.collection("organizations").doc(params.orgId).get();
  const orgData = orgDoc.data();
  const orgName = orgData?.name ?? "Your Organisation";
  const notifyNumber = orgData?.whatsappNotifyNumber as string | undefined;

  if (!notifyNumber) {
    logger.warn("No WhatsApp notify number configured for org — skipping", { orgId: params.orgId });
    return;
  }

  await sendPaymentPendingNotification({
    to: notifyNumber,
    userName: params.userName,
    eventTitle: params.eventTitle,
    amount: params.amount,
    mpesaCode: params.mpesaCode,
    paymentId: params.paymentId,
    orgName,
  });
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`payments-list:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const isAdminRole = ["Admin", "SuperAdmin", "Leader"].includes(auth.role);

    const url = new URL(request.url);
    const userIdFilter = url.searchParams.get("userId");
    const eventIdFilter = url.searchParams.get("eventId");
    const statusFilter = url.searchParams.get("status");
    const limitParam = Math.min(
      Number(url.searchParams.get("limit") ?? 100),
      200
    );

    let query = adminDb
      .collection("payments")
      .where("orgId", "==", auth.orgId)
      .limit(limitParam);

    if (isAdminRole) {
      if (userIdFilter) {
        query = query.where("userId", "==", userIdFilter) as typeof query;
      }
    } else {
      query = query.where("userId", "==", auth.uid) as typeof query;
    }

    if (eventIdFilter) {
      query = query.where("eventId", "==", eventIdFilter) as typeof query;
    }

    if (statusFilter) {
      query = query.where("paymentStatus", "==", statusFilter) as typeof query;
    }

    const snapshot = await query.get();

    const payments = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        orgId: data.orgId,
        eventId: data.eventId,
        eventTitle: data.eventTitle ?? null,
        amount: data.amount,
        method: data.method,
        mpesaCode: data.mpesaCode ?? null,
        cashReceivedBy: data.cashReceivedBy ?? null,
        userId: data.userId ?? null,
        userName: data.userName ?? null,
        recordedBy: data.recordedBy ?? null,
        paymentDate: data.createdAt ?? null,
        paymentStatus: data.paymentStatus ?? "approved",
        rejectionReason: data.rejectionReason ?? null,
        approvedBy: data.approvedBy ?? null,
      };
    });

    return ok({ payments }, payments.length);
  } catch (error) {
    logger.error("Fetch payments error", { error: String(error) });
    return err("Failed to fetch payments");
  }
}
