import type { IncomingMessage } from "node:http";
import { HttpError } from "./http.ts";
import { getUserForSessionToken } from "../services/authService.ts";

export type AuthenticatedRequestUser = {
  userId: string;
  userRole: string | null;
  insurerId: string;
  insurerName: string;
  name: string;
};

function readHeader(request: IncomingMessage, name: string) {
  const value = request.headers[name];
  return typeof value === "string" ? value.trim() : "";
}

function readBearerToken(request: IncomingMessage) {
  const authorization = readHeader(request, "authorization");
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

export async function getAuthenticatedRequestUser(
  request: IncomingMessage,
  options?: { required?: boolean }
): Promise<AuthenticatedRequestUser | null> {
  const token = readBearerToken(request);

  if (!token) {
    if (options?.required) {
      throw new HttpError(401, "Authentication is required.");
    }

    return null;
  }

  const session = await getUserForSessionToken(token);
  if (!session) {
    if (options?.required) {
      throw new HttpError(401, "Your session is invalid or has expired.");
    }

    return null;
  }

  return {
    userId: session.user.id,
    userRole: session.user.role,
    insurerId: session.user.insurerId,
    insurerName: session.user.insurerName,
    name: session.user.name,
  };
}
