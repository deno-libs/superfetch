import { describe, it, run, beforeEach, expect } from 'https://deno.land/x/tincan@1.0.1/mod.ts'
import fetch from '../mod.ts'
import { http } from '../deps.ts'
import { DenoStdNodeServer } from '../types.ts'

let server: DenoStdNodeServer,
  closed = 0

describe('supertest-fetch errors', function () {
  beforeEach(() => {
    server = http.createServer((req, res) => {
      if (req.url === '/hello') {
        res.writeHead(200, {
          'Content-Type': 'application/json'
        })
        res.end(JSON.stringify({ greeting: 'Hello!' }))
      } else if (req.url === '/hellotext') {
        res.end('Hello')
      } else if (req.url === '/err') {
        res.writeHead(400, {
          'Content-Type': req.headers['content-type'] || 'text/plain'
        })
        res.end('Boom!\nLong message\n')
      } else {
        res.writeHead(404, {}).end()
      }
    })

    closed = 0
    const origClose = server.close.bind(server)
    server.close = () => {
      closed++
      origClose()
      return server
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
          'body could not be parsed: SyntaxError: Unexpected token \'H\', "Hello" is not valid JSON'
      )
    }
  })
})

run()
