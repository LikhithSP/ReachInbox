import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
dotenv.config();

import os from 'os';
import net from 'net';
import { v4 as uuidv4 } from 'uuid';
import { Worker, Job } from 'bullmq';
import { EmailJobQueuePayload } from '@reachinbox/shared';
import { prisma } from '../config/db';
import { redisConnection } from '../config/redis';
import { EMAIL_QUEUE_NAME, emailQueue, emailQueueEvents } from '../queues/emailQueue';
import { RateLimiterService } from '../services/rateLimiter.service';
import { SchedulerService } from '../services/scheduler.service';
import { SmtpService } from '../integrations/smtp/smtp.service';
import { SlackService } from '../integrations/slack/slack.service';
import { SearchService } from '../integrations/elasticsearch/search.service';

interface BenchmarkOptions {
  mode: 'auto' | 'live' | 'simulated';
  jobs: number;
  workers: number;
  concurrency: number;
  hourlyLimit: number;
  delayMs: number;
  smtpLatencyMs: number;
  duplicateChecks: number;
  keepData: boolean;
  json: boolean;
}

interface BenchmarkMetrics {
  mode: 'live' | 'simulated';
  environment: {
    nodeVersion: string;
    platform: string;
    cpus: number;
    hostname: string;
  };
  config: {
    jobs: number;
    workers: number;
    concurrencyPerWorker: number;
    effectiveParallelSlots: number;
    hourlyLimit: number;
    delayMs: number;
    smtpLatencyMs: number;
    duplicateChecks: number;
  };
  timings: {
    ingestionMs: number;
    ingestionThroughputJobsPerSec: number;
    processingMs: number;
    processingThroughputJobsPerSec: number;
    totalMs: number;
  };
  jobLatencyMs: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  outcomes: {
    sent: number;
    rateLimitedAndRescheduled: number;
    failed: number;
    duplicateSendsPrevented: number;
    lockContentionsSkipped: number;
  };
  memoryMb: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
}

function parseArgs(argv: string[]): BenchmarkOptions {
  const getArg = (name: string, fallback: string): string => {
    const prefix = `--${name}=`;
    const match = argv.find((a) => a.startsWith(prefix));
    return match ? match.slice(prefix.length) : fallback;
  };

  const hasFlag = (name: string): boolean => argv.includes(`--${name}`);

  const rawMode = getArg('mode', 'auto');
  const mode: BenchmarkOptions['mode'] =
    rawMode === 'live' || rawMode === 'simulated' ? rawMode : 'auto';

  return {
    mode,
    jobs: Math.max(1, parseInt(getArg('jobs', '1000'), 10)),
    workers: Math.max(1, parseInt(getArg('workers', '3'), 10)),
    concurrency: Math.max(1, parseInt(getArg('concurrency', '5'), 10)),
    hourlyLimit: Math.max(1, parseInt(getArg('hourly-limit', '1000'), 10)),
    delayMs: Math.max(0, parseInt(getArg('delay-ms', '0'), 10)),
    smtpLatencyMs: Math.max(0, parseInt(getArg('smtp-latency-ms', '2'), 10)),
    duplicateChecks: Math.max(0, parseInt(getArg('duplicate-checks', '50'), 10)),
    keepData: hasFlag('keep-data'),
    json: hasFlag('json'),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Number(sorted[idx].toFixed(2));
}

function checkTcpPort(host: string, port: number, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok: boolean) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(ok);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function parseHostPort(urlString: string, defaultHost: string, defaultPort: number) {
  try {
    const parsed = new URL(urlString);
    return {
      host: parsed.hostname || defaultHost,
      port: parsed.port ? parseInt(parsed.port, 10) : defaultPort,
    };
  } catch {
    return { host: defaultHost, port: defaultPort };
  }
}

async function detectInfrastructure(): Promise<{ mysql: boolean; redis: boolean }> {
  const mysqlTarget = parseHostPort(
    process.env.DATABASE_URL || 'mysql://localhost:3306/reachinbox',
    'localhost',
    3306
  );
  const redisTarget = parseHostPort(
    process.env.REDIS_URL || 'redis://localhost:6379',
    'localhost',
    6379
  );

  const [mysql, redis] = await Promise.all([
    checkTcpPort(mysqlTarget.host, mysqlTarget.port),
    checkTcpPort(redisTarget.host, redisTarget.port),
  ]);

  return { mysql, redis };
}

function buildMetrics(
  mode: 'live' | 'simulated',
  opts: BenchmarkOptions,
  ingestionMs: number,
  processingMs: number,
  latencies: number[],
  outcomes: BenchmarkMetrics['outcomes']
): BenchmarkMetrics {
  const sorted = [...latencies].sort((a, b) => a - b);
  const mem = process.memoryUsage();

  return {
    mode,
    environment: {
      nodeVersion: process.version,
      platform: `${os.platform()} ${os.arch()}`,
      cpus: os.cpus().length,
      hostname: os.hostname(),
    },
    config: {
      jobs: opts.jobs,
      workers: opts.workers,
      concurrencyPerWorker: opts.concurrency,
      effectiveParallelSlots: opts.workers * opts.concurrency,
      hourlyLimit: opts.hourlyLimit,
      delayMs: opts.delayMs,
      smtpLatencyMs: opts.smtpLatencyMs,
      duplicateChecks: opts.duplicateChecks,
    },
    timings: {
      ingestionMs: Number(ingestionMs.toFixed(2)),
      ingestionThroughputJobsPerSec: Number(((opts.jobs / Math.max(1, ingestionMs)) * 1000).toFixed(2)),
      processingMs: Number(processingMs.toFixed(2)),
      processingThroughputJobsPerSec: Number(((opts.jobs / Math.max(1, processingMs)) * 1000).toFixed(2)),
      totalMs: Number((ingestionMs + processingMs).toFixed(2)),
    },
    jobLatencyMs: {
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      max: sorted.length > 0 ? Number(sorted[sorted.length - 1].toFixed(2)) : 0,
    },
    outcomes,
    memoryMb: {
      rss: Number((mem.rss / (1024 * 1024)).toFixed(2)),
      heapUsed: Number((mem.heapUsed / (1024 * 1024)).toFixed(2)),
      heapTotal: Number((mem.heapTotal / (1024 * 1024)).toFixed(2)),
    },
  };
}

/**
 * Simulated offline load benchmark:
 * Exercises RateLimiterService, SchedulerService, deterministic idempotency keys,
 * concurrent worker slots, distributed locks, and atomic hourly rate limiting
 * against an in-memory Redis + MySQL + SMTP harness when Docker is unavailable.
 */
async function runSimulatedBenchmark(opts: BenchmarkOptions): Promise<BenchmarkMetrics> {
  emailQueue.on('error', () => {});
  emailQueueEvents.on('error', () => {});

  // In-memory atomic Redis store (single-threaded JS execution guarantees atomic ops)
  const kvCounters = new Map<string, { value: number; expiresAt: number | null }>();
  const locks = new Map<string, number>();

  const purgeExpired = (key: string) => {
    const entry = kvCounters.get(key);
    if (entry && entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
      kvCounters.delete(key);
    }
    const lockExp = locks.get(key);
    if (lockExp !== undefined && Date.now() >= lockExp) {
      locks.delete(key);
    }
  };

  (redisConnection as any).pipeline = () => {
    const ops: Array<() => [null, number]> = [];
    const pipe = {
      incr(key: string) {
        ops.push(() => {
          purgeExpired(key);
          const existing = kvCounters.get(key);
          const nextVal = (existing?.value ?? 0) + 1;
          kvCounters.set(key, { value: nextVal, expiresAt: existing?.expiresAt ?? null });
          return [null, nextVal];
        });
        return pipe;
      },
      ttl(key: string) {
        ops.push(() => {
          purgeExpired(key);
          const existing = kvCounters.get(key);
          if (!existing || existing.expiresAt === null) return [null, -1];
          return [null, Math.max(0, Math.ceil((existing.expiresAt - Date.now()) / 1000))];
        });
        return pipe;
      },
      async exec() {
        return ops.map((fn) => fn());
      },
    };
    return pipe;
  };

  (redisConnection as any).expire = async (key: string, ttlSeconds: number) => {
    const entry = kvCounters.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return 1;
  };

  (redisConnection as any).set = async (
    key: string,
    _val: string,
    _exFlag: string,
    ttlSeconds: number,
    nxFlag: string
  ) => {
    purgeExpired(key);
    if (nxFlag === 'NX' && locks.has(key)) {
      return null;
    }
    locks.set(key, Date.now() + ttlSeconds * 1000);
    return 'OK';
  };

  (redisConnection as any).del = async (key: string) => {
    locks.delete(key);
    return 1;
  };

  // In-memory Prisma records
  const campaignId = uuidv4();
  const userId = uuidv4();
  const senderId = uuidv4();
  const senderEmail = 'benchmark-sender@reachinbox.ai';

  interface MemEmailJob {
    id: string;
    campaignId: string;
    senderId: string;
    recipient: string;
    subject: string;
    body: string;
    scheduledAt: Date;
    status: 'SCHEDULED' | 'QUEUED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';
    bullJobId: string | null;
    idempotencyKey: string;
    attempts: number;
    processingAt: Date | null;
    sentAt: Date | null;
    failedAt: Date | null;
    errorMessage: string | null;
  }

  const emailJobsMap = new Map<string, MemEmailJob>();
  const idempotencyIndex = new Set<string>();

  const campaignRecord = {
    id: campaignId,
    userId,
    subject: 'ReachInbox Load Benchmark',
    body: 'Hello {{email}}, benchmark message.',
    startTime: new Date(),
    delayMs: opts.delayMs,
    hourlyLimit: opts.hourlyLimit,
    totalRecipients: opts.jobs,
  };

  (prisma as any).$transaction = async (fn: (tx: any) => Promise<any>) => {
    const tx = {
      campaign: {
        create: async ({ data }: any) => ({ ...campaignRecord, ...data }),
      },
      emailJob: {
        createMany: async ({ data }: { data: any[] }) => {
          for (const row of data) {
            if (idempotencyIndex.has(row.idempotencyKey)) {
              throw new Error(`Unique constraint failed on idempotencyKey: ${row.idempotencyKey}`);
            }
            idempotencyIndex.add(row.idempotencyKey);
            emailJobsMap.set(row.id, {
              ...row,
              bullJobId: null,
              attempts: 0,
              processingAt: null,
              sentAt: null,
              failedAt: null,
              errorMessage: null,
            });
          }
          return { count: data.length };
        },
      },
    };
    return fn(tx);
  };

  (prisma as any).emailJob = {
    findMany: async ({ where }: any) => {
      const results: MemEmailJob[] = [];
      for (const job of emailJobsMap.values()) {
        if (where?.campaignId && job.campaignId !== where.campaignId) continue;
        if (where?.status && typeof where.status === 'string' && job.status !== where.status) continue;
        results.push(job);
      }
      results.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
      return results;
    },
    findUnique: async ({ where }: any) => {
      const job = emailJobsMap.get(where.id);
      if (!job) return null;
      return {
        ...job,
        campaign: campaignRecord,
        sender: { id: senderId, email: senderEmail },
      };
    },
    update: async ({ where, data }: any) => {
      const job = emailJobsMap.get(where.id);
      if (!job) throw new Error(`Missing EmailJob ${where.id}`);
      if (data.attempts?.increment) {
        job.attempts += data.attempts.increment;
      }
      Object.assign(job, {
        ...data,
        attempts: data.attempts?.increment ? job.attempts : (data.attempts ?? job.attempts),
      });
      return job;
    },
  };

  // In-memory BullMQ queue
  interface MemQueueEntry {
    id: string;
    name: string;
    data: EmailJobQueuePayload;
    delay: number;
  }

  const readyQueue: MemQueueEntry[] = [];
  const delayedRescheduled: MemQueueEntry[] = [];

  (emailQueue as any).addBulk = async (
    items: Array<{ name: string; data: EmailJobQueuePayload; opts: { delay: number; jobId: string } }>
  ) => {
    const out: Array<{ id: string }> = [];
    for (const item of items) {
      const entry: MemQueueEntry = {
        id: item.opts.jobId,
        name: item.name,
        data: item.data,
        delay: item.opts.delay,
      };
      readyQueue.push(entry);
      out.push({ id: item.opts.jobId });
    }
    return out;
  };

  (emailQueue as any).add = async (
    name: string,
    data: EmailJobQueuePayload,
    jobOpts: { delay: number; jobId: string }
  ) => {
    const entry: MemQueueEntry = { id: jobOpts.jobId, name, data, delay: jobOpts.delay };
    delayedRescheduled.push(entry);
    return { id: jobOpts.jobId };
  };

  // Mock external side-effect integrations
  (SmtpService as any).sendMail = async () => {
    if (opts.smtpLatencyMs > 0) {
      await sleep(opts.smtpLatencyMs);
    }
    return { messageId: `<bench-${uuidv4()}@reachinbox.ai>`, previewUrl: false as const };
  };
  (SlackService as any).notifyRateLimit = async () => {};
  (SearchService as any).indexEmailJob = async () => {};

  // Phase 1: Campaign ingestion + bulk scheduling
  const ingestionStart = performance.now();
  const baseStartTime = Date.now();

  await prisma.$transaction(async (tx: any) => {
    await tx.campaign.create({
      data: campaignRecord,
    });

    const rows = Array.from({ length: opts.jobs }, (_, i) => {
      const recipient = `bench-user-${i}@example.com`;
      return {
        id: uuidv4(),
        campaignId,
        senderId,
        recipient,
        subject: campaignRecord.subject,
        body: `Hello ${recipient}, benchmark message.`,
        scheduledAt: new Date(baseStartTime + i * opts.delayMs),
        status: 'SCHEDULED' as const,
        idempotencyKey: `email_${campaignId}_${recipient}`,
      };
    });

    await tx.emailJob.createMany({ data: rows });
  });

  await SchedulerService.scheduleCampaign(campaignId);
  const ingestionMs = performance.now() - ingestionStart;

  // Inject duplicate queue deliveries to verify idempotency & lock protection
  const duplicateSample = readyQueue.slice(0, Math.min(opts.duplicateChecks, readyQueue.length));
  for (const dup of duplicateSample) {
    readyQueue.push({ ...dup, id: `${dup.id}_dup_delivery` });
  }

  // Phase 2: Concurrent worker pool execution (mirrors workers/index.ts flow)
  const outcomes: BenchmarkMetrics['outcomes'] = {
    sent: 0,
    rateLimitedAndRescheduled: 0,
    failed: 0,
    duplicateSendsPrevented: 0,
    lockContentionsSkipped: 0,
  };
  const latencies: number[] = [];

  const processQueueEntry = async (entry: MemQueueEntry) => {
    const jobStart = performance.now();
    const { emailJobId, senderId: jobSenderId, recipient, subject, body } = entry.data;

    const lockAcquired = await RateLimiterService.acquireJobLock(emailJobId);
    if (!lockAcquired) {
      outcomes.lockContentionsSkipped++;
      return;
    }

    try {
      const emailJob = await prisma.emailJob.findUnique({
        where: { id: emailJobId },
        include: { campaign: true, sender: true },
      });

      if (!emailJob) return;

      if (emailJob.status === 'SENT' || emailJob.status === 'RATE_LIMITED') {
        outcomes.duplicateSendsPrevented++;
        return;
      }

      const rateLimitResult = await RateLimiterService.checkAndConsumeRateLimit(
        jobSenderId,
        emailJob.campaign.hourlyLimit
      );

      if (!rateLimitResult.allowed) {
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'RATE_LIMITED',
            errorMessage: `Hourly rate limit exceeded (${rateLimitResult.currentCount}/${emailJob.campaign.hourlyLimit})`,
          },
        });
        await SlackService.notifyRateLimit(
          emailJob.campaign.userId,
          emailJob.sender.email,
          rateLimitResult.currentCount,
          emailJob.campaign.hourlyLimit,
          rateLimitResult.nextWindowMs
        );
        await emailQueue.add('send-email', entry.data, {
          delay: rateLimitResult.nextWindowMs,
          jobId: `job_${emailJob.idempotencyKey}_rescheduled_${Date.now()}`,
        });
        outcomes.rateLimitedAndRescheduled++;
        latencies.push(performance.now() - jobStart);
        return;
      }

      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: 'PROCESSING',
          processingAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      await SmtpService.sendMail({
        from: emailJob.sender.email,
        to: recipient,
        subject,
        html: body,
      });

      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: { status: 'SENT', sentAt: new Date() },
      });

      await SearchService.indexEmailJob({
        id: emailJob.id,
        campaignId: emailJob.campaignId,
        recipient: emailJob.recipient,
        subject: emailJob.subject,
        status: 'SENT',
        scheduledAt: emailJob.scheduledAt,
      });

      outcomes.sent++;
      latencies.push(performance.now() - jobStart);
    } catch {
      outcomes.failed++;
      latencies.push(performance.now() - jobStart);
    } finally {
      await RateLimiterService.releaseJobLock(emailJobId);
    }
  };

  let cursor = 0;
  const totalSlots = opts.workers * opts.concurrency;
  const processingStart = performance.now();

  const runner = async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= readyQueue.length) break;
      await processQueueEntry(readyQueue[idx]);
    }
  };

  await Promise.all(Array.from({ length: totalSlots }, () => runner()));
  const processingMs = performance.now() - processingStart;

  return buildMetrics('simulated', opts, ingestionMs, processingMs, latencies, outcomes);
}

