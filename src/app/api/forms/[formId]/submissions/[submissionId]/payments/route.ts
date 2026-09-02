import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { ok, badRequest, notFound, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sanitizeString, sanitizeNumber } from "@/lib/api/sanitize";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";

// POST /api/forms/[formId]/submissions/[submissionId]/payments
// Leader/admin-recorded payment against a form guest's balance — recorded
// immediately (no approval workflow, unlike self-service ticket payments),
// and may be called more than once per guest to record installments.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ formId: string; submissionId: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`form-submission-payment:${ip}`);
  if (limited) return limited;

  try {
    const { formId, submissionId } = await context.params;

    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "Leader", "SuperAdmin", "Treasurer", "Owner");
    if (roleError) return roleError;

    const formDoc = await adminDb.collection("forms").doc(formId).get();
    if (!formDoc.exists || formDoc.data()?.orgId !== auth.orgId) {
      return notFound("Form not found");
    }
    const form = formDoc.data()!;

    const submissionDoc = await adminDb.collection("formSubmissions").doc(submissionId).get();
    if (!submissionDoc.exists || submissionDoc.data()?.formId !== formId) {
      return notFound("Submission not found");
    }

    const body = await request.json();
    const method = sanitizeString(body.method) as "cash" | "mpesa";
    const amount = sanitizeNumber(body.amount);
    const mpesaCode = body.mpesaCode ? sanitizeString(body.mpesaCode) : undefined;
    const cashReceivedBy = body.cashReceivedBy ? sanitizeString(body.cashReceivedBy) : undefined;

    if (!["cash", "mpesa"].includes(method)) {
      return badRequest("method must be 'cash' or 'mpesa'");
    }
    if (!amount || amount <= 0) {
      return badRequest("amount must be greater than 0");
    }
    if (method === "mpesa" && !mpesaCode) {
      return badRequest("mpesaCode is required for M-Pesa payments");
    }

    const now = new Date();
    const paymentData: Record<string, unknown> = {
      orgId: auth.orgId,
      formId,
      eventId: form.eventId,
      submissionId,
      amount,
      method,
      recordedBy: auth.uid,
      recordedByName: auth.name,
      createdAt: now,
    };
    if (method === "mpesa") paymentData.mpesaCode = mpesaCode;
    if (method === "cash" && cashReceivedBy) paymentData.cashReceivedBy = cashReceivedBy;

    const paymentRef = await adminDb.collection("formSubmissionPayments").add(paymentData);

    await writeAuditLog({
      action: "form_submission_payment.recorded",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: paymentRef.id,
      metadata: { formId, submissionId, amount, method },
    });

    logger.info("Form submission payment recorded", {
      paymentId: paymentRef.id,
      formId,
      submissionId,
      orgId: auth.orgId,
    });

    return ok({ payment: { id: paymentRef.id, ...paymentData, createdAt: now.toISOString() } });
  } catch (error) {
    logger.error("Record form submission payment error", { error: String(error) });
    return err("Failed to record payment");
  }
}
