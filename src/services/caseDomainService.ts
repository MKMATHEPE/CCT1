export type CaseStatus = "OPEN" | "IN_REVIEW" | "CLOSED";
export type CaseRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type EvidenceSnapshot = {
  source: "DUPLICATE_DEVICE_DETECTION";
  serial: string;
  imei?: string;
  brand?: string;
  model?: string;
  claimCount: number;
  insurers: string[];
  outcomes: string[];
  crossInsurer: boolean;
  claims: {
    id: string;
    insurer: string;
    outcome: string;
    recordedAtUtc: string;
  }[];
};

export type Case = {
  caseId: string;
  status: CaseStatus;
  riskLevel: CaseRiskLevel;
  assignedTo?: string;
  linkedIMEIs: string[];
  linkedClaimIds: number[];
  createdAt: string;
  closedAt?: string;
  notes: {
    id: string;
    author: string;
    createdAtUtc: string;
    content: string;
  }[];
  closeReason?: string;
  closeOutcome?: string;
  closure?: {
    outcome: string;
    justification: string;
    closedBy: string;
  };
  evidenceSnapshot?: EvidenceSnapshot;
};

const cases: Case[] = [
  {
    caseId: "CASE-1001",
    status: "OPEN",
    riskLevel: "HIGH",
    assignedTo: "1",
    linkedIMEIs: ["356789XXXXXX"],
    linkedClaimIds: [1, 2],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    notes: [
      {
        id: crypto.randomUUID(),
        author: "Fraud Analyst",
        createdAtUtc: new Date(
          Date.now() - 1000 * 60 * 60 * 36
        ).toISOString(),
        content: "Initial review started.",
      },
    ],
  },
  {
    caseId: "CASE-1002",
    status: "OPEN",
    riskLevel: "MEDIUM",
    assignedTo: undefined,
    linkedIMEIs: ["354892XXXXXX"],
    linkedClaimIds: [3],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    notes: [],
  },
  {
    caseId: "CASE-1003",
    status: "CLOSED",
    riskLevel: "LOW",
    assignedTo: "priya.nair",
    linkedIMEIs: ["358111XXXXXX"],
    linkedClaimIds: [4],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    closedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    closeReason: "Resolved as non-duplicate.",
    notes: [
      {
        id: crypto.randomUUID(),
        author: "Priya Nair",
        createdAtUtc: new Date(
          Date.now() - 1000 * 60 * 60 * 12
        ).toISOString(),
        content: "Reviewed evidence and closed case.",
      },
    ],
  },
];

export function createCase(input: {
  caseId?: string;
  status?: CaseStatus;
  riskLevel?: CaseRiskLevel;
  assignedTo?: string;
  linkedIMEIs?: string[];
  linkedClaimIds?: number[];
  createdAt?: string;
  closedAt?: string;
  notes?: {
    id: string;
    author: string;
    createdAtUtc: string;
    content: string;
  }[];
  closeReason?: string;
  closeOutcome?: string;
  evidenceSnapshot?: EvidenceSnapshot;
}): Case {
  const now = new Date().toISOString();
  const status = input.status ?? "OPEN";

  const newCase: Case = {
    caseId: input.caseId ?? crypto.randomUUID(),
    status,
    riskLevel: input.riskLevel ?? "LOW",
    assignedTo: input.assignedTo,
    linkedIMEIs: input.linkedIMEIs ?? [],
    linkedClaimIds: input.linkedClaimIds ?? [],
    createdAt: input.createdAt ?? now,
    closedAt: status === "CLOSED" ? input.closedAt ?? now : undefined,
    notes: input.notes ?? [],
    closeReason: input.closeReason,
    closeOutcome: input.closeOutcome,
    evidenceSnapshot: input.evidenceSnapshot,
  };

  cases.push(newCase);
  return newCase;
}

export function getOpenCases(): Case[] {
  return cases.filter((c) => c.status === "OPEN");
}

export function getClosedCases(): Case[] {
  return cases.filter((c) => c.status === "CLOSED");
}

export function getCasesAssignedTo(userId: string): Case[] {
  return cases.filter((c) => c.assignedTo === userId);
}

export function getHighRiskCases(): Case[] {
  return cases.filter((c) => c.riskLevel === "HIGH");
}

export function getCaseByIMEI(imei: string): Case | null {
  return (
    cases.find((c) => c.linkedIMEIs.includes(imei)) ?? null
  );
}

export function getCaseById(caseId: string): Case | null {
  return cases.find((c) => c.caseId === caseId) ?? null;
}

export function addCaseNote(
  caseId: string,
  note: { author: string; content: string }
): Case | null {
  const record = getCaseById(caseId);
  if (!record) return null;
  record.notes.unshift({
    id: crypto.randomUUID(),
    author: note.author,
    content: note.content,
    createdAtUtc: new Date().toISOString(),
  });
  return record;
}

export function changeCaseStatus(
  caseId: string,
  status: CaseStatus
): Case | null {
  const record = getCaseById(caseId);
  if (!record) return null;
  record.status = status;
  if (status !== "CLOSED") {
    record.closedAt = undefined;
    record.closeReason = undefined;
  }
  return record;
}

export function assignCase(
  caseId: string,
  assignedTo: string
): Case | null {
  const record = getCaseById(caseId);
  if (!record) return null;
  record.assignedTo = assignedTo;
  return record;
}

export function closeCase(input: {
  caseId: string;
  reason: string;
  outcome: string;
  closedBy?: string;
}): Case | null {
  const record = getCaseById(input.caseId);
  if (!record) return null;
  record.status = "CLOSED";
  record.closedAt = new Date().toISOString();
  record.closeReason = input.reason;
  record.closeOutcome = input.outcome;
  record.closure = {
    outcome: input.outcome,
    justification: input.reason,
    closedBy: input.closedBy ?? "unknown",
  };
  return record;
}
