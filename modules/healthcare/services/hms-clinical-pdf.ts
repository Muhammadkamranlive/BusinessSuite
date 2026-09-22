import { getTenantBranding } from "@/modules/reporting/services/tenant-branding";
import {
  applyTenantPdfFooter,
  createTenantPdf,
  writeKeyValueRows,
  writeTable,
  writeWrappedText
} from "@/modules/reporting/services/tenant-pdf";
import type { HmsAdmission, HmsLabOrder, HmsLabResult, HmsPrescription } from "@/modules/healthcare/model/hms-clinical";

function downloadPdf(ctx: ReturnType<typeof createTenantPdf>, filename: string) {
  applyTenantPdfFooter(ctx);
  ctx.doc.save(filename);
}

export function exportDischargeSummaryPdf(
  tenantId: string,
  admission: HmsAdmission,
  opts: { mrn?: string; canViewMortality?: boolean }
) {
  const branding = getTenantBranding(tenantId);
  const ctx = createTenantPdf(branding, `Discharge Summary · ${admission.admission_no}`);
  const rows: Array<[string, string]> = [
    ["Admission no", admission.admission_no],
    ["Patient", admission.patient_name],
    ["MRN", opts.mrn ?? "—"],
    ["Admitted", admission.admitted_at.slice(0, 10)],
    ["Discharged", admission.discharged_at?.slice(0, 10) ?? "—"],
    ["Status", admission.status]
  ];
  if (opts.canViewMortality && admission.mortality) {
    rows.push(["Mortality", "Yes — deceased"]);
  }
  let y = writeKeyValueRows(ctx, ctx.contentStartY, rows);
  y += 6;
  y = writeWrappedText(ctx, admission.discharge_summary?.trim() || "No discharge summary recorded.", y, {
    fontSize: 9
  });
  downloadPdf(ctx, `${admission.admission_no}-discharge.pdf`);
}

export function exportPrescriptionPdf(tenantId: string, rx: HmsPrescription) {
  const branding = getTenantBranding(tenantId);
  const ctx = createTenantPdf(branding, `e-Prescription · ${rx.rx_no}`);
  let y = writeKeyValueRows(ctx, ctx.contentStartY, [
    ["Rx no", rx.rx_no],
    ["Patient", rx.patient_name],
    ["Prescriber", rx.prescriber_name],
    ["Issued", rx.issued_at?.slice(0, 10) ?? "—"],
    ["Status", rx.status]
  ]);
  y += 4;
  const tableRows = rx.items.map((item) => [
    item.drug_name,
    item.dose ?? "—",
    item.frequency ?? "—",
    item.route ?? "—",
    item.duration_days != null ? `${item.duration_days}d` : "—"
  ]);
  writeTable(ctx, y, ["Drug", "Dose", "Frequency", "Route", "Duration"], tableRows);
  downloadPdf(ctx, `${rx.rx_no}.pdf`);
}

export function exportLabReportPdf(
  tenantId: string,
  order: HmsLabOrder,
  results: HmsLabResult[],
  opts?: { mrn?: string }
) {
  const branding = getTenantBranding(tenantId);
  const ctx = createTenantPdf(branding, `Lab Report · ${order.order_no}`);
  let y = writeKeyValueRows(ctx, ctx.contentStartY, [
    ["Order no", order.order_no],
    ["Patient", order.patient_name],
    ["MRN", opts?.mrn ?? "—"],
    ["Barcode", order.sample_barcode ?? "—"],
    ["Status", order.status]
  ]);
  y += 4;
  const tableRows = results.map((r) => [
    r.test_name,
    r.result_value ?? "—",
    r.unit ?? "—",
    r.reference_range ?? "—",
    r.flag ?? "normal"
  ]);
  writeTable(ctx, y, ["Test", "Result", "Unit", "Reference", "Flag"], tableRows);
  downloadPdf(ctx, `${order.order_no}-lab-report.pdf`);
}
