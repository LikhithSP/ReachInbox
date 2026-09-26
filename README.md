# ReachInbox Email Scheduler

A production-grade full-stack email scheduling and delivery management platform built with Next.js, Express, TypeScript, BullMQ, Redis, MySQL/Prisma, Elasticsearch, and Nodemailer (Ethereal).

Designed around **persistent asynchronous job processing**, ensuring scheduled emails survive application and worker restarts while enforcing per-sender concurrency, configurable inter-email delays, hourly sending rate limits, idempotency, Slack notifications, and search.

---

## Architecture Overview

```text
                    ┌─────────────────────────┐
                    │       Next.js Web       │
                    │   (React + Tailwind CSS)│
                    └────────────┬────────────┘
                                 │ HTTP/REST
                                 ▼
                    ┌─────────────────────────┐
                    │       Express API       │
                    │      (TypeScript)       │
                    └──────┬───────┬───────┬──┘
                           │       │       │
              ┌────────────┘       │       └─────────────┐
              ▼                    ▼                     ▼
       ┌──────────────┐    ┌──────────────┐      ┌──────────────┐
       │ MySQL/Prisma │    │ Redis/BullMQ │      │Elasticsearch │
       │ Source Truth │    │ Queue State  │      │ Search Index │
       └──────────────┘    └───────┬──────┘      └──────────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │   Email Workers    │
                         │(BullMQ Processor)  │
                         └─────────┬──────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
              ┌──────────────┐            ┌──────────────┐
              │ Ethereal SMTP│            │ Slack OAuth/ │
              │  (Delivery)  │            │ Notifications│
              └──────────────┘            └──────────────┘
```

---

## Implementation Status

- [x] Monorepo structure (`packages/shared`, `apps/api`, `apps/web`)
- [x] Docker Compose setup (MySQL 8, Redis 7, Elasticsearch 8.11)
- [x] Environment configuration (`.env.example`)
- [x] Root & package TypeScript configuration
- [x] Database Schema (Prisma for MySQL: User, Sender, Campaign, EmailJob, SlackConnection)
- [x] Authentication & User Session (Google OAuth, Session Cookies, and Dev Login)
- [x] Campaign & Email Job API (Create Campaign, List, Scheduled Emails, Sent Emails, Senders)
- [x] BullMQ Delayed Scheduling & Startup Reconciliation (ADR-005)
- [ ] Email Worker Engine & SMTP Delivery (Ethereal)
- [ ] Concurrency, Delays, & Hourly Rate Limiting
- [ ] Slack OAuth & Alert Notifications
- [ ] Elasticsearch Email Indexing & Search
- [ ] Dashboard Web Interface & Bull Board Queue Monitoring
- [ ] Reliability & Recovery Testing Suite

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS, TanStack Query, Lucide React, Sonner |
| **Backend API** | Node.js, Express.js, TypeScript, Passport.js, Zod, Pino |
| **Worker & Queue** | BullMQ, Redis (ioredis), Bull Board |
| **Database & ORM** | MySQL 8.0, Prisma ORM |
| **Email Delivery**| Nodemailer, Ethereal Email SMTP |
| **Search Engine** | Elasticsearch 8.11 |
| **External APIs** | Google OAuth 2.0, Slack API |
| **Infrastructure** | Docker Compose |

---

## Repository Structure

```text
ReachInbox/
├── apps/
│   ├── api/                 # Express API server & background BullMQ workers
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                 # Next.js web application
│       ├── src/
│       │   └── app/
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── shared/              # Shared types, interfaces, DTOs, and enums
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── docs/                    # Complete architectural and operational specifications
├── docker-compose.yml       # Local MySQL, Redis, and Elasticsearch containers
├── .env.example             # Documented template for all required variables
├── package.json             # Root monorepo workspace configuration
├── tsconfig.base.json       # Base TypeScript compiler options
└── README.md
```

---

## Prerequisites

- **Node.js**: v20+ (tested on Node v25)
- **npm**: v10+ (or compatible package manager)
- **Docker & Docker Compose**: For local MySQL, Redis, and Elasticsearch

---

## Environment Variables

Copy the template to initialize your local environment:

```bash
cp .env.example .env
```

Key environment settings:
- `DATABASE_URL`: MySQL connection URL (e.g. `mysql://reachinbox:reachinbox_pass@localhost:3306/reachinbox`)
- `REDIS_URL`: Redis connection URL (`redis://localhost:6379`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth application credentials
- `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`: Slack App credentials for webhook/channel alerts
- `SMTP_USER` / `SMTP_PASSWORD`: Ethereal SMTP test credentials
- `WORKER_CONCURRENCY`: Number of concurrent jobs processed by the BullMQ worker
- `MIN_EMAIL_DELAY_MS`: Minimum delay enforced between consecutive emails
- `MAX_EMAILS_PER_HOUR`: Maximum emails dispatched per hour per sender

---

## Quick Start (Local Development)

### 1. Start Infrastructure Services

```bash
docker compose up -d
```

### 2. Install Monorepo Dependencies

```bash
npm install
```

### 3. Build Shared Packages

```bash
npm run build:shared
```

### 4. Database Setup & Migrations

```bash
npm run db:generate
npm run db:migrate
```

### 5. Start Development Servers

Run services in separate terminals:

```bash
# Terminal 1: Express API Server (Port 4000)
npm run dev:api

# Terminal 2: BullMQ Email Worker
npm run dev:worker

# Terminal 3: Next.js Frontend Dashboard (Port 3000)
npm run dev:web
```

---

## Detailed Documentation Links

- [Product Requirements Document (PRD)](file:///d:/ReachInbox/docs/PRD.md)
- [Technical Requirements & Architecture (TRD)](file:///d:/ReachInbox/docs/TRD.md)
- [Backend Schema & Database Models](file:///d:/ReachInbox/docs/BACKEND_SCHEMA.md)
- [API Specification](file:///d:/ReachInbox/docs/API_SPEC.md)
- [Architecture Decisions (ADR)](file:///d:/ReachInbox/docs/DECISIONS.md)
- [Frontend UI/UX Specification](file:///d:/ReachInbox/docs/FRONTEND_SPEC.md)
- [Security & Access Specification](file:///d:/ReachInbox/docs/SECURITY_ACCESS.md)
- [Error Handling Strategy](file:///d:/ReachInbox/docs/ERROR_HANDLING.md)
- [Testing Strategy](file:///d:/ReachInbox/docs/TESTING_STRATEGY.md)
- [Demo Runbook](file:///d:/ReachInbox/docs/DEMO_RUNBOOK.md)
- [Feature Tickets](file:///d:/ReachInbox/docs/FEATURE_TICKETS.md)
- [Implementation Plan](file:///d:/ReachInbox/docs/IMPLEMENTATION_PLAN.md)
- [Git Workflow & Commit Standards](file:///d:/ReachInbox/docs/AGENTS.md)
