import { describe, it, run } from 'https://deno.land/x/tincan@0.2.1/mod.ts'
import { createServer } from 'https://deno.land/x/node_http@0.0.8/mod.ts'
import { App } from 'https://deno.land/x/tinyhttp@0.1.11/mod.ts'
import { ServerRequest } from 'https://deno.land/std@0.98.0/http/server.ts'
import { makeFetch } from '../mod.ts'

describe('makeFetch', () => {
  it('should work with node_http', async () => {
    const s = createServer((req) => req.respond({ body: 'Hello World' }))

    const fetch = makeFetch(s)

    await fetch('/').expect('Hello World')
  })
  it('should work with tinyhttp', async () => {
    const s = new App().use((req) => req.respond({ body: 'Hello World' }))

    const fetch = makeFetch(s.attach as (req: ServerRequest) => void)

    await fetch('/').expect('Hello World')
  })
  it('should assert headers without asserting body', async () => {
    const s = new App().use((_req, res) => {
      res.setHeader('abc', 'def')
      res.end('')
    })

    const fetch = makeFetch(s.attach as (req: ServerRequest) => void)

    await fetch('/').expect('abc', 'def').end()
  })
})

run()
