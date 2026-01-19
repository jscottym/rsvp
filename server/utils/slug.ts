import { customAlphabet } from 'nanoid'

// Use URL-safe characters for the random suffix
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', 8)

const sportPrefixes: Record<string, string> = {
  basketball: 'basketball',
  soccer: 'soccer',
  football: 'football',
  volleyball: 'volleyball',
  tennis: 'tennis',
  pickleball: 'pickleball',
  baseball: 'baseball',
  softball: 'softball',
  hockey: 'hockey',
  ultimate: 'ultimate',
  frisbee: 'frisbee',
  golf: 'golf',
  other: 'game'
}

export function generateEventSlug(sportType: string): string {
  const prefix = sportPrefixes[sportType.toLowerCase()] || 'game'
  const suffix = nanoid()
  return `${prefix}-${suffix}`
}

export function isValidSlug(slug: string): boolean {
  // Format: {prefix}-{8-char-random}
  const pattern = /^[a-z]+-[A-Za-z0-9]{8}$/
  return pattern.test(slug)
}
