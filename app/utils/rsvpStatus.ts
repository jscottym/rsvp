export type RsvpStatus = 'IN' | 'OUT' | 'MAYBE' | 'IN_IF' | 'WAITLIST';

export interface RsvpStatusConfig {
  label: string;
  icon: string;
  iconSolid: string;
  bg: string;
  border: string;
  ring: string;
  iconColor: string;
  textColor: string;
}

export const RSVP_STATUS_CONFIG: Record<
  RsvpStatus | 'ORGANIZER' | 'NONE',
  RsvpStatusConfig
> = {
  IN: {
    label: "You're in!",
    icon: 'i-heroicons-check-circle',
    iconSolid: 'i-heroicons-check-circle-solid',
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    border: 'border-teal-200 dark:border-teal-800',
    ring: 'ring-2 ring-teal-500',
    iconColor: 'text-teal-500',
    textColor: 'text-teal-700 dark:text-teal-300',
  },
  WAITLIST: {
    label: 'On waitlist',
    icon: 'i-heroicons-clock',
    iconSolid: 'i-heroicons-clock-solid',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-200 dark:border-violet-800',
    ring: 'ring-2 ring-violet-500',
    iconColor: 'text-violet-500',
    textColor: 'text-violet-700 dark:text-violet-300',
  },
  MAYBE: {
    label: 'Maybe',
    icon: 'i-heroicons-question-mark-circle',
    iconSolid: 'i-heroicons-question-mark-circle-solid',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    ring: 'ring-2 ring-amber-400',
    iconColor: 'text-amber-500',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  IN_IF: {
    label: 'Maybe',
    icon: 'i-heroicons-question-mark-circle',
    iconSolid: 'i-heroicons-question-mark-circle-solid',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    ring: 'ring-2 ring-amber-400',
    iconColor: 'text-amber-500',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  OUT: {
    label: 'Out',
    icon: 'i-heroicons-x-circle',
    iconSolid: 'i-heroicons-x-circle-solid',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    ring: 'ring-2 ring-red-400',
    iconColor: 'text-red-500',
    textColor: 'text-red-700 dark:text-red-300',
  },
  ORGANIZER: {
    label: 'Organizing',
    icon: 'i-heroicons-star',
    iconSolid: 'i-heroicons-star-solid',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    ring: 'ring-2 ring-amber-400',
    iconColor: 'text-amber-500',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  NONE: {
    label: '',
    icon: '',
    iconSolid: '',
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-gray-200 dark:border-gray-700',
    ring: '',
    iconColor: '',
    textColor: 'text-gray-600 dark:text-gray-400',
  },
};

export function getRsvpStatusConfig(
  status: RsvpStatus | null,
  isOrganizer: boolean
): RsvpStatusConfig {
  if (status) return RSVP_STATUS_CONFIG[status];
  if (isOrganizer) return RSVP_STATUS_CONFIG.ORGANIZER;
  return RSVP_STATUS_CONFIG.NONE;
}
