import { describe, it } from '@std/testing/bdd'
import { expect } from '@std/expect/expect'
import { makeFetch } from './mod.ts'
import { AssertionError } from '@std/assert/assertion-error'

const tw = new TextDecoder()

describe('makeFetch', () => {
  it('should work with HTTP handler', async () => {
    const handler: Deno.ServeHandler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expect('Hello World')
  })
  it('should not crash with text/plain', async () => {
    const handler: Deno.ServeHandler = () =>
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
    const handler: Deno.ServeHandler = () =>
      new Response(JSON.stringify({ hello: 'world' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expect({ hello: 'world' })
  })
  it('should fallback to arraybuffer', async () => {
    const file = await Deno.readFile('README.md')
    const handler: Deno.ServeHandler = () =>
      new Response(file, { headers: { 'Content-Type': 'text/markdown' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expect(tw.decode(file))
  })
  it('should return empty response if content-type is null', async () => {
    const handler: Deno.ServeHandler = () => new Response(null)
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expect('')
  })
  it('should assign different ports if called many times', async () => {
    const handler: Deno.ServeHandler = () => new Response('hello')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expect('hello')

    const fetch_2 = makeFetch(handler)
    const res_2 = await fetch_2('/')
    res_2.expect('hello')

    expect(res_2.port).not.toEqual(res.port)
  })
  it('should return port', async () => {
    const handler: Deno.ServeHandler = () => new Response('hello')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expect('hello')

    expect(res.port).toBe(parseInt(res.url.split(':').slice(-1)[0]))
  })
})
describe('expectStatus', () => {
  it('should pass with a correct status', async () => {
    const handler: Deno.ServeHandler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expectStatus(200)
  })
  it('should optionally check for status text', async () => {
    const handler: Deno.ServeHandler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expectStatus(200, 'OK')
  })
  it('should throw on incorrect status', async () => {
    const handler: Deno.ServeHandler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    expect(() => res.expectStatus(404)).toThrow(AssertionError)
    expect(() => res.expectStatus(404)).toThrow(
      'expected to have status code 404 but was 200',
    )
  })
})

describe('expectHeader', () => {
  it('should pass with a correct header value', async () => {
    const handler: Deno.ServeHandler = () =>
      new Response('Hello World', { headers: { 'Content-Type': 'text/plain' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectHeader('Content-Type', 'text/plain')
  })
  it('supports regex', async () => {
    const handler: Deno.ServeHandler = () =>
      new Response('Hello World', { headers: { 'Content-Type': 'text/plain' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectHeader('Content-Type', /text/)
  })
  it('throws if value is incorrect', async () => {
    const handler: Deno.ServeHandler = () =>
      new Response('Hello World', { headers: { 'Content-Type': 'text/html' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    expect(() => res.expectHeader('Content-Type', 'text/plain')).toThrow(
      AssertionError,
    )
    expect(() => res.expectHeader('Content-Type', 'text/plain')).toThrow(
      'expected to have header Content-Type with value text/plain, got text/html',
    )
  })
  it('throws if does not match regex', async () => {
    const handler: Deno.ServeHandler = () =>
      new Response('Hello World', { headers: { 'Content-Type': 'text/html' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    expect(() => res.expectHeader('Content-Type', /image/)).toThrow(
      'expected header Content-Type to match regexp /image/, got text/html',
    )
  })
  it('throws if header does not exist and regex is passed', async () => {
    const handler: Deno.ServeHandler = () =>
      new Response('Hello World', { headers: undefined })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    expect(() => res.expectHeader('garbage-header', /image/)).toThrow(
      'expected header null to not be empty',
    )
  })
  it('throws if header does not exist and array is passed', async () => {
    const handler: Deno.ServeHandler = () =>
      new Response('Hello World', { headers: undefined })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    expect(() =>
      res.expectHeader('garbage-header', ['content-type', 'content-length'])
    ).toThrow('expected header null to not be empty')
  })
  it('can expect array of header values', async () => {
    const handler: Deno.ServeHandler = () =>
      new Response('Hello World', { headers: { A: '1,2,3' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectHeader('A', ['1', '2', '3'])
  })
  it('expects if header is not present', async () => {
    const handler: Deno.ServeHandler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectHeader('A', null)
  })
  it('should fallback to arraybuffer when formData is used', async () => {
    const form = new FormData()
    form.set('hello', 'world')
    const handler: Deno.ServeHandler = () =>
      new Response(form, { headers: { 'Content-Type': 'multipart/form-data' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectHeader('Content-Type', 'multipart/form-data')
  })
})

describe('expectBody', () => {
  it('passes with correct body', async () => {
    const handler: Deno.ServeHandler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectBody('Hello World')
  })
  it('throws on incorrect body', async () => {
    const handler: Deno.ServeHandler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    expect(() => res.expectBody('Hello World?')).toThrow(AssertionError)
  })
  it('supports regex', async () => {
    const handler: Deno.ServeHandler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectBody(new RegExp('Hello'))
  })
})

describe('expect', () => {
  it('uses expectStatus if first arg is number', async () => {
    const handler: Deno.ServeHandler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expect(200)
  })
  it('uses expectHeader if two arguments', async () => {
    const handler: Deno.ServeHandler = () =>
      new Response('Hello World', {
        headers: { 'Content-Type': 'text/plain' },
      })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expect('Content-Type', 'text/plain')
  })
  it('uses expectBody otherwise', async () => {
    const handler: Deno.ServeHandler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expect('Hello World')
  })
})

describe('Deno.HttpServer', () => {
  it('should accept an HTTP server', async () => {
    const server = Deno.serve(
      { port: 0, onListen: () => {} },
      () => new Response('hello'),
    )
    const fetch = makeFetch(server)
    const res = await fetch('/')
    res.expectStatus(200).expectBody('hello')
    await server.shutdown()
  })
  it('should leave the caller-owned server running between requests', async () => {
    const server = Deno.serve(
      { port: 0, onListen: () => {} },
      () => new Response('hello'),
    )
    const fetch = makeFetch(server)

    for (const _ of [1, 2, 3]) {
      const res = await fetch('/')
      res.expectStatus(200).expectBody('hello')
      expect(res.port).toBe(server.addr.port)
    }

    await server.shutdown()
  })
})

describe('reuse', () => {
  it('should serve more than one request from a single makeFetch', async () => {
    const handler: Deno.ServeHandler = (req) =>
      new Response(new URL(req.url).pathname)
    const fetch = makeFetch(handler)

    for (const path of ['/', '/status', '/header']) {
      const res = await fetch(path)
      res.expectStatus(200).expectBody(path)
    }
  })
  it('should not leave a server listening if never called', () => {
    const handler: Deno.ServeHandler = () => new Response('hello')
    makeFetch(handler)
  })
})

describe('url handling', () => {
  it('should accept a URL object', async () => {
    const handler: Deno.ServeHandler = (req) =>
      new Response(new URL(req.url).pathname)
    const fetch = makeFetch(handler)
    const res = await fetch(new URL('http://example.com/hello'))
    res.expectStatus(200).expectBody('/hello')
  })
  it('should preserve the query string and hash', async () => {
    const handler: Deno.ServeHandler = (req) =>
      new Response(new URL(req.url).search)
    const fetch = makeFetch(handler)
    const res = await fetch('/search?q=deno&page=2')
    res.expectStatus(200).expectBody('?q=deno&page=2')
  })
})

describe('Port randomness', () => {
  it('should get a new port is already listening', async () => {
    const port = 10649
    const l = Deno.listen({ port })
    const handler: Deno.ServeHandler = () =>
      new Response('Hello World', { status: 200 })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectBody('Hello World')
    expect(res.port).not.toBe(port)
    l.close()
  })
})
