import type { ServerWebSocket } from "bun"

import { WSMessage } from "@common/utils/ws.utils"
import type {
  InstallerEnvironment,
  InstallerEvent,
  InstallerSnapshot
} from "@common/installer_engine.types"
import { InstallerEngine } from "../installer_engine"
import type { InstallerConfig } from "@type/installer"

import ui_html from "../../index.html"
import favicon from "../assets/favicon.svg" with { type: "text" }
import type { CliRuntimeOptions } from "@type/cli"
import { resolveInstaller } from "../installers/resolve_installer"

type ws_server_data = {
  id: string
}

type session = {
  ws: ServerWebSocket<ws_server_data>
  engine: InstallerEngine
  unsubscribe: () => void
}

function to_installer_event(message: WSMessage): InstallerEvent | null {
  if (message.type !== "installer:event") return null
  return message.data as InstallerEvent
}

export async function start_web_runner(
  installerConfig: InstallerConfig,
  cliOpts: CliRuntimeOptions
): Promise<void> {
  const sessions = new Map<string, session>()
  const log_clients: ServerWebSocket<any>[] = []

  const engine = resolveInstaller(installerConfig, {
    logger: {
      log(level: string, message: string) {
        for (const logClient of log_clients) {
          logClient.send(new WSMessage("installer:log", { level, message }))
        }
      }
    }
  })
  await engine.initialize()

  function create_session(
    id: string,
    ws: ServerWebSocket<ws_server_data>
  ): session {
    const unsubscribe = engine.onTransition((snapshot: InstallerSnapshot) => {
      ws.send(new WSMessage("installer:state", snapshot as any))
    })

    const sess: session = { ws, engine, unsubscribe }
    sessions.set(id, sess)
    return sess
  }

  function get_or_attach_session(
    id: string,
    ws: ServerWebSocket<ws_server_data>
  ): session {
    const existing = sessions.get(id) || create_session(id, ws)

    existing.unsubscribe()
    const { engine } = existing
    const unsubscribe = engine.onTransition(
      (snapshot: InstallerSnapshot, traceId?: string) => {
        ws.send(new WSMessage("installer:state", snapshot as any, traceId))
      }
    )

    const updated: session = { ws, engine, unsubscribe }
    sessions.set(id, updated)

    ws.send(new WSMessage("installer:state", engine.getSnapshot() as any))

    return updated
  }

  const server = Bun.serve<ws_server_data>({
    port: cliOpts.port,
    fetch(req, server) {
      const url = new URL(req.url)

      if (url.pathname === "/api") {
        const id = url.searchParams.get("id") || Bun.randomUUIDv7()
        const success = server.upgrade(req, { data: { id } })
        return success ? undefined : (
            new Response("WebSocket upgrade error", { status: 400 })
          )
      }

      if (url.pathname.startsWith("/favicon.")) {
        return new Response(favicon, {
          headers: {
            "content-type": "image/svg+xml"
          }
        })
      }

      if (process.env.NODE_ENV !== "development") {
        return new Response(ui_html as any, {
          headers: {
            "content-type": "text/html; charset=utf-8;"
          }
        })
      }

      return new Response(null, { status: 404 })
    },
    websocket: {
      data: {} as ws_server_data,
      idleTimeout: 600,
      sendPings: true,
      maxPayloadLength: 1024 * 1024 * 24,

      async open(ws) {
        log_clients.push(ws)
        const id = ws.data.id
        get_or_attach_session(id, ws)
      },

      // inside websocket.message in server/ws_server.ts
      async message(ws, raw_message) {
        if (raw_message === "ping") {
          ws.send("pong")
          return
        }

        const message = await WSMessage.parse(raw_message)
        if (!message) return

        try {
          // 1) installer events
          const installer_event =
            message.type === "installer:event" ?
              (message.data as InstallerEvent)
            : null

          if (installer_event) {
            installer_event.$id = message.id
            const sess = sessions.get(ws.data.id)
            if (!sess) {
              ws.send(
                new WSMessage(
                  "error:installer",
                  { error: "session_not_found", id: ws.data.id },
                  message.id
                )
              )
              return
            }

            await sess.engine.send(installer_event)
            return
          }

          // 2) explicit state request
          if (message.type === "installer:get_state") {
            const sess = sessions.get(ws.data.id)
            if (!sess) {
              ws.send(
                new WSMessage(
                  "error:installer",
                  { error: "session_not_found", id: ws.data.id },
                  message.id
                )
              )
              return
            }

            ws.send(message.generateResponse(sess.engine.getSnapshot() as any))
            return
          }

          // 3) unknown message type
          ws.send(
            new WSMessage(
              `error:${String(message.type || "unknown")}`,
              { error: "invalid_message_type", type: message.type },
              message.id
            )
          )
        } catch (err: any) {
          const body =
            err instanceof Error ? { error: err.name, message: err.message }
            : typeof err === "string" ? { message: err }
            : err && typeof err.toJSON === "function" ? err.toJSON()
            : err

          ws.send(
            new WSMessage(
              `error:${String(message?.type || "unknown")}`,
              body,
              message?.id
            )
          )
          console.error(err)
        }
      },
      close(ws) {
        const idx = log_clients.findIndex((c) => c === ws)
        if (idx >= 0) {
          log_clients.splice(idx, 1)
        }

        const id = ws.data.id
        const sess = sessions.get(id)
        if (sess) {
          sess.unsubscribe()
          sessions.delete(id)
        }
      }
    }
  })

  console.debug(`listening on ${server.hostname}:${server.port}`)
}
