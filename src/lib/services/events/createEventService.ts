import { adminDb } from "../../firebase/firebase-admin"

type CreateEventPayload = {
    title: string;
    desc: string;
    location: string;
    maxAttendees: number;
    date: string;
    isFree: boolean;
    price?: number;
    createdBy: string;
};

export const createEventService = async (data: CreateEventPayload) => {
    const createdAt = new Date();

    const createEventData = {
        ...data,
        price: data.isFree ? 0 : data.price || 0,
        createdAt: createdAt,
        attendeesCount: 0,
    };

    const eventRef = await adminDb.collection("events").add(createEventData)

    return {
        id: eventRef.id,
        ...createEventData,
    };
}
