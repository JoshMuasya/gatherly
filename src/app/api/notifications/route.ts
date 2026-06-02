import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/firebase-admin";
import { requireOrgAuth, isAuthError } from "@/lib/api/auth";
import { ok, err } from "@/lib/api/response";
import { logger } from "@/lib/logger";

// GET /api/notifications — returns the current user's notifications
export async function GET(request: NextRequest) {
  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", auth.uid)
      .where("orgId", "==", auth.orgId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const notifications = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return ok({ notifications }, notifications.length);
  } catch (error) {
    logger.error("Fetch notifications error", { error: String(error) });
    return err("Failed to fetch notifications");
  }
}

// PATCH /api/notifications — mark all as read for the current user
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const unread = await adminDb
      .collection("notifications")
      .where("userId", "==", auth.uid)
      .where("orgId", "==", auth.orgId)
      .where("read", "==", false)
      .get();

    const batch = adminDb.batch();
    unread.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
    await batch.commit();

    return ok({ marked: unread.size });
  } catch (error) {
    logger.error("Mark notifications read error", { error: String(error) });
    return err("Failed to mark notifications as read");
  }
}