import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { created, badRequest, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sanitizeString } from "@/lib/api/sanitize";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";
import { sendInvitation } from "@/lib/email";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`user-invite:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "SuperAdmin", "Treasurer");
    if (roleError) return roleError;

    const body = await request.json();
    const name = sanitizeString(body.name);
    const email = sanitizeString(body.email ?? "").toLowerCase();
    const role = sanitizeString(body.role) || "Youth";

    if (!name || !email) return badRequest("name and email are required");

    // Create Firebase Auth user with random temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + "Aa1!";
    const userRecord = await adminAuth.createUser({
      email,
      password: tempPassword,
      displayName: name,
    });

    // Fetch org name (needed for membership record and email)
    let orgName = "your organisation";
    try {
      const orgDoc = await adminDb.collection("organizations").doc(auth.orgId!).get();
      if (orgDoc.exists) orgName = orgDoc.data()?.name ?? orgName;
    } catch { /* non-critical */ }

    // Persist user doc scoped to org
    await adminDb.collection("users").doc(userRecord.uid).set({
      id: userRecord.uid,
      name,
      email,
      role,
      orgId: auth.orgId!,
      phoneNumber: null,
      createdAt: new Date().toISOString(),
    });

    // Write membership so the invited user can find this org in their switcher
    await adminDb.collection("memberships").add({
      userId: userRecord.uid,
      orgId: auth.orgId!,
      orgName,
      role,
      joinedAt: new Date().toISOString(),
    });

    // Generate password reset / activation link
    const inviteLink = await adminAuth.generatePasswordResetLink(email);

    // Send invitation email (fire and forget — orgName already fetched above)
    sendInvitation({ to: email, name, orgName, inviteLink, role }).catch(() => { });

    await writeAuditLog({
      action: "user.created",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: userRecord.uid,
      metadata: { name, email, role, method: "invite" },
    });

    logger.info("User invited", { newUserId: userRecord.uid, orgId: auth.orgId, actorId: auth.uid });

    return created({ message: `Invitation sent to ${email}`, userId: userRecord.uid });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send invitation";
    logger.error("Invite user error", { error: String(error) });
    return err(message, 400);
  }
}
