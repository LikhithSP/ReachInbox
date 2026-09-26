# Technical Requirements & Architecture

## 1. Architecture Overview

The system follows a layered asynchronous architecture:

```text
                    ┌─────────────────────┐
                    │     Next.js Web     │
                    │   React + Tailwind  │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │    Express API      │
                    │     TypeScript      │
                    └──────┬───────┬──────┘
                           │       │
              ┌────────────┘       └─────────────┐
              ▼                                  ▼
       ┌──────────────┐                   ┌──────────────┐
       │    MySQL     │                   │    Redis     │
       │ Source Truth │                   │   BullMQ     │
       └──────────────┘                   └──────┬───────┘
                                                 │
                                                 ▼
                                      ┌────────────────────┐
                                      │   Email Workers    │
                                      │ TypeScript/BullMQ   │
                                      └─────┬──────┬───────┘
                                            │      │
                               ┌────────────┘      └─────────────┐
                               ▼                                ▼
                        ┌──────────────┐                  ┌─────────────┐
                        │   Ethereal   │                  │ Elasticsearch│
                        │     SMTP     │                  │    Search   │
                        └──────────────┘                  └─────────────┘

                                            │
                                            ▼
                                      ┌─────────────┐
                                      │    Slack    │
                                      │   OAuth/API │
                                      └─────────────┘
```

---

# 2. Technology Stack

## Backend

| Component      | Technology            |
| -------------- | --------------------- |
| Runtime        | Node.js               |
| Language       | TypeScript            |
| Framework      | Express.js            |
| ORM            | Prisma                |
| Database       | MySQL                 |
| Queue          | BullMQ                |
| Queue Storage  | Redis                 |
| SMTP           | Nodemailer + Ethereal |
| Search         | Elasticsearch         |
| Queue UI       | Bull Board            |
| Validation     | Zod                   |
| Logging        | Pino                  |
| Authentication | Google OAuth          |
| Notifications  | Slack OAuth/API       |

## Frontend

| Component     | Technology      |
| ------------- | --------------- |
| Framework     | Next.js         |
| Language      | TypeScript      |
| UI            | React           |
| Styling       | Tailwind CSS    |
| Forms         | React Hook Form |
| Validation    | Zod             |
| Data Fetching | TanStack Query  |
| Notifications | Sonner          |

## Infrastructure

```text
Docker Compose
├── MySQL
├── Redis
└── Elasticsearch
```

---

# 3. Repository Structure

```text
reachinbox-scheduler/
│
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── config/
│   │       ├── controllers/
│   │       ├── middleware/
│   │       ├── routes/
│   │       ├── services/
│   │       ├── repositories/
│   │       ├── workers/
│   │       ├── queues/
│   │       ├── integrations/
│   │       │   ├── google/
│   │       │   ├── slack/
│   │       │   ├── smtp/
│   │       │   └── elasticsearch/
│   │       ├── utils/
│   │       └── app.ts
│   │
│   └── web/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── hooks/
│       ├── lib/
│       └── types/
│
├── packages/
│   └── shared/
│
├── prisma/
│   └── schema.prisma
│
├── docs/
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

# 4. Core Design Principle

The architecture separates:

### Business State

Stored in MySQL.

Examples:

```text
Campaign
EmailJob
User
Sender
SlackConnection
```

### Execution State

Managed by Redis/BullMQ.

Examples:

```text
waiting
delayed
active
completed
failed
```

BullMQ should never be treated as the only permanent business database.

---

# 5. Email Job Lifecycle

```text
SCHEDULED
    │
    ▼
QUEUED
    │
    ▼
PROCESSING
    │
    ├───────────────┐
    │               │
    ▼               ▼
  SENT           RETRYABLE
                    │
                    ▼
                  QUEUED

PROCESSING
    │
    ▼
  FAILED
```

---

# 6. Scheduling Architecture

When a campaign is created:

```text
Frontend
   │
   ▼
POST /api/campaigns
   │
   ▼
Validate request
   │
   ▼
Create Campaign
   │
   ▼
Create EmailJob records
   │
   ▼
Create BullMQ delayed jobs
   │
   ▼
