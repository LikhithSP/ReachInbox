import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../config/db';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/google/callback';

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || `google_${profile.id}@reachinbox.ai`;
          const name = profile.displayName || 'Google User';
          const avatarUrl = profile.photos?.[0]?.value || null;

          // Upsert user in database so all dashboard relations exist
          const dbUser = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: {
              email,
              name,
              avatarUrl,
            },
            create: {
              googleId: profile.id,
              email,
              name,
              avatarUrl,
              senders: {
                create: {
                  email,
                  provider: 'ethereal',
                },
              },
            },
            include: { senders: true },
          });

          // Ensure default sender exists
          if (!dbUser.senders || dbUser.senders.length === 0) {
            await prisma.sender.create({
              data: {
                userId: dbUser.id,
                email: dbUser.email,
                provider: 'ethereal',
              },
            });
          }

          const user = {
            id: dbUser.id,
            googleId: dbUser.googleId,
            email: dbUser.email,
            name: dbUser.name,
            avatarUrl: dbUser.avatarUrl,
          };
          return done(null, user);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

// Passport serialization
passport.serializeUser((user: any, done) => {
  done(null, user);
});
passport.deserializeUser((user: any, done) => {
  done(null, user);
});

// GET /api/v1/auth/google
router.get('/google', (req: Request, res: Response, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    // If running in development without credentials, provide a clear direct dev login
    const devUser = {
      id: 'usr_demo_likhith',
      googleId: 'google_demo_1092830192',
      email: 'splikith04@gmail.com',
      name: 'Likhith S P',
      avatarUrl: 'https://avatar.vercel.sh/likhith'
    };
    (req.session as any).user = devUser;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/dashboard`);
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});

// GET /api/v1/auth/google/callback
router.get(
  '/google/callback',
  (req: Request, res: Response, next) => {
    passport.authenticate('google', (err: any, user: any) => {
      if (err || !user) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/login?error=auth_failed`);
      }
      (req.session as any).user = user;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/dashboard`);
    })(req, res, next);
  }
);

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: req.user!.id },
          { email: req.user!.email },
        ],
      },
    });

    res.json({
      id: dbUser?.id || req.user!.id,
      name: dbUser?.name || req.user!.name,
      email: dbUser?.email || req.user!.email,
      avatarUrl: dbUser?.avatarUrl || req.user!.avatarUrl || null,
    });
  } catch {
    res.json({
      id: req.user!.id,
      name: req.user!.name,
      email: req.user!.email,
      avatarUrl: req.user!.avatarUrl || null,
    });
  }
});

// POST /api/v1/auth/dev-login (facilitates testing & demo)
router.post('/dev-login', async (req: Request, res: Response, next) => {
  try {
    const { email, name } = req.body || {};
    const userEmail = email || 'splikith04@gmail.com';
    const userName = name || 'Likhith S P';

    const dbUser = await prisma.user.upsert({
      where: { email: userEmail },
      update: { name: userName },
      create: {
        email: userEmail,
        googleId: `dev_${Date.now()}`,
        name: userName,
        avatarUrl: `https://avatar.vercel.sh/${encodeURIComponent(userName)}`,
        senders: {
          create: {
            email: userEmail,
            provider: 'ethereal',
          },
        },
      },
      include: { senders: true },
    });

    const user = {
      id: dbUser.id,
      googleId: dbUser.googleId,
      email: dbUser.email,
      name: dbUser.name,
      avatarUrl: dbUser.avatarUrl,
    };

    (req.session as any).user = user;
    req.session.save((err) => {
      if (err) {
        console.warn('Session save error:', err);
      }
      res.json(user);
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  if (req.session) {
    req.session.destroy((err) => {
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Logged out successfully' });
    });
  } else {
    res.json({ success: true });
  }
});

export default router;
