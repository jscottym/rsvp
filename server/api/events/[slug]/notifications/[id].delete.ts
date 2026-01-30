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
  const notificationId = getRouterParam(event, 'id');

  if (!slug || !notificationId) {
    throw createError({
      statusCode: 400,
      message: 'Event slug and notification ID are required',
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
      message: 'Only the organizer can cancel notifications',
    });
  }

  // Get the notification
  const notification = await prisma.eventNotification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw createError({
      statusCode: 404,
      message: 'Notification not found',
    });
  }

  if (notification.eventId !== eventData.id) {
    throw createError({
      statusCode: 403,
      message: 'Notification does not belong to this event',
    });
  }

  // Only allow cancellation of pending notifications
  if (notification.status !== 'PENDING') {
    throw createError({
      statusCode: 400,
      message: 'Can only cancel pending notifications',
    });
  }

  // Update status to cancelled
  await prisma.eventNotification.update({
    where: { id: notificationId },
    data: { status: 'CANCELLED' },
  });

  return { success: true };
});
