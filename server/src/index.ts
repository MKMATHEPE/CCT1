import "dotenv/config";
import { createServer } from "node:http";
import { env } from "./config/env.ts";
import { findAvailablePort } from "./lib/port.ts";
import { logger } from "./lib/logger.ts";
import { handleRequest } from "./routes/router.ts";

const PORT = env.port;

function getAllowedOrigin(originHeader: string | undefined) {
  const origin = originHeader?.trim();

  if (!origin) {
    return null;
  }

  if (env.corsAllowedOrigins.includes(origin)) {
    return origin;
  }

  if (env.nodeEnv !== "production") {
    return origin;
  }

  return null;
}

console.log("Starting backend...");
console.log("Environment loaded:", Boolean(process.env.SUPABASE_URL));
if (
  !process.env.SUPABASE_URL ||
  (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)
) {
  console.warn(
    "Warning: SUPABASE_URL or a backend Supabase key is missing."
  );
}

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

async function startServer() {
  const server = createServer((request, response) => {
    const requestHeaders =
      request.headers["access-control-request-headers"] ??
      "Content-Type, Authorization";
    const allowedOrigin = getAllowedOrigin(
      typeof request.headers.origin === "string" ? request.headers.origin : undefined
    );

    if (allowedOrigin) {
      response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Headers", requestHeaders);
      response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }

    if (request.method === "OPTIONS") {
      response.writeHead(allowedOrigin ? 204 : 403);
      response.end();
      return;
    }
    void handleRequest(request, response);
  });

  try {
    let selectedPort = PORT;

    try {
      selectedPort = await findAvailablePort(PORT, env.portSearchLimit);
    } catch (error) {
      console.error("Failed to find available port:", error);
      process.exit(1);
    }

    if (selectedPort !== PORT) {
      console.warn(
        `Port ${PORT} is in use. Falling back to http://localhost:${selectedPort}`
      );
    }

    server.listen(selectedPort, "0.0.0.0", () => {
      logger.info("api_server_started", {
        port: selectedPort,
        cacheTtlHours: env.cacheTtlHours,
        dbProvider: env.dbProvider,
        supabaseConfigured: Boolean(
          env.supabaseUrl &&
            (env.supabaseServiceRoleKey || env.supabaseAnonKey)
        ),
        supabaseServiceRoleConfigured: Boolean(env.supabaseServiceRoleKey),
        databaseUrlConfigured: Boolean(env.databaseUrl),
      });

      console.log(`Server running on port ${selectedPort}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

await startServer();
