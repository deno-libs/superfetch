export type HandlerOrListener =
  | Deno.ServeHandler
  | Deno.HttpServer<Deno.NetAddr>

export type MakeFetchResponse = { port: number } & Response & Expect

export type FetchFunction = (
  url: string | URL,
  options?: RequestInit,
) => Promise<MakeFetchResponse>

export type Expect = {
  expectStatus: (a: number, b?: string) => Expect
  expectHeader: (a: string, b: string | RegExp | null | string[]) => Expect
  expectBody: (a: unknown) => void
  expect: (a: unknown, b?: unknown) => Expect
}
