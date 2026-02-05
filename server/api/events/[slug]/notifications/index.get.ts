import prisma from '../../../../utils/db';

export default defineEventHandler(async (event) => {
  const auth = event.context.auth;

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    });
  }

  const slug = getRouterParam(event, 'slug');

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Event slug is required',
    });
  }

  // Get the event - all authenticated users can view
  const eventData = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      organizerId: true,
      timezone: true,
    },
  });

  if (!eventData) {
    throw createError({
      statusCode: 404,
      message: 'Event not found',
    });
  }

  const isOrganizer = eventData.organizerId === auth.user.id;

  // Get the single notification for this event (if exists)
  const notification = await prisma.eventNotification.findUnique({
    where: { eventId: eventData.id },
    include: {
      sentMessages: {
        select: {
          id: true,
          recipientName: true,
          status: true,
          sentAt: true,
        },
        orderBy: { sentAt: 'asc' },
      },
    },
  });

  if (!notification) {
    return {
      reminder: null,
      isOrganizer,
    };
  }

  // Build recipients list (only include if notification was processed)
  const recipients = notification.status === 'COMPLETED' || notification.status === 'PARTIALLY_FAILED'
    ? notification.sentMessages.map((m) => ({
        name: m.recipientName || 'Unknown',
        status: m.status,
        sentAt: m.sentAt?.toISOString() || null,
      }))
    : undefined;

  // Calculate hoursBeforeValue from relativeMinutes
  const hoursBeforeValue = notification.scheduleType === 'HOURS_BEFORE' && notification.relativeMinutes
    ? notification.relativeMinutes / 60
    : undefined;

  return {
    reminder: {
      id: notification.id,
      scheduleType: notification.scheduleType,
      hoursBeforeValue,
      scheduledFor: notification.scheduledFor.toISOString(),
      status: notification.status,
      processedAt: notification.processedAt?.toISOString() || null,
      recipients,
    },
    isOrganizer,
  };
});
