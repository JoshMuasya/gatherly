import admin from "firebase-admin";
import { adminDb, adminAuth } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError } from "@/lib/api/auth";
import { ok, badRequest, notFound, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";
import { sendRegistrationConfirmation } from "@/lib/email";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`register:${ip}`);
  if (limited) return limited;

  try {
    const { id: eventId } = await context.params;

    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const eventRef = adminDb.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) return notFound("Event not found");
    if (eventSnap.data()?.orgId !== auth.orgId) return notFound("Event not found");

    const userSnap = await adminDb.collection("users").doc(auth.uid).get();
    const userData = userSnap.data();

    if (!userData) return notFound("User not found");

    // Prevent duplicate registration
    const existing = await adminDb
      .collection("registrations")
      .where("orgId", "==", auth.orgId)
      .where("eventId", "==", eventId)
      .where("userId", "==", auth.uid)
      .get();

    if (!existing.empty) return badRequest("You are already registered for this event");

    let registrationId = "";

    await adminDb.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      const eventData = eventDoc.data();

      if (eventData?.isFree) {
        transaction.update(eventRef, {
          attendeesCount: admin.firestore.FieldValue.increment(1),
        });
      }

      const registrationRef = adminDb.collection("registrations").doc();
      registrationId = registrationRef.id;

      transaction.set(registrationRef, {
        orgId: auth.orgId,
        eventId,
        userId: auth.uid,
        name: userData.name,
        email: userData.email,
        phone: userData.phoneNumber ?? null,
        paymentStatus: eventData?.isFree ? "paid" : "pending",
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await writeAuditLog({
      action: "registration.created",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: registrationId,
      metadata: { eventId },
    });

    // Fire-and-forget — email failure must not fail the registration
    const eventData = eventSnap.data()!;
    sendRegistrationConfirmation({
      to: userData.email,
      name: userData.name,
      eventTitle: eventData.title,
      eventDate: eventData.date,
      eventTime: eventData.time ?? "",
      eventLocation: eventData.location,
      registrationId,
    }).catch((e) => logger.error("Registration email failed", { error: String(e) }));

    logger.info("Registration created", { registrationId, eventId, orgId: auth.orgId });

    return ok({ registrationId });
  } catch (error) {
    logger.error("Registration error", { error: String(error) });
    return err("Registration failed");
  }
}
