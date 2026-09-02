// Collapses common Kenyan number format variants (07xxxxxxxx, +2547xxxxxxxx,
// 2547xxxxxxxx) down to the same comparison key. Deliberately not a full
// E.164 parser — just enough to catch the same person resubmitting a form.
export function normalizePhoneKey(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.slice(-9);
}
