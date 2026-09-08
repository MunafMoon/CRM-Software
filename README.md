# Folio CRM

For GitHub/Vercel hosting, production environment setup, and backup/restore instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

A React / TypeScript agency CRM for prospecting, follow-ups, proposals, and client acquisition. The interface uses INR and Asia/Kolkata time. Records persist in PostgreSQL; there is no local-storage demo database.

## Prerequisites

- Node.js 22 LTS and npm 10 or newer
- Docker Desktop with its Linux engine running (or PostgreSQL 16)
- Ports 5173 (web), 4000 (development API), and 55432 (local database)

## Local setup

1. Copy `.env.example` to `.env` in the repository root.
2. Set `JWT_SECRET` to a random value of at least 32 characters, and set a strong `SEED_ADMIN_PASSWORD` of at least 12 characters. A random value can be generated with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
3. Change `POSTGRES_PASSWORD` and the corresponding password in `DATABASE_URL`. URL-encode special characters in the connection URL. The example password is only a local development example.
4. Run:

```sh
npm ci
npm run db:generate
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:5173**. Sign in with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from your local `.env`. The seed creates Alex Morgan as the initial administrator and 20 fictional Vadodara prospects, plus notes, follow-ups, meetings, outreach, deals, and clients. Demo contact domains are reserved `.example` addresses. Do not contact demo phone numbers.

Seeding is repeatable: existing prospects and the existing administrator password are preserved. For an empty workspace with just an administrator, replace the seed command with:

```sh
npm run db:seed -w apps/api -- --admin-only
```

The root `.env` is ignored by Git and excluded from Docker images. In local development it intentionally overrides inherited environment variables, preventing an unrelated machine-level `DATABASE_URL` from being used. Containers use their injected environment and contain no `.env` file.

## Docker

After configuring `.env`:

```sh
docker compose up --build -d
docker compose exec -e SEED_ADMIN_EMAIL=admin@folio.local -e SEED_ADMIN_PASSWORD=YOUR_CHOSEN_PASSWORD api npm run db:seed
```

The password above must be replaced with your own. To avoid placing it in shell history, supply the seed variables via a local shell environment and use `docker compose exec -e SEED_ADMIN_EMAIL -e SEED_ADMIN_PASSWORD api npm run db:seed`.

Open **http://localhost:5173**. Subsequent starts use `docker compose up`. The API applies committed migrations at startup. PostgreSQL data persists in the `postgres_data` named volume. `docker compose down` stops the application while retaining records. Never remove the volume unless you intend to delete the database.

For production, set `NODE_ENV=production`, set `WEB_ORIGIN` to the exact HTTPS web origin, configure TLS at a reverse proxy, choose strong database/JWT secrets, and establish automated PostgreSQL backups. Secure refresh cookies require HTTPS in production. The default Compose configuration binds the database and web ports to localhost for local use. Adapt the web binding to your deployment network deliberately. Do not run the demo seed in a real production workspace; use `--admin-only`.

## PostgreSQL without Docker

Create a database and a dedicated database user, grant that user ownership of the database, and put their connection URL in `.env`. Run `npm run db:generate`, `npm run db:migrate`, and the appropriate seed command. The checked-in migration creates the normalized schema, foreign keys, unique constraints, enums, and indexes.

## Commands

| Command               | Purpose                                                      |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | API with watch mode plus Vite frontend                       |
| `npm run build`       | Type-check and compile backend and frontend                  |
| `npm run lint`        | ESLint across source files                                   |
| `npm run format`      | Format source and documentation                              |
| `npm run db:generate` | Generate Prisma client                                       |
| `npm run db:migrate`  | Apply checked-in migrations                                  |
| `npm run db:seed`     | Create administrator and fictional demo records              |
| `npm test`            | API integration tests against configured local database      |
| `npx playwright test` | Browser workflow tests; requires running development servers |

Integration tests create randomly named test records and remove only those records afterward. Run against a development database with a seeded administrator, never production. Tests read credentials from `.env` without printing them. For browser testing, install Chromium once with `npx playwright install chromium`.

For a new schema change, run `npx prisma migrate dev --name descriptive_name` from `apps/api`, then commit its migration. Do not regenerate the initial migration after deployment. Production deployment uses `prisma migrate deploy`, never `db push`.

## Workflows

- **Prospects:** create, search, filter, paginate, edit, view related records, and delete (admin only). Filters include stage, priority, category, city, source, assignee, created date range, and follow-up date.
- **Pipeline:** all 11 stages, table view, drag-and-drop board, and an accessible stage selector on every card. The board loads up to 500 matching prospects; use filters for larger datasets.
- **Daily workspace:** today, overdue, upcoming follow-ups; new/interested prospects; meetings; proposals; editable daily targets. Targets count recorded outreach to unique prospects, completed follow-ups, and meetings created today.
- **Follow-ups:** schedule, complete, reschedule, or mark missed. Calendar dates are stored separately from IST clock times. Overdue means a pending follow-up with a date before today.
- **Meetings:** schedule, edit, join an external meeting link, and update outcome.
- **Deals:** track service, value, expected close, and stage. Winning a deal automatically creates or updates one client per prospect with the sum of won deal values and unique services. Repeating the update does not duplicate revenue. Won deals cannot be reopened; this preserves booked revenue. A direct **Mark won** prospect action creates a Custom won deal at the estimated prospect value if there is no won deal already.
- **Clients:** maintain active/inactive/completed status and monthly retainer. Project value is derived from won deals. Client-linked prospects cannot be deleted.
- **Notes & activities:** multiple notes and transactional activity history for important changes.
- **Outreach:** manually record sent messages/calls, responses, positive replies, and generated meetings. Call, email, and WhatsApp shortcuts open external applications; opening a link does not falsely record a sent message. No external messaging provider is integrated.
- **CSV:** download the template, upload up to 1,000 rows / 2 MB, validate, review valid/invalid/duplicate counts, then commit valid rows. Duplicate checks use normalized email, phone, website, or business name + city + country. Database uniqueness also protects against concurrent duplicate imports. Invalid or duplicate rows are skipped; a failed import can be retried safely.
- **Analytics:** acquisition funnel, stage/source/category breakdowns, outreach counts, conversion rates, six months of booked revenue, and best source/category. Metric definitions appear on the page. Revenue is booked deal value, not payments collected. Monthly retainers are stored separately and are not automatically recognized as revenue.
- **Settings:** profile, daily targets, and administrator-created team accounts. ADMIN, SALES, and MARKETING share one agency workspace. Only ADMIN may create users or delete prospects. This is not a multi-tenant SaaS service; roles do not isolate records by assignee.

## Architecture

```text
apps/api/
  prisma/              Schema, migrations, seed
  src/controllers/     HTTP request/response handling
  src/services/        CRM transactions, authentication, reporting
  src/routes/          Endpoint registration
  src/middleware/      Authentication, authorization, errors
  tests/               Database-backed API integration coverage
