import { createServer, Server as httpServer, ServerHandler } from 'https://deno.land/x/node_http@0.0.6/mod.ts'

import Server from './server.ts'
import Test from './test.ts'

export { Test }

/**
 * Fetch a resource from a server, returns a Test.
 *
 * @param server - The server to fetch from.  If the server is not already
 * listening, this function will start it listening and then will close the
 * server at the end of the test.
 * @param url - A Request or a string representing a relative URL.  Same as
 * WHATWG Fetch.  URL should be relative to the server (e.g. '/foo/bar').
 * @param options - Same as WHATWG Fetch.
 * @returns - a Test, which is like a Promise<Response>, but it also
 *   has 'exepect' methods on it.
 */
export default function fetch(server: httpServer, url: string | Request, init?: RequestInit): Test {
  const pServer = Server.create(server)
  return new Test(pServer, url, init)
}

export type FetchFunction = (url: string | Request, init?: RequestInit | undefined) => Test

/**
 * Creates a `fetch` function for a server.
 *
 * @param server - The server to fetch from.  If the server is not already
 * listening, th server will be started before each call to `fetch()`, and
 * closed after each call.
 * @returns - a `fetch(url, options)` function, compatible with WHATWG
 *  fetch, but which returns `Test` objects.
 */
export function makeFetch<Req extends any = any>(
  target: httpServer | ServerHandler | ((req: Req) => void)
): FetchFunction {
  // if we were given an express app
  const server = typeof target === 'function' ? createServer(target as any) : target

  return function fetch(url: string | Request, init?: RequestInit) {
    const pServer = Server.create(server)

    return new Test(pServer, url, init)
  }
}
