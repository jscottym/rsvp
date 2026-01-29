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
  activity: {
    id: string
    type: string
    message: string
    comment: string | null
    createdAt: string
  }
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

interface DashboardSubscribedPayload {
  type: 'dashboard_subscribed'
  eventSlugs: string[]
}

interface PongPayload {
  type: 'pong'
}

interface ErrorPayload {
  type: 'error'
  message: string
}

type ServerMessage = RsvpUpdatePayload | EventUpdatePayload | DashboardSubscribedPayload | PongPayload | ErrorPayload

export interface UseDashboardWebSocketOptions {
  onRsvpUpdate?: (payload: RsvpUpdatePayload) => void
  onEventUpdate?: (payload: EventUpdatePayload) => void
  onConnected?: () => void
  onDisconnected?: () => void
}

export function useDashboardWebSocket(
  eventSlugs: Ref<string[]>,
  options: UseDashboardWebSocketOptions = {}
) {
  const authStore = useAuthStore()

  const isConnected = ref(false)
  const isSubscribed = ref(false)
  const connectionError = ref<string | null>(null)
  const subscribedSlugs = ref<string[]>([])

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

  function subscribe(slugs: string[]) {
    if (!ws || ws.readyState !== WebSocket.OPEN || slugs.length === 0) return

    ws.send(JSON.stringify({
      type: 'subscribe_dashboard',
      eventSlugs: slugs,
      token: authStore.isAuthenticated ? 'authenticated' : undefined
    }))
  }

  function connect() {
    if (import.meta.server) return

    const url = getWebSocketUrl()
    if (!url) return

    try {
      ws = new WebSocket(url)
      connectionError.value = null

      ws.onopen = () => {
        console.log('[DashboardWebSocket] Connected')
        isConnected.value = true
        reconnectAttempts = 0

        // Subscribe to all event channels
        if (eventSlugs.value.length > 0) {
          subscribe(eventSlugs.value)
        }

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
            case 'dashboard_subscribed':
              console.log('[DashboardWebSocket] Subscribed to', data.eventSlugs.length, 'events')
              isSubscribed.value = true
              subscribedSlugs.value = data.eventSlugs
              break

            case 'rsvp_update':
              console.log('[DashboardWebSocket] RSVP update received for', data.eventSlug)
              options.onRsvpUpdate?.(data)
              break

            case 'event_update':
              console.log('[DashboardWebSocket] Event update received for', data.eventSlug)
              options.onEventUpdate?.(data)
              break

            case 'pong':
              // Keep-alive response, no action needed
              break

            case 'error':
              console.error('[DashboardWebSocket] Server error:', data.message)
              connectionError.value = data.message
              break
          }
        } catch (error) {
          console.error('[DashboardWebSocket] Error parsing message:', error)
        }
      }

      ws.onclose = () => {
        console.log('[DashboardWebSocket] Disconnected')
        isConnected.value = false
        isSubscribed.value = false
        subscribedSlugs.value = []
        cleanup()
        options.onDisconnected?.()

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts)
          console.log(`[DashboardWebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`)
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++
            connect()
          }, delay)
        }
      }

      ws.onerror = (error) => {
        console.error('[DashboardWebSocket] Error:', error)
        connectionError.value = 'Connection error'
      }
    } catch (error) {
      console.error('[DashboardWebSocket] Failed to connect:', error)
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
    subscribedSlugs.value = []
  }

  // Watch for eventSlugs changes and update subscriptions
  watch(eventSlugs, (newSlugs, oldSlugs) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    // Find newly added slugs
    const oldSet = new Set(oldSlugs || [])
    const newlyAdded = newSlugs.filter(slug => !oldSet.has(slug))

    if (newlyAdded.length > 0) {
      subscribe(newlyAdded)
    }
  }, { deep: true })

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
    subscribedSlugs: readonly(subscribedSlugs),
    connectionError: readonly(connectionError),
    connect,
    disconnect,
    subscribe
  }
}
