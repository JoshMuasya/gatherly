import { ZodError } from "zod";
import { NextRequest } from "next/server";
import { checkinSchema } from "../validators/checkinSchema";
import { createCheckinService } from "../services/createCheckinService";
import { writeAuditLog } from "@/lib/api/audit";
import { logger } from "@/lib/logger";

export const createCheckinController = async (
  req: NextRequest,
  orgId: string,
  actorId: string
) => {
  try {
    const body = await req.json();
    const validated = await checkinSchema.parseAsync(body);

    const checkinId = await createCheckinService(validated, orgId);

    await writeAuditLog({
      action: "checkin.created",
      orgId,
      actorId,
      targetId: checkinId,
      metadata: { registrationId: validated.registrationId, eventId: validated.eventId },
    });

    logger.info("Checkin created", { checkinId, orgId, eventId: validated.eventId });

    return Response.json({ success: true, checkinId }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ success: false, error: error.issues }, { status: 400 });
    }
    logger.error("Create checkin error", { error: String(error) });
    return Response.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
};
