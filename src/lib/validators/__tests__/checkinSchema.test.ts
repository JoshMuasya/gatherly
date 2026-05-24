import { describe, it, expect } from 'vitest';
import { checkinSchema } from '../checkinSchema';

describe('checkinSchema', () => {
    it('accepts valid check-in data', () => {
        const result = checkinSchema.safeParse({ registrationId: 'reg_001', eventId: 'evt_001' });
        expect(result.success).toBe(true);
    });

    it('rejects missing registrationId', () => {
        const result = checkinSchema.safeParse({ eventId: 'evt_001' });
        expect(result.success).toBe(false);
    });

    it('rejects missing eventId', () => {
        const result = checkinSchema.safeParse({ registrationId: 'reg_001' });
        expect(result.success).toBe(false);
    });

    it('rejects empty registrationId', () => {
        const result = checkinSchema.safeParse({ registrationId: '', eventId: 'evt_001' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].path).toContain('registrationId');
        }
    });

    it('rejects empty eventId', () => {
        const result = checkinSchema.safeParse({ registrationId: 'reg_001', eventId: '' });
        expect(result.success).toBe(false);
    });
});
