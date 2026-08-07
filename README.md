# superfetch

[![GitHub Workflow Status][gh-actions-img]][github-actions]
[![Codecov][cov-badge]][cov] [![][docs-badge]][docs]

HTTP Server testing library inspired by
[node-supertest-fetch](https://github.com/jwalton/node-supertest-fetch).

## Install

```sh
deno add jsr:@deno-libs/superfetch
```

## Example

### Basic testing

Pass a `Deno.ServeHandler` to `makeFetch` and it returns a `fetch` function
bound to a throwaway server hosting that handler.

```ts
import { describe, it } from 'jsr:@std/testing/bdd'
import { makeFetch } from 'jsr:@deno-libs/superfetch'

describe('makeFetch', () => {
  it('should work with an HTTP handler', async () => {
    const handler: Deno.ServeHandler = () => new Response('Hello World')

    const fetch = makeFetch(handler)

    const res = await fetch('/')

    res.expect('Hello World')
  })
})
```

### Assertions

`expectStatus`, `expectHeader` and `expect` are chainable. `expectBody` ends a
chain.

```ts
const handler: Deno.ServeHandler = () =>
  new Response('teapot', {
    status: 418,
    headers: { 'Content-Type': 'text/plain' },
  })

const fetch = makeFetch(handler)
const res = await fetch('/')

res
  .expectStatus(418)
  .expectHeader('Content-Type', /text/)
  .expectHeader('Coffee-Allowed', null) // assert a header is absent
  .expectBody('teapot')
```

`expect` dispatches on its arguments: a number checks the status, two arguments
check a header, anything else checks the body.

```ts
res.expect(418) // same as expectStatus(418)
res.expect('Content-Type', 'text/plain') // same as expectHeader(...)
res.expect('teapot') // same as expectBody('teapot')
```

The body is decoded from the response `Content-Type`: `application/json` is
parsed as JSON, `text/*` as text, anything else as an `ArrayBuffer`.

```ts
const handler: Deno.ServeHandler = () =>
  new Response(JSON.stringify({ hello: 'world' }), {
    headers: { 'Content-Type': 'application/json' },
  })

const res = await makeFetch(handler)('/')

res.expectBody({ hello: 'world' })
```

### Requests

The first argument is a path, and the second is a regular
[`RequestInit`](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit).

```ts
const res = await fetch('/users?limit=10', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'deno' }),
})
```

A single `fetch` can be reused for as many requests as you like.

```ts
const fetch = makeFetch(handler)

for (const path of ['/', '/status', '/header']) {
  const res = await fetch(path)
  res.expectStatus(200)
}
```

### Full access to Response and port

The returned object is a real `Response` with the assertion helpers and the port
attached.

```ts
const res = await fetch('/')

res.expect('Hello World')
console.log(res.status) // 200
console.log(res.headers.get('Content-Type'))
console.log(res.port) // port the handler was served on
```

Note that the body has already been read in order to run the assertions, so
`res.json()` / `res.text()` cannot be called again.

### Testing an existing server

`makeFetch` also accepts a `Deno.HttpServer`. The server is yours, so superfetch
leaves it running — shut it down when you are done.

```ts
const server = Deno.serve({ port: 0, onListen: () => {} }, handler)

const fetch = makeFetch(server)
const res = await fetch('/')

res.expectStatus(200).expectBody('Hello World')

await server.shutdown()
```

[gh-actions-img]: https://img.shields.io/github/actions/workflow/status/deno-libs/superfetch/main.yml?branch=master&style=for-the-badge&logo=github
[cov]: https://coveralls.io/github/deno-libs/superfetch
[github-actions]: https://github.com/deno-libs/superfetch/actions
[cov-badge]: https://img.shields.io/coverallsCoverage/github/deno-libs/superfetch?style=for-the-badge
[docs-badge]: https://img.shields.io/jsr/v/@deno-libs/superfetch?color=yellow&label=Docs&logo=deno&style=for-the-badge
[docs]: https://jsr.io/@deno-libs/superfetch/doc
