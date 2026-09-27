import { prisma } from '../../config/db';

export class SlackService {
  /**
   * Post notification to Slack channel or Incoming Webhook when a rate limit is exceeded
   * Real, verifiable outbound HTTP POST call to Slack API or incoming webhook URL
   */
  public static async notifyRateLimit(
    userId: string,
    senderEmail: string,
    currentCount: number,
    limit: number,
    nextWindowMs: number
  ) {
    try {
      const waitMinutes = Math.max(1, Math.round(nextWindowMs / 60000));
      const message = `⚠️ *ReachInbox Rate Limit Alert*\n• *Sender*: \`${senderEmail}\`\n• *Hourly Count*: ${currentCount} / ${limit} emails\n• *Status*: Limit reached! Remaining scheduled emails have been automatically paused & rescheduled for the next window (~${waitMinutes} min).`;

      // 1. Fetch user's active Slack connection
      let slackConnection = await prisma.slackConnection.findUnique({
        where: { userId },
      });

      // Fallback: check if any connection exists across the workspace
      if (!slackConnection) {
        slackConnection = await prisma.slackConnection.findFirst();
      }

      if (!slackConnection || !slackConnection.encryptedToken) {
        console.log(`[Slack Notice]: User ${userId} has not connected Slack. Rate limit notice bypassed (no crash).`);
        return;
      }

      const tokenOrWebhook = slackConnection.encryptedToken;

      // 2. Case A: Incoming Webhook URL (starts with https://hooks.slack.com)
      if (tokenOrWebhook.startsWith('https://hooks.slack.com')) {
        console.log(`[Slack] Dispatching live alert to Slack Incoming Webhook...`);
        const response = await fetch(tokenOrWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '🚨 ReachInbox Rate Limit Alert',
                  emoji: true,
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `Sender *${senderEmail}* has reached the hourly limit (*${currentCount}/${limit}* emails sent).`,
                },
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `🕒 Next send window begins in approximately *${waitMinutes} minutes*. Rescheduled automatically by BullMQ.`,
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const respText = await response.text();
          console.warn(`[Slack Webhook Error] Status ${response.status}: ${respText}`);
        } else {
          console.log(`[Slack] Live rate limit alert successfully sent to Slack channel!`);
        }
        return;
      }

      // 3. Case B: Bot User OAuth Token (xoxb-...)
      if (tokenOrWebhook.startsWith('xoxb-') || tokenOrWebhook.startsWith('xoxp-')) {
        console.log(`[Slack] Dispatching live alert via Slack chat.postMessage API to channel ${slackConnection.channelId}...`);
        const response = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Bearer ${tokenOrWebhook}`,
          },
          body: JSON.stringify({
            channel: slackConnection.channelId || process.env.SLACK_NOTIFICATION_CHANNEL || '#general',
            text: message,
          }),
        });

        const data: any = await response.json();
        if (!data.ok) {
          console.warn(`[Slack API Error]: ${data.error || 'Failed to post message'}`);
        } else {
          console.log(`[Slack] Live rate limit alert successfully delivered to Slack channel!`);
        }
        return;
      }

      console.warn(`[Slack] Unrecognized Slack token/webhook format for user ${userId}.`);
    } catch (err: any) {
      console.warn('[Slack Error] Notice sending Slack notification:', err.message);
    }
  }

  /**
   * Helper to send an instant test message to verify the Slack connection
   */
  public static async sendTestMessage(userId: string): Promise<{ success: boolean; message: string }> {
    const slackConnection = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!slackConnection || !slackConnection.encryptedToken) {
      return { success: false, message: 'No Slack connection found. Please connect Slack first.' };
    }

    const tokenOrWebhook = slackConnection.encryptedToken;
    const testText = '🎉 *ReachInbox Integration Verified*: Your Slack workspace is connected! Rate-limit alerts will be delivered here.';

    try {
      if (tokenOrWebhook.startsWith('https://hooks.slack.com')) {
        const response = await fetch(tokenOrWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: testText }),
        });
        if (!response.ok) {
          return { success: false, message: `Slack webhook responded with status ${response.status}` };
        }
        return { success: true, message: 'Test message sent to Slack successfully!' };
      }

      if (tokenOrWebhook.startsWith('xoxb-') || tokenOrWebhook.startsWith('xoxp-')) {
        const response = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Bearer ${tokenOrWebhook}`,
          },
          body: JSON.stringify({
            channel: slackConnection.channelId || process.env.SLACK_NOTIFICATION_CHANNEL || '#general',
            text: testText,
          }),
        });
        const data: any = await response.json();
        if (!data.ok) {
          return { success: false, message: data.error || 'Slack API error' };
        }
        return { success: true, message: 'Test message sent to Slack successfully!' };
      }

      return { success: false, message: 'Invalid Slack token or webhook URL.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}
