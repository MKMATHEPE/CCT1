import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.ts";
import { HttpError } from "../lib/http.ts";
import { logger } from "../lib/logger.ts";
import {
  deleteExpiredSessions,
  deleteSession,
  deleteSessionsByUserId,
  deleteUser,
  findSessionByToken,
  findUserById,
  findUserByUsername,
  insertSession,
  insertUser,
  listUsers,
  mutateAuthDatabase,
  readAuthDatabase,
  shouldUseFileStore,
  updateSessionLastSeen,
  updateUser,
} from "../db/authStore.ts";
import type {
  AuthRole,
  AuthUser,
  PublicClientUser,
  PublicUser,
  SessionRecord,
} from "../types/auth.ts";
import type { AuthUserRow } from "../db/authStore.ts";

const SESSION_TTL_HOURS = 12;

function hasSupabaseCreds(): boolean {
  return !!(
    env.supabaseUrl.trim() &&
    (env.supabaseServiceRoleKey || env.supabaseAnonKey).trim()
  );
}

type CreateClientUserInput = {
  insurerName: string;
  username: string;
  password: string;
};

type CreateAdminUserInput = {
  name: string;
  insurerName: string;
  username: string;
  password: string;
};

type UpdateClientUserInput = {
  insurerName: string;
  username: string;
  password: string;
};

type SeedUser = {
  name: string;
  username: string;
  password: string;
  role: AuthRole;
  insurerName: string;
};

function parseSeedUsers(): SeedUser[] {
  if (!env.authSeedUsersJson.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(env.authSeedUsersJson) as Partial<SeedUser>[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      const name = entry.name?.trim();
      const username = entry.username?.trim();
      const password = entry.password?.trim();
      const role = entry.role;
      const insurerName = entry.insurerName?.trim();

      if (
        !name ||
        !username ||
        !password ||
        !insurerName ||
        (role !== "admin" && role !== "client")
      ) {
        return [];
      }

      return [{ name, username, password, role, insurerName }];
    });
  } catch {
    return [];
  }
}

const seedUsers = parseSeedUsers();

function makeInsurerId(insurerName: string) {
  return insurerName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "client-insurer";
}

function makeUserId(_username: string) {
  return randomUUID();
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

// Dummy hash used to run scrypt even when the user doesn't exist, preventing
// timing attacks that reveal valid usernames via response latency.
const DUMMY_HASH = (() => {
  const salt = "00000000000000000000000000000000";
  const derived = scryptSync("dummy", salt, 64).toString("hex");
  return `${salt}:${derived}`;
})();

function verifyPassword(password: string, storedHash: string) {
  const [salt, derived] = storedHash.split(":");
  if (!salt || !derived) {
    return false;
  }

  const next = scryptSync(password, salt, 64);
  const expected = Buffer.from(derived, "hex");
  if (expected.length !== next.length) {
    return false;
  }

  return timingSafeEqual(next, expected);
}

function toPublicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    insurerId: user.insurerId,
    insurerName: user.insurerName,
  };
}

function toPublicClientUser(user: AuthUser): PublicClientUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: "client",
    insurerId: user.insurerId,
    insurerName: user.insurerName,
    builtIn: user.builtIn,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function validateClientUserInput(
  input: CreateClientUserInput | UpdateClientUserInput
) {
  const insurerName = input.insurerName.trim();
  const username = normalizeUsername(input.username);
  const password = input.password.trim();

  if (!insurerName || !username || !password) {
    throw new HttpError(400, "Insurer, username, and password are required.");
  }

  if (password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters long.");
  }

  return { insurerName, username, password };
}

function validateAdminUserInput(input: CreateAdminUserInput) {
  const name = input.name.trim();
  const insurerName = input.insurerName.trim();
  const username = normalizeUsername(input.username);
  const password = input.password.trim();

  if (!name || !insurerName || !username || !password) {
    throw new HttpError(400, "Name, insurer, username, and password are required.");
  }

  if (password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters long.");
  }

  return { name, insurerName, username, password };
}

