import { describe, it, expect } from 'vitest';
import { sanitizeString, sanitizeNumber, sanitizeStrings } from '../sanitize';

describe('sanitizeString', () => {
    it('trims whitespace', () => {
        expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('strips < and > characters', () => {
        expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('returns fallback for non-string input', () => {
        expect(sanitizeString(null)).toBe('');
        expect(sanitizeString(undefined)).toBe('');
        expect(sanitizeString(42)).toBe('');
        expect(sanitizeString(42, 'default')).toBe('default');
    });

    it('returns empty string for empty input', () => {
        expect(sanitizeString('')).toBe('');
    });
});

describe('sanitizeNumber', () => {
    it('parses valid numbers', () => {
        expect(sanitizeNumber('42')).toBe(42);
        expect(sanitizeNumber(3.14)).toBe(3.14);
    });

    it('returns fallback for non-numeric input', () => {
        expect(sanitizeNumber('abc')).toBe(0);
        expect(sanitizeNumber(null)).toBe(0);
        expect(sanitizeNumber(undefined, -1)).toBe(-1);
    });

    it('handles Infinity and NaN', () => {
        expect(sanitizeNumber(Infinity)).toBe(0);
        expect(sanitizeNumber(NaN)).toBe(0);
    });
});

describe('sanitizeStrings', () => {
    it('sanitizes all string values in an object', () => {
        const result = sanitizeStrings({ name: '  Alice  ', age: 30, bio: '<b>bold</b>' });
        expect(result.name).toBe('Alice');
        expect(result.age).toBe(30);
        expect(result.bio).toBe('bbold/b');
    });

    it('leaves non-string values unchanged', () => {
        const input = { count: 5, active: true, tags: ['a', 'b'] };
        const result = sanitizeStrings(input);
        expect(result.count).toBe(5);
        expect(result.active).toBe(true);
        expect(result.tags).toEqual(['a', 'b']);
    });
});
