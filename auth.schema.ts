// This file allows only better-auth schema generation. DO NOT RENAME!
// run npx @better-auth/cli@latest generate --config auth.schema
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from './src/generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { expo } from '@better-auth/expo';
import { organization, username } from 'better-auth/plugins';
import { dash, sentinel } from '@better-auth/infra';
import { Resend } from 'resend';
import { authUserAdditionalFields } from './src/common/auth/auth-user-additional-fields';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

export default betterAuth({
  plugins: [expo(), organization(), sentinel(), username(), dash({ apiKey: process.env.BETTER_AUTH_API_KEY })],
  
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  appName: process.env.APP_NAME ?? 'Your app name',
  secret: process.env.BETTER_AUTH_SECRET ?? 'secret',
  baseURL: process.env.BETTER_AUTH_BASE_URL || 'http://localhost:3000',
  basePath: '/api/auth',
  user: {
    additionalFields: authUserAdditionalFields,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  socialProviders: {
    // apple: { clientId: process.env.APPLE_CLIENT_ID as string },
    google: { 
      clientId: process.env.GOOGLE_CLIENT_ID as string, 
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, 
    },
  },
  emailVerification: {
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }, request) => (
      void new Resend(process.env.RESEND_API_KEY).emails.send({
        to: user.email,
        subject: 'Verify your email',
        template: {
          id: 'email-verification',
          variables: {
            'EXPIRY_MINUTES': 60,
            'VERIFY_URL': url
          }
        }
      })
    )
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    //   Auto Rotation if user is active
    updateAge: 60 * 40 * 24,
    //   Anti violation session
    freshAge: 60 * 60 * 2,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
  trustedOrigins: [
    'yourappdomain://',
    'exp://',
    'exp://**',
    'exp://192.168.*.*:*/**',
    // 'http://localhost:3000',
    // 'http://localhost:8081',
    // 'http://localhost:3001',
  ],
});
