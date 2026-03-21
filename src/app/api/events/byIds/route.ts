import { adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { eventIds } = await req.json();

    if (!eventIds || eventIds.length === 0) {
      return NextResponse.json({ events: [] });
    }

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
          .get();

        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      })
    );

    const events = results.flat();
    return NextResponse.json({ events });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}