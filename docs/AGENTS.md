# Git Workflow & Commit Standards

You are working on a real software engineering assignment where the Git repository and commit history may be reviewed by engineers.

Git history is part of the deliverable.

## 1. Core Rule

Do NOT make one huge commit containing the entire project.

Work incrementally and create meaningful commits after completing each logical unit of work.

Every commit must represent a coherent, reviewable engineering change.

The commit history should clearly communicate how the project was built.

---

# 2. Branch Strategy

Do not perform all development directly on `main`.

Use feature branches for meaningful features.

### Main branch

```text
main
```

`main` should remain stable and runnable.

### Feature branches

Use this naming convention:

```text
feature/<short-description>
```

Examples:

```text
feature/project-foundation
feature/database-schema
feature/google-auth
feature/campaign-api
feature/email-scheduler
feature/email-worker
feature/rate-limiting
feature/slack-oauth
feature/elasticsearch-search
feature/dashboard
feature/testing
```

### Bug fixes

Use:

```text
fix/<short-description>
```

Examples:

```text
fix/duplicate-email-processing
fix/queue-recovery
fix/csv-validation
fix/slack-oauth-state
```

### Refactoring

Use:

```text
refactor/<short-description>
```

Examples:

```text
refactor/scheduler-service
refactor/api-error-handling
```

---

# 3. Branch Workflow

For each substantial feature:

```text
main
  ↓
create feature branch
  ↓
implement feature
  ↓
test feature
  ↓
commit logical changes
  ↓
merge into main
```

Do not create unnecessary branches for tiny one-line changes.

Use judgment.

---

# 4. Before Starting Work

Before implementing a feature:

1. Check the current branch.
2. Check `git status`.
3. Review recent commits.
4. Ensure the working tree is understood.
5. Create or switch to the appropriate feature branch.

Commands:

```bash
git status
git branch
git log --oneline -10
```

If currently on `main` and starting a substantial feature:

```bash
git checkout main
git pull
git checkout -b feature/<feature-name>
```

If the repository is local-only and `git pull` is not appropriate, do not invent remote changes.

---

# 5. Commit Granularity

Commit after a logical unit is complete.

Good examples:

```text
chore: initialize monorepo structure
```

```text
chore: add Docker infrastructure for MySQL Redis and Elasticsearch
```

```text
feat: add Prisma database schema for scheduler entities
```

```text
feat: implement campaign creation API
```

```text
feat: persist email jobs before queue scheduling
```

```text
feat: add BullMQ delayed email scheduling
```

```text
feat: implement SMTP email delivery worker
```

```text
feat: add idempotent email processing
```

```text
feat: add Redis-backed hourly rate limiting
```

```text
feat: reschedule emails when hourly limit is reached
```

```text
feat: add Slack OAuth integration
```

```text
feat: notify Slack when email rate limit is reached
```

```text
feat: add Elasticsearch email indexing
```

```text
feat: add scheduled and sent email dashboard
```

```text
test: add scheduler reliability tests
```

```text
test: add rate limit concurrency tests
```

```text
fix: prevent duplicate email processing after worker restart
```

---

# 6. Commit Message Convention

Use Conventional Commits.

Format:

```text
<type>: <imperative description>
```

Allowed types:

```text
feat
fix
refactor
test
docs
chore
build
ci
perf
```

Examples:

```text
feat: add campaign scheduling endpoint
fix: prevent duplicate queue jobs
test: cover worker retry behavior
docs: document rate limiting architecture
refactor: extract email scheduling service
chore: configure environment validation
build: add Docker Compose infrastructure
perf: optimize scheduled email query
```

Use lowercase descriptions.

Keep the first line concise, preferably under approximately 72 characters.

---

# 7. Do NOT Use Bad Commit Messages

Never use:

```text
update
changes
final
final changes
fix
bug fix
done
completed
work
test
testing
asdf
new
latest
important
minor changes
UI changes
backend changes
```

These do not communicate engineering intent.

Instead of:

```text
fix
```

use:

```text
fix: prevent duplicate email processing
```

Instead of:

```text
backend changes
```

use:

```text
feat: add campaign scheduling service
```

---

# 8. Commit Scope

Do not mix unrelated work in one commit.

Bad:

```text
feat: add dashboard
```

when that commit also contains:

* database changes
* Slack OAuth
* Elasticsearch
* worker changes
* README changes
* unrelated formatting

Prefer logical commits.

For example:

