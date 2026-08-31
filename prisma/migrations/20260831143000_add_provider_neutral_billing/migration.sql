CREATE TYPE "billingPeriod" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "billingProvider" AS ENUM ('STRIPE', 'APPLE', 'GOOGLE_PLAY');
CREATE TYPE "billingEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');
CREATE TYPE "billingSubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

CREATE TABLE "billingPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingPeriod" "billingPeriod" NOT NULL,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "capabilities" TEXT[],
    "monthlyScanLimit" INTEGER,
    "amountMinor" INTEGER,
    "currency" CHAR(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isPurchasable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "billing_plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billingSubscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "provider" "billingProvider" NOT NULL,
    "environment" "billingEnvironment" NOT NULL,
    "externalPurchaseId" TEXT NOT NULL,
    "status" "billingSubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "billing_subscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "billing_plan_is_public_idx" ON "billingPlan"("isPublic");
CREATE UNIQUE INDEX "billing_subscription_provider_environment_external_purchase_key"
    ON "billingSubscription"("provider", "environment", "externalPurchaseId");
CREATE INDEX "billing_subscription_user_id_updated_at_idx"
    ON "billingSubscription"("userId", "updatedAt");
CREATE INDEX "billing_subscription_status_current_period_end_idx"
    ON "billingSubscription"("status", "currentPeriodEnd");

ALTER TABLE "billingSubscription"
    ADD CONSTRAINT "billing_subscription_plan_id_fkey"
    FOREIGN KEY ("planId") REFERENCES "billingPlan"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billingSubscription"
    ADD CONSTRAINT "billing_subscription_user_id_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;