// This file is the Better Auth CLI entry point. DO NOT RENAME!
// Run: pnpm dlx @better-auth/cli@latest generate --config auth.schema.ts --yes
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './src/generated/prisma/client';
import { createAuth } from './src/common/auth/auth.instance';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

// Keep all Better Auth behavior in auth.instance.ts so the CLI and runtime
// always load the same plugins, providers, fields, and security options.
export default createAuth(prisma);
