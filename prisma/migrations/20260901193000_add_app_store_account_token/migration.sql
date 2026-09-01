-- AlterEnum
ALTER TYPE "billingSubscriptionStatus" ADD VALUE 'PENDING';

-- CreateTable
CREATE TABLE "appStoreAccountToken" (
    "userId" TEXT NOT NULL,
    "token" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appStoreAccountToken_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "appStoreAccountToken_token_key" ON "appStoreAccountToken"("token");

-- AddForeignKey
ALTER TABLE "appStoreAccountToken" ADD CONSTRAINT "appStoreAccountToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
