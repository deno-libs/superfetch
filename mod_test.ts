import { describe, it, run, expect } from 'https://deno.land/x/tincan@1.0.1/mod.ts'
import { makeFetch } from './mod.ts'
import { Handler } from './types.ts'
import { AssertionError } from 'https://deno.land/std@0.182.0/testing/asserts.ts'

describe('makeFetch', () => {
  it('should work with HTTP handler', async () => {
    const handler: Handler = () => new Response('Hello World')
    const fetch = makeFetch(handler)
    const res = await fetch('/')

    res.expect('Hello World')
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
      expect((e as Error).message).toMatch('Values are not equal: expected to have status code 404 but was 200')
    }
  })
})

run()
