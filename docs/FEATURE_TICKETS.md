# Feature Tickets

## Ticket Format

Each ticket contains:

* ID
* Priority
* Feature
* Description
* Acceptance Criteria
* Dependencies

Priority:

```text
P0 = Required
P1 = Important
P2 = Polish
```

---

# EPIC 1 — Project Foundation

## RI-001 — Initialize Monorepo

**Priority:** P0

### Description

Create the repository structure for frontend, backend, shared types, documentation, and infrastructure.

### Acceptance Criteria

* [ ] Monorepo initialized
* [ ] TypeScript configured
* [ ] API application created
* [ ] Web application created
* [ ] Shared package created
* [ ] ESLint configured
* [ ] Prettier configured

---

## RI-002 — Docker Infrastructure

**Priority:** P0

### Acceptance Criteria

* [ ] MySQL container
* [ ] Redis container
* [ ] Elasticsearch container
* [ ] Persistent volumes
* [ ] Health checks
* [ ] Environment variables documented

---

# EPIC 2 — Authentication

## RI-010 — Google OAuth

**Priority:** P0

### Acceptance Criteria

* [ ] Google login works
* [ ] Callback works
* [ ] User created/updated
* [ ] Session established
* [ ] Logout works
* [ ] `/api/me` works

---

## RI-011 — Authorization Middleware

**Priority:** P0

### Acceptance Criteria

* [ ] Protected routes require authentication
* [ ] User ownership checked
* [ ] Unauthorized requests rejected
* [ ] Cross-user resource access blocked

---

# EPIC 3 — Campaign Management

## RI-020 — Campaign Schema

**Priority:** P0

### Acceptance Criteria

* [ ] Campaign table created
* [ ] Migration committed
* [ ] Prisma model created
* [ ] Relationships implemented

---

## RI-021 — Campaign Creation API

**Priority:** P0

### Acceptance Criteria

* [ ] Subject accepted
* [ ] Body accepted
* [ ] Start time accepted
* [ ] Delay accepted
* [ ] Hourly limit accepted
* [ ] Input validated
* [ ] Campaign persisted

---

# EPIC 4 — Recipient Processing

## RI-030 — CSV Upload

**Priority:** P0

### Acceptance Criteria

* [ ] CSV upload supported
* [ ] TXT support where applicable
* [ ] Emails extracted
* [ ] Invalid addresses identified
* [ ] Duplicates removed
* [ ] Summary returned

---

## RI-031 — Recipient Validation

**Priority:** P0

### Acceptance Criteria

* [ ] Valid email syntax checked
* [ ] Whitespace normalized
* [ ] Case normalization applied
* [ ] Duplicate detection implemented

---

# EPIC 5 — Scheduling

## RI-040 — BullMQ Queue

**Priority:** P0

### Acceptance Criteria

* [ ] Redis connection
* [ ] BullMQ queue
* [ ] Delayed jobs
* [ ] Job payload contains emailJobId
* [ ] Queue configuration externalized

---

## RI-041 — Email Job Creation

**Priority:** P0

### Acceptance Criteria

* [ ] One email job per valid recipient
* [ ] Scheduled timestamp calculated
* [ ] Unique idempotency key
* [ ] DB persistence
* [ ] BullMQ job created

---

## RI-042 — Email Worker

**Priority:** P0

### Acceptance Criteria

* [ ] Worker starts independently
* [ ] Configurable concurrency
* [ ] Job retrieved
* [ ] DB state checked
* [ ] Processing state recorded
* [ ] Successful jobs marked SENT
* [ ] Failed jobs recorded

---

# EPIC 6 — SMTP

## RI-050 — Ethereal Integration

**Priority:** P0

### Acceptance Criteria

* [ ] SMTP credentials configured
* [ ] Nodemailer transport created
* [ ] Email sent successfully
* [ ] Message ID persisted/logged safely
* [ ] SMTP failures handled

---

# EPIC 7 — Reliability

## RI-060 — Idempotent Processing

**Priority:** P0

### Acceptance Criteria

* [ ] Unique idempotency key
* [ ] Duplicate DB records prevented
* [ ] SENT jobs skipped
* [ ] Distributed processing lock implemented
* [ ] Duplicate processing test exists

---

## RI-061 — Restart Recovery

**Priority:** P0

### Acceptance Criteria

* [ ] Worker can stop
* [ ] Future jobs remain
* [ ] Worker restarts
* [ ] Jobs continue
* [ ] Completed jobs do not restart
* [ ] Startup reconciliation implemented

---

# EPIC 8 — Rate Control

## RI-070 — Minimum Delay

**Priority:** P0

### Acceptance Criteria

* [ ] Delay configurable
* [ ] No hardcoded production value
* [ ] Scheduled timestamps respect delay
* [ ] Configuration documented

---

## RI-071 — Hourly Rate Limiter

**Priority:** P0

### Acceptance Criteria

* [ ] Redis-backed counter
* [ ] Atomic increment/check
* [ ] Sender-aware key
* [ ] Configurable limit
* [ ] Shared across workers

---

## RI-072 — Rate Limit Rescheduling

**Priority:** P0

### Acceptance Criteria