```text
feat: add scheduled emails API
feat: add sent emails API
feat: add dashboard email tables
feat: add email search
```

However, do not artificially split code that must logically change together.

The goal is a clean engineering history, not a large number of meaningless commits.

---

# 9. Commit Before Moving to Another Major Feature

After completing and testing a feature:

```bash
git status
git diff
git add <relevant-files>
git commit -m "feat: <description>"
```

Then verify:

```bash
git log --oneline -5
git status
```

Do not leave completed major features uncommitted while moving to unrelated features.

---

# 10. Testing Before Commit

Before committing implementation work:

1. Run relevant tests.
2. Run type checking.
3. Run linting where configured.
4. Verify the application still starts.

For example:

```bash
npm run test
npm run typecheck
npm run lint
```

Only run commands that actually exist in the project.

Do not invent scripts.

If a test fails:

* investigate it
* fix it
* rerun it
* only then commit

Do not knowingly commit broken functionality unless explicitly instructed.

---

# 11. Branch Completion

When a feature is complete:

```text
feature/<name>
       ↓
tests pass
       ↓
commit
       ↓
merge into main
```

Before merging:

```bash
git status
git log --oneline
```

Then merge the feature into `main`.

Prefer a clean merge strategy that preserves the meaningful commit history.

Do not squash all feature commits into a single vague commit unless explicitly instructed.

The reviewers should be able to see the logical development progression.

---

# 12. After Merging

Switch back to main:

```bash
git checkout main
```

Verify:

```bash
git status
git log --oneline -10
```

Then create the next feature branch when starting the next substantial feature.

---

# 13. Documentation Commits

Documentation changes should also have meaningful commits.

Examples:

```text
docs: add product requirements document
docs: document backend architecture
docs: document API contracts
docs: document security model
docs: add implementation plan
docs: document testing strategy
docs: add demo runbook
```

Do not create commits such as:

```text
docs updated
```

---

# 14. Database Migration Commits

Database schema changes must include their migration files in the same logical commit.

Example:

```text
feat: add email job persistence schema
```

That commit should contain the corresponding schema/migration changes.

Do not commit application code that expects a schema change while leaving the migration in an unrelated future commit.

---

# 15. Environment Configuration

Commit:

```text
.env.example
```

Never commit:

```text
.env
```

Never commit:

* OAuth secrets
* Slack tokens
* SMTP passwords
* database passwords
* API keys
* session secrets

Before every commit, inspect staged files.

---

# 16. Generated Files

Do not commit unnecessary generated files, caches, dependencies, or local runtime data.

Examples:

```text
node_modules/
.env
coverage/
logs/
temporary files
local database files
Redis dumps
IDE-specific files
```

Use `.gitignore`.

---

# 17. AI Agent Rules

Because this project is being developed with AI assistance:

### Do not fabricate Git history.

Never create fake historical commits claiming work happened earlier.

Only commit actual changes made during the current development process.

### Do not rewrite history unnecessarily.

Do not use:

```bash
git reset --hard
git rebase
git commit --amend
git push --force
```

unless explicitly required and safe.

The goal is transparent development history.

### Do not hide large changes.

If a substantial feature was implemented, represent it honestly in one or more meaningful commits.

### Do not create artificial micro-commits.

Do not make:

```text
fix typo
fix another typo
update import
update import again
```

unless those changes genuinely represent separate work.

---

# 18. Recommended Development Sequence

Use approximately this progression:

```text
main
 │
 ├── feature/project-foundation
 │     ├── chore: initialize project structure
 │     ├── build: add Docker infrastructure
 │     └── chore: configure development tooling
 │
 ├── feature/database-schema
 │     ├── feat: add scheduler database schema
 │     └── feat: add database migrations
 │
 ├── feature/auth
 │     ├── feat: add Google OAuth authentication
 │     └── feat: add authenticated session handling
 │
 ├── feature/campaign-api
 │     ├── feat: add campaign creation API
 │     ├── feat: add scheduled email API
 │     └── test: add campaign API tests
 │
 ├── feature/email-scheduler
 │     ├── feat: add BullMQ email queue
 │     ├── feat: add delayed email scheduling
 │     └── test: add scheduler tests
 │
 ├── feature/email-worker
 │     ├── feat: add SMTP email worker
 │     ├── feat: add worker retry handling
 │     └── feat: add idempotent email processing
 │
 ├── feature/rate-limiting
 │     ├── feat: add Redis hourly rate limiter
 │     ├── feat: reschedule rate-limited jobs
 │     └── test: add concurrent rate limit tests
 │
 ├── feature/slack-oauth
 │     ├── feat: add Slack OAuth integration
 │     └── feat: notify Slack on rate limit
 │
 ├── feature/elasticsearch-search
 │     ├── feat: add email search indexing
 │     └── feat: add email search API
 │
 ├── feature/dashboard
 │     ├── feat: add dashboard layout
 │     ├── feat: add campaign composer
 │     ├── feat: add scheduled email table
 │     └── feat: add sent email table
 │
 ├── feature/testing
 │     ├── test: add worker integration tests
 │     ├── test: add restart recovery tests
 │     └── test: add API authorization tests
 │
 └── feature/documentation
       ├── docs: add architecture documentation
       ├── docs: add API specification
       └── docs: add demo runbook
```

