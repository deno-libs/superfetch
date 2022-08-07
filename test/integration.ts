import { describe, it, run } from 'https://deno.land/x/tincan@1.0.1/mod.ts'
import { http } from '../deps.ts'
import { App, Request } from 'https://deno.land/x/tinyhttp@0.1.24/mod.ts'
import { makeFetch } from '../mod.ts'

describe('makeFetch', () => {
  it('should work with std/http', async () => {
    const s = http.createServer((req, res) => res.end('Hello World'))

    const fetch = makeFetch(s)

    await fetch('/').expect('Hello World')
  })
  it('should work with tinyhttp', async () => {
    const s = new App().use((req, res) => res.end('Hello World'))

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
