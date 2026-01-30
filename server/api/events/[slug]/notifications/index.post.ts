import { z } from 'zod';
import prisma from '../../../../utils/db';
import { calculateScheduledTime } from '../../../../utils/twilio';

const MAX_NOTIFICATIONS_PER_EVENT = 5;

const createNotificationSchema = z.object({
  scheduleType: z.enum(['DAY_BEFORE', 'MORNING_OF', 'MINUTES_BEFORE', 'SPECIFIC_TIME']),
  relativeMinutes: z.number().int().min(1).optional(),
  specificTime: z.string().optional(),
  messageTemplate: z.string().max(500).optional(),
});

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
      datetime: true,
      _count: {
        select: {
          notifications: {
            where: {
              status: { in: ['PENDING', 'PROCESSING'] },
            },
          },
        },
      },
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
      message: 'Only the organizer can create notifications',
    });
  }

  // Check rate limit
  if (eventData._count.notifications >= MAX_NOTIFICATIONS_PER_EVENT) {
    throw createError({
      statusCode: 400,
      message: `Maximum of ${MAX_NOTIFICATIONS_PER_EVENT} pending notifications allowed per event`,
    });
  }

  const body = await readBody(event);
  const parsed = createNotificationSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: parsed.error.flatten(),
    });
  }

  const { scheduleType, relativeMinutes, specificTime, messageTemplate } = parsed.data;

  // Validate schedule type specific fields
  if (scheduleType === 'MINUTES_BEFORE' && !relativeMinutes) {
    throw createError({
      statusCode: 400,
      message: 'relativeMinutes is required for MINUTES_BEFORE schedule type',
    });
  }

  if (scheduleType === 'SPECIFIC_TIME' && !specificTime) {
    throw createError({
      statusCode: 400,
      message: 'specificTime is required for SPECIFIC_TIME schedule type',
    });
  }

  // Calculate scheduled time
  const scheduledFor = calculateScheduledTime(
    eventData.datetime,
    scheduleType,
    relativeMinutes,
    specificTime ? new Date(specificTime) : undefined
  );

  // Validate that scheduled time is in the future
  if (scheduledFor <= new Date()) {
    throw createError({
      statusCode: 400,
      message: 'Notification must be scheduled for a future time',
    });
  }

  // Validate that scheduled time is before the event
  if (scheduledFor >= eventData.datetime) {
    throw createError({
      statusCode: 400,
      message: 'Notification must be scheduled before the event starts',
    });
  }

  // Create the notification
  const notification = await prisma.eventNotification.create({
    data: {
      eventId: eventData.id,
      scheduleType,
      scheduledFor,
      relativeMinutes: scheduleType === 'MINUTES_BEFORE' ? relativeMinutes : null,
      messageTemplate: messageTemplate || null,
      status: 'PENDING',
      createdById: auth.user.id,
    },
  });

  return {
    notification: {
      id: notification.id,
      scheduleType: notification.scheduleType,
      scheduledFor: notification.scheduledFor.toISOString(),
      relativeMinutes: notification.relativeMinutes,
      messageTemplate: notification.messageTemplate,
      status: notification.status,
      createdAt: notification.createdAt.toISOString(),
    },
  };
});
