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
