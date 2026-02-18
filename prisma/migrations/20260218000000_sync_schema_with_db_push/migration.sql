-- AlterTable: Add inviteCode to User
ALTER TABLE "User" ADD COLUMN "inviteCode" TEXT;

-- CreateIndex: Unique constraint on User.inviteCode
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- CreateEnum: GroupType
CREATE TYPE "GroupType" AS ENUM ('STANDARD', 'MY_PEOPLE');

-- AlterTable: Add type and inviteCode to Group
ALTER TABLE "Group" ADD COLUMN "type" "GroupType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "inviteCode" TEXT;

-- CreateIndex: Unique constraint on Group.inviteCode
CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");

-- AlterTable: Add recipientName to SentNotification
ALTER TABLE "SentNotification" ADD COLUMN "recipientName" TEXT;

-- AlterEnum: Update NotificationScheduleType
-- Create new enum with correct values
CREATE TYPE "NotificationScheduleType_new" AS ENUM ('NONE', 'DAY_BEFORE', 'HOURS_BEFORE');

-- Migrate existing data (map removed values to NONE)
ALTER TABLE "EventNotification" ALTER COLUMN "scheduleType" TYPE "NotificationScheduleType_new"
  USING (
    CASE "scheduleType"::text
      WHEN 'DAY_BEFORE' THEN 'DAY_BEFORE'::"NotificationScheduleType_new"
      WHEN 'MORNING_OF' THEN 'NONE'::"NotificationScheduleType_new"
      WHEN 'MINUTES_BEFORE' THEN 'HOURS_BEFORE'::"NotificationScheduleType_new"
      WHEN 'SPECIFIC_TIME' THEN 'NONE'::"NotificationScheduleType_new"
      ELSE 'NONE'::"NotificationScheduleType_new"
    END
  );

-- Drop old enum and rename new one
DROP TYPE "NotificationScheduleType";
ALTER TYPE "NotificationScheduleType_new" RENAME TO "NotificationScheduleType";

-- AlterTable: Add unique constraint on EventNotification.eventId
-- Drop existing non-unique index first
DROP INDEX "EventNotification_eventId_idx";

-- Create unique constraint
CREATE UNIQUE INDEX "EventNotification_eventId_key" ON "EventNotification"("eventId");
