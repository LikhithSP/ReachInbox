# Implementation Plan & System Flows

## 1. Implementation Strategy

The project should be implemented vertically rather than building the entire frontend first.

The recommended sequence is:

```text
Infrastructure
      ↓
Database
      ↓
Scheduling
      ↓
Worker
      ↓
SMTP
      ↓
Reliability
      ↓
Rate Limiting
      ↓
Search
      ↓
OAuth
      ↓
Frontend
      ↓
Polish
      ↓
Testing
      ↓
Demo
```

The goal is to get one complete email through the system as early as possible.

---

# 2. Phase 0 — Project Setup

## Step 1

Initialize:

```text
Next.js
Express
TypeScript
Prisma
BullMQ
Redis
MySQL
```

## Step 2

Create Docker Compose:

```text
mysql
redis
elasticsearch
```

## Step 3

Create:

```text
.env
.env.example
.gitignore
```

## Step 4

Configure:

```text
ESLint
Prettier
TypeScript
```

---

# 3. Phase 1 — Database

Create Prisma models:

```text
User
Campaign
Sender
EmailJob
SlackConnection
```

Run migration.

Verify:

```bash
npx prisma migrate dev
```

---

# 4. Phase 2 — Basic API

Implement:

```text
GET /health
GET /api/me
POST /api/campaigns
GET /api/campaigns
GET /api/emails
GET /api/emails/:id
```

Add:

```text
authentication middleware
validation middleware
error middleware
```

---

# 5. Phase 3 — First Vertical Slice

Build the smallest complete workflow:

```text
API
 ↓
Campaign
 ↓
EmailJob
 ↓
BullMQ
 ↓
Worker
 ↓
Ethereal
 ↓
SENT
```

Do not move to advanced UI polish until this flow works.

---

# 6. Complete Scheduling Flow

```text
User
 │
 │ Schedule campaign
 ▼
Next.js
 │
 │ POST /api/campaigns
 ▼
Express API
 │
 ├── Validate
 │
 ├── Authenticate
 │
 └── Create campaign
        │
        ▼
      MySQL
        │
        ▼
   Create EmailJobs
        │
        ▼
   Add BullMQ Jobs
        │
        ▼
      Redis
        │
        ▼
   Delayed Job
        │
        │ scheduled time reached
        ▼
     Worker
        │
        ▼
   Process EmailJob
```

---

# 7. Email Delivery Flow

```text
BullMQ
  │
  ▼
Worker receives job
  │
  ▼
Load EmailJob
  │
  ▼
Check status
  │
  ├── SENT → stop
  │
  ▼
Acquire lock
  │
  ▼
Check rate limit
  │
  ├───────────────┐
  │               │
Allowed        Limit reached
  │               │
  ▼               ▼
SMTP Send       Reschedule
  │               │
  ▼               ▼
Mark SENT       Notify Slack
  │
  ▼
Index Elasticsearch
```

---

# 8. CSV Flow

```text
User selects CSV
       │
       ▼
Frontend parses file
       │
       ▼
Display recipient summary
       │
       ├── valid
       ├── invalid
       └── duplicate
       │
       ▼
User submits
       │
       ▼
Backend validates again
       │
       ▼
Create EmailJobs
```

The backend remains the final validation authority.

---

# 9. Scheduling Calculation

Given:

```text
startTime = 10:00:00
delay = 2 seconds
```

For recipient index `i`:

```text
scheduledAt = startTime + (i × delay)
```

Example:

```text
Index 0 → 10:00:00
Index 1 → 10:00:02
Index 2 → 10:00:04
Index 3 → 10:00:06
```

The worker can subsequently move jobs forward if the sender rate limit is reached.

---

# 10. Rate-Limit Flow

Suppose:

```text
Hourly limit = 3
```

Jobs:

```text
A
B
C
D
E
```

Execution:

```text
A → SEND
B → SEND
C → SEND
D → LIMIT REACHED
E → LIMIT REACHED
```

Then:

```text
D → next hourly window
E → next hourly window
```

The Redis counter is shared between workers.

---

