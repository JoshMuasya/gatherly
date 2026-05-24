import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest } from "next/server";
import { requireOrgAuth, isAuthError } from "@/lib/api/auth";
import { ok, badRequest, err } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await checkRateLimit(`events-byids:${ip}`);
  if (limited) return limited;

  try {
    const auth = await requireOrgAuth(req);
    if (isAuthError(auth)) return auth;

    const { eventIds } = await req.json();

    if (!eventIds?.length) return ok({ events: [] }, 0);

    if (eventIds.length > 30) return badRequest("Maximum 30 event IDs per request");

    const chunkSize = 10;
    const chunks: string[][] = [];
    for (let i = 0; i < eventIds.length; i += chunkSize) {
      chunks.push(eventIds.slice(i, i + chunkSize));
    }

    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const snapshot = await adminDb
          .collection("events")
          .where("__name__", "in", chunk)
          .where("orgId", "==", auth.orgId)
          .get();

        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      })
    );

    const events = results.flat();
    return ok({ events }, events.length);
  } catch (error) {
    logger.error("Events byIds error", { error: String(error) });
    return err("Failed to fetch events");
  }
}
