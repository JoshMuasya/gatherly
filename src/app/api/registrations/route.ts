import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError } from "@/lib/api/auth";
import { ok, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";

const ADMIN_ROLES = ["Admin", "SuperAdmin", "Leader", "Treasurer"];

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`registrations-list:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const isAdminRole = ADMIN_ROLES.includes(auth.role);

    const url = new URL(request.url);
    const limitParam = Math.min(Number(url.searchParams.get("limit") ?? 100), 200);
    const cursor = url.searchParams.get("cursor");
    const eventId = url.searchParams.get("eventId");

    // Non-admin users can only see their own registrations
    let query = isAdminRole
      ? adminDb.collection("registrations").where("orgId", "==", auth.orgId).limit(limitParam)
      : adminDb.collection("registrations").where("orgId", "==", auth.orgId).where("userId", "==", auth.uid).limit(limitParam);

    if (eventId) {
      query = isAdminRole
        ? adminDb.collection("registrations").where("orgId", "==", auth.orgId).where("eventId", "==", eventId).limit(limitParam)
        : adminDb.collection("registrations").where("orgId", "==", auth.orgId).where("userId", "==", auth.uid).where("eventId", "==", eventId).limit(limitParam);
    }

    if (cursor) {
      const cursorDoc = await adminDb.collection("registrations").doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.get();

    const registrations = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          orgId: data.orgId,
          eventId: data.eventId,
          userId: data.userId,
          name: data.name,
          email: data.email,
          phone: data.phone ?? null,
          registeredAt: data.registeredAt?.toDate?.()?.toISOString() ?? null,
        };
      })
      .sort((a, b) => (b.registeredAt ?? '').localeCompare(a.registeredAt ?? ''));

    const nextCursor = snapshot.docs.length === limitParam
      ? snapshot.docs[snapshot.docs.length - 1].id
      : null;

    return ok({ registrations, nextCursor }, registrations.length);
  } catch (error) {
    logger.error("Fetch registrations error", { error: String(error) });
    return err("Failed to fetch registrations");
  }
}
