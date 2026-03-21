import { adminDb, adminAuth } from "@/lib/firebase/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;

    // Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Query registration
    const snapshot = await adminDb
      .collection("registrations")
      .where("eventId", "==", eventId)
      .where("userId", "==", uid)
      .limit(1)
      .get();

    const isRegistered = !snapshot.empty;

    return NextResponse.json({
      success: true,
      isRegistered,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to check registration" },
      { status: 500 }
    );
  }
}