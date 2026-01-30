-- CreateEnum
CREATE TYPE "NotificationScheduleType" AS ENUM ('DAY_BEFORE', 'MORNING_OF', 'MINUTES_BEFORE', 'SPECIFIC_TIME');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SentNotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "EventNotification" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "scheduleType" "NotificationScheduleType" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "relativeMinutes" INTEGER,
    "messageTemplate" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "EventNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentNotification" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "messageBody" TEXT NOT NULL,
    "twilioMessageSid" TEXT,
    "twilioStatus" TEXT,
    "status" "SentNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundSms" (
    "id" TEXT NOT NULL,
    "fromPhone" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "twilioMessageSid" TEXT NOT NULL,
    "autoReplySent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundSms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventNotification_scheduledFor_status_idx" ON "EventNotification"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "EventNotification_eventId_idx" ON "EventNotification"("eventId");

-- CreateIndex
CREATE INDEX "SentNotification_twilioMessageSid_idx" ON "SentNotification"("twilioMessageSid");

-- CreateIndex
CREATE INDEX "SentNotification_notificationId_idx" ON "SentNotification"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "InboundSms_twilioMessageSid_key" ON "InboundSms"("twilioMessageSid");

-- CreateIndex
CREATE INDEX "InboundSms_fromPhone_idx" ON "InboundSms"("fromPhone");

-- AddForeignKey
ALTER TABLE "EventNotification" ADD CONSTRAINT "EventNotification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventNotification" ADD CONSTRAINT "EventNotification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentNotification" ADD CONSTRAINT "SentNotification_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "EventNotification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
