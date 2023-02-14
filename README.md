# superfetch

[![GitHub Workflow Status][gh-actions-img]][github-actions]
[![Codecov][codecov-badge]][codecov] [![][docs-badge]][docs]

[Superdeno](https://github.com/asos-craigmorten/superdeno)-like superagent testing library based on Fetch API. Ported from [node-supertest-fetch](https://github.com/jwalton/node-supertest-fetch).

## Example

```ts
import { describe, it, run } from 'https://deno.land/x/tincan@1.0.0/mod.ts'
import { http } from 'https://deno.land/std@0.151.0/node/http.ts'
import { makeFetch } from 'https://x.nest.land/superfetch@0.1.6/mod.ts'

describe('makeFetch', () => {
  it('should work with std/http', async () => {
    const s = http.createServer((req, res) => res.end('Hello World'))

    const fetch = makeFetch(s)

    await fetch('/').expect('Hello World')
  })

run()
```

[gh-actions-img]: https://img.shields.io/github/actions/workflow/status/deno-libs/superfetch/main.yml?branch=master&style=for-the-badge&logo=github
[codecov]: https://codecov.io/gh/deno-libs/superfetch
[github-actions]: https://github.com/deno-libs/superfetch/actions
[codecov-badge]: https://img.shields.io/codecov/c/gh/deno-libs/superfetch?style=for-the-badge
[docs-badge]: https://img.shields.io/github/v/release/deno-libs/superfetch?color=yellow&label=Docs&logo=deno&style=for-the-badge
[docs]: https://doc.deno.land/https/deno.land/x/superfetch/mod.ts
