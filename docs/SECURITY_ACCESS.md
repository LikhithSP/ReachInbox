# Security & Access Specification

## 1. Security Objectives

The system must protect:

* user accounts;
* campaign data;
* recipient email addresses;
* OAuth credentials;
* SMTP credentials;
* Slack access tokens;
* database credentials;
* Redis credentials;
* Elasticsearch credentials.

---

# 2. Authentication

Google OAuth is the primary authentication mechanism.

```text
User
 │
 ▼
Google Authorization
 │
 ▼
OAuth Callback
 │
 ▼
Validate Identity
 │
 ▼
Find/Create User
 │
 ▼
Create Application Session
 │
 ▼
Dashboard
```

The application must never trust user identity information supplied directly by the frontend.

---

# 3. Authorization

Every protected API request must identify the authenticated user.

Resources must be scoped by:

```text
userId
```

Example:

```text
GET /api/campaigns/:id
```

The backend must verify:

```text
campaign.userId === authenticatedUser.id
```

before returning the resource.

---

# 4. Session Security

Session cookies should use:

```text
HttpOnly
Secure (production)
SameSite=Lax
```

Example:

```text
Set-Cookie:
session=...
HttpOnly;
Secure;
SameSite=Lax
```

Session secrets must be stored in environment variables.

---

# 5. OAuth Security

OAuth state validation must be implemented to protect against CSRF.

Required protections:

* state parameter;
* callback validation;
* redirect URI validation;
* server-side token exchange;
* no OAuth client secrets in frontend code.

---

# 6. Slack Access

Slack access tokens are sensitive credentials.

They must:

* never be returned to the frontend;
* never appear in logs;
* never be stored in source control;
* be stored encrypted at rest where practical;
* only be used by backend Slack integration code.

The frontend should only receive:

```json
{
  "connected": true,
  "workspace": "Example Workspace"
}
```

Never:

```json
{
  "accessToken": "xoxb-..."
}
```

---

# 7. SMTP Security

Ethereal credentials must be environment variables.

```env
ETHEREAL_USER=
ETHEREAL_PASSWORD=
```

Credentials must never be committed.

---

# 8. Environment Secrets

`.env` must be ignored:

```gitignore
.env
.env.local
.env.*.local
```

A safe template should exist:

```text
.env.example
```

with empty values.

---

# 9. Input Validation

All API input must be validated server-side.

Use Zod schemas for:

* campaign requests;
* pagination;
* query parameters;
* email addresses;
* scheduling configuration;
* OAuth callback data.

Client-side validation improves UX but is not a security boundary.

---

# 10. CSV Security

Uploaded files must have:

* maximum size;
* accepted extensions/types;
* maximum recipient count;
* valid encoding;
* validated email values.

The backend must not trust filename extensions alone.

---

# 11. SQL Security

Database access must use Prisma's parameterized queries.

Never construct SQL using raw user input.

Avoid:

```text
SELECT * FROM users WHERE email = '${email}'
```

Prefer ORM parameterization.

---

# 12. XSS Protection

Email bodies are untrusted user content.

If rendered as HTML anywhere in the dashboard, content must be sanitized.

Plain text rendering is preferred for the initial implementation.

---

# 13. CSRF

For cookie-based authentication:

* use SameSite cookies;
* validate OAuth state;
* use CSRF protection for state-changing cross-origin scenarios.

---

# 14. CORS

Only trusted frontend origins should be allowed.

Example:

```env
FRONTEND_URL=http://localhost:3000
```

Production:

```env
FRONTEND_URL=https://your-domain.example
```

Avoid:

```text
Access-Control-Allow-Origin: *
```

for authenticated APIs.

---

# 15. Security Headers

Use Helmet.

Expected headers include:

```text
Content-Security-Policy
X-Content-Type-Options
X-Frame-Options
Referrer-Policy
```

Configuration should be adjusted for OAuth and frontend requirements.

---

# 16. Rate Limiting

API-level rate limiting should protect sensitive endpoints:

```text
/auth/*
/api/campaigns
/api/slack/*
```

This is separate from email sending rate limits.

There are therefore two distinct concepts:

### API rate limiting

Protects the application.

### Email rate limiting

Controls outbound email delivery.

---

# 17. Authorization Matrix

| Resource                 | User        |
| ------------------------ | ----------- |
| Own profile              | Read        |
| Own campaigns            | Read/Write  |
| Own emails               | Read        |
| Own sender configuration | Read/Write  |
| Own Slack connection     | Read/Write  |
| Other user's campaign    | Denied      |
| Other user's emails      | Denied      |
| Bull Board               | Restricted  |
| System configuration     | Server only |

---

# 18. Bull Board Access

Bull Board must not be publicly exposed without authentication.

Recommended:

```text
/admin/queues
```

protected by:

* admin authentication;
* development-only access;
* or an internal environment restriction.

---

# 19. Sensitive Logging Rules

Never log:

```text
password
access_token
refresh_token
client_secret
session_secret
SMTP password
Authorization header
Cookie
```

Safe logs:

```text
campaignId
emailJobId
userId
queueName
status
attemptCount
```

---

# 20. Data Protection

Recipient addresses are user-provided data.

Access should be limited to the owning authenticated user.

API responses should return only the data required by the UI.

---

# 21. Dependency Security

Dependencies should be reviewed before submission.

Recommended commands:

```bash
npm audit
```

and:

```bash
npm outdated
```

Critical vulnerabilities should be investigated before deployment.

---

# 22. Security Checklist

* [ ] `.env` ignored
* [ ] `.env.example` included
* [ ] Google OAuth configured
* [ ] OAuth state validation implemented
* [ ] Session cookie secured
* [ ] Authorization checks implemented
* [ ] Slack token never exposed
* [ ] SMTP credentials never exposed
* [ ] Input validation implemented
* [ ] CSV size limits implemented
* [ ] SQL injection protected
* [ ] XSS protected
* [ ] CORS restricted
* [ ] Helmet enabled
* [ ] Sensitive logs removed
* [ ] Bull Board protected
* [ ] API rate limiting implemented
* [ ] Dependency audit completed
