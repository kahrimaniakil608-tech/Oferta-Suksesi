# Oferta Suksesi

A modern classifieds platform built with a Turborepo monorepo.

## Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS v4, TypeScript
- **API**: NestJS, Prisma, PostgreSQL
- **Search**: Meilisearch
- **Cache**: Redis
- **Image Processing**: Sharp (NestJS service)
- **Emails**: NestJS + Nodemailer

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Desktop

## Setup

### 1. Install dependencies

```bash
pnpm install --frozen-lockfile
```

### 2. Configure environment

```bash
cp .env.example .env
```

Use fresh random values for both JWT secrets. Keep `DB_PASSWORD` and the password in `DATABASE_URL` consistent. Local services read this root environment file. Leave Turnstile keys empty only in explicit development/test mode. Configure SMTP before expecting email delivery.

### 3. Start infrastructure (Docker)

```bash
docker compose up -d postgres redis meilisearch
```

### 4. Apply the schema and seed the initial catalog

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
```

The seed creates cities, categories, ad zones and badges. It creates an administrator only when `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (at least 12 characters) are supplied; it never creates a default password or overwrites an existing account. Store bootstrap values in your local environment and remove them after use. Do not run the seed as an upgrade against customized production data.

### 5. Start all apps in dev mode

```bash
pnpm dev
```

Open `http://localhost:3000`. New listings may enter moderation. Configure an administrator before testing approval. The API owns durable work for search, expiry and file cleanup; the notification service polls PostgreSQL for email work. Redis is required for upload permissions and guest quotas.

## Checks and deployment

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Integration tests use disposable containers and synthetic data. They never connect to the database from `.env`:

```bash
docker pull postgres:16-alpine
docker pull redis:7-alpine
docker pull getmeili/meilisearch:v1.7
pnpm test:http
pnpm test:redis
pnpm exec playwright install chromium
pnpm test:browser
pnpm test:ui-ux
```

`test:http` includes the database migration/concurrency suite and starts the built API/image service; run `pnpm build` first. `test:database` runs the database suite alone. Browser tests use a local synthetic API and Playwright's pinned Chromium on every platform; `CHROMIUM_PATH` optionally selects another browser executable. Their public API/image URLs must match the local defaults in `.env.example` at build time. GitHub Actions runs these checks with explicit test URLs.

See [the audit and fix tracker](docs/AUDIT-FINDINGS-2026-10-19.md) and [the deployment runbook](docs/DEPLOYMENT.md) for migration, proxy, worker and rollout requirements.

See [the public, member and admin UI/UX audit](docs/UI-UX-AUDIT-2026-10-20.md) for the 20 October review, prioritized findings, screenshots and acceptance checks.

## Apps

| App                  | Port | Description         |
| -------------------- | ---- | ------------------- |
| web                  | 3000 | Next.js frontend    |
| api                  | 3001 | NestJS REST API     |
| image-service        | 4001 | Image processing    |
| notification-service | 3003 | Email notifications |

## Infrastructure (Docker)

| Service     | Port |
| ----------- | ---- |
| PostgreSQL  | 5432 |
| Redis       | 6379 |
| Meilisearch | 7700 |

UI/UX audit implementation: [20 October resolution register and verification](docs/UI-UX-FIXES-2026-10-20.md).

Latest design review: [21 October visitor, member and admin audit and implemented fixes](docs/DESIGN-AUDIT-2026-10-21.md). Run `pnpm test:design` after building for its interaction and responsive regressions; `DESIGN_SWEEP=1 pnpm test:design` covers the full route inventory.
