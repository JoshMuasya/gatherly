import { describe, it, expect } from 'vitest';
import { createEventSchema, updateEventSchema, idEventSchema } from '../eventsSchema';

describe('createEventSchema', () => {
    const valid = {
        title: 'Youth Camp 2025',
        desc: 'A great event for everyone',
        location: 'Nairobi',
        maxAttendees: 100,
        date: '2025-08-01T09:00',
        isFree: false,
        price: 500,
    };

    it('accepts a valid event', () => {
        const result = createEventSchema.safeParse(valid);
        expect(result.success).toBe(true);
    });

    it('rejects a title that is too short', () => {
        const result = createEventSchema.safeParse({ ...valid, title: 'Hi' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].path).toContain('title');
        }
    });

    it('rejects a description that is too short', () => {
        const result = createEventSchema.safeParse({ ...valid, desc: 'Short' });
        expect(result.success).toBe(false);
    });

    it('rejects negative price', () => {
        const result = createEventSchema.safeParse({ ...valid, price: -10 });
        expect(result.success).toBe(false);
    });

    it('rejects zero maxAttendees', () => {
        const result = createEventSchema.safeParse({ ...valid, maxAttendees: 0 });
        expect(result.success).toBe(false);
    });

    it('accepts free event with price 0', () => {
        const result = createEventSchema.safeParse({ ...valid, isFree: true, price: 0 });
        expect(result.success).toBe(true);
    });
});

describe('updateEventSchema', () => {
    it('accepts an empty update (all fields optional)', () => {
        expect(updateEventSchema.safeParse({}).success).toBe(true);
    });

    it('accepts a partial update', () => {
        expect(updateEventSchema.safeParse({ title: 'New Title Here' }).success).toBe(true);
    });

    it('rejects an invalid partial update', () => {
        const result = updateEventSchema.safeParse({ title: 'Ab' });
        expect(result.success).toBe(false);
    });
});

describe('idEventSchema', () => {
    it('accepts a non-empty id', () => {
        expect(idEventSchema.safeParse({ eventId: 'abc123' }).success).toBe(true);
    });

    it('rejects empty string id', () => {
        expect(idEventSchema.safeParse({ eventId: '' }).success).toBe(false);
    });
});
