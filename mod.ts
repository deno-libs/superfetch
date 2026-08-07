import { assertEquals, assertMatch, parseMediaType } from './deps.ts'
import type {
  FetchFunction,
  HandlerOrListener,
  MakeFetchResponse,
} from './types.ts'

/**
 * Resolve a caller-supplied path or URL against the test server's origin.
 *
 * Only the path, query and hash are taken from `url` — the origin is always
 * forced to the local test server, so `'/users?a=1'` and
 * `new URL('http://example.com/users?a=1')` both reach the handler under test.
 */
const toLocalUrl = (port: number, url: string | URL) => {
  const resolved = new URL(url, `http://localhost:${port}`)
  resolved.protocol = 'http:'
  resolved.hostname = 'localhost'
  resolved.port = `${port}`
  return resolved
}

const fetchEndpoint = async (
  port: number,
  url: string | URL,
  params?: RequestInit,
) => {
  const res = await fetch(toLocalUrl(port, url), params)
  let data: unknown
  const ct = res.headers.get('Content-Type')
  if (ct === null) return { data: await res.text(), res }
  const [mediaType] = parseMediaType(ct)

  if (mediaType === 'application/json') data = await res.json()
  else if (mediaType.includes('text')) data = await res.text()
  else data = await res.arrayBuffer()
  return { res, data }
}

type Responder = (
  url?: URL | string,
  params?: RequestInit,
) => Promise<{ res: Response; data?: unknown; port: number }>

const makeFetchPromise = (handlerOrListener: HandlerOrListener): Responder => {
  // The caller created this server and owns its lifecycle, so we only borrow
  // it — shutting it down here would break any further use of it.
  if ('addr' in handlerOrListener) {
    const { port } = handlerOrListener.addr
    return async (url = '', params?: RequestInit) => ({
      ...await fetchEndpoint(port, url, params),
      port,
    })
  }

  // A bare handler is ours to host. Serve it per request rather than once per
  // `makeFetch()`, so a single instance can be reused for more than one
  // request and an unused instance never leaves a server listening.
  return async (url = '', params?: RequestInit) => {
    const server = Deno.serve(
      { port: 0, onListen: () => {} },
      handlerOrListener,
    )
    const { port } = server.addr
    try {
      return { ...await fetchEndpoint(port, url, params), port }
    } finally {
      await server.shutdown()
    }
  }
}

export const makeFetch = (h: HandlerOrListener): FetchFunction => {
  const resp = makeFetchPromise(h)
  async function fetch(url: string | URL, options?: RequestInit) {
    const { res, data, port } = await resp(url, options)

    const expectStatus = (a: number, b?: string) => {
      assertEquals(
        res.status,
        a,
        `expected to have status code ${a} but was ${res.status}`,
      )
      if (typeof b !== 'undefined') {
        assertEquals(res.statusText, b)
      }
      return {
        expect: expectAll,
        expectStatus,
        expectHeader,
        expectBody,
      }
    }
    const expectHeader = (a: string, b: string | RegExp | null | string[]) => {
      const header = res.headers.get(a)

      if (b instanceof RegExp) {
        if (header === null) {
          throw new Error(`expected header ${header} to not be empty`)
        }
        assertMatch(
          header,
          b,
          `expected header ${a} to match regexp ${b}, got ${header}`,
        )
      } else if (Array.isArray(b)) {
        if (header === null) {
          throw new Error(`expected header ${header} to not be empty`)
        }
        assertEquals(
          header,
          b.join(','),
          `expected header ${a} to match ${b.join(', ')}, got ${header}`,
        )
      } else {
        assertEquals(
          header,
          b,
          `expected to have header ${a} ${
            header === null ? 'empty' : `with value ${b}, got ${header}`
          }`,
        )
      }
      return {
        expect: expectAll,
        expectStatus,
        expectHeader,
        expectBody,
      }
    }
    const expectBody = (a: unknown) => {
      if (a instanceof RegExp) {
        assertMatch(
          data as string,
          a,
          `Expected body to match regexp ${a}, got ${data}`,
        )
      } else assertEquals(data, a, `Expected to have body ${a}, got ${data}`)
    }

    // deno-lint-ignore no-explicit-any
    const expectAll = (a: unknown, b?: any) => {
      if (typeof a === 'number') {
        expectStatus(a, b)
      } else if (typeof a === 'string' && typeof b !== 'undefined') {
        expectHeader(a, b)
      } else {
        expectBody(a)
      }
      return {
        expect: expectAll,
        expectStatus,
        expectHeader,
        expectBody,
      }
    }
    const result = res as MakeFetchResponse
    result.port = port
    result.expectBody = expectBody
    result.expect = expectAll
    result.expectHeader = expectHeader
    result.expectStatus = expectStatus
    return result
  }
  return fetch
}
