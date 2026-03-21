import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebase-admin";

export async function GET( { params }: { params: { registrationId: string } }) {
  const { registrationId } = params;

  if (!registrationId) {
    return NextResponse.json({ error: "No registration ID provided" }, { status: 400 });
  }

  try {

    const registrationRef = adminDb.collection("registrations").doc(registrationId);
    const registrationSnap = await registrationRef.get();

    if (!registrationSnap.exists) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const registrationData = { id: registrationSnap.id, ...registrationSnap.data() };

    return NextResponse.json({ registration: registrationData });
  } catch (error) {
    console.error("Error fetching registration:", error);
    return NextResponse.json({ error: "Failed to fetch registration" }, { status: 500 });
  }
}