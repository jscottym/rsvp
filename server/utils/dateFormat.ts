const DEFAULT_TIMEZONE = 'America/New_York'

export function formatEventDate(date: Date, options?: { includeTime?: boolean }): string {
  const { includeTime = false } = options || {}
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: DEFAULT_TIMEZONE
  }
  
  if (includeTime) {
    dateOptions.hour = 'numeric'
    dateOptions.minute = '2-digit'
  }
  
  return date.toLocaleString('en-US', dateOptions)
}

export function formatEventTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: DEFAULT_TIMEZONE
  })
}

export function formatEventDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: DEFAULT_TIMEZONE
  })
}
