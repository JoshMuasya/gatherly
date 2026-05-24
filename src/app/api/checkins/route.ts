import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError } from "@/lib/api/auth";
import { badRequest, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { createCheckinController } from "@/lib/controllers/createCheckinController";
import { getCheckinController } from "@/lib/controllers/getCheckinController";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`checkin:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    return createCheckinController(request, auth.orgId!, auth.uid);
  } catch (error) {
    logger.error("Checkin POST error", { error: String(error) });
    return err("Checkin failed");
  }
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`checkins-list:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(request);
    if (isAuthError(auth)) return auth;

    const url = new URL(request.url);
    if (!url.searchParams.get("eventId")) return badRequest("eventId is required");

    return getCheckinController(request, auth.orgId!);
  } catch (error) {
    logger.error("Checkin GET error", { error: String(error) });
    return err("Failed to fetch checkins");
  }
}