# 11. Atomic Rate-Limit Algorithm

Conceptually:

```text
START
  │
  ▼
Get current hour window
  │
  ▼
Atomic Redis check + increment
  │
  ├── Allowed
  │      ↓
  │    SEND
  │
  └── Denied
         ↓
   Calculate next window
         ↓
   Move BullMQ job
         ↓
    Slack notification
```

The check and increment must not be implemented as two independent operations.

---

# 12. Worker Concurrency Flow

Configuration:

```env
WORKER_CONCURRENCY=5
```

BullMQ may process:

```text
Job A ─┐
Job B ─┤
Job C ─┤── Worker
Job D ─┤
Job E ─┘
```

But rate limiting remains shared:

```text
Worker 1 ─┐
Worker 2 ─┤
Worker 3 ─┼── Redis rate limiter
Worker 4 ─┤
Worker 5 ─┘
```

---

# 13. Restart Flow

### Before restart

```text
MySQL
  └── EmailJob scheduled

Redis
  └── BullMQ delayed job
```

### Restart

```text
Stop worker
    ↓
Application unavailable
    ↓
Redis retains delayed job
    ↓
Start worker
    ↓
Reconnect Redis
    ↓
BullMQ restores job
    ↓
Worker processes job
```

### Reconciliation

At startup:

```text
Find future DB jobs
        ↓
Check corresponding queue jobs
        ↓
Re-enqueue missing jobs
```

This protects against an interrupted database-to-queue scheduling operation.

---

# 14. Idempotency Flow

```text
BullMQ Job
    │
    ▼
Load EmailJob
    │
    ▼
Is status SENT?
    │
 ┌──┴──┐
YES    NO
 │      │
STOP   Acquire Lock
          │
          ▼
       PROCESSING
          │
          ▼
        SMTP
          │
          ▼
         SENT
```

Unique database constraint:

```text
idempotencyKey UNIQUE
```

This prevents duplicate logical email jobs.

---

# 15. Elasticsearch Flow

When campaign is created:

```text
EmailJob
   ↓
Index document
```

When status changes:

```text
PROCESSING
   ↓
SENT
   ↓
Update Elasticsearch
```

Search:

```text
User
 ↓
Frontend search
 ↓
API
 ↓
Elasticsearch
 ↓
Matching records
```

---

# 16. Slack OAuth Flow

```text
Dashboard
   │
   ▼
Connect Slack
   │
   ▼
GET /api/slack/connect
   │
   ▼
Slack Authorization
   │
   ▼
Callback
   │
   ▼
Exchange authorization code
   │
   ▼
Store connection
   │
   ▼
Dashboard shows Connected
```

---

# 17. Slack Notification Flow

```text
Rate limit reached
        │
        ▼
Find user's Slack connection
        │
        ├── Not connected → Continue
        │
        └── Connected
                │
                ▼
        Slack chat.postMessage
                │
                ▼
        Notification delivered
```

Example notification:

```text
Email sending limit reached

Sender: sender@example.com
Limit: 100 emails/hour
Queued: 37 emails
Next window: 11:00
```

---

# 18. Google Authentication Flow

```text
Login
  │
  ▼
Google
  │
  ▼
Authorization
  │
  ▼
Callback
  │
  ▼
Verify identity
  │
  ▼
Create/update User
  │
  ▼
Create session
  │
  ▼
Dashboard
```

---

# 19. Frontend Data Flow

```text
React Component
      │
      ▼
TanStack Query
      │
      ▼
API Client
      │
      ▼
Express API
      │
      ▼
Service
      │
      ▼
Database
```

---

# 20. Recommended Implementation Order

## Block A — Foundation

```text
[ ] Repository
[ ] Docker
[ ] Environment
[ ] TypeScript
[ ] Prisma
```

## Block B — Core Backend

```text
[ ] DB schema
[ ] Express server
[ ] Validation
[ ] Campaign API
[ ] EmailJob creation
```

## Block C — Queue

```text
[ ] Redis
[ ] BullMQ
[ ] Delayed jobs
[ ] Worker
[ ] Concurrency
```

## Block D — Email

