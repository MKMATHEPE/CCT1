export type CaseStatus = "open" | "closed" | "on_hold" | "in_review";
export type CaseRiskLevel = "Low" | "Medium" | "High";

export type CaseRecord = {
  imei: string;
  createdAtUtc: string;
  closedAtUtc: string | null;
  status: CaseStatus;
  riskLevel: CaseRiskLevel | null;
  escalatedAtUtc: string | null;
  assignedTo: string | null;
  notes: string[];
  linkedClaims: number[];
  linkedDevices: string[];
  history: CaseHistoryEvent[];
};

export type CaseHistoryEvent = {
  timestampUtc: string;
  type:
    | "CASE_CREATED"
    | "STATUS_CHANGED"
    | "ASSIGNED"
    | "UNASSIGNED"
    | "NOTE_ADDED"
    | "NOTE_UPDATED"
    | "NOTE_DELETED"
    | "CLAIM_LINKED"
    | "DEVICE_LINKED"
    | "RISK_UPDATED";
  summary: string;
};

const cases = new Map<string, CaseRecord>();

const allowedTransitions: Record<CaseStatus, CaseStatus[]> = {
  open: ["closed", "on_hold", "in_review"],
  on_hold: ["open", "closed", "in_review"],
  in_review: ["open", "closed", "on_hold"],
  closed: ["open", "in_review"],
};

export function getCase(imei: string): CaseRecord | null {
  return cases.get(imei) ?? null;
}

export function createCase(imei: string): CaseRecord {
  const existing = cases.get(imei);
  if (existing) return existing;

  const record: CaseRecord = {
    imei,
    createdAtUtc: new Date().toISOString(),
    closedAtUtc: null,
    status: "open",
    riskLevel: null,
    escalatedAtUtc: null,
    assignedTo: null,
    notes: [],
    linkedClaims: [],
    linkedDevices: [imei],
    history: [],
  };

  pushHistory(record, "CASE_CREATED", "Case created");
  cases.set(imei, record);
  return record;
}

export function changeCaseStatus(
  imei: string,
  nextStatus: CaseStatus
): CaseRecord | null {
  const record = cases.get(imei);
  if (!record) return null;

  if (!allowedTransitions[record.status].includes(nextStatus)) {
    throw new Error(
      `Invalid status transition: ${record.status} -> ${nextStatus}`
    );
  }

  const previous = record.status;
  record.status = nextStatus;
  if (nextStatus === "closed") {
    record.closedAtUtc = new Date().toISOString();
  }
  if (nextStatus !== "closed") {
    record.closedAtUtc = null;
  }
  pushHistory(
    record,
    "STATUS_CHANGED",
    `Status changed from ${previous} to ${nextStatus}`
  );
  return record;
}

export function assignInvestigator(
  imei: string,
  investigatorId: string | null
): CaseRecord | null {
  const record = cases.get(imei);
  if (!record) return null;
  record.assignedTo = investigatorId;
  pushHistory(
    record,
    investigatorId ? "ASSIGNED" : "UNASSIGNED",
    investigatorId
      ? `Assigned to ${investigatorId}`
      : "Assignment cleared"
  );
  return record;
}

export function linkClaimToCase(
  imei: string,
  claimId: number
): CaseRecord | null {
  const record = cases.get(imei);
  if (!record) return null;
  if (!record.linkedClaims.includes(claimId)) {
    record.linkedClaims.push(claimId);
    pushHistory(record, "CLAIM_LINKED", `Linked claim ${claimId}`);
  }
  return record;
}

export function linkDeviceToCase(
  imei: string,
  deviceImei: string
): CaseRecord | null {
  const record = cases.get(imei);
  if (!record) return null;
  if (!record.linkedDevices.includes(deviceImei)) {
    record.linkedDevices.push(deviceImei);
    pushHistory(
      record,
      "DEVICE_LINKED",
      `Linked device ${deviceImei}`
    );
  }
  return record;
}

export function addCaseNote(imei: string, note: string): CaseRecord | null {
  const record = cases.get(imei);
  if (!record) return null;
  record.notes.unshift(note);
  pushHistory(record, "NOTE_ADDED", "Note added");
  return record;
}

export function setCaseRiskLevel(
  imei: string,
  riskLevel: CaseRiskLevel,
  justification: string
): CaseRecord | null {
  const record = cases.get(imei);
  if (!record) return null;
  record.riskLevel = riskLevel;
  if (riskLevel === "High") {
    record.escalatedAtUtc = new Date().toISOString();
  }
  pushHistory(
    record,
    "RISK_UPDATED",
    `Risk set to ${riskLevel}: ${justification}`
  );
  return record;
}

export function updateCaseNote(
  imei: string,
  index: number,
  note: string
): CaseRecord | null {
  const record = cases.get(imei);
  if (!record) return null;
  if (index < 0 || index >= record.notes.length) return null;
  record.notes[index] = note;
  pushHistory(record, "NOTE_UPDATED", "Note updated");
  return record;
}

export function deleteCaseNote(
  imei: string,
  index: number
): CaseRecord | null {
  const record = cases.get(imei);
  if (!record) return null;
  if (index < 0 || index >= record.notes.length) return null;
  record.notes.splice(index, 1);
  pushHistory(record, "NOTE_DELETED", "Note deleted");
  return record;
}

function pushHistory(
  record: CaseRecord,
  type: CaseHistoryEvent["type"],
  summary: string
) {
  record.history.unshift({
    timestampUtc: new Date().toISOString(),
    type,
    summary,
  });
}
