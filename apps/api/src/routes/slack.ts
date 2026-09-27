import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { requireAuth } from '../middleware/auth';
import { SlackService } from '../integrations/slack/slack.service';

const router = Router();

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || '';
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || 'http://localhost:4000/api/v1/integrations/slack/callback';

/**
 * GET /api/v1/integrations/slack
 * Returns the current user's Slack connection status
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const defaultWebhook = process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/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';

    let connection = await prisma.slackConnection.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { user: { email: user.email } },
        ],
      },
    });

    // Auto-create or ensure connection exists for this user using defaultWebhook
    if (!connection && defaultWebhook) {
      try {
        let dbUser = await prisma.user.findFirst({
          where: {
            OR: [{ id: user.id }, { email: user.email }],
          },
        });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              id: user.id,
              googleId: user.googleId || `user_${Date.now()}`,
              email: user.email,
              name: user.name || 'User',
              avatarUrl: user.avatarUrl || null,
            },
          });
        }

        connection = await prisma.slackConnection.upsert({
          where: { userId: dbUser.id },
          update: {
            encryptedToken: defaultWebhook,
            teamName: 'Connected Slack',
            channelId: '#alerts',
          },
          create: {
            userId: dbUser.id,
            teamId: 'custom_team',
            teamName: 'Connected Slack',
            channelId: '#alerts',
            encryptedToken: defaultWebhook,
          },
        });
      } catch (e) {
        console.warn('Notice auto-connecting slack:', e);
      }
    }

    if (!connection) {
      return res.json({
        connected: false,
        teamName: null,
        channelName: null,
      });
    }

    return res.json({
      connected: true,
      teamName: connection.teamName,
      channelName: connection.channelId || '#alerts',
      connectedAt: connection.connectedAt,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/integrations/slack/connect
 * Starts the Slack OAuth authorization flow or redirects to setup
 */
router.get('/connect', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
    // If Slack OAuth credentials are not yet added to .env, redirect with prompt to use Webhook setup
    return res.redirect(`${frontendUrl}/dashboard?slack_error=missing_credentials`);
  }

  const scopes = ['incoming-webhook', 'chat:write', 'chat:write.public', 'channels:read'];
  const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

  const slackOAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(
    SLACK_CLIENT_ID
  )}&scope=${encodeURIComponent(scopes.join(','))}&redirect_uri=${encodeURIComponent(
    SLACK_REDIRECT_URI
  )}&state=${encodeURIComponent(state)}`;

  return res.redirect(slackOAuthUrl);
});

/**
 * GET /api/v1/integrations/slack/callback
 * Handles the OAuth 2.0 authorization code exchange with Slack
 */
router.get('/callback', async (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

  if (error || !code) {
    return res.redirect(`${frontendUrl}/dashboard?slack_error=${encodeURIComponent(error || 'cancelled')}`);
  }

  try {
    let userId = '';
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        userId = decoded.userId;
      } catch {}
    }

    // Fallback: If state didn't parse, get the first user
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id || '';
    }

    // Exchange authorization code for token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: SLACK_REDIRECT_URI,
      }),
    });

    const data: any = await tokenResponse.json();

    if (!data.ok) {
      console.warn('[Slack OAuth Error]:', data.error);
      return res.redirect(`${frontendUrl}/dashboard?slack_error=${encodeURIComponent(data.error || 'token_exchange_failed')}`);
    }

    const teamName = data.team?.name || 'Slack Workspace';
    const teamId = data.team?.id || 'team_default';
    const channelId = data.incoming_webhook?.channel || data.incoming_webhook?.channel_id || '#general';
    const encryptedToken = data.incoming_webhook?.url || data.access_token;

    // Save Slack connection to database for this user
    await prisma.slackConnection.upsert({
      where: { userId },
      update: {
        teamId,
        teamName,
        channelId,
        encryptedToken,
      },
      create: {
        userId,
        teamId,
        teamName,
        channelId,
        encryptedToken,
      },
    });

    return res.redirect(`${frontendUrl}/dashboard?slack=connected`);
  } catch (err: any) {
    console.error('[Slack Callback Error]:', err);
    return res.redirect(`${frontendUrl}/dashboard?slack_error=internal_error`);
  }
});

/**
 * POST /api/v1/integrations/slack/webhook
 * Allows user to connect Slack via Webhook URL or Bot Token directly from the dashboard UI
 * (Great for instant setup without configuring a full public Slack App redirect)
 */
router.post('/webhook', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { webhookUrl, teamName, channelName } = req.body || {};

    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
      return res.status(400).json({ success: false, message: 'Slack Webhook URL is required' });
    }

    const trimmedUrl = webhookUrl.trim();

    // 1. Ensure the user record exists in MySQL database first (handles dev login / foreign key)
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: user.id },
          { email: user.email },
        ],
      },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          googleId: user.googleId || `user_${Date.now()}`,
          email: user.email,
          name: user.name || 'User',
          avatarUrl: user.avatarUrl || null,
        },
      });
    }

    const resolvedUserId = dbUser.id;

    await prisma.slackConnection.upsert({
      where: { userId: resolvedUserId },
      update: {
        teamId: 'custom_team',
        teamName: teamName || 'Slack Workspace',
        channelId: channelName || '#email-alerts',
        encryptedToken: trimmedUrl,
      },
      create: {
        userId: resolvedUserId,
        teamId: 'custom_team',
        teamName: teamName || 'Slack Workspace',
        channelId: channelName || '#email-alerts',
        encryptedToken: trimmedUrl,
      },
    });

    // Send instant test notification
    const testResult = await SlackService.sendTestMessage(resolvedUserId);

    return res.json({
      success: true,
      message: 'Slack connection saved successfully!',
      testResult,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/integrations/slack/test
 * Sends a test message to the user's connected Slack
 */
router.post('/test', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await SlackService.sendTestMessage(userId);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/integrations/slack
 * Disconnects Slack for the authenticated user
 */
router.delete('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await prisma.slackConnection.deleteMany({
      where: { userId },
    });

    return res.json({
      success: true,
      message: 'Slack disconnected successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
