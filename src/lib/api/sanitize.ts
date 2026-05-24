export function sanitizeString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim().replace(/[<>]/g, "");
}

export function sanitizeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return isFinite(n) ? n : fallback;
}

export function sanitizeStrings<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === "string" ? sanitizeString(v) : v;
  }
  return out as T;
}
