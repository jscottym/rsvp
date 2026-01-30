-- AlterTable
ALTER TABLE "User" ADD COLUMN     "smsConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsConsentDate" TIMESTAMP(3);