Return campaign summary
```

Each BullMQ job contains:

```json
{
  "emailJobId": "uuid",
  "campaignId": "uuid"
}
```

The worker retrieves the authoritative email record from MySQL.

---

# 7. Delayed Job Scheduling

Example:

```text
Start Time = 10:00
Delay = 2 seconds

Recipient 1 → 10:00:00
Recipient 2 → 10:00:02
Recipient 3 → 10:00:04
Recipient 4 → 10:00:06
```

The calculated execution time is persisted in MySQL and represented by a BullMQ delayed job.

---

# 8. Worker Architecture

A worker performs:

```text
BullMQ Job
    │
    ▼
Load EmailJob
    │
    ▼
Check Status
    │
    ├── SENT → Stop
    │
    └── Otherwise
           │
           ▼
      Acquire Processing Lock
           │
           ▼
      Check Rate Limit
           │
      ┌────┴────┐
      │         │
   Allowed    Limited
      │         │
      ▼         ▼
   Send      Reschedule
      │
      ▼
Update DB
      │
      ▼
Index Elasticsearch
```

---

# 9. Idempotency

Each email job receives a unique idempotency key.

Example:

```text
campaignId:recipient:scheduledAt
```

The database shall enforce uniqueness.

Before sending:

```text
if status == SENT:
    return

if another worker owns processing lock:
    return

claim job

send email

mark SENT
```

The worker must never intentionally send a job that is already marked `SENT`.

Because SMTP is an external side effect, true distributed exactly-once delivery cannot be guaranteed without provider-level idempotency. The implementation therefore uses persistent job state, unique identifiers, distributed locking, and deterministic message metadata to minimize duplicate delivery.

---

# 10. Rate Limiting

Rate limit keys:

```text
rate-limit:{senderId}:{hourWindow}
```

Example:

```text
rate-limit:sender-123:2026-09-26T18
```

Redis performs the shared counter operation.

The counter must be atomic so multiple workers cannot exceed the configured limit due to race conditions.

---

# 11. Rate Limit Flow

```text
Worker
  │
  ▼
Check Redis counter
  │
  ├── count < limit
  │       │
  │       ▼
  │    increment
  │       │
  │       ▼
  │      SEND
  │
  └── count >= limit
          │
          ▼
   Calculate next window
          │
          ▼
   Reschedule BullMQ job
          │
          ▼
   Notify Slack
```

---

# 12. Minimum Delay

The system must prevent sending emails faster than the configured minimum interval.

The scheduling layer should calculate deterministic execution slots where possible.

For example:

```text
Delay = 2 seconds

Job A → 10:00:00
Job B → 10:00:02
Job C → 10:00:04
Job D → 10:00:06
```

Rate-limit rescheduling can move these timestamps into later windows.

---

# 13. Concurrency

Worker concurrency is configurable:

```env
WORKER_CONCURRENCY=5
```

Concurrency controls:

```text
How many jobs can be processed simultaneously?
```

Rate limiting controls:

```text
How many sends are permitted within a time window?
```

These mechanisms must remain independent.

---

# 14. Restart Recovery

The system relies on:

### MySQL

Persistent business state.

### Redis

Persistent BullMQ queue state.

### Startup reconciliation

When a worker starts:

```text
Start worker
    │
    ▼
Connect MySQL
    │
    ▼
Connect Redis
    │
    ▼
Load future jobs
    │
    ▼
Verify missing queue jobs
    │
    ▼
Re-enqueue missing jobs
    │
    ▼
Start processing
```

This handles the failure case where database state exists but a queue insertion was interrupted.

---

# 15. Elasticsearch

Elasticsearch stores searchable email documents.

Example:

```json
{
  "id": "email-job-id",
  "recipient": "user@example.com",
  "subject": "Welcome",
  "status": "SENT",
  "scheduledAt": "...",
  "sentAt": "..."
}
```

Search flow:

```text
Frontend
   │
   ▼
GET /api/emails/search?q=...
   │
   ▼
Express
   │
   ▼
Elasticsearch
   │
   ▼
Matching email IDs
   │
   ▼
Response
```

---

# 16. Slack Architecture

```text
Dashboard
   │
   ▼
Connect Slack
   │
   ▼
