import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { env } from "../config/env.ts";
import type { AuthDatabaseShape, AuthUser, SessionRecord } from "../types/auth.ts";
import { supabase } from "../lib/supabase.ts";
import { resolveRuntimePath } from "../lib/paths.ts";

const emptyAuthDb: AuthDatabaseShape = {
  users: [],
  sessions: [],
};

const authDbPath = resolveRuntimePath(env.authUsersFile);
let writeQueue = Promise.resolve();

export type AuthUserRow = {
  id: string;
  name: string;
  username: string;
  role: "admin" | "client";
  insurer_id: string;
  insurer_name: string;
  built_in: boolean;
  created_at: string;
  updated_at: string;
  password_hash: string;
};

export type AuthSessionRow = {
  token: string;
  user_id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
};

export function shouldUseFileStore() {
  if (env.dbProvider === "file") {
    return true;
  }

  if (env.dbProvider === "supabase") {
    return false;
  }

  return (
    !env.supabaseUrl.trim() ||
    !(env.supabaseServiceRoleKey || env.supabaseAnonKey).trim()
  );
}

async function ensureFile() {
  await mkdir(dirname(authDbPath), { recursive: true });

  try {
    await readFile(authDbPath, "utf8");
  } catch {
    await writeFile(authDbPath, JSON.stringify(emptyAuthDb, null, 2));
  }
}

function mapUserRow(row: AuthUserRow) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    insurerId: row.insurer_id,
    insurerName: row.insurer_name,
    builtIn: row.built_in,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    passwordHash: row.password_hash,
  } satisfies AuthDatabaseShape["users"][number];
}

function mapSessionRow(row: AuthSessionRow) {
  return {
    token: row.token,
    userId: row.user_id,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
  } satisfies AuthDatabaseShape["sessions"][number];
}

function toUserRow(user: AuthDatabaseShape["users"][number]): AuthUserRow {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    insurer_id: user.insurerId,
    insurer_name: user.insurerName,
    built_in: user.builtIn,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    password_hash: user.passwordHash,
  };
}

function toSessionRow(session: AuthDatabaseShape["sessions"][number]): AuthSessionRow {
  return {
    token: session.token,
    user_id: session.userId,
    created_at: session.createdAt,
    last_seen_at: session.lastSeenAt,
    expires_at: session.expiresAt,
  };
}

async function readAuthDatabaseFromSupabase(): Promise<AuthDatabaseShape> {
  const [{ data: userRows, error: usersError }, { data: sessionRows, error: sessionsError }] =
    await Promise.all([
      supabase.from("auth_users").select("*"),
      supabase.from("auth_sessions").select("*"),
    ]);

  if (usersError) {
    throw new Error(usersError.message);
  }

  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  return {
    users: (userRows ?? []).map((row) => mapUserRow(row as AuthUserRow)),
    sessions: (sessionRows ?? []).map((row) => mapSessionRow(row as AuthSessionRow)),
  };
}

async function readAuthDatabaseFromFile(): Promise<AuthDatabaseShape> {
  await ensureFile();
  const raw = await readFile(authDbPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<AuthDatabaseShape>;

  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
  };
}

async function writeAuthDatabaseToFile(data: AuthDatabaseShape) {
  await ensureFile();
  await writeFile(authDbPath, JSON.stringify(data, null, 2));
}

export async function readAuthDatabase(): Promise<AuthDatabaseShape> {
  if (shouldUseFileStore()) {
    return readAuthDatabaseFromFile();
  }

  return readAuthDatabaseFromSupabase();
}

async function writeAuthDatabase(data: AuthDatabaseShape) {
  if (shouldUseFileStore()) {
    await writeAuthDatabaseToFile(data);
    return;
  }

  throw new Error(
    "writeAuthDatabase must not be called when DB_PROVIDER=supabase; use targeted operations instead"
  );
}

export async function mutateAuthDatabase<T>(
  mutator: (data: AuthDatabaseShape) => T | Promise<T>
): Promise<T> {
  const operation = writeQueue.then(async () => {
    const db = await readAuthDatabase();
    const result = await mutator(db);
    await writeAuthDatabase(db);
    return result;
  });

  writeQueue = operation.then(
    () => undefined,
    () => undefined
  );

  return operation;
}

// ---------------------------------------------------------------------------
// Targeted Supabase operations — each maps to a single DB call.
// Used by authService when DB_PROVIDER=supabase.
// ---------------------------------------------------------------------------

export async function findUserByUsername(username: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from("auth_users")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUserRow(data as AuthUserRow) : null;
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from("auth_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUserRow(data as AuthUserRow) : null;
}

export async function insertUser(user: AuthUser): Promise<void> {
  const { error } = await supabase.from("auth_users").insert(toUserRow(user));
  if (error) throw new Error(error.message);
}

export async function updateUser(id: string, fields: Partial<AuthUserRow>): Promise<void> {
  const { error } = await supabase.from("auth_users").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from("auth_users").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function findSessionByToken(token: string): Promise<SessionRecord | null> {
  const { data, error } = await supabase
    .from("auth_sessions")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapSessionRow(data as AuthSessionRow) : null;
}

export async function insertSession(session: SessionRecord): Promise<void> {
  const { error } = await supabase.from("auth_sessions").insert(toSessionRow(session));
  if (error) throw new Error(error.message);
}

export async function updateSessionLastSeen(token: string, lastSeenAt: string): Promise<void> {
  const { error } = await supabase
    .from("auth_sessions")
    .update({ last_seen_at: lastSeenAt })
    .eq("token", token);
  if (error) throw new Error(error.message);
}

export async function deleteSession(token: string): Promise<void> {
  const { error } = await supabase.from("auth_sessions").delete().eq("token", token);
  if (error) throw new Error(error.message);
}

export async function deleteSessionsByUserId(userId: string): Promise<void> {
  const { error } = await supabase.from("auth_sessions").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function listUsers(): Promise<AuthUser[]> {
  const { data, error } = await supabase.from("auth_users").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapUserRow(row as AuthUserRow));
}

export async function deleteExpiredSessions(): Promise<void> {
  const { error } = await supabase
    .from("auth_sessions")
    .delete()
    .lt("expires_at", new Date().toISOString());
  if (error) throw new Error(error.message);
}
