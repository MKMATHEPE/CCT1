import type { IncomingMessage, ServerResponse } from "node:http";

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown
) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

export function getUrl(request: IncomingMessage) {
  return new URL(request.url ?? "/", "http://localhost");
}

export function getClientIp(request: IncomingMessage) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return request.socket.remoteAddress ?? "unknown";
}

export async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new HttpError(400, "Missing request body");
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}
