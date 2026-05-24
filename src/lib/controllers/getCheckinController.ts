import { ZodError } from "zod";
import { NextRequest } from "next/server";
import { getCheckinService } from "../services/getCheckinService";
import { logger } from "@/lib/logger";

export const getCheckinController = async (req: NextRequest, orgId: string) => {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");

    if (!eventId) {
      return Response.json({ error: "Missing eventId" }, { status: 400 });
    }

    const checkins = await getCheckinService(eventId, orgId);

    return Response.json({ success: true, checkins });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ success: false, error: error.issues }, { status: 400 });
    }
    logger.error("Get checkins error", { error: String(error) });
    return Response.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
};
