# Ingredia API

The NestJS backend for Ingredia, an ingredient-scanning application that detects
food additives, presents source-backed catalog information, and provides
provider-neutral subscription entitlements to mobile clients.

> [!IMPORTANT]
> Ingredia provides informational results, not medical advice or a regulatory
> safety determination. Imported and AI-assisted content remains
> `REVIEW_REQUIRED` until it has been editorially and, where appropriate,
> clinically reviewed.

## Features

- Better Auth sessions with magic-link, Apple, Google, username, Expo, Sentinel,
  and Dash integrations
- PostgreSQL persistence through Prisma 7
- Food-additive catalog with source-specific evidence and provenance
- Ingredient text analysis and Google Cloud Vision OCR for label images
- Saved analyses, comparisons, preferences, and account-deletion requests
- Provider-neutral billing for Stripe, App Store, and Google Play
- Cursor-paginated mobile API contracts shared through `@ingredia/contracts`
- OpenAPI/Swagger documentation at `/api`
- Docker Compose services for PostgreSQL, migrations, and the API

## Technology

- Node.js, TypeScript, and NestJS 11
- Better Auth
- Prisma 7 and PostgreSQL 17
- Zod-backed shared API contracts
- pnpm workspaces

## Requirements

- Node.js
- pnpm
- PostgreSQL, either installed locally or run with Docker
- Provider credentials for any optional integrations you enable

## Quick start

Install dependencies and create your local configuration:

```bash
pnpm install
cp .env.example .env
openssl rand -base64 32
```

Paste the generated value into `BETTER_AUTH_SECRET`, then configure at least
`DATABASE_URL`, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_VISION_API_KEY`.

Generate the Prisma client, apply the committed migrations, and seed the billing
plans:

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm db:seed
```

Start the development server:

```bash
pnpm start:dev
```

The API listens on `http://localhost:3000` by default. Swagger UI is available at
`http://localhost:3000/api`.

## Environment configuration

Copy `.env.example` to `.env`. Never commit `.env`, provider credentials,
database dumps, service-account files, or private keys.

### Core and database

| Variable            | Required    | Description                                                                  |
| ------------------- | ----------- | ---------------------------------------------------------------------------- |
| `NODE_ENV`          | Yes         | Runtime mode: `development`, `test`, or `production`                         |
| `PORT`              | No          | API port; defaults to `3000`                                                 |
| `APP_NAME`          | No          | Application name shown by Better Auth                                        |
| `DATABASE_URL`      | Yes         | PostgreSQL connection string                                                 |
| `POSTGRES_DB`       | Docker only | Compose database name                                                        |
| `POSTGRES_USER`     | Docker only | Compose database user                                                        |
| `POSTGRES_PASSWORD` | Docker only | Compose database password; replace the development default outside local use |
| `POSTGRES_PORT`     | Docker only | Host port exposed by PostgreSQL                                              |
| `APP_PORT`          | Docker only | Host port exposed by the API                                                 |

### Authentication and email

| Variable               | Required             | Description                                   |
| ---------------------- | -------------------- | --------------------------------------------- |
| `BETTER_AUTH_SECRET`   | Yes                  | High-entropy secret of at least 32 characters |
| `BETTER_AUTH_BASE_URL` | Yes                  | Public API URL, without a trailing slash      |
| `BETTER_AUTH_API_KEY`  | When Dash is enabled | Better Auth Dash API key                      |
| `RESEND_API_KEY`       | For magic links      | Resend server API key                         |
| `GOOGLE_CLIENT_ID`     | For Google sign-in   | Google OAuth client ID                        |
| `GOOGLE_CLIENT_SECRET` | For Google sign-in   | Google OAuth client secret                    |
| `APPLE_CLIENT_ID`      | For Apple sign-in    | Apple service/client ID                       |

### OCR and additive research

