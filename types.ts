export type Handler = (
  request: Request,
  connInfo: Deno.Conn,
) => Response | Promise<Response>

export type HandlerOrListener = Handler | Deno.Listener
