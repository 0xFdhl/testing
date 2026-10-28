ALTER TABLE "Order" ADD COLUMN "paymentAmount" INTEGER,
ADD COLUMN "paymentLive" BOOLEAN,
ADD COLUMN "checkoutKey" TEXT;
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");
-- Do not infer currency or environment for historical payments.
-- Legacy orders require explicit reconciliation against provider records.
CREATE TABLE "AuthThrottle" (
  "key" TEXT PRIMARY KEY,
  "attempts" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AuthThrottle_resetAt_idx" ON "AuthThrottle"("resetAt");
