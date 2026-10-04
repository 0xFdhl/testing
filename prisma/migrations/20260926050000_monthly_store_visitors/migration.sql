CREATE TABLE "StoreVisitorMonth" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreVisitorMonth_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreVisitorMonth_visitorId_month_key"
ON "StoreVisitorMonth"("visitorId", "month");

CREATE INDEX "StoreVisitorMonth_month_idx" ON "StoreVisitorMonth"("month");
