import { defineWebSocketHandler } from 'h3'
import { addPeerToEvent, removePeerFromAllEvents } from '../utils/broadcast'

interface SubscribeMessage {
  type: 'subscribe'
  eventSlug: string
  token?: string
}

interface SubscribeDashboardMessage {
  type: 'subscribe_dashboard'
  eventSlugs: string[]
  token?: string
}

interface PingMessage {
  type: 'ping'
}

type ClientMessage = SubscribeMessage | SubscribeDashboardMessage | PingMessage

export default defineWebSocketHandler({
  open(peer) {
    console.log('[WebSocket] Connection opened:', peer.id)
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.text()) as ClientMessage

      switch (data.type) {
        case 'subscribe': {
          if (!data.eventSlug) {
            peer.send(JSON.stringify({ type: 'error', message: 'eventSlug is required' }))
            return
          }

          // Add peer to the event channel
          addPeerToEvent(data.eventSlug, peer)

          // Note: Token verification is optional for viewing
          // The RSVP endpoint requires auth, but viewing updates does not
          const authenticated = !!data.token

          peer.send(JSON.stringify({
            type: 'subscribed',
            channel: `event:${data.eventSlug}`,
            authenticated
          }))

          console.log(`[WebSocket] Peer ${peer.id} subscribed to event:${data.eventSlug}`)
          break
        }

        case 'subscribe_dashboard': {
          if (!data.eventSlugs || !Array.isArray(data.eventSlugs)) {
            peer.send(JSON.stringify({ type: 'error', message: 'eventSlugs array is required' }))
            return
          }

          // Add peer to all event channels
          for (const slug of data.eventSlugs) {
            addPeerToEvent(slug, peer)
          }

          peer.send(JSON.stringify({
            type: 'dashboard_subscribed',
            eventSlugs: data.eventSlugs
          }))

          console.log(`[WebSocket] Peer ${peer.id} subscribed to dashboard with ${data.eventSlugs.length} events`)
          break
        }

        case 'ping': {
          peer.send(JSON.stringify({ type: 'pong' }))
          break
        }

        default: {
          peer.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }))
        }
      }
    } catch (error) {
      console.error('[WebSocket] Error processing message:', error)
      peer.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
    }
  },

  close(peer) {
    console.log('[WebSocket] Connection closed:', peer.id)
    removePeerFromAllEvents(peer)
  },

  error(peer, error) {
    console.error('[WebSocket] Error:', peer.id, error)
    removePeerFromAllEvents(peer)
  }
})
