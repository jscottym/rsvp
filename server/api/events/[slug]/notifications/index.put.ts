import { z } from 'zod';
import prisma from '../../../../utils/db';
import { calculateScheduledTime } from '../../../../utils/twilio';

const updateReminderSchema = z.object({
  scheduleType: z.enum(['NONE', 'DAY_BEFORE', 'HOURS_BEFORE']),
  hoursBeforeValue: z.number().int().min(1).max(24).optional(),
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
      timezone: true,
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
      message: 'Only the organizer can modify reminders',
    });
  }

  const body = await readBody(event);
  const parsed = updateReminderSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: parsed.error.flatten(),
    });
  }

  const { scheduleType, hoursBeforeValue } = parsed.data;

  // Validate hoursBeforeValue for HOURS_BEFORE
  if (scheduleType === 'HOURS_BEFORE' && !hoursBeforeValue) {
    throw createError({
      statusCode: 400,
      message: 'hoursBeforeValue is required for HOURS_BEFORE schedule type',
    });
  }

  // Get existing notification
  const existingNotification = await prisma.eventNotification.findUnique({
    where: { eventId: eventData.id },
  });

  // If NONE, delete existing notification
  if (scheduleType === 'NONE') {
    if (existingNotification) {
      // Only allow deletion of pending notifications
      if (existingNotification.status !== 'PENDING') {
        throw createError({
          statusCode: 400,
          message: 'Cannot modify a notification that has already been processed',
        });
      }
      await prisma.eventNotification.delete({
        where: { id: existingNotification.id },
      });
    }
    return { reminder: null };
  }

  // Calculate the scheduled time
  const relativeMinutes = scheduleType === 'HOURS_BEFORE' ? (hoursBeforeValue || 1) * 60 : null;
  const scheduledFor = calculateScheduledTime(
    eventData.datetime,
    scheduleType,
    relativeMinutes
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

  let notification;

  if (existingNotification) {
    // Only allow updates to pending notifications
    if (existingNotification.status !== 'PENDING') {
      throw createError({
        statusCode: 400,
        message: 'Cannot modify a notification that has already been processed',
      });
    }

    // Update existing notification
    notification = await prisma.eventNotification.update({
      where: { id: existingNotification.id },
      data: {
        scheduleType,
        scheduledFor,
        relativeMinutes,
      },
    });
  } else {
    // Create new notification
    notification = await prisma.eventNotification.create({
      data: {
        eventId: eventData.id,
        scheduleType,
        scheduledFor,
        relativeMinutes,
        status: 'PENDING',
        createdById: auth.user.id,
      },
    });
  }

  const responseHoursBeforeValue = notification.scheduleType === 'HOURS_BEFORE' && notification.relativeMinutes
    ? notification.relativeMinutes / 60
    : undefined;

  return {
    reminder: {
      id: notification.id,
      scheduleType: notification.scheduleType,
      hoursBeforeValue: responseHoursBeforeValue,
      scheduledFor: notification.scheduledFor.toISOString(),
      status: notification.status,
    },
  };
});
