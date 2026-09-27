# ReachInbox Email Scheduler

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-CC292B?style=for-the-badge&logo=redis&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Elasticsearch](https://img.shields.io/badge/Elasticsearch-005571?style=for-the-badge&logo=elasticsearch&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

A production-grade full-stack email scheduling and delivery management platform built with **Next.js 14**, **Express**, **TypeScript**, **BullMQ**, **Redis**, **MySQL/Prisma**, **Elasticsearch**, and **Nodemailer (Ethereal Email)**.

Designed around **persistent asynchronous job processing**, ensuring scheduled emails survive application and worker restarts while enforcing per-sender concurrency, configurable inter-email delays, atomic hourly rate limits, idempotency, Slack notifications, search indexing, and real-time operational visibility.

---

## Product Previews

### Dashboard & Scheduled List View
![Dashboard Preview](previews/Dashboard.png)

### Campaign & Email Composer (with CSV Leads & Preview)
![Compose Email Preview](previews/Compose%20Email.png)

### Real-Time Slack Rate-Limit Alerts Integration
![Slack Notification Preview](previews/Slack%20Notification.png)

### Custom BullMQ Observability Dashboard (`/admin/queues`)
![BullMQ Dashboard Preview](previews/BullMQ%20Dashboard.png)

### Authentication & Registered User Login
![Login Screen Preview](previews/Login.png)

---

## Architecture Overview

```text
                                 ┌─────────────────────────────────┐
                                 │      Next.js 14 Web Client      │
                                 │ (React 18 + Tailwind CSS + App) │
                                 └───────────────┬─────────────────┘
                                                 │ HTTP / REST / Cookies
                                                 ▼
                                 ┌─────────────────────────────────┐
                                 │     Express API Server (:4000)  │
                                 │       (TypeScript + Zod)        │
                                 └───────┬──────────────┬──────────┘
                                         │              │
                   ┌─────────────────────┘              └─────────────────────┐
                   ▼                                                          ▼
        ┌──────────────────────┐                                   ┌──────────────────────┐
        │     MySQL / Prisma   │                                   │    Redis 7 / BullMQ  │
        │ Source-of-Truth DB   │                                   │ Queue & Delay States │
        └──────────────────────┘                                   └──────────┬───────────┘
                                                                              │
                                                                              ▼
                                                                   ┌──────────────────────┐
                                                                   │ BullMQ Email Worker  │
                                                                   │ (Concurrency & Lock) │
                                                                   └──────────┬───────────┘
                                                                              │
                                 ┌────────────────────────────────────────────┴─────────────┐
                                 ▼                                                          ▼
                      ┌──────────────────────┐                                   ┌──────────────────────┐
                      │    Ethereal SMTP     │                                   │  Slack Webhook/OAuth │
                      │   (Email Delivery)   │                                   │ (Rate-Limit Alerts)  │
                      └──────────────────────┘                                   └──────────────────────┘
```

### 1. How Scheduling Works
1. **Campaign Creation & Recipient Parse**: The user creates a campaign and supplies recipients via CSV or text. Recipients are validated, deduplicated, and enriched with dynamic merge tags (`{{firstName}}`, `{{company}}`).
2. **Database Ingestion (Source of Truth)**: Individual `EmailJob` records are created in MySQL with status `SCHEDULED`, capturing the exact target send time (`scheduledAt`), template content, sender identity, and campaign constraints.
3. **Queue Enqueuing with Calculated Delays**: For each email job, the API computes the job delay:
   $$\text{delayMs} = \max(0, \text{job.scheduledAt.getTime}() - \text{Date.now}())$$
   The job is placed onto the BullMQ delayed queue using a unique deterministic job ID (`email-job-<id>`). BullMQ stores the delayed timer in Redis sorted sets (`zset`).
4. **Worker Dispatch**: When the scheduled time arrives, BullMQ moves the job from the delayed set to the active waiting set. The background worker picks up the job, validates its database state, acquires a distributed sender lock, and dispatches via SMTP.

### 2. How Persistence on Restart Is Handled
- **Dual-Layer Durability**: Jobs are never stored solely in memory. MySQL persists the durable relational state (`EmailJob` record with status, timestamps, and retry counts), and Redis persists queue state (AOF / RDB snapshots).
- **Startup Reconciliation Engine (`startupReconciliation`)**:
  When the backend API or worker boots up, it automatically queries MySQL for any email jobs in `SCHEDULED` or `PROCESSING` state:
  - **Overdue Jobs**: If `scheduledAt <= now` and the job is not completed, it is immediately enqueued for processing.
  - **Future Jobs**: If `scheduledAt > now`, the system verifies that a corresponding delayed BullMQ job exists in Redis; if missing, it re-enqueues it with the remaining delay.
  - **Stuck Processing Jobs**: Any jobs left in `PROCESSING` during an ungraceful crash are checked against Redis locks and returned to the queue safely.
- **Zero Job Loss**: Killing the API server or worker process and rebooting never drops a scheduled email.

### 3. How Rate Limiting & Concurrency Are Implemented
- **Configurable Worker Concurrency**: The worker concurrency (`WORKER_CONCURRENCY`, default `5`) controls how many BullMQ jobs a single worker node processes in parallel.
- **Per-Sender Distributed Locking (`ioredis`)**: To prevent race conditions across parallel workers sending from the same email account, workers acquire a short-lived Redis lock (`lock:sender:<senderId>`) prior to dispatch.
- **Inter-Email Delay (`MIN_EMAIL_DELAY_MS`)**: Enforces a strict cooldown period (e.g. 2,000ms) between consecutive emails sent by the same sender, eliminating burst flags by email providers.
- **Atomic Hourly Rate Limiting (`MAX_EMAILS_PER_HOUR`)**:
  - Tracked via atomic Redis sliding/hourly window counters: `ratelimit:sender:<senderId>:<YYYY-MM-DD-HH>`.
  - Incremented using atomic Redis commands with a 2-hour TTL.
  - **Graceful Rescheduling**: If a sender hits the hourly threshold (e.g. 100 emails/hr), the worker does not fail the job. Instead, it reschedules the job delay to the start of the next hour window and triggers an automated Slack rate-limit alert.

---

## Features Implemented

### 🖥️ Frontend (Next.js 14, React, Tailwind CSS)
- **Authentication & User Profile**:
  - Live Google OAuth 2.0 flow with session cookie persistence.
  - Automatic avatar, display name, and email synchronization in the sidebar and header.
  - Developer bypass mode for instant local testing without Google credentials.
- **Email Management Dashboard**:
  - **Unified Tabs**: Scheduled, Sent, Favorites, and Archived views with dynamic badge counts.
  - **Gmail-Style Multi-Select & Hover Checkboxes**: Checkboxes reveal on hover, select individual or all items across pages, showing a floating contextual action bar.
  - **Bulk Actions**: Batch Delete, Favorite, and Archive operations.
  - **Sort & Filter**: Sort by Sent/Scheduled time (Newest first, Oldest first) and filter by delivery status (`SCHEDULED`, `SENT`, `FAILED`, `CANCELLED`).
  - **Gmail-Style Pagination**: Clean 25-item per page pagination with previous/next controls and item range indicators (`1-25 of 120`).
  - **Modern Layout & Badges**: Swapped status badges and time display for fast readability; live email detail inspection drawer.
- **Rich Campaign Composer**:
  - Full-featured modal with Sender selection, dynamic merge tag insertion, subject line, and HTML body preview.
  - Scheduled date & time picker, inter-email delay slider, and hourly sending quota controls.
  - Image attachments with instant thumbnail previews.
  - CSV recipient drag-and-drop parser with live syntax validation and recipient count preview.
- **Mobile Responsive & Floating Navigation**:
  - Native iOS/Apple-style floating bottom navigation pill with quick access to **Sent**, **Compose (`+`)**, and **Scheduled**.
  - Slide-out mobile navigation drawer with hamburger trigger and touch-friendly controls.
  - Fully responsive dialogs, modals, and login screen padding.

### ⚙️ Backend (Express, BullMQ, Redis, MySQL, Elasticsearch)
- **Reliable Job Scheduler**: BullMQ delayed queue processing backed by Redis and reconciled against MySQL.
- **Crash Recovery**: Startup reconciliation ensures jobs survive API and worker reboots.
- **Concurrency & Rate Limiting**: Per-sender Redis distributed locks, inter-email delay pacing, and atomic hourly counters.
- **SMTP Delivery Engine**: Nodemailer integration with Ethereal Email for instant sandbox message inspection.
- **Slack Alerting**: Automated notifications dispatched to a Slack channel when hourly rate limits are exceeded.
- **Elasticsearch Search**: Full-text indexing of email jobs for fast recipient, subject, and campaign querying.
- **Custom BullMQ Dashboard**: Built-in Bull Board at `/admin/queues` with custom ReachInbox branding, job states, retry/delay tools, and quick return navigation.
- **RESTful Endpoints**: Full CRUD API for campaigns, senders, email jobs, and individual deletion (`DELETE /api/v1/emails/:id`).

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS, TanStack Query, Lucide Icons |
| **Backend API** | Node.js, Express.js, TypeScript, Passport.js, Zod, Pino Logger |
| **Worker & Queue** | BullMQ, Redis (ioredis), Bull Board |
| **Database & ORM** | MySQL 8.0, Prisma ORM |
| **Email Delivery** | Nodemailer, Ethereal Email SMTP |
| **Search Engine** | Elasticsearch 8.11 |
| **Integrations** | Google OAuth 2.0, Slack API |
| **Containerization**| Docker, Docker Compose |

---

## Prerequisites

- **Node.js**: v20+ (tested on Node v20 & v25)
- **npm**: v10+
- **Docker & Docker Compose**: For running MySQL, Redis, and Elasticsearch locally

---

## Setting Up Ethereal Email & Environment Variables

### 1. Generate Free Ethereal Email Credentials
Ethereal is a safe fake SMTP service created by Nodemailer that captures test emails without delivering them to real inboxes.

1. Open [https://ethereal.email/create](https://ethereal.email/create) in your browser.
2. Click **Create Ethereal Account**.
3. Copy the generated **Email address** (`SMTP_USER`) and **Password** (`SMTP_PASSWORD`).
4. You can view all sent emails at any time by logging into [https://ethereal.email/messages](https://ethereal.email/messages).

### 2. Create the `.env` File
Copy the template file to the root of the project:

```bash
cp .env.example .env
```

Fill in the credentials in `.env`:

```env
# Application
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# Database (MySQL via Docker)
DATABASE_URL="mysql://reachinbox:reachinbox_pass@localhost:3306/reachinbox"

# Queue / Cache (Redis via Docker)
REDIS_URL="redis://localhost:6379"

# Google OAuth (Optional in dev - dev login bypass is available)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:4000/api/v1/auth/google/callback"

# Session & JWT Secrets
SESSION_SECRET="reachinbox-session-secret-key-32chars"
JWT_SECRET="reachinbox-jwt-secret-key-32chars"

# Slack OAuth & Integration (Optional)
SLACK_CLIENT_ID=""
SLACK_CLIENT_SECRET=""
SLACK_REDIRECT_URI="http://localhost:4000/api/v1/integrations/slack/callback"
SLACK_NOTIFICATION_CHANNEL="#email-alerts"

# SMTP Delivery (Ethereal Email)
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-ethereal-user@ethereal.email"
SMTP_PASSWORD="your-ethereal-password"
SMTP_FROM="ReachInbox Scheduler <scheduler@reachinbox.ai>"

# Elasticsearch (Optional / Local Docker Index)
ELASTICSEARCH_URL="http://localhost:9200"
ELASTICSEARCH_INDEX="email_jobs"

# Worker & Scheduler Defaults
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=100

# Bull Board Dashboard
ENABLE_BULL_BOARD=true
BULL_BOARD_PATH="/admin/queues"
```

---

## Step-by-Step Run Guide

### Step 1: Start Infrastructure (Docker)
Start MySQL 8, Redis 7, and Elasticsearch 8:

```bash
docker compose up -d
```

Verify that the containers are healthy:
```bash
docker compose ps
```

### Step 2: Install Dependencies & Build Shared Package
From the root directory:

```bash
# Install monorepo dependencies across all workspaces
npm install

# Build shared types package
npm run build:shared
```

### Step 3: Initialize Database (Prisma)
Generate the Prisma Client and run the database schema migrations:

```bash
npm run db:generate
npm run db:migrate
```
*(Or use `npm run db:push` if syncing local dev schema directly).*

---

### Step 4: Run Backend (Express API & BullMQ Worker)

You can run the API server and worker in separate terminal tabs:

**Terminal 1 (Express API Server)**:
```bash
npm run dev:api
```
- API will start on **`http://localhost:4000`**
- BullMQ Dashboard will be available at **`http://localhost:4000/admin/queues`**

**Terminal 2 (BullMQ Background Email Worker)**:
```bash
npm run dev:worker
```
- Listens to the email queue, enforces rate limits, acquires sender locks, and dispatches via Ethereal SMTP.

---

### Step 5: Run Frontend (Next.js 14)

**Terminal 3 (Next.js Web Application)**:
```bash
npm run dev:web
```
- Web interface will start on **`http://localhost:3000`**
- Navigate to `http://localhost:3000` in your browser.
- Click **"Continue with Google"** (or use the one-click developer login if Google OAuth credentials are not configured).

---

## Running the Automated Test Suite

To run the automated Jest testing suite covering the campaign APIs, validation, concurrency, and scheduling logic:

```bash
npm test
```

---

## Operational Endpoints & URLs

| Service / Interface | URL | Description |
| :--- | :--- | :--- |
| **Web Dashboard** | `http://localhost:3000` | Main application UI (Login, Scheduled, Sent, Compose) |
| **API Healthcheck** | `http://localhost:4000/health` | Service and dependency connectivity check |
| **BullMQ Dashboard** | `http://localhost:4000/admin/queues` | Queue metrics, delayed/active jobs, and manual retries |
| **Ethereal Mailbox** | `https://ethereal.email/messages` | Web inbox to inspect all dispatched test emails |
