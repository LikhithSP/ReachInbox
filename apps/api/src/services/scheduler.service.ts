import { emailQueue } from '../queues/emailQueue';
import { prisma } from '../config/db';
import { EmailJobQueuePayload } from '@reachinbox/shared';

export class SchedulerService {
  /**
   * Schedule an email job into BullMQ as a delayed job.
   */
  public static async scheduleEmailJob(jobData: {
    emailJobId: string;
    campaignId: string;
    senderId: string;
    recipient: string;
    subject: string;
    body: string;
    scheduledAt: Date;
    idempotencyKey: string;
  }) {
    const now = Date.now();
    const scheduledTime = jobData.scheduledAt.getTime();
    const delay = Math.max(0, scheduledTime - now);

    const payload: EmailJobQueuePayload = {
      emailJobId: jobData.emailJobId,
      campaignId: jobData.campaignId,
      senderId: jobData.senderId,
      recipient: jobData.recipient,
      subject: jobData.subject,
      body: jobData.body,
      scheduledAt: jobData.scheduledAt.toISOString(),
      idempotencyKey: jobData.idempotencyKey,
    };

    // Use deterministic BullMQ job ID based on idempotency key to prevent double enqueue
    const bullJobId = `job_${jobData.idempotencyKey}`;

    const queueJob = await emailQueue.add('send-email', payload, {
      delay,
      jobId: bullJobId,
    });

    // Update EmailJob with BullMQ job reference and status
    await prisma.emailJob.update({
      where: { id: jobData.emailJobId },
      data: {
        bullJobId: queueJob.id || bullJobId,
        status: delay > 0 ? 'SCHEDULED' : 'QUEUED',
      },
    });

    return queueJob;
  }

  /**
   * Schedule all email jobs for a campaign with high-throughput bulk enqueuing.
   * Handles 1000+ jobs instantly via BullMQ addBulk.
   */
  public static async scheduleCampaign(campaignId: string) {
    const emailJobs = await prisma.emailJob.findMany({
      where: {
        campaignId,
        status: 'SCHEDULED',
      },
      orderBy: { scheduledAt: 'asc' },
    });

    if (emailJobs.length === 0) return 0;

    const now = Date.now();
    const bulkJobs = emailJobs.map((job) => {
      const scheduledTime = job.scheduledAt.getTime();
      const delay = Math.max(0, scheduledTime - now);
      const bullJobId = `job_${job.idempotencyKey}`;

      const payload: EmailJobQueuePayload = {
        emailJobId: job.id,
        campaignId: job.campaignId,
        senderId: job.senderId,
        recipient: job.recipient,
        subject: job.subject,
        body: job.body,
        scheduledAt: job.scheduledAt.toISOString(),
        idempotencyKey: job.idempotencyKey,
      };

      return {
        name: 'send-email',
        data: payload,
        opts: {
          delay,
          jobId: bullJobId,
        },
      };
    });

    // Bulk enqueue into BullMQ
    const enqueued = await emailQueue.addBulk(bulkJobs);

    // Update MySQL jobs with their assigned BullMQ IDs in batches
    const updatePromises = emailJobs.map((job, idx) => {
      const queueJob = enqueued[idx];
      const scheduledTime = job.scheduledAt.getTime();
      const delay = Math.max(0, scheduledTime - now);
      return prisma.emailJob.update({
        where: { id: job.id },
        data: {
          bullJobId: queueJob?.id || `job_${job.idempotencyKey}`,
          status: delay > 0 ? 'SCHEDULED' : 'QUEUED',
        },
      });
    });

    await Promise.all(updatePromises);

    return emailJobs.length;
  }

  /**
   * Startup reconciliation: recovers pending/scheduled jobs on service startup (ADR-005).
   * Ensures scheduled emails survive application/worker restarts without requiring a cron.
   */
  public static async reconcilePendingJobs() {
    try {
      console.log('[Scheduler] Running startup reconciliation for scheduled jobs...');
      const pendingJobs = await prisma.emailJob.findMany({
        where: {
          status: { in: ['SCHEDULED', 'QUEUED'] },
        },
      });

      let reEnqueuedCount = 0;
      for (const job of pendingJobs) {
        const bullJobId = `job_${job.idempotencyKey}`;
        const existingQueueJob = await emailQueue.getJob(bullJobId);

        if (!existingQueueJob) {
          await this.scheduleEmailJob({
            emailJobId: job.id,
            campaignId: job.campaignId,
            senderId: job.senderId,
            recipient: job.recipient,
            subject: job.subject,
            body: job.body,
            scheduledAt: job.scheduledAt,
            idempotencyKey: job.idempotencyKey,
          });
          reEnqueuedCount++;
        }
      }

      console.log(`[Scheduler] Reconciliation complete. Re-enqueued ${reEnqueuedCount} jobs.`);
    } catch (err: any) {
      console.warn('[Scheduler] Startup reconciliation notice:', err.message);
    }
  }
}
