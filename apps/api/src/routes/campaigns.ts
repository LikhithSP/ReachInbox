import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const createCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject is too long'),
  body: z.string().min(1, 'Body is required'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'startTime must be a valid ISO timestamp',
  }),
  delayMs: z.number().int().min(0).default(2000),
  hourlyLimit: z.number().int().min(1, 'hourlyLimit must be greater than zero').default(100),
  senderId: z.string().optional(),
  recipients: z
    .array(
      z.object({
        email: z.string().email('Invalid recipient email address'),
      })
    )
    .min(1, 'At least one recipient is required'),
});

// Ensure a user and default sender exist in database for the authenticated session
async function ensureUserAndSender(userId: string, email: string, name: string) {
  let user = await prisma.user.findUnique({
    where: { id: userId },
    include: { senders: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: userId,
        googleId: `google_${userId}`,
        email: email || `user_${userId}@reachinbox.ai`,
        name: name || 'Demo User',
        senders: {
          create: {
            email: email || `user_${userId}@reachinbox.ai`,
            provider: 'ethereal',
          },
        },
      },
      include: { senders: true },
    });
  } else if (!user.senders || user.senders.length === 0) {
    await prisma.sender.create({
      data: {
        userId: user.id,
        email: user.email,
        provider: 'ethereal',
      },
    });
    user = (await prisma.user.findUnique({
      where: { id: userId },
      include: { senders: true },
    }))!;
  }

  return user;
}

// POST /api/v1/campaigns
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = createCampaignSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { subject, body, startTime, delayMs, hourlyLimit, senderId, recipients } = parseResult.data;
    const authUser = req.user!;

    const user = await ensureUserAndSender(authUser.id, authUser.email, authUser.name);

    // Validate sender ownership
    let activeSenderId = senderId;
    if (activeSenderId) {
      const sender = await prisma.sender.findFirst({
        where: { id: activeSenderId, userId: user.id },
      });
      if (!sender) {
        throw new AppError(403, 'FORBIDDEN', 'Sender does not belong to authenticated user');
      }
    } else {
      activeSenderId = user.senders[0]?.id;
    }

    if (!activeSenderId) {
      throw new AppError(400, 'NO_SENDER', 'No valid sender found for this user');
    }

    // Deduplicate recipients
    const uniqueEmails = Array.from(new Set(recipients.map((r) => r.email.trim().toLowerCase())));
    const baseStartTime = new Date(startTime).getTime();

    // Atomic transaction for Campaign and EmailJobs creation
    const created = await prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          userId: user.id,
          subject,
          body,
          startTime: new Date(startTime),
          delayMs,
          hourlyLimit,
          totalRecipients: uniqueEmails.length,
        },
      });

      const emailJobData = uniqueEmails.map((email, index) => {
        const scheduledTime = new Date(baseStartTime + index * delayMs);
        const idempotencyKey = `email_${campaign.id}_${email}`;

        return {
          id: uuidv4(),
          campaignId: campaign.id,
          senderId: activeSenderId!,
          recipient: email,
          subject,
          body: body.replace(/\{\{email\}\}/g, email),
          scheduledAt: scheduledTime,
          status: 'SCHEDULED' as const,
          idempotencyKey,
        };
      });

      await tx.emailJob.createMany({
        data: emailJobData,
      });

      return {
        campaign,
        emailJobsCount: emailJobData.length,
      };
    });

    return res.status(201).json({
      id: created.campaign.id,
      status: 'SCHEDULED',
      recipientCount: recipients.length,
      scheduledCount: created.emailJobsCount,
      startTime: created.campaign.startTime,
      delayMs: created.campaign.delayMs,
      hourlyLimit: created.campaign.hourlyLimit,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/campaigns
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { userId: authUser.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.campaign.count({
        where: { userId: authUser.id },
      }),
    ]);

    return res.json({
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/campaigns/:campaignId
router.get('/:campaignId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const { campaignId } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: authUser.id },
      include: {
        emailJobs: {
          select: {
            id: true,
            recipient: true,
            status: true,
            scheduledAt: true,
            sentAt: true,
            failedAt: true,
          },
          take: 50,
        },
      },
    });

    if (!campaign) {
      throw new AppError(404, 'NOT_FOUND', 'Campaign not found');
    }

    return res.json(campaign);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/campaigns/:campaignId/cancel
router.post('/:campaignId/cancel', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const { campaignId } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: authUser.id },
    });

    if (!campaign) {
      throw new AppError(404, 'NOT_FOUND', 'Campaign not found');
    }

    // Cancel all still pending/scheduled email jobs
    const updated = await prisma.emailJob.updateMany({
      where: {
        campaignId,
        status: { in: ['SCHEDULED', 'QUEUED'] },
      },
      data: {
        status: 'FAILED',
        errorMessage: 'Campaign cancelled by user',
      },
    });

    return res.json({
      success: true,
      message: 'Campaign cancelled',
      cancelledJobsCount: updated.count,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
