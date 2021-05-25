import { run } from 'https://deno.land/x/tincan/mod.ts'

import integration from './integration.ts'
import lib from './lib.ts'

integration()
lib()

run()
