import * as z from "zod";

export const createEventSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters long"),
    desc: z.string().min(10, "Description must be at least 10 characters long"),
    location: z.string().min(3, "Location must be at least 3 characters long"),
    maxAttendees: z.number().min(1, "Max attendees must be at least 1"),
    date: z.string().min(1, "Date is required"),
    isFree: z.boolean(),
    price: z.number().min(0, "Price must be at least 0"),
});

export const updateEventSchema = z.object({
    eventId: z.string().min(1, "Event ID is required").optional(),
    title: z.string().min(3, "Title must be at least 3 characters long").optional(),
    desc: z.string().min(10, "Description must be at least 10 characters long").optional(),
    location: z.string().min(3, "Location must be at least 3 characters long").optional(),
    maxAttendees: z.number().min(1, "Max attendees must be at least 1").optional(),
    date: z.string().min(1, "Date is required").optional(),
    isFree: z.boolean().optional(),
    price: z.number().min(0, "Price must be at least 0").optional(),
});

export const idEventSchema = z.object({
    eventId: z.string().min(1, "Event ID is required"),
});
