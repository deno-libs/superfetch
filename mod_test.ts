import { describe, it } from 'jsr:@std/testing@0.225.3/bdd'
import { expect } from 'jsr:@std/expect@0.224.5/expect'
import { makeFetch } from './mod.ts'
import type { Handler } from './types.ts'
import { AssertionError } from 'jsr:@std/assert@1.0.0/assertion-error'

// this simulates the listener
class PseudoListener {
  #listener: Deno.Listener
  addr: Deno.NetAddr | undefined
  adr = ''
  rid = 0
  ref = () => {}
  unref = () => {};
  [Symbol.asyncIterator]: unknown
  conn: Deno.Conn | undefined

  constructor(port: number) {
    if (port === 0) port = this.fetchRandomPort()
    this.#listener = Deno.listen({ port })
    this.addr = this.#listener.addr as Deno.NetAddr
    if (port === -1) this.addr.port = 0
    this.rid = this.#listener.rid
  }

  fetchRandomPort() {
    return Math.round(Math.random() * (9000 - 2000)) + 2000
  }

  accept = () => {
    // deno-lint-ignore no-async-promise-executor
    return new Promise<Deno.Conn>(async (resolve) => {
      this.conn = await this.#listener.accept()
      const httpConn = Deno.serveHttp(this.conn)
      const requestEvent = await httpConn.nextRequest()
      requestEvent?.respondWith(new Response('hello', { status: 200 }))
      resolve(this.conn)
    })
  }

  close = () => {
    return this.#listener.close()
  }
}

const tw = new TextDecoder()

