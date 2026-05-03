const DEFAULT_PORT = 8787;
const DEFAULT_PORT_SEARCH_LIMIT = 20;
const DEFAULT_CACHE_TTL_HOURS = 24;
const DEFAULT_DB_FILE = "server/data/cct-db.json";
const DEFAULT_DASHBOARD_DB_DIR = "server/data/dashboard";
const DEFAULT_AUTH_USERS_FILE = "server/data/auth-users.json";
const DEFAULT_DB_PROVIDER = "auto";

function parseNumber(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const parsed = Number.parseInt(input, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(input: string | undefined) {
  return (input ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseNumber(process.env.PORT, DEFAULT_PORT),
  portSearchLimit: parseNumber(process.env.PORT_SEARCH_LIMIT, DEFAULT_PORT_SEARCH_LIMIT),
  cacheTtlHours: parseNumber(process.env.CACHE_TTL_HOURS, DEFAULT_CACHE_TTL_HOURS),
  dbProvider: process.env.DB_PROVIDER ?? DEFAULT_DB_PROVIDER,
  dbFile: process.env.CCT_DB_FILE ?? DEFAULT_DB_FILE,
  dashboardDbDir: process.env.DASHBOARD_DB_DIR ?? DEFAULT_DASHBOARD_DB_DIR,
  authUsersFile: process.env.AUTH_USERS_FILE ?? DEFAULT_AUTH_USERS_FILE,
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabasePublishableKey:
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  corsAllowedOrigins: parseList(process.env.CORS_ALLOWED_ORIGINS),
  allowedOrigins: process.env.ALLOWED_ORIGINS ?? "http://localhost:5173",
  authSeedUsersJson: process.env.AUTH_SEED_USERS_JSON ?? "",
  rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMaxRequests: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 60),
};
