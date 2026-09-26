import { Queue, QueueEvents } from 'bullmq';
import { redisConnection } from '../config/redis';
import { EmailJobQueuePayload } from '@reachinbox/shared';

export const EMAIL_QUEUE_NAME = 'email-scheduler';

export const emailQueue = new Queue<EmailJobQueuePayload>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false, // Keep records in BullMQ for observability & Bull Board
    removeOnFail: false,
  },
});

export const emailQueueEvents = new QueueEvents(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
});
