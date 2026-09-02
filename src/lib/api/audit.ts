import { adminDb } from "@/lib/firebase/firebase-admin";

export type AuditAction =
  | "org.created" | "org.updated"
  | "user.created" | "user.updated" | "user.deleted"
  | "event.created" | "event.updated" | "event.deleted"
  | "registration.created" | "registration.cancelled"
  | "payment.recorded" | "payment.approved" | "payment.rejected"
  | "checkin.created"
  | "form.created" | "form.updated"
  | "form_submission_payment.recorded";

interface AuditEntry {
  action: AuditAction;
  orgId: string;
  actorId: string;
  actorName?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await adminDb.collection("auditLogs").add({
      ...entry,
      timestamp: new Date(),
    });
  } catch (error) {
    // Audit log failure must never break the main operation
    console.error("[audit] Write failed:", error);
  }
}
