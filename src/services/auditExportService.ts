import { jsPDF } from "jspdf";
import { getAuditLog } from "./auditLogService";

export function exportAuditLogToPDF() {
  const logs = getAuditLog();

  if (logs.length === 0) {
    alert("No audit events to export.");
    return;
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const marginX = 36;
  let y = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("CLAIMS CENTRE OF TRUTH", marginX, y);
  y += 18;
  doc.setFontSize(12);
  doc.text("AUDIT LOG EXPORT", marginX, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated (UTC): ${new Date().toISOString()}`, marginX, y);
  y += 20;

  logs.forEach((log, index) => {
    const lines = [
      `#${index + 1}`,
      `Timestamp (UTC): ${log.timestampUtc}`,
      `Action: ${log.action}`,
      `Target: ${log.target}`,
      `Outcome: ${log.outcome}`,
      `Actor: ${log.actor}`,
      `Actor role: ${log.actorRole}`,
      `Context: ${log.context}`,
    ];

    if (log.details) {
      lines.push(`Details: ${JSON.stringify(log.details)}`);
    }

    lines.forEach((line) => {
      if (y > 780) {
        doc.addPage();
        y = 48;
      }
      doc.text(line, marginX, y);
      y += 14;
    });

    y += 8;
  });

  doc.save(
    `audit-log-${new Date().toISOString().slice(0, 10)}.pdf`
  );
}
