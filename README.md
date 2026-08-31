# NestJS + Better Auth + Prisma scaffold for Expo

A backend for scanning food labels and evaluating their indexed E-number
additives, built with NestJS, Better Auth, Prisma, and PostgreSQL.

This repository provides the server-side wiring for authentication, database
access, mobile deep links, and a modular NestJS application. It is a scaffold,
not a production-ready authentication product: choose the providers you need,
replace every placeholder, and review the security settings before deploying.

## Included

- NestJS 11 with TypeScript
- Better Auth mounted at `/api/auth/*`
- Email and password authentication
- Email verification and password-reset hooks using Resend
- Google OAuth configuration as an example
- Better Auth's Expo server and client integration points
- Prisma 7 with PostgreSQL and the `pg` driver adapter
- Request rate limiting and trusted-origin examples
- Swagger UI at `/api`
- A starter health endpoint at `/`
- A source-aware food-additive catalog populated from
  `aditivos-alimentarios.com` and `e-aditivos.com`
- Ingredient/OCR text analysis at `POST /additives/analyze-ingredients`
- Jest, ESLint, and Prettier

Optional Better Auth plugins are shown in the auth configuration but should only
be enabled when their schema and environment variables are also configured.

## Requirements

- Node.js
- pnpm
- PostgreSQL
- An Expo or React Native client application
- Resend and Google OAuth credentials if you keep those integrations enabled

## Getting started

Install the dependencies and create a local environment file:

```bash
pnpm install
cp .env.example .env
```

Generate a strong Better Auth secret and add it to `.env`:

```bash
openssl rand -base64 32
```

The scaffold keeps Better Auth's schema-generation configuration in
`auth.schema.ts`. On a new clone, generate the Prisma client, generate the
Better Auth models, regenerate the client, and create the initial migration:

```bash
pnpm exec prisma generate
pnpm dlx @better-auth/cli@latest generate --config auth.schema.ts --yes
pnpm exec prisma generate
pnpm exec prisma migrate dev --name init
```

Start the API:

```bash
pnpm start:dev
```

The server listens on `http://localhost:3000` by default.

## Docker

The Compose stack contains three services:

- `postgres`: PostgreSQL 17 with a persistent named volume;
- `migrate`: a one-shot container that runs `prisma migrate deploy`;
- `app`: the production NestJS image, started only after migrations succeed.

Build and start the complete stack:

```bash
docker compose up --build -d
docker compose ps
```

Follow the API logs:

```bash
docker compose logs -f app
```

Stop the containers while preserving PostgreSQL data:

```bash
docker compose down
```

For local development, Compose provides defaults for the database credentials.
Set a strong `BETTER_AUTH_SECRET` and override `POSTGRES_PASSWORD` in `.env`
before using the stack outside a local machine. The committed defaults are not
production credentials.

To run only PostgreSQL from this repository:

```bash
docker compose up -d postgres
```

The matching host connection string is:

```text
postgresql://postgres:postgres@localhost:5432/api?schema=public
```

Alternatively, run PostgreSQL without Compose:

```bash
docker run --name aditivos-postgres \
  -e POSTGRES_DB=api \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v aditivos_postgres_data:/var/lib/postgresql/data \
  -d postgres:17-alpine
```

## Environment variables

Never commit `.env` or real credentials. Keep only empty or clearly fake values
in `.env.example`.

| Variable               | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string             |
| `BETTER_AUTH_SECRET`   | Random secret of at least 32 characters  |
| `BETTER_AUTH_BASE_URL` | Public base URL of this API              |
| `APP_NAME`             | Application name used by Better Auth     |
| `PORT`                 | Optional HTTP port; defaults to `3000`   |
| `RESEND_API_KEY`       | Required by the included email callbacks |
| `GOOGLE_CLIENT_ID`     | Required if Google sign-in is enabled    |
| `GOOGLE_CLIENT_SECRET` | Required if Google sign-in is enabled    |
| `BILLING_SEED_USER_ID` | Optional user for a sandbox Plus seed    |

Add variables for optional plugins only when those plugins are enabled. Validate
all required variables at startup and do not use fallback secrets in deployed
environments.

## Configure Better Auth

The single Better Auth configuration is in
`src/common/auth/auth.instance.ts`. The separate `auth.schema.ts` file is a thin
CLI entry point that creates a Prisma client and calls the same `createAuth`
factory used by NestJS.

Update only `src/common/auth/auth.instance.ts` whenever you add or remove:

- plugins;
- authentication providers;
- custom user fields; or
- model and field mappings.

After a Better Auth schema change, regenerate the Prisma schema and create a
reviewable migration:

```bash
pnpm dlx @better-auth/cli@latest generate --config auth.schema.ts --yes
pnpm exec prisma generate
pnpm exec prisma migrate dev --name describe_the_change
```

Do not hand-edit SQL that changes Better Auth-owned tables. Generate the schema,
review it, and let Prisma create the migration.

## Connect an Expo client

Install the Better Auth Expo client and secure storage in the Expo project:

