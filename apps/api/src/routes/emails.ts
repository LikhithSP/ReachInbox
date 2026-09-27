import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../utils/errors';
import { SearchService } from '../integrations/elasticsearch/search.service';

const router = Router();

// GET /api/v1/emails/scheduled
router.get('/scheduled', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.search as string)?.trim();
    const skip = (page - 1) * limit;

    const where: any = {
      campaign: { userId: authUser.id },
      status: { in: ['SCHEDULED', 'QUEUED', 'RATE_LIMITED'] },
    };

    if (search) {
      // First attempt Elasticsearch query
      const esMatchingIds = await SearchService.searchEmailJobs(search, authUser.id);
      if (esMatchingIds && esMatchingIds.length > 0) {
        where.id = { in: esMatchingIds };
      } else {
        where.OR = [
          { recipient: { contains: search } },
          { subject: { contains: search } },
        ];
      }
    }

    const [emails, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
        select: {
          id: true,
          recipient: true,
          subject: true,
          body: true,
          scheduledAt: true,
          status: true,
          attempts: true,
          campaignId: true,
          createdAt: true,
          sender: {
            select: { email: true }
          }
        },
      }),
      prisma.emailJob.count({ where }),
    ]);

    return res.json({
      data: emails,
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

// GET /api/v1/emails/sent
router.get('/sent', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.search as string)?.trim();
    const skip = (page - 1) * limit;

    const where: any = {
      campaign: { userId: authUser.id },
      status: { in: ['SENT', 'FAILED'] },
    };

    if (search) {
      // First attempt Elasticsearch query
      const esMatchingIds = await SearchService.searchEmailJobs(search, authUser.id);
      if (esMatchingIds && esMatchingIds.length > 0) {
        where.id = { in: esMatchingIds };
      } else {
        where.OR = [
          { recipient: { contains: search } },
          { subject: { contains: search } },
        ];
      }
    }

    const [emails, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          recipient: true,
          subject: true,
          body: true,
          scheduledAt: true,
          sentAt: true,
          failedAt: true,
          status: true,
          errorMessage: true,
          attempts: true,
          campaignId: true,
          sender: {
            select: { email: true }
          }
        },
      }),
      prisma.emailJob.count({ where }),
    ]);

    return res.json({
      data: emails,
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

// GET /api/v1/emails/:id
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const { id } = req.params;

    const email = await prisma.emailJob.findFirst({
      where: {
        id,
        campaign: { userId: authUser.id },
      },
      include: {
        campaign: {
          select: {
            id: true,
            subject: true,
          },
        },
        sender: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!email) {
      throw new AppError(404, 'NOT_FOUND', 'Email job not found');
    }

    return res.json(email);
  } catch (err) {
    next(err);
  }
});

export default router;
