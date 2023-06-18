import { assertEquals, assertMatch } from './deps.ts'
import { Handler, HandlerOrListener } from './types.ts'

// credit - 'https://deno.land/x/free_port@v1.2.0/mod.ts'
function random(min: number, max: number): number {
  return Math.round(Math.random() * (max - min)) + min
}

// credit - 'https://deno.land/x/free_port@v1.2.0/mod.ts'
const getFreeListener = (
  port: number,
): { listener: Deno.Listener; port: number } => {
  try {
    const listener = Deno.listen({ port: port })
    return { listener, port }
  } catch (error) {
    if (error instanceof Deno.errors.AddrInUse) {
      const newPort = random(1024, 49151)
      return getFreeListener(newPort)
    }
  }
  throw Error
}

const fetchEndpoint = async (
  port: number,
  url: string | URL,
  params?: RequestInit,
) => {
  const res = await fetch(
    `http://localhost:${port}${url}`,
    params,
  )
  let data: unknown
  const ct = res.headers.get('Content-Type')
  if (ct === 'application/json') data = await res.json()
  else if (ct?.includes('text')) data = await res.text()
  else if (ct === null) data = await res.text()
  else data = await res.arrayBuffer()
  return { res, data }
}
const makeFetchPromise = (handlerOrListener: HandlerOrListener) => {
  if ('rid' in handlerOrListener && 'adr' in handlerOrListener) {
    // this might never get invoked because of Deno's blocking issue

    const port = (handlerOrListener.addr as Deno.NetAddr).port
    if (!port) {
      throw new Error('Port cannot be found')
    }
    const resp = async (url: URL | string = '', params?: RequestInit) => {
      const p = new Promise<{ res: Response; data?: unknown }>((resolve) => {
        setTimeout(async () => {
          const { res, data } = await fetchEndpoint(port, url, params)
          resolve({ res, data })
          Deno.close(conn.rid + 1)
          handlerOrListener.close()
        })
      })
      const conn = await handlerOrListener.accept()
      return p
    }
    return { resp, port }
  } else {
    const { listener, port } = getFreeListener(random(1024, 49151))
    const serve = async (conn: Deno.Conn) => {
      const requests = Deno.serveHttp(conn)
      const { request, respondWith } = (await requests.nextRequest())!

      const response = await (handlerOrListener as Handler)(request, conn)
      if (response) {
        respondWith(response)
      }
    }

    const resp = async (url: URL | string = '', params?: RequestInit) => {
      const connector = async () => {
        const conn = await listener.accept()
        await serve(conn)
        return conn
      }
      const connection = connector()
      const res = await fetchEndpoint(port, url, params)
      await connection.then((con) => Deno.close(con.rid + 1)).finally(() =>
        listener.close()
      )
      return res
    }
    return { resp, port }
  }
}

export const makeFetch = (h: HandlerOrListener) => {
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
      response: res,
      port,
    }
  }
  return fetch
}
