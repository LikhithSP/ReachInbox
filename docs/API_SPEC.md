# API Specification

## 1. Overview

The ReachInbox Email Scheduler exposes a REST API used by the web dashboard and internal services.

**Base URL**

```text
/api/v1
```

**Content-Type**

```text
application/json
```

Authentication is required for all user-owned resources unless explicitly marked public.

---

# 2. Authentication

## 2.1 Google OAuth

### Start Login

```http
GET /api/v1/auth/google
```

Redirects the user to Google OAuth authorization.

### OAuth Callback

```http
GET /api/v1/auth/google/callback?code={code}&state={state}
```

Creates or retrieves the application user and establishes an authenticated session.

### Get Current User

```http
GET /api/v1/auth/me
```

### Response

```json
{
  "id": "usr_123",
  "name": "Likhith S P",
  "email": "user@example.com",
  "avatarUrl": "https://..."
}
```

### Logout

```http
POST /api/v1/auth/logout
```

Invalidates the current authenticated session.

---

# 3. Campaign APIs

## 3.1 Create Campaign

```http
POST /api/v1/campaigns
```

### Request

```json
{
  "subject": "Welcome to ReachInbox",
  "body": "Hello {{email}}, welcome!",
  "startTime": "2026-09-27T18:00:00.000Z",
  "delayMs": 2000,
  "hourlyLimit": 100,
  "senderId": "snd_123",
  "recipients": [
    {
      "email": "alice@example.com"
    },
    {
      "email": "bob@example.com"
    }
  ]
}
```

### Validation

* `subject`: required, max 500 characters
* `body`: required
* `startTime`: valid ISO timestamp
* `delayMs`: minimum configured delay
* `hourlyLimit`: positive integer
* sender must belong to authenticated user
* recipient email must be valid
* duplicate recipients should be removed before scheduling

### Response

```json
{
  "id": "cmp_123",
  "status": "SCHEDULED",
  "recipientCount": 2,
  "scheduledCount": 2
}
```

---

## 3.2 List Campaigns

```http
GET /api/v1/campaigns
```

### Query Parameters

```text
page
limit
status
search
```

### Example

```http
GET /api/v1/campaigns?status=SCHEDULED&page=1&limit=20
```

---

## 3.3 Get Campaign

```http
GET /api/v1/campaigns/:campaignId
```

Returns campaign metadata and summary.

---

## 3.4 Cancel Campaign

```http
POST /api/v1/campaigns/:campaignId/cancel
```

Only campaigns that have not completed processing can be cancelled.

---

# 4. Email Job APIs

## 4.1 Scheduled Emails

```http
GET /api/v1/emails/scheduled
```

### Query Parameters

```text
page
limit
search
from
to
status
```

### Response

```json
{
  "data": [
    {
      "id": "job_123",
      "recipient": "alice@example.com",
      "subject": "Welcome",
      "scheduledAt": "2026-09-27T18:00:00.000Z",
      "status": "SCHEDULED"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

## 4.2 Sent Emails

```http
GET /api/v1/emails/sent
```

### Query Parameters

```text
page
limit
search
from
to
status
```

### Response

```json
{
  "data": [
    {
      "id": "job_123",
      "recipient": "alice@example.com",
      "subject": "Welcome",
      "sentAt": "2026-09-27T18:00:03.000Z",
      "status": "SENT"
    }
  ]
}
```

---

## 4.3 Search Emails

```http
GET /api/v1/emails/search?q=alice
```

Search is backed by Elasticsearch.

All searches are scoped to the authenticated user's accessible data.

---

# 5. Sender APIs

## List Senders

```http
GET /api/v1/senders
```

## Add Sender

```http
POST /api/v1/senders
```

### Request

```json
{
  "email": "sender@example.com"
}
```

The server validates sender ownership and SMTP configuration.

---

# 6. Slack APIs

## 6.1 Connect Slack

```http
GET /api/v1/integrations/slack/connect
```

Redirects to Slack OAuth authorization.

---

## 6.2 Slack OAuth Callback

```http
GET /api/v1/integrations/slack/callback?code={code}&state={state}
```

The backend exchanges the authorization code for Slack credentials.

Tokens are never returned to the frontend.

---

## 6.3 Slack Connection Status

```http
GET /api/v1/integrations/slack
```

### Response

```json
{
  "connected": true,
  "teamName": "ReachInbox Workspace",
  "channelName": "#alerts"
}
```

---

## 6.4 Disconnect Slack

```http
DELETE /api/v1/integrations/slack
```

Removes the stored Slack connection.

---

# 7. Health APIs

## Application Health

```http
GET /health
```

### Response

```json
{
  "status": "ok"
}
```

## Readiness

```http
GET /ready
```

Checks required infrastructure:

* MySQL
* Redis
* Elasticsearch

---

# 8. Bull Board

Bull Board is exposed separately from the normal application API.

```text
/admin/queues
```

Access requires authenticated administrative authorization.

It provides visibility into:

* waiting jobs
* delayed jobs
* active jobs
* completed jobs
* failed jobs
* retries

---

# 9. Standard Error Format

All API errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {
      "field": "email"
    },
    "requestId": "req_123"
  }
}
```

---

# 10. HTTP Status Codes

| Status | Meaning                              |
| ------ | ------------------------------------ |
| 200    | Successful request                   |
| 201    | Resource created                     |
| 202    | Accepted for asynchronous processing |
| 204    | Successful request with no body      |
| 400    | Invalid request                      |
| 401    | Authentication required              |
| 403    | Insufficient permissions             |
| 404    | Resource not found                   |
| 409    | Conflict/idempotency conflict        |
| 422    | Validation failure                   |
| 429    | Rate limit exceeded                  |
| 500    | Internal server error                |
| 503    | Dependency unavailable               |

---

# 11. API Design Principles

* Version all APIs.
* Validate all external input.
* Never trust client-provided ownership fields.
* Scope database queries to authenticated users.
* Use consistent error responses.
* Generate request IDs.
* Never expose secrets.
* Keep controllers thin.
* Put business logic in services.
* Keep database access in repositories.
* Use idempotency for operations where duplicate requests are dangerous.
