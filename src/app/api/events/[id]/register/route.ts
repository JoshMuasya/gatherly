import admin from "firebase-admin";
import { adminDb, adminAuth } from "@/lib/firebase/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {

    const { id: eventId } = await context.params;

    const eventRef = adminDb.collection("events").doc(eventId);

    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Get Authorization Header
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

    // Get user details
    const userSnap = await adminDb.collection("users").doc(uid).get();

    const userData = userSnap.data();

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent duplicate registration
    const existing = await adminDb
      .collection("registrations")
      .where("eventId", "==", eventId)
      .where("userId", "==", uid)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { error: "Already registered" },
        { status: 400 }
      );
    }

    // Firestore Transaction
    await adminDb.runTransaction(async (transaction) => {

      const eventDoc = await transaction.get(eventRef);
      const eventData = eventDoc.data();

      // increment attendees count
      if (eventData?.isFree) {
        transaction.update(eventRef, {
          attendeesCount: admin.firestore.FieldValue.increment(1)
        });
      }

      // create registration
      const registrationRef = adminDb.collection("registrations").doc();

      transaction.set(registrationRef, {
        eventId,
        userId: uid,
        name: userData.name,
        email: userData.email,
        phone: userData.phone ?? null,
        registeredAt: admin.firestore.FieldValue.serverTimestamp()
      });

    });

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}