/**
 * Live infrastructure load benchmark:
 * Uses real MySQL (Prisma), real Redis, and real BullMQ Worker instances
 * with mocked SMTP/Slack/Elasticsearch side effects.
 */
async function runLiveBenchmark(opts: BenchmarkOptions): Promise<BenchmarkMetrics> {
  const userId = `bench_usr_${uuidv4()}`;
  const senderId = `bench_snd_${uuidv4()}`;
  const benchEmail = `${userId}@reachinbox.ai`;

  // Mock external network side effects only; MySQL, Redis, and BullMQ remain live
  (SmtpService as any).sendMail = async () => {
    if (opts.smtpLatencyMs > 0) await sleep(opts.smtpLatencyMs);
    return { messageId: `<live-bench-${uuidv4()}@reachinbox.ai>`, previewUrl: false as const };
  };
  (SlackService as any).notifyRateLimit = async () => {};
  (SearchService as any).indexEmailJob = async () => {};

  await prisma.user.create({
    data: {
      id: userId,
      googleId: `google_${userId}`,
      email: benchEmail,
      name: 'Benchmark User',
      senders: {
        create: {
          id: senderId,
          email: benchEmail,
          provider: 'ethereal',
        },
      },
    },
  });

  const ingestionStart = performance.now();
  const baseStartTime = Date.now();

  const campaign = await prisma.$transaction(async (tx) => {
    const cmp = await tx.campaign.create({
      data: {
        userId,
        subject: 'ReachInbox Live Benchmark',
        body: 'Benchmark payload for {{email}}',
        startTime: new Date(baseStartTime),
        delayMs: opts.delayMs,
        hourlyLimit: opts.hourlyLimit,
        totalRecipients: opts.jobs,
      },
    });

    const rows = Array.from({ length: opts.jobs }, (_, i) => {
      const recipient = `live-bench-${i}@example.com`;
      return {
        id: uuidv4(),
        campaignId: cmp.id,
        senderId,
        recipient,
        subject: cmp.subject,
        body: `Benchmark payload for ${recipient}`,
        scheduledAt: new Date(baseStartTime + i * opts.delayMs),
        status: 'SCHEDULED' as const,
        idempotencyKey: `email_${cmp.id}_${recipient}`,
      };
    });

    await tx.emailJob.createMany({ data: rows });
    return cmp;
  });

  await SchedulerService.scheduleCampaign(campaign.id);
  const ingestionMs = performance.now() - ingestionStart;

  const outcomes: BenchmarkMetrics['outcomes'] = {
    sent: 0,
    rateLimitedAndRescheduled: 0,
    failed: 0,
    duplicateSendsPrevented: 0,
    lockContentionsSkipped: 0,
  };
  const latencies: number[] = [];
  let finishedCount = 0;

  let resolveDone!: () => void;
  const donePromise = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const processingStart = performance.now();

  const workers: Worker<EmailJobQueuePayload>[] = Array.from({ length: opts.workers }, () => {
    return new Worker<EmailJobQueuePayload>(
      EMAIL_QUEUE_NAME,
      async (job: Job<EmailJobQueuePayload>) => {
        const jobStart = performance.now();
        const { emailJobId, senderId: jobSenderId, recipient, subject, body } = job.data;

        const lockAcquired = await RateLimiterService.acquireJobLock(emailJobId);
        if (!lockAcquired) {
          outcomes.lockContentionsSkipped++;
          return;
        }

        try {
          const emailJob = await prisma.emailJob.findUnique({
            where: { id: emailJobId },
            include: { campaign: true, sender: true },
          });
          if (!emailJob || emailJob.campaignId !== campaign.id) return;

          if (emailJob.status === 'SENT' || emailJob.status === 'RATE_LIMITED') {
            outcomes.duplicateSendsPrevented++;
            return;
          }

          const rateLimitResult = await RateLimiterService.checkAndConsumeRateLimit(
            jobSenderId,
            emailJob.campaign.hourlyLimit
          );

          if (!rateLimitResult.allowed) {
            await prisma.emailJob.update({
              where: { id: emailJobId },
              data: {
                status: 'RATE_LIMITED',
                errorMessage: `Hourly rate limit exceeded (${rateLimitResult.currentCount}/${emailJob.campaign.hourlyLimit})`,
              },
            });
            await emailQueue.add('send-email', job.data, {
              delay: rateLimitResult.nextWindowMs,
              jobId: `job_${emailJob.idempotencyKey}_rescheduled_${Date.now()}`,
            });
            outcomes.rateLimitedAndRescheduled++;
          } else {
            await prisma.emailJob.update({
              where: { id: emailJobId },
              data: { status: 'PROCESSING', processingAt: new Date(), attempts: { increment: 1 } },
            });
            await SmtpService.sendMail({
              from: emailJob.sender.email,
              to: recipient,
              subject,
              html: body,
            });
            await prisma.emailJob.update({
              where: { id: emailJobId },
              data: { status: 'SENT', sentAt: new Date() },
            });
            outcomes.sent++;
          }

          latencies.push(performance.now() - jobStart);
          finishedCount++;
          if (finishedCount >= opts.jobs) {
            resolveDone();
          }
        } catch (err) {
          outcomes.failed++;
          finishedCount++;
          if (finishedCount >= opts.jobs) {
            resolveDone();
          }
          throw err;
        } finally {
          await RateLimiterService.releaseJobLock(emailJobId);
        }
      },
      {
        connection: redisConnection,
        concurrency: opts.concurrency,
      }
    );
  });

  await donePromise;
  const processingMs = performance.now() - processingStart;

  await Promise.all(workers.map((w) => w.close()));

  if (!opts.keepData) {
    await prisma.user.delete({ where: { id: userId } });
    const isoHour = new Date().toISOString().slice(0, 13);
    await redisConnection.del(`rate-limit:${senderId}:${isoHour}`);
  }

  return buildMetrics('live', opts, ingestionMs, processingMs, latencies, outcomes);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let resolvedMode: 'live' | 'simulated';

  if (opts.mode === 'auto') {
    const infra = await detectInfrastructure();
    resolvedMode = infra.mysql && infra.redis ? 'live' : 'simulated';
  } else {
    resolvedMode = opts.mode;
  }

  const metrics =
    resolvedMode === 'live'
      ? await runLiveBenchmark(opts)
      : await runSimulatedBenchmark(opts);

  if (opts.json) {
    console.log(JSON.stringify(metrics, null, 2));
  } else {
    console.log('\n=== ReachInbox Load Benchmark Report ===');
    console.log(`Mode               : ${metrics.mode.toUpperCase()}`);
    console.log(`Runtime            : Node ${metrics.environment.nodeVersion} (${metrics.environment.platform}, ${metrics.environment.cpus} CPUs)`);
    console.log(`Workload           : ${metrics.config.jobs} jobs | ${metrics.config.workers} workers x ${metrics.config.concurrencyPerWorker} concurrency (${metrics.config.effectiveParallelSlots} slots)`);
    console.log(`Limits             : hourlyLimit=${metrics.config.hourlyLimit}, delayMs=${metrics.config.delayMs}, smtpLatencyMs=${metrics.config.smtpLatencyMs}`);
    console.log(`Ingestion          : ${metrics.timings.ingestionMs} ms (${metrics.timings.ingestionThroughputJobsPerSec} jobs/s)`);
    console.log(`Worker Processing  : ${metrics.timings.processingMs} ms (${metrics.timings.processingThroughputJobsPerSec} jobs/s)`);
    console.log(`Total Elapsed      : ${metrics.timings.totalMs} ms`);
    console.log(`Job Latency (ms)   : p50=${metrics.jobLatencyMs.p50} | p95=${metrics.jobLatencyMs.p95} | p99=${metrics.jobLatencyMs.p99} | max=${metrics.jobLatencyMs.max}`);
    console.log(`Outcomes           : sent=${metrics.outcomes.sent}, rateLimited=${metrics.outcomes.rateLimitedAndRescheduled}, failed=${metrics.outcomes.failed}, dupPrevented=${metrics.outcomes.duplicateSendsPrevented}, lockSkipped=${metrics.outcomes.lockContentionsSkipped}`);
    console.log(`Memory (MB)        : rss=${metrics.memoryMb.rss}, heapUsed=${metrics.memoryMb.heapUsed}, heapTotal=${metrics.memoryMb.heapTotal}`);
    console.log('========================================\n');
  }

  if (resolvedMode === 'live') {
    await emailQueue.close();
    await redisConnection.quit();
    await prisma.$disconnect();
  } else {
    redisConnection.disconnect();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('[Benchmark] Failed:', err);
  process.exit(1);
});
