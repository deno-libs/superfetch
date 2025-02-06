import { describe, it } from 'jsr:@std/testing@0.225.3/bdd'
import { makeFetch } from './mod.ts'
import { GraphQLHTTP } from 'https://deno.land/x/gql@3.0.1/mod.ts'
import { buildSchema } from 'npm:graphql@16.8.1'

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
