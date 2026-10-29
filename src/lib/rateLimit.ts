// Tiny in-memory limiter (per server instance) to blunt form spam.
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 6, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export const isEmail = (v: unknown): v is string =>
  typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 160;

export const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
