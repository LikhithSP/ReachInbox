# Testing Strategy

## 1. Objective

The testing strategy validates functional correctness, reliability, concurrency, persistence, security, and user experience.

The highest-risk areas are:

1. Scheduling
2. BullMQ persistence
3. Worker processing
4. Idempotency
5. Rate limiting
6. Minimum send delay
7. Restart recovery
8. SMTP failures
9. Slack integration
10. Authentication and authorization

---

# 2. Testing Pyramid

```text
                 E2E
              /       \
        Integration    API
          /               \
       Worker           Repository
             \           /
                Unit
```

Most business logic should be covered with unit tests, while distributed behavior should be tested through integration tests.

---

# 3. Unit Testing

Test isolated business logic.

## Campaign Validation

Test:

* valid campaign
* missing subject
* empty body
* invalid start time
* invalid delay
* invalid hourly limit
* invalid recipient
* duplicate recipients

## Scheduling

Test:

* future start time
* immediate scheduling
* multiple recipients
* delay calculation
* ordering
* timezone normalization

Example:

```text
start = 10:00
delay = 2000ms

job1 = 10:00:00
job2 = 10:00:02
job3 = 10:00:04
```

## Idempotency

Test:

```text
same idempotency key
        ↓
same logical email job
        ↓
no duplicate job
```

## Rate Limiting

Test:

* below limit
* exactly at limit
* above limit
* next-hour rescheduling
* separate sender counters
* separate tenant counters
* concurrent workers

## Email Status Transitions

Valid:

```text
SCHEDULED → QUEUED
QUEUED → PROCESSING
PROCESSING → SENT
PROCESSING → FAILED
```

Invalid transitions should be rejected.

---

# 4. Repository Tests

Test database operations:

* create user
* create campaign
* create email job
* update status
* fetch scheduled jobs
* fetch sent jobs
* search filters
* ownership filtering
* unique constraints
* foreign keys

---

# 5. API Integration Tests

Test complete request flows.

## Authentication

* Google OAuth callback
* authenticated request
* unauthenticated request
* logout
* expired session

## Campaign API

```text
POST /campaigns
      ↓
DB campaign
      ↓
DB email jobs
      ↓
BullMQ jobs
```

Verify every layer.

## Email APIs

Test:

* pagination
* search
* filtering
* user isolation
* invalid parameters

---

# 6. Worker Integration Tests

Use a real Redis instance in test infrastructure.

Verify:

### Successful Send

```text
BullMQ
  ↓
Worker
  ↓
SMTP
  ↓
DB = SENT
  ↓
Elasticsearch indexed
```

### Failed Send

```text
SMTP failure
    ↓
retry
    ↓
attempt limit
    ↓
FAILED
```

---

# 7. Idempotency Tests

Critical test:

```text
same BullMQ job processed twice
```

Expected result:

```text
SMTP send occurs once
```

Also test:

```text
worker crashes after DB state change
worker restarts
same job becomes visible again
```

The worker must detect the existing final state before attempting another send.

Because external SMTP does not provide a transaction with our database, the implementation should document the remaining theoretical exactly-once limitation.

---

# 8. Restart Recovery Tests

### Scenario

1. Create future email.
2. Verify job exists in Redis/BullMQ.
3. Stop API/worker.
4. Restart services.
5. Verify job remains.
6. Wait until scheduled time.
7. Verify email is sent.

Expected:

```text
No job loss
No duplicate send
No restart-from-scratch behavior
```

---

# 9. Rate Limit Tests

Example:

```text
Hourly limit = 3
Recipients = 5
```

Expected:

```text
Email 1 → sent
Email 2 → sent
Email 3 → sent
Email 4 → next available hour
Email 5 → next available hour
```

Verify:

* Redis counter
* rescheduled jobs
* order preservation
* Slack notification
* multiple workers
* concurrent execution

---

# 10. Minimum Delay Tests

Configuration:

```text
MIN_EMAIL_DELAY_MS=2000
```

For sequential sends:

```text
send1 = T
send2 >= T + 2000ms
```

The implementation must not rely only on frontend validation.

The worker must enforce the constraint.

---

# 11. Concurrency Tests

Run multiple workers:

```text
worker-1 concurrency = 5
worker-2 concurrency = 5
worker-3 concurrency = 5
```

Verify:

* no duplicate sends
* global rate limit remains correct
* database state remains consistent
* jobs are distributed correctly

---

# 12. Load Testing

Test approximately:

```text
1000 email jobs
```

Expected behavior:

* API accepts the workload without attempting to synchronously send every email.
* BullMQ stores jobs.
* Workers process jobs according to concurrency.
* Rate limits remain enforced.
* Memory usage remains bounded.
* Jobs remain observable in Bull Board.

Ethereal should not be used to actually deliver 1000 real messages during the demo.

A mocked SMTP transport may be used for load testing.

---

# 13. Elasticsearch Tests

Test:

* index creation
* indexing sent email
* search by recipient
* search by subject
* filtering
* user isolation
* Elasticsearch unavailable
* eventual consistency

The application should not lose the primary email record if Elasticsearch is temporarily unavailable.

---

# 14. Slack Tests

Test:

* OAuth success
* OAuth denial
* invalid state
* disconnected Slack
* rate-limit notification
* Slack API failure
* token storage
* disconnect
* reconnect

If Slack is disconnected:

```text
rate limit reached
        ↓
email is still rescheduled
        ↓
Slack notification skipped safely
```

---

# 15. Frontend Tests

Test:

* login state
* dashboard loading
* compose form
* CSV upload
* email count
* validation
* schedule action
* success toast
* error toast
* empty states
* scheduled table
* sent table
* search
* logout
* Slack connection state

---

# 16. Security Tests

Verify:

* unauthenticated access rejected
* user A cannot access user B's campaigns
* user A cannot access user B's jobs
* malicious CSV input handled safely
* XSS payloads escaped
* SQL injection prevented
* invalid OAuth state rejected
* secrets not returned through APIs
* Bull Board protected

---

# 17. Regression Checklist

Before submission:

* [ ] Login works
* [ ] Campaign scheduling works
* [ ] CSV upload works
* [ ] Scheduled emails appear
* [ ] Worker processes jobs
* [ ] Ethereal receives emails
* [ ] Restart recovery works
* [ ] Duplicate protection works
* [ ] Delay is enforced
* [ ] Hourly limit is enforced
* [ ] Slack notification works
* [ ] Elasticsearch search works
* [ ] Bull Board works
* [ ] Unauthorized access is blocked
* [ ] Production build works
* [ ] Docker startup works
* [ ] README setup works

---

# 18. Definition of Done

A feature is considered complete only when:

1. Implementation exists.
2. Happy path works.
3. Failure path is handled.
4. Authorization is verified.
5. Relevant automated tests exist.
6. Logs are meaningful.
7. Documentation is updated.
8. Feature works after restart where applicable.