```text
[ ] Ethereal
[ ] Nodemailer
[ ] Send
[ ] Status updates
```

## Block E — Reliability

```text
[ ] Idempotency
[ ] Distributed lock
[ ] Restart recovery
[ ] Startup reconciliation
```

## Block F — Rate Control

```text
[ ] Minimum delay
[ ] Redis hourly counter
[ ] Rescheduling
[ ] Slack notification
```

## Block G — Search

```text
[ ] Elasticsearch
[ ] Indexing
[ ] Search endpoint
```

## Block H — Authentication

```text
[ ] Google OAuth
[ ] Sessions
[ ] Authorization
[ ] Slack OAuth
```

## Block I — Frontend

```text
[ ] Login
[ ] Dashboard
[ ] Compose
[ ] CSV
[ ] Scheduled
[ ] Sent
[ ] Search
[ ] Slack settings
```

## Block J — Operations

```text
[ ] Bull Board
[ ] Logging
[ ] Health checks
[ ] Error handling
```

## Block K — Testing

```text
[ ] Unit tests
[ ] Integration tests
[ ] Restart test
[ ] Rate-limit test
[ ] Duplicate test
```

## Block L — Submission

```text
[ ] README
[ ] Architecture diagram
[ ] Demo data
[ ] Demo video
[ ] Private GitHub repository
[ ] Grant repository access
[ ] Submit ClickUp form
```

---

# 21. Definition of Done

The project is ready for submission when the following end-to-end scenario works:

```text
Google Login
      ↓
Dashboard
      ↓
Compose Campaign
      ↓
Upload CSV
      ↓
Validate Recipients
      ↓
Configure Schedule
      ↓
Create Campaign
      ↓
Persist MySQL Records
      ↓
Create BullMQ Delayed Jobs
      ↓
BullMQ / Redis
      ↓
Worker
      ↓
Rate Limit Check
      ↓
Ethereal SMTP
      ↓
Update MySQL
      ↓
Index Elasticsearch
      ↓
Scheduled/Sent Dashboard
```

And the reliability scenario works:

```text
Schedule future email
      ↓
Stop worker
      ↓
Wait
      ↓
Restart worker
      ↓
Job remains available
      ↓
Job executes
      ↓
Email marked SENT
      ↓
No duplicate processing
```

And the rate-limit scenario works:

```text
Set limit = 2/hour
      ↓
Schedule 5 emails
      ↓
2 emails send
      ↓
3 jobs delayed
      ↓
Slack notification
      ↓
Next window
      ↓
Remaining emails continue
```

---

# 22. Final Demo Flow

The final five-minute demonstration should follow this sequence:

### 00:00–00:30

Google authentication and dashboard.

### 00:30–01:15

Create campaign and upload CSV.

### 01:15–01:45

Show scheduled emails and BullMQ delayed jobs.

### 01:45–02:20

Show Ethereal delivery and Sent Emails.

### 02:20–03:00

Stop/restart worker and demonstrate persistence.

### 03:00–04:00

Demonstrate low hourly limit and rescheduling.

### 04:00–04:30

Show Slack notification.

### 04:30–04:50

Search Elasticsearch-backed email records.

### 04:50–05:00

Show Bull Board and architecture.

---

# 23. Engineering Priorities

When time is limited, implementation priority is:

```text
P0
├── Scheduling
├── BullMQ
├── Redis
├── MySQL
├── Worker
├── Ethereal
├── Restart persistence
├── Idempotency
├── Rate limiting
├── Slack OAuth/notification
├── Google OAuth
├── Elasticsearch
└── Required dashboard

P1
├── Bull Board
├── Search UX
├── Tests
├── Structured logging
├── Docker polish
└── Demo scripts

P2
├── Advanced animations
├── Extra filters
├── Advanced accessibility
└── Non-essential visual polish
```

The core principle is:

> **Do not sacrifice scheduler correctness for UI polish.**

A polished interface is valuable, but the strongest technical signal in this assignment comes from demonstrating that the system behaves correctly under delayed execution, concurrency, rate limits, failures, and restarts.
