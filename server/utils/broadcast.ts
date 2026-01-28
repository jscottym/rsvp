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
  activity: {
    id: string
    type: string
    message: string
    createdAt: string
  }
}

export type WebSocketPayload = RsvpUpdatePayload

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
