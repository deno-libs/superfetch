import {
  describe,
  expect,
  it,
  run,
} from 'https://deno.land/x/tincan@1.0.1/mod.ts'
import { makeFetch } from './mod.ts'
import { Handler } from './types.ts'
import { AssertionError } from 'https://deno.land/std@0.182.0/testing/asserts.ts'

const tw = new TextDecoder()

describe('makeFetch', () => {
  it('should work with HTTP handler', async () => {
    const handler: Handler = () => new Response('Hello World')
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
    const handler: Handler = () => new Response(file,{headers: {'Content-Type': 'text/markdown'}})
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
    const handler: Handler = () => new Response("hello")
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expect("hello")

    
    const fetch_2 = makeFetch(handler)
    const res_2 = await fetch_2('/')
    res_2.expect("hello")
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
        'Values are not equal: expected to have status code 404 but was 200',
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
        'Values are not equal: expected to have header Content-Type with value text/plain, got text/html',
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
        'Expected actual: "text/html" to match: "/image/": expected header Content-Type to match regexp /image/, got text/html',
      )
    }
  })
  it('can expect array of header values', async () => {
    const handler: Handler = () =>
      new Response('Hello World', { headers: { 'A': '1,2,3' } })
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectHeader('A', ['1', '2', '3'])
  })
  it('expects if header is not present', async ()=> {
    const handler: Handler = () =>
      new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')
    res.expectHeader('A', null)
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
      expect((e as Error).message).toMatch(
        'Expected to have body Hello World?, got Hello World',
      )
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
        'headers': { 'Content-Type': 'text/plain' },
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

run()