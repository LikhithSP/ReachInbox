import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../utils/errors';

const router = Router();

const createSenderSchema = z.object({
  email: z.string().email('Invalid sender email address'),
  provider: z.string().default('ethereal'),
});

// GET /api/v1/senders
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const senders = await prisma.sender.findMany({
      where: { userId: authUser.id },
      select: {
        id: true,
        email: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ data: senders });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/senders
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const parseResult = createSenderSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email, provider } = parseResult.data;

    const sender = await prisma.sender.create({
      data: {
        userId: authUser.id,
        email,
        provider,
      },
      select: {
        id: true,
        email: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json(sender);
  } catch (err) {
    next(err);
  }
});

export default router;
