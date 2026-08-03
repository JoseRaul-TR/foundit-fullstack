-- CreateTable
CREATE TABLE "streaming_service" (
    "id" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "countryCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoPath" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streaming_service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "streaming_service_countryCode_providerId_key" ON "streaming_service"("countryCode", "providerId");
