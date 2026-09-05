import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

// Controls how the fake Upstash limiter behaves for each test.
let limitBehavior: () => Promise<{ success: boolean }> = async () => ({ success: true });

vi.mock('@upstash/redis', () => ({
  Redis: class { constructor(_: unknown) { void _; } },
}));

vi.mock('@upstash/ratelimit', () => {
  class Ratelimit {
    static slidingWindow() { return {}; }
    constructor(_: unknown) { void _; }
    limit() { return limitBehavior(); }
  }
  return { Ratelimit };
});

async function freshModule() {
  vi.resetModules();
  return import('../rate-limit');
}

describe('checkRateLimit', () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it('allows the request when under the limit', async () => {
    limitBehavior = async () => ({ success: true });
    const { checkRateLimit } = await freshModule();
    expect(await checkRateLimit('ip-1')).toBeNull();
  });

  it('returns 429 when over the limit', async () => {
    limitBehavior = async () => ({ success: false });
    const { checkRateLimit } = await freshModule();
    const res = await checkRateLimit('ip-2');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
  });

  it('is a no-op with zero latency when Upstash is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const { checkRateLimit } = await freshModule();
    const start = Date.now();
    expect(await checkRateLimit('ip-3')).toBeNull();
    expect(Date.now() - start).toBeLessThan(50);
  });

  // The actual regression this guard exists for: an unreachable Redis endpoint
  // used to hang the request (~4.5s in production) instead of failing fast.
  it('fails open quickly instead of hanging when the limiter never responds', async () => {
    limitBehavior = () => new Promise(() => { /* never resolves */ });
    const { checkRateLimit } = await freshModule();

    const start = Date.now();
    const res = await checkRateLimit('ip-4');
    const elapsed = Date.now() - start;

    expect(res).toBeNull();          // request allowed through
    expect(elapsed).toBeLessThan(1500); // capped by the 500ms timeout, not unbounded
  });

  it('stops calling a persistently broken limiter (circuit breaker)', async () => {
    let calls = 0;
    limitBehavior = () => { calls++; return new Promise(() => {}); };
    const { checkRateLimit } = await freshModule();

    // Trip the breaker
    for (let i = 0; i < 3; i++) await checkRateLimit(`ip-${i}`);
    const callsAfterTrip = calls;

    // Subsequent requests should short-circuit without touching the limiter
    const start = Date.now();
    expect(await checkRateLimit('ip-later')).toBeNull();
    expect(Date.now() - start).toBeLessThan(50);
    expect(calls).toBe(callsAfterTrip);
  });

  it('rejects with 429 again after a recovery', async () => {
    limitBehavior = async () => ({ success: false });
    const { checkRateLimit } = await freshModule();
    const res = await checkRateLimit('ip-5');
    expect(res!.status).toBe(429);
  });
});
