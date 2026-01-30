export interface FormatRelativeDayOptions {
  includeTonight?: boolean;
}

export function formatRelativeDay(
  datetime: string,
  options: FormatRelativeDayOptions = {}
): string {
  const { includeTonight = false } = options;

  const eventDate = new Date(datetime);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDay = new Date(eventDate);
  eventDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    if (includeTonight && eventDate.getHours() >= 17) {
      return 'Tonight';
    }
    return 'Today';
  }
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  if (diffDays < 0) {
    return eventDay.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  const dayName = eventDay.toLocaleDateString('en-US', { weekday: 'short' });

  if (diffDays <= 6) {
    return `This ${dayName}`;
  }
  if (diffDays <= 13) {
    return `Next ${dayName}`;
  }

  return eventDay.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get date parts in a specific timezone
 */
function getDatePartsInTimezone(
  datetime: string,
  timezone: string
): { year: number; month: number; day: number; hour: number; minute: number } {
  const date = new Date(datetime);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
  };
}

/**
 * Get today's date parts in a specific timezone
 */
function getTodayInTimezone(timezone: string): {
  year: number;
  month: number;
  day: number;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  };
}

export interface FormatRelativeDayInTimezoneOptions {
  includeTonight?: boolean;
}

/**
 * Format relative day in a specific timezone (for OG images and SSR)
 */
export function formatRelativeDayInTimezone(
  datetime: string,
  timezone: string,
  options: FormatRelativeDayInTimezoneOptions = {}
): string {
  const { includeTonight = false } = options;

  const eventParts = getDatePartsInTimezone(datetime, timezone);
  const todayParts = getTodayInTimezone(timezone);

  // Calculate day difference
  const eventDate = new Date(
    eventParts.year,
    eventParts.month - 1,
    eventParts.day
  );
  const todayDate = new Date(
    todayParts.year,
    todayParts.month - 1,
    todayParts.day
  );

  const diffDays = Math.round(
    (eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    if (includeTonight && eventParts.hour >= 17) {
      return 'Tonight';
    }
    return 'Today';
  }
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  if (diffDays < 0) {
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' });

  if (diffDays <= 6) {
    return `This ${dayName}`;
  }
  if (diffDays <= 13) {
    return `Next ${dayName}`;
  }

  return eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time range in a specific timezone (for OG images and SSR)
 */
export function formatTimeInTimezone(
  datetime: string,
  endDatetime: string | undefined,
  timezone: string
): string {
  const startParts = getDatePartsInTimezone(datetime, timezone);

  const startHour = startParts.hour;
  const startMinute = startParts.minute;
  const startPeriod = startHour >= 12 ? 'pm' : 'am';
  const startHour12 = startHour % 12 || 12;
  const startTimeStr =
    startMinute === 0
      ? `${startHour12}`
      : `${startHour12}:${startMinute.toString().padStart(2, '0')}`;

  if (endDatetime) {
    const endParts = getDatePartsInTimezone(endDatetime, timezone);
    const endHour = endParts.hour;
    const endMinute = endParts.minute;
    const endPeriod = endHour >= 12 ? 'pm' : 'am';
    const endHour12 = endHour % 12 || 12;
    const endTimeStr =
      endMinute === 0
        ? `${endHour12}`
        : `${endHour12}:${endMinute.toString().padStart(2, '0')}`;

    if (startPeriod === endPeriod) {
      return `${startTimeStr}-${endTimeStr}${endPeriod}`;
    }
    return `${startTimeStr}${startPeriod}-${endTimeStr}${endPeriod}`;
  }

  return `${startTimeStr}${startPeriod}`;
}