| Variable                       | Required       | Description                                             |
| ------------------------------ | -------------- | ------------------------------------------------------- |
| `GOOGLE_CLOUD_PROJECT`         | For scans      | Google Cloud project identifier                         |
| `GOOGLE_CLOUD_VISION_ENDPOINT` | No             | Vision endpoint; defaults to `eu-vision.googleapis.com` |
| `GOOGLE_CLOUD_VISION_API_KEY`  | For scans      | Server-side Vision key restricted to the Vision API     |
| `PPQ_API_KEY`                  | For enrichment | PPQ.ai API key                                          |
| `PPQ_BASE_URL`                 | No             | PPQ API base URL                                        |
| `PPQ_MODEL`                    | No             | Research model used by the enrichment command           |
| `PPQ_TIMEOUT_MS`               | No             | Per-request enrichment timeout in milliseconds          |

### Billing

| Variable                              | Required            | Description                                              |
| ------------------------------------- | ------------------- | -------------------------------------------------------- |
| `BILLING_RETURN_URL_ORIGINS`          | For Stripe          | Comma-separated allowlist of checkout return URL origins |
| `BILLING_SEED_USER_ID`                | No                  | Existing Better Auth user ID for local sandbox seeding   |
| `STRIPE_SECRET_KEY`                   | For Stripe          | Stripe server secret key                                 |
| `STRIPE_WEBHOOK_SECRET`               | For Stripe webhooks | Stripe endpoint signing secret                           |
| `STRIPE_PLUS_MONTHLY_PRICE_ID`        | For Stripe          | Stripe Price ID seeded for the Plus plan                 |
| `APPLE_PLUS_MONTHLY_PRODUCT_ID`       | For App Store       | App Store product ID seeded for the Plus plan            |
| `GOOGLE_PLAY_PLUS_MONTHLY_PRODUCT_ID` | For Google Play     | Play product ID seeded for the Plus plan                 |
| `APPLE_VERIFIER_URL`                  | For App Store       | Trusted StoreKit verification service URL                |
| `APPLE_VERIFIER_API_KEY`              | For App Store       | Verification service credential                          |
| `GOOGLE_PLAY_VERIFIER_URL`            | For Google Play     | Trusted Play Billing verification service URL            |
| `GOOGLE_PLAY_VERIFIER_API_KEY`        | For Google Play     | Verification service credential                          |

Features that depend on empty integration credentials are unavailable; billing
provider adapters fail closed when their required secrets are missing.
Production deployments should provide secrets through the hosting platform's
secret manager rather than a committed file.

## Docker

