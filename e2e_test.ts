import { describe, it } from '@std/testing/bdd'
import { makeFetch } from './mod.ts'
import { GraphQLHTTP } from '@deno-libs/gql'
import { buildSchema } from 'graphql'

describe('e2e', () => {
  it('should work with GraphQL', async () => {
    const schema = buildSchema(`
      type Query {
        hello: String
      }
    `)

    const handler = GraphQLHTTP({
      schema,
      rootValue: { hello: () => 'Hello World!' },
    })

    const fetch = makeFetch(handler)

    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{hello}' }),
    })

    res.expectBody({ data: { hello: 'Hello World!' } })
  })
})
