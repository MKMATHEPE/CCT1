import type { IncomingMessage, ServerResponse } from "node:http";
import { createManualClaim, createManualClaimsBulk, listClaimsWithDevices } from "../db/claimRepository.ts";
import {
  createDashboardClaim,
  createDashboardSearch,
  getDashboardStats,
  listDashboardClaims,
  listDashboardSearches,
} from "../db/dashboardRepository.ts";
import {
  authenticateUser,
  createAdminUser,
  createClientUser,
  deleteClientUser,
  listClientUsers,
  revokeSession,
  updateClientUser,
} from "../services/authService.ts";
import { logger } from "../lib/logger.ts";
import { HttpError, getClientIp, getUrl, readJsonBody, sendJson } from "../lib/http.ts";
import { getAuthenticatedRequestUser } from "../lib/requestAuth.ts";
import { registerRequest } from "../services/rateLimitService.ts";
import { applyCors } from "../middleware/cors.ts";
import { applySecurityHeaders } from "../middleware/securityHeaders.ts";
import { checkLoginAllowed, recordLoginFailure, clearLoginFailures } from "../services/loginGuard.ts";
import { searchClaims } from "../services/searchService.ts";
import type { BulkManualClaimInput, ManualClaimInput, SearchMode } from "../types/domain.ts";

function requireAdmin(user: Awaited<ReturnType<typeof getAuthenticatedRequestUser>>) {
  if (!user || user.userRole !== "admin") {
    throw new HttpError(403, "Admin access is required.");
  }
}

function getDashboardScope(
  url: URL,
  authenticatedUser: NonNullable<Awaited<ReturnType<typeof getAuthenticatedRequestUser>>>
) {
  const scopeUserId = url.searchParams.get("scopeUserId")?.trim();
  const scopeInsurerId = url.searchParams.get("scopeInsurerId")?.trim();

  if (scopeUserId || scopeInsurerId) {
    requireAdmin(authenticatedUser);

    return {
      userId: scopeUserId || authenticatedUser.userId,
      insurerId: scopeInsurerId || authenticatedUser.insurerId,
    };
  }

  return {
    userId: authenticatedUser.userId,
    insurerId: authenticatedUser.insurerId,
  };
}

function mapManualOutcome(outcome: ManualClaimInput["outcome"]) {
  if (outcome === "approved") return "APPROVED" as const;
  if (outcome === "rejected") return "REJECTED" as const;
  return "PENDING" as const;
}

function normalizeManualClaimInput(body: ManualClaimInput) {
  const trimmedImei = body.imei.trim();
  const trimmedSerial = body.serial.trim();
  const trimmedDeviceName = body.deviceName.trim();
  const trimmedInsurer = body.insurer.trim();
  const normalizedAmount = Number(body.amount);
  const trimmedDateOfLoss = body.dateOfLoss?.trim() ?? "";

  if (!trimmedImei && !trimmedSerial) {
    throw new HttpError(400, "Either IMEI or serial number is required.");
  }

  if (
    !trimmedDeviceName ||
    !trimmedInsurer ||
    !trimmedDateOfLoss ||
    !Number.isFinite(normalizedAmount)
  ) {
    throw new HttpError(400, "Missing required claim fields.");
  }

  if (normalizedAmount <= 0) {
    throw new HttpError(400, "Claim amount must be greater than 0.");
  }

  const parsedDateOfLoss = new Date(trimmedDateOfLoss);
  if (Number.isNaN(parsedDateOfLoss.getTime())) {
    throw new HttpError(400, "Invalid date of loss.");
  }

  return {
    imei: trimmedImei,
    serial: trimmedSerial,
    deviceName: trimmedDeviceName,
    insurer: trimmedInsurer,
    outcome: mapManualOutcome(body.outcome),
    dateOfLoss: parsedDateOfLoss.toISOString(),
    reason: body.reason.trim() || null,
    amount: normalizedAmount,
  };
}

export async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  const url = getUrl(request);
  const method = request.method ?? "GET";
  const ip = getClientIp(request);

  applySecurityHeaders(response);
  if (applyCors(request, response)) return;
  registerRequest(ip, url.pathname);

  try {
    if (method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, { status: "ok" });
    }

    if (method === "POST" && url.pathname === "/auth/login") {
      const guard = checkLoginAllowed(ip);
      if (!guard.allowed) {
        response.setHeader("Retry-After", String(guard.retryAfterSeconds));
        logger.warn("auth.login.blocked", { ip });
        return sendJson(response, 429, {
          error: "Too many failed login attempts. Please try again later.",
          retryAfterSeconds: guard.retryAfterSeconds,
        });
      }

      const body = await readJsonBody<{ username?: string; password?: string }>(request);
      const username = body.username?.trim() ?? "";
      const password = body.password?.trim() ?? "";

      if (!username || !password) {
        throw new HttpError(400, "Username and password are required.");
      }

      try {
        const session = await authenticateUser(username, password);
        clearLoginFailures(ip);
        logger.info("auth.login.success", { username, userId: session.user.id, ip });
        return sendJson(response, 200, session);
      } catch (loginError) {
        if (loginError instanceof HttpError && loginError.statusCode === 401) {
          recordLoginFailure(ip);
          logger.warn("auth.login.failure", { username, ip });
        }
        throw loginError;
      }
    }

    if (method === "GET" && url.pathname === "/auth/session") {
      const authenticatedUser = await getAuthenticatedRequestUser(request, {
        required: true,
      });
      if (!authenticatedUser) {
        throw new HttpError(401, "Authentication is required.");
      }

      return sendJson(response, 200, {
        user: {
          id: authenticatedUser.userId,
          name: authenticatedUser.name,
          role: authenticatedUser.userRole,
          insurerId: authenticatedUser.insurerId,
          insurerName: authenticatedUser.insurerName,
        },
      });
    }

    if (method === "POST" && url.pathname === "/auth/logout") {
      const authorization = request.headers.authorization;
      const token =
        typeof authorization === "string" && authorization.startsWith("Bearer ")
          ? authorization.slice(7).trim()
          : "";

      if (token) {
        await revokeSession(token);
      }

      return sendJson(response, 200, { success: true });
    }

    if (method === "GET" && url.pathname === "/auth/users") {
      const authenticatedUser = await getAuthenticatedRequestUser(request, {
        required: true,
      });
      requireAdmin(authenticatedUser);
      const users = await listClientUsers();
      return sendJson(response, 200, { users });
    }

    if (method === "POST" && url.pathname === "/auth/users") {
      const authenticatedUser = await getAuthenticatedRequestUser(request, {
        required: true,
      });
      requireAdmin(authenticatedUser);

      const body = await readJsonBody<{
        insurerName?: string;
        username?: string;
        password?: string;
        role?: string;
      }>(request);

      if (body.role === "admin") {
        const user = await createAdminUser({
          name: body.username ?? "",
          insurerName: body.insurerName ?? "",
          username: body.username ?? "",
          password: body.password ?? "",
        });
        logger.info("auth.user.created", {
          username: body.username ?? "",
          role: "admin",
          createdBy: authenticatedUser!.userId,
          ip,
        });
        return sendJson(response, 201, { user });
      }

      const user = await createClientUser({
        insurerName: body.insurerName ?? "",
        username: body.username ?? "",
        password: body.password ?? "",
      });
      logger.info("auth.user.created", {
        username: body.username ?? "",
        role: "client",
        createdBy: authenticatedUser!.userId,
        ip,
      });
      return sendJson(response, 201, { user });
    }

    const authUserMatch = url.pathname.match(/^\/auth\/users\/([^/]+)$/);
    if (authUserMatch && method === "PATCH") {
      const authenticatedUser = await getAuthenticatedRequestUser(request, {
        required: true,
      });
      requireAdmin(authenticatedUser);

      const body = await readJsonBody<{
        insurerName?: string;
        username?: string;
        password?: string;
      }>(request);
      const user = await updateClientUser(authUserMatch[1], {
        insurerName: body.insurerName ?? "",
        username: body.username ?? "",
        password: body.password ?? "",
      });

      return sendJson(response, 200, { user });
    }

    if (authUserMatch && method === "DELETE") {
      const authenticatedUser = await getAuthenticatedRequestUser(request, {
        required: true,
      });
      requireAdmin(authenticatedUser);
      const deletedUserId = authUserMatch[1];
      await deleteClientUser(deletedUserId);
      logger.info("auth.user.deleted", {
        userId: deletedUserId,
        deletedBy: authenticatedUser!.userId,
        ip,
      });
      return sendJson(response, 200, { success: true });
    }

    if (method === "GET" && url.pathname === "/api/search") {
      const authenticatedUser = await getAuthenticatedRequestUser(request, {
        required: true,
      });
      const mode = (url.searchParams.get("mode") ?? "imei") as SearchMode;
      const query = url.searchParams.get("query") ?? "";
      const result = await searchClaims(mode, query);
      sendJson(response, 200, result);

      if (authenticatedUser) {
        const { insurerId, userId } = authenticatedUser;
        void createDashboardSearch({
          imei: query,
          resultFound: result.claims.length > 0,
          insurerId,
          userId,
        }).catch((error) => {
          logger.warn("dashboard_search_write_failed", {
            insurerId,
            userId,
            query,
            message: error instanceof Error ? error.message : "Unexpected error",
          });
        });
      }

      return;
    }

    if (method === "GET" && url.pathname === "/api/claims") {
      await getAuthenticatedRequestUser(request, {
        required: true,
      });
      const claims = await listClaimsWithDevices();
      return sendJson(response, 200, { claims });
    }

    if (method === "POST" && url.pathname === "/api/claims") {
      const authenticatedUser = await getAuthenticatedRequestUser(request, {
        required: true,
      });
      const body = await readJsonBody<ManualClaimInput>(request);
      const claim = await createManualClaim(normalizeManualClaimInput(body));

      if (!claim) {
        throw new HttpError(409, "Claim already exists.");
      }

      sendJson(response, 201, { success: true, claim });

      if (authenticatedUser) {
        const { insurerId, userId } = authenticatedUser;
        void createDashboardClaim({
          imei: claim.imei_serial,
          claimAmount: claim.claim_amount,
          status: claim.outcome,
          insurerId,
          userId,
        }).catch((error) => {
          logger.warn("dashboard_claim_write_failed", {
            insurerId,
            userId,
            claimId: claim.id,
            message: error instanceof Error ? error.message : "Unexpected error",
          });
        });
      }

      return;
    }

    if (method === "POST" && url.pathname === "/api/claims/bulk") {
      const authenticatedUser = await getAuthenticatedRequestUser(request, {
        required: true,
      });
      const body = await readJsonBody<BulkManualClaimInput>(request);
      const claimInputs = Array.isArray(body.claims) ? body.claims : [];

      if (claimInputs.length === 0) {
        throw new HttpError(400, "No claims provided.");
      }

      const normalizedClaims = claimInputs.map((claim, index) => {
        try {
          return normalizeManualClaimInput(claim);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Invalid claim payload.";
          throw new HttpError(400, `Row ${index + 2}: ${message}`);
        }
      });

      const result = await createManualClaimsBulk(normalizedClaims);
      sendJson(response, 200, { success: true, ...result });

      if (authenticatedUser && result.claims.length > 0) {
        const { insurerId, userId } = authenticatedUser;
        void Promise.all(
          result.claims.map((claim) =>
            createDashboardClaim({
              imei: claim.imei_serial,
              claimAmount: claim.claim_amount,
              status: claim.outcome,
              insurerId,
              userId,
            })
          )
        ).catch((error) => {
          logger.warn("dashboard_bulk_claim_write_failed", {
            insurerId,
            userId,
            processed: result.claims.length,
            message: error instanceof Error ? error.message : "Unexpected error",
          });
        });
      }

      return;
    }

    if (method === "GET" && url.pathname === "/dashboard/claims") {
      const authenticatedUser = await getAuthenticatedRequestUser(request, { required: true });
      if (!authenticatedUser) {
        throw new HttpError(401, "Authenticated insurer context is required.");
      }
      const scope = getDashboardScope(url, authenticatedUser);
      const claims = await listDashboardClaims(
        scope.insurerId,
        scope.userId
      );

      return sendJson(response, 200, {
        claims: claims.map((claim) => ({
          id: claim.id,
          imei: claim.imei,
          claim_amount: claim.claimAmount,
          status: claim.status,
          created_at: claim.createdAt,
          insurer_id: claim.insurerId,
          user_id: claim.userId,
        })),
      });
    }

    if (method === "GET" && url.pathname === "/dashboard/searches") {
      const authenticatedUser = await getAuthenticatedRequestUser(request, { required: true });
      if (!authenticatedUser) {
        throw new HttpError(401, "Authenticated insurer context is required.");
      }
      const scope = getDashboardScope(url, authenticatedUser);
      const searches = await listDashboardSearches(
        scope.insurerId,
        scope.userId
      );

      return sendJson(response, 200, {
        searches: searches.map((search) => ({
          id: search.id,
          imei: search.imei,
          searched_at: search.searchedAt,
          result_found: search.resultFound,
          insurer_id: search.insurerId,
          user_id: search.userId,
        })),
      });
    }

    if (method === "GET" && url.pathname === "/dashboard/stats") {
      const authenticatedUser = await getAuthenticatedRequestUser(request, { required: true });
      if (!authenticatedUser) {
        throw new HttpError(401, "Authenticated insurer context is required.");
      }
      const scope = getDashboardScope(url, authenticatedUser);
      const stats = await getDashboardStats(
        scope.insurerId,
        scope.userId
      );

      return sendJson(response, 200, stats);
    }

    throw new HttpError(404, "Route not found");
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Unexpected error";

    if (statusCode >= 500) {
      logger.error("request_failed", {
        path: url.pathname,
        method,
        message,
      });
    } else {
      logger.warn("request_rejected", {
        path: url.pathname,
        method,
        message,
      });
    }

    return sendJson(response, statusCode, {
      error: message,
    });
  }
}
