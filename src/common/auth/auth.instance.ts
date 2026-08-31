import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { dash, sentinel } from '@better-auth/infra';
import { organization, username } from 'better-auth/plugins';
import { Resend } from 'resend';
import { expo } from '@better-auth/expo';
import { authUserAdditionalFields } from './auth-user-additional-fields';

export const createAuth = (prisma: PrismaService) =>
  betterAuth({
    plugins: [
      // expo(),
      // organization(),
      // sentinel(),
      // username(),
      // dash({ apiKey: process.env.BETTER_AUTH_API_KEY }),
    ],

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
      resetPasswordTokenExpiresIn: 3600,
      sendResetPassword: ({ user, url }) => {
        void new Resend(process.env.RESEND_API_KEY).emails.send({
          to: user.email,
          subject: 'Reset your password',
          template: {
            id: 'password-reset',
            variables: {
              EXPIRY_MINUTES: 60,
              RESET_URL: url,
            },
          },
        });
        return Promise.resolve();
      },
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    socialProviders: {
      // apple: { clientId: process.env.APPLE_CLIENT_ID as string },
      google: {
        prompt: 'select_account',
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendOnSignIn: true,
      expiresIn: 3600,
      sendVerificationEmail: ({ user, url }) => {
        void new Resend(process.env.RESEND_API_KEY).emails.send({
          to: user.email,
          subject: 'Verify your email',
          template: {
            id: 'email-verification',
            variables: {
              EXPIRY_MINUTES: 60,
              VERIFY_URL: url,
            },
          },
        });
        return Promise.resolve();
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      //   Auto Rotation if user is active
      updateAge: 60 * 40 * 24,
      //   Anti violation session
      freshAge: 60 * 60 * 2,
    },
    advanced: {
      cookiePrefix: 'noveller',
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
    },
    trustedOrigins: [
      'app://',
      'app-prod://',
      'app-staging://',
      'app://*',
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
