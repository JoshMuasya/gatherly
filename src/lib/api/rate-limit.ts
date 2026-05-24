import { NextResponse } from "next/server";

type RateLimitFn = (id: string) => Promise<{ success: boolean; remaining?: number }>;

let _limiter: RateLimitFn | null = null;

async function getLimiter(): Promise<RateLimitFn> {
  if (_limiter) return _limiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    _limiter = async () => ({ success: true });
    return _limiter;
  }

  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  const redis = new Redis({ url, token });
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "10 s"),
    analytics: true,
  });

  _limiter = (id: string) => limiter.limit(id);
  return _limiter;
}

export async function checkRateLimit(identifier: string): Promise<NextResponse | null> {
  try {
    const limiter = await getLimiter();
    const result = await limiter(identifier);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }
    return null;
  } catch {
    // Never block requests due to rate-limiter failure
    return null;
  }
}
