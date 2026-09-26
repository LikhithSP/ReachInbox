# Error Handling Strategy

## 1. Objective

The application must fail safely and predictably.

Errors are divided into:

* client errors
* authentication errors
* authorization errors
* validation errors
* infrastructure errors
* dependency errors
* worker errors
* integration errors

The system should never expose internal stack traces, credentials, tokens, SQL queries, or infrastructure secrets to clients.

---

# 2. Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address",
    "details": {
      "field": "recipient"
    },
    "requestId": "req_123"
  }
}
```

`requestId` allows the user and developers to correlate an API error with server logs.

---

# 3. Error Classification

| Category                | Example                   | Retry            |
| ----------------------- | ------------------------- | ---------------- |
| Validation              | Invalid email             | No               |
| Authentication          | Invalid session           | No               |
| Authorization           | Wrong owner               | No               |
| Conflict                | Duplicate idempotency key | Usually no       |
| MySQL temporary failure | Connection timeout        | Yes              |
| Redis temporary failure | Connection failure        | Yes              |
| SMTP temporary failure  | 4xx                       | Yes              |
| SMTP permanent failure  | 5xx permanent             | No               |
| Elasticsearch failure   | Cluster unavailable       | Yes              |
| Slack temporary failure | Timeout                   | Yes              |
| OAuth failure           | User denied               | No               |
| Rate limit              | Hourly limit reached      | Reschedule       |
| Unknown worker error    | Unexpected exception      | Controlled retry |

---

# 4. Validation Errors

Invalid requests return:

```http
400 Bad Request
```

or:

```http
422 Unprocessable Entity
```

depending on whether the request structure or field values are invalid.

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "hourlyLimit must be greater than zero"
  }
}
```

Never continue processing invalid data.

---

# 5. Authentication Errors

If a protected endpoint is accessed without authentication:

```http
401 Unauthorized
```

Example:

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required"
  }
}
```

---

# 6. Authorization Errors

If a user attempts to access another user's resource:

```http
403 Forbidden
```

The API should avoid revealing whether another user's resource exists when appropriate.

---

# 7. Database Errors

## Temporary Database Failure

Example:

```text
MySQL connection timeout
```

Behavior:

* API returns `503 Service Unavailable` when request cannot be completed.
* Worker retries appropriate operations.
* Error is logged with request/job ID.
* Sensitive SQL parameters are not logged.

## Unique Constraint

Return:

```http
409 Conflict
```

Example:

```json
{
  "error": {
    "code": "DUPLICATE_RESOURCE",
    "message": "A job with this idempotency key already exists"
  }
}
```

---

# 8. Redis/BullMQ Errors

If Redis temporarily disconnects:

```text
Worker
  ↓
Redis unavailable
  ↓
reconnect
  ↓
resume processing
```

Jobs must remain durable in Redis.

The application must not silently mark jobs as sent when queue operations fail.

---

# 9. SMTP Errors

SMTP failures are classified by type.

## Temporary Failure

Examples:

* connection timeout
* temporary SMTP rejection
* provider unavailable

Action:

```text
retry with exponential backoff
```

## Permanent Failure

Examples:

* invalid recipient
* permanent rejection

Action:

```text
FAILED
```

Store:

```text
failed_at
error_message
attempts
```

Do not retry indefinitely.

---

# 10. Worker Exception Handling

Every job processor should use controlled error handling.

Conceptually:

```text
process(job)
    ↓
try
    ↓
send email
    ↓
update DB
catch
    ↓
classify error
    ↓
retry OR fail
```

Unhandled exceptions must not crash the entire worker process.

---

# 11. Idempotency Failures

If the same request arrives twice:

```text
request A
request B
   ↓
same idempotency key
   ↓
single logical job
```

The API should return the existing resource or a conflict response according to endpoint semantics.

---

# 12. Rate-Limit Errors

Rate limiting is not treated as a permanent failure.

Example:

```text
Hourly limit reached
        ↓
calculate next available window
        ↓
reschedule BullMQ job
        ↓
preserve ordering where possible
        ↓
send Slack notification
```

The email remains in the system.

---

# 13. Slack Errors

Slack notification failure must never cause the email job itself to fail.

Example:

```text
Rate limit reached
      ↓
Email rescheduled
      ↓
Slack API fails
      ↓
Log Slack failure
      ↓
Email remains safely scheduled
```

If Slack is not connected:

```text
skip notification
```

No application crash should occur.

---

# 14. Elasticsearch Errors

Elasticsearch is a search/read optimization layer.

The primary email state remains in MySQL.

Therefore:

```text
Email sent
   ↓
MySQL updated successfully
   ↓
Elasticsearch unavailable
   ↓
Email remains SENT
   ↓
Indexing can be retried/reconciled
```

Search may temporarily return stale/incomplete results.

---

# 15. OAuth Errors

Handle:

* user denies authorization
* invalid authorization code
* invalid state
* expired authorization code
* provider unavailable
* missing OAuth configuration

Never expose provider access tokens.

---

# 16. CSV Errors

Possible problems:

* unsupported file type
* oversized file
* malformed CSV
* missing email column
* invalid email addresses
* duplicate emails
* empty file

The UI should show actionable validation feedback.

Example:

```text
1,245 rows detected
1,201 valid emails
44 invalid rows
```

The user should be able to understand what will actually be scheduled.

---

# 17. File Upload Limits

Enforce:

* maximum file size
* maximum number of recipients
* accepted MIME types
* parsing timeout
* row limits

Never trust the extension alone.

---

# 18. Global Error Middleware

All unexpected API exceptions should eventually pass through a central error handler.

Responsibilities:

* assign request ID
* log server-side details
* sanitize client response
* map known errors to HTTP status
* return generic `500` for unknown errors

Example:

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Something went wrong",
    "requestId": "req_123"
  }
}
```

---

# 19. Frontend Error Handling

The frontend should distinguish:

### Validation

Show inline field errors.

### Network Failure

Show:

```text
Unable to connect. Please try again.
```

### Server Failure

Show a toast with a useful message.

### Empty State

Do not treat empty data as an error.

### Loading State

Show skeleton/spinner states.

---

# 20. Logging Rules

Logs should include:

* timestamp
* severity
* service
* request ID
* job ID
* campaign ID
* user ID where appropriate
* error code
* safe error message

Never log:

* passwords
* OAuth tokens
* Slack tokens
* SMTP passwords
* session secrets
* complete email bodies unless explicitly required for debugging

---

# 21. Retry Policy

Retries must be bounded.

Example:

```text
attempt 1
   ↓
5 seconds
   ↓
attempt 2
   ↓
30 seconds
   ↓
attempt 3
   ↓
FAILED
```

Use exponential backoff with jitter where appropriate.

Never retry permanent errors indefinitely.

---

# 22. Graceful Degradation

The system should prioritize core email correctness.

Dependency priority:

```text
MySQL
  ↓
Redis/BullMQ
  ↓
SMTP
  ↓
Elasticsearch / Slack
```

Search and Slack failures should not invalidate successfully processed email jobs.

---

# 23. Error Handling Checklist

* [ ] Central API error middleware
* [ ] Validation errors
* [ ] Authentication errors
* [ ] Authorization errors
* [ ] Database errors
* [ ] Redis errors
* [ ] BullMQ errors
* [ ] SMTP errors
* [ ] Elasticsearch errors
* [ ] Slack errors
* [ ] OAuth errors
* [ ] CSV errors
* [ ] Retry policy
* [ ] Structured logging
* [ ] Request IDs
* [ ] No secret leakage
* [ ] Frontend error states
