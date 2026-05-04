import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { env } from "../config/env.ts";
import { resolveRuntimePath } from "../lib/paths.ts";
import type {
  DashboardClaimRecord,
  DashboardSearchRecord,
} from "../types/domain.ts";

type DashboardDatabaseShape = {
  claims: DashboardClaimRecord[];
  searches: DashboardSearchRecord[];
};

type DashboardScope = {
  insurerId: string;
  userId: string;
};

const emptyDashboardDb: DashboardDatabaseShape = {
  claims: [],
  searches: [],
};

const writeQueues = new Map<string, Promise<void>>();

function sanitizeKeyPart(value: string) {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "unknown";
}

function getDashboardDbPath(scope: DashboardScope) {
  const insurerKey = sanitizeKeyPart(scope.insurerId);
  const userKey = sanitizeKeyPart(scope.userId);
  return resolve(resolveRuntimePath(env.dashboardDbDir), `${insurerKey}__${userKey}.json`);
}

async function ensureDashboardFile(filePath: string) {
  await mkdir(dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, JSON.stringify(emptyDashboardDb, null, 2));
  }
}

export async function readDashboardDatabase(scope: DashboardScope): Promise<DashboardDatabaseShape> {
  const filePath = getDashboardDbPath(scope);
  await ensureDashboardFile(filePath);
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<DashboardDatabaseShape>;

  return {
    claims: Array.isArray(parsed.claims) ? parsed.claims : [],
    searches: Array.isArray(parsed.searches) ? parsed.searches : [],
  };
}

async function writeDashboardDatabase(
  scope: DashboardScope,
  data: DashboardDatabaseShape
) {
  const filePath = getDashboardDbPath(scope);
  await ensureDashboardFile(filePath);
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function mutateDashboardDatabase<T>(
  scope: DashboardScope,
  mutator: (data: DashboardDatabaseShape) => T | Promise<T>
): Promise<T> {
  const filePath = getDashboardDbPath(scope);
  const previousQueue = writeQueues.get(filePath) ?? Promise.resolve();

  const operation = previousQueue.then(async () => {
    const db = await readDashboardDatabase(scope);
    const result = await mutator(db);
    await writeDashboardDatabase(scope, db);
    return result;
  });

  writeQueues.set(
    filePath,
    operation.then(
      () => undefined,
      () => undefined
    )
  );

  return operation;
}
