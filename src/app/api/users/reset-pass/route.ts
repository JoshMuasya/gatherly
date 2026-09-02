import { adminAuth } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { ok, badRequest, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sanitizeString } from "@/lib/api/sanitize";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`reset-pass:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "SuperAdmin", "Treasurer", "Owner");
    if (roleError) return roleError;

    const body = await request.json();
    const email = sanitizeString(body.email).toLowerCase();

    if (!email) return badRequest("Email is required");

    const resetLink = await adminAuth.generatePasswordResetLink(email);

    logger.info("Password reset link generated", { email, actorId: auth.uid, orgId: auth.orgId });

    return ok({ resetLink, email });
  } catch (error) {
    logger.error("Reset password error", { error: String(error) });
    return err("Failed to generate reset link");
  }
}
