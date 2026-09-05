import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type RateLimitFn = (id: string) => Promise<{ success: boolean; remaining?: number }>;

// A healthy same-region Upstash call is well under 50ms. Anything slower than
// this is a misconfiguration, not load — fail open rather than make the user
// wait. (A placeholder UPSTASH_REDIS_REST_URL once cost ~4.5s on every single
// request: DNS failed, the error was swallowed, and nothing surfaced it.)
const TIMEOUT_MS = 500;

// After this many consecutive failures, stop calling the limiter entirely for
// the life of the process, so a broken endpoint costs one timeout, not one per
// request.
const FAILURES_BEFORE_DISABLE = 3;

let _limiter: RateLimitFn | null = null;
let consecutiveFailures = 0;
let disabled = false;
let warnedDisabled = false;

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

function recordFailure(reason: string, identifier: string) {
  consecutiveFailures++;
  if (consecutiveFailures >= FAILURES_BEFORE_DISABLE && !disabled) {
    disabled = true;
    logger.error("Rate limiter disabled after repeated failures", {
      reason,
      consecutiveFailures,
      hint: "Check UPSTASH_REDIS_REST_URL/TOKEN — requests are no longer rate limited.",
    });
  } else if (!disabled) {
    logger.warn("Rate limiter unavailable, allowing request", { reason, identifier });
  }
}

export async function checkRateLimit(identifier: string): Promise<NextResponse | null> {
  // Circuit open: the limiter is known broken, so don't pay the timeout again.
  if (disabled) {
    if (!warnedDisabled) {
      warnedDisabled = true;
      logger.warn("Rate limiting is off for this instance", { identifier });
    }
    return null;
  }

  try {
    const limiter = await getLimiter();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      limiter(identifier),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), TIMEOUT_MS);
      }),
    ]).finally(() => clearTimeout(timer));

    // Timed out — fail open, but loudly, so a broken limiter is visible.
    if (result === null) {
      recordFailure(`timeout after ${TIMEOUT_MS}ms`, identifier);
      return null;
    }

    consecutiveFailures = 0;

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }
    return null;
  } catch (error) {
    // Never block requests due to rate-limiter failure.
    recordFailure(String(error instanceof Error ? error.message : error), identifier);
    return null;
  }
}
