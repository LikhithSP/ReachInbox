# Product Requirements Document (PRD)

## 1. Product Overview

### Product Name

**ReachInbox Email Scheduler**

### Product Type

Full-stack email scheduling and delivery management platform.

### Purpose

ReachInbox Email Scheduler allows authenticated users to upload email leads, compose email campaigns, schedule delivery, and monitor email execution through a reliable background-job system.

The platform is designed around **persistent asynchronous job processing**, allowing scheduled emails to survive application restarts while supporting concurrency, configurable delays, hourly sending limits, search, and operational visibility.

---

## 2. Problem Statement

Sending a large number of emails at controlled times requires more than a simple HTTP request.

A production-oriented scheduler must:

* Persist scheduling information.
* Execute jobs asynchronously.
* Survive API/worker restarts.
* Avoid duplicate processing.
* Control sending rate and concurrency.
* Provide visibility into scheduled and completed emails.
* Support multiple senders.
* Notify operators when sending limits are reached.
* Allow users to search historical email activity.

The product addresses these requirements through a relational database, Redis/BullMQ, background workers, SMTP delivery, Elasticsearch, and a web dashboard.

---

## 3. Goals

### Primary Goals

1. Allow users to authenticate using Google.
2. Allow users to compose email campaigns.
3. Accept recipient lists through CSV/text upload.
4. Validate and deduplicate recipients.
5. Schedule individual email jobs.
6. Persist jobs in a relational database.
7. Execute scheduled jobs using BullMQ.
8. Persist queue state through Redis.
9. Send emails using Ethereal SMTP.
10. Support configurable worker concurrency.
11. Enforce minimum delay between sends.
12. Enforce hourly sending limits.
13. Reschedule jobs when limits are reached.
14. Prevent duplicate job execution.
15. Index email activity in Elasticsearch.
16. Provide searchable scheduled/sent email views.
17. Provide Bull Board operational visibility.
18. Integrate Slack notifications using OAuth.
19. Survive backend/worker restarts.
20. Provide clear operational and error states.

---

## 4. Non-Goals

The assignment does not require:

* Production-scale email infrastructure.
* Real customer email delivery.
* Marketing automation workflows.
* Email template builders.
* Contact CRM functionality.
* Email tracking pixels.
* Open/click tracking.
* AI-generated email content.
* Payment/billing functionality.
* Full multi-tenant billing infrastructure.

Ethereal Email is used as the SMTP delivery provider for demonstration.

---

## 5. Target User

### Primary User

A user who needs to schedule controlled batches of outbound emails.

Typical workflow:

1. Sign in.
2. Create a campaign.
3. Upload recipients.
4. Configure start time.
5. Configure delay between emails.
6. Configure hourly limit.
7. Schedule.
8. Monitor scheduled jobs.
9. Monitor sent/failed jobs.
10. Search historical activity.

---

## 6. Core User Stories

### Authentication

**US-01**

As a user, I want to sign in with Google so that I can access my dashboard securely.

### Campaign Creation

**US-02**

As a user, I want to compose an email with subject and body.

### Recipient Import

**US-03**

As a user, I want to upload a CSV/text file containing recipients.

### Scheduling

**US-04**

As a user, I want to select when email delivery begins.

### Rate Control

**US-05**

As a user, I want to configure a delay between emails.

**US-06**

As a user, I want to configure an hourly sending limit.

### Monitoring

**US-07**

As a user, I want to see scheduled emails.

**US-08**

As a user, I want to see sent emails.

**US-09**

As a user, I want to know whether an email succeeded or failed.

### Search

**US-10**

As a user, I want to search email activity.

### Operations

**US-11**

As an operator/developer, I want queue visibility through Bull Board.

### Notifications

**US-12**

As a user, I want Slack notifications when a sender reaches its hourly limit.

---

## 7. Functional Requirements

### FR-01 Authentication

The system shall support Google OAuth.

The system shall:

* authenticate the user through Google;
* create/update a local user record;
* maintain authenticated sessions;
* expose the authenticated user through `/api/me`;
* support logout.

---

### FR-02 Campaign Creation

The system shall accept:

