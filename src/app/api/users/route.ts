import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin";
import { count } from "console";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phoneNumber, role } = await request.json();

    // Security checks (unchanged)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const callerDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    if (!callerDoc.exists || callerDoc.data()!.role !== "Admin") {
      return NextResponse.json({ error: "Admin access only" }, { status: 403 });
    }

    // Create user
    const createUserData: any = { email, password, displayName: name };
    if (phoneNumber?.trim().startsWith("+")) createUserData.phoneNumber = phoneNumber.trim();

    const userRecord = await adminAuth.createUser(createUserData);

    // 🔥 Generate secure password reset link
    const resetLink = await adminAuth.generatePasswordResetLink(email);

    const newUser = {
      id: userRecord.uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || "Youth",
      phoneNumber: phoneNumber?.trim() || null,
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection("users").doc(userRecord.uid).set(newUser);

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      resetLink,                    // ← sent to frontend
      email: newUser.email,
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 400 });
  }
}

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("users")
      .orderBy("createdAt", "desc")
      .get()

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        users: [],
        count: 0
      })
    }

    const users = snapshot.docs.map((doc) => {
      const data = doc.data()

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt,
      }
    })

    return NextResponse.json({
      success: true,
      count: users.length,
      users
    })

  } catch (error) {
    console.error("Error fetching users:", error)

    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}