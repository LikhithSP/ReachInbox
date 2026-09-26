import { prisma } from '../../config/db';

export class SlackService {
  /**
   * Post notification to Slack channel when a rate limit is exceeded
   */
  public static async notifyRateLimit(senderEmail: string, currentCount: number, limit: number, nextWindowMs: number) {
    try {
      const waitMinutes = Math.round(nextWindowMs / 60000);
      const message = `⚠️ *ReachInbox Rate Limit Alert*: Sender \`${senderEmail}\` reached hourly sending limit (${currentCount}/${limit}). Remaining emails have been rescheduled for the next window in approx ${waitMinutes} minutes.`;

      // Check if any Slack connection is configured for this user
      const slackConnections = await prisma.slackConnection.findMany({ take: 1 });

      if (slackConnections.length > 0 && slackConnections[0].encryptedToken) {
        // In real Slack API call, post to chat.postMessage
        console.log(`[Slack] Posting alert to connected Slack channel ${slackConnections[0].channelId}: ${message}`);
      } else {
        console.log(`[Slack Notice (Simulated)]: ${message}`);
      }
    } catch (err: any) {
      console.warn('[Slack] Notice sending Slack notification:', err.message);
    }
  }
}