function buildSeedUser(seed: SeedUser): AuthUser {
  const timestamp = new Date().toISOString();
  const username = normalizeUsername(seed.username);
  return {
    id: makeUserId(username),
    name: seed.name,
    username,
    role: seed.role,
    insurerId: makeInsurerId(seed.insurerName),
    insurerName: seed.insurerName,
    builtIn: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    passwordHash: hashPassword(seed.password),
  };
}

async function ensureSeedUsers() {
  if (seedUsers.length === 0) {
    return;
  }

  if (!shouldUseFileStore()) {
    for (const seed of seedUsers) {
      const username = normalizeUsername(seed.username);
      const existing = await findUserByUsername(username);
      if (!existing) {
        await insertUser(buildSeedUser(seed));
      }
    }
    await deleteExpiredSessions();
    return;
  }

  await mutateAuthDatabase((db) => {
    seedUsers.forEach((seed) => {
      const username = normalizeUsername(seed.username);
      if (db.users.some((user) => user.username === username)) {
        return;
      }

      db.users.push(buildSeedUser(seed));
    });

    const now = Date.now();
    db.sessions = db.sessions.filter(
      (session) => new Date(session.expiresAt).getTime() > now
    );
  });
}

function buildSession(userId: string): SessionRecord {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  return {
    token: randomBytes(32).toString("hex"),
    userId,
    createdAt,
    lastSeenAt: createdAt,
    expiresAt,
  };
}

export async function authenticateUser(username: string, password: string) {
  await ensureSeedUsers();
  const normalizedUsername = normalizeUsername(username);

  if (!shouldUseFileStore()) {
    const user = await findUserByUsername(normalizedUsername);
    const hashToVerify = user?.passwordHash ?? DUMMY_HASH;
    if (!user || !verifyPassword(password, hashToVerify)) {
      throw new HttpError(401, "Invalid username or password.");
    }
    const session = buildSession(user.id);
    await deleteSessionsByUserId(user.id);
    await insertSession(session);
    return {
      token: session.token,
      user: toPublicUser(user),
      lastLoginAt: session.createdAt,
    };
  }

  return mutateAuthDatabase((db) => {
    const user = db.users.find((entry) => entry.username === normalizedUsername);
    const hashToVerify = user?.passwordHash ?? DUMMY_HASH;
    if (!user || !verifyPassword(password, hashToVerify)) {
      throw new HttpError(401, "Invalid username or password.");
    }

    const session = buildSession(user.id);
    db.sessions = db.sessions
      .filter((entry) => entry.userId !== user.id)
      .concat(session);

    return {
      token: session.token,
      user: toPublicUser(user),
      lastLoginAt: session.createdAt,
    };
  });
}

export async function getUserForSessionToken(token: string) {
  await ensureSeedUsers();

  if (!shouldUseFileStore()) {
    const session = await findSessionByToken(token);
    if (!session) {
      return null;
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await deleteSession(token);
      logger.info("auth.session.expired", { userId: session.userId });
      return null;
    }
    const user = await findUserById(session.userId);
    if (!user) {
      return null;
    }
    await updateSessionLastSeen(token, new Date().toISOString());
    return {
      token,
      user: toPublicUser(user),
      lastLoginAt: session.createdAt,
    };
  }

  const db = await readAuthDatabase();
  const session = db.sessions.find((entry) => entry.token === token);
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await revokeSession(token);
    logger.info("auth.session.expired", { userId: session.userId });
    return null;
  }

  const user = db.users.find((entry) => entry.id === session.userId);
  if (!user) {
    return null;
  }

  await mutateAuthDatabase((nextDb) => {
    const nextSession = nextDb.sessions.find((entry) => entry.token === token);
    if (nextSession) {
      nextSession.lastSeenAt = new Date().toISOString();
    }
  });

  return {
    token,
    user: toPublicUser(user),
    lastLoginAt: session.createdAt,
  };
}

