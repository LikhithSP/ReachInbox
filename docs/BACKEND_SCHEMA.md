# Backend Schema Documentation

## 1. Database

Primary relational database:

```text
MySQL
```

ORM:

```text
Prisma
```

The database is the source of truth for business entities and email lifecycle state.

---

# 2. Entity Relationship Overview

```text
User
 │
 ├──────────────┐
 │              │
 ▼              ▼
Campaign      Sender
 │              │
 │              │
 ▼              │
EmailJob ───────┘
 │
 └──────────────► Elasticsearch

User
 │
 ▼
SlackConnection
```

---

# 3. User

Stores authenticated application users.

```text
users
```

| Field     | Type     | Description     |
| --------- | -------- | --------------- |
| id        | UUID     | Primary key     |
| googleId  | VARCHAR  | Google identity |
| email     | VARCHAR  | User email      |
| name      | VARCHAR  | Display name    |
| avatarUrl | TEXT     | Profile image   |
| createdAt | DATETIME | Creation time   |
| updatedAt | DATETIME | Last update     |

Constraints:

```text
googleId UNIQUE
email UNIQUE
```

---

# 4. Campaign

Represents one scheduling operation.

```text
campaigns
```

| Field           | Type     | Description                |
| --------------- | -------- | -------------------------- |
| id              | UUID     | Primary key                |
| userId          | UUID     | Owner                      |
| subject         | VARCHAR  | Email subject              |
| body            | TEXT     | Email body                 |
| startTime       | DATETIME | Initial send time          |
| delayMs         | INT      | Delay between emails       |
| hourlyLimit     | INT      | Hourly limit               |
| totalRecipients | INT      | Number of valid recipients |
| createdAt       | DATETIME | Creation                   |
| updatedAt       | DATETIME | Last update                |

Relationship:

```text
User 1 ─── N Campaign
```

---

# 5. Sender

Represents an email sender identity.

```text
senders
```

| Field     | Type     | Description   |
| --------- | -------- | ------------- |
| id        | UUID     | Primary key   |
| userId    | UUID     | Owner         |
| email     | VARCHAR  | Sender email  |
| provider  | VARCHAR  | SMTP provider |
| createdAt | DATETIME | Creation      |
| updatedAt | DATETIME | Last update   |

SMTP credentials should not be returned through normal API responses.

---

# 6. EmailJob

Represents one recipient delivery.

```text
email_jobs
```

| Field          | Type     | Description          |
| -------------- | -------- | -------------------- |
| id             | UUID     | Primary key          |
| campaignId     | UUID     | Campaign             |
| senderId       | UUID     | Sender               |
| recipient      | VARCHAR  | Recipient            |
| subject        | VARCHAR  | Email subject        |
| body           | TEXT     | Email body           |
| scheduledAt    | DATETIME | Planned execution    |
| status         | ENUM     | Lifecycle state      |
| bullJobId      | VARCHAR  | BullMQ job ID        |
| idempotencyKey | VARCHAR  | Unique execution key |
| attempts       | INT      | Attempts             |
| processingAt   | DATETIME | Processing timestamp |
| sentAt         | DATETIME | Successful send      |
| failedAt       | DATETIME | Failure timestamp    |
| errorMessage   | TEXT     | Error details        |
| createdAt      | DATETIME | Creation             |
| updatedAt      | DATETIME | Last update          |

---

# 7. Email Status

```text
SCHEDULED
QUEUED
PROCESSING
SENT
FAILED
RATE_LIMITED
```

Recommended lifecycle:

```text
SCHEDULED
   ↓
QUEUED
   ↓
PROCESSING
   ├── SENT
   │
   └── FAILED

PROCESSING
   ↓
RATE_LIMITED
   ↓
QUEUED
```

---

# 8. SlackConnection

```text
slack_connections
```

| Field          | Type     | Description          |
| -------------- | -------- | -------------------- |
| id             | UUID     | Primary key          |
| userId         | UUID     | Owner                |
| teamId         | VARCHAR  | Slack workspace ID   |
| teamName       | VARCHAR  | Workspace name       |
| channelId      | VARCHAR  | Notification channel |
| encryptedToken | TEXT     | OAuth token          |
| connectedAt    | DATETIME | Connection time      |
| updatedAt      | DATETIME | Last update          |

Constraint:

```text
userId UNIQUE
```

One active Slack connection per user in the initial implementation.

---

# 9. Indexes

Recommended indexes:

```text
users.googleId
users.email

campaigns.userId
campaigns.createdAt

email_jobs.campaignId
email_jobs.senderId
email_jobs.status
email_jobs.scheduledAt
email_jobs.recipient
email_jobs.idempotencyKey
```

---

# 10. Uniqueness

The following must be unique:

```text
User.googleId
User.email
EmailJob.idempotencyKey
```

This prevents accidental duplicate records.

---

# 11. Foreign Keys

```text
Campaign.userId → User.id

Sender.userId → User.id

EmailJob.campaignId → Campaign.id

EmailJob.senderId → Sender.id

SlackConnection.userId → User.id
```

Foreign-key behavior should prevent orphaned email jobs.

---

# 12. Transaction Boundaries

Campaign creation should use a database transaction for:

```text
Campaign creation
+
EmailJob creation
```

The transaction should either create all required business records or roll back.

Queue insertion occurs after the durable database state has been established.

---

# 13. Queue Metadata

BullMQ should store only execution metadata.

Example:

```json
{
  "emailJobId": "9c...",
  "campaignId": "2a..."
}
```

The worker loads complete state from MySQL.

This prevents the queue payload from becoming a second business database.

---

# 14. Elasticsearch Document

Index:

```text
email-jobs
```

Document:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "campaignId": "uuid",
  "recipient": "person@example.com",
  "subject": "Welcome",
  "status": "SENT",
  "scheduledAt": "2026-09-27T10:00:00Z",
  "sentAt": "2026-09-27T10:00:03Z"
}
```

---

# 15. Elasticsearch Search Fields

Searchable:

```text
recipient
subject
status
```

Filterable:

```text
userId
campaignId
status
```

Sortable:

```text
scheduledAt
sentAt
createdAt
```

---

# 16. Redis Keys

Example patterns:

```text
bull:email-scheduler:*
```

Rate limit:

```text
email-rate:{senderId}:{hourWindow}
```

Processing lock:

```text
email-lock:{emailJobId}
```

Session:

```text
session:{sessionId}
```

---

# 17. Data Ownership

Every user-owned resource must be associated with a user.

Authorization queries should follow:

```text
WHERE resource.userId = authenticatedUser.id
```

Indirect ownership must also be validated.

For example:

```text
EmailJob
 → Campaign
 → User
```

must be verified before returning the record.

---

# 18. Deletion Strategy

For the assignment, hard deletion can be avoided for sent email records.

Future production implementation could introduce:

```text
deletedAt
```

for soft deletion.

---

# 19. Migration Strategy

Schema changes must be committed through Prisma migrations.

Example:

```bash
npx prisma migrate dev
```

Production:

```bash
npx prisma migrate deploy
```

Never manually modify production schema without a migration.

---

# 20. Schema Integrity Checklist

* [ ] Foreign keys
* [ ] Unique constraints
* [ ] Required fields
* [ ] Useful indexes
* [ ] Explicit enum states
* [ ] Transaction boundaries
* [ ] User ownership
* [ ] Idempotency key
* [ ] Queue ID persistence
* [ ] Elasticsearch mapping
