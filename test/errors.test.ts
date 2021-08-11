import { describe, it, run, beforeEach, expect } from 'https://deno.land/x/tincan@0.2.1/mod.ts'
import fetch from '../mod.ts'
import { createServer, Server } from 'https://deno.land/x/node_http@0.0.15/mod.ts'

let server: Server,
  closed = 0

describe('supertest-fetch errors', function () {
  beforeEach(() => {
    server = createServer((req) => {
      if (req.url === '/hello') {
        req.respond({
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ greeting: 'Hello!' })
        })
      } else if (req.url === '/hellotext') {
        req.respond({ body: 'Hello' })
      } else if (req.url === '/err') {
        req.respond({
          headers: new Headers({ 'Content-Type': req.headers.get('content-type') || 'text/plain' }),
          status: 400,
          body: 'Boom!\nLong message\n'
        })
      } else {
        req.respond({ status: 404 })
      }
    })

    closed = 0
    const origClose = server.close.bind(server)
    server.close = () => {
      closed++
      origClose()
    }
  })

  it('should generate an error for a status code which includes the first line of the body', async function () {
    try {
      await fetch(server, '/err').expectStatus(200)
    } catch (err) {
      expect(err.message).toEqual('Request "GET /err" should have status code 200 but was 400 (body was: Boom!)')
      expect(err.expected).toEqual({ status: '200' })
      expect(err.actual).toEqual({
        body: 'Boom!\nLong message\n',
        status: '400'
      })
    }
  })

  it('should generate an error for a status code, with an expectBody', async function () {
    try {
      await fetch(server, '/err').expectBody(/.*/).expectStatus(200)
    } catch (err) {
      expect(err.message).toEqual('Request "GET /err" should have status code 200 but was 400 (body was: Boom!)')
    }
  })

  it('should generate a meaninful error when we are expecting JSON but get back text', async function () {
    try {
      await fetch(server, '/hellotext').expectBody({ message: 'hello' })
    } catch (err) {
      expect(err.message).toEqual(
        'Request "GET /hellotext" should have JSON body but ' +
          'body could not be parsed: SyntaxError: Unexpected token H in JSON at position 0'
      )
    }
  })
})

run()