Slack OAuth
   │
   ▼
Callback
   │
   ▼
Store encrypted token
   │
   ▼
SlackConnection
```

When a rate limit is hit:

```text
Worker
  │
  ▼
Rate limit reached
  │
  ▼
Find SlackConnection
  │
  ├── none → continue
  │
  └── exists
        │
        ▼
   chat.postMessage
```

---

# 17. API Architecture

```text
Routes
   │
   ▼
Controllers
   │
   ▼
Services
   │
   ▼
Repositories
   │
   ▼
Prisma
   │
   ▼
MySQL
```

Controllers should not contain business logic.

---

# 18. Required API Endpoints

## Authentication

```http
GET  /auth/google
GET  /auth/google/callback
POST /auth/logout
GET  /api/me
```

## Campaigns

```http
POST /api/campaigns
GET  /api/campaigns
GET  /api/campaigns/:id
```

## Emails

```http
GET /api/emails?status=scheduled
GET /api/emails?status=sent
GET /api/emails/search?q=
GET /api/emails/:id
```

## Slack

```http
GET  /api/slack/connect
GET  /api/slack/callback
POST /api/slack/disconnect
GET  /api/slack/status
```

## System

```http
GET /health
```

## Bull Board

```text
/admin/queues
```

---

# 19. Environment Configuration

```env
NODE_ENV=development

PORT=4000

DATABASE_URL=
REDIS_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

SESSION_SECRET=

ETHEREAL_HOST=
ETHEREAL_PORT=
ETHEREAL_USER=
ETHEREAL_PASSWORD=

ELASTICSEARCH_URL=
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=

WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=100
```

---

# 20. Error Handling

API errors should use a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid recipient list"
  }
}
```

Expected categories:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
INTERNAL_ERROR
```

---

# 21. Observability

The backend should log:

* request ID;
* campaign creation;
* job scheduling;
* worker start;
* worker completion;
* retry;
* rate-limit events;
* rescheduling;
* SMTP failures;
* Slack notification failures;
* Elasticsearch failures.

Logs must not contain:

* passwords;
* OAuth access tokens;
* SMTP credentials;
* session secrets.

---

# 22. Testing Requirements

### Unit Tests

* Email validation.
* CSV parsing.
* Idempotency.
* Rate-limit calculation.
* Next-window calculation.
* Scheduling calculation.

### Integration Tests

* Campaign creation.
* Database persistence.
* Queue insertion.
* Worker processing.
* Rate limiting.
* Rescheduling.
* Elasticsearch indexing.

### Critical Recovery Test

```text
Schedule job
    ↓
Stop worker
    ↓
Wait
    ↓
Start worker
    ↓
Job executes
    ↓
No duplicate send
```

---

# 23. Architecture Decisions

| Decision      | Reason                                   |
| ------------- | ---------------------------------------- |
| MySQL         | Durable relational business state        |
| Redis         | Fast distributed queue/rate-limit state  |
| BullMQ        | Persistent delayed jobs                  |
| Express       | Assignment requirement + lightweight API |
| Prisma        | Type-safe database access                |
| Elasticsearch | Required search capability               |
| Ethereal      | Safe SMTP demonstration                  |
| Next.js       | React + TypeScript productivity          |
| Docker        | Reproducible local infrastructure        |

---

# 24. Non-Functional Requirements

### Reliability

Future jobs must survive worker restarts.

### Performance

The API should remain responsive while workers process email jobs asynchronously.

### Scalability

Multiple worker instances should be able to process jobs while sharing Redis state.

### Security

Secrets and OAuth credentials must remain server-side.

### Maintainability

Business logic should be separated into services and repositories.

### Observability

Important queue and delivery events must be traceable.

---

# 25. Architectural Tradeoffs

### MySQL + Redis

Provides clear separation between business persistence and job execution.

### BullMQ delayed jobs

Simple and reliable for scheduled execution without cron.

### Elasticsearch

Adds infrastructure overhead but provides the required search architecture.

### SMTP idempotency

Exactly-once external email delivery cannot be mathematically guaranteed without provider support, so the system focuses on persistent state, locking, deterministic identifiers, and recovery behavior.
