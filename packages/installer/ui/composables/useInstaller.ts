// ui/composables/use_installer.ts
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import type {
  InstallerSnapshot,
  InstallerEvent,
  InteractionRequest
} from "@common/engine/installer_engine.types"
import { WSMessage } from "@common/utils/ws.utils"

type InstallerState = InstallerSnapshot | null

// Connection status types
export type ConnectionStatus =
  | "idle" // Initial state, not yet attempting to connect
  | "connecting" // WebSocket connection in progress
  | "connected" // WebSocket successfully connected and ready
  | "reconnecting" // Attempting to reconnect after connection loss
  | "failed" // Connection failed (error occurred)
  | "disconnected" // Connection was closed intentionally
  | "error" // WebSocket error occurred

const WS_PATH = `ws://${import.meta.env.DEV ? "localhost:3000/" : ""}api`

function create_client_id(): string {
  const key = "installer_client_id"
  const existing =
    typeof window !== "undefined" ? window.localStorage.getItem(key) : null
  if (existing) return existing
  const id =
    (window.crypto?.randomUUID?.() as string | undefined) ??
    Math.random().toString(36).slice(2)
  window.localStorage.setItem(key, id)
  return id
}

// Singleton WebSocket instance and shared state
let sharedWs: WebSocket | null = null
let sharedReconnectAttempts = 0
let sharedReconnectTimer: number | null = null
let sharedConnectionStatus: ConnectionStatus = "idle"
let sharedSnapshot: InstallerState = null
let sharedLastError: unknown = null

// Listeners for component-specific state updates
const componentListeners = new Set<Function>()

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 2000 // 2 seconds
// Message-type specific listeners
type MessageHandler<T = any> = (message: WSMessage<string, T>) => void

const messageListeners = new Map<string, Set<MessageHandler>>()

function addMessageListener<T>(type: string, handler: MessageHandler<T>) {
  let set = messageListeners.get(type)
  if (!set) {
    set = new Set()
    messageListeners.set(type, set)
  }
  set.add(handler as MessageHandler)
}

function removeMessageListener<T>(type: string, handler: MessageHandler<T>) {
  const set = messageListeners.get(type)
  if (!set) return
  set.delete(handler as MessageHandler)
  if (set.size === 0) {
    messageListeners.delete(type)
  }
}

function dispatchMessage(message: WSMessage<any>) {
  const set = messageListeners.get(message.type)
  if (!set) return
  set.forEach((handler) => {
    try {
      handler(message)
    } catch (err) {
      console.error("Message handler error:", err)
    }
  })
}

function notifyComponents() {
  componentListeners.forEach((listener) => listener())
}

function setSharedStatus(status: ConnectionStatus) {
  sharedConnectionStatus = status
  console.log(`WebSocket status: ${status}`)
  notifyComponents()
}

function setSharedSnapshot(snapshot: InstallerState) {
  sharedSnapshot = snapshot
  notifyComponents()
}

function setSharedLastError(error: unknown) {
  sharedLastError = error
  notifyComponents()
}

function connectShared() {
  if (
    sharedWs &&
    (sharedWs.readyState === WebSocket.CONNECTING ||
      sharedWs.readyState === WebSocket.OPEN)
  ) {
    console.warn("WebSocket connection already exists or is connecting")
    return
  }

  // Clear any existing reconnect timer
  if (sharedReconnectTimer) {
    clearTimeout(sharedReconnectTimer)
    sharedReconnectTimer = null
  }

  setSharedStatus("connecting")
  setSharedLastError(null)

  const clientId = create_client_id()
  const url = new URL(WS_PATH, window.location.origin)
  url.searchParams.set("id", clientId)

  try {
    const socket = new WebSocket(url.toString())
    sharedWs = socket

    socket.onopen = () => {
      sharedReconnectAttempts = 0 // Reset reconnect attempts on successful connection
      setSharedStatus("connected")

      // Request current state
      const msg = new WSMessage("installer:get_state", {})
      socket.send(msg)
    }

    socket.onclose = (event) => {
      sharedWs = null

      // Check if this was a clean close or an unexpected one
      if (event.wasClean && sharedConnectionStatus === "disconnected") {
        // Intentional disconnect
        setSharedStatus("disconnected")
      } else {
        // Unexpected disconnect, attempt to reconnect
        setSharedStatus("failed")
        attemptSharedReconnect()
      }
    }

    socket.onerror = (error) => {
      setSharedLastError(error)
      setSharedStatus("error")
      // Note: onclose will be called after onerror, so we don't attempt reconnect here
    }

    socket.onmessage = async (ev: MessageEvent) => {
      try {
        const message = await WSMessage.parse(ev.data)
        if (!message) return

        // 🔔 NEW: dispatch to message listeners
        dispatchMessage(message)

        // Existing shared-state handling
        if (message.type === "installer:state") {
          console.log(message.data)
          setSharedSnapshot(message.data as InstallerSnapshot)
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error)
        setSharedLastError(error)
      }
    }
  } catch (error) {
    console.error("Failed to create WebSocket connection:", error)
    setSharedLastError(error)
    setSharedStatus("failed")
    attemptSharedReconnect()
  }
}

