import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { ok, badRequest, notFound, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sanitizeString, sanitizeNumber } from "@/lib/api/sanitize";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`event-delete:${ip}`);
  if (limited) return limited;

  try {
    const { id: eventId } = await context.params;
    if (!eventId) return badRequest("Event ID is required");

    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "SuperAdmin");
    if (roleError) return roleError;

    const eventRef = adminDb.collection("events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) return notFound("Event not found");

    // Ensure event belongs to this org
    if (eventDoc.data()?.orgId !== auth.orgId) return notFound("Event not found");

    await eventRef.delete();

    await writeAuditLog({
      action: "event.deleted",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: eventId,
    });

    logger.info("Event deleted", { eventId, orgId: auth.orgId, actorId: auth.uid });

    return ok({ deleted: true });
  } catch (error) {
    logger.error("Delete event error", { error: String(error) });
    return err("Failed to delete event");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`event-update:${ip}`);
  if (limited) return limited;

  try {
    const { id: eventId } = await context.params;

    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "Leader", "SuperAdmin");
    if (roleError) return roleError;

    const body = await request.json();
    const { isFree, price, maxAttendees, date, time } = body;

    const eventRef = adminDb.collection("events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) return notFound("Event not found");
    if (eventDoc.data()?.orgId !== auth.orgId) return notFound("Event not found");

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.title) updateData.title = sanitizeString(body.title);
    if (body.desc) updateData.desc = sanitizeString(body.desc);
    if (body.location) updateData.location = sanitizeString(body.location);
    if (maxAttendees !== undefined) updateData.maxAttendees = sanitizeNumber(maxAttendees);
    if (date) updateData.date = sanitizeString(date);
    if (time !== undefined) updateData.time = sanitizeString(time);
    if (typeof isFree === "boolean") {
      updateData.isFree = isFree;
      updateData.price = isFree ? 0 : sanitizeNumber(price ?? 0);
    }

    await eventRef.update(updateData);

    await writeAuditLog({
      action: "event.updated",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: eventId,
      metadata: updateData,
    });

    return ok({ updated: true });
  } catch (error) {
    logger.error("Update event error", { error: String(error) });
    return err("Failed to update event");
  }
}
