import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError, requireRole } from "@/lib/api/auth";
import { ok, badRequest, notFound, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";
import { createFormSchema, updateFormSchema } from "@/lib/validators/formSchema";
import { FormDefinition } from "@/lib/types";

function serializeForm(id: string, data: FirebaseFirestore.DocumentData): FormDefinition {
  return {
    id,
    orgId: data.orgId,
    eventId: data.eventId,
    title: data.title,
    description: data.description ?? undefined,
    fields: data.fields ?? [],
    isActive: Boolean(data.isActive),
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? undefined,
  } as FormDefinition;
}

async function getEventOrError(eventId: string, orgId: string) {
  const eventDoc = await adminDb.collection("events").doc(eventId).get();
  if (!eventDoc.exists || eventDoc.data()?.orgId !== orgId) return null;
  return eventDoc;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`event-form-get:${ip}`);
  if (limited) return limited;

  try {
    const { id: eventId } = await context.params;

    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const event = await getEventOrError(eventId, auth.orgId!);
    if (!event) return notFound("Event not found");

    const snap = await adminDb
      .collection("forms")
      .where("eventId", "==", eventId)
      .where("orgId", "==", auth.orgId)
      .limit(1)
      .get();

    if (snap.empty) return ok({ form: null });

    const doc = snap.docs[0];
    return ok({ form: serializeForm(doc.id, doc.data()) });
  } catch (error) {
    logger.error("Get event form error", { error: String(error) });
    return err("Failed to fetch form");
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`event-form-create:${ip}`);
  if (limited) return limited;

  try {
    const { id: eventId } = await context.params;

    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "Leader", "SuperAdmin", "Treasurer", "Owner");
    if (roleError) return roleError;

    const event = await getEventOrError(eventId, auth.orgId!);
    if (!event) return notFound("Event not found");

    const body = await request.json();
    const parsed = createFormSchema.safeParse({ ...body, eventId });
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid form data");
    }

    const existing = await adminDb
      .collection("forms")
      .where("eventId", "==", eventId)
      .where("orgId", "==", auth.orgId)
      .limit(1)
      .get();

    if (!existing.empty) return badRequest("This event already has a form");

    const now = new Date();
    const formData = {
      orgId: auth.orgId!,
      eventId,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      fields: parsed.data.fields,
      isActive: false,
      createdBy: auth.uid,
      createdAt: now,
    };

    const formRef = await adminDb.collection("forms").add(formData);

    await writeAuditLog({
      action: "form.created",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: formRef.id,
      metadata: { eventId },
    });

    const form: FormDefinition = {
      id: formRef.id,
      orgId: formData.orgId,
      eventId: formData.eventId,
      title: formData.title,
      description: formData.description,
      fields: formData.fields,
      isActive: formData.isActive,
      createdBy: formData.createdBy,
      createdAt: now.toISOString(),
    };

    return ok({ form }, undefined, 201);
  } catch (error) {
    logger.error("Create event form error", { error: String(error) });
    return err("Failed to create form");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`event-form-update:${ip}`);
  if (limited) return limited;

  try {
    const { id: eventId } = await context.params;

    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const roleError = requireRole(auth, "Admin", "Leader", "SuperAdmin", "Treasurer", "Owner");
    if (roleError) return roleError;

    const event = await getEventOrError(eventId, auth.orgId!);
    if (!event) return notFound("Event not found");

    const snap = await adminDb
      .collection("forms")
      .where("eventId", "==", eventId)
      .where("orgId", "==", auth.orgId)
      .limit(1)
      .get();

    if (snap.empty) return notFound("Form not found");

    const body = await request.json();
    const parsed = updateFormSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid form data");
    }

    const formRef = snap.docs[0].ref;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.fields !== undefined) updateData.fields = parsed.data.fields;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

    await formRef.update(updateData);

    await writeAuditLog({
      action: "form.updated",
      orgId: auth.orgId!,
      actorId: auth.uid,
      actorName: auth.name,
      targetId: formRef.id,
      metadata: { eventId },
    });

    return ok({ updated: true });
  } catch (error) {
    logger.error("Update event form error", { error: String(error) });
    return err("Failed to update form");
  }
}
