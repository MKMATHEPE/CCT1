import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { writeAuditLog } from "../services/auditLogService";
import {
  ensureApiAvailable,
  recordClaim,
  refreshClaims,
  submitBulkClaims,
  useClaims,
} from "../services/deviceDataService";

const outcomeOptions = [
  { value: "approved", label: "Approve" },
  { value: "rejected", label: "Reject" },
  { value: "pending", label: "Pending" },
] as const;

type ImportRow = Record<string, unknown>;
type ImportError = {
  row: number;
  reason: string;
};

type ImportResult = {
  processed: number;
  duplicates: number;
  skipped: number;
  errors: ImportError[];
};

type XLSXModule = {
  read: (data: Uint8Array, options: { type: "array" }) => {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: {
    sheet_to_json: (
      sheet: unknown,
      options?: {
        defval?: string;
        raw?: boolean;
      }
    ) => ImportRow[];
    aoa_to_sheet: (rows: string[][]) => unknown;
    book_new: () => unknown;
    book_append_sheet: (
      workbook: unknown,
      worksheet: unknown,
      name: string
    ) => void;
  };
  writeFile: (workbook: unknown, filename: string) => void;
};

declare global {
  interface Window {
    XLSX?: XLSXModule;
  }
}

type ClaimPrefillState = {
  prefillIdentifier?: string;
  prefillMode?: "imei" | "serial" | "identifier";
};

export default function ClaimDeviceNewClaimPage() {
  const { user } = useAuth();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadProgressTimerRef = useRef<number | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [imeiNumber, setImeiNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [claimOutcome, setClaimOutcome] = useState("");
  const [dateOfLoss, setDateOfLoss] = useState("");
  const [reason, setReason] = useState("");
  const [paidOutValue, setPaidOutValue] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [importFileName, setImportFileName] = useState("Upload Excel file");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const claims = useClaims();
  const insurerName = user?.insurerName ?? "";
  const prefillState = (location.state as ClaimPrefillState | null) ?? null;

  useEffect(() => {
    return () => {
      if (uploadProgressTimerRef.current !== null) {
        window.clearInterval(uploadProgressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const prefillIdentifier = prefillState?.prefillIdentifier?.trim() ?? "";
    if (!prefillIdentifier) {
      return;
    }

    const shouldUseSerial =
      prefillState?.prefillMode === "serial" ||
      (prefillState?.prefillMode === "identifier" && !/^\d{14,}$/.test(prefillIdentifier));

    if (shouldUseSerial) {
      setSerialNumber((current) => current || prefillIdentifier);
      return;
    }

    setImeiNumber((current) => current || prefillIdentifier);
  }, [prefillState]);

  function clearUploadProgressTimer() {
    if (uploadProgressTimerRef.current !== null) {
      window.clearInterval(uploadProgressTimerRef.current);
      uploadProgressTimerRef.current = null;
    }
  }

  function setUploadProgressImmediate(value: number) {
    clearUploadProgressTimer();
    setUploadProgress(Math.max(0, Math.min(100, Math.round(value))));
  }

  function animateUploadProgress(
    target: number,
    options?: {
      intervalMs?: number;
      maxStep?: number;
    }
  ) {
    clearUploadProgressTimer();
    const safeTarget = Math.max(0, Math.min(100, Math.round(target)));
    const intervalMs = options?.intervalMs ?? 80;
    const maxStep = options?.maxStep ?? 2;

    uploadProgressTimerRef.current = window.setInterval(() => {
      setUploadProgress((current) => {
        if (current >= safeTarget) {
          clearUploadProgressTimer();
          return current;
        }

        const remaining = safeTarget - current;
        const step = Math.min(
          maxStep,
          remaining,
          Math.max(1, Math.ceil(remaining / 8))
        );

        return current + step;
      });
    }, intervalMs);
  }

  function resetForm() {
    setDeviceName("");
    setImeiNumber("");
    setSerialNumber("");
    setClaimOutcome("");
    setDateOfLoss("");
    setReason("");
    setPaidOutValue("");
  }

  function handlePaidOutValueChange(value: string) {
    const sanitized = value.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    const normalized =
      parts.length <= 2
        ? sanitized
        : `${parts[0]}.${parts.slice(1).join("")}`;
    setPaidOutValue(normalized);
  }

  async function handleSubmit() {
    const actor = user?.id ?? "system";
    const actorRole = user?.role ?? "unknown";
    const trimmedInsurerName = insurerName.trim();
    const trimmedDeviceName = deviceName.trim();
    const trimmedImeiNumber = imeiNumber.trim();
    const trimmedSerialNumber = serialNumber.trim();
    const trimmedReason = reason.trim();
    const amount = Number(paidOutValue);

    setError("");
    setSuccessMessage("");

    if (
      !trimmedDeviceName ||
      !claimOutcome ||
      !dateOfLoss ||
      !trimmedReason ||
      !paidOutValue
    ) {
      setError("Complete all claim fields before submitting.");
      return;
    }

    if (!trimmedImeiNumber && !trimmedSerialNumber) {
      setError("Enter at least one device identifier: IMEI or serial number.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid claim amount greater than 0.");
      return;
    }

    setIsSubmitting(true);

    try {
      const claim = await recordClaim({
        insurer: trimmedInsurerName,
        deviceName: trimmedDeviceName,
        imei: trimmedImeiNumber,
        serial: trimmedSerialNumber,
        dateOfLoss,
        reason: trimmedReason,
        amount,
        outcome: claimOutcome as "approved" | "rejected" | "pending",
      });

      writeAuditLog({
        actor,
        actorRole,
        action: "CLAIM_RECORDED",
        target: trimmedImeiNumber || trimmedSerialNumber,
        outcome: "RECORDED",
        context: "Claim recorded via Log A Claim page",
        details: {
          amount,
          insurer: trimmedInsurerName,
          deviceName: trimmedDeviceName,
          reason: trimmedReason,
          serial: trimmedSerialNumber,
          outcome: claim.outcome,
        },
      });

      await refreshClaims().catch(() => undefined);

      setSuccessMessage(
        `Claim recorded successfully. Outcome: ${claim.outcome}.`
      );
      resetForm();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to record claim."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function getXLSX() {
    return window.XLSX;
  }

  function normalizeKey(key: string) {
    return key.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function getValue(row: ImportRow, keys: string[]): unknown {
    const entries = Object.entries(row);

    for (const key of keys) {
      const directValue = row[key];
      if (directValue !== undefined && directValue !== "") {
        return directValue;
      }

      const normalizedTarget = normalizeKey(key);
      const matchedEntry = entries.find(([entryKey, entryValue]) => {
        return (
          normalizeKey(entryKey) === normalizedTarget &&
          entryValue !== undefined &&
          entryValue !== ""
        );
      });

      if (matchedEntry) {
        return matchedEntry[1];
      }
    }

    return undefined;
  }

  function toTrimmedString(value: unknown) {
    return String(value ?? "").trim();
  }

  function normalizeImportedOutcome(value: string) {
    const normalized = value.trim().toLowerCase();
    if (normalized === "approved" || normalized === "approve") {
      return "approved" as const;
    }
    if (normalized === "rejected" || normalized === "reject" || normalized === "declined") {
      return "rejected" as const;
    }
    if (normalized === "pending" || normalized === "review" || normalized === "in review") {
      return "pending" as const;
    }
    return undefined;
  }

  function splitDeviceNameParts(deviceName: string) {
    const trimmed = deviceName.trim();
    if (!trimmed) {
      return {
        brand: "Unknown",
        model: "Unknown Device",
      };
    }

    const [brand, ...modelParts] = trimmed.split(/\s+/);
    return {
      brand: brand || "Unknown",
      model: modelParts.join(" ") || "Unknown Device",
    };
  }

  function mapRow(row: ImportRow) {
    const imeiOrSerial = toTrimmedString(
      getValue(row, ["IMEI / Serial Number", "IMEI/Serial Number"])
    );
    const directImei = toTrimmedString(getValue(row, ["IMEI"]));
    const directSerial = toTrimmedString(getValue(row, ["Serial", "Serial Number"]));
    const deviceName = toTrimmedString(
      getValue(row, ["Device Name / Model", "Device Name", "Model"])
    );
    const insurer = toTrimmedString(getValue(row, ["Insurer"]));
    const outcome = toTrimmedString(
      getValue(row, ["ClaimType", "Claim Outcome", "Outcome"])
    );
    const amount = toTrimmedString(getValue(row, ["Amount", "Claim Amount"]));
    const dateOfLoss = toTrimmedString(
      getValue(row, ["DateOfLoss", "Date of Loss", "Loss Date"])
    );
    const reason = toTrimmedString(getValue(row, ["Reason"]));

    const imei = directImei || extractIMEI(imeiOrSerial);
    const serial = directSerial || extractSerial(imeiOrSerial);
    const deviceParts = splitDeviceNameParts(deviceName);

    return {
      imei,
      serial,
      deviceName,
      brand: deviceParts.brand,
      model: deviceParts.model,
      insurer,
      outcome,
      amount,
      dateOfLoss,
      reason,
    };
  }

  function extractIMEI(value: string) {
    return value.split("\n")[0]?.trim() ?? "";
  }

  function extractSerial(value: string) {
    return value.split("\n")[1]?.trim() ?? "";
  }

  function cleanAmount(value: string) {
    return value.replace("R", "").replace(/\s/g, "").trim();
  }

  function parseDate(value: string) {
    return new Date(value);
  }

  async function processImportedClaims(rows: ImportRow[]): Promise<ImportResult> {
    await ensureApiAvailable();
    setUploadStage("Validating rows");
    setUploadProgressImmediate(35);

    const actor = user?.id ?? "system";
    const actorRole = user?.role ?? "unknown";
    const result: ImportResult = {
      processed: 0,
      duplicates: 0,
      skipped: 0,
      errors: [],
    };

    function markRowAsInvalid(row: number, reason: string) {
      result.skipped += 1;
      result.errors.push({ row, reason });
    }

    const existingIdentifiers = new Set(
      claims.flatMap((claim) => [claim.imei.trim(), claim.serial.trim()]).filter(Boolean)
    );
    const seenIdentifiers = new Set<string>();
    const payloads: Array<{
      insurer: string;
      deviceName: string;
      imei: string;
      serial: string;
      dateOfLoss: string;
      reason: string;
      amount: number;
      outcome?: "approved" | "rejected" | "pending";
      target: string;
      importRow: number;
    }> = [];

    for (const [index, row] of rows.entries()) {
      try {
        const mappedRow = mapRow(row);
        const rowNumber = index + 2;
        const imei = mappedRow.imei;
        const serial = mappedRow.serial;
        const importedDeviceName =
          mappedRow.deviceName || `${mappedRow.brand} ${mappedRow.model}`.trim();
        const importedInsurer =
          insurerName || mappedRow.insurer;
        const importedOutcome = normalizeImportedOutcome(mappedRow.outcome);
        const parsedDate = mappedRow.dateOfLoss
          ? parseDate(mappedRow.dateOfLoss)
          : new Date();
        const amountValue = mappedRow.amount;
        const importedReason = mappedRow.reason;
        const finalImportReason =
          importedReason ||
          `Imported via bulk upload${importedOutcome ? ` (${importedOutcome})` : ""}`;

        if (!imei && !serial) {
          markRowAsInvalid(rowNumber, "Missing identifier");
          continue;
        }

        const amount = Number(cleanAmount(amountValue).replace(/,/g, "."));
        if (!Number.isFinite(amount) || amount <= 0) {
          markRowAsInvalid(rowNumber, "Invalid claim amount");
          continue;
        }

        if (mappedRow.dateOfLoss && Number.isNaN(parsedDate.getTime())) {
          markRowAsInvalid(rowNumber, "Invalid date of loss");
          continue;
        }

        const identifiers = [imei.trim(), serial.trim()].filter(Boolean);
        const alreadyExists = identifiers.some((identifier) =>
          existingIdentifiers.has(identifier)
        );

        if (alreadyExists) {
          result.duplicates += 1;
          continue;
        }

        const duplicateInFile = identifiers.some((identifier) =>
          seenIdentifiers.has(identifier)
        );
        if (duplicateInFile) {
          result.duplicates += 1;
          continue;
        }

        identifiers.forEach((identifier) => seenIdentifiers.add(identifier));
        payloads.push({
          insurer: importedInsurer,
          deviceName: importedDeviceName || "Unknown Device",
          imei,
          serial,
          dateOfLoss: parsedDate.toISOString(),
          reason: finalImportReason,
          amount,
          outcome: importedOutcome,
          target: imei || serial,
          importRow: index + 1,
        });
        const validationProgress = 35 + (((index + 1) / rows.length) * 30);
        setUploadProgressImmediate(validationProgress);
      } catch (err) {
        console.error("Row failed:", index, err);
        markRowAsInvalid(
          index + 2,
          err instanceof Error ? err.message : "Unexpected import error"
        );
      }
    }

    if (payloads.length === 0) {
      setUploadStage("Import complete");
      setUploadProgressImmediate(100);

      if (result.duplicates > 0 || result.skipped > 0) {
        setSuccessMessage(
          `Import complete: 0 processed, ${result.duplicates} duplicates, ${result.skipped} skipped${result.errors.length > 0 ? `. Errors: ${result.errors.map((error) => `row ${error.row} ${error.reason}`).join("; ")}` : ""}`
        );
        return result;
      }

      throw new Error(
        `No valid rows found. Check column headers. ${JSON.stringify(result.errors)}`
      );
    }

    setUploadStage("Uploading claims");
    setUploadProgressImmediate(68);
    animateUploadProgress(92, {
      intervalMs: 90,
      maxStep: Math.max(1, Math.min(4, Math.ceil(payloads.length / 40))),
    });
    const bulkResult = await submitBulkClaims(payloads);
    result.processed += bulkResult.processed;
    result.duplicates += bulkResult.duplicates;
    result.skipped += bulkResult.skipped;
    result.errors.push(...bulkResult.errors);

    const savedRows = new Set(bulkResult.processedRows);
    payloads
      .filter((payload) => savedRows.has(payload.importRow + 1))
      .forEach((payload) => {
        writeAuditLog({
          actor,
          actorRole,
          action: "CLAIM_RECORDED",
          target: payload.target,
          outcome: "RECORDED",
          context: "Claim recorded via bulk import",
          details: {
            insurer: payload.insurer,
            deviceName: payload.deviceName,
            serial: payload.serial,
            reason: payload.reason,
            outcome: payload.outcome ?? "pending",
            importRow: payload.importRow,
          },
        });
      });

    setUploadStage("Refreshing data");
    setUploadProgressImmediate(94);
    animateUploadProgress(99, {
      intervalMs: 120,
      maxStep: 1,
    });
    await refreshClaims().catch(() => undefined);
    setUploadStage("Import complete");
    setUploadProgressImmediate(100);

    setSuccessMessage(
      `Import complete: ${result.processed} processed, ${result.duplicates} duplicates, ${result.skipped} skipped${result.errors.length > 0 ? `. Errors: ${result.errors.map((error) => `row ${error.row} ${error.reason}`).join("; ")}` : ""}`
    );

    return result;
  }

  function handleExcelUpload() {
    const file = fileInputRef.current?.files?.[0];
    const xlsx = getXLSX();

    setError("");
    setSuccessMessage("");

    if (!xlsx) {
      setError("Excel import library is not available.");
      return;
    }

    if (!file) {
      setError("Please upload an Excel file.");
      return;
    }

    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      const readProgress = (event.loaded / event.total) * 25;
      setUploadStage("Reading file");
      setUploadProgressImmediate(10 + readProgress);
    };
    reader.onload = async (event) => {
      try {
        const result = event.target?.result;
        if (!(result instanceof ArrayBuffer)) {
          throw new Error("Unable to read file.");
        }

        const workbook = xlsx.read(new Uint8Array(result), { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, {
          defval: "",
          raw: false,
        });

        console.log("Headers:", Object.keys(rows[0] ?? {}));
        console.log("First row:", rows[0] ?? null);

        if (!rows.length) {
          setError("The uploaded file does not contain any claim rows.");
          return;
        }

        setIsSubmitting(true);
        setUploadStage("Preparing import");
        setUploadProgressImmediate(32);
        await processImportedClaims(rows);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to import claims."
        );
        clearUploadProgressTimer();
        setUploadStage("");
        setUploadProgress(0);
      } finally {
        setIsSubmitting(false);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  function handleSelectedImportFile(file: File | null) {
    if (!file) {
      setImportFileName("Upload Excel file");
      clearUploadProgressTimer();
      setUploadProgress(0);
      setUploadStage("");
      return;
    }

    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
    }

    setImportFileName(file.name);
    setError("");
    setSuccessMessage("");
    clearUploadProgressTimer();
    setUploadProgress(0);
    setUploadStage("");
  }

  const inputCls = "w-full rounded-xl border px-4 py-3 text-sm text-white outline-none transition";
  const inputStyle = { background: "#0f172a", borderColor: "rgba(255,255,255,0.08)", caretColor: "#f97316" };
  const labelCls = "block text-xs font-semibold uppercase tracking-[0.18em]";
  const labelStyle = { color: "#64748b" };
  const hintStyle = { color: "#475569" };

  return (
    <div>
      <section
        className="rounded-2xl p-6"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "#475569" }}>
            Claim Intake
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            Log a new claim
          </h1>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-300">
            {successMessage}
          </div>
        )}

        {/* Bulk import */}
        <div
          className="mt-6 rounded-xl border border-dashed p-5 transition"
          style={{
            borderColor: isDraggingFile ? "rgba(249,115,22,0.5)" : "rgba(255,255,255,0.1)",
            background: isDraggingFile ? "rgba(249,115,22,0.05)" : "rgba(255,255,255,0.02)",
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
          onDragEnter={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingFile(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingFile(false);
            handleSelectedImportFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          <div className="text-sm font-semibold text-white">Bulk Import Claims</div>
          <p className="mt-2 text-sm" style={{ color: "#64748b" }}>
            Drag and drop an Excel or CSV file here, or choose a file manually.
          </p>

          {(uploadProgress > 0 || uploadStage) && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#64748b" }}>
                <span>{uploadStage || "Uploading"}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, background: "linear-gradient(90deg,#f97316,#ef4444)" }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <input
              ref={fileInputRef}
              type="file"
              id="excelUpload"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => handleSelectedImportFile(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="excelUpload"
              className="inline-flex cursor-pointer items-center rounded-xl border px-4 py-2.5 text-sm font-medium transition text-white"
              style={{
                background: importFileName === "Upload Excel file" ? "rgba(255,255,255,0.05)" : "rgba(249,115,22,0.1)",
                borderColor: importFileName === "Upload Excel file" ? "rgba(255,255,255,0.1)" : "rgba(249,115,22,0.3)",
                color: importFileName === "Upload Excel file" ? "#94a3b8" : "#fb923c",
              }}
            >
              {importFileName === "Upload Excel file" ? "Upload Excel file" : importFileName}
            </label>

            <button
              type="button"
              onClick={handleExcelUpload}
              disabled={isSubmitting}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#f97316,#ef4444)", boxShadow: "0 4px 16px rgba(239,68,68,0.25)" }}
            >
              {isSubmitting ? "Importing..." : "Import Claims"}
            </button>
          </div>

          <p className="mt-3 text-xs" style={{ color: "#475569" }}>
            Upload multiple claims at once. Include at least one device identifier
            column per row: IMEI or Serial, plus Brand, Model, ClaimType, Amount, and DateOfLoss.
          </p>
        </div>

        <p className="my-4 text-center text-xs tracking-[0.22em]" style={{ color: "#334155" }}>
          OR MANUALLY CAPTURE
        </p>

        <form
          id="claimForm"
          className="mt-2 grid gap-5 lg:grid-cols-2"
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        >
          <div className="space-y-2">
            <label className={labelCls} style={labelStyle}>Device Name / Model</label>
            <input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Apple iPhone 13 Pro"
              className={inputCls}
              style={inputStyle}
            />
          </div>

          <div className="space-y-2">
            <label className={labelCls} style={labelStyle}>IMEI Number</label>
            <input
              value={imeiNumber}
              onChange={(e) => setImeiNumber(e.target.value)}
              placeholder="Enter IMEI if available"
              className={inputCls}
              style={inputStyle}
            />
            <div className="text-xs" style={hintStyle}>Enter IMEI or provide a serial number instead.</div>
          </div>

          <div className="space-y-2">
            <label className={labelCls} style={labelStyle}>Serial Number</label>
            <input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Enter serial if IMEI is unavailable"
              className={inputCls}
              style={inputStyle}
            />
            <div className="text-xs" style={hintStyle}>At least one of IMEI or serial number is required.</div>
          </div>

          <div className="space-y-2">
            <label className={labelCls} style={labelStyle}>Claim Outcome</label>
            <select
              value={claimOutcome}
              onChange={(e) => setClaimOutcome(e.target.value)}
              className={inputCls}
              style={{ ...inputStyle, colorScheme: "dark" }}
            >
              <option value="">Select outcome</option>
              {outcomeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className={labelCls} style={labelStyle}>Date Of Loss</label>
            <input
              type="date"
              value={dateOfLoss}
              onChange={(e) => setDateOfLoss(e.target.value)}
              className={inputCls}
              style={{ ...inputStyle, colorScheme: "dark" }}
            />
          </div>

          <div className="space-y-2">
            <label className={labelCls} style={labelStyle}>Claim Amount</label>
            <div
              className="flex items-center rounded-xl border px-4 py-3 text-sm transition"
              style={inputStyle}
            >
              <span className="mr-3 font-semibold" style={{ color: "#475569" }}>R</span>
              <input
                type="text"
                inputMode="decimal"
                value={paidOutValue}
                onChange={(e) => handlePaidOutValueChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-sm text-white outline-none"
                style={{ caretColor: "#f97316" }}
              />
            </div>
            <div className="text-xs" style={hintStyle}>Enter amount in South African Rand (ZAR).</div>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className={labelCls} style={labelStyle}>Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border px-4 py-3 text-sm text-white outline-none transition"
              style={inputStyle}
            />
          </div>
        </form>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            form="claimForm"
            disabled={isSubmitting}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#f97316,#ef4444)", boxShadow: "0 4px 16px rgba(239,68,68,0.25)" }}
          >
            {isSubmitting ? "Submitting..." : "Log Claim"}
          </button>
        </div>
      </section>
    </div>
  );
}