* [ ] Limit reached detected
* [ ] Job not permanently failed
* [ ] Next window calculated
* [ ] BullMQ job delayed
* [ ] Order preserved where possible

---

## RI-073 — Slack Rate Limit Notification

**Priority:** P0

### Acceptance Criteria

* [ ] Slack OAuth works
* [ ] Connection persisted
* [ ] Notification sent when limit reached
* [ ] No Slack connection does not crash worker
* [ ] Disconnect works
* [ ] Reconnect works

---

# EPIC 9 — Search

## RI-080 — Elasticsearch Index

**Priority:** P0

### Acceptance Criteria

* [ ] Elasticsearch connection
* [ ] Index created
* [ ] Email documents indexed
* [ ] Status updates indexed

---

## RI-081 — Email Search API

**Priority:** P0

### Acceptance Criteria

* [ ] Recipient search
* [ ] Subject search
* [ ] Status filtering
* [ ] User-level filtering
* [ ] Pagination

---

# EPIC 10 — Frontend

## RI-090 — Dashboard Shell

**Priority:** P0

### Acceptance Criteria

* [ ] Header
* [ ] User information
* [ ] Logout
* [ ] Navigation
* [ ] Responsive layout

---

## RI-091 — Compose Email UI

**Priority:** P0

### Acceptance Criteria

* [ ] Subject
* [ ] Body
* [ ] CSV upload
* [ ] Recipient count
* [ ] Start time
* [ ] Delay
* [ ] Hourly limit
* [ ] Schedule button

---

## RI-092 — Scheduled Emails

**Priority:** P0

### Acceptance Criteria

* [ ] API integration
* [ ] Table
* [ ] Status badges
* [ ] Loading state
* [ ] Empty state
* [ ] Error state

---

## RI-093 — Sent Emails

**Priority:** P0

### Acceptance Criteria

* [ ] API integration
* [ ] Sent time
* [ ] Status
* [ ] Loading state
* [ ] Empty state
* [ ] Error state

---

## RI-094 — Search UI

**Priority:** P1

### Acceptance Criteria

* [ ] Search input
* [ ] Debounced request
* [ ] Results
* [ ] Empty state
* [ ] Clear search

---

# EPIC 11 — Operations

## RI-100 — Bull Board

**Priority:** P1

### Acceptance Criteria

* [ ] Bull Board installed
* [ ] Queue visible
* [ ] Waiting jobs visible
* [ ] Delayed jobs visible
* [ ] Active jobs visible
* [ ] Failed jobs visible
* [ ] Access protected

---

## RI-101 — Structured Logging

**Priority:** P1

### Acceptance Criteria

* [ ] Pino configured
* [ ] Request IDs
* [ ] Worker logs
* [ ] Error logs
* [ ] No sensitive secrets

---

# EPIC 12 — Testing

## RI-110 — Unit Tests

**Priority:** P1

### Acceptance Criteria

* [ ] Email validation
* [ ] CSV parsing
* [ ] Scheduling
* [ ] Rate limiting
* [ ] Idempotency

---

## RI-111 — Integration Tests

**Priority:** P1

### Acceptance Criteria

* [ ] API integration
* [ ] DB integration
* [ ] Queue integration
* [ ] Worker integration

---

## RI-112 — Restart Test

**Priority:** P0

### Acceptance Criteria

```text
Schedule
→ Stop worker
→ Restart worker
→ Job executes
→ No duplicate
```

---

# EPIC 13 — Documentation

## RI-120 — README

**Priority:** P0

### Acceptance Criteria

* [ ] Setup instructions
* [ ] Environment variables
* [ ] Docker instructions
* [ ] Architecture
* [ ] API overview
* [ ] Rate limiting explanation
* [ ] Restart behavior
* [ ] Tradeoffs

---

## RI-121 — Architecture Diagram

**Priority:** P1

### Acceptance Criteria

* [ ] API
* [ ] MySQL
* [ ] Redis
* [ ] BullMQ
* [ ] Worker
* [ ] SMTP
* [ ] Elasticsearch
* [ ] Slack

---

## RI-122 — Demo Scripts

**Priority:** P1

### Acceptance Criteria

* [ ] Seed demo emails
* [ ] Low-rate-limit demo
* [ ] Restart demo
* [ ] Load demo

---

# EPIC 14 — Final Submission

## RI-130 — Production Readiness Review

**Priority:** P0

### Checklist

* [ ] No secrets committed
* [ ] `.env.example`
* [ ] Build succeeds
* [ ] Tests pass
* [ ] Docker starts
* [ ] Google OAuth tested
* [ ] Slack OAuth tested
* [ ] Ethereal tested
* [ ] Elasticsearch tested
* [ ] Restart tested
* [ ] Rate limiting tested
* [ ] Bull Board tested
* [ ] UI tested
* [ ] README complete

---

## RI-131 — Demo Video

**Priority:** P0

Maximum duration:

```text
5 minutes
```

Demo:

```text
Google Login
    ↓
Compose
    ↓
Upload CSV
    ↓
Schedule
    ↓
Scheduled Dashboard
    ↓
Bull Board
    ↓
Ethereal Delivery
    ↓
Sent Dashboard
    ↓
Restart Worker
    ↓
Rate Limit
    ↓
Slack Notification
    ↓
Search
```
