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

  // Get the event and verify organizer
  const eventData = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      organizerId: true,
    },
  });

  if (!eventData) {
    throw createError({
      statusCode: 404,
      message: 'Event not found',
    });
  }

  if (eventData.organizerId !== auth.user.id) {
    throw createError({
      statusCode: 403,
      message: 'Only the organizer can view notifications',
    });
  }

  // Get all notifications for this event
  const notifications = await prisma.eventNotification.findMany({
    where: { eventId: eventData.id },
    include: {
      _count: {
        select: {
          sentMessages: true,
        },
      },
      sentMessages: {
        select: {
          status: true,
        },
      },
    },
    orderBy: { scheduledFor: 'asc' },
  });

  return {
    notifications: notifications.map((n) => {
      const sentCount = n.sentMessages.filter((m) => m.status === 'SENT' || m.status === 'DELIVERED').length;
      const failedCount = n.sentMessages.filter((m) => m.status === 'FAILED').length;

      return {
        id: n.id,
        scheduleType: n.scheduleType,
        scheduledFor: n.scheduledFor.toISOString(),
        relativeMinutes: n.relativeMinutes,
        messageTemplate: n.messageTemplate,
        status: n.status,
        processedAt: n.processedAt?.toISOString() || null,
        createdAt: n.createdAt.toISOString(),
        recipientCount: n._count.sentMessages,
        sentCount,
        failedCount,
      };
    }),
  };
});
