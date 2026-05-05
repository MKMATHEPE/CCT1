import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    realtime: {
      enabled: false,
    },
    global: {
      fetch: fetch // ensures no websocket fallback attempt
    }
  }
)

export default supabase
