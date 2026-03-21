import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("registrations")
      .orderBy("registeredAt", "desc")
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        registrations: [],
        count: 0,
      });
    }

    const registrations = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        eventId: data.eventId,
        userId: data.userId,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        registeredAt: data.registeredAt
          ? data.registeredAt.toDate().toISOString()
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      registrations,
      count: registrations.length,
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);

    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}