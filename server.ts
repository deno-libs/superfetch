import { DenoStdNodeServer } from './types.ts'
type AddressInfo = {
  port: number
  address: string
}

export default class Server {
  readonly _server: DenoStdNodeServer
  private readonly _startedServer: boolean = false
  readonly url: string

  private constructor(server: DenoStdNodeServer, address: AddressInfo, started: boolean) {
    this._server = server
    this._startedServer = started
    this.url = `http://localhost:${address.port}`
  }

  static create(server: DenoStdNodeServer): Promise<Server> {
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
