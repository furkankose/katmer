// common/utils/ws_utils.ts
import {
  isUint8Array,
  stringToUint8Array,
  uint8ArrayToString
} from "uint8array-extras"

export type WsMessageType = string

export interface WsPayload<
  TType extends WsMessageType = WsMessageType,
  TData = any
> {
  id: string
  type: TType
  data: TData
}

export class WSMessage<
  TType extends WsMessageType = WsMessageType,
  TData = any
> extends DataView<any> {
  id: string
  type: TType
  data: TData

  constructor(type: TType, data: TData, id?: string) {
    const generatedId =
      id ??
      (typeof Bun !== "undefined" ? Bun.randomUUIDv7()
      : (
        typeof globalThis !== "undefined" &&
        "crypto" in globalThis &&
        typeof (globalThis as any).crypto?.randomUUID === "function"
      ) ?
        (globalThis as any).crypto.randomUUID()
      : Math.random().toString(36).slice(2))

    const payload: WsPayload<TType, TData> = {
      id: generatedId,
      type,
      data
    }

    const bytes = stringToUint8Array(JSON.stringify(payload))
    super(bytes.buffer)

    this.id = payload.id
    this.type = payload.type
    this.data = payload.data
  }

  toJSON(): WsPayload<TType, TData> {
    return {
      id: this.id,
      type: this.type,
      data: this.data
    }
  }

  static async parse(
    raw: unknown
  ): Promise<WSMessage<WsMessageType, any> | undefined> {
    try {
      let payload: WsPayload

      if (typeof raw === "string") {
        payload = JSON.parse(raw)
      } else if (raw && typeof (raw as any).text === "function") {
        payload = JSON.parse(await (raw as any).text())
      } else if (isUint8Array(raw)) {
        payload = JSON.parse(uint8ArrayToString(raw))
      } else {
        throw new Error("unsupported message received")
      }

      return new WSMessage(payload.type, payload.data, payload.id)
    } catch (err) {
      console.error(err, raw)
      return undefined
    }
  }

  generateResponse<TResp = any>(data: TResp): string {
    const respType = `resp:${String(this.type)}` as WsMessageType
    return JSON.stringify(new WSMessage(respType, data, this.id))
  }
}
