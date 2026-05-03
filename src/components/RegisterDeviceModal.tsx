import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  registerDeviceBySerial,
  type RegisteredDevice,
} from "../services/deviceRegistryService";
import { getClaims } from "../services/deviceDataService";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onOpenCase?: (imei: string) => void;
};

export default function RegisterDeviceModal({
  isOpen,
  onClose,
  onOpenCase,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [serial, setSerial] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [result, setResult] = useState<{
    status: "created" | "existing";
    device: RegisteredDevice;
  } | null>(null);
  const [error, setError] = useState("");

  const claims = useMemo(() => getClaims(), []);
  const serialSuggestions = useMemo(() => {
    const set = new Set(claims.map((c) => c.serial));
    return Array.from(set);
  }, [claims]);

  if (!isOpen) return null;

  const canSubmit = serial.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[140]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-[520px] p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Register Device</h2>
            <p className="text-sm text-muted">
              Register a device by serial number for proactive fraud
              detection.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted">
              Serial Number
            </label>
            <input
              list="serial-suggestions"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="Enter serial number"
              className="w-full border border-border px-3 py-2 rounded text-sm"
            />
            <datalist id="serial-suggestions">
              {serialSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-muted">Brand</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Device brand (optional)"
                className="w-full border border-border px-3 py-2 rounded text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted">Model</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Device model (optional)"
                className="w-full border border-border px-3 py-2 rounded text-sm"
              />
            </div>
          </div>

          {error && <div className="text-sm text-danger">{error}</div>}

          {result && result.status === "created" && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
              Device successfully registered.
            </div>
          )}

          {result && result.status === "existing" && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 space-y-2">
              <div>This serial number already exists in the system.</div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/search/serial")}
                  className="text-xs text-primary hover:underline"
                >
                  View existing device
                </button>
                {result.device.imei &&
                  (user?.role === "manager" ||
                    user?.role === "admin") &&
                  onOpenCase && (
                    <button
                      type="button"
                      onClick={() => onOpenCase(result.device.imei!)}
                      className="text-xs text-primary hover:underline"
                    >
                      Open investigation case
                    </button>
                  )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setError("");
                onClose();
              }}
              className="text-sm text-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setError("");
                try {
                  const actor = user?.id ?? "system";
                  const actorRole = user?.role ?? "unknown";
                  const outcome = registerDeviceBySerial({
                    serial,
                    brand,
                    model,
                    actor,
                    actorRole,
                  });
                  setResult(outcome);
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Unable to register device."
                  );
                }
              }}
              disabled={!canSubmit}
              className="bg-primary text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