The Compose stack includes PostgreSQL, a one-shot migration service, and the
production API image:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f app
```

To run only PostgreSQL for local development:

```bash
docker compose up -d postgres
```

Stop the stack while preserving the named database volume:

```bash
docker compose down
```

The defaults in `.env.example` are local-development values. Set a unique
database password, a strong `BETTER_AUTH_SECRET`, HTTPS URLs, and production
provider credentials before exposing the stack publicly.

## Authentication

Better Auth is mounted at `/api/auth/*`. The canonical runtime configuration is
`src/common/auth/auth.instance.ts`; `auth.schema.ts` loads that same factory for
Better Auth's schema generator.

When changing Better Auth plugins, providers, fields, or models, regenerate and
review the Prisma schema before creating a migration:

```bash
pnpm dlx @better-auth/cli@latest generate --config auth.schema.ts --yes
pnpm exec prisma generate
pnpm exec prisma migrate dev --name describe_the_change
```

Do not hand-edit migrations that mutate Better Auth-owned tables.

### Expo client

Configure the client with a reachable API URL and one of the deep-link schemes
trusted in `src/common/auth/auth.instance.ts`:

```ts
import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: 'http://192.168.1.100:3000',
  plugins: [
    expoClient({
      scheme: 'ingredia',
      storagePrefix: 'ingredia',
      storage: SecureStore,
    }),
  ],
});
```

On a physical device, use a reachable LAN address or HTTPS URL; `localhost`
refers to the device. Development-only `exp://` wildcards must not be enabled in
production.

## API overview

Catalog routes are anonymous. Scans, analyses, comparisons, preferences,
entitlements, and billing routes require a Better Auth session. Webhook routes
are anonymous at the HTTP layer and authenticate the provider payload.

```text
GET    /                              Health response
POST   /additives/analyze-ingredients Legacy ingredient-text analysis
GET    /api/v1/additives
GET    /api/v1/additives/:code
POST   /api/v1/scans
GET    /api/v1/scans/:scanId
GET    /api/v1/analyses
GET    /api/v1/analyses/:analysisId
PATCH  /api/v1/analyses/:analysisId/saved
DELETE /api/v1/analyses/:analysisId
POST   /api/v1/comparisons
GET    /api/v1/me/preferences
PATCH  /api/v1/me/preferences
GET    /api/v1/me/entitlements
POST   /api/v1/me/account-deletion
GET    /api/v1/billing/eligibility
GET    /api/v1/billing/plans
GET    /api/v1/billing/subscription
POST   /api/v1/billing/stripe/subscriptions
POST   /api/v1/billing/app-store/transactions/verify
POST   /api/v1/billing/google-play/purchases/verify
POST   /api/v1/billing/restore
POST   /api/v1/webhooks/stripe
POST   /api/v1/webhooks/app-store
POST   /api/v1/webhooks/google-play
```

`POST /api/v1/scans` accepts an `image` multipart field up to 8 MB and an
optional `productName`. JPEG, PNG, WebP, HEIC, and HEIF are supported. Images are
processed transiently for OCR and are not stored in PostgreSQL.

Billing eligibility uses the `X-Ingredia-Platform`,
`X-Ingredia-Distribution`, `X-Ingredia-Storefront`, and
`X-Ingredia-App-Build` headers. App Store and Google Play verification and
restoration also require a UUID `Idempotency-Key`.

## Additive catalog jobs

Import the configured additive websites:

```bash
pnpm index:additives
pnpm index:additives aditivos-alimentarios.com
pnpm index:additives e-aditivos.com
```

The importer stores source-specific evidence and provenance separately from the
consolidated additive record. Re-running it is idempotent.

Enrich incomplete records with source-linked web research:

```bash
pnpm enrich:additives --limit=25 --concurrency=2
pnpm enrich:additives --code=E202
pnpm enrich:additives --code=E202 --refresh
```

`--refresh` may replace generated values, but researched content remains
`REVIEW_REQUIRED`. Missing or ambiguous pregnancy evidence is always represented
as `UNKNOWN`, never inferred as suitable.

Before redistributing imported material, review each source's terms and content
permissions. Editorially rewrite and verify third-party prose before publishing
it to end users.

## Project structure

```text
packages/contracts/             Shared request and response contracts
prisma/                         Schema, migrations, and seed data
src/common/                     Authentication, HTTP errors, and Prisma wiring
src/modules/additives/          Catalog, importers, research, and text analysis
src/modules/analyses/           OCR scans, analyses, and comparisons
src/modules/billing/            Plans, subscriptions, providers, and entitlements
src/modules/preferences/        User preferences and account deletion
src/modules/health/             Health endpoint
```

The application is a modular monolith. Feature modules keep presentation,
application, domain, and infrastructure concerns separated where the feature's
complexity warrants it.

## Development commands

| Command                 | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `pnpm start:dev`        | Run the API in watch mode                         |
| `pnpm build`            | Build shared contracts and the NestJS application |
| `pnpm test`             | Run unit tests                                    |
| `pnpm test:e2e`         | Run end-to-end tests                              |
| `pnpm lint`             | Run ESLint with fixes                             |
| `pnpm format`           | Format source and test files                      |
| `pnpm db:seed`          | Seed billing plans and optional sandbox data      |
| `pnpm index:additives`  | Refresh the additive catalog                      |
| `pnpm enrich:additives` | Research incomplete additive records              |

## Security

- Never commit `.env` or real credentials. Generate a unique
  `BETTER_AUTH_SECRET` for every deployed environment.
- Use HTTPS and secure cookies in production.
- Restrict CORS and Better Auth trusted origins to domains and application
  schemes you control.
- Restrict cloud API keys by API, environment, and network or application where
  the provider supports it.
- Keep broad Expo origins and local database credentials limited to development.
- Verify provider webhook signatures against the raw request body.
- Report vulnerabilities privately through GitHub's private vulnerability
  reporting instead of opening a public issue.

## Contributing

Issues and pull requests are welcome once the repository's contribution and
licensing policy is published. Keep changes scoped to a business capability,
preserve module boundaries, and include the relevant validation and checks.

## License

No open-source license has been selected yet. Until a `LICENSE` file is added,
copyright law reserves reuse and redistribution rights to the copyright holder.
Choose a license before announcing the repository as open source.
