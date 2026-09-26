# Frontend Specification & UI/UX Brief

## 1. Product Experience

The dashboard should feel like a modern SaaS operations product.

Design priorities:

1. Clarity
2. Speed
3. Minimal visual noise
4. Strong information hierarchy
5. Obvious system state
6. Responsive layout
7. Consistent interaction patterns

The interface should closely follow the supplied Figma while preserving the functional requirements of the assignment.

---

# 2. Application Structure

```text
/
├── login
└── dashboard
    ├── scheduled
    ├── sent
    └── compose
```

---

# 3. Authentication Screen

## Google Login

The login screen should contain:

* product identity;
* short product description;
* Google sign-in button;
* loading state;
* authentication error state.

Flow:

```text
Login
  ↓
Google OAuth
  ↓
Callback
  ↓
Dashboard
```

---

# 4. Dashboard Layout

```text
┌─────────────────────────────────────────────────────────┐
│ Logo                         User Avatar  Name  Logout   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Email Scheduler                                         │
│                                                         │
│ [ Scheduled Emails ] [ Sent Emails ]     [+ Compose]   │
│                                                         │
│ Search                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Search email, subject...                            │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Email | Subject | Time | Status                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 5. Header

Header contains:

* application logo/name;
* authenticated user's name;
* authenticated user's email;
* avatar;
* logout action.

The header should remain visually consistent across dashboard screens.

---

# 6. Primary Navigation

Tabs:

```text
Scheduled Emails
Sent Emails
```

Active tab must be visually distinguishable.

---

# 7. Compose New Email

Primary CTA:

```text
+ Compose New Email
```

Opening it should display the compose interface.

---

# 8. Compose UI

Required fields:

### Subject

```text
[ Enter email subject ]
```

### Body

Large text area:

```text
┌────────────────────────────────────────┐
│ Write your email...                    │
│                                        │
│                                        │
└────────────────────────────────────────┘
```

### Recipient Upload

```text
Upload CSV / TXT
```

After parsing:

```text
125 emails detected
117 valid
5 duplicates
3 invalid
```

The user should be able to understand exactly what will be scheduled.

---

# 9. Scheduling Controls

### Start Time

Datetime picker.

### Delay

Example:

```text
Delay between emails: 2 seconds
```

### Hourly Limit

Example:

```text
Maximum emails/hour: 100
```

Use sensible defaults but allow modification.

---

# 10. Schedule Action

Primary CTA:

```text
Schedule Emails
```

During submission:

```text
Scheduling...
```

After success:

```text
Campaign scheduled successfully.
117 emails added to the queue.
```

---

# 11. Scheduled Emails Table

Columns:

| Column         | Description       |
| -------------- | ----------------- |
| Email          | Recipient         |
| Subject        | Email subject     |
| Scheduled Time | Planned execution |
| Status         | Current state     |

Statuses:

```text
Scheduled
Queued
Processing
Rate Limited
Failed
```

---

# 12. Sent Emails Table

Columns:

| Column    | Description   |
| --------- | ------------- |
| Email     | Recipient     |
| Subject   | Subject       |
| Sent Time | Delivery time |
| Status    | Sent/Failed   |

---

# 13. Search

Search should support:

```text
recipient
subject
status
```

Example:

```text
Search: example@gmail.com
```

Search results should have loading and empty states.

---

# 14. Empty States

Scheduled:

```text
No scheduled emails

Create a campaign to start scheduling emails.

[ Compose New Email ]
```

Sent:

```text
No emails sent yet.

Your completed email deliveries will appear here.
```

---

# 15. Loading States

Use skeletons or inline loaders.

Avoid blank screens.

Examples:

```text
Loading scheduled emails...
```

```text
Loading sent emails...
```

---

# 16. Error States

Example:

```text
Something went wrong.

We couldn't load your emails.

[ Try Again ]
```

Form validation errors should appear near the relevant field.

---

# 17. Toast Notifications

Use toasts for transient events:

### Success

```text
Campaign scheduled successfully.
```

### Failure

```text
Unable to schedule campaign.
```

### Slack

```text
Slack connected successfully.
```

---

# 18. Slack Settings

A lightweight settings section should show:

```text
Slack Notifications

Status: Connected

Workspace: Example Workspace

[ Disconnect Slack ]
```

Disconnected:

```text
Slack Notifications

Status: Not connected

Receive notifications when sending limits are reached.

[ Connect Slack ]
```

---

# 19. Responsive Behavior

Desktop:

```text
Full table
```

Tablet:

```text
Condensed table
```

Mobile:

```text
Card-based email records
```

The dashboard must remain usable at smaller widths.

---

# 20. Component Architecture

Suggested structure:

```text
components/
├── ui/
│   ├── Button
│   ├── Input
│   ├── Modal
│   ├── Table
│   ├── Badge
│   ├── Skeleton
│   └── EmptyState
│
├── layout/
│   ├── Header
│   └── DashboardLayout
│
├── email/
│   ├── ComposeEmail
│   ├── EmailTable
│   ├── EmailRow
│   ├── RecipientUploader
│   └── EmailFilters
│
└── slack/
    └── SlackConnection
```

---

# 21. Frontend Data Model

```ts
interface EmailJob {
  id: string;
  recipient: string;
  subject: string;
  scheduledAt: string;
  sentAt?: string;
  status: EmailStatus;
}

type EmailStatus =
  | "SCHEDULED"
  | "QUEUED"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "RATE_LIMITED";
```

---

# 22. Frontend State Principles

Server state should be managed through TanStack Query.

Local UI state should manage:

* modal visibility;
* form state;
* file selection;
* filters;
* temporary validation state.

Avoid duplicating backend state in multiple stores.

---

# 23. UX Validation

Before submission:

```text
Subject required
Body required
At least one valid recipient required
Start time required
Delay >= 0
Hourly limit > 0
```

---

# 24. CSV UX Flow

```text
Choose File
    ↓
Parse
    ↓
Validate
    ↓
Deduplicate
    ↓
Show Summary
    ↓
User Confirms
    ↓
Schedule
```

---

# 25. Accessibility

The UI should include:

* keyboard-accessible controls;
* visible focus states;
* semantic buttons;
* form labels;
* accessible error messages;
* appropriate contrast;
* modal focus handling.

---

# 26. UI Quality Checklist

* [ ] Figma-aligned layout
* [ ] Consistent spacing
* [ ] Consistent typography
* [ ] Reusable components
* [ ] Loading states
* [ ] Empty states
* [ ] Error states
* [ ] Success toasts
* [ ] Responsive layout
* [ ] Accessible controls
* [ ] Type-safe API models
* [ ] No duplicated UI logic
