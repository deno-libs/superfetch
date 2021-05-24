# superfetch

[![GitHub Workflow Status][gh-actions-img]][github-actions]
[![Codecov][codecov-badge]][codecov] [![][docs-badge]][docs]

[Superdeno](https://github.com/asos-craigmorten/superdeno)-like superagent testing library based on Fetch API. Ported from [node-supertest-fetch](https://github.com/jwalton/node-supertest-fetch).

## Example

```ts
import { describe, it, run } from 'https://deno.land/x/tincan/mod.ts'
import { App } from 'https://deno.land/x/tinyhttp@0.1.6/app.ts'
import { makeFetch } from 'https://deno.land/x/superfetch/mod.ts'
import { ServerRequest } from 'https://deno.land/std@0.97.0/http/server.ts'

describe('makeFetch', () => {
  it('should work with tinyhttp', async () => {
    const s = new App().use((req) => req.respond({ body: 'Hello World' }))

    const fetch = makeFetch(s.attach as (req: ServerRequest) => void)

    await fetch('/').expect('Hello World')
  })
})

run()
```

[gh-actions-img]: https://img.shields.io/github/workflow/status/deno-libs/superfetch/CI?style=flat-square
[codecov]: https://codecov.io/gh/deno-libs/superfetch
[github-actions]: https://github.com/deno-libs/superfetch/actions
[codecov-badge]: https://img.shields.io/codecov/c/gh/deno-libs/superfetch?style=flat-square
[docs-badge]: https://img.shields.io/github/v/release/deno-libs/node_http?color=yellow&label=Docs&logo=deno&style=flat-square
[docs]: https://doc.deno.land/https/deno.land/x/node_http/mod.ts
