import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebase-admin";

export async function DELETE(req: NextRequest) {
  try {
    const { userId, eventId } = await req.json();

    if (!userId || !eventId) {
      return NextResponse.json(
        { error: "userId and eventId required" },
        { status: 400 }
      );
    }

    const snapshot = await adminDb
      .collection("registrations")
      .where("userId", "==", userId)
      .where("eventId", "==", eventId)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    const batch = adminDb.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Cancel registration error:", error);

    return NextResponse.json(
      { error: "Failed to cancel registration" },
      { status: 500 }
    );
  }
}