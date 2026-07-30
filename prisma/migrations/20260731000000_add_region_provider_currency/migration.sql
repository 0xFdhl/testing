-- CreateEnum
CREATE TYPE "Region" AS ENUM ('id', 'intrl');
CREATE TYPE "Currency" AS ENUM ('IDR', 'USD');
CREATE TYPE "PaymentProvider" AS ENUM ('xendit', 'stripe');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "region" "Region" NOT NULL DEFAULT 'id';

ALTER TABLE "Order" ADD COLUMN "gatewayInvoiceId" TEXT;
ALTER TABLE "Order" ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'xendit';
ALTER TABLE "Order" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'IDR';

-- CreateIndex
CREATE INDEX "Order_provider_idx" ON "Order"("provider");
