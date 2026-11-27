# ReachInbox Load Benchmarks

This document records reproducible load-test scripts and measured benchmark results for the ReachInbox scheduler, rate limiter, and concurrent worker pipeline.

## Benchmark Runner

- **Script**: [`apps/api/src/scripts/benchmark.ts`](../apps/api/src/scripts/benchmark.ts)
- **Root Command**: `npm run benchmark`
- **API Command**: `npm run benchmark --workspace=@reachinbox/api`

### Supported Options

| Flag | Default | Description |
| :--- | :--- | :--- |
| `--mode` | `auto` | `auto` detects MySQL (`3306`) and Redis (`6379`) and selects `live` when both are reachable or `simulated` otherwise; `live` forces real MySQL + Redis + BullMQ; `simulated` runs in-process with atomic in-memory Redis/MySQL mocks. |
| `--jobs` | `1000` | Number of `EmailJob` records and queue jobs generated. |
| `--workers` | `3` | Number of concurrent worker instances. |
| `--concurrency` | `5` | Concurrency per worker (`WORKER_CONCURRENCY`, default `5`). |
| `--hourly-limit` | `1000` | Per-sender hourly limit enforced via `RateLimiterService`. |
| `--delay-ms` | `0` | Inter-email `scheduledAt` stagger in milliseconds. |
| `--smtp-latency-ms` | `2` | Simulated SMTP transport latency in milliseconds (Ethereal SMTP is mocked per [`TESTING_STRATEGY.md`](./TESTING_STRATEGY.md#L342-L345)). |
| `--duplicate-checks` | `50` | Extra duplicate queue deliveries injected (in `simulated` mode) to verify idempotency and distributed locking. |
| `--json` | `false` | Emit machine-readable JSON output. |

### Running Against Live Docker Infrastructure

```bash
docker compose up -d
npm run db:migrate
npm run build:shared
node apps/api/dist/scripts/benchmark.js --mode=live --jobs=1000 --workers=3 --concurrency=5 --hourly-limit=100
```

---

## Recorded Results (Simulated Mode — No Live Docker/MySQL/Redis)

> **Scope Note**: The runs below were executed on `win32 x64` (`Node v26.12.1`, `8` CPUs) using `--mode=simulated` because Docker, MySQL (`3306`), and Redis (`6379`) were not running in this environment. They exercise the real `RateLimiterService` and `SchedulerService` code paths against an atomic in-memory Redis/Prisma harness and mocked SMTP transport (`smtpLatencyMs=2`, Windows timer granularity ~15 ms). Live MySQL/Redis network and disk I/O overhead is **not** included in these numbers.

### Run 1: Full 1,000-Job Throughput (`hourlyLimit=1000`)

```bash
node apps/api/dist/scripts/benchmark.js --mode=simulated --jobs=1000 --workers=3 --concurrency=5 --hourly-limit=1000 --smtp-latency-ms=2 --duplicate-checks=50
```

- **Workload**: `1,000` jobs | `3` workers × `5` concurrency (`15` parallel slots)
- **Ingestion (`$transaction` + `SchedulerService.scheduleCampaign`)**: `10.75 ms` (`93,033.64 jobs/s`)
- **Worker Processing**: `973.87 ms` (`1,026.83 jobs/s`)
- **Total Elapsed**: `984.62 ms`
- **Per-Job Latency**: `p50 = 15.55 ms`, `p95 = 16.31 ms`, `p99 = 18.77 ms`, `max = 19.13 ms`
- **Outcomes**: `sent = 1,000`, `rateLimited = 0`, `failed = 0`, `dupPrevented = 50`, `lockSkipped = 0`
- **Memory**: `rss = 100.18 MB`, `heapUsed = 32.88 MB`, `heapTotal = 47.93 MB`

### Run 2: Rate-Limit Spillover (`hourlyLimit=100`)

```bash
node apps/api/dist/scripts/benchmark.js --mode=simulated --jobs=1000 --workers=3 --concurrency=5 --hourly-limit=100 --smtp-latency-ms=2 --duplicate-checks=50
```

- **Workload**: `1,000` jobs | `3` workers × `5` concurrency (`15` parallel slots)
- **Ingestion**: `15.46 ms` (`64,680.96 jobs/s`)
- **Worker Processing**: `82.07 ms` (`12,184.30 jobs/s`)
- **Total Elapsed**: `97.53 ms`
- **Per-Job Latency**: `p50 = 0.01 ms`, `p95 = 9.78 ms`, `p99 = 25.98 ms`, `max = 26.57 ms`
- **Outcomes**: `sent = 100`, `rateLimited = 900` (rescheduled to next hour window), `failed = 0`, `dupPrevented = 50`, `lockSkipped = 0`
- **Memory**: `rss = 98.06 MB`, `heapUsed = 31.21 MB`, `heapTotal = 46.68 MB`
