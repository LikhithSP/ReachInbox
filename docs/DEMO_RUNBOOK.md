# Demo Runbook

## 1. Purpose

This runbook defines the exact local setup and demonstration flow for the ReachInbox Email Scheduler assignment.

The final demo should prove:

* Google authentication
* email scheduling
* CSV recipient upload
* BullMQ scheduling
* worker processing
* Ethereal delivery
* restart persistence
* idempotency
* rate limiting
* minimum delay
* Slack notification
* Elasticsearch search
* Bull Board visibility

---

# 2. Prerequisites

Install:

* Node.js 20+
* npm/pnpm
* Docker
* Git

Required external accounts/configuration:

* Google OAuth application
* Slack OAuth application
* Ethereal Email account
* Elasticsearch credentials if using hosted Elasticsearch

---

# 3. Start Infrastructure

Run:

```bash
docker compose up -d
```

Expected services:

```text
MySQL
Redis
Elasticsearch
```

Verify:

```bash
docker compose ps
```

---

# 4. Environment Setup

Copy:

```bash
cp .env.example .env
```

Configure:

```env
NODE_ENV=development

DATABASE_URL=
REDIS_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

ELASTICSEARCH_URL=
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=

WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=100
```

Never commit `.env`.

---

# 5. Install Dependencies

```bash
npm install
```

Run database migrations:

```bash
npm run db:migrate
```

Generate ORM client if required:

```bash
npm run db:generate
```

---

# 6. Start Application

Start API:

```bash
npm run dev:api
```

Start worker:

```bash
npm run dev:worker
```

Start frontend:

```bash
npm run dev:web
```

Open the dashboard.

---

# 7. Demo Data

Prepare a small CSV:

```csv
email
alice@example.com
bob@example.com
charlie@example.com
```

For Ethereal testing, use generated/test recipient addresses as appropriate.

---

# 8. Demo Flow

## 8.1 Login

1. Open application.
2. Click **Continue with Google**.
3. Complete Google authorization.
4. Return to dashboard.

Show:

* name
* email
* avatar
* logout

---

# 9. Create Scheduled Campaign

Click:

```text
Compose New Email
```

Enter:

```text
Subject:
ReachInbox Scheduler Demo

Body:
Hello! This is a scheduled email from the ReachInbox assignment.
```

Upload CSV.

Verify:

```text
3 valid recipients detected
```

Configure:

```text
Start Time: current time + 30 seconds
Delay: 2 seconds
Hourly Limit: 100
```

Click:

```text
Schedule
```

---

# 10. Show Scheduled Emails

Open:

```text
Scheduled Emails
```

Verify:

| Email                                             | Subject                   | Scheduled Time | Status    |
| ------------------------------------------------- | ------------------------- | -------------- | --------- |
| [alice@example.com](mailto:alice@example.com)     | ReachInbox Scheduler Demo | ...            | SCHEDULED |
| [bob@example.com](mailto:bob@example.com)         | ReachInbox Scheduler Demo | ...            | SCHEDULED |
| [charlie@example.com](mailto:charlie@example.com) | ReachInbox Scheduler Demo | ...            | SCHEDULED |

---

# 11. Show Bull Board

Open the protected Bull Board dashboard.

Show:

```text
Delayed
Waiting
Active
Completed
Failed
```

Explain:

> Scheduled emails are represented as persistent BullMQ delayed jobs rather than being managed by cron.

---

# 12. Demonstrate Delivery

Wait for the scheduled time.

Show worker logs:

```text
Processing job ...
Sending email ...
Email sent successfully
```

Then open Ethereal.

Verify the email appears.

Return to the dashboard.

Show:

```text
SENT
```

---

# 13. Demonstrate Minimum Delay

Schedule several emails with:

```text
Delay = 2 seconds
```

Show worker timestamps:

```text
18:00:00 → email 1
18:00:02 → email 2
18:00:04 → email 3
```

Explain that the delay is enforced server-side by the worker.

---

# 14. Demonstrate Restart Persistence

This is one of the most important demo sections.

### Step 1

Create an email scheduled several minutes in the future.

Example:

```text
Start time = now + 2 minutes
```

### Step 2

Show the job in Bull Board.

### Step 3

Stop the worker/API.

```bash
Ctrl+C
```

### Step 4

Restart the services.

```bash
npm run dev:api
npm run dev:worker
```

### Step 5

Show that the job still exists.

### Step 6

Wait until scheduled time.

Expected:

```text
Email is sent
```

Explain:

> Jobs are persisted through Redis/BullMQ, while MySQL stores the business state. Startup reconciliation also repairs future jobs missing from the queue.

---

# 15. Demonstrate Idempotency

Create a request using the same logical idempotency key twice.

Expected:

```text
Request 1 → creates job
Request 2 → existing job returned/rejected
```

Show the database contains only one logical email job.

Explain:

> A unique database constraint provides the final duplicate-prevention boundary.

---

# 16. Demonstrate Rate Limiting

Use a deliberately small configuration:

```env
MAX_EMAILS_PER_HOUR=3
```

Schedule:

```text
5 emails
```

Expected:

```text
Email 1 → SENT
Email 2 → SENT
Email 3 → SENT
Email 4 → RESCHEDULED
Email 5 → RESCHEDULED
```

Show Redis rate-limit state if useful.

---

# 17. Demonstrate Slack

Connect Slack through:

```text
Settings → Slack → Connect
```

Complete OAuth.

Return to dashboard.

Show:

```text
Slack Connected
```

Trigger the hourly rate limit.

Expected:

```text
Email job → rescheduled
Slack → notification sent
```

Example notification:

```text
ReachInbox rate limit reached.

Campaign: cmp_123
Limit: 3 emails/hour
Rescheduled jobs: 2
Next available window: 19:00
```

---

# 18. Demonstrate Elasticsearch

Open Sent Emails.

Search:

```text
alice
```

Then:

```text
ReachInbox
```

Show search results.

Explain:

> MySQL remains the source of truth while Elasticsearch provides fast searchable indexing.

---

# 19. Demonstrate Failure Handling

Optional but valuable.

Disconnect Elasticsearch or stop its container.

```bash
docker stop <elasticsearch-container>
```

Send an email.

Show:

```text
Email successfully sent
```

Explain:

> Elasticsearch is not part of the critical email-delivery transaction. Search indexing can recover later.

---

# 20. 1000+ Job Load Demonstration

Do not attempt to send 1000 real Ethereal emails.

Instead:

1. Generate 1000 queue jobs.
2. Show BullMQ waiting/delayed counts.
3. Show configurable worker concurrency.
4. Show rate limiting.
5. Explain that Ethereal delivery is intentionally not used for large-scale load testing.

Example:

```text
1000 jobs
5 worker concurrency
100 emails/hour
```

The queue absorbs the workload while workers process according to configured limits.

---

# 21. Five-Minute Video Script

## 0:00–0:30 — Login

Show Google login and dashboard.

Say:

> This is a full-stack email scheduling platform built with React, TypeScript, Express, MySQL, Redis, BullMQ, Elasticsearch and Slack integrations.

---

## 0:30–1:15 — Compose

Show:

* subject
* body
* CSV upload
* detected recipients
* scheduling time
* delay
* hourly limit

Click Schedule.

---

## 1:15–1:45 — Queue

Open scheduled emails.

Open Bull Board.

Say:

> Each email is persisted as a BullMQ delayed job. There are no cron jobs involved.

---

## 1:45–2:30 — Delivery

Show worker processing.

Show Ethereal inbox.

Show Sent Emails.

---

## 2:30–3:20 — Restart

Create a future job.

Stop worker.

Restart worker.

Show job still exists and is eventually delivered.

Say:

> Redis/BullMQ provides durable job scheduling, while MySQL stores the business state.

---

## 3:20–4:10 — Rate Limit + Slack

Use a low test limit.

Show jobs being rescheduled.

Show Slack notification.

Explain distributed Redis rate limiting.

---

## 4:10–4:40 — Search

Search Sent Emails through Elasticsearch.

---

## 4:40–5:00 — Architecture

Show architecture diagram:

```text
Next.js
   ↓
Express API
   ↓
MySQL ───── Elasticsearch
   ↓
BullMQ + Redis
   ↓
Workers
   ↓
Ethereal SMTP

Slack ← Rate Limit Events
```

Close with:

> The system is designed around persistent scheduling, distributed rate limiting, idempotent processing, restart recovery and clear separation between business state and execution infrastructure.

---

# 22. Final Submission Checklist

## Code

* [ ] Private GitHub repository
* [ ] `Mitrajit` added
* [ ] `Yadav036` added
* [ ] No secrets committed
* [ ] `.env.example` included
* [ ] Clean commit history

## Documentation

* [ ] README
* [ ] PRD
* [ ] TRD
* [ ] API specification
* [ ] Security documentation
* [ ] Frontend specification
* [ ] Backend schema
* [ ] Feature tickets
* [ ] Implementation plan
* [ ] Testing strategy
* [ ] Error handling
* [ ] Architecture decisions
* [ ] Demo runbook

## Demo

* [ ] Google OAuth
* [ ] Compose email
* [ ] CSV upload
* [ ] Scheduling
* [ ] BullMQ
* [ ] Bull Board
* [ ] Ethereal
* [ ] Restart recovery
* [ ] Idempotency
* [ ] Minimum delay
* [ ] Hourly rate limit
* [ ] Slack OAuth
* [ ] Slack notification
* [ ] Elasticsearch search

## Submission

* [ ] README setup instructions verified
* [ ] Demo video <= 5 minutes
* [ ] Architecture documented
* [ ] Assumptions documented
* [ ] Tradeoffs documented
* [ ] ClickUp submission completed
* [ ] Repository access verified
