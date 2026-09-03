import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { ok, notFound, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";

// Admin-only read of anonymous responses. There is nothing here to scope to
// an individual submitter — these documents were written with no submission
// id, phone key, or other linking field, by design.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ formId: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`form-anonymous-responses:${ip}`);
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

    const snapshot = await adminDb
      .collection("formAnonymousResponses")
      .where("formId", "==", formId)
      .get();

    const responses = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        fieldId: data.fieldId,
        fieldLabel: data.fieldLabel,
        answer: data.answer,
        submittedDate: data.submittedDate,
      };
    });

    return ok({ responses }, responses.length);
  } catch (error) {
    logger.error("List anonymous responses error", { error: String(error) });
    return err("Failed to fetch anonymous responses");
  }
}
