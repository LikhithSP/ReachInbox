import { redisConnection } from '../../config/redis';

export class RateLimiterService {
  /**
   * Generates key format: rate-limit:{senderId}:{hourWindow}
   * e.g., rate-limit:snd_123:2026-09-27T10
   */
  private static getRateLimitKey(senderId: string, timestamp: Date = new Date()): string {
    const isoHour = timestamp.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
    return `rate-limit:${senderId}:${isoHour}`;
  }

  /**
   * Atomically checks and increments the hourly sender counter.
   * Returns: { allowed: boolean, currentCount: number, limit: number, nextWindowMs: number }
   */
  public static async checkAndConsumeRateLimit(
    senderId: string,
    hourlyLimit: number
  ): Promise<{
    allowed: boolean;
    currentCount: number;
    limit: number;
    nextWindowMs: number;
  }> {
    const key = this.getRateLimitKey(senderId);

    // Atomic INCR and EXPIRE in pipeline
    const pipeline = redisConnection.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);

    const results = await pipeline.exec();
    const currentCount = (results?.[0]?.[1] as number) || 1;
    const ttl = (results?.[1]?.[1] as number) || -1;

    // Set TTL of 2 hours if key was newly created
    if (ttl <= 0) {
      await redisConnection.expire(key, 7200);
    }

    // Calculate time until start of next hour window
    const now = new Date();
    const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
    const nextWindowMs = Math.max(1000, nextHour.getTime() - now.getTime());

    if (currentCount > hourlyLimit) {
      return {
        allowed: false,
        currentCount,
        limit: hourlyLimit,
        nextWindowMs,
      };
    }

    return {
      allowed: true,
      currentCount,
      limit: hourlyLimit,
      nextWindowMs,
    };
  }

  /**
   * Acquire a distributed processing lock on an EmailJob to prevent concurrent worker execution
   */
  public static async acquireJobLock(emailJobId: string, ttlSeconds: number = 60): Promise<boolean> {
    const lockKey = `email-lock:${emailJobId}`;
    const result = await redisConnection.set(lockKey, 'locked', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Release the distributed processing lock
   */
  public static async releaseJobLock(emailJobId: string): Promise<void> {
    const lockKey = `email-lock:${emailJobId}`;
    await redisConnection.del(lockKey);
  }
}
