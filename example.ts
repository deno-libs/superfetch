import { makeFetch } from './mod.ts'

const handler: Deno.ServeHandler = (req) => {
  const url = new URL(req.url).pathname
  if (url === '/') return new Response('hello')
  else if (url === '/status') {
    return new Response('teapot', { status: 418 })
  } else if (url === '/header') {
    return new Response('teapot', {
      status: 418,
      headers: { 'Coffee-Allowed': 'No' },
    })
  }
  return new Response('Not Found', { status: 404 })
}

const fetch = makeFetch(handler)

for (const url of ['/', '/status', '/header']) {
  const res = await fetch(url)
  if (url === '/') {
    res.expectStatus(200).expect('hello')
  } else if (url === '/status') {
    res.expect('teapot').expectStatus(418)
  } else if (url === '/header') {
    res.expect('Coffee-Allowed', 'No').expectStatus(418).expectHeader(
      'Tea-Allowed',
      null,
    ).expectBody('teapot')
  }
}
