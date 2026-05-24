import * as z from "zod";

export const checkinSchema = z.object({
  registrationId: z.string().min(1, "Registration ID is required"),
  eventId: z.string().min(1, "Event ID is required"),
});

export type CheckinValues = z.infer<typeof checkinSchema>;
