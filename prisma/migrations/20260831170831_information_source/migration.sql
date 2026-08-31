CREATE TABLE "informationScore" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "informationScorePkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "informationScoreKeyKey" ON "informationScore"("key");