This is an example structure, not a requirement to create every branch exactly as shown.

Use judgment based on the actual implementation.

---

# 19. Final Git History Requirements

Before submission, verify:

```bash
git log --oneline --decorate --graph --all
```

The history should clearly show:

```text
Foundation
    ↓
Infrastructure
    ↓
Database
    ↓
Authentication
    ↓
API
    ↓
Scheduling
    ↓
Worker
    ↓
Reliability
    ↓
Rate limiting
    ↓
Integrations
    ↓
Frontend
    ↓
Testing
    ↓
Documentation
```

The repository should look like a real engineering project developed incrementally.

---

# 20. Agent Decision Rule

Before every commit, ask:

> "If an engineer reviewing this repository sees only this commit message and its diff, can they understand what engineering change was made?"

If the answer is no, improve the commit message or commit structure.

Before switching to another major feature, ask:

> "Is the current feature complete, tested, and committed?"

If yes, move on.

If no, finish it first.

---

# 21. Important

Do not optimize for the number of commits.

Optimize for:

* logical commits
* meaningful messages
* clean branches
* tested changes
* stable `main`
* transparent development history
* easy code review

The Git history should tell the story of the system's actual development.



# README Maintenance & Documentation Rules

## 1. README Is a First-Class Project File

`README.md` is one of the most important files in this repository.

It must always represent the current state of the project.

Treat the README as a **living document** that evolves alongside the implementation.

Do not treat README updates as something to do only at the end of the project.

---

# 2. Mandatory README Synchronization

Whenever implementing, modifying, removing, or significantly refactoring a feature, check whether the change affects the README.

If it does, update `README.md` as part of the same logical development task.

This applies to:

* new features
* removed features
* changed features
* architecture changes
* API changes
* database changes
* environment variables
* setup requirements
* dependencies
* project structure
* authentication changes
* integrations
* queue behavior
* worker configuration
* rate limiting
* Elasticsearch
* Slack
* Google OAuth
* Docker infrastructure
* testing commands
* deployment instructions
* demo instructions
* known limitations
* assumptions
* tradeoffs

---

# 3. README Must Never Become Stale

Before completing a major implementation task, ask:

> "Does this change make any existing statement in README.md inaccurate, incomplete, or misleading?"

If yes:

1. Update the affected README section.
2. Verify the documentation matches the implementation.
3. Include the README update in the same logical commit.

Never knowingly leave outdated documentation behind.

---

# 4. README Update Examples

## Adding a Feature

If Elasticsearch search is implemented:

```text
Implementation
+
README update
```

README should now mention Elasticsearch under:

* features
* architecture
* setup/configuration if required
* relevant environment variables

Example commit:

```text
feat: add Elasticsearch email search
```

If the README update is tightly coupled to that feature, include it in the same commit.

---

# 5. Removing a Feature

If a planned feature is removed:

Do not leave it listed as implemented.

Update:

* feature list
* architecture diagram if necessary
* setup instructions
* environment variables
* API documentation references
* known limitations

Example:

```text
refactor: remove unused sender management flow
```

README must no longer claim that functionality exists.

---

# 6. Changing a Feature

If behavior changes, update the README accordingly.

For example:

Before:

```text
Emails are processed sequentially.
```

After implementation changes concurrency:

```text
Email processing uses configurable BullMQ worker concurrency.
```

The README must reflect the actual implementation, not the original design.

---

# 7. Environment Variable Synchronization

Whenever an environment variable is:

* added
* removed
* renamed
* made optional
* made required
* changed in meaning

update all relevant documentation.

At minimum check:

```text
.env.example
README.md
TRD.md
```

Example:

If adding:

