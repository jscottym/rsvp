import twilio from 'twilio';
import prisma from './db';
import type { EventNotification, SentNotification } from '@prisma/client';

const MESSAGE_FOOTER = '\n---\nThis is an automated message. Do not reply.';
const AUTO_REPLY_MESSAGE =
  'Do not respond to this text. Contact the event organizer directly.';

let twilioClient: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    const config = useRuntimeConfig();
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }
    twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken);
  }
  return twilioClient;
}

export function getTwilioPhoneNumber(): string {
  const config = useRuntimeConfig();
  if (!config.twilioPhoneNumber) {
    throw new Error('Twilio phone number not configured');
  }
  return config.twilioPhoneNumber;
}

/**
 * Verify Twilio webhook signature
 */
export function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const config = useRuntimeConfig();
  if (!config.twilioAuthToken) return false;

  return twilio.validateRequest(
    config.twilioAuthToken,
    signature,
    url,
    params
  );
}

/**
 * Send a single SMS message
 */
export async function sendSms(
  to: string,
  body: string,
  statusCallbackUrl?: string
): Promise<{ sid: string; status: string } | null> {
  try {
    const client = getTwilioClient();
    const fromNumber = getTwilioPhoneNumber();

    const messageOptions: {
      to: string;
      from: string;
      body: string;
      statusCallback?: string;
    } = {
      to,
      from: fromNumber,
      body: body + MESSAGE_FOOTER,
    };

    if (statusCallbackUrl) {
      messageOptions.statusCallback = statusCallbackUrl;
    }

    const message = await client.messages.create(messageOptions);

    return {
      sid: message.sid,
      status: message.status,
    };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return null;
  }
}

/**
 * Send auto-reply for inbound SMS
 */
export async function sendAutoReply(to: string): Promise<void> {
  try {
    const client = getTwilioClient();
    const fromNumber = getTwilioPhoneNumber();

    await client.messages.create({
      to,
      from: fromNumber,
      body: AUTO_REPLY_MESSAGE,
    });
  } catch (error) {
    console.error('Failed to send auto-reply:', error);
  }
}

interface RecipientInfo {
  phone: string;
  userId?: string | null;
  name: string;
}

/**
 * Build notification message for an event
 */
export function buildNotificationMessage(
  event: {
    title: string;
    location: string;
    datetime: Date;
    endDatetime: Date;
  },
  customMessage?: string | null
): string {
  if (customMessage) {
    return customMessage;
  }

  const date = event.datetime;
  const dayStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `Reminder: ${event.title} is ${dayStr} at ${timeStr}. See you at ${event.location}!`;
}

/**
 * Process a notification and send to all recipients
 */
export async function processNotification(
  notification: EventNotification & {
    event: {
      id: string;
      title: string;
      location: string;
      datetime: Date;
      endDatetime: Date;
      slug: string;
      rsvps: Array<{
        id: string;
        status: string;
        userId: string | null;
        user: { id: string; phone: string; name: string } | null;
        guestPhone: string | null;
        guestName: string | null;
      }>;
    };
  },
  statusCallbackUrl?: string
): Promise<{
  sent: number;
  failed: number;
  sentNotifications: SentNotification[];
}> {
  // Get confirmed players (IN status only)
  const confirmedRsvps = notification.event.rsvps.filter(
    (r) => r.status === 'IN'
  );

  const recipients: RecipientInfo[] = confirmedRsvps
    .map((r) => {
      if (r.user) {
        return {
          phone: r.user.phone,
          userId: r.user.id,
          name: r.user.name,
        };
      } else if (r.guestPhone) {
        return {
          phone: r.guestPhone,
          userId: null,
          name: r.guestName || 'Guest',
        };
      }
      return null;
    })
    .filter((r): r is RecipientInfo => r !== null);

  if (recipients.length === 0) {
    // Mark as completed with no recipients
    await prisma.eventNotification.update({
      where: { id: notification.id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });
    return { sent: 0, failed: 0, sentNotifications: [] };
  }

  const message = buildNotificationMessage(
    notification.event,
    notification.messageTemplate
  );

  let sent = 0;
  let failed = 0;
  const sentNotifications: SentNotification[] = [];

  for (const recipient of recipients) {
    // Create sent notification record first
    const sentNotification = await prisma.sentNotification.create({
      data: {
        notificationId: notification.id,
        phoneNumber: recipient.phone,
        recipientUserId: recipient.userId,
        recipientName: recipient.name,
        messageBody: message,
        status: 'PENDING',
      },
    });

    // Send the SMS
    const result = await sendSms(recipient.phone, message, statusCallbackUrl);

    if (result) {
      // Update with Twilio info
      const updated = await prisma.sentNotification.update({
        where: { id: sentNotification.id },
        data: {
          twilioMessageSid: result.sid,
          twilioStatus: result.status,
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      sentNotifications.push(updated);
      sent++;
    } else {
      // Mark as failed
      const updated = await prisma.sentNotification.update({
        where: { id: sentNotification.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Failed to send via Twilio',
        },
      });
      sentNotifications.push(updated);
      failed++;
    }
  }

  // Update notification status
  const finalStatus =
    failed === 0
      ? 'COMPLETED'
      : sent === 0
        ? 'FAILED'
        : 'PARTIALLY_FAILED';

  await prisma.eventNotification.update({
    where: { id: notification.id },
    data: {
      status: finalStatus,
      processedAt: new Date(),
    },
  });

  return { sent, failed, sentNotifications };
}

/**
 * Get pending notifications that are due to be sent
 */
export async function getPendingNotifications() {
  const now = new Date();

  return prisma.eventNotification.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: {
        lte: now,
      },
    },
    include: {
      event: {
        include: {
          rsvps: {
            where: {
              status: 'IN',
            },
            include: {
              user: {
                select: {
                  id: true,
                  phone: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Calculate scheduled time based on schedule type and event datetime
 */
export function calculateScheduledTime(
  eventDatetime: Date,
  scheduleType: 'NONE' | 'DAY_BEFORE' | 'HOURS_BEFORE',
  relativeMinutes?: number | null
): Date {
  switch (scheduleType) {
    case 'NONE': {
      // Return far future date (should never be used for actual scheduling)
      return new Date('2099-12-31T23:59:59Z');
    }
    case 'DAY_BEFORE': {
      const dayBefore = new Date(eventDatetime);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(18, 0, 0, 0); // 6 PM day before
      return dayBefore;
    }
    case 'HOURS_BEFORE': {
      if (!relativeMinutes) {
        throw new Error('relativeMinutes required for HOURS_BEFORE schedule');
      }
      const before = new Date(eventDatetime);
      before.setMinutes(before.getMinutes() - relativeMinutes);
      return before;
    }
    default:
      throw new Error(`Unknown schedule type: ${scheduleType}`);
  }
}
