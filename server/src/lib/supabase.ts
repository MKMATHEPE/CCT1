import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { env } from "../config/env.ts";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey || env.supabaseAnonKey,
  {
    realtime: {
      transport: ws,
    },
  }
);
