import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { ok, err, badRequest, notFound } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";
import { buildSubmissionSchema } from "@/lib/validators/formSubmissionSchema";
import { normalizePhoneKey } from "@/lib/phone";
import { FormField } from "@/lib/types";

// Public, unauthenticated endpoint — intentionally skips requireOrgAuth.
// orgId/eventId are always read from the stored form doc, never from the
// request body or any client-supplied header.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ formId: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`public-form-submit:${ip}`);
  if (limited) return limited;

  try {
    const { formId } = await context.params;

    const formDoc = await adminDb.collection("forms").doc(formId).get();
    if (!formDoc.exists) return notFound("Form not found");

    const form = formDoc.data()!;
    if (!form.isActive) return badRequest("This form is no longer accepting responses");

    const fields = (form.fields ?? []) as FormField[];
    const body = await request.json();

    const parsed = buildSubmissionSchema(fields).safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid submission");
    }

    const phoneField = fields.find((f) => f.type === "phone");
    let phoneKey: string | null = null;

    if (phoneField && parsed.data[phoneField.id]) {
      const rawPhone = parsed.data[phoneField.id];
      phoneKey = normalizePhoneKey(String(rawPhone));

      const duplicate = await adminDb
        .collection("formSubmissions")
        .where("formId", "==", formId)
        .where("phoneKey", "==", phoneKey)
        .limit(1)
        .get();

      if (!duplicate.empty) {
        return badRequest(
          "This phone number has already been used to submit this form. Please try again with a different number, or contact one of the youth leaders for help."
        );
      }
    }

    await adminDb.collection("formSubmissions").add({
      orgId: form.orgId,
      formId,
      eventId: form.eventId,
      answers: parsed.data,
      phoneKey,
      submittedAt: new Date(),
    });

    logger.info("Form submission created", { formId, orgId: form.orgId });

    return ok({ submitted: true });
  } catch (error) {
    logger.error("Public form submit error", { error: String(error) });
    return err("Failed to submit form");
  }
}
