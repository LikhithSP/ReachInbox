import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared Redis connection for BullMQ and application locking/caching
export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  lazyConnect: true,
});

redisConnection.on('error', (err) => {
  // Graceful log so application startup without active redis does not throw unhandled exception
  console.warn('[Redis] Connection notice:', err.message);
});

redisConnection.on('connect', () => {
  console.log('[Redis] Connected successfully');
});
