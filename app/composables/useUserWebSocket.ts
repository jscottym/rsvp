interface InviteAcceptedPayload {
  type: 'invite_accepted'
  acceptorName: string
  groupNames: string[]
}

interface UserSubscribedPayload {
  type: 'user_subscribed'
  userId: string
}

interface PongPayload {
  type: 'pong'
}

type ServerMessage = InviteAcceptedPayload | UserSubscribedPayload | PongPayload

export function useUserWebSocket() {
  const authStore = useAuthStore()
  const toast = useToast()

  let ws: WebSocket | null = null
  let pingInterval: ReturnType<typeof setInterval> | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 10
  const baseReconnectDelay = 2000

  function getWebSocketUrl() {
    if (import.meta.server) return null
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/_ws`
  }

  function connect() {
    if (import.meta.server) return
    if (!authStore.currentUser?.id) return

    const url = getWebSocketUrl()
    if (!url) return

    try {
      ws = new WebSocket(url)

      ws.onopen = () => {
        reconnectAttempts = 0

        // Subscribe to user channel
        ws?.send(JSON.stringify({
          type: 'subscribe_user',
          userId: authStore.currentUser!.id
        }))

        // Keep-alive
        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerMessage

          if (data.type === 'invite_accepted') {
            const groupList = data.groupNames.length > 0
              ? data.groupNames.join(' & ')
              : 'your contacts'

            toast.add({
              title: `${data.acceptorName} accepted your invite!`,
              description: `Added to ${groupList}`,
              color: 'success'
            })
          }
        } catch {
          // Ignore parse errors from event channel messages
        }
      }

      ws.onclose = () => {
        cleanup()
        if (reconnectAttempts < maxReconnectAttempts && authStore.isAuthenticated) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts)
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++
            connect()
          }, delay)
        }
      }

      ws.onerror = () => {
        // Will trigger onclose
      }
    } catch {
      // Connection failed
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
    reconnectAttempts = maxReconnectAttempts
    if (ws) {
      ws.close()
      ws = null
    }
  }

  onMounted(() => {
    if (authStore.isAuthenticated) {
      connect()
    }
  })

  // Watch for auth state changes
  watch(() => authStore.isAuthenticated, (isAuth) => {
    if (isAuth) {
      connect()
    } else {
      disconnect()
    }
  })

  onUnmounted(() => {
    disconnect()
  })

  return { connect, disconnect }
}
