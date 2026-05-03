/* ======================================================
   TYPES
====================================================== */

export type ClaimOutcome = "approved" | "rejected" | "pending";

export type Claim = {
  id: number;
  imei: string;
  serial: string;
  brand: string;
  model: string;
  amount: number;
  outcome: ClaimOutcome;
  timestamp: string;
};

export type DeviceRow = {
  device: string;
  imei: string;
  claimsCount: number;
  status: "Clean" | "Duplicate" | "Pending";
  lastActivity: string;
};

export type AuditAction =
  | "SEARCH"
  | "VIEW_DEVICE"
  | "RECORD_CLAIM"
  | "AUTO_REJECT";

export type AuditLogEntry = {
  id: number;
  action: AuditAction;
  details: string;
  timestamp: string;
};

/* ======================================================
   IN-MEMORY STORES (API-READY LATER)
====================================================== */

const claims: Claim[] = [
  {
    id: 1,
    imei: "356789XXXXXX",
    serial: "SN123",
    brand: "Samsung",
    model: "Galaxy S21 Ultra",
    amount: 15000,
    outcome: "approved",
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    imei: "356789XXXXXX",
    serial: "SN123",
    brand: "Samsung",
    model: "Galaxy S21 Ultra",
    amount: 14500,
    outcome: "rejected",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    imei: "354892XXXXXX",
    serial: "SN456",
    brand: "Apple",
    model: "iPhone 13 Pro",
    amount: 18000,
    outcome: "approved",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

const auditLog: AuditLogEntry[] = [];

/* ======================================================
   AUDIT CORE (CANNOT BE BYPASSED)
====================================================== */

function logAudit(action: AuditAction, details: string) {
  auditLog.unshift({
    id: auditLog.length + 1,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
}

export function getAuditLogSnapshot(): AuditLogEntry[] {
  return [...auditLog];
}

/* ======================================================
   READ OPERATIONS (AUDITED WHERE REQUIRED)
====================================================== */

export function getClaims(): Claim[] {
  return claims;
}

export function getClaimsGroupedByIMEI(): Record<string, Claim[]> {
  return claims.reduce<Record<string, Claim[]>>((groups, claim) => {
    if (!groups[claim.imei]) {
      groups[claim.imei] = [];
    }
    groups[claim.imei].push(claim);
    return groups;
  }, {});
}

export function getClaimsByIMEI(imei: string): Claim[] {
  logAudit("VIEW_DEVICE", `Viewed claims for IMEI ${imei}`);

  return claims
    .filter((c) => c.imei === imei)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
    );
}

export function getDeviceRows(): DeviceRow[] {
  const groups = getClaimsGroupedByIMEI();

  return Object.entries(groups).map(([imei, imeiClaims]) => {
    const sorted = [...imeiClaims].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
    );

    const latest = sorted[0];

    let status: DeviceRow["status"] = "Clean";

    if (imeiClaims.length > 1) {
      status = "Duplicate";
    } else if (latest.outcome === "pending") {
      status = "Pending";
    }

    return {
      device: `${latest.brand} ${latest.model}`,
      imei,
      claimsCount: imeiClaims.length,
      status,
      lastActivity: formatTimeAgo(latest.timestamp),
    };
  });
}

export function getStats() {
  const grouped = getClaimsGroupedByIMEI();

  const totalClaims = claims.length;
  const duplicateDevices = Object.values(grouped).filter(
    (group) => group.length > 1
  ).length;
  const rejectedClaims = claims.filter(
    (c) => c.outcome === "rejected"
  ).length;
  const fraudPrevented = claims
    .filter((c) => c.outcome === "rejected")
    .reduce((sum, c) => sum + c.amount, 0);

  return {
    totalClaims,
    duplicateDevices,
    rejectedClaims,
    fraudPrevented,
  };
}

/* ======================================================
   SEARCH (AUDITED)
====================================================== */

export function findDeviceByQuery(query: string): string | null {
  const normalized = query.trim();
  if (!normalized) return null;

  logAudit("SEARCH", `Search performed: ${normalized}`);

  const imeiMatch = claims.find((c) => c.imei === normalized);
  if (imeiMatch) return imeiMatch.imei;

  const serialMatch = claims.find((c) => c.serial === normalized);
  if (serialMatch) return serialMatch.imei;

  return null;
}

/* ======================================================
   WRITE OPERATIONS (MANDATORY AUDIT)
====================================================== */

export type NewClaimInput = {
  imei: string;
  serial: string;
  brand: string;
  model: string;
  amount: number;
};

export function recordClaim(input: NewClaimInput): Claim {
  const isDuplicate = claims.some(
    (c) => c.imei === input.imei
  );

  const outcome: ClaimOutcome = isDuplicate
    ? "rejected"
    : "approved";

  const newClaim: Claim = {
    id: claims.length + 1,
    imei: input.imei,
    serial: input.serial,
    brand: input.brand,
    model: input.model,
    amount: input.amount,
    outcome,
    timestamp: new Date().toISOString(),
  };

  claims.push(newClaim);

  logAudit(
    "RECORD_CLAIM",
    `Claim recorded for IMEI ${input.imei} (${outcome})`
  );

  if (isDuplicate) {
    logAudit(
      "AUTO_REJECT",
      `Duplicate IMEI detected: ${input.imei}`
    );
  }

  return newClaim;
}

/* ======================================================
   UTIL
====================================================== */

function formatTimeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} mins ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours > 1 ? "s" : ""} ago`;
}