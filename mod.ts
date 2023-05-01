import { assertEquals, assertMatch, getFreePort } from './deps.ts'
import { HandlerOrListener } from './types.ts'

const port = await getFreePort(8080)

const makeFetchPromise = (handlerOrListener: HandlerOrListener) => {
  // listener
  if ('rid' in handlerOrListener && 'addr' in handlerOrListener) {
    return async (url: URL | string = '', params?: RequestInit) => {
      const p = new Promise<{ res: Response; data?: unknown }>((resolve) => {
        setTimeout(async () => {
          const res = await fetch(
            `http://localhost:${port}${url}`,
            params,
          )
          let data: unknown
          const ct = res.headers.get('Content-Type')
          if (ct === 'application/json') data = await res.json()
          else if (ct?.includes('text')) data = await res.text()
          else data = await res.arrayBuffer()

          resolve({ res, data })
          Deno.close(conn.rid + 1)
          handlerOrListener.close()
        })
      })
      const conn = await handlerOrListener.accept()
      return p
    }
  } // (req, conn) => Response listener
  else {
    const listener = Deno.listen({ port, hostname: 'localhost' })

    const serve = async (conn: Deno.Conn) => {
      const requests = Deno.serveHttp(conn)
      const { request, respondWith } = (await requests.nextRequest())!
      const response = await handlerOrListener(request, conn)
      if (response) {
        respondWith(response)
      }
    }

    return async (url: URL | string = '', params?: RequestInit) => {
      const p = new Promise<{ res: Response; data?: unknown }>((resolve) => {
        setTimeout(async () => {
          const res = await fetch(
            `http://localhost:${port}${url}`,
            params,
          )
          let data: unknown
          const ct = res.headers.get('Content-Type')
          if (ct === 'application/json') data = await res.json()
          else if (ct?.includes('text')) data = await res.text()
          else data = await res.arrayBuffer()

          resolve({ res, data })
          Deno.close(conn.rid + 1)
          listener.close()
        })
      })
      const conn = await listener.accept()
      await serve(conn)
      return p
    }
  }
}

export const makeFetch = (h: HandlerOrListener) => {
  const resp = makeFetchPromise(h)
  async function fetch(url: string | URL, options?: RequestInit) {
    const { data, res } = await resp(url, options)
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
      } else if (
        Array.isArray(b)
      ) {
        if (header === null) {
          throw new Error(`expected header ${header} to not be empty`)
        }
        assertEquals(
          header,
          b.join(','),
          `expected header ${a} to match regexp ${b}, got ${header}`,
        )
      } else {
        assertEquals(
          header,
          b,
          `expected to have header ${a} ${header === null ? 'empty' : `with value ${b}, got ${header}`}`,
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
      assertEquals(data, a, `Expected to have body ${a}, got ${data}`)
    }

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

    return {
      expect: expectAll,
      expectStatus,
      expectHeader,
      expectBody,
    }
  }
  return fetch
}
