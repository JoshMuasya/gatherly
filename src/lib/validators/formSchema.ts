import * as z from "zod";

export const formFieldTypeSchema = z.enum([
  "short_text", "long_text", "email", "phone",
  "number", "single_select", "multi_select", "date",
]);

const formFieldOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const selectTypes = new Set(["single_select", "multi_select"]);

export const formFieldSchema = z
  .object({
    id: z.string().min(1),
    type: formFieldTypeSchema,
    label: z.string().min(1, "Field label is required"),
    required: z.boolean(),
    placeholder: z.string().optional(),
    options: z.array(formFieldOptionSchema).optional(),
    order: z.number(),
  })
  .superRefine((field, ctx) => {
    if (selectTypes.has(field.type)) {
      if (!field.options || field.options.length < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "At least one option is required for select fields",
        });
        return;
      }
      const optionIds = new Set<string>();
      for (const opt of field.options) {
        if (optionIds.has(opt.id)) {
          ctx.addIssue({
            code: "custom",
            path: ["options"],
            message: `Duplicate option id: ${opt.id}`,
          });
        }
        optionIds.add(opt.id);
      }
    }
  });

function assertUniqueFieldIds(fields: { id: string }[], ctx: z.RefinementCtx) {
  const ids = new Set<string>();
  for (const field of fields) {
    if (ids.has(field.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["fields"],
        message: `Duplicate field id: ${field.id}`,
      });
    }
    ids.add(field.id);
  }
}

export const createFormSchema = z
  .object({
    eventId: z.string().min(1, "Event ID is required"),
    title: z.string().min(3, "Title must be at least 3 characters long"),
    description: z.string().optional(),
    fields: z.array(formFieldSchema).min(1, "At least one field is required"),
  })
  .superRefine((data, ctx) => assertUniqueFieldIds(data.fields, ctx));

export const updateFormSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters long").optional(),
    description: z.string().optional(),
    fields: z.array(formFieldSchema).min(1, "At least one field is required").optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fields) assertUniqueFieldIds(data.fields, ctx);
  });
