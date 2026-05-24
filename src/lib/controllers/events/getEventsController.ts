import { getAllEventsService, getEventByIdService } from "@/lib/services/events/getEventService"
import { ZodError } from "zod"

export const getEventsController = async () => {
    try {
        const result = await getAllEventsService()

        return Response.json(
            { success: true, result },
            { status: 200 }
        )
    } catch (error) {
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

export const getEventByIdController = async (
    params: { id: string }
) => {
    try {
        const id = params.id

        if (!id) {
            return Response.json(
                { success: false, error: "Event ID is required" },
                { status: 400 }
            );
        }

        const result = await getEventByIdService(id)

        if (!result) {
            return Response.json(
                { success: false, error: "Event not found" },
                { status: 404 }
            );
        }

        return Response.json(
            { success: true, result },
            { status: 200 }
        )
    } catch (error) {
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