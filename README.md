# ResumeCraft AI

ResumeCraft AI is a Next.js frontend with a separate NestJS API. The Next.js app contains no database-backed API handlers; it forwards the existing `/api/*` paths to NestJS. PostgreSQL is accessed through TypeORM, and the same API can run on Vercel Functions, a VPS, or a Node.js-enabled cPanel host.

## Project layout

- `src/` — Next.js pages, components, and server-side API client
- `apps/api/` — NestJS API, TypeORM entities/migrations, and MongoDB import utility
- `apps/api/src/database/migrations/` — versioned PostgreSQL schema

The UI and component design stay in Next.js. Existing browser calls such as `fetch("/api/auth/me")` continue to work through the Next.js external rewrite.

## Local development

1. Configure the API environment:

   ```powershell
   cd apps/api
   Copy-Item .env.example .env
   ```

   Set `DATABASE_URL` to a Neon PostgreSQL connection string, then set the required auth and admin values. Keep `.env` private and never commit it.

2. Install dependencies, apply migrations, and start NestJS:

   ```powershell
   npm install
   npm run migration:run
   npm run start:dev
   ```

   The API listens on `http://localhost:3001`; its health check is `/api/health`.

3. In a second terminal at the repository root, configure the frontend and start Next.js:

   ```powershell
   Copy-Item .env.example .env.local
   npm install
   npm run dev
   ```

   Local frontend configuration defaults to `NEST_API_URL=http://localhost:3001`. For local SSLCommerz sandbox testing, set gateway credentials in `apps/api/.env.local` (or `apps/api/.env`); never put API secrets in the frontend `.env.local`.

## Environment variables

### NestJS (`apps/api/.env`)

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Use Neon’s pooled URL for serverless runtime. |
| `MIGRATIONS_DATABASE_URL` | No | Optional direct PostgreSQL connection URL for running TypeORM migrations. Falls back to `DATABASE_URL`. |
| `DATABASE_SSL` | No | Set `true` when the selected PostgreSQL provider requires TLS. |
| `DATABASE_POOL_MAX` | No | PostgreSQL pool size; defaults to `5`. |
| `AUTH_SECRET` | Yes for authentication | At least 32 random characters; signs sessions and protects encrypted secrets. |
| `ADMIN_EMAIL` | Yes | Administrator login email. |
| `ADMIN_PASSWORD` | Yes | Administrator login password. |
| `ADMIN_SESSION_SECRET` | Fallback | At least 32 random characters if `AUTH_SECRET` is not set. |
| `RESEND_API_KEY` | For email | Resend API key for contact and password-reset mail. |
| `EMAIL_FROM` | For email | Sender address verified with Resend. |
| `FRONTEND_ORIGINS` | For direct cross-origin API calls | Comma-separated allowed origins; not needed when using the same-origin rewrite. |
| `FRONTEND_URL` | For payment callbacks | Public frontend origin used by SSLCommerz to return customers and send callbacks. Use HTTPS in production. |
| `SSLCOMMERZ_STORE_ID` | For plan checkout | SSLCommerz merchant store ID; keep server-side only. |
| `SSLCOMMERZ_STORE_PASSWORD` | For plan checkout | SSLCommerz API password; keep server-side only. |
| `SSLCOMMERZ_IS_LIVE` | No | `false` uses the SSLCommerz sandbox; set `true` only for production credentials. |
| `PORT` | No | API port; defaults to `3001`. |

Checkout amounts are read from the Premium and Platinum package prices in site content (the defaults are BDT 500 and BDT 1,000 per month). Use a package price such as `BDT 500`; no payment amount environment variables are used. Each verified payment grants one month of access; there is no automatic recurring charge. Apply the `AddPlanPayments1720000000000`, `UpdateLegacyPackagePrices1730000000000`, and `ConvertDollarPackagePricesToBdt1740000000000` migrations before enabling checkout. Successful returns and IPN callbacks are validated against SSLCommerz before the plan is activated.

`MONGODB_URI`, `MONGODB_DB`, and `ALLOW_MONGODB_IMPORT=true` are only needed for the one-time data import described below.

### Next.js frontend

Set `NEST_API_URL` to the NestJS origin, without `/api`, for each environment. For local development the default is `http://localhost:3001`; production requires HTTPS. This variable is server-side only and is not exposed to browser JavaScript.

## Database schema and MongoDB import

Production schema synchronization is disabled. Apply migrations explicitly before starting a new deployment:

```powershell
cd apps/api
npm run migration:run
```

To import existing MongoDB data, first back up the source database and apply the PostgreSQL migration. Then configure both `MONGODB_URI` and `DATABASE_URL` in the API environment and run:

```powershell
$env:ALLOW_MONGODB_IMPORT = "true"
npm run migration:import-mongodb
```

The import is idempotent for matching record IDs. It migrates users, resume requests, generated resume files, contact messages, site settings, two-factor settings, and active password-reset tokens. Existing MongoDB IDs are preserved so current signed user cookies continue to resolve, provided the same session/encryption secret is retained. Temporary rate-limit counters are intentionally not migrated. Verify row counts and sample downloads before switching production traffic.

Generated resume files are stored as PostgreSQL `bytea` to keep this first backend portable without requiring a separate object-storage account. This is straightforward for modest usage; if file volume grows, replace it with an S3-compatible object store behind the API.

## Docker Compose

The root `Dockerfile` builds the Next.js frontend as a standalone, non-root container. `apps/api/Dockerfile` builds the NestJS API as a non-root container. Compose publishes only the frontend port; the API is reachable to it over the private Compose network. PostgreSQL remains external, so configure the API to use Neon or another PostgreSQL service.

1. Copy `apps/api/.env.example` to `apps/api/.env` and set the database URL, authentication secrets, and required admin credentials. Do not commit this file.
2. Build both images and apply the database migrations:

   ```powershell
   docker compose build
   docker compose run --rm api npm run migration:run:prod
   ```

3. Start the stack:

   ```powershell
   docker compose up -d
   ```

The frontend is available at `http://localhost:3000` (override with `WEB_PORT`). Its API origin is compiled as `http://api:3001` for the private Compose network; `NEST_API_ALLOW_INTERNAL_HTTP` permits that exact service origin only. For non-Docker production deployments, use HTTPS and do not enable that flag. To stop the containers, run `docker compose down`.

## Deploying

### Vercel

Create two Vercel Projects from the same Git repository:

1. **Frontend:** Root Directory `.`; configure `NEST_API_URL` to the NestJS deployment origin.
2. **API:** Root Directory `apps/api`; configure the API variables above, including the Neon pooled `DATABASE_URL`.

Run TypeORM migrations once against the target database before routing frontend traffic to that API. The API exposes `/api/health`. Use separate Preview and Production environment variables. A Neon direct connection can be used for migration jobs when required by the database plan/provider.

Vercel Functions have platform-specific request and execution limits. The resume form accepts files up to 10 MB and a 16 MB multipart request; test these paths in a Vercel Preview deployment. If the deployment limit is lower, use signed direct-to-object-storage uploads or host the API on a service that supports the required request size.

### VPS or cPanel

The API is a standard Node.js application and can run without Vercel-specific packages:

```bash
cd apps/api
npm ci
npm run build
npm run migration:run:prod
npm run start:prod
```

Use Node.js 20 or newer, set the same API environment variables in the process manager or cPanel Node.js application settings, and place a reverse proxy such as Nginx in front of it. Keep PostgreSQL external (Neon or self-hosted) and use persistent storage/backups for the database. `apps/api/Dockerfile` is provided for container-based VPS deployments.

On cPanel, confirm that Node.js applications are enabled and Node 20+ is available. The hosting account must permit outbound HTTPS to Neon, Resend, and the configured n8n webhook.

## Application behavior

The API retains the current account and admin features: password login/reset, optional authenticator-app two-factor authentication, plans and request limits, resume requests, generated file downloads, site content editing, contact messages, Resend notifications, and n8n webhook delivery. Public browser API paths and response shapes are kept compatible with the existing UI.

## Checks

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

For the API:

```powershell
cd apps/api
npm run typecheck
npm run build
```
