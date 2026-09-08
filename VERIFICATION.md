# Verification results — 8 September 2026

| Check | Result |
| --- | --- |
| Frontend TypeScript + Vite production build | Passed |
| Backend TypeScript build | Passed |
| ESLint | Passed |
| npm dependency audit | 0 reported vulnerabilities |
| Database-backed API tests | 12 passed |
| Docker API and frontend image builds | Passed |
| Docker startup and service health | Passed on localhost:5175 |
| Browser workflow tests against Docker | 5 passed, 28.6 seconds |
| PostgreSQL backup creation | Passed |
| Restore into an isolated temporary database | Passed |
| Migration into an empty temporary database | Passed |
| Repeat migration deployment | Passed; no pending migrations |

Browser coverage includes sign-in, session reload, logout, prospect CRUD, notes, follow-up completion, pipeline stage updates, every workspace page, mobile navigation, CSV preview/duplicate prevention/import, proposal-to-client conversion, retainer persistence, and administrator-created sales-user login/permissions.

Fixes made during verification:

- Startup checks the generated Prisma client and regenerates only when required, avoiding unnecessary Windows engine-file replacement.
- Form fields explicitly associate their visible labels with controls and validation errors.
- Kanban card navigation waits while a stage change is being saved.
- Web image builds and health checks reject an empty HTML entry file. An interrupted/cached empty build was replaced with a clean build before the final browser run.
- Docker waits for API/database readiness before starting dependent services.

The backup archive is stored locally under `.backups/` and excluded from source/deployment uploads. Restore and migration checks removed only their temporary databases, preserving the live CRM database.

## Remaining external work

GitHub CI and Vercel configuration are prepared but have not run on a hosted account. No repository was pushed and no cloud deployment or database was provisioned. A GitHub repository, Vercel project, managed PostgreSQL database, production secrets, final HTTPS origin, and provider backup settings are still required. See [DEPLOYMENT.md](DEPLOYMENT.md).

Vercel configuration uses its current Services beta. Hosted build, domain/TLS, production firewall rules, and cloud smoke tests must be verified once the destination is configured. Local passing tests do not substitute for those deployment checks.
