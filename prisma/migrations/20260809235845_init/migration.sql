-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "manufacturer" TEXT,
    "productName" TEXT NOT NULL,
    "modelNumber" TEXT,
    "variant" TEXT,
    "storage" TEXT,
    "ram" TEXT,
    "colour" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'new',
    "region" TEXT NOT NULL DEFAULT 'ZA',
    "category" TEXT NOT NULL,
    "connectivity" TEXT,
    "simType" TEXT,
    "imageUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "lowestKnownPrice" DECIMAL(12,2),
    "highestKnownPrice" DECIMAL(12,2),
    "firstDiscoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "seller" TEXT NOT NULL,
    "sellerRating" DOUBLE PRECISION,
    "url" TEXT NOT NULL,
    "rawTitle" TEXT NOT NULL,
    "currentPrice" DECIMAL(12,2) NOT NULL,
    "previousPrice" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "shippingCost" DECIMAL(12,2),
    "condition" TEXT NOT NULL DEFAULT 'new',
    "warranty" TEXT,
    "availability" TEXT NOT NULL DEFAULT 'in_stock',
    "isMembershipOnly" BOOLEAN NOT NULL DEFAULT false,
    "isCouponRequired" BOOLEAN NOT NULL DEFAULT false,
    "isFinancingPrice" BOOLEAN NOT NULL DEFAULT false,
    "isBundle" BOOLEAN NOT NULL DEFAULT false,
    "reliabilityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceObservation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "marketPrice" DECIMAL(12,2) NOT NULL,
    "median" DECIMAL(12,2) NOT NULL,
    "trimmedMean" DECIMAL(12,2) NOT NULL,
    "stdDev" DECIMAL(12,2) NOT NULL,
    "sourceCount" INTEGER NOT NULL,
    "outliersRemoved" INTEGER NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL DEFAULT 'weighted-median-trimmed-mean',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "bestListingId" TEXT NOT NULL,
    "currentPrice" DECIMAL(12,2) NOT NULL,
    "marketPrice" DECIMAL(12,2) NOT NULL,
    "savingsAmount" DECIMAL(12,2) NOT NULL,
    "savingsPercent" DOUBLE PRECISION NOT NULL,
    "dealScore" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "disqualifiers" JSONB NOT NULL DEFAULT '[]',
    "sourcesUsed" INTEGER NOT NULL,
    "isNearAllTimeLow" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastNotifiedAt" TIMESTAMP(3),
    "lastNotifiedPrice" DECIMAL(12,2),

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "priceLimit" DECIMAL(12,2),
    "minDiscountPercent" DOUBLE PRECISION,
    "minDealScore" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "channels" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'demo',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "scanFrequencyMinutes" INTEGER NOT NULL DEFAULT 30,
    "reliabilityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "requiresApiKey" BOOLEAN NOT NULL DEFAULT false,
    "apiKeyConfigured" BOOLEAN NOT NULL DEFAULT false,
    "lastScanAt" TIMESTAMP(3),
    "nextScanAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'idle',
    "lastError" TEXT,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "productsChecked" INTEGER NOT NULL DEFAULT 0,
    "pricesDiscovered" INTEGER NOT NULL DEFAULT 0,
    "dealsDetected" INTEGER NOT NULL DEFAULT 0,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "ScanRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Product_canonicalKey_key" ON "Product"("canonicalKey");

-- CreateIndex
CREATE INDEX "Product_brand_idx" ON "Product"("brand");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_productName_idx" ON "Product"("productName");

-- CreateIndex
CREATE INDEX "Product_lastCheckedAt_idx" ON "Product"("lastCheckedAt");

-- CreateIndex
CREATE INDEX "Listing_productId_idx" ON "Listing"("productId");

-- CreateIndex
CREATE INDEX "Listing_source_idx" ON "Listing"("source");

-- CreateIndex
CREATE INDEX "Listing_currentPrice_idx" ON "Listing"("currentPrice");

-- CreateIndex
CREATE INDEX "Listing_lastCheckedAt_idx" ON "Listing"("lastCheckedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_productId_source_url_key" ON "Listing"("productId", "source", "url");

-- CreateIndex
CREATE INDEX "PriceObservation_listingId_observedAt_idx" ON "PriceObservation"("listingId", "observedAt");

-- CreateIndex
CREATE INDEX "MarketPrice_productId_computedAt_idx" ON "MarketPrice"("productId", "computedAt");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "Deal_tier_idx" ON "Deal"("tier");

-- CreateIndex
CREATE INDEX "Deal_category_idx" ON "Deal"("category");

-- CreateIndex
CREATE INDEX "Deal_dealScore_idx" ON "Deal"("dealScore");

-- CreateIndex
CREATE INDEX "Deal_createdAt_idx" ON "Deal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_productId_key" ON "Deal"("productId");

-- CreateIndex
CREATE INDEX "WatchlistItem_type_idx" ON "WatchlistItem"("type");

-- CreateIndex
CREATE INDEX "NotificationLog_channel_idx" ON "NotificationLog"("channel");

-- CreateIndex
CREATE INDEX "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "Source_key_key" ON "Source"("key");

-- CreateIndex
CREATE INDEX "Source_enabled_idx" ON "Source"("enabled");

-- CreateIndex
CREATE INDEX "ScanRun_sourceId_startedAt_idx" ON "ScanRun"("sourceId", "startedAt");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketPrice" ADD CONSTRAINT "MarketPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_bestListingId_fkey" FOREIGN KEY ("bestListingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanRun" ADD CONSTRAINT "ScanRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