```bash
pnpm add better-auth @better-auth/expo expo-secure-store expo-network
```

Create the client with the same URL and deep-link scheme trusted by the server:

```ts
import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: 'http://192.168.1.100:3000',
  plugins: [
    expoClient({
      scheme: 'yourapp',
      storagePrefix: 'yourapp',
      storage: SecureStore,
    }),
  ],
});
```

Use a LAN address or a reachable HTTPS URL on a physical device; `localhost`
points to the device itself. Define the same scheme in the Expo app configuration
and in Better Auth's `trustedOrigins`. Keep broad `exp://` wildcard origins for
local development only.

For requests to protected NestJS endpoints, forward the Better Auth cookie:

```ts
const cookie = await authClient.getCookie();

const response = await fetch(`${API_URL}/example`, {
  headers: {
    Cookie: cookie,
  },
});
```

See the official [Better Auth Expo integration guide](https://better-auth.com/docs/integrations/expo)
for social sign-in, deep linking, and platform-specific setup.

## Additive catalog

Apply the database migration and generate the Prisma client:

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

Index both configured websites:

```bash
pnpm index:additives
```

To retry only one source, pass its key:

```bash
pnpm index:additives aditivos-alimentarios.com
pnpm index:additives e-aditivos.com
```

The importer discovers every E-number link from each site's catalog instead of
keeping a hard-coded list. It stores the source-specific evidence separately,
then updates a consolidated record with these fields:

- description;
- food-industry uses;
- health impact, plus low/high-dose effects when supplied by the source;
- toxicity (`LOW`, `MEDIUM`, `HIGH`, or `VERY_HIGH`);
- pregnancy suitability (`SUITABLE`, `NOT_SUITABLE`, or `UNKNOWN`) and its
  rationale.

Automatically imported content is marked `REVIEW_REQUIRED`. Pregnancy data is
never assumed safe when absent. Review source permissions and editorially
rewrite/verify imported text before public redistribution; both sites identify
their content as protected. Re-running the importer is idempotent and records
an ingestion run with per-source failures for review.

Analyze text produced by a camera/OCR pipeline or copied from a label:

```http
POST /additives/analyze-ingredients
Content-Type: application/json

{
  "ingredients": "Agua, azúcar, conservador E-202, colorante tartrazina",
  "isPregnant": true
}
```

The response reports matched additives, unmatched E-numbers, overall assessment
(`TOXIC`, `CAUTION`, `NOT_TOXIC`, or `UNKNOWN`), and a separate pregnancy
assessment. `NOT_TOXIC` only means that every matched additive is currently
classified as low toxicity; it is not a medical or regulatory safety claim.

## Provider-neutral billing

The first billing phase exposes these endpoints:

- `GET /billing/plans` lists public plans and is anonymous;
- `GET /billing/eligibility` returns the authenticated user's allowed purchase,
  restore, and management actions for a client platform/distribution channel;
- `GET /billing/subscription` returns the authenticated user's current provider
  state and verified access period;
- `GET /me/entitlements` projects provider-independent capabilities.

The initial policy is fail-closed: Stripe is offered only to `WEB` builds using
`WEB_DIRECT`, Apple only to `IOS`/`APP_STORE`, and Google Play only to
`ANDROID`/`GOOGLE_PLAY`. Until pricing is approved, the seeded Plus plan has no
price and reports `purchasable: false`.

Seed plans after applying migrations:

```bash
pnpm db:seed
```

Set `BILLING_SEED_USER_ID` to an existing Better Auth user ID when a renewable
sandbox Plus subscription is also needed for local testing.

## Project layout

```text
src/
  common/
    auth/                  # Better Auth runtime configuration
    prisma/                # Prisma service and NestJS module
  config/                  # Environment validation
  modules/
    additives/             # Catalog, source adapters, indexing, label analysis
    billing/               # Plans, subscriptions, policy, and entitlements
    health/
  main.ts                  # Application bootstrap and Swagger
prisma/
  migrations/              # Reviewed database migrations
  schema.prisma            # Prisma schema
auth.schema.ts             # Better Auth CLI schema configuration
```

## Commands

```bash
pnpm start:dev     # Run the API in watch mode
pnpm build         # Build the application
pnpm test          # Run unit tests
pnpm test:e2e      # Run end-to-end tests
pnpm index:additives # Refresh the additive catalog from both sources
pnpm lint          # Run ESLint
pnpm format        # Format source and test files
```

## Security notes

- Never commit `.env`, database dumps, service-account files, tokens, or private
  keys.
- Replace the example app name, deep-link schemes, cookie prefix, OAuth settings,
  email templates, and trusted origins.
- Use HTTPS and secure cookies in production.
- Allow only the exact production web origins and mobile schemes you control.
- Keep OAuth client secrets and email-provider credentials on the server.
- Review generated migrations before applying them.
- Add authorization and resource-ownership checks for your business endpoints;
  authentication alone is not authorization.

## License

No open-source license is included yet. Add the license you want to use before
publishing this scaffold for reuse.
