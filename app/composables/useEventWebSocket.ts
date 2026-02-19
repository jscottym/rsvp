import type { Ref } from 'vue'

type RsvpStatus = 'IN' | 'OUT' | 'MAYBE' | 'IN_IF' | 'WAITLIST'

interface RsvpUpdatePayload {
  type: 'rsvp_update'
  eventSlug: string
  rsvp: {
    id: string
    userId: string | null
    status: RsvpStatus
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

interface EventUpdatePayload {
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

interface SubscribedPayload {
  type: 'subscribed'
  channel: string
  authenticated: boolean
}

interface PongPayload {
  type: 'pong'
}

interface ErrorPayload {
  type: 'error'
  message: string
}

type ServerMessage = RsvpUpdatePayload | EventUpdatePayload | SubscribedPayload | PongPayload | ErrorPayload

export interface EventActivity {
  id: string
  type: string
  message: string
  comment: string | null
  createdAt: string
}

export interface UseEventWebSocketOptions {
  onRsvpUpdate?: (payload: RsvpUpdatePayload) => void
  onEventUpdate?: (payload: EventUpdatePayload) => void
  onActivity?: (activity: EventActivity) => void
  onConnected?: () => void
  onDisconnected?: () => void
}

export function useEventWebSocket(eventSlug: Ref<string> | string, options: UseEventWebSocketOptions = {}) {
  const slug = typeof eventSlug === 'string' ? ref(eventSlug) : eventSlug

  const isConnected = ref(false)
  const isSubscribed = ref(false)
  const connectionError = ref<string | null>(null)

  let ws: WebSocket | null = null
  let pingInterval: ReturnType<typeof setInterval> | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 10
  const baseReconnectDelay = 1000

  function getWebSocketUrl() {
    if (import.meta.server) return null

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/_ws`
  }

  function connect() {
    if (import.meta.server) return

    const url = getWebSocketUrl()
    if (!url) return

    try {
      ws = new WebSocket(url)
      connectionError.value = null

      ws.onopen = () => {
        console.log('[WebSocket] Connected')
        isConnected.value = true
        reconnectAttempts = 0

        // Subscribe to the event channel
        const authStore = useAuthStore()
        ws?.send(JSON.stringify({
          type: 'subscribe',
          eventSlug: slug.value,
          token: authStore.isAuthenticated ? 'authenticated' : undefined
        }))

        // Start ping interval to keep connection alive
        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)

        options.onConnected?.()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerMessage

          switch (data.type) {
            case 'subscribed':
              console.log('[WebSocket] Subscribed to', data.channel)
              isSubscribed.value = true
              break

            case 'rsvp_update':
              console.log('[WebSocket] RSVP update received:', data)
              options.onRsvpUpdate?.(data)
              for (const activity of data.activities) {
                options.onActivity?.(activity)
              }
              break

            case 'event_update':
              console.log('[WebSocket] Event update received:', data)
              options.onEventUpdate?.(data)
              if (data.activity) {
                options.onActivity?.(data.activity)
              }
              break

            case 'pong':
              // Keep-alive response, no action needed
              break

            case 'error':
              console.error('[WebSocket] Server error:', data.message)
              connectionError.value = data.message
              break
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error)
        }
      }

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected')
        isConnected.value = false
        isSubscribed.value = false
        cleanup()
        options.onDisconnected?.()

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts)
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`)
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++
            connect()
          }, delay)
        }
      }

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
        connectionError.value = 'Connection error'
      }
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error)
      connectionError.value = 'Failed to connect'
    }
  }

  function cleanup() {
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    cleanup()
    reconnectAttempts = maxReconnectAttempts // Prevent auto-reconnect
    if (ws) {
      ws.close()
      ws = null
    }
    isConnected.value = false
    isSubscribed.value = false
  }

  // Watch for slug changes and resubscribe
  watch(slug, (newSlug) => {
    if (ws?.readyState === WebSocket.OPEN && newSlug) {
      const authStore = useAuthStore()
      ws.send(JSON.stringify({
        type: 'subscribe',
        eventSlug: newSlug,
        token: authStore.isAuthenticated ? 'authenticated' : undefined
      }))
    }
  })

  // Auto-connect on mount (client-side only)
  onMounted(() => {
    connect()
  })

  // Disconnect on unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected: readonly(isConnected),
    isSubscribed: readonly(isSubscribed),
    connectionError: readonly(connectionError),
    connect,
    disconnect
  }
}
