import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/db';
import { EMAIL_QUEUE_NAME, emailQueue } from '../queues/emailQueue';
import { EmailJobQueuePayload } from '@reachinbox/shared';
import { SmtpService } from '../integrations/smtp/smtp.service';
import { RateLimiterService } from '../services/rateLimiter.service';
import { SlackService } from '../integrations/slack/slack.service';
import { SearchService } from '../integrations/elasticsearch/search.service';

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

export function startEmailWorker() {
  console.log(`[Worker] Initializing BullMQ Email Worker with concurrency = ${concurrency}...`);

  const worker = new Worker<EmailJobQueuePayload>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobQueuePayload>) => {
      const { emailJobId, senderId, recipient, subject, body } = job.data;

      // 1. Acquire distributed lock (ADR-007)
      const lockAcquired = await RateLimiterService.acquireJobLock(emailJobId);
      if (!lockAcquired) {
        console.log(`[Worker] Job ${emailJobId} is already locked by another worker process. Skipping.`);
        return;
      }

      try {
        // 2. Load fresh durable state from MySQL (MySQL is Source of Truth)
        const emailJob = await prisma.emailJob.findUnique({
          where: { id: emailJobId },
          include: {
            campaign: true,
            sender: true,
          },
        });

        if (!emailJob) {
          console.warn(`[Worker] EmailJob ${emailJobId} does not exist in MySQL. Discarding.`);
          return;
        }

        // 3. Idempotency Check: if already SENT, do not re-send
        if (emailJob.status === 'SENT') {
          console.log(`[Worker] EmailJob ${emailJobId} already SENT. Skipping to prevent duplicate.`);
          return;
        }

        // 4. Rate Limiting Check (Atomic Redis Counter)
        const hourlyLimit = emailJob.campaign.hourlyLimit || 100;
        const rateLimitResult = await RateLimiterService.checkAndConsumeRateLimit(senderId, hourlyLimit);

        if (!rateLimitResult.allowed) {
          console.warn(
            `[Worker] Hourly rate limit reached for sender ${senderId} (${rateLimitResult.currentCount}/${hourlyLimit}). Rescheduling job ${emailJobId}...`
          );

          // Update MySQL state to RATE_LIMITED
          await prisma.emailJob.update({
            where: { id: emailJobId },
            data: {
              status: 'RATE_LIMITED',
              errorMessage: `Hourly rate limit exceeded (${rateLimitResult.currentCount}/${hourlyLimit})`,
            },
          });

          // Notify Slack (RI-051)
          await SlackService.notifyRateLimit(
            emailJob.campaign.userId,
            emailJob.sender.email,
            rateLimitResult.currentCount,
            hourlyLimit,
            rateLimitResult.nextWindowMs
          );

          // Reschedule into next window in BullMQ
          await emailQueue.add('send-email', job.data, {
            delay: rateLimitResult.nextWindowMs,
            jobId: `job_${emailJob.idempotencyKey}_rescheduled_${Date.now()}`,
          });

          return;
        }

        // 5. Update status to PROCESSING
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'PROCESSING',
            processingAt: new Date(),
            attempts: { increment: 1 },
          },
        });

        // 6. Execute SMTP delivery via Ethereal / Nodemailer
        try {
          const sendResult = await SmtpService.sendMail({
            from: emailJob.sender.email,
            to: recipient,
            subject,
            html: body,
          });

          const now = new Date();

          // 7. Mark as SENT in MySQL
          const updatedJob = await prisma.emailJob.update({
            where: { id: emailJobId },
            data: {
              status: 'SENT',
              sentAt: now,
              errorMessage: sendResult.previewUrl ? `Preview: ${sendResult.previewUrl}` : null,
            },
          });

          // 8. Index into Elasticsearch asynchronously
          await SearchService.indexEmailJob({
            id: updatedJob.id,
            campaignId: updatedJob.campaignId,
            recipient: updatedJob.recipient,
            subject: updatedJob.subject,
            status: updatedJob.status,
            scheduledAt: updatedJob.scheduledAt,
            sentAt: updatedJob.sentAt,
          });

          console.log(`[Worker] Delivered email job ${emailJobId} to ${recipient} successfully.`);
        } catch (smtpErr: any) {
          console.error(`[Worker] SMTP failure for job ${emailJobId}:`, smtpErr.message);

          await prisma.emailJob.update({
            where: { id: emailJobId },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              errorMessage: smtpErr.message,
            },
          });

          throw smtpErr; // Triggers BullMQ retry according to backoff policy
        }
      } finally {
        await RateLimiterService.releaseJobLock(emailJobId);
      }
    },
    {
      connection: redisConnection,
      concurrency,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with: ${err.message}`);
  });

  return worker;
}

if (require.main === module) {
  startEmailWorker();
}
