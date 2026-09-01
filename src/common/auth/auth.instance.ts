import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '../../generated/prisma/client';
import { Resend } from 'resend';
import { expo } from '@better-auth/expo';
import { dash, sentinel } from '@better-auth/infra';
import { magicLink, username } from 'better-auth/plugins';

export const createAuth = (prisma: PrismaClient) =>
  betterAuth({
    plugins: [
      expo(),
      sentinel(),
      username(),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: 'no-reply@ingredia.fit',
            to: email,
            template: {
              id: 'ingredia-sign-in',
              variables: { MAGIC_LINK: url }
            }
          });
        },
      }),
      dash({ apiKey: process.env.BETTER_AUTH_API_KEY }),
    ],

    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    appName: process.env.APP_NAME ?? 'Your app name',
    secret: process.env.BETTER_AUTH_SECRET ?? 'secret',
    baseURL: process.env.BETTER_AUTH_BASE_URL || 'http://localhost:3000',
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      apple: { clientId: process.env.APPLE_CLIENT_ID as string },
      google: {
        prompt: 'select_account',
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
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
      'ingredia://',
      'ingredia-prod://',
      'ingredia-staging://',
      'ingredia://*',
      ...(process.env.NODE_ENV === 'development'
        ? [
            'exp://', // Trust any host of the exp:// scheme
            'exp://**', // Trust all Expo URLs (wildcard matching)
            'exp://192.168.*.*:*/**', // Trust 192.168.x.x IP range with any port and path
            'http://localhost:3000',
            'http://localhost:8081',
            'http://localhost:3001',
          ]
        : []),
    ],
  });
