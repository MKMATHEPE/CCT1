import { useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import {
  createDeviceRecord,
  getRegisteredDeviceBySerial,
  recordClaimForDevice,
  type RegisteredDevice,
} from "../services/deviceRegistryService";
import {
  createClaimEvent,
  getClaimEventsBySerial,
  getDeviceIdBySerial,
  type ClaimDeviceEvent,
} from "../services/claimDeviceService";
import { writeAuditLog } from "../services/auditLogService";

export default function ClaimDeviceNewClaimPage() {
  const { user } = useAuth();
  const isAnalyst = user?.role === "analyst";
  const [serial, setSerial] = useState("");
  const [imei, setImei] = useState("");
  const [deviceCategory, setDeviceCategory] = useState<
    "Mobile" | "Laptop" | "Tablet"
  >("Mobile");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [deviceAge, setDeviceAge] = useState<
    "< 6 months" | "6–12 months" | "> 12 months"
  >("< 6 months");
  const [insurer, setInsurer] = useState<
    "Alpha Insurance" | "Beta Assurance" | "Gamma Cover"
  >("Alpha Insurance");
  const [claimReference, setClaimReference] = useState("");
  const [lossType, setLossType] = useState<
    "Theft" | "Accidental Damage" | "Loss" | "Fire" | "Water Damage"
  >("Theft");
  const [dateOfLoss, setDateOfLoss] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [outcome, setOutcome] = useState<
    "PAID_TOTAL_LOSS" | "PAID_PARTIAL" | "REJECTED"
  >("PAID_TOTAL_LOSS");
  const [lookup, setLookup] = useState<{
    serial: string;
    exists: boolean;
    device: RegisteredDevice | null;
    priorClaims: ClaimDeviceEvent[];
  } | null>(null);
  const [result, setResult] = useState<{
    status: "created" | "existing";
    device: RegisteredDevice;
  } | null>(null);
  const [error, setError] = useState("");

  const trimmedSerial = serial.trim();
  const canSubmit = trimmedSerial.length > 0;
  const isExisting = lookup?.exists ?? false;
  const categoryLocked = isExisting;
  const brandLocked = isExisting;
  const modelLocked = isExisting;
  const ageLocked = isExisting;

  const historySummary = useMemo(() => {
    if (!lookup) return null;
    const insurers = Array.from(
      new Set(lookup.priorClaims.map((e) => e.insurer ?? "Unknown"))
    );
    const outcomes = Array.from(
      new Set(lookup.priorClaims.map((e) => e.outcome ?? "Unknown"))
    );
    return {
      claimCount: lookup.priorClaims.length,
      insurers,
      outcomes,
    };
  }, [lookup]);

  function computeLookup(nextSerial: string) {
    const priorClaims = getClaimEventsBySerial(nextSerial);
    const registered = getRegisteredDeviceBySerial(nextSerial);
    const exists = Boolean(registered || priorClaims.length > 0);
    const deviceId =
      getDeviceIdBySerial(nextSerial) ??
      registered?.id ??
      `device-${nextSerial}`;

    const device =
      registered ??
      (priorClaims[0]
        ? {
            id: deviceId,
            serial: nextSerial,
            imei: priorClaims[0].imei,
            category: priorClaims[0].deviceCategory,
            brand: priorClaims[0].brand,
            model: priorClaims[0].model,
            age: priorClaims[0].deviceAge,
            status: "Existing",
            registeredAtUtc: priorClaims[0].createdAtUtc,
          }
        : null);

    return {
      serial: nextSerial,
      exists,
      device,
      priorClaims,
    };
  }

  function handleLookup(value: string) {
    const nextSerial = value.trim();
    if (!nextSerial) {
      setLookup(null);
      return;
    }

    const nextLookup = computeLookup(nextSerial);
    setLookup(nextLookup);

    if (nextLookup.exists && nextLookup.device) {
      if (nextLookup.device.category) {
        setDeviceCategory(nextLookup.device.category);
      }
      setBrand(nextLookup.device.brand ?? "");
      setModel(nextLookup.device.model ?? "");
      if (nextLookup.device.age) {
        setDeviceAge(nextLookup.device.age);
      }
      if (nextLookup.device.imei && !imei) {
        setImei(nextLookup.device.imei);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Claim Device / New Claim
        </h2>
        <p className="mt-1 text-sm text-muted">
          Register a claim by serial number. New devices are registered
          automatically if not found.
        </p>
      </div>

      {!isAnalyst && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
          You do not have permission to submit new claims.
        </div>
      )}

      <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-900">
            Device Identification
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted">
              Serial Number *
            </label>
            <input
              value={serial}
              onChange={(e) => {
                setSerial(e.target.value);
                setResult(null);
              }}
              onBlur={(e) => handleLookup(e.target.value)}
              placeholder="Example: SN-B2002"
              className="w-full border border-border px-3 py-2 rounded text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted">IMEI</label>
            <input
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              placeholder="Example: 356222222222222"
              className="w-full border border-border px-3 py-2 rounded text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-900">
            Device Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-muted">
                Device Category *
              </label>
              <select
                value={deviceCategory}
                onChange={(e) =>
                  setDeviceCategory(
                    e.target.value as "Mobile" | "Laptop" | "Tablet"
                  )
                }
                className="w-full border border-border px-3 py-2 rounded text-sm bg-white"
                disabled={categoryLocked}
              >
                <option value="Mobile">Mobile</option>
                <option value="Laptop">Laptop</option>
                <option value="Tablet">Tablet</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted">Device Brand *</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Example: Samsung"
                className="w-full border border-border px-3 py-2 rounded text-sm"
                disabled={brandLocked}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted">Device Model *</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Example: Galaxy S22"
                className="w-full border border-border px-3 py-2 rounded text-sm"
                disabled={modelLocked}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted">
                Device Age *
              </label>
              <select
                value={deviceAge}
                onChange={(e) =>
                  setDeviceAge(
                    e.target.value as
                      | "< 6 months"
                      | "6–12 months"
                      | "> 12 months"
                  )
                }
                className="w-full border border-border px-3 py-2 rounded text-sm bg-white"
                disabled={ageLocked}
              >
                <option value="< 6 months">&lt; 6 months</option>
                <option value="6–12 months">6–12 months</option>
                <option value="> 12 months">&gt; 12 months</option>
              </select>
            </div>
          </div>
          {isExisting && (
            <p className="text-xs text-muted">
              Existing device detected. Details are locked.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-900">
            Claim Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-muted">Insurer *</label>
              <select
                value={insurer}
                onChange={(e) =>
                  setInsurer(
                    e.target.value as
                      | "Alpha Insurance"
                      | "Beta Assurance"
                      | "Gamma Cover"
                  )
                }
                className="w-full border border-border px-3 py-2 rounded text-sm bg-white"
              >
                <option value="Alpha Insurance">Alpha Insurance</option>
                <option value="Beta Assurance">Beta Assurance</option>
                <option value="Gamma Cover">Gamma Cover</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted">
                Claim Reference *
              </label>
              <input
                value={claimReference}
                onChange={(e) => setClaimReference(e.target.value)}
                placeholder="Example: BETA-CLM-2025-00421"
                className="w-full border border-border px-3 py-2 rounded text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted">Loss Type *</label>
              <select
                value={lossType}
                onChange={(e) =>
                  setLossType(
                    e.target.value as
                      | "Theft"
                      | "Accidental Damage"
                      | "Loss"
                      | "Fire"
                      | "Water Damage"
                  )
                }
                className="w-full border border-border px-3 py-2 rounded text-sm bg-white"
              >
                <option value="Theft">Theft</option>
                <option value="Accidental Damage">Accidental Damage</option>
                <option value="Loss">Loss</option>
                <option value="Fire">Fire</option>
                <option value="Water Damage">Water Damage</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted">
                Date of Loss *
              </label>
              <input
                type="date"
                value={dateOfLoss}
                onChange={(e) => setDateOfLoss(e.target.value)}
                className="w-full border border-border px-3 py-2 rounded text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted">
                Claim Amount
              </label>
              <input
                type="number"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                placeholder="Example: 15000"
                className="w-full border border-border px-3 py-2 rounded text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted">
                Claim Outcome *
              </label>
              <select
                value={outcome}
                onChange={(e) =>
                  setOutcome(
                    e.target.value as
                      | "PAID_TOTAL_LOSS"
                      | "PAID_PARTIAL"
                      | "REJECTED"
                  )
                }
                className="w-full border border-border px-3 py-2 rounded text-sm bg-white"
              >
                <option value="PAID_TOTAL_LOSS">
                  PAID_TOTAL_LOSS
                </option>
                <option value="PAID_PARTIAL">PAID_PARTIAL</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-900">
            Device History & Risk Feedback
          </div>
          <div className="border border-border rounded-lg p-4 text-sm text-gray-700 space-y-2 bg-gray-50">
            {!lookup && (
              <div className="text-muted">
                Enter a serial number to view device history.
              </div>
            )}
            {lookup && !lookup.exists && (
              <>
                <div>No prior claims found for this device.</div>
                <div className="text-xs text-muted">
                  Risk status:{" "}
                  <span className="font-semibold text-green-700">
                    Clean
                  </span>
                </div>
              </>
            )}
            {lookup && lookup.exists && (
              <>
                <div className="text-amber-800">
                  Existing device detected.
                </div>
                <div>
                  Prior claims:{" "}
                  <span className="font-semibold">
                    {historySummary?.claimCount ?? 0}
                  </span>
                </div>
                <div>
                  Insurers involved:{" "}
                  <span className="font-semibold">
                    {historySummary?.insurers.length
                      ? historySummary.insurers.join(", ")
                      : "Unknown"}
                  </span>
                </div>
                <div>
                  Claim outcomes:{" "}
                  <span className="font-semibold">
                    {historySummary?.outcomes.length
                      ? historySummary.outcomes.join(", ")
                      : "Unknown"}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  Risk status:{" "}
                  <span className="font-semibold text-red-700">
                    Duplicate
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {error && <div className="text-sm text-danger">{error}</div>}

        {result && result.status === "created" && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
            New device created. Claim submitted.
          </div>
        )}

        {result && result.status === "existing" && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
            Existing device detected. Claim submitted.
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setSerial("");
              setImei("");
              setDeviceCategory("Mobile");
              setBrand("");
              setModel("");
              setDeviceAge("< 6 months");
              setInsurer("Alpha Insurance");
              setClaimReference("");
              setLossType("Theft");
              setDateOfLoss("");
              setClaimAmount("");
              setLookup(null);
              setResult(null);
              setError("");
            }}
            className="px-4 py-2 rounded text-sm text-muted hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isAnalyst) {
                const actor = user?.id ?? "system";
                const actorRole = user?.role ?? "unknown";
                writeAuditLog({
                  actor,
                  actorRole,
                  action: "PERMISSION_DENIED",
                  target: "claim-device/new",
                  outcome: "FAILURE",
                  context: "New claim submission blocked",
                });
                return;
              }
              setError("");
              const nextSerial = serial.trim();
              if (!nextSerial) {
                setError("Serial number is required.");
                return;
              }

              try {
                const actor = user?.id ?? "system";
                const actorRole = user?.role ?? "unknown";

                const nextLookup = computeLookup(nextSerial);
                setLookup(nextLookup);
                const isDeviceExisting = nextLookup.exists;
                const needsDeviceDetails = !isDeviceExisting;

              if (
                needsDeviceDetails &&
                (!deviceCategory || !brand.trim() || !model.trim() || !deviceAge)
              ) {
                setError(
                  "Device category, brand, model, and age are required for new devices."
                );
                return;
              }

              if (
                !insurer ||
                !claimReference.trim() ||
                !lossType ||
                !dateOfLoss ||
                !outcome
              ) {
                setError("Please complete all required claim fields.");
                return;
              }

              let device: RegisteredDevice;
              let status: "created" | "existing" = "existing";

                if (isDeviceExisting) {
                  const fallbackDeviceId =
                    getDeviceIdBySerial(nextSerial) ??
                    nextLookup.device?.id ??
                    `device-${nextSerial}`;
                  device =
                    nextLookup.device ?? {
                      id: fallbackDeviceId,
                      serial: nextSerial,
                      imei: imei.trim() || undefined,
                      category: deviceCategory,
                      brand: brand.trim() || undefined,
                      model: model.trim() || undefined,
                      age: deviceAge,
                      status: "Existing",
                      registeredAtUtc: new Date().toISOString(),
                    };
                } else {
                  device = createDeviceRecord({
                    serial: nextSerial,
                    imei: imei.trim() || undefined,
                    category: deviceCategory,
                    brand: brand.trim(),
                    model: model.trim(),
                    age: deviceAge,
                  });
                  status = "created";
                  writeAuditLog({
                    actor,
                    actorRole,
                    action: "DEVICE_CREATED",
                    target: device.serial,
                    outcome: "SUCCESS",
                    context: "Device created from claim intake",
                  });
                }

                createClaimEvent({
                  deviceId: device.id,
                  serial: device.serial,
                  imei: imei.trim() || device.imei,
                  deviceCategory: deviceCategory,
                  brand: device.brand,
                  model: device.model,
                  deviceAge,
                  insurer,
                  claimReference: claimReference.trim(),
                  lossType,
                  dateOfLoss,
                  claimAmount: claimAmount ? Number(claimAmount) : undefined,
                  outcome,
                });
                recordClaimForDevice({
                  serial: device.serial,
                  imei: imei.trim() || device.imei,
                  insurer,
                });

                writeAuditLog({
                  actor,
                  actorRole,
                  action: "CLAIM_SUBMITTED",
                  target: device.serial,
                  outcome: "SUCCESS",
                  context: `Claim submitted (${outcome})`,
                });

                if (isDeviceExisting) {
                  writeAuditLog({
                    actor,
                    actorRole,
                    action: "DUPLICATE_DEVICE_DETECTED",
                    target: device.serial,
                    outcome: "SUCCESS",
                    context: "Existing device detected during claim intake",
                  });
                }

                setResult({ status, device });
                handleLookup(nextSerial);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to submit claim."
                );
              }
            }}
            disabled={!canSubmit || !isAnalyst}
            className="px-4 py-2 rounded text-sm font-semibold border border-border bg-white text-gray-900 hover:border-primary hover:text-primary transition disabled:opacity-50"
          >
            Submit Claim
          </button>
        </div>
      </div>
    </div>
  );
}
