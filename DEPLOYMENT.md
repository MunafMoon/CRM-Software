# Deployment: GitHub + Vercel

The prepared configuration uses GitHub for source control and CI, Vercel for the frontend/API, and an external PostgreSQL database. Nothing has been published or provisioned remotely.

## What is prepared

- `vercel.json` defines Vite and Express services with one public origin. `/api/*` goes to Express; other requests go to the frontend. This uses **Vercel Services, currently beta**, based on [Vercel's Services documentation](https://vercel.com/docs/services) and [service routing](https://vercel.com/docs/services/routing). Confirm availability in the selected Vercel account before deployment.
- The Express app has a default export for Vercel. Local and Docker startup still use the listener in `src/server.ts`.
- `.github/workflows/ci.yml` creates an isolated PostgreSQL database, applies migrations, seeds test records, runs builds, lint, the security audit, API and browser tests, and builds Docker images. It does not deploy or use production data. Its test-only credentials are deliberately public and must never be reused in production.
- Local environment files, backup archives, test results, and dependency caches are excluded from Git/Vercel uploads. On Vercel and when `NODE_ENV=production`, runtime and migration tools use injected environment variables instead of local `.env` files.

## Inputs still needed before publishing

1. The GitHub repository and its owner (prefer a private repository for this agency app).
2. The Vercel account/team and project name.
3. A managed PostgreSQL provider, region, connection URLs, and backup plan. Put credentials directly in the hosting provider's secret/environment settings.
4. The final HTTPS URL. A Vercel project URL can be used before adding a custom domain.

GitHub Pages is static hosting and cannot run this application's Express API or PostgreSQL database. See [GitHub Pages](https://pages.github.com/).

## Vercel setup

Import the GitHub repository using its **repository root**, allowing Vercel to read the two-service configuration. Use Node.js 22. Do not set the project root to only `apps/web` when using the checked-in Services configuration.

Configure these environment values for the API deployment:

| Variable              | Value                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`            | `production`                                                                                                     |
| `DATABASE_URL`        | The provider's pooled PostgreSQL URL, with TLS and a connection limit appropriate for the plan                   |
| `DIRECT_DATABASE_URL` | Optional direct connection URL used by Prisma migration commands, if the provider requires a non-pooled endpoint |
| `JWT_SECRET`          | A new random secret of at least 32 characters; do not reuse the local demo secret                                |
| `WEB_ORIGIN`          | The exact public HTTPS origin, with no trailing slash                                                            |

All browser requests stay under the same origin, including refresh cookies. Do not add a database URL or JWT secret to any `VITE_*` variable. Secure cookies are enabled in production.

Use separate Preview and Production databases. Preview deployments must not migrate or seed production data. The strict `WEB_ORIGIN` check intentionally rejects unconfigured preview origins; configure the exact URL for each environment rather than accepting arbitrary host headers.

Before the first production release, run the migration and administrator seed from a trusted shell with the production environment injected (and `NODE_ENV=production`):

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed -w apps/api -- --admin-only
```

The administrator seed additionally needs `SEED_ADMIN_EMAIL` and a new `SEED_ADMIN_PASSWORD` of at least 12 characters. Keep them out of command history and source control. The seed preserves an existing user's password. Do not run the demo seed against production.

Migrations are intentionally **not** part of a Vercel build or a request handler. Run them once per release, after taking a backup, and use backward-compatible migrations so a rollback of the application remains possible.

After deployment, verify `/api/health`, login, refresh after reload, a prospect creation/deletion, and a follow-up. Enable HTTPS on the chosen domain. Configure Vercel Firewall rate limits for login and the API: the application's in-memory rate limiter is per running process, not a shared serverless-wide limit.

The deployment configuration has been prepared from the provider documentation. Cloud build, TLS/domain validation, production secrets, managed backups, and a real hosted smoke test remain dependent on the selected accounts and database.

## Database backups and restore checks

For the local Docker database, from `D:\CRM`:

```powershell
npm.cmd run db:backup
npm.cmd run db:restore-check -- .backups\THE_CREATED_FILE.dump
```

The backup command streams PostgreSQL's custom archive directly to a timestamped file under `.backups`, preserving binary content on Windows. It does not print credentials. An unsuccessful command must not be treated as a valid backup.

The restore-check command creates a randomly named temporary database, restores the archive, queries the core tables, and removes only that temporary database. It never overwrites the live CRM database.

To verify migrations against an empty database with the Docker API running, use `node scripts/database-migration-check.mjs`. It applies migrations twice to a temporary database and removes that database afterward.

For production, enable automated daily backups and point-in-time recovery in the selected managed database service, choose retention to suit the business, and verify restoration into a separate database before onboarding real clients. Keep an encrypted offsite copy if required. A local backup file or Docker volume alone is not a production backup plan. Scheduling and provider configuration remain pending until a database provider is selected.

## Local Docker verification

To verify Docker without taking port 5173 from a running development server:

```powershell
$env:WEB_PORT = '5175'
$env:WEB_ORIGIN = 'http://localhost:5175'
docker compose up --build -d --wait
$env:E2E_BASE_URL = 'http://localhost:5175'
npm.cmd run test:browser
```

These port overrides affect only that shell. Open http://localhost:5175. The existing PostgreSQL volume is retained. To return to the default Docker port, clear those shell overrides and run `docker compose up -d --wait` after stopping any development server on 5173.
