import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { verifyAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { ok, created, badRequest, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sanitizeString } from "@/lib/api/sanitize";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";

// POST /api/organizations — create org (no existing orgId required, bootstrapping)
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`org-create:${ip}`);
  if (limited) return limited;

  try {
    const auth = await verifyAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "SuperAdmin");
    if (roleError) return roleError;

    const body = await request.json();
    const name = sanitizeString(body.name);
    const rawSlug = sanitizeString(body.slug ?? name);
    const slug = rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    if (!name || !slug) {
      return badRequest("Organization name is required");
    }

    const duplicate = await adminDb
      .collection("organizations")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (!duplicate.empty) {
      return badRequest("This organization slug is already taken");
    }

    const orgData = {
      name,
      slug,
      ownerId: auth.uid,
      plan: "starter",
      createdAt: new Date().toISOString(),
    };

    const orgRef = await adminDb.collection("organizations").add(orgData);

    // Bind org to creating user
    await adminDb.collection("users").doc(auth.uid).update({ orgId: orgRef.id });

    // Write membership record so org switcher can find this org
    await adminDb.collection("memberships").add({
      userId: auth.uid,
      orgId: orgRef.id,
      orgName: name,
      role: "SuperAdmin",
      joinedAt: new Date().toISOString(),
    });

    await writeAuditLog({
      action: "org.created",
      orgId: orgRef.id,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: orgRef.id,
      metadata: { name, slug },
    });

    logger.info("Organization created", { orgId: orgRef.id, name, actorId: auth.uid });

    return created({ id: orgRef.id, ...orgData });
  } catch (error) {
    logger.error("Create org error", { error: String(error) });
    return err("Failed to create organization");
  }
}

// GET /api/organizations — get current user's org
export async function GET(request: NextRequest) {
  const limited = await checkRateLimit(`org-get:${request.headers.get("x-forwarded-for") ?? "unknown"}`);
  if (limited) return limited;

  try {
    const auth = await verifyAuth(request);
    if (isAuthError(auth)) return auth;

    if (!auth.orgId) return ok(null);

    const orgDoc = await adminDb.collection("organizations").doc(auth.orgId).get();

    if (!orgDoc.exists) return ok(null);

    return ok({ id: orgDoc.id, ...orgDoc.data() });
  } catch (error) {
    logger.error("Get org error", { error: String(error) });
    return err("Failed to fetch organization");
  }
}

// PATCH /api/organizations — update org details
// Leaders can update colors only; Admin/Owner/SuperAdmin can update everything
export async function PATCH(request: NextRequest) {
  const limited = await checkRateLimit(`org-update:${request.headers.get("x-forwarded-for") ?? "unknown"}`);
  if (limited) return limited;

  try {
    const auth = await verifyAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Leader", "Admin", "Owner", "SuperAdmin");
    if (roleError) return roleError;

    if (!auth.orgId) return badRequest("No organization to update");

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    const isFullAdmin = ["Admin", "Owner", "SuperAdmin"].includes(auth.role);

    // Colors — any allowed role can update
    if (body.primaryColor !== undefined) updates.primaryColor = sanitizeString(body.primaryColor);
    if (body.secondaryColor !== undefined) updates.secondaryColor = sanitizeString(body.secondaryColor);

    // Full org details — Admin/Owner/SuperAdmin only
    if (isFullAdmin) {
      if (body.name) updates.name = sanitizeString(body.name);
      if (body.logoUrl) updates.logoUrl = sanitizeString(body.logoUrl);
      if (body.roleLabels && typeof body.roleLabels === "object") {
        updates.roleLabels = {
          Youth: sanitizeString(body.roleLabels.Youth ?? ""),
          Leader: sanitizeString(body.roleLabels.Leader ?? ""),
        };
      }
      if (body.whatsappNotifyNumber !== undefined) {
        updates.whatsappNotifyNumber = sanitizeString(body.whatsappNotifyNumber ?? "");
      }
      if (body.paymentDetails && typeof body.paymentDetails === "object") {
        const pd = body.paymentDetails;
        const type = sanitizeString(pd.type ?? "");
        if (!["till", "paybill", "phone"].includes(type)) {
          return badRequest("paymentDetails.type must be 'till', 'paybill', or 'phone'");
        }
        updates.paymentDetails = {
          type,
          number: sanitizeString(pd.number ?? ""),
          businessName: sanitizeString(pd.businessName ?? ""),
          ...(pd.accountName ? { accountName: sanitizeString(pd.accountName) } : {}),
        };
      }
    }

    updates.updatedAt = new Date().toISOString();

    await adminDb.collection("organizations").doc(auth.orgId).update(updates);

    await writeAuditLog({
      action: "org.updated",
      orgId: auth.orgId,
      actorId: auth.uid,
      actorName: auth.name,
      metadata: updates,
    });

    return ok({ updated: true });
  } catch (error) {
    logger.error("Update org error", { error: String(error) });
    return err("Failed to update organization");
  }
}
