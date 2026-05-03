import { useState } from "react";
import { recordClaim } from "../services/deviceDataService";
import { writeAuditLog } from "../services/auditLogService";

type Props = {
  onClose: () => void;
  onRecorded: (imei: string) => void;
};

export default function RecordClaimModal({ onClose, onRecorded }: Props) {
  const [imei, setIMEI] = useState("");
  const [serial, setSerial] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [amount, setAmount] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const claim = recordClaim({
      imei,
      serial,
      brand,
      model,
      amount: Number(amount),
    });

    // 🔐 Audit log
    writeAuditLog({
      actor: "john.doe", // later: pull from auth context
      actorRole: "Fraud Analyst",
      action: "CLAIM_RECORDED",
      target: imei,
      outcome: "RECORDED",
      context: "Claim recorded via manual entry",
      details: {
        amount: Number(amount),
        brand,
        model,
      },
    });

    onRecorded(claim.imei);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[120]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-xl w-[420px] p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold">
            Record New Claim
          </h2>

          <input
            required
            placeholder="IMEI"
            value={imei}
            onChange={(e) => setIMEI(e.target.value)}
            className="w-full border border-border px-3 py-2 rounded"
          />

          <input
            required
            placeholder="Serial Number"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            className="w-full border border-border px-3 py-2 rounded"
          />

          <input
            required
            placeholder="Brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full border border-border px-3 py-2 rounded"
          />

          <input
            required
            placeholder="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full border border-border px-3 py-2 rounded"
          />

          <input
            required
            type="number"
            placeholder="Claim Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-border px-3 py-2 rounded"
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded text-sm"
            >
              Submit Claim
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
