import { jsPDF } from "jspdf";
import { getCaseById } from "./caseDomainService";
import { getClaims } from "./deviceDataService";

export function exportCaseReportToPDF(caseId: string) {
  const record = getCaseById(caseId);
  if (!record) {
    throw new Error("Case not found.");
  }

  const claims = getClaims().filter((claim) =>
    record.linkedClaimIds.includes(claim.id)
  );

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
  doc.text("CASE REPORT", marginX, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated (UTC): ${new Date().toISOString()}`, marginX, y);
  y += 18;
  doc.text(`Case ID: ${record.caseId}`, marginX, y);
  y += 14;
  doc.text(`Status: ${record.status}`, marginX, y);
  y += 14;
  doc.text(`Risk level: ${record.riskLevel}`, marginX, y);
  y += 14;
  doc.text(`Assigned to: ${record.assignedTo ?? "Unassigned"}`, marginX, y);
  y += 14;
  if (record.closedAt) {
    doc.text(
      `Closed at (UTC): ${new Date(record.closedAt).toISOString()}`,
      marginX,
      y
    );
    y += 14;
  }
  if (record.closeOutcome) {
    doc.text(`Closure outcome: ${record.closeOutcome}`, marginX, y);
    y += 14;
  }
  if (record.closeReason) {
    doc.text(`Closure reason: ${record.closeReason}`, marginX, y);
    y += 14;
  }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Linked Devices", marginX, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  if (record.linkedIMEIs.length === 0) {
    doc.text("None", marginX, y);
    y += 14;
  } else {
    record.linkedIMEIs.forEach((imei) => {
      doc.text(imei, marginX, y);
      y += 12;
    });
    y += 6;
  }

  if (record.evidenceSnapshot) {
    doc.setFont("helvetica", "bold");
    doc.text("Evidence Snapshot", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(
      `Source: Duplicate Device Detection`,
      marginX,
      y
    );
    y += 12;
    doc.text(`Serial: ${record.evidenceSnapshot.serial}`, marginX, y);
    y += 12;
    doc.text(
      `IMEI: ${record.evidenceSnapshot.imei ?? "—"}`,
      marginX,
      y
    );
    y += 12;
    doc.text(
      `Insurers: ${record.evidenceSnapshot.insurers.join(", ")}`,
      marginX,
      y
    );
    y += 12;
    doc.text(
      `Outcomes: ${record.evidenceSnapshot.outcomes.join(", ")}`,
      marginX,
      y
    );
    y += 16;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Claims", marginX, y);
  y += 14;
  doc.setFont("helvetica", "normal");

  if (claims.length === 0) {
    doc.text("No claims linked to this case.", marginX, y);
    y += 14;
  } else {
    claims.forEach((claim) => {
      const lines = [
        `#${claim.id} ${claim.brand} ${claim.model}`,
        `Outcome: ${claim.outcome} | Amount: R ${claim.amount.toLocaleString()}`,
        `Submitted: ${new Date(claim.timestamp).toLocaleString()}`,
      ];

      lines.forEach((line) => {
        if (y > 780) {
          doc.addPage();
          y = 48;
        }
        doc.text(line, marginX, y);
        y += 12;
      });
      y += 8;
    });
  }

  if (record.notes.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Notes", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    record.notes.forEach((note, index) => {
      if (y > 780) {
        doc.addPage();
        y = 48;
      }
      doc.text(
        `${index + 1}. ${note.author} (${new Date(
          note.createdAtUtc
        ).toLocaleString()}): ${note.content}`,
        marginX,
        y
      );
      y += 12;
    });
  }

  doc.save(
    `case-report-${record.caseId}-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`
  );
}