export async function revokeSession(token: string) {
  if (!shouldUseFileStore()) {
    await deleteSession(token);
    return;
  }

  await mutateAuthDatabase((db) => {
    db.sessions = db.sessions.filter((entry) => entry.token !== token);
  });
}

export async function listClientUsers(): Promise<PublicClientUser[]> {
  await ensureSeedUsers();

  if (!shouldUseFileStore()) {
    const users = await listUsers();
    return users
      .filter((user) => user.role === "client")
      .sort((left, right) => left.insurerName.localeCompare(right.insurerName))
      .map(toPublicClientUser);
  }

  const db = await readAuthDatabase();
  return db.users
    .filter((user) => user.role === "client")
    .sort((left, right) => left.insurerName.localeCompare(right.insurerName))
    .map(toPublicClientUser);
}

export async function createClientUser(input: CreateClientUserInput) {
  await ensureSeedUsers();
  const normalized = validateClientUserInput(input);

  if (!shouldUseFileStore()) {
    const existing = await findUserByUsername(normalized.username);
    if (existing) {
      throw new HttpError(409, "That username already exists.");
    }
    const timestamp = new Date().toISOString();
    const user: AuthUser = {
      id: makeUserId(normalized.username),
      name: normalized.username,
      username: normalized.username,
      role: "client",
      insurerId: makeInsurerId(normalized.insurerName),
      insurerName: normalized.insurerName,
      builtIn: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      passwordHash: hashPassword(normalized.password),
    };
    await insertUser(user);
    return toPublicClientUser(user);
  }

  const timestamp = new Date().toISOString();
  const newClientUser: AuthUser = {
    id: makeUserId(normalized.username),
    name: normalized.username,
    username: normalized.username,
    role: "client",
    insurerId: makeInsurerId(normalized.insurerName),
    insurerName: normalized.insurerName,
    builtIn: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    passwordHash: hashPassword(normalized.password),
  };

  const result = await mutateAuthDatabase((db) => {
    if (db.users.some((u) => u.username === newClientUser.username)) {
      throw new HttpError(409, "That username already exists.");
    }
    db.users.push(newClientUser);
    return toPublicClientUser(newClientUser);
  });

  if (hasSupabaseCreds()) {
    insertUser(newClientUser).catch((err) =>
      logger.warn("Supabase user mirror failed (create client):", err)
    );
  }

  return result;
}

export async function createAdminUser(input: CreateAdminUserInput) {
  await ensureSeedUsers();
  const normalized = validateAdminUserInput(input);

  if (!shouldUseFileStore()) {
    const existing = await findUserByUsername(normalized.username);
    if (existing) {
      throw new HttpError(409, "That username already exists.");
    }
    const timestamp = new Date().toISOString();
    const user: AuthUser = {
      id: makeUserId(normalized.username),
      name: normalized.name,
      username: normalized.username,
      role: "admin",
      insurerId: makeInsurerId(normalized.insurerName),
      insurerName: normalized.insurerName,
      builtIn: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      passwordHash: hashPassword(normalized.password),
    };
    await insertUser(user);
    return toPublicUser(user);
  }

  const timestamp = new Date().toISOString();
  const newAdminUser: AuthUser = {
    id: makeUserId(normalized.username),
    name: normalized.name,
    username: normalized.username,
    role: "admin",
    insurerId: makeInsurerId(normalized.insurerName),
    insurerName: normalized.insurerName,
    builtIn: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    passwordHash: hashPassword(normalized.password),
  };

  const result = await mutateAuthDatabase((db) => {
    if (db.users.some((u) => u.username === newAdminUser.username)) {
      throw new HttpError(409, "That username already exists.");
    }
    db.users.push(newAdminUser);
    return toPublicUser(newAdminUser);
  });

  if (hasSupabaseCreds()) {
    insertUser(newAdminUser).catch((err) =>
      logger.warn("Supabase user mirror failed (create admin):", err)
    );
  }

  return result;
}