```env
WORKER_CONCURRENCY=5
```

README should explain what it controls.

If removing:

```env
OLD_RATE_LIMIT=
```

remove it from documentation as well.

---

# 8. Setup Instructions Must Be Tested

README setup instructions are not theoretical documentation.

Whenever setup instructions change, verify them against the actual project.

For example:

```bash
npm install
docker compose up -d
npm run db:migrate
npm run dev
```

Only document commands that actually exist.

Do not invent commands.

If a script is renamed:

```text
npm run dev
```

to:

```text
npm run dev:web
```

update README immediately.

---

# 9. README Technology Stack Must Match Reality

The README technology section must reflect technologies actually used by the implementation.

For example:

```text
Next.js
TypeScript
Tailwind CSS
Express
MySQL
Redis
BullMQ
Elasticsearch
Nodemailer/Ethereal
Google OAuth
Slack OAuth
Docker
```

Do not list technologies merely because they were originally planned.

If a planned technology is abandoned, remove it.

If a new major technology is introduced, add it.

---

# 10. README Feature List Must Match Reality

Use feature status carefully.

Do not claim:

```text
✓ Slack OAuth
✓ Elasticsearch
✓ Restart recovery
✓ Distributed rate limiting
```

until those features actually work.

During development, it is acceptable to maintain a status section such as:

```text
## Implementation Status

- [x] Project foundation
- [x] Database schema
- [x] BullMQ scheduling
- [ ] Slack OAuth
- [ ] Elasticsearch search
- [ ] Dashboard
```

Update this as implementation progresses.

Before final submission, the status should accurately represent the submitted system.

---

# 11. Architecture Changes Require README Review

Any change involving system architecture requires checking the README architecture section.

Examples:

```text
Redis added
BullMQ introduced
Elasticsearch added
worker separated
API split into services
authentication moved server-side
new integration added
```

Update the architecture diagram where necessary.

Preferred diagram:

```text
                    ┌───────────────┐
                    │    Next.js    │
                    │   Dashboard   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Express API   │
                    └───────┬───────┘
                            │
               ┌────────────┼────────────┐
               ▼            ▼            ▼
          ┌────────┐   ┌─────────┐  ┌──────────────┐
          │ MySQL  │   │ Redis + │  │ Elasticsearch│
          │        │   │ BullMQ  │  │              │
          └────────┘   └────┬────┘  └──────────────┘
                            │
                            ▼
                       ┌─────────┐
                       │ Worker  │
                       └────┬────┘
                            │
                            ▼
                      Ethereal SMTP

                       Slack OAuth
                           ▲
                           │
                     Rate-limit alerts
```

Keep the diagram synchronized with the actual architecture.

---

# 12. API Changes Require README Review

If an API is:

* added
* removed
* renamed
* versioned
* changed significantly

check README.

The README should contain a concise API overview and point to:

```text
docs/API_SPEC.md
```

Do not duplicate the entire API specification in README.

README should provide the important overview; detailed API contracts belong in `API_SPEC.md`.

---

# 13. Database Changes Require README Review

If the data model changes significantly, update the architecture/data section if necessary.

Detailed schema remains in:

```text
docs/BACKEND_SCHEMA.md
```

README should remain concise.

---

# 14. Documentation Hierarchy

Keep documentation responsibilities clear.

```text
README.md
    ↓
Project landing page
Quick setup
Features
Architecture overview
Technology stack
Demo
Links to detailed docs

docs/PRD.md
    ↓
Product requirements

docs/TRD.md
    ↓
Technical architecture

docs/API_SPEC.md
    ↓
API contracts

docs/SECURITY_ACCESS.md
    ↓
Security

docs/FRONTEND_SPEC.md
    ↓
Frontend design

docs/BACKEND_SCHEMA.md
    ↓
Database/data model

docs/FEATURE_TICKETS.md
    ↓
Implementation tickets

docs/IMPLEMENTATION_PLAN.md
    ↓
Development plan

docs/TESTING_STRATEGY.md
    ↓
Testing

docs/ERROR_HANDLING.md
    ↓
Failure behavior

docs/DECISIONS.md
    ↓
Architecture decisions

docs/DEMO_RUNBOOK.md
    ↓
Demo instructions
```

README should link to the detailed documents instead of duplicating them.

---

# 15. README Should Contain

The README should generally include:

## Project Title

```text
ReachInbox Email Scheduler
```

## Project Description

Short explanation of the system.

## Key Features

Only features actually implemented.

## Architecture

