# NestJS + Better Auth + Prisma scaffold for Expo

A backend starter for Expo and React Native applications, built with NestJS,
Better Auth, Prisma, and PostgreSQL.

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

## Environment variables

Never commit `.env` or real credentials. Keep only empty or clearly fake values
in `.env.example`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters |
| `BETTER_AUTH_BASE_URL` | Public base URL of this API |
| `APP_NAME` | Application name used by Better Auth |
| `PORT` | Optional HTTP port; defaults to `3000` |
| `RESEND_API_KEY` | Required by the included email callbacks |
| `GOOGLE_CLIENT_ID` | Required if Google sign-in is enabled |
| `GOOGLE_CLIENT_SECRET` | Required if Google sign-in is enabled |

Add variables for optional plugins only when those plugins are enabled. Validate
all required variables at startup and do not use fallback secrets in deployed
environments.

## Configure Better Auth

The runtime configuration is in
`src/common/auth/auth.instance.ts`. The separate `auth.schema.ts` file exists so
the Better Auth CLI can generate the matching Prisma models.

Keep both files aligned whenever you add or remove:

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

## Project layout

```text
src/
  common/
    auth/                  # Better Auth runtime configuration
    prisma/                # Prisma service and NestJS module
  config/                  # Environment validation
  modules/                 # Business-capability modules
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