export async function updateClientUser(userId: string, input: UpdateClientUserInput) {
  await ensureSeedUsers();
  const normalized = validateClientUserInput(input);

  if (!shouldUseFileStore()) {
    const user = await findUserById(userId);
    if (!user || user.role !== "client") {
      throw new HttpError(404, "Client user not found.");
    }
    if (user.builtIn) {
      throw new HttpError(403, "Built-in client users cannot be edited.");
    }
    const conflicting = await findUserByUsername(normalized.username);
    if (conflicting && conflicting.id !== userId) {
      throw new HttpError(409, "That username already exists.");
    }
    const nextUserId = makeUserId(normalized.username);
    const passwordHash = hashPassword(normalized.password);
    const updatedAt = new Date().toISOString();
    const fields: Partial<AuthUserRow> = {
      id: nextUserId,
      name: normalized.username,
      username: normalized.username,
      insurer_id: makeInsurerId(normalized.insurerName),
      insurer_name: normalized.insurerName,
      password_hash: passwordHash,
      updated_at: updatedAt,
    };
    await updateUser(userId, fields);
    await deleteSessionsByUserId(userId);
    return toPublicClientUser({
      ...user,
      id: nextUserId,
      name: normalized.username,
      username: normalized.username,
      insurerId: makeInsurerId(normalized.insurerName),
      insurerName: normalized.insurerName,
      passwordHash,
      updatedAt,
    });
  }

  const nextUserId = makeUserId(normalized.username);
  const passwordHash = hashPassword(normalized.password);
  const updatedAt = new Date().toISOString();

  const result = await mutateAuthDatabase((db) => {
    const user = db.users.find((entry) => entry.id === userId);
    if (!user || user.role !== "client") {
      throw new HttpError(404, "Client user not found.");
    }
    if (user.builtIn) {
      throw new HttpError(403, "Built-in client users cannot be edited.");
    }
    if (db.users.some((entry) => entry.username === normalized.username && entry.id !== userId)) {
      throw new HttpError(409, "That username already exists.");
    }

    user.id = nextUserId;
    user.name = normalized.username;
    user.username = normalized.username;
    user.insurerId = makeInsurerId(normalized.insurerName);
    user.insurerName = normalized.insurerName;
    user.passwordHash = passwordHash;
    user.updatedAt = updatedAt;

    db.sessions = db.sessions.filter((session) => session.userId !== userId);

    return toPublicClientUser(user);
  });

  if (hasSupabaseCreds()) {
    const fields: Partial<AuthUserRow> = {
      id: nextUserId,
      name: normalized.username,
      username: normalized.username,
      insurer_id: makeInsurerId(normalized.insurerName),
      insurer_name: normalized.insurerName,
      password_hash: passwordHash,
      updated_at: updatedAt,
    };
    updateUser(userId, fields).catch((err) =>
      logger.warn("Supabase user mirror failed (update):", err)
    );
  }

  return result;
}

export async function deleteClientUser(userId: string) {
  await ensureSeedUsers();

  if (!shouldUseFileStore()) {
    const user = await findUserById(userId);
    if (!user || user.role !== "client") {
      throw new HttpError(404, "Client user not found.");
    }
    if (user.builtIn) {
      throw new HttpError(403, "Built-in client users cannot be deleted.");
    }
    await deleteSessionsByUserId(userId);
    await deleteUser(userId);
    return;
  }

  await mutateAuthDatabase((db) => {
    const user = db.users.find((entry) => entry.id === userId);
    if (!user || user.role !== "client") {
      throw new HttpError(404, "Client user not found.");
    }
    if (user.builtIn) {
      throw new HttpError(403, "Built-in client users cannot be deleted.");
    }
    db.users = db.users.filter((entry) => entry.id !== userId);
    db.sessions = db.sessions.filter((session) => session.userId !== userId);
  });

  if (hasSupabaseCreds()) {
    deleteUser(userId).catch((err) =>
      logger.warn("Supabase user mirror failed (delete):", err)
    );
  }
}
