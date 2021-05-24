import { describe, it, } from 'https://deno.land/x/tincan/mod.ts'
import { createServer } from 'https://deno.land/x/node_http@0.0.6/mod.ts'
import { App } from 'https://deno.land/x/tinyhttp@0.1.6/app.ts'
import { ServerRequest } from 'https://deno.land/std@0.97.0/http/server.ts'
import { makeFetch } from '../mod.ts'

export default function() {
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
  })
}
