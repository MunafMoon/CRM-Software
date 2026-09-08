# Start the CRM

The verified Docker instance is available at **http://localhost:5175** while it remains running. Standard development commands below use port **5173**. See [verification results](../VERIFICATION.md) and [deployment steps](../DEPLOYMENT.md).

Open **PowerShell** or the **VS Code terminal** and enter these commands.

## Start frontend and backend together

Run from **`D:\CRM`**:

```powershell
cd D:\CRM
docker compose up -d db
npm.cmd run dev
```

Keep this terminal open. Press **Ctrl+C** to stop both servers.

The backend checks its Prisma client before starting and regenerates it when missing or out of date, including after a fresh dependency installation. An unchanged client is reused to avoid Windows engine-file locks.

If an already-running backend shows **“@prisma/client did not initialize yet”**, stop it with **Ctrl+C**, then run:

```powershell
cd D:\CRM
npm.cmd run db:generate
npm.cmd run dev
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:4000/api
- **Backend health check:** http://localhost:4000/api/health

## Start in separate terminals

**Terminal 1 — backend**, run from **`D:\CRM\apps\api`**:

```powershell
cd D:\CRM\apps\api
npm.cmd run dev
```

**Terminal 2 — frontend**, run from **`D:\CRM\apps\web`**:

```powershell
cd D:\CRM\apps\web
npm.cmd run dev
```

PostgreSQL must already be running. Start it from `D:\CRM` with `docker compose up -d db` if needed.

## Login details

Open **`D:\CRM\.env`** locally. Use the values of:

- `SEED_ADMIN_EMAIL` for your email
- `SEED_ADMIN_PASSWORD` for your password

The administrator and demo prospects have been seeded in this workspace. Keep `.env` private.

## First setup on another computer

Install Node.js 22 and Docker Desktop, start Docker Desktop, and configure `.env` using `.env.example`. Then run from the project root:

```powershell
cd D:\CRM
npm.cmd ci
npm.cmd run db:generate
docker compose up -d db
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

## Run everything with Docker instead

From **`D:\CRM`**:

```powershell
cd D:\CRM
docker compose up --build
```

Open http://localhost:5173. In this mode the backend is accessed through `/api` on the frontend URL and is not exposed on port 4000. Use either Docker's frontend/backend or the development servers at a time, because they use the same frontend port.

See [the main README](../README.md) for environment setup, seeding a fresh Docker installation, migrations, and production configuration.
