import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError } from "@/lib/api/auth";
import { ok, badRequest, notFound, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ registrationId: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`ticket:${ip}`);
  if (limited) return limited;

  const { registrationId } = await context.params;
  if (!registrationId) return badRequest("No registration ID provided");

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const registrationSnap = await adminDb
      .collection("registrations")
      .doc(registrationId)
      .get();

    if (!registrationSnap.exists) return notFound("Registration not found");

    const regData = registrationSnap.data()!;

    // Users may only view their own ticket; admins/leaders may view any
    const isOwner = regData.userId === auth.uid;
    const isManager = ["Admin", "Leader", "SuperAdmin", "Treasurer"].includes(auth.role);

    if (!isOwner && !isManager) return notFound("Registration not found");

    // Scope check — ensure registration belongs to org
    if (regData.orgId !== auth.orgId) return notFound("Registration not found");

    return ok({ id: registrationSnap.id, ...regData });
  } catch (error) {
    logger.error("Fetch ticket error", { error: String(error) });
    return err("Failed to fetch registration");
  }
}
