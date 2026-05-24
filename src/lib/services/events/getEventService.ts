import { adminDb } from "@/lib/firebase/firebase-admin"

export const getAllEventsService = async () => {
    const snapshot = await adminDb.collection("events").get()

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }))
}

export const getEventByIdService = async (eventId: string) => {
    const snapshot = await adminDb
        .collection("events")
        .where("eventId", "==", eventId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get()

    if (snapshot.empty) {
        throw new Error("Event not found")
    }

    const events = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }))

    return events
}

export const getAllEventsByUserIdService = async (userId: string) => {
    const snapshot = await adminDb
        .collection("events")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get()

    if (snapshot.empty) {
        throw new Error("Event not found")
    }

    const events = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }))

    return events
}