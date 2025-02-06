# superfetch

[![GitHub Workflow Status][gh-actions-img]][github-actions]
[![Codecov][cov-badge]][cov] [![][docs-badge]][docs]

HTTP Server testing library inspired by
[node-supertest-fetch](https://github.com/jwalton/node-supertest-fetch).

## Example

### Basic testing

```ts
import { describe, it } from 'jsr:@std/testing/bdd'
import { makeFetch } from 'jsr:@deno-libs/superfetch'

describe('makeFetch', () => {
  it('should work with HTTP handler', async () => {
    const handler = (res) => new Response('Hello World')

    const fetch = makeFetch(s)

    const res = await fetch('/')
    
    res.expect('Hello World')
  })

run()
```

### Full access to Response and port

```ts
import { describe, it } from 'jsr:@std/testing/bdd'
import { makeFetch } from 'jsr:@deno-libs/superfetch'

describe('makeFetch', () => {
  it('should work with HTTP handler', async () => {
    const handler = (res) => new Response('Hello World')

    const fetch = makeFetch(s)

    const res = await fetch('/')
    
    res.expect('Hello World')
    console.log(res) // server response object
    console.log(res.port) // port on which the server was listening
  })

run()
```

[gh-actions-img]: https://img.shields.io/github/actions/workflow/status/deno-libs/superfetch/main.yml?branch=master&style=for-the-badge&logo=github
[cov]: https://coveralls.io/github/deno-libs/superfetch
[github-actions]: https://github.com/deno-libs/superfetch/actions
[cov-badge]: https://img.shields.io/coverallsCoverage/github/deno-libs/superfetch?style=for-the-badge
[docs-badge]: https://img.shields.io/github/v/release/deno-libs/superfetch?color=yellow&label=Docs&logo=deno&style=for-the-badge
[docs]: https://doc.deno.land/https/deno.land/x/superfetch/mod.ts
