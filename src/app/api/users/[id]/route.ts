import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin";
import { error } from "console";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: userId } = await context.params;

        if (!userId) {
            return NextResponse.json(
                { error: "Event ID is rewuired" },
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

        const userRef = adminDb.collection("users").doc(userId)
        const userD = await userRef.get()

        if (!userD.exists) {
            return NextResponse.json({ error: "User not Found" }, { status: 404 });
        }

        await userRef.delete();

        return NextResponse.json({
            success: true,
            message: "User deleted Successfully",
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
        const { id: userId } = await context.params;
        const body = await request.json();

        const { name, email, phoneNumber, role } =body;

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

        const userrole = userDoc.data()?.role;

        if (userrole !== "Admin" && userrole !== "Leader") {
            return NextResponse.json(
                { error: "Admin or Leader access only" },
                { status: 403 }
            );
        }

        const userRef = adminDb.collection("users").doc(userId);

        const userD = await userRef.get()

        if (!userD.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const updateData = {
            ...(name && { name }),
            ...(phoneNumber && { phoneNumber }),
            ...(email && { email }),
            ...(role && { role }),
            updatedAt: new Date(),
        }

        await userRef.update(updateData);

        return NextResponse.json({
            success: true,
            message: "User updated successfully",
        })
    } catch (error) {
        console.error("Update event error:", error);

        return NextResponse.json(
        { error: "Failed to update event" },
        { status: 500 }
        );
    }
}