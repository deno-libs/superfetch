import { getFreePort } from 'https://deno.land/x/free_port@v1.2.0/mod.ts'

setInterval(async () => {
  console.log(await getFreePort(3000))
}, 1000)