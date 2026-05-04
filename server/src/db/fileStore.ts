import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { env } from "../config/env.ts";
import { resolveRuntimePath } from "../lib/paths.ts";
import type { DatabaseShape } from "../types/domain.ts";

const emptyDb: DatabaseShape = {
  devices: [],
  claims: [],
  dashboardClaims: [],
  dashboardSearches: [],
};

const dbPath = resolveRuntimePath(env.dbFile);
let writeQueue = Promise.resolve();

async function ensureFile() {
  await mkdir(dirname(dbPath), { recursive: true });

  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeFile(dbPath, JSON.stringify(emptyDb, null, 2));
  }
}

export async function readDatabase(): Promise<DatabaseShape> {
  await ensureFile();
  const raw = await readFile(dbPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<DatabaseShape>;

  return {
    devices: Array.isArray(parsed.devices) ? parsed.devices : [],
    claims: Array.isArray(parsed.claims) ? parsed.claims : [],
    dashboardClaims: Array.isArray(parsed.dashboardClaims)
      ? parsed.dashboardClaims.map((claim) => ({
          ...claim,
          userId:
            typeof claim?.userId === "string"
              ? claim.userId
              : typeof claim?.insurerId === "string"
                ? claim.insurerId
                : "unknown-user",
        }))
      : [],
    dashboardSearches: Array.isArray(parsed.dashboardSearches)
      ? parsed.dashboardSearches.map((search) => ({
          ...search,
          userId:
            typeof search?.userId === "string"
              ? search.userId
              : typeof search?.insurerId === "string"
                ? search.insurerId
                : "unknown-user",
        }))
      : [],
  };
}

export async function writeDatabase(data: DatabaseShape) {
  await ensureFile();
  await writeFile(dbPath, JSON.stringify(data, null, 2));
}

export async function mutateDatabase<T>(mutator: (data: DatabaseShape) => T | Promise<T>): Promise<T> {
  const operation = writeQueue.then(async () => {
    const db = await readDatabase();
    const result = await mutator(db);
    await writeDatabase(db);
    return result;
  });

  writeQueue = operation.then(
    () => undefined,
    () => undefined
  );

  return operation;
}
