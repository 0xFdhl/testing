-- AlterTable
ALTER TABLE "NotificationSubscription" ADD COLUMN     "adminId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "NotificationSubscription_adminId_idx" ON "NotificationSubscription"("adminId");