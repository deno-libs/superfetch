import { assertEquals, assertMatch, parseMediaType } from './deps.ts'
import type {
  FetchFunction,
  HandlerOrListener,
  MakeFetchResponse,
} from './types.ts'

const fetchEndpoint = async (
  port: number,
  url: string | URL,
  params?: RequestInit,
) => {
  const res = await fetch(`http://localhost:${port}${url}`, params)
  let data: unknown
  const ct = res.headers.get('Content-Type')
  if (ct === null) return { data: await res.text(), res }
  const [mediaType] = parseMediaType(ct)

  if (mediaType === 'application/json') data = await res.json()
  else if (mediaType.includes('text')) data = await res.text()
  else data = await res.arrayBuffer()
  return { res, data }
}
const makeFetchPromise = (handlerOrListener: HandlerOrListener) => {
  if ('addr' in handlerOrListener) {
    // this might never get invoked because of Deno's blocking issue

    const port = handlerOrListener.addr.port
    if (!port) {
      throw new Error('Port cannot be found')
    }
    const resp = (url: URL | string = '', params?: RequestInit) => {
      return new Promise<{ res: Response; data?: unknown }>((resolve) => {
        setTimeout(async () => {
          const { res, data } = await fetchEndpoint(port, url, params)
          resolve({ res, data })
          return handlerOrListener.shutdown()
        })
      })
    }
    return { resp, port }
  } else {
    const server = Deno.serve({ port: 0 }, handlerOrListener)
    const resp = async (url: URL | string = '', params?: RequestInit) => {
      const res = await fetchEndpoint(server.addr.port, url, params)
      await server.shutdown()
      return res
    }
    return { resp, port: server.addr.port }
  }
}

export const makeFetch = (h: HandlerOrListener): FetchFunction => {
  const { resp, port } = makeFetchPromise(h)
  async function fetch(url: string | URL, options?: RequestInit) {
    const { res, data } = await resp(url, options)

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
