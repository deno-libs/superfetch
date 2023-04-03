/** Information about the connection a request arrived on. */
export interface ConnInfo {
  /** The local address of the connection. */
  readonly localAddr: Deno.Addr
  /** The remote address of the connection. */
  readonly remoteAddr: Deno.Addr
}

export type Handler = (
  request: Request,
  connInfo: ConnInfo,
) => Response | Promise<Response>

export type HandlerOrListener = Handler | Deno.Listener
