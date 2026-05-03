export type AuditAction =
  | "CLAIM_RECORDED"
  | "CLAIM_APPROVED"
  | "CLAIM_REJECTED"
  | "DUPLICATE_DETECTED"
  | "AUDIT_EXPORTED"
  | "SEARCH"
  | "CASE_VIEWED"
  | "LOGIN"
  | "LOGOUT"
  | "CASE_CREATED"
  | "CASE_NOTE_ADDED"
  | "CASE_STATUS_CHANGED"
  | "CASE_ASSIGNED"
  | "CASE_LINKED_CLAIM"
  | "CASE_LINKED_DEVICE"
  | "CASE_NOTE_UPDATED"
  | "CASE_NOTE_DELETED"
  | "CASE_REOPENED"
  | "CASE_EXPORTED"
  | "CASE_RISK_UPDATED"
  | "CASE_CLOSED"
  | "DEVICE_REGISTERED"
  | "DEVICE_SERIAL_EXISTS"
  | "CLAIM_SUBMITTED"
  | "DEVICE_CREATED"
  | "DUPLICATE_DEVICE_DETECTED"
  | "DEVICE_VIEWED"
  | "DUPLICATE_DEVICE_VIEWED"
  | "INVESTIGATION_INITIATED_FROM_DUPLICATE"
  | "CASE_INITIATED_FROM_DUPLICATE_DEVICE"
  | "CASE_CLOSE_INITIATED"
  | "RISK_SIGNAL_VIEWED"
  | "RISK_SIGNAL_ESCALATED"
  | "ROLE_CONTEXT_LOADED"
  | "PERMISSION_DENIED";

export type AuditOutcome =
  | "SUCCESS"
  | "FAILURE"
  | "AUTO_REJECT"
  | "RECORDED";

export type AuditLogEntry = {
  id: string;
  timestampUtc: string;
  action: AuditAction;
  target: string;
  outcome: AuditOutcome;
  actor: string;
  actorRole: string;
  context: string;
  details?: Record<string, unknown>;
};

/**
 * Immutable in-memory log
 * (replace with API / DB later)
 */
const auditLog: AuditLogEntry[] = [];

export function writeAuditLog(
  entry: Omit<AuditLogEntry, "id" | "timestampUtc">
) {
  auditLog.push({
    id: crypto.randomUUID(),
    timestampUtc: new Date().toISOString(),
    ...entry,
  });
}

export function getAuditLog(): AuditLogEntry[] {
  return [...auditLog]; // defensive copy
}
