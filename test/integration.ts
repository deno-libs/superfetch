import { describe, it, run } from 'https://deno.land/x/tincan@1.0.0/mod.ts'
import { createServer } from 'https://deno.land/x/node_http@0.0.16/mod.ts'
import { App, Request } from 'https://deno.land/x/tinyhttp@0.1.24/mod.ts'
import { makeFetch } from '../mod.ts'

describe('makeFetch', () => {
  it('should work with node_http', async () => {
    const s = createServer((req) => req.respond({ body: 'Hello World' }))

    const fetch = makeFetch(s)

    await fetch('/').expect('Hello World')
  })
  it('should work with tinyhttp', async () => {
    const s = new App().use((req) => req.respond({ body: 'Hello World' }))

    const fetch = makeFetch<Request>(s.attach)

    await fetch('/').expect('Hello World')
  })
  it('should assert headers without asserting body', async () => {
    const s = new App().use((_req, res) => {
      res.setHeader('abc', 'def')
      res.end('')
    })

    const fetch = makeFetch<Request>(s.attach)

    await fetch('/').expect('abc', 'def').end()
  })
})

run()
