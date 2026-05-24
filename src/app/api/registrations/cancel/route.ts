import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError } from "@/lib/api/auth";
import { ok, badRequest, notFound, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";

export async function DELETE(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`cancel-reg:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(req);
    if (isAuthError(auth)) return auth;

    const { userId, eventId } = await req.json();

    if (!userId || !eventId) {
      return badRequest("userId and eventId are required");
    }

    const snapshot = await adminDb
      .collection("registrations")
      .where("orgId", "==", auth.orgId)
      .where("userId", "==", userId)
      .where("eventId", "==", eventId)
      .get();

    if (snapshot.empty) return notFound("Registration not found");

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    await writeAuditLog({
      action: "registration.cancelled",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      metadata: { userId, eventId },
    });

    logger.info("Registration cancelled", { userId, eventId, orgId: auth.orgId });

    return ok({ cancelled: true });
  } catch (error) {
    logger.error("Cancel registration error", { error: String(error) });
    return err("Failed to cancel registration");
  }
}
