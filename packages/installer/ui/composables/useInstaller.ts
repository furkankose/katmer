import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import type {
  InstallerSnapshot,
  InstallerEvent,
  InteractionRequest
} from "@common/installer_engine.types"
import { WSMessage } from "@common/utils/ws.utils"

type InstallerState = InstallerSnapshot | null

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed"
  | "disconnected"
  | "error"

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

let sharedWs: WebSocket | null = null
let sharedReconnectAttempts = 0
let sharedReconnectTimer: number | null = null
let sharedConnectionStatus: ConnectionStatus = "idle"
let sharedSnapshot: InstallerState = null
let sharedLastError: unknown = null

const componentListeners = new Set<Function>()
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 2000

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
  console.log(message.id, message.data)
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
  // console.log(`WebSocket status: ${status}`) // Optional logging
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

function waitForMessage<T>(
  type: string,
  traceId: string,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    let timer: number | null = null

    const handler: MessageHandler<T> = (message) => {
      if (message.id === traceId) {
        if (timer) clearTimeout(timer)
        removeMessageListener(type, handler)
        resolve(message.data)
      }
    }

    // Set timeout to prevent hanging forever
    timer = window.setTimeout(() => {
      removeMessageListener(type, handler)
      reject(new Error(`Timeout waiting for server message: ${type}`))
    }, timeoutMs)

    addMessageListener(type, handler)
  })
}

function connectShared() {
  if (
    sharedWs &&
    (sharedWs.readyState === WebSocket.CONNECTING ||
      sharedWs.readyState === WebSocket.OPEN)
  ) {
    return
  }
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
      sharedReconnectAttempts = 0
      setSharedStatus("connected")
      const msg = new WSMessage("installer:get_state", {})
      socket.send(msg)
    }

    socket.onclose = (event) => {
      sharedWs = null
      if (event.wasClean && sharedConnectionStatus === "disconnected") {
        setSharedStatus("disconnected")
      } else {
        setSharedStatus("failed")
        attemptSharedReconnect()
      }
    }

    socket.onerror = (error) => {
      setSharedLastError(error)
      setSharedStatus("error")
    }

    socket.onmessage = async (ev: MessageEvent) => {
      try {
        const message = await WSMessage.parse(ev.data)
        if (!message) return

        dispatchMessage(message)

        if (message.type === "installer:state") {
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
    setSharedStatus("failed")
    return
  }
  sharedReconnectAttempts++
  setSharedStatus("reconnecting")
  sharedReconnectTimer = window.setTimeout(() => {
    connectShared()
  }, RECONNECT_DELAY)
}

function disconnectShared() {
  setSharedStatus("disconnected")
  if (sharedReconnectTimer) {
    clearTimeout(sharedReconnectTimer)
    sharedReconnectTimer = null
  }
  sharedReconnectAttempts = 0
  if (sharedWs) {
    sharedWs.close(1000, "Client disconnected")
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
    return msg
  } catch (error) {
    setSharedLastError(error)
    setSharedStatus("error")
    throw error
  }
}

export function useInstaller() {
  const snapshot = ref<InstallerState>(sharedSnapshot)
  const connectionStatus = ref<ConnectionStatus>(sharedConnectionStatus)
  const lastError = ref<unknown>(sharedLastError)
  const reconnectAttempts = ref(sharedReconnectAttempts)

  const status = computed(() => snapshot.value?.status ?? "idle")
  const currentStep = computed(() => snapshot.value?.currentStep)
  const pendingInteraction = computed<InteractionRequest | undefined>(
    () => snapshot.value?.pendingInteraction
  )

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

  const connectionHealth = computed(() => {
    if (isConnected.value && sharedWs?.readyState === WebSocket.OPEN)
      return "healthy"
    if (isConnecting.value) return "connecting"
    if (isError.value) return "unhealthy"
    return "unknown"
  })

  const updateComponentState = () => {
    snapshot.value = sharedSnapshot
    connectionStatus.value = sharedConnectionStatus
    lastError.value = sharedLastError
    reconnectAttempts.value = sharedReconnectAttempts
  }

  function connect() {
    connectShared()
  }
  function disconnect() {
    disconnectShared()
  }
  function sendEvent(event: InstallerEvent) {
    return sendSharedEvent(event)
  }
  function reconnect() {
    sharedReconnectAttempts = 0
    connect()
  }

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
    return () => {
      types.forEach((t) => removeMessageListener(t, wrapped))
    }
  }

  /**
   * Sends an event and awaits a specific response type from the server.
   * Useful for flow control where you need confirmation before UI updates.
   */
  async function sendEventAwait<T = any>(
    event: InstallerEvent,
    responseType: string = "installer:state",
    timeoutMs: number = 120000
  ): Promise<T> {
    // Register listener BEFORE sending to avoid race conditions
    const msg = sendEvent(event)
    return waitForMessage<T>(responseType, msg.id, timeoutMs)
  }

  async function provideFormInput(payload: { values: any; stepIndex: number }) {
    const interaction = pendingInteraction.value
    if (!interaction) {
      throw new Error("No pending interaction available")
    }

    // Prepare the event
    const event: InstallerEvent = {
      type: "PROVIDE_INPUT",
      stepId: interaction.stepId,
      kind: interaction.kind,
      data: payload
    }

    // Send and wait for state update
    // We expect the server to emit "installer:state" after processing input
    return await sendEventAwait<InstallerSnapshot>(event, "installer:state")
  }

  onMounted(() => {
    componentListeners.add(updateComponentState)
    if (componentListeners.size === 1 && sharedConnectionStatus === "idle") {
      connect()
    } else {
      updateComponentState()
    }
  })

  onBeforeUnmount(() => {
    componentListeners.delete(updateComponentState)
    if (componentListeners.size === 0) {
      disconnect()
    }
  })

  return {
    snapshot,
    connectionStatus,
    lastError,
    reconnectAttempts,
    status,
    currentStep,
    pendingInteraction,
    isConnecting,
    isConnected,
    isError,
    isDisconnected,
    connectionHealth,
    onMessage,
    connect,
    disconnect,
    reconnect,
    start,
    retry,
    cancel,
    provideFormInput, // Now returns Promise<InstallerSnapshot>
    sendEventAwait // Exposed generic helper
  }
}
