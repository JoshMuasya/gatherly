import * as z from "zod";
import { FormField } from "@/lib/types";

function baseSchemaForField(field: FormField): z.ZodType {
  switch (field.type) {
    case "email":
      return z.string().trim().email("Enter a valid email address");
    case "phone":
      return z.string().trim().min(7, "Enter a valid phone number");
    case "number":
      return z.coerce.number("Enter a valid number");
    case "date":
      return z.string().trim().min(1, "Date is required");
    case "long_text":
    case "short_text":
      return z.string().trim();
    case "single_select": {
      const ids = (field.options ?? []).map((o) => o.id) as [string, ...string[]];
      return z.enum(ids.length > 0 ? ids : ["__none__"]);
    }
    case "multi_select": {
      const ids = (field.options ?? []).map((o) => o.id) as [string, ...string[]];
      return z.array(z.enum(ids.length > 0 ? ids : ["__none__"]));
    }
    default:
      return z.string();
  }
}

/**
 * Builds a zod schema for a submission's answers, keyed by field id,
 * derived dynamically from the form's own field configuration. Shared by
 * the public submit route (server) and the public form page (client).
 */
export function buildSubmissionSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodType> = {};

  for (const field of fields) {
    let schema = baseSchemaForField(field);

    if (field.required) {
      if (field.type === "multi_select") {
        schema = (schema as z.ZodArray<z.ZodType>).min(1, `${field.label} is required`);
      } else if (field.type !== "single_select" && field.type !== "number") {
        schema = (schema as z.ZodString).min(1, `${field.label} is required`);
      }
    } else {
      schema = schema.optional();
    }

    shape[field.id] = schema;
  }

  return z.object(shape);
}
