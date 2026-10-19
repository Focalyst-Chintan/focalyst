// Simple in-memory rate limiter for Next.js App Router API Routes
// Note: In serverless environments (like Vercel), memory resets on cold starts.
// For production, consider using a Redis store (e.g. Vercel KV, Upstash).

const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

export function rateLimit(ip: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    // Clean up old records periodically
    if (rateLimitMap.size > 1000) {
        for (const [key, val] of rateLimitMap.entries()) {
            if (now > val.resetTime) {
                rateLimitMap.delete(key);
            }
        }
    }

    if (!record) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return true;
    }

    if (record.count >= limit) {
        return false;
    }

    record.count++;
    return true;
}
