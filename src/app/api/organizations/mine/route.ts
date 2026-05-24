import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/api/auth";
import { ok, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";
import { OrgSummary } from "@/lib/types";

// GET /api/organizations/mine — list all orgs the current user belongs to
export async function GET(request: NextRequest) {
  const limited = await checkRateLimit(`orgs-mine:${request.headers.get("x-forwarded-for") ?? "unknown"}`);
  if (limited) return limited;

  try {
    const auth = await verifyAuth(request);
    if (isAuthError(auth)) return auth;

    const orgs: OrgSummary[] = [];

    // SuperAdmin can see every organisation
    if (auth.role === "SuperAdmin") {
      const allOrgs = await adminDb.collection("organizations").orderBy("createdAt", "desc").get();
      for (const doc of allOrgs.docs) {
        orgs.push({ id: doc.id, name: doc.data().name, role: "SuperAdmin", plan: doc.data().plan });
      }
      return ok(orgs, orgs.length);
    }

    // Query memberships for this user
    const memberSnap = await adminDb
      .collection("memberships")
      .where("userId", "==", auth.uid)
      .get();

    const memberOrgIds = new Set<string>();
    for (const mdoc of memberSnap.docs) {
      const m = mdoc.data();
      memberOrgIds.add(m.orgId);
      orgs.push({ id: m.orgId, name: m.orgName, role: m.role, plan: undefined });
    }

    // Backfill: include the user's default orgId if not already in memberships
    if (auth.orgId && !memberOrgIds.has(auth.orgId)) {
      const orgDoc = await adminDb.collection("organizations").doc(auth.orgId).get();
      if (orgDoc.exists) {
        orgs.unshift({
          id: orgDoc.id,
          name: orgDoc.data()!.name,
          role: auth.role,
          plan: orgDoc.data()!.plan,
        });
      }
    }

    // Enrich plan for membership orgs that don't have it yet
    const needPlan = orgs.filter(o => o.plan === undefined);
    if (needPlan.length > 0) {
      const orgDocs = await Promise.all(
        needPlan.map(o => adminDb.collection("organizations").doc(o.id).get())
      );
      for (const od of orgDocs) {
        if (od.exists) {
          const match = orgs.find(o => o.id === od.id);
          if (match) match.plan = od.data()!.plan;
        }
      }
    }

    return ok(orgs, orgs.length);
  } catch (error) {
    logger.error("Fetch user orgs error", { error: String(error) });
    return err("Failed to fetch organisations");
  }
}
