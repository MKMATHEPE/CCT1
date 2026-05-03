import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.ts";

const supabaseServerKey =
  env.supabaseServiceRoleKey || env.supabaseAnonKey;

export const supabase = createClient(
  env.supabaseUrl,
  supabaseServerKey
);
