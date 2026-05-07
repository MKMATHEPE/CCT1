import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type AuditEntry = {
  id: string;
  timestampUtc: string;
  action: string;
  target: string;
  outcome: string;
  actor: string;
  actorName: string;
  actorRole: string;
  insurerName: string;
  context: string;
  details?: Record<string, unknown>;
};

const AUDIT_FILE = resolve(process.cwd(), "server/data/audit-log.json");
let writeQueue = Promise.resolve();

async function ensureFile() {
  await mkdir(dirname(AUDIT_FILE), { recursive: true });
  try {
    await readFile(AUDIT_FILE, "utf8");
  } catch {
    await writeFile(AUDIT_FILE, "[]");
  }
}

export async function readAuditEntries(): Promise<AuditEntry[]> {
  await ensureFile();
  const raw = await readFile(AUDIT_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? (parsed as AuditEntry[]) : [];
}

export async function appendAuditEntry(entry: AuditEntry): Promise<void> {
  const operation = writeQueue.then(async () => {
    await ensureFile();
    const raw = await readFile(AUDIT_FILE, "utf8");
    const entries: AuditEntry[] = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    entries.push(entry);
    // Keep last 10 000 entries to avoid unbounded growth
    const trimmed = entries.length > 10_000 ? entries.slice(entries.length - 10_000) : entries;
    await writeFile(AUDIT_FILE, JSON.stringify(trimmed, null, 2));
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
