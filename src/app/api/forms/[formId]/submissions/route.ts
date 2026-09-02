import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { ok, notFound, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ formId: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`form-submissions-list:${ip}`);
  if (limited) return limited;

  try {
    const { formId } = await context.params;

    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "Leader", "SuperAdmin", "Treasurer", "Owner");
    if (roleError) return roleError;

    const formDoc = await adminDb.collection("forms").doc(formId).get();
    if (!formDoc.exists || formDoc.data()?.orgId !== auth.orgId) {
      return notFound("Form not found");
    }
    const form = formDoc.data()!;

    const eventDoc = await adminDb.collection("events").doc(form.eventId).get();
    const amountDue = eventDoc.data()?.price ?? 0;

    // Realistic volumes here are small, so pull all payments for this form
    // in one query rather than paginating them alongside submissions.
    const paymentsSnapshot = await adminDb
      .collection("formSubmissionPayments")
      .where("formId", "==", formId)
      .get();

    const paidBySubmissionId: Record<string, number> = {};
    let totalPaid = 0;
    for (const doc of paymentsSnapshot.docs) {
      const data = doc.data();
      const amount = Number(data.amount) || 0;
      paidBySubmissionId[data.submissionId] = (paidBySubmissionId[data.submissionId] ?? 0) + amount;
      totalPaid += amount;
    }

    const countSnapshot = await adminDb
      .collection("formSubmissions")
      .where("formId", "==", formId)
      .count()
      .get();
    const totalSubmissions = countSnapshot.data().count;

    const url = new URL(request.url);
    const limitParam = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
    const cursor = url.searchParams.get("cursor");

    let query = adminDb
      .collection("formSubmissions")
      .where("formId", "==", formId)
      .orderBy("submittedAt", "desc")
      .limit(limitParam);

    if (cursor) {
      const cursorDoc = await adminDb.collection("formSubmissions").doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.get();

    const submissions = snapshot.docs.map((doc) => {
      const data = doc.data();
      const amountPaid = paidBySubmissionId[doc.id] ?? 0;
      return {
        id: doc.id,
        orgId: data.orgId,
        formId: data.formId,
        eventId: data.eventId,
        answers: data.answers ?? {},
        submittedAt: data.submittedAt?.toDate?.()?.toISOString() ?? null,
        amountPaid,
        balance: amountDue - amountPaid,
      };
    });

    const nextCursor = snapshot.docs.length === limitParam
      ? snapshot.docs[snapshot.docs.length - 1].id
      : null;

    return ok({
      form: { id: formDoc.id, title: form.title, fields: form.fields ?? [] },
      submissions,
      nextCursor,
      amountDue,
      summary: {
        totalSubmissions,
        totalPaid,
        totalBalance: totalSubmissions * amountDue - totalPaid,
      },
    }, submissions.length);
  } catch (error) {
    logger.error("List form submissions error", { error: String(error) });
    return err("Failed to fetch submissions");
  }
}
