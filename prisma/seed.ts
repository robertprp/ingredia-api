import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';

try {
  process.loadEnvFile();
} catch (error: unknown) {
  if (!(
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )) {
    throw error;
  }
}

const connectionString = process.env['DATABASE_URL'];
if (!connectionString)
  throw new Error('DATABASE_URL is required to seed billing.');

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function seed(): Promise<void> {
  await prisma.billingPlan.upsert({
    where: { id: 'free' },
    update: {
      name: 'Free',
      monthlyScanLimit: 5,
      capabilities: [],
    },
    create: {
      id: 'free',
      name: 'Free',
      billingPeriod: 'MONTHLY',
      trialDays: 0,
      monthlyScanLimit: 5,
      capabilities: [],
      isPublic: false,
      isPurchasable: false,
      updatedAt: new Date(),
    },
  });

  await prisma.billingPlan.upsert({
    where: { id: 'INGREDIA_PLUS_MONTHLY' },
    update: {
      name: 'Plus',
      capabilities: [
        'UNLIMITED_SCANS',
        'PRODUCT_COMPARISON',
        'COMPLETE_HISTORY',
        'PERSONALIZED_PREGNANCY_MODE',
      ],
    },
    create: {
      id: 'INGREDIA_PLUS_MONTHLY',
      name: 'Plus',
      billingPeriod: 'MONTHLY',
      trialDays: 0,
      capabilities: [
        'UNLIMITED_SCANS',
        'PRODUCT_COMPARISON',
        'COMPLETE_HISTORY',
        'PERSONALIZED_PREGNANCY_MODE',
      ],
      monthlyScanLimit: null,
      amountMinor: null,
      currency: null,
      isPublic: true,
      isPurchasable: false,
      updatedAt: new Date(),
    },
  });

  const references = [
    {
      provider: 'STRIPE' as const,
      productId: process.env.STRIPE_PLUS_MONTHLY_PRICE_ID,
    },
    {
      provider: 'APPLE' as const,
      productId: process.env.APPLE_PLUS_MONTHLY_PRODUCT_ID,
    },
    {
      provider: 'GOOGLE_PLAY' as const,
      productId: process.env.GOOGLE_PLAY_PLUS_MONTHLY_PRODUCT_ID,
    },
  ].filter(
    (
      reference,
    ): reference is {
      provider: 'STRIPE' | 'APPLE' | 'GOOGLE_PLAY';
      productId: string;
    } => Boolean(reference.productId),
  );
  for (const reference of references) {
    await prisma.billingProductReference.upsert({
      where: {
        planId_provider_environment: {
          planId: 'INGREDIA_PLUS_MONTHLY',
          provider: reference.provider,
          environment:
            process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX',
        },
      },
      update: { productId: reference.productId },
      create: {
        planId: 'INGREDIA_PLUS_MONTHLY',
        provider: reference.provider,
        environment:
          process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX',
        productId: reference.productId,
      },
    });
  }
  await prisma.billingPlan.update({
    where: { id: 'INGREDIA_PLUS_MONTHLY' },
    data: { isPurchasable: references.length > 0 },
  });

  const userId = process.env['BILLING_SEED_USER_ID'];
  if (!userId) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    throw new Error('BILLING_SEED_USER_ID must reference an existing user.');
  }

  const now = new Date();
  const currentPeriodEnd = new Date(now);
  currentPeriodEnd.setUTCMonth(currentPeriodEnd.getUTCMonth() + 1);

  await prisma.billingSubscription.upsert({
    where: {
      provider_environment_externalPurchaseId: {
        provider: 'STRIPE',
        environment: 'SANDBOX',
        externalPurchaseId: `seed:${userId}`,
      },
    },
    update: {
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd,
      revokedAt: null,
      canceledAt: null,
      cancelAtPeriodEnd: false,
    },
    create: {
      userId,
      planId: 'INGREDIA_PLUS_MONTHLY',
      provider: 'STRIPE',
      environment: 'SANDBOX',
      externalPurchaseId: `seed:${userId}`,
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd,
      updatedAt: new Date(),
    },
  });
}

seed()
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
