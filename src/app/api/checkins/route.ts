import { adminDb } from "@/lib/firebase/firebase-admin";

// Unified API handler
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { registrationId, eventId } = body;

    if (!registrationId || !eventId) {
      return Response.json({ error: "Missing registrationId or eventId" }, { status: 400 });
    }

    const checkin = {
      registrationId,
      eventId,
      checkedInAt: new Date().toISOString(),
    };

    await adminDb.collection("checkins").add(checkin);

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to check in" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");

    if (!eventId) {
      return Response.json({ error: "Missing eventId" }, { status: 400 });
    }

    const snapshot = await adminDb
      .collection("checkins")
      .where("eventId", "==", eventId)
      .orderBy("checkedInAt", "desc")
      .get();

    if (snapshot.empty) {
      return Response.json({ success: true, checkins: [] });
    }

    const checkins = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return Response.json({ success: true, checkins });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to fetch check-ins" }, { status: 500 });
  }
}