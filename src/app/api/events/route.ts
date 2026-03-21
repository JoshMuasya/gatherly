import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { title, desc, location, maxAttendees, date, isFree, price } =
      await request.json();

    // Check Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify Firebase token
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Get user document
    const callerDoc = await adminDb.collection("users").doc(decodedToken.uid).get();

    if (!callerDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const callerData = callerDoc.data();

    // Correct role check
    if (callerData?.role !== "Admin" && callerData?.role !== "Leader") {
      return NextResponse.json(
        { error: "Admin or Leader access only" },
        { status: 403 }
      );
    }

    // Create event data
    const createEventData = {
      title,
      desc,
      location,
      maxAttendees,
      date,
      isFree,
      price: isFree ? 0 : price,
      createdBy: decodedToken.uid,
      createdAt: new Date(),
      attendeesCount: 0,
    };

    // Save event
    const eventRef = await adminDb.collection("events").add(createEventData);

    return NextResponse.json(
    {
      success: true,
      event: {
        id: eventRef.id,
        ...createEventData,
        createdAt: createEventData.createdAt,
      },
    },
    { status: 201 }
  );
  } catch (err) {
    console.error("Create Event Error:", err);

    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const snapshot = await adminDb
      .collection("events")
      .orderBy("createdAt", "desc")
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        events: [],
        count: 0,
      });
    }

    const events = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: data.title,
        desc: data.desc,
        location: data.location,
        maxAttendees: data.maxAttendees,
        date: data.date,
        isFree: data.isFree,
        price: data.price,
        attendeesCount: data.attendeesCount || 0,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate?.() || null,
      };
    });

    return NextResponse.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Error fetching events:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch events",
      },
      { status: 500 }
    );
  }
}