* Subject
* Body
* Start time
* Delay between emails
* Hourly sending limit
* Recipient list

The backend shall validate all input.

---

### FR-03 Recipient Processing

Uploaded recipients shall be:

1. Parsed.
2. Normalized.
3. Validated.
4. Deduplicated.
5. Converted into individual email jobs.

Invalid addresses shall not create send jobs.

---

### FR-04 Scheduling

Every valid recipient shall produce a persistent email job.

The system shall schedule jobs using BullMQ delayed jobs.

Cron-based scheduling is prohibited.

---

### FR-05 Email Delivery

Workers shall:

1. Retrieve the email job.
2. Verify its current state.
3. Apply rate controls.
4. Send through Ethereal SMTP.
5. Persist the resulting state.
6. Index the resulting state in Elasticsearch.

---

### FR-06 Restart Persistence

After restarting the API or worker:

* existing database records must remain;
* Redis-backed BullMQ jobs must remain;
* future jobs must continue processing;
* completed jobs must not restart;
* duplicate sends must be prevented as far as the delivery provider permits.

---

### FR-07 Concurrency

Worker concurrency shall be configurable.

Example:

```env
WORKER_CONCURRENCY=5
```

Multiple jobs may execute concurrently while respecting rate-control rules.

---

### FR-08 Minimum Send Delay

The system shall support a configurable minimum delay between sends.

Example:

```env
MIN_EMAIL_DELAY_MS=2000
```

---

### FR-09 Hourly Rate Limit

The system shall support a configurable hourly limit.

Example:

```env
MAX_EMAILS_PER_HOUR=100
```

When the limit is reached:

1. The job must not be permanently failed.
2. The job must be delayed.
3. It must be rescheduled into the next available sending window.
4. The event must be observable.
5. Slack notification must be triggered if Slack is connected.

---

### FR-10 Search

Email records shall be indexed into Elasticsearch.

Users shall be able to search by relevant fields such as:

* recipient
* subject
* status

---

### FR-11 Slack Integration

Users shall be able to:

* connect Slack;
* authorize the application;
* store the OAuth token securely;
* disconnect Slack;
* reconnect later.

When an hourly sending limit is reached, the backend shall send a Slack notification.

---

### FR-12 Operational Dashboard

Bull Board shall expose:

* waiting jobs;
* delayed jobs;
* active jobs;
* completed jobs;
* failed jobs.

---

## 8. Success Criteria

The implementation is considered successful when:

* A user can authenticate.
* A user can create a campaign.
* CSV recipients are parsed.
* Jobs are persisted.
* BullMQ schedules them.
* Workers send them through Ethereal.
* Jobs survive worker restart.
* Rate limits are enforced.
* Delayed jobs are rescheduled.
* Duplicate processing is prevented.
* Slack notification works.
* Elasticsearch search works.
* Dashboard states reflect backend state.
* Bull Board displays queue activity.

---

## 9. Product Constraints

### Hard Constraints

* TypeScript backend.
* Express.js.
* BullMQ.
* Redis.
* MySQL/PostgreSQL.
* Ethereal SMTP.
* React/Next.js.
* Tailwind CSS.
* No cron jobs.
* Persistent scheduling.
* Idempotent job processing.

---

## 10. Key Product Principles

### Reliability over cleverness

The system should favor predictable state transitions and recoverability.

### Database as source of business truth

The relational database stores the durable business state.

### Redis as execution infrastructure

Redis/BullMQ manages asynchronous execution.

### Explicit state

Every email job must have a well-defined lifecycle.

### Observable operations

Important execution events should be visible through the dashboard, logs, Bull Board, and Slack notifications.

### Secure by default

Credentials and OAuth tokens must never be exposed to the frontend unnecessarily.

---

## 11. Future Extensions

Potential future capabilities:

* Multiple campaigns.
* Sender rotation.
* Tenant-level quotas.
* Email templates.
* Retry policies.
* Delivery analytics.
* Bounce handling.
* Open/click tracking.
* Campaign pause/resume.
* Advanced scheduling rules.
* Webhooks.
* Provider abstraction for SendGrid/SES/Mailgun/etc.
