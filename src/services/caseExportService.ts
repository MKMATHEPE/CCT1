import { jsPDF } from "jspdf";
import { getClaimsByIMEI } from "./deviceDataService";
import { getCase } from "./caseService";

export function exportCaseReportToPDF(imei: string) {
  const caseRecord = getCase(imei);
  const claims = getClaimsByIMEI(imei);

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
  doc.text(`IMEI: ${imei}`, marginX, y);
  y += 14;
  if (caseRecord) {
    doc.text(`Status: ${caseRecord.status}`, marginX, y);
    y += 14;
    doc.text(
      `Assigned to: ${caseRecord.assignedTo ?? "Unassigned"}`,
      marginX,
      y
    );
    y += 14;
  }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Claims", marginX, y);
  y += 14;
  doc.setFont("helvetica", "normal");

  if (claims.length === 0) {
    doc.text("No claims linked to this IMEI.", marginX, y);
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

  if (caseRecord?.notes.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Notes", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    caseRecord.notes.forEach((note, index) => {
      if (y > 780) {
        doc.addPage();
        y = 48;
      }
      doc.text(`${index + 1}. ${note}`, marginX, y);
      y += 12;
    });
  }

  doc.save(
    `case-report-${imei}-${new Date().toISOString().slice(0, 10)}.pdf`
  );
}
