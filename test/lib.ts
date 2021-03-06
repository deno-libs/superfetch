import { describe, it, beforeEach, expect, run } from 'https://deno.land/x/tincan@1.0.0/mod.ts'
import fetch, { makeFetch } from '../mod.ts'
import { http } from '../deps.ts'
import { App } from 'https://deno.land/x/tinyhttp@0.1.24/app.ts'
import { DenoStdNodeServer } from '../types.ts'

let server: DenoStdNodeServer,
  closed = 0

describe('superfetch', () => {
  beforeEach(() => {
    server = http.createServer((req, res) => {
      if (req.url === '/hello') {
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ greeting: 'Hello!' }))
      } else if (req.url === '/text') {
        res.end('Hello!')
      } else if (req.url === '/echo') {
        const chunks: string[] = []

        req.on('data', (data) => chunks.push(data.toString()))

        res
          .writeHead(200, {
            'content-type': req.headers['content-type'] || 'text/plain'
          })
          .end(chunks.join(''))
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

  it('should verify a JSON request', async () => {
    await fetch(server, '/hello')
      .expectStatus(200)
      .expectHeader('content-type', 'application/json')
      .expectBody({ greeting: 'Hello!' })

    expect(closed).toEqual(1)
  })
  it('should work with supertest API', async function () {
    await fetch(server, '/hello')
      .expect(200)
      .expect('content-type', 'application/json')
      .expect('content-type', /json/)
      .expect(200, { greeting: 'Hello!' })
      .end()
    expect(closed).toEqual(1)
  })

  it('should work with supertest API expect(body)', async function () {
    await fetch(server, '/hello').expect({ greeting: 'Hello!' }).end()
    expect(closed).toEqual(1)
  })

  it('should work with supertest API expect(body-regex)', async function () {
    await fetch(server, '/hello').expect(/Hello/).end()

    expect(closed).toEqual(1)
  })

  it('should verify a text request', async function () {
    await fetch(server, '/text').expectStatus(200).expectHeader('content-type', null).expectBody('Hello!')
    expect(closed).toEqual(1)
  })

  it('should not care about header case', async function () {
    await fetch(server, '/hello')
      .expectStatus(200)
      .expectHeader('Content-Type', 'application/json')
      .expectBody({ greeting: 'Hello!' })
    expect(closed).toEqual(1)
  })

  it('should fail if status code is incorrect', async () => {
    try {
      await fetch(server, '/hello')
        .expectStatus(404)
        .expectHeader('content-type', 'application/json')
        .expectBody({ greeting: 'Hello!' })
    } catch (e) {
      expect(e.message).toMatch('Request "GET /hello" should have status code 404')
    }

    expect(closed).toEqual(1)
  })

  it('should fail if header is incorrect', async () => {
    try {
      expect(
        await fetch(server, '/hello')
          .expectStatus(200)
          .expectHeader('content-type', 'text/plain')
          .expectBody({ greeting: 'Hello!' })
      )
    } catch (e) {
      expect(e.message).toMatch('Request "GET /hello" should have correct header content-type')
    }

    expect(closed).toEqual(1)
  })

  it('should fail if body is incorrect', async function () {
    try {
      expect(
        await fetch(server, '/hello')
          .expectStatus(200)
          .expectHeader('content-type', 'application/json')
          .expectBody({ greeting: 'Hello2!' })
      )
    } catch (e) {
      expect(e.message).toMatch('Request "GET /hello" should have expected JSON body')
    }
    expect(closed).toEqual(1)
  })

  it('should post data', async function () {
    const fetch = makeFetch(server)

    const body = '<hello>world</hello>'

    await fetch('/echo', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/xml' }
    })
      .expectStatus(200)
      .expectHeader('content-type', 'application/xml')
      .expectBody(body)
  })

  describe('makeFetch', function () {
    it('should generate a "fetch" function', async function () {
      const fetch = makeFetch(server)
      await fetch('/hello').expect(200).expect('content-type', 'application/json').expect({ greeting: 'Hello!' })

      expect(closed).toEqual(1)
    })

    it('should behave like WHATWG fetch', async function () {
      const fetch = makeFetch(server)
      const response = await fetch('/hello')
      expect(await response.json()).toEqual({ greeting: 'Hello!' })

      expect(closed).toEqual(1)
    })

    it('should mix-and-match', async function () {
      const fetch = makeFetch(server)
      const response = await fetch('/hello').expect(200).expect('content-type', 'application/json')

      expect(await response.json()).toEqual({ greeting: 'Hello!' })

      expect(closed).toEqual(1)
    })

    it('should recycle a server', async function () {
      const fetch = makeFetch(server)

      await fetch('/hello')
        .expectStatus(200)
        .expectHeader('content-type', 'application/json')
        .expectBody({ greeting: 'Hello!' })

      expect(closed).toEqual(1)

      await fetch('/hello')
        .expectStatus(200)
        .expectHeader('content-type', 'application/json')
        .expectBody({ greeting: 'Hello!' })

      expect(closed).toEqual(2)
    })

    it('should handle tinyhttp apps', async function () {
      const app = new App().get('/hello', (_, res) => res.json({ greeting: 'Hello!' }))

      const fetch = makeFetch(app.attach)

      await fetch('/hello').expectStatus(200).expectBody({ greeting: 'Hello!' })
    })
  })

  describe('server', function () {
    it('should recycle a server', async function () {
      await fetch(server, '/hello')
        .expectStatus(200)
        .expectHeader('content-type', 'application/json')
        .expectBody({ greeting: 'Hello!' })

      expect(closed).toEqual(1)

      await fetch(server, '/hello')
        .expectStatus(200)
        .expectHeader('content-type', 'application/json')
        .expectBody({ greeting: 'Hello!' })

      expect(closed).toEqual(2)
    })

    it('should close the server', async function () {
      await fetch(server, '/hello')
        .expectStatus(200)
        .expectHeader('content-type', 'application/json')
        .expectBody({ greeting: 'Hello!' })

      expect(closed).toEqual(1)
    })
  })

  describe('json convenience function', function () {
    it('should return JSON content', async function () {
      const result = await fetch(server, '/hello').expectStatus(200).json()
      expect(result).toEqual({ greeting: 'Hello!' })
      expect(closed).toEqual(1)
    })

    it('should not mask errors', async function () {
      try {
        await fetch(server, '/hello').expectStatus(404)
      } catch (e) {
        expect(e.message).toMatch('Request "GET /hello" should have status code 404')
      }

      expect(closed).toEqual(1)
    })
  })
})

run()
