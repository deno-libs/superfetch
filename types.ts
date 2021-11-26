import { http } from './deps.ts'

export type ServerHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void
