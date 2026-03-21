import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Verify Firebase ID Token
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Check if requester is admin
    const adminDoc = await adminDb.collection("users").doc(decodedToken.uid).get();

    if (!adminDoc.exists || adminDoc.data()?.role !== "Admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Generate password reset link
    const resetLink = await adminAuth.generatePasswordResetLink(email);

    return NextResponse.json({
      success: true,
      resetLink,
      email,
    });

  } catch (error) {
    console.error("Reset password error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to generate reset link" },
      { status: 500 }
    );
  }
}