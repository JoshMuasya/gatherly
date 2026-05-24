import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError } from "@/lib/api/auth";
import { ok, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`check-reg:${ip}`);
  if (limited) return limited;

  try {
    const { id: eventId } = await context.params;

    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const snapshot = await adminDb
      .collection("registrations")
      .where("orgId", "==", auth.orgId)
      .where("eventId", "==", eventId)
      .where("userId", "==", auth.uid)
      .limit(1)
      .get();

    const isRegistered = !snapshot.empty;
    const registrationId = isRegistered ? snapshot.docs[0].id : null;

    return ok({ isRegistered, registrationId });
  } catch (error) {
    logger.error("Check registration error", { error: String(error) });
    return err("Failed to check registration");
  }
}
