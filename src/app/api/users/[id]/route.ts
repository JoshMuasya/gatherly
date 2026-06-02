import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { ok, badRequest, notFound, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sanitizeString } from "@/lib/api/sanitize";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`user-delete:${ip}`);
  if (limited) return limited;

  try {
    const { id: userId } = await context.params;
    if (!userId) return badRequest("User ID is required");

    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "SuperAdmin", "Treasurer");
    if (roleError) return roleError;

    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return notFound("User not found");
    if (userDoc.data()?.orgId !== auth.orgId) return notFound("User not found");

    // Prevent self-deletion
    if (userId === auth.uid) return badRequest("You cannot delete your own account");

    await userRef.delete();
    await adminAuth.deleteUser(userId);

    await writeAuditLog({
      action: "user.deleted",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: userId,
    });

    logger.info("User deleted", { deletedUserId: userId, orgId: auth.orgId, actorId: auth.uid });

    return ok({ deleted: true });
  } catch (error) {
    logger.error("Delete user error", { error: String(error) });
    return err("Failed to delete user");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`user-update:${ip}`);
  if (limited) return limited;

  try {
    const { id: userId } = await context.params;

    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    // Any user can update their own profile; only admins can update others
    const isSelf = userId === auth.uid;
    if (!isSelf) {
      const roleError = requireRole(auth, "Admin", "SuperAdmin", "Leader", "Treasurer");
      if (roleError) return roleError;
    }

    const body = await request.json();

    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return notFound("User not found");
    if (userDoc.data()?.orgId !== auth.orgId) return notFound("User not found");

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.name) updateData.name = sanitizeString(body.name);
    if (body.email) updateData.email = sanitizeString(body.email).toLowerCase();
    if (body.phoneNumber !== undefined) updateData.phoneNumber = sanitizeString(body.phoneNumber ?? "");
    // Only admins/owners can change roles
    if (body.role && !isSelf) updateData.role = sanitizeString(body.role);

    await userRef.update(updateData);

    await writeAuditLog({
      action: "user.updated",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: userId,
      metadata: updateData,
    });

    return ok({ updated: true });
  } catch (error) {
    logger.error("Update user error", { error: String(error) });
    return err("Failed to update user");
  }
}
