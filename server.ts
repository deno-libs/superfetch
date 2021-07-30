import * as http from 'https://deno.land/x/node_http@0.0.13/mod.ts'
import type { AddressInfo } from 'https://deno.land/x/node_http@0.0.13/mod.ts'

export default class Server {
  readonly _server: http.Server
  private readonly _startedServer: boolean = false
  readonly url: string

  private constructor(server: http.Server, address: AddressInfo, started: boolean) {
    this._server = server
    this._startedServer = started
    this.url = `http://localhost:${address.port}`
  }

  static create(server: http.Server): Promise<Server> {
    return new Promise((resolve, reject) => {
      server.once('error', reject)

      server.once('listening', () => {
        const address = server.address() as AddressInfo

        resolve(new Server(server, address, true))
      })

      server.listen()
    })
  }

  close() {
    if (this._startedServer) this._server.close()
  }
}
