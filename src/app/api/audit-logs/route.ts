import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/firebase-admin";
import { requireOrgAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { ok, err } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Leader", "Admin", "Treasurer", "Owner", "SuperAdmin");
    if (roleError) return roleError;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
    const actionCategory = searchParams.get("action");

    const snap = await adminDb
      .collection("auditLogs")
      .where("orgId", "==", auth.orgId)
      .limit(500)
      .get();

    let logs = snap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          action: data.action as string,
          orgId: data.orgId as string,
          actorId: data.actorId as string,
          actorName: (data.actorName as string) ?? null,
          targetId: (data.targetId as string) ?? null,
          metadata: (data.metadata as Record<string, unknown>) ?? null,
          timestamp:
            data.timestamp?.toDate?.()?.toISOString() ?? String(data.timestamp),
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (actionCategory) {
      logs = logs.filter(
        (l) =>
          l.action === actionCategory ||
          l.action.startsWith(actionCategory + ".")
      );
    }

    return ok({ logs: logs.slice(0, limit) });
  } catch (error) {
    console.error("[audit-logs] GET error:", error);
    return err("Failed to fetch audit logs");
  }
}
