import { NextRequest, NextResponse } from "next/server";

/**
 * Edge middleware — per-IP rate limit for /api/* routes.
 *
 * Best-effort token bucket kept in-memory on each edge instance.
 * A coordinated attacker can spread requests across instances, but
 * the casual bot or scraper hammering /api/applications gets blocked
 * within seconds. Cheap: O(1) Map ops, no JSON parsing, no I/O.
 *
 * Tunable:
 *   LIMIT      = max requests per window per IP
 *   WINDOW_MS  = window size
 *   MAX_BUCKETS = hard cap on Map size, sweeps stale entries on overflow
 */
const LIMIT = 120;
const WINDOW_MS = 60_000;
const MAX_BUCKETS = 5_000;

const buckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for; first value is the original client.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function middleware(request: NextRequest) {
  const ip = clientIp(request);
  const now = Date.now();

  let bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
  }
  bucket.count += 1;
  buckets.set(ip, bucket);

  // Cheap GC — only when the Map gets large, sweep expired entries.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }

  const remaining = Math.max(0, LIMIT - bucket.count);
  const resetSec = Math.floor(bucket.resetAt / 1000);

  if (bucket.count > LIMIT) {
    return new NextResponse(
      JSON.stringify({ error: "Too many requests. Slow down." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((bucket.resetAt - now) / 1000).toString(),
          "X-RateLimit-Limit": String(LIMIT),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(resetSec),
        },
      }
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(LIMIT));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  res.headers.set("X-RateLimit-Reset", String(resetSec));
  return res;
}

export const config = {
  // Only run on API routes — page loads are CDN-cached anyway, and
  // running middleware on every static asset would burn Edge CPU.
  matcher: "/api/:path*",
};
