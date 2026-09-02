import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { ok, err, notFound } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";

// Public, unauthenticated endpoint — intentionally skips requireOrgAuth.
// Never returns orgId/createdBy/eventId to the anonymous caller.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ formId: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`public-form-get:${ip}`);
  if (limited) return limited;

  try {
    const { formId } = await context.params;

    const formDoc = await adminDb.collection("forms").doc(formId).get();
    if (!formDoc.exists) return notFound("Form not found");

    const data = formDoc.data()!;

    if (!data.isActive) {
      return ok({ status: "inactive" as const });
    }

    let eventTitle: string | undefined;
    if (data.eventId) {
      const eventDoc = await adminDb.collection("events").doc(data.eventId).get();
      eventTitle = eventDoc.data()?.title;
    }

    return ok({
      status: "active" as const,
      id: formDoc.id,
      title: data.title,
      description: data.description ?? undefined,
      eventTitle,
      fields: data.fields ?? [],
    });
  } catch (error) {
    logger.error("Get public form error", { error: String(error) });
    return err("Failed to load form");
  }
}