High-level architecture diagram.

## Tech Stack

Actual technologies used.

## Project Structure

High-level repository structure.

## Prerequisites

Required versions/tools.

## Installation

Exact setup instructions.

## Environment Variables

Required variables and their purpose.

## Running Locally

Exact commands.

## Database Setup

Migration/setup instructions.

## Queue/Worker Setup

How to start the worker.

## Authentication Setup

Google OAuth configuration.

## Slack Setup

Slack OAuth configuration if implemented.

## Elasticsearch Setup

Required configuration if implemented.

## API Overview

High-level endpoints.

Detailed contracts:

```text
docs/API_SPEC.md
```

## Testing

Commands that actually work.

## Architecture/Design Notes

Important engineering decisions.

Detailed decisions:

```text
docs/DECISIONS.md
```

## Reliability

Brief explanation of:

* persistent scheduling
* restart recovery
* idempotency
* rate limiting
* concurrency

## Demo

How to reproduce the key functionality.

Detailed demo:

```text
docs/DEMO_RUNBOOK.md
```

## Assumptions & Tradeoffs

Important limitations and intentional decisions.

## Documentation

Links to all major documents.

---

# 16. README Links Must Stay Valid

Whenever documentation files are:

* renamed
* moved
* deleted
* added

check README links.

For example:

```text
docs/TRD.md
docs/API_SPEC.md
docs/SECURITY_ACCESS.md
```

must point to files that actually exist.

Never leave broken documentation links.

---

# 17. README and Git Commits

README changes should be represented honestly in Git history.

Good:

```text
feat: add Slack OAuth integration
```

with the corresponding README update included if tightly coupled.

Or:

```text
docs: update Slack integration setup
```

when the implementation already exists and only documentation changes.

Do not create fake documentation commits just to make the history look active.

---

# 18. Before Every Major Commit

Run this checklist:

```text
[ ] Does README describe this new feature?
[ ] Did any existing behavior change?
[ ] Did setup instructions change?
[ ] Did environment variables change?
[ ] Did architecture change?
[ ] Did API behavior change?
[ ] Did dependencies change?
[ ] Did project structure change?
[ ] Did any feature get removed?
[ ] Are README links still valid?
[ ] Are documented commands real?
[ ] Are documented features actually implemented?
```

If any answer indicates a required update, update README before completing the task.

---

# 19. Before Every Feature Branch Is Merged

Perform a documentation consistency check.

Review:

```text
README.md
docs/PRD.md
docs/TRD.md
docs/API_SPEC.md
docs/BACKEND_SCHEMA.md
docs/SECURITY_ACCESS.md
```

Only update documents that are actually affected.

Do not make unnecessary documentation changes.

---

# 20. Before Final Submission

Perform a complete README audit.

Verify:

### Project

* [ ] Project description is accurate.
* [ ] Feature list matches implementation.
* [ ] Technology stack matches implementation.

### Setup

* [ ] Prerequisites are correct.
* [ ] Installation commands work.
* [ ] Docker instructions work.
* [ ] Database setup works.
* [ ] Worker setup works.
* [ ] Frontend setup works.

### Configuration

* [ ] `.env.example` matches README.
* [ ] All required environment variables are documented.
* [ ] Removed variables are no longer documented.

### Architecture

* [ ] Architecture diagram matches implementation.
* [ ] Services are correctly represented.
* [ ] Queue flow is accurate.
* [ ] Data flow is accurate.

### Features

* [ ] Scheduling documented.
* [ ] BullMQ documented.
* [ ] Restart recovery documented.
* [ ] Idempotency documented.
* [ ] Rate limiting documented.
* [ ] Elasticsearch documented.
* [ ] Slack documented.
* [ ] OAuth documented.
* [ ] Dashboard documented.

### Development

* [ ] Testing commands work.
* [ ] Lint commands work.
* [ ] Build commands work.

### Submission

* [ ] Demo instructions are accurate.
* [ ] Known limitations are documented.
* [ ] Assumptions are documented.
* [ ] Detailed documentation links work.

---

# 21. Final Agent Rule

At the end of every major implementation task, do not simply ask:

> "Is the code working?"

Also ask:

> "Is the repository documentation still truthful?"

The final state must satisfy:

```text
CODE
  +
CONFIGURATION
  +
README
  +
DETAILED DOCS
  =
SAME SYSTEM
```

Never knowingly allow the README to describe a system different from the code.

The README is a first-class deliverable and must be maintained throughout development.
