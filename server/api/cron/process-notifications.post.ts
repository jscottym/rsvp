import prisma from '../../utils/db';
import { processNotification, getPendingNotifications } from '../../utils/twilio';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Verify cron secret
  const authHeader = getHeader(event, 'authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (config.cronSecret && token !== config.cronSecret) {
    throw createError({
      statusCode: 401,
      message: 'Invalid cron secret',
    });
  }

  // Get base URL for status callback
  const requestUrl = getRequestURL(event);
  const statusCallbackUrl = `${requestUrl.origin}/api/webhooks/twilio/status`;

  // Get all pending notifications that are due
  const notifications = await getPendingNotifications();

  if (notifications.length === 0) {
    return {
      processed: 0,
      results: [],
    };
  }

  const results = [];

  for (const notification of notifications) {
    // Mark as processing
    await prisma.eventNotification.update({
      where: { id: notification.id },
      data: { status: 'PROCESSING' },
    });

    try {
      const result = await processNotification(notification, statusCallbackUrl);
      results.push({
        notificationId: notification.id,
        eventSlug: notification.event.slug,
        sent: result.sent,
        failed: result.failed,
      });
    } catch (error) {
      console.error(`Failed to process notification ${notification.id}:`, error);

      // Mark as failed
      await prisma.eventNotification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          processedAt: new Date(),
        },
      });

      results.push({
        notificationId: notification.id,
        eventSlug: notification.event.slug,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    processed: notifications.length,
    results,
  };
});
