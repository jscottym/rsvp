import { customAlphabet } from 'nanoid'

// URL-safe, unambiguous characters for invite codes
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', 10)

export function generateInviteCode(): string {
  return nanoid()
}