describe('makeFetch', () => {
  it('should work with HTTP handler', async () => {
    const handler: Handler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expect('Hello World')
  })
  it('should not crash with text/plain', async () => {
    const handler: Handler = () =>
      new Response('Hello World', {
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
      })
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expect('Hello World')
  })
  it('should parse JSON if response is JSON', async () => {
    const handler: Handler = () =>
      new Response(JSON.stringify({ hello: 'world' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expect({ hello: 'world' })
  })
  it('should fallback to arraybuffer', async () => {
    const file = await Deno.readFile('README.md')
    const handler: Handler = () =>
      new Response(file, { headers: { 'Content-Type': 'text/markdown' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expect(tw.decode(file))
  })
  it('should return empty response if content-type is null', async () => {
    const handler: Handler = () => new Response(null)
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expect('')
  })
  it('should assign different ports if called many times', async () => {
    const handler: Handler = () => new Response('hello')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expect('hello')

    const fetch_2 = makeFetch(handler)
    const res_2 = await fetch_2('/')
    res_2.expect('hello')

    expect(res_2.port).not.toEqual(res.port)
  })
  it('should return port', async () => {
    const handler: Handler = () => new Response('hello')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expect('hello')

    expect(res.port).toBe(parseInt(res.url.split(':').slice(-1)[0]))
  })
})
describe('expectStatus', () => {
  it('should pass with a correct status', async () => {
    const handler: Handler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expectStatus(200)
  })
  it('should optionally check for status text', async () => {
    const handler: Handler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expectStatus(200, 'OK')
  })
  it('should throw on incorrect status', async () => {
    const handler: Handler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    try {
      res.expectStatus(404)
    } catch (e) {
      expect(e instanceof AssertionError).toBe(true)
      expect((e as Error).message).toMatch(
        new RegExp(
          'Values are not equal: expected to have status code 404 but was 200',
        ),
      )
    }
  })
})

describe('expectHeader', () => {
  it('should pass with a correct header value', async () => {
    const handler: Handler = () =>
      new Response('Hello World', { headers: { 'Content-Type': 'text/plain' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectHeader('Content-Type', 'text/plain')
  })
  it('supports regex', async () => {
    const handler: Handler = () =>
      new Response('Hello World', { headers: { 'Content-Type': 'text/plain' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectHeader('Content-Type', /text/)
  })
  it('throws if value is incorrect', async () => {
    const handler: Handler = () =>
      new Response('Hello World', { headers: { 'Content-Type': 'text/html' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    try {
      res.expectHeader('Content-Type', 'text/plain')
    } catch (e) {
      expect(e instanceof AssertionError).toBe(true)
      expect((e as Error).message).toMatch(
        new RegExp(
          'Values are not equal: expected to have header Content-Type with value text/plain, got text/html',
        ),
      )
    }
  })
  it('throws if does not match regex', async () => {
    const handler: Handler = () =>
      new Response('Hello World', { headers: { 'Content-Type': 'text/html' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    try {
      res.expectHeader('Content-Type', /image/)
    } catch (e) {
      expect((e as Error).message).toMatch(
        new RegExp(
          'Expected actual: "text/html" to match: "/image/": expected header Content-Type to match regexp /image/, got text/html',
        ),
      )
    }
  })
  it('throws if header does not exist and regex is passed', async () => {
    const handler: Handler = () =>
      new Response('Hello World', { headers: undefined })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    try {
      res.expectHeader('garbage-header', /image/)
    } catch (e) {
      expect((e as Error).message).toMatch(
        new RegExp('expected header null to not be empty'),
      )
    }
  })
  it('throws if header does not exist and array is passed', async () => {
    const handler: Handler = () =>
      new Response('Hello World', { headers: undefined })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    try {
      res.expectHeader('garbage-header', ['content-type', 'content-length'])
    } catch (e) {
      expect((e as Error).message).toMatch(
        new RegExp('expected header null to not be empty'),
      )
    }
  })
  it('can expect array of header values', async () => {
    const handler: Handler = () =>
      new Response('Hello World', { headers: { A: '1,2,3' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectHeader('A', ['1', '2', '3'])
  })
  it('expects if header is not present', async () => {
    const handler: Handler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectHeader('A', null)
  })
  it('should fallback to arraybuffer when formData is used', async () => {
    const form = new FormData()
    form.set('hello', 'world')
    const handler: Handler = () =>
      new Response(form, { headers: { 'Content-Type': 'multipart/form-data' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectHeader('Content-Type', 'multipart/form-data')
  })
})

describe('expectBody', () => {
  it('passes with correct body', async () => {
    const handler: Handler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectBody('Hello World')
  })
  it('throws on incorrect body', async () => {
    const handler: Handler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    try {
      res.expectBody('Hello World?')
    } catch (e) {
      expect(e).toBeDefined()
    }
  })
})

describe('expect', () => {
  it('uses expectStatus if first arg is number', async () => {
    const handler: Handler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expect(200)
  })
  it('uses expectHeader if two arguments', async () => {
    const handler: Handler = () =>
      new Response('Hello World', {
        headers: { 'Content-Type': 'text/plain' },
      })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expect('Content-Type', 'text/plain')
  })
  it('uses expectBody otherwise', async () => {
    const handler: Handler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expect('Hello World')
  })
})

describe('Deno listener', () => {
  it('should accept a listener', async () => {
    const fetch = makeFetch(new PseudoListener(0) as unknown as Deno.Listener)
    const res = await fetch('/')
    res.expectStatus(200).expectBody('hello')
  })
  it('should throw error if port is -1', async () => {
    const listener = new PseudoListener(-1)
    try {
      const fetch = makeFetch(listener as unknown as Deno.Listener)
      await fetch('/')
    } catch (e) {
      expect((e as Error).message).toMatch(new RegExp('Port cannot be found'))
      if (listener.conn?.rid) Deno.close(listener.conn?.rid + 1)
      listener.close()
    }
  })
})

describe('Port randomness', () => {
  it('should get a new port is already listening', async () => {
    const port = 10649
    let changed = false
    const l = Deno.listen({ port })
    globalThis.Math.random = () => {
      if (!changed) {
        changed = true
        return 0.2
      } else return 0.3
    }
    const handler: Handler = () => new Response('Hello World', { status: 200 })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectBody('Hello World')
    expect(res.port).toBe(15462)
    l.close()
  })
  it('should throw error if free port cannot be found', async () => {
    globalThis.Deno.listen = () => {
      throw new Error('bad error!')
    }
    const handler: Handler = () => new Response('Hello World', { status: 200 })
    try {
      const fetch = makeFetch(handler)
      await fetch('/')
    } catch (e) {
      expect((e as Error).message).toMatch(
        new RegExp('Unable to get free port'),
      )
    }
  })
})
