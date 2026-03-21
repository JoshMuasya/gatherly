import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Authorization
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Check user role
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const role = userDoc.data()?.role;

    if (role !== "Admin" && role !== "Leader") {
      return NextResponse.json(
        { error: "Admin or Leader access only" },
        { status: 403 }
      );
    }

    const eventRef = adminDb.collection("events").doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await eventRef.delete();

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
    });

  } catch (error) {
    console.error("Delete event error:", error);

    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: eventId } = await context.params;
        const body = await request.json();

        const { title, desc, location, maxAttendees, date, isFree, price } = body;

        // Authorization
        const authHeader = request.headers.get("Authorization");

        if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const role = userDoc.data()?.role;

        if (role !== "Admin" && role !== "Leader") {
            return NextResponse.json(
                { error: "Admin or Leader access only" },
                { status: 403 }
            );
        }

        const eventRef = adminDb.collection("events").doc(eventId);

        const eventDoc = await eventRef.get()

        if (!eventDoc.exists) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 })
        }

        const updateData = {
            ...(title && { title }),
            ...(desc && { desc }),
            ...(location && { location }),
            ...(maxAttendees && { maxAttendees }),
            ...(date && { date }),
            ...(typeof isFree === "boolean" && { isFree }),
            ...(price !== undefined && { price }),
            updatedAt: new Date(),
        }

        await eventRef.update(updateData)

        return NextResponse.json({
            success: true,
            message: "Event updated successfully",
        })
        
    } catch (error) {
        console.error("Update event error:", error);

        return NextResponse.json(
        { error: "Failed to update event" },
        { status: 500 }
        );
    }

}