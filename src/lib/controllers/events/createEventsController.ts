
import { adminAuth, adminDb } from "@/lib/firebase/firebase-admin";
import { createEventService } from "@/lib/services/events/createEventService";
import { createEventSchema } from "@/lib/validators/eventsSchema";
import { ZodError } from "zod";

export const createEventsController = async (req: Request) => {
    try {
        // Authorization header check
        const authHeader = req.headers.get("authorization");

        if (!authHeader?.startsWith("Bearer ")) {
            return Response.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Verify Firebase token
        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // Get current user
        const callerDoc = await adminDb
            .collection("users")
            .doc(decodedToken.uid)
            .get();

        if (!callerDoc.exists) {
            return Response.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        const callerData = callerDoc.data();

        // Role check
        if (
            callerData?.role !== "Admin" &&
            callerData?.role !== "Leader"
        ) {
            return Response.json(
                {
                    success: false,
                    error: "Admin or Leader access only",
                },
                { status: 403 }
            );
        }

        // Validate body
        const body = await req.json();

        const validated = await createEventSchema.parseAsync(body);

        // Create event
        const event = await createEventService({
            ...validated,
            createdBy: decodedToken.uid,
        });

        return Response.json(
            {
                success: true,
                event,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("CREATE EVENT ERROR:", error);
        if (error instanceof ZodError) {
            return Response.json(
                { success: false, error: error },
                { status: 400 }
            );
        }

        return Response.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}