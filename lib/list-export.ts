import { exportRowsAsCsv } from "@/lib/utils";
import { logAction } from "@/modules/core/services/audit.service";
import type { UUID } from "@/modules/core/types";
import { getTenantBranding } from "@/modules/reporting/services/tenant-branding";
import { applyTenantPdfFooter, createTenantPdf, writeTable } from "@/modules/reporting/services/tenant-pdf";

/** Export filtered/sorted rows as CSV and write an audit export event. */
export function exportListCsv(opts: {
  tenantId: UUID;
  module: string;
  filename: string;
  rows: Array<Record<string, string | number>>;
}) {
  if (!opts.rows.length) return;
  exportRowsAsCsv(opts.filename.endsWith(".csv") ? opts.filename : `${opts.filename}.csv`, opts.rows);
  logAction({
    tenantId: opts.tenantId,
    module: opts.module,
    action: "export",
    entityName: "list_csv",
    newData: { filename: opts.filename, count: opts.rows.length }
  });
}

/** Export filtered/sorted rows as a tenant-branded A4 PDF table. */
export function exportListPdf(opts: {
  tenantId: UUID;
  module: string;
  title: string;
  filename: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  if (!opts.rows.length) return;
  const branding = getTenantBranding(opts.tenantId);
  const ctx = createTenantPdf(branding, opts.title);
  writeTable(
    ctx,
    ctx.contentStartY,
    opts.columns,
    opts.rows.map((r) => r.map((c) => String(c ?? "")))
  );
  applyTenantPdfFooter(ctx);
  ctx.doc.save(opts.filename.endsWith(".pdf") ? opts.filename : `${opts.filename}.pdf`);
  logAction({
    tenantId: opts.tenantId,
    module: opts.module,
    action: "export",
    entityName: "list_pdf",
    newData: { filename: opts.filename, count: opts.rows.length }
  });
}
