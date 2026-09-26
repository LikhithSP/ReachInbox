import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export interface AuthenticatedUser {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends AuthenticatedUser {}
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check session user or auth header / dev user header
  const user = req.user || (req.session as any)?.user;

  if (user) {
    req.user = user;
    return next();
  }

  // Developer mock header support for local testing if not in strict production
  const devUserId = req.headers['x-dev-user-id'] as string;
  const devUserEmail = req.headers['x-dev-user-email'] as string;

  if (process.env.NODE_ENV !== 'production' && (devUserId || devUserEmail)) {
    req.user = {
      id: devUserId || 'usr_dev_123',
      googleId: 'google_dev_123',
      email: devUserEmail || 'developer@reachinbox.ai',
      name: 'Developer Mode',
      avatarUrl: 'https://avatar.vercel.sh/developer'
    };
    return next();
  }

  throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
}
