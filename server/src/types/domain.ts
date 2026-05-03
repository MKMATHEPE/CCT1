export type ClaimOutcome = "APPROVED" | "REJECTED" | "PENDING";

export type DeviceRecord = {
  id: string;
  imeiSerial: string;
  serialNumber: string | null;
  deviceName: string;
  brand: string | null;
  deviceType: string | null;
  lastFetchedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClaimRecord = {
  id: string;
  deviceId: string;
  externalId: string | null;
  dateOfLoss: string | null;
  claimAmount: number;
  outcome: ClaimOutcome;
  reason: string | null;
  insurer: string;
  source: string;
  createdAt: string;
};

export type DatabaseShape = {
  devices: DeviceRecord[];
  claims: ClaimRecord[];
  dashboardClaims: DashboardClaimRecord[];
  dashboardSearches: DashboardSearchRecord[];
};

export type DashboardClaimRecord = {
  id: string;
  imei: string;
  claimAmount: number;
  status: string;
  createdAt: string;
  insurerId: string;
  userId: string;
};

export type DashboardSearchRecord = {
  id: string;
  imei: string;
  searchedAt: string;
  resultFound: boolean;
  insurerId: string;
  userId: string;
};

export type DashboardActivityItem = {
  id: string;
  type: "claim" | "search";
  imei: string;
  device_name?: string;
  timestamp: string;
  insurer_id: string;
  user_id: string;
  claim_amount?: number;
  status?: string;
  result_found?: boolean;
};

export type DashboardStats = {
  total_claims: number;
  total_searches: number;
  rejected_claims: number;
  claim_value: number;
  recent_activity: DashboardActivityItem[];
};

export type SearchMode = "imei" | "serial";

export type NormalizedClaim = {
  externalId: string | null;
  imei: string;
  deviceName: string;
  brand: string | null;
  deviceType: string | null;
  outcome: ClaimOutcome;
  claimAmount: number;
  dateOfLoss: string | null;
  reason: string | null;
  insurer: string;
  source: string;
};

export type SearchResponse = {
  device: {
    imei: string;
    serial_number: string | null;
    device_name: string;
  };
  claims: Array<{
    id: string;
    date_of_loss: string | null;
    claim_amount: number;
    outcome: ClaimOutcome;
    reason: string | null;
    insurer: string;
    source: string;
  }>;
};

export type ClaimListItem = {
  id: string;
  device_id: string;
  imei_serial: string;
  serial_number: string | null;
  device_name: string;
  brand: string | null;
  device_type: string | null;
  date_of_loss: string | null;
  claim_amount: number;
  outcome: ClaimOutcome;
  reason: string | null;
  insurer: string;
  source: string;
  external_id: string | null;
  created_at: string;
  last_fetched_at: string | null;
};

export type ManualClaimInput = {
  imei: string;
  serial: string;
  deviceName: string;
  insurer: string;
  outcome: "approved" | "rejected" | "pending";
  dateOfLoss: string;
  reason: string;
  amount: number;
};

export type BulkManualClaimInput = {
  claims: ManualClaimInput[];
};
