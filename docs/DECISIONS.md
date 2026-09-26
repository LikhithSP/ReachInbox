# Architecture Decisions

This document records important architectural decisions and the reasoning behind them.

---

# ADR-001: Use MySQL as the Primary Database

## Decision

Use MySQL as the system of record for users, campaigns, senders, email jobs, and Slack connections.

## Why

The application contains relational entities with ownership and state transitions.

Examples:

```text
User
 └── Campaign
      └── EmailJob
```

MySQL provides:

* transactions
* constraints
* indexes
* relational queries
* durable business state

Redis is not treated as the primary business database.

---

# ADR-002: Use Redis + BullMQ for Scheduling

## Decision

Use BullMQ backed by Redis for persistent asynchronous job scheduling.

## Why

The assignment explicitly requires BullMQ/Redis and no cron jobs.

BullMQ provides:

* delayed jobs
* retries
* persistence
* worker concurrency
* job states
* distributed processing
* observability

---

# ADR-003: No Cron-Based Scheduling

## Decision

Do not use cron jobs for email scheduling.

## Why

A cron-based implementation would require repeatedly scanning the database and manually determining which jobs are due.

BullMQ delayed jobs directly represent scheduled work.

---

# ADR-004: MySQL + BullMQ Dual Persistence

## Decision

Persist business state in MySQL and execution state in BullMQ.

```text
MySQL
  = business source of truth

BullMQ/Redis
  = execution infrastructure
```

This separation makes the system easier to reason about and recover.

---

# ADR-005: Startup Reconciliation

## Decision

Perform reconciliation during service startup.

The process:

```text
Application starts
      ↓
query future SCHEDULED jobs
      ↓
check queue state
      ↓
re-enqueue missing jobs
```

## Why

There is a potential failure window between:

```text
DB transaction
      ↓
BullMQ enqueue
```

Startup reconciliation provides recovery without using cron.

---

# ADR-006: Idempotency at Database Level

## Decision

Every email job receives a deterministic idempotency key with a unique database constraint.

Example:

```text
campaignId:recipient:scheduledAt
```

## Why

A distributed system may receive:

* duplicate API requests
* duplicate queue events
* worker retries
* restart recovery

A database constraint provides a final protection layer.

---

# ADR-007: Exactly-Once Side Effect Limitation

## Decision

The system will implement strong duplicate prevention but will explicitly document that true exactly-once external SMTP delivery cannot be mathematically guaranteed without provider-side transactional/idempotency support.

The design minimizes duplicates through:

* deterministic job IDs
* DB uniqueness
* state checks
* atomic claiming
* worker coordination
* deterministic Message-ID where supported

This tradeoff is documented rather than hidden.

---

# ADR-008: Configurable Worker Concurrency

## Decision

Worker concurrency is configurable through environment variables.

Example:

```env
WORKER_CONCURRENCY=5
```

## Why

Concurrency requirements differ between environments.

Development may use:

```text
1–2 workers
```

Production/demo:

```text
5+
```

---

# ADR-009: Distributed Rate Limiting Through Redis

## Decision

Use Redis-backed atomic counters for hourly rate limiting.

Example key:

```text
email-rate:{senderId}:{hourWindow}
```

## Why

Multiple worker processes must share the same limit.

A local in-memory counter would fail when multiple workers or instances process jobs concurrently.

Atomic Redis operations prevent race conditions.

---

# ADR-010: Minimum Delay Enforced by Worker

## Decision

The minimum delay between sends is enforced server-side.

Frontend validation exists only for UX.

## Why

Clients cannot be trusted to enforce system-level constraints.

The worker must guarantee the operational rule.

---

# ADR-011: Elasticsearch for Search

## Decision

Use Elasticsearch for searchable email records.

## Why

The assignment explicitly requires Elasticsearch.

It provides:

* recipient search
* subject search
* filtering
* scalable indexing

MySQL remains the source of truth.

---

# ADR-012: Search Index Is Eventually Consistent

## Decision

Email sending does not depend transactionally on Elasticsearch.

```text
Send email
   ↓
Update MySQL
   ↓
Index Elasticsearch
```

If Elasticsearch fails, the email remains correctly recorded in MySQL.

The index can be repaired later.

---

# ADR-013: Google OAuth

## Decision

Use Google OAuth for user authentication.

## Why

The assignment explicitly requires real Google OAuth.

The backend owns the OAuth flow and session creation.

---

# ADR-014: Slack OAuth

## Decision

Use Slack OAuth instead of asking users to paste webhook URLs.

## Why

The assignment requires an actual OAuth authorize flow.

The backend stores the resulting integration credentials securely.

The frontend receives only connection metadata.

---

# ADR-015: Bull Board

## Decision

Use Bull Board for queue monitoring.

## Why

It provides direct visibility into:

* delayed jobs
* waiting jobs
* active jobs
* completed jobs
* failed jobs

It also makes the architecture easier to demonstrate during the technical interview.

Access is protected.

---

# ADR-016: Express Backend

## Decision

Use Express + TypeScript.

## Why

The assignment requires Node.js/TypeScript and Express is lightweight and well suited for a REST API.

The application uses layered architecture:

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Repositories
  ↓
Database
```

---

# ADR-017: Next.js/React Frontend

## Decision

Use React/Next.js with TypeScript and Tailwind CSS.

## Why

The assignment explicitly requires React.js/Next.js and Tailwind.

The frontend is organized around reusable components and feature modules.

---

# ADR-018: Validation at API Boundary

## Decision

Validate requests before business logic execution.

A schema validation library such as Zod is used.

## Why

This provides:

* consistent validation
* typed inputs
* predictable errors
* protection against malformed requests

---

# ADR-019: Secrets Through Environment Configuration

## Decision

Secrets are never committed to Git.

Examples:

```env
DATABASE_URL=
REDIS_URL=
GOOGLE_CLIENT_SECRET=
SLACK_CLIENT_SECRET=
SMTP_PASSWORD=
ELASTICSEARCH_URL=
```

`.env` is excluded through `.gitignore`.

---

# ADR-020: Docker for Local Infrastructure

## Decision

Use Docker Compose for local infrastructure.

Services:

```text
MySQL
Redis
Elasticsearch
```

Application services may run locally or through Docker.

## Why

Developers should be able to reproduce the infrastructure without manually installing each dependency.

---

# ADR-021: No Direct Database Access From Frontend

## Decision

The frontend communicates only through the backend API.

```text
Browser
   ↓
API
   ↓
Service
   ↓
Database
```

This protects credentials and centralizes authorization/business logic.

---

# ADR-022: Thin Controllers

## Decision

Controllers only handle HTTP concerns.

Business logic belongs in services.

Example:

```text
Controller
  ↓
campaignService.schedule()
  ↓
repository
  ↓
BullMQ
```

This improves testability and maintainability.

---

# ADR-023: Prefer Failure Isolation

## Decision

Optional integrations must not break the core scheduler.

Examples:

```text
Slack unavailable
    ≠
email scheduling unavailable
```

```text
Elasticsearch unavailable
    ≠
email sending unavailable
```

Core scheduling and delivery take priority.

---

# ADR-024: Record Tradeoffs Explicitly

The project intentionally favors reliability and demonstrable correctness over unnecessary complexity.

Out of scope:

* real multi-provider SMTP failover
* large-scale distributed deployment
* complex campaign analytics
* advanced template engines
* production-grade billing
* full multi-region infrastructure

The architecture leaves room for these capabilities without requiring them for the assignment.
