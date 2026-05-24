import { adminDb } from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { ok, badRequest, err, forbidden } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sanitizeString } from "@/lib/api/sanitize";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";
import { sendPaymentReceipt } from "@/lib/email";

// PATCH /api/payments/[id] — approve or reject a pending payment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paymentId } = await params;
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`payment-review:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Leader", "Admin", "Owner", "SuperAdmin");
    if (roleError) return roleError;

    const body = await request.json();
    const action = sanitizeString(body.action) as "approve" | "reject";
    const rejectionReason = body.rejectionReason
      ? sanitizeString(body.rejectionReason)
      : undefined;

    if (!["approve", "reject"].includes(action)) {
      return badRequest("action must be 'approve' or 'reject'");
    }

    if (action === "reject" && !rejectionReason) {
      return badRequest("rejectionReason is required when rejecting a payment");
    }

    const paymentRef = adminDb.collection("payments").doc(paymentId);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      return badRequest("Payment not found");
    }

    const payment = paymentDoc.data()!;

    if (payment.orgId !== auth.orgId) {
      return forbidden("Access denied");
    }

    if (payment.paymentStatus !== "pending_approval") {
      return badRequest(
        `Payment is already ${payment.paymentStatus} and cannot be reviewed again`
      );
    }

    if (action === "approve") {
      const batch = adminDb.batch();

      batch.update(paymentRef, {
        paymentStatus: "approved",
        approvedBy: auth.uid,
        approvedAt: new Date().toISOString(),
      });

      batch.update(adminDb.collection("events").doc(payment.eventId), {
        attendeesCount: FieldValue.increment(1),
      });

      const regSnapshot = await adminDb
        .collection("registrations")
        .where("orgId", "==", auth.orgId)
        .where("eventId", "==", payment.eventId)
        .where("userId", "==", payment.userId)
        .limit(1)
        .get();

      if (!regSnapshot.empty) {
        batch.update(regSnapshot.docs[0].ref, { paymentStatus: "paid" });
      }

      await batch.commit();

      // Send receipt email (fire-and-forget)
      adminDb
        .collection("users")
        .doc(payment.userId)
        .get()
        .then((userDoc) => {
          const userData = userDoc.data();
          if (userData?.email) {
            sendPaymentReceipt({
              to: userData.email,
              name: userData.name ?? payment.userName,
              eventTitle: payment.eventTitle ?? "",
              amount: payment.amount,
              method: payment.method,
              mpesaCode: payment.mpesaCode ?? undefined,
              paymentDate: new Date().toLocaleDateString("en-KE"),
            }).catch((e) =>
              logger.error("Payment receipt email failed", { error: String(e) })
            );
          }
        })
        .catch(() => {});

      await writeAuditLog({
        action: "payment.approved",
        orgId: auth.orgId!,
        actorId: auth.uid,
        actorName: auth.name,
        targetId: paymentId,
        metadata: { eventId: payment.eventId, userId: payment.userId, amount: payment.amount },
      });

      logger.info("Payment approved", { paymentId, approvedBy: auth.uid });
      return ok({ updated: true, paymentStatus: "approved" });
    } else {
      await paymentRef.update({
        paymentStatus: "rejected",
        rejectionReason,
        rejectedBy: auth.uid,
        rejectedAt: new Date().toISOString(),
      });

      await writeAuditLog({
        action: "payment.rejected",
        orgId: auth.orgId!,
        actorId: auth.uid,
        actorName: auth.name,
        targetId: paymentId,
        metadata: {
          eventId: payment.eventId,
          userId: payment.userId,
          rejectionReason,
        },
      });

      logger.info("Payment rejected", { paymentId, rejectedBy: auth.uid });
      return ok({ updated: true, paymentStatus: "rejected" });
    }
  } catch (error) {
    logger.error("Payment review error", { error: String(error) });
    return err("Failed to review payment");
  }
}
