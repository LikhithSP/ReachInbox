import { z } from 'zod';

export const createCampaignSchema = z.object({
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

describe('Campaign Validation & Scheduling Logic', () => {
  it('should validate a correct campaign payload', () => {
    const payload = {
      subject: 'Test Campaign',
      body: 'Hello {{email}}',
      startTime: new Date().toISOString(),
      delayMs: 2000,
      hourlyLimit: 100,
      recipients: [{ email: 'alice@example.com' }, { email: 'bob@example.com' }],
    };

    const result = createCampaignSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should reject invalid recipient email', () => {
    const payload = {
      subject: 'Test Campaign',
      body: 'Hello',
      startTime: new Date().toISOString(),
      recipients: [{ email: 'not-an-email' }],
    };

    const result = createCampaignSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject hourlyLimit less than or equal to 0', () => {
    const payload = {
      subject: 'Test Campaign',
      body: 'Hello',
      startTime: new Date().toISOString(),
      hourlyLimit: 0,
      recipients: [{ email: 'alice@example.com' }],
    };

    const result = createCampaignSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should correctly calculate deterministic schedule slots', () => {
    const baseStartTime = new Date('2026-09-27T10:00:00.000Z').getTime();
    const delayMs = 2000;
    const recipients = ['alice@example.com', 'bob@example.com', 'charlie@example.com'];

    const slots = recipients.map((email, idx) => ({
      email,
      scheduledAt: new Date(baseStartTime + idx * delayMs).toISOString(),
    }));

    expect(slots[0].scheduledAt).toBe('2026-09-27T10:00:00.000Z');
    expect(slots[1].scheduledAt).toBe('2026-09-27T10:00:02.000Z');
    expect(slots[2].scheduledAt).toBe('2026-09-27T10:00:04.000Z');
  });

  it('should produce deterministic idempotency keys', () => {
    const campaignId = 'cmp_123';
    const email = 'alice@example.com';
    const key1 = `email_${campaignId}_${email.trim().toLowerCase()}`;
    const key2 = `email_${campaignId}_${'ALICE@EXAMPLE.COM'.trim().toLowerCase()}`;

    expect(key1).toBe(key2);
    expect(key1).toBe('email_cmp_123_alice@example.com');
  });
});
