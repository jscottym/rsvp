import type { Peer } from 'crossws'

export interface RsvpUpdatePayload {
  type: 'rsvp_update'
  eventSlug: string
  rsvp: {
    id: string
    userId: string | null
    status: string
    comment: string | null
    name: string
  }
  counts: {
    rsvpCount: number
    waitlistCount: number
  }
  activities: {
    id: string
    type: string
    message: string
    comment: string | null
    createdAt: string
  }[]
}

export interface EventUpdatePayload {
  type: 'event_update'
  eventSlug: string
  event: {
    location: string
    datetime: string
    endDatetime: string
    minPlayers: number
    maxPlayers: number
    description: string | null
    allowSharing: boolean
  }
  activity: {
    id: string
    type: string
    message: string
    comment: string | null
    createdAt: string
  } | null
}

export interface InviteAcceptedPayload {
  type: 'invite_accepted'
  acceptorName: string
  acceptorPhone: string
  groupNames: string[]
  addedGroupIds: string[]
  memberGroupIds: string[]
}

export type WebSocketPayload = RsvpUpdatePayload | EventUpdatePayload
export type UserWebSocketPayload = InviteAcceptedPayload

// Store for active WebSocket peers by event channel
const eventPeers = new Map<string, Set<Peer>>()

export function getEventPeers(eventSlug: string): Set<Peer> {
  if (!eventPeers.has(eventSlug)) {
    eventPeers.set(eventSlug, new Set())
  }
  return eventPeers.get(eventSlug)!
}

export function addPeerToEvent(eventSlug: string, peer: Peer) {
  getEventPeers(eventSlug).add(peer)
}

export function removePeerFromEvent(eventSlug: string, peer: Peer) {
  const peers = eventPeers.get(eventSlug)
  if (peers) {
    peers.delete(peer)
    if (peers.size === 0) {
      eventPeers.delete(eventSlug)
    }
  }
}

export function removePeerFromAllEvents(peer: Peer) {
  for (const [eventSlug, peers] of eventPeers) {
    peers.delete(peer)
    if (peers.size === 0) {
      eventPeers.delete(eventSlug)
    }
  }
}

export function broadcastToEvent(eventSlug: string, payload: WebSocketPayload) {
  const peers = eventPeers.get(eventSlug)
  if (!peers || peers.size === 0) {
    return
  }

  const message = JSON.stringify(payload)
  for (const peer of peers) {
    try {
      peer.send(message)
    } catch (error) {
      console.error(`Failed to send message to peer:`, error)
      // Remove disconnected peer
      peers.delete(peer)
    }
  }
}

// ==================== User-scoped channels ====================

const userPeers = new Map<string, Set<Peer>>()

export function addPeerToUser(userId: string, peer: Peer) {
  if (!userPeers.has(userId)) {
    userPeers.set(userId, new Set())
  }
  userPeers.get(userId)!.add(peer)
}

export function removePeerFromUser(userId: string, peer: Peer) {
  const peers = userPeers.get(userId)
  if (peers) {
    peers.delete(peer)
    if (peers.size === 0) {
      userPeers.delete(userId)
    }
  }
}

export function removePeerFromAllUsers(peer: Peer) {
  for (const [userId, peers] of userPeers) {
    peers.delete(peer)
    if (peers.size === 0) {
      userPeers.delete(userId)
    }
  }
}

export function broadcastToUser(userId: string, payload: UserWebSocketPayload) {
  const peers = userPeers.get(userId)
  if (!peers || peers.size === 0) {
    return
  }

  const message = JSON.stringify(payload)
  for (const peer of peers) {
    try {
      peer.send(message)
    } catch (error) {
      console.error(`Failed to send user message to peer:`, error)
      peers.delete(peer)
    }
  }
}
