import { adminDb } from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        const { eventId, amount, method, userId, userName, mpesaCode, cashReceivedBy } = data;

        if (!eventId || !amount || !method) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Create a new payment record
        const paymentData: any = {
            eventId,
            amount,
            method,
            userId,       
            userName,     
            createdAt: new Date().toISOString(),
        };

        if (method === "mpesa") paymentData.mpesaCode = mpesaCode;
        if (method === "cash") paymentData.cashReceivedBy = cashReceivedBy;

        await adminDb.collection("payments").add(paymentData);

        // Increment attendeesCount in the event
        const eventRef = adminDb.collection("events").doc(eventId);
        await eventRef.update({
            attendeesCount: FieldValue.increment(1),
        });

        return NextResponse.json({ message: "Payment recorded successfully" }, { status: 200 });
    } catch (error: any) {
        console.error("Error recording payment:", error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId"); // optional filter

    // Start with the collection reference
    const paymentsCol = adminDb.collection("payments");

    // Create a query, optionally filtering by userId
    const paymentsQuery = userId
      ? paymentsCol.where("userId", "==", userId)
      : paymentsCol;

    const snapshot = await paymentsQuery.get();

    const payments: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      payments.push({
        id: doc.id,
        eventId: data.eventId,
        amount: data.amount,
        method: data.method,
        mpesaCode: data.mpesaCode || null,
        cashReceivedBy: data.cashReceivedBy || null,
        userId: data.userId || null,
        userName: data.userName || null,
        eventTitle: data.eventTitle || null,
        paymentDate: data.createdAt || null,
      });
    });

    return NextResponse.json({ payments }, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching payments:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}