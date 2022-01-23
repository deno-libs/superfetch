import { http } from './deps.ts'

export type ServerHandler = (req: http.IncomingMessageForServer, res: http.ServerResponse) => void

export type DenoStdNodeServer = ReturnType<typeof http.createServer>