function attemptSharedReconnect() {
  if (sharedReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error("Max reconnection attempts reached")
    setSharedStatus("failed")
    return
  }

  sharedReconnectAttempts++
  console.log(
    `Attempting to reconnect... (${sharedReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
  )

  setSharedStatus("reconnecting")

  sharedReconnectTimer = window.setTimeout(() => {
    connectShared()
  }, RECONNECT_DELAY)
}

function disconnectShared() {
  setSharedStatus("disconnected")

  // Clear reconnect timer
  if (sharedReconnectTimer) {
    clearTimeout(sharedReconnectTimer)
    sharedReconnectTimer = null
  }

  sharedReconnectAttempts = 0

  if (sharedWs) {
    sharedWs.close(1000, "Client disconnected") // Normal closure
    sharedWs = null
  }
}

function sendSharedEvent(event: InstallerEvent) {
  if (!sharedWs || sharedWs.readyState !== WebSocket.OPEN) {
    const error = new Error("WebSocket is not connected")
    setSharedLastError(error)
    throw error
  }

  try {
    const msg = new WSMessage("installer:event", event)
    sharedWs.send(msg)
  } catch (error) {
    setSharedLastError(error)
    setSharedStatus("error")
    throw error
  }
}

export function useInstaller() {
  // Component-specific reactive state that syncs with shared state
  const snapshot = ref<InstallerState>(sharedSnapshot)
  const connectionStatus = ref<ConnectionStatus>(sharedConnectionStatus)
  const lastError = ref<unknown>(sharedLastError)
  const reconnectAttempts = ref(sharedReconnectAttempts)

  const status = computed(() => snapshot.value?.status ?? "idle")
  const currentStep = computed(() => snapshot.value?.currentStep)
  const pendingInteraction = computed<InteractionRequest | undefined>(
    () => snapshot.value?.pendingInteraction
  )

  // Computed properties for convenient status checks
  const isConnecting = computed(
    () =>
      connectionStatus.value === "connecting" ||
      connectionStatus.value === "reconnecting"
  )

  const isConnected = computed(() => connectionStatus.value === "connected")

  const isError = computed(
    () =>
      connectionStatus.value === "failed" || connectionStatus.value === "error"
  )

  const isDisconnected = computed(
    () => connectionStatus.value === "disconnected"
  )

  // Connection health check
  const connectionHealth = computed(() => {
    if (isConnected.value && sharedWs?.readyState === WebSocket.OPEN) {
      return "healthy"
    }
    if (isConnecting.value) {
      return "connecting"
    }
    if (isError.value) {
      return "unhealthy"
    }
    return "unknown"
  })

  // Update component state when shared state changes
  const updateComponentState = () => {
    snapshot.value = sharedSnapshot
    connectionStatus.value = sharedConnectionStatus
    lastError.value = sharedLastError
    reconnectAttempts.value = sharedReconnectAttempts
  }

  // Component-specific methods that delegate to shared methods
  function connect() {
    connectShared()
  }

  function disconnect() {
    disconnectShared()
  }

  function sendEvent(event: InstallerEvent) {
    sendSharedEvent(event)
  }

  // high-level actions
  function start() {
    sendEvent({ type: "START" })
  }

  function retry() {
    sendEvent({ type: "RETRY" })
  }

  function cancel() {
    sendEvent({ type: "CANCEL" })
  }
  function onMessage<T = any>(
    type: string | string[],
    handler: (data: T, message: WSMessage<string, T>) => void
  ) {
    const types = Array.isArray(type) ? type : [type]

    const wrapped: MessageHandler<T> = (message) => {
      handler(message.data as T, message)
    }

    types.forEach((t) => addMessageListener(t, wrapped))

    // Auto cleanup helper
    return () => {
      types.forEach((t) => removeMessageListener(t, wrapped))
    }
  }

  function provideFormInput(payload: { values: any; stepIndex: number }) {
    const interaction = pendingInteraction.value
    if (!interaction) {
      throw new Error("No pending interaction available")
    }

    sendEvent({
      type: "PROVIDE_INPUT",
      stepId: interaction.stepId,
      kind: interaction.kind,
      data: payload
    })
  }

  // Manual connection control
  function reconnect() {
    sharedReconnectAttempts = 0
    connect()
  }

  onMounted(() => {
    // Register this component to receive updates
    componentListeners.add(updateComponentState)

    // If this is the first component, connect
    if (componentListeners.size === 1 && sharedConnectionStatus === "idle") {
      connect()
    } else {
      // Sync with current shared state
      updateComponentState()
    }
  })

  onBeforeUnmount(() => {
    // Unregister this component
    componentListeners.delete(updateComponentState)

    // If this was the last component, disconnect
    if (componentListeners.size === 0) {
      disconnect()
    }
  })

  return {
    // State
    snapshot,
    connectionStatus,
    lastError,
    reconnectAttempts,

    // Computed
    status,
    currentStep,
    pendingInteraction,
    isConnecting,
    isConnected,
    isError,
    isDisconnected,
    connectionHealth,

    // Methods
    onMessage,
    connect,
    disconnect,
    reconnect,
    start,
    retry,
    cancel,
    provideFormInput
  }
}
