import { RateLimiterService } from '../services/rateLimiter.service';
import { SchedulerService } from '../services/scheduler.service';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/db';
import { emailQueue } from '../queues/emailQueue';

describe('RateLimiterService & SchedulerService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows sends up to hourlyLimit and blocks + returns nextWindowMs once exceeded', async () => {
    const counts = new Map<string, number>();

    jest.spyOn(redisConnection, 'pipeline').mockImplementation(() => {
      const ops: Array<() => [null, number]> = [];
      const pipe: any = {
        incr: (key: string) => {
          ops.push(() => {
            const next = (counts.get(key) ?? 0) + 1;
            counts.set(key, next);
            return [null, next];
          });
          return pipe;
        },
        ttl: () => {
          ops.push(() => [null, 3600]);
          return pipe;
        },
        exec: async () => ops.map((fn) => fn()),
      };
      return pipe;
    });

    const senderId = 'snd_test_1';
    const limit = 3;

    const r1 = await RateLimiterService.checkAndConsumeRateLimit(senderId, limit);
    const r2 = await RateLimiterService.checkAndConsumeRateLimit(senderId, limit);
    const r3 = await RateLimiterService.checkAndConsumeRateLimit(senderId, limit);
    const r4 = await RateLimiterService.checkAndConsumeRateLimit(senderId, limit);

    expect(r1.allowed).toBe(true);
    expect(r1.currentCount).toBe(1);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r3.currentCount).toBe(3);

    expect(r4.allowed).toBe(false);
    expect(r4.currentCount).toBe(4);
    expect(r4.limit).toBe(3);
    expect(r4.nextWindowMs).toBeGreaterThanOrEqual(1000);
    expect(r4.nextWindowMs).toBeLessThanOrEqual(3600 * 1000);
  });

  it('sets 2-hour (7200s) TTL when a new hourly bucket key is created', async () => {
    jest.spyOn(redisConnection, 'pipeline').mockImplementation(() => {
      const pipe: any = {
        incr: () => pipe,
        ttl: () => pipe,
        exec: async () => [
          [null, 1],
          [null, -1],
        ],
      };
      return pipe;
    });

    const expireSpy = jest.spyOn(redisConnection, 'expire').mockResolvedValue(1 as any);

    await RateLimiterService.checkAndConsumeRateLimit('snd_ttl_test', 100);
    expect(expireSpy).toHaveBeenCalledTimes(1);
    expect(expireSpy.mock.calls[0][1]).toBe(7200);
  });

  it('acquires exclusive per-job processing lock with NX and releases it cleanly', async () => {
    const lockStore = new Set<string>();

    jest
      .spyOn(redisConnection, 'set')
      .mockImplementation(async (key: any, _val: any, _ex: any, _ttl: any, nx: any) => {
        if (nx === 'NX' && lockStore.has(String(key))) {
          return null as any;
        }
        lockStore.add(String(key));
        return 'OK' as any;
      });

    jest.spyOn(redisConnection, 'del').mockImplementation(async (key: any) => {
      lockStore.delete(String(key));
      return 1 as any;
    });

    const first = await RateLimiterService.acquireJobLock('job_123', 60);
    const second = await RateLimiterService.acquireJobLock('job_123', 60);

    expect(first).toBe(true);
    expect(second).toBe(false);

    await RateLimiterService.releaseJobLock('job_123');
    const afterRelease = await RateLimiterService.acquireJobLock('job_123', 60);
    expect(afterRelease).toBe(true);
  });

  it('bulk-schedules 1000 EmailJobs via BullMQ addBulk with deterministic jobIds', async () => {
    const futureBase = Date.now() + 60_000;
    const fakeJobs = Array.from({ length: 1000 }, (_, i) => ({
      id: `job-uuid-${i}`,
      campaignId: 'cmp-bulk-1000',
      senderId: 'snd-1',
      recipient: `user-${i}@example.com`,
      subject: 'Bulk Load Test',
      body: 'Hello',
      scheduledAt: new Date(futureBase + i * 2000),
      status: 'SCHEDULED',
      idempotencyKey: `email_cmp-bulk-1000_user-${i}@example.com`,
    }));

    jest.spyOn(prisma.emailJob, 'findMany').mockResolvedValue(fakeJobs as any);
    const updateSpy = jest
      .spyOn(prisma.emailJob, 'update')
      .mockImplementation(((args: any) => Promise.resolve({ id: args.where.id })) as any);
    const addBulkSpy = jest
      .spyOn(emailQueue, 'addBulk')
      .mockImplementation(async (items: any[]) => items.map((item) => ({ id: item.opts.jobId } as any)));

    const scheduledCount = await SchedulerService.scheduleCampaign('cmp-bulk-1000');

    expect(scheduledCount).toBe(1000);
    expect(addBulkSpy).toHaveBeenCalledTimes(1);
    const enqueuedBatch = addBulkSpy.mock.calls[0][0];
    expect(enqueuedBatch).toHaveLength(1000);
    expect(enqueuedBatch[0].opts?.jobId).toBe('job_email_cmp-bulk-1000_user-0@example.com');
    expect(enqueuedBatch[999].opts?.delay).toBeGreaterThan(0);
    expect(updateSpy).toHaveBeenCalledTimes(1000);
  });
});