apps/web/src/
  api/                 Fetch client and refresh-token retry
  auth/                Current-user context and protected session
  components/          Table, dialog, badges, inputs, states, KPI cards
  features/            Prospect and related-record forms, CSV import
  hooks/               TanStack Query reads and mutations
  layouts/             Sidebar, top bar, page header
  pages/               Dashboard, today, prospects, records, analytics
  types/               Shared frontend constants and formatting
```

The API uses Express, Prisma, Zod, bcrypt, Helmet, explicit CORS, rate limiting, centralized errors, short-lived signed JWT access tokens, and hashed rotating refresh tokens. Access tokens stay in memory; refresh tokens use HttpOnly, SameSite=Strict cookies (Secure in production). Logout revokes the refresh session; existing access tokens expire within 15 minutes. The API validates origin on cookie-authenticated endpoints. Password hashes and refresh tokens are never returned in user endpoints.

## REST API

All routes except login, refresh, logout, and health require `Authorization: Bearer <accessToken>`.

| Endpoint                                                                         | Methods                 |
| -------------------------------------------------------------------------------- | ----------------------- |
| `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`                       | POST                    |
| `/api/auth/me`, `/api/health`                                                    | GET                     |
| `/api/prospects`                                                                 | GET, POST               |
| `/api/prospects/:id`                                                             | GET, PUT, DELETE        |
| `/api/prospects/:id/notes`                                                       | POST                    |
| `/api/prospects/import`                                                          | POST (`rows`, `commit`) |
| `/api/followups`, `/api/meetings`, `/api/deals`, `/api/outreach`                 | GET, POST               |
| `/api/followups/:id`, `/api/meetings/:id`, `/api/deals/:id`, `/api/outreach/:id` | PATCH                   |
| `/api/clients`, `/api/users`                                                     | GET                     |
| `/api/clients/:id`, `/api/settings`                                              | PATCH                   |
| `/api/users`                                                                     | POST (ADMIN)            |
| `/api/dashboard`, `/api/analytics`                                               | GET                     |

Prospect lists are paginated. Supporting record lists return at most 1,000 records and display that limit when reached. Reporting currently aggregates the shared workspace in the API process; introduce SQL aggregate reporting and cursor pagination before operating at very large scale. No email delivery, password-reset delivery, calendar synchronization, billing, or background notification service is included. The notification bell links to currently due follow-ups.
