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
  const remoteAddress = request.socket.remoteAddress ?? "unknown";
  const forwarded = request.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.trim()) {
    // Use the rightmost IP — this is the one appended by the trusted reverse
    // proxy (Railway/Render/etc.) and cannot be spoofed by the client.
    const ips = forwarded.split(",").map((ip) => ip.trim()).filter(Boolean);
    return ips[ips.length - 1] ?? remoteAddress;
  }

  return remoteAddress;
}

const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB

export async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json");
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new HttpError(413, "Request body too large");
    }
    chunks.push(buf);
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
