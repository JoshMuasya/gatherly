import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { ok, created, badRequest, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sanitizeString, sanitizeNumber } from "@/lib/api/sanitize";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`events-create:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "Leader", "SuperAdmin");
    if (roleError) return roleError;

    const body = await request.json();
    const { isFree, price, maxAttendees, date, time } = body;

    const title = sanitizeString(body.title);
    const desc = sanitizeString(body.desc);
    const location = sanitizeString(body.location);

    if (!title || !desc || !location || !maxAttendees || !date) {
      return badRequest("Missing required fields: title, desc, location, maxAttendees, date");
    }

    const eventData = {
      orgId: auth.orgId!,
      title,
      desc,
      location,
      maxAttendees: sanitizeNumber(maxAttendees),
      date: sanitizeString(date),
      time: sanitizeString(time ?? ""),
      isFree: Boolean(isFree),
      price: isFree ? 0 : sanitizeNumber(price),
      createdBy: auth.uid,
      createdAt: new Date(),
      attendeesCount: 0,
    };

    const eventRef = await adminDb.collection("events").add(eventData);

    await writeAuditLog({
      action: "event.created",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: eventRef.id,
      metadata: { title },
    });

    logger.info("Event created", { eventId: eventRef.id, orgId: auth.orgId, actorId: auth.uid });

    return created({ id: eventRef.id, ...eventData, createdAt: eventData.createdAt.toISOString() });
  } catch (error) {
    logger.error("Create event error", { error: String(error) });
    return err("Failed to create event");
  }
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`events-list:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const url = new URL(request.url);
    const limitParam = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
    const cursor = url.searchParams.get("cursor");

    let query = adminDb
      .collection("events")
      .where("orgId", "==", auth.orgId)
      .orderBy("createdAt", "desc")
      .limit(limitParam);

    if (cursor) {
      const cursorDoc = await adminDb.collection("events").doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.get();

    const events = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        orgId: data.orgId,
        title: data.title,
        desc: data.desc,
        location: data.location,
        maxAttendees: data.maxAttendees,
        date: data.date,
        time: data.time ?? "",
        isFree: data.isFree,
        price: data.price,
        attendeesCount: data.attendeesCount ?? 0,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    const nextCursor = snapshot.docs.length === limitParam
      ? snapshot.docs[snapshot.docs.length - 1].id
      : null;

    return ok({ events, nextCursor }, events.length);
  } catch (error) {
    logger.error("Fetch events error", { error: String(error) });
    return err("Failed to fetch events");
  }
}
