export enum EmailJobStatus {
  SCHEDULED = 'SCHEDULED',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
}

export interface UserDTO {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SenderDTO {
  id: string;
  userId: string;
  email: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipientInput {
  email: string;
}

export interface CreateCampaignDTO {
  subject: string;
  body: string;
  startTime: string; // ISO string
  delayMs?: number;
  hourlyLimit?: number;
  senderId?: string;
  recipients: RecipientInput[];
}

export interface CampaignDTO {
  id: string;
  userId: string;
  subject: string;
  body: string;
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
  totalRecipients: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailJobDTO {
  id: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  status: EmailJobStatus;
  bullJobId?: string | null;
  idempotencyKey: string;
  attempts: number;
  processingAt?: string | null;
  sentAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlackConnectionDTO {
  id: string;
  userId: string;
  teamId: string;
  teamName: string;
  channelId: string;
  connectedAt: string;
  updatedAt: string;
}

export interface EmailJobQueuePayload {
  emailJobId: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  idempotencyKey: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
