import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { ok, created, badRequest, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sanitizeString } from "@/lib/api/sanitize";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`user-create:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "SuperAdmin", "Treasurer");
    if (roleError) return roleError;

    const body = await request.json();
    const name = sanitizeString(body.name);
    const email = sanitizeString(body.email).toLowerCase();
    const phoneNumber = sanitizeString(body.phoneNumber ?? "");
    const role = sanitizeString(body.role) || "Youth";
    const { password } = body;

    if (!name || !email || !password) {
      return badRequest("name, email, and password are required");
    }

    const createData: Record<string, string> = { email, password, displayName: name };
    if (phoneNumber.startsWith("+")) createData.phoneNumber = phoneNumber;

    const userRecord = await adminAuth.createUser(createData);
    const resetLink = await adminAuth.generatePasswordResetLink(email);

    const newUser = {
      id: userRecord.uid,
      name,
      email,
      role,
      orgId: auth.orgId!,
      phoneNumber: phoneNumber || null,
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection("users").doc(userRecord.uid).set(newUser);

    await writeAuditLog({
      action: "user.created",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: userRecord.uid,
      metadata: { name, email, role },
    });

    logger.info("User created", { newUserId: userRecord.uid, orgId: auth.orgId, actorId: auth.uid });

    return created({ message: "User created successfully", resetLink, email });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    logger.error("Create user error", { error: String(error) });
    return err(message, 400);
  }
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`users-list:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "SuperAdmin", "Leader", "Treasurer");
    if (roleError) return roleError;

    const snapshot = await adminDb
      .collection("users")
      .where("orgId", "==", auth.orgId)
      .orderBy("createdAt", "desc")
      .get();

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, ...data };
    });

    return ok(users, users.length);
  } catch (error) {
    logger.error("Fetch users error", { error: String(error) });
    return err("Failed to fetch users");
  }
}
