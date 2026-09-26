import { Client } from '@elastic/elasticsearch';

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const ELASTICSEARCH_INDEX = process.env.ELASTICSEARCH_INDEX || 'email_jobs';

export class SearchService {
  private static client: Client | null = null;
  private static isAvailable: boolean | null = null;

  public static getClient(): Client {
    if (!this.client) {
      this.client = new Client({
        node: ELASTICSEARCH_URL,
        auth:
          process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD
            ? {
                username: process.env.ELASTICSEARCH_USERNAME,
                password: process.env.ELASTICSEARCH_PASSWORD,
              }
            : undefined,
      });
    }
    return this.client;
  }

  /**
   * Index an email job record in Elasticsearch
   */
  public static async indexEmailJob(emailJob: {
    id: string;
    campaignId: string;
    recipient: string;
    subject: string;
    status: string;
    scheduledAt: Date;
    sentAt?: Date | null;
  }) {
    try {
      const client = this.getClient();
      await client.index({
        index: ELASTICSEARCH_INDEX,
        id: emailJob.id,
        document: {
          id: emailJob.id,
          campaignId: emailJob.campaignId,
          recipient: emailJob.recipient,
          subject: emailJob.subject,
          status: emailJob.status,
          scheduledAt: emailJob.scheduledAt.toISOString(),
          sentAt: emailJob.sentAt ? emailJob.sentAt.toISOString() : null,
        },
      });
    } catch (err: any) {
      // Elasticsearch failure does not block the primary email delivery transaction
      console.warn('[Elasticsearch] Notice while indexing document:', err.message);
    }
  }

  /**
   * Search email jobs by query text
   */
  public static async searchEmailJobs(query: string, userId?: string): Promise<string[]> {
    try {
      const client = this.getClient();
      const response = await client.search({
        index: ELASTICSEARCH_INDEX,
        query: {
          multi_match: {
            query,
            fields: ['recipient^2', 'subject'],
          },
        },
      });

      return response.hits.hits.map((hit) => hit._id as string);
    } catch (err: any) {
      console.warn('[Elasticsearch] Search query notice (falling back):', err.message);
      return [];
    }
  }
}
