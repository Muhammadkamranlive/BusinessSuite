import { jsPDF } from "jspdf";
import type { TenantBranding } from "@/modules/reporting/model";

/** ISO A4 in millimetres. All ERP PDFs must use this page box. */
export const PDF_PAGE = {
  format: "a4" as const,
  unit: "mm" as const,
  orientation: "portrait" as const,
  width: 210,
  height: 297,
  /** ~0.7in — keeps print heads and hole punches off the content. */
  marginX: 18,
  marginTop: 14,
  marginBottom: 18
};

export function pdfContentBox() {
  const left = PDF_PAGE.marginX;
  const right = PDF_PAGE.width - PDF_PAGE.marginX;
  return {
    left,
    right,
    width: right - left,
    top: PDF_PAGE.marginTop,
    /** Last baseline allowed for body text (above footer). */
    contentBottom: PDF_PAGE.height - PDF_PAGE.marginBottom - 8,
    footerY: PDF_PAGE.height - 10
  };
}

export type TenantPdfDoc = {
  doc: jsPDF;
  /** Current Y after letterhead; start content here. */
  contentStartY: number;
  brandColor: string;
  branding: TenantBranding;
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return [24, 119, 242];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function newA4Doc() {
  return new jsPDF({
    orientation: PDF_PAGE.orientation,
    unit: PDF_PAGE.unit,
    format: PDF_PAGE.format
  });
}

/** Create a branded PDF with tenant letterhead, A4 + print margins. */
export function createTenantPdf(branding: TenantBranding, subtitle: string): TenantPdfDoc {
  const doc = newA4Doc();
  const box = pdfContentBox();
  const brandColor = branding.brandColor || "#1877f2";
  const [r, g, b] = hexToRgb(brandColor);
  let y = box.top;

  doc.setDrawColor(r, g, b);
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, PDF_PAGE.width, 3, "F");

  const hasLogo = Boolean(branding.logoDataUrl);
  if (branding.logoDataUrl) {
    try {
      const fmt = branding.logoDataUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(branding.logoDataUrl, fmt, box.left, y, 18, 18);
    } catch {
      /* ignore bad logos */
    }
  }

  const textX = hasLogo ? box.left + 22 : box.left;
  const textWidth = box.right - textX;

  doc.setTextColor(20, 24, 33);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const nameLines = doc.splitTextToSize(branding.title || branding.legalName, textWidth) as string[];
  doc.text(nameLines, textX, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 90, 105);
  let textY = y + 6 + nameLines.length * 5;
  if (branding.tagline) {
    const tagLines = doc.splitTextToSize(branding.tagline, textWidth);
    doc.text(tagLines, textX, textY);
    textY += tagLines.length * 3.6;
  }

  const contactBits = [branding.address, branding.phone, branding.email, branding.taxId ? `Tax/NTN: ${branding.taxId}` : null].filter(
    Boolean
  ) as string[];
  if (contactBits.length) {
    const contactLines = doc.splitTextToSize(contactBits.join(" · "), textWidth);
    doc.text(contactLines, textX, textY);
    textY += contactLines.length * 3.5;
  }

  y = Math.max(y + (hasLogo ? 20 : 0), textY) + 4;
  doc.setDrawColor(217, 225, 236);
  doc.setLineWidth(0.3);
  doc.line(box.left, y, box.right, y);
  y += 7;

  doc.setTextColor(r, g, b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const titleLines = doc.splitTextToSize(subtitle, box.width);
  doc.text(titleLines, box.left, y);
  y += titleLines.length * 5 + 2;

  doc.setTextColor(100, 110, 125);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString()} · ${branding.legalName}`, box.left, y, {
    maxWidth: box.width
  });
  y += 8;

  return { doc, contentStartY: y, brandColor, branding };
}

/** Draw footer on every page, inside the bottom margin. */
export function applyTenantPdfFooter(ctx: TenantPdfDoc) {
  const { doc, branding } = ctx;
  const box = pdfContentBox();
  const pageCount = doc.getNumberOfPages();
  const footer = branding.footer || "Confidential — BusinessSuite ERP";
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(217, 225, 236);
    doc.setLineWidth(0.25);
    doc.line(box.left, box.footerY - 4, box.right, box.footerY - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140, 150, 160);
    const pageLabel = `Page ${i} of ${pageCount}`;
    const pageW = doc.getTextWidth(pageLabel);
    const footerMax = box.width - pageW - 6;
    doc.text(doc.splitTextToSize(footer, footerMax)[0] ?? footer, box.left, box.footerY);
    doc.text(pageLabel, box.right, box.footerY, { align: "right" });
  }
}

export function pdfMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function cellLines(doc: jsPDF, value: string, width: number): string[] {
  const raw = String(value ?? "").replace(/\s+/g, " ").trim() || "—";
  const split = doc.splitTextToSize(raw, Math.max(8, width));
  return Array.isArray(split) ? split : [String(split)];
}

function layoutColumnWidths(doc: jsPDF, headers: string[], rows: string[][], totalWidth: number, gap: number): number[] {
  const n = Math.max(1, headers.length);
  const available = totalWidth - gap * Math.max(0, n - 1);
  const minW = Math.min(22, available / n);
  const scores = headers.map((header, i) => {
    const headerW = doc.getTextWidth(header) + 2;
    let maxW = headerW;
    for (const row of rows.slice(0, 40)) {
      const sample = String(row[i] ?? "");
      const clip = sample.length > 80 ? `${sample.slice(0, 80)}…` : sample;
      maxW = Math.max(maxW, doc.getTextWidth(clip));
    }
    return Math.max(minW, Math.min(maxW, available * 0.62));
  });
  const sum = scores.reduce((a, b) => a + b, 0) || 1;
  let widths = scores.map((s) => Math.max(minW, (s / sum) * available));
  const drift = available - widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] += drift;
  return widths;
}

function columnsFromXs(colXs: number[], count: number, box: ReturnType<typeof pdfContentBox>, gap: number) {
  const xs = colXs.slice(0, count).map((x) => Math.max(box.left, Math.min(x, box.right - 8)));
  while (xs.length < count) xs.push((xs[xs.length - 1] ?? box.left) + 24);
  const widths: number[] = [];
  for (let i = 0; i < count; i++) {
    const next = i < count - 1 ? xs[i + 1] : box.right + gap;
    widths.push(Math.max(10, next - xs[i] - gap));
  }
  const overflow = xs[0] + widths.reduce((a, w) => a + w, 0) + gap * (count - 1) - box.right;
  if (overflow > 0) widths[widths.length - 1] = Math.max(10, widths[widths.length - 1] - overflow);
  return { xs, widths };
}

export function writeWrappedText(
  ctx: TenantPdfDoc,
  text: string,
  startY: number,
  opts?: { x?: number; width?: number; lineH?: number; fontSize?: number }
) {
  const { doc } = ctx;
  const box = pdfContentBox();
  const x = opts?.x ?? box.left;
  const width = opts?.width ?? box.right - x;
  const lineH = opts?.lineH ?? 4.6;
  doc.setFontSize(opts?.fontSize ?? 9);
  const lines = cellLines(doc, text, width);
  let y = startY;
  for (const line of lines) {
    if (y > box.contentBottom) {
      doc.addPage();
      y = box.top + 8;
    }
    doc.text(line, x, y);
    y += lineH;
  }
  return y;
}

/** Simple key/value rows; values wrap inside the right margin. */
export function writeKeyValueRows(
  ctx: TenantPdfDoc,
  startY: number,
  rows: Array<[string, string]>,
  opts?: { col2X?: number; lineH?: number }
) {
  const { doc } = ctx;
  const box = pdfContentBox();
  const labelW = Math.min(58, box.width * 0.38);
  const valueX = opts?.col2X ? Math.min(Math.max(opts.col2X, box.left + labelW), box.right - 40) : box.left + labelW + 4;
  const valueW = box.right - valueX;
  const lineH = opts?.lineH ?? 4.4;
  let y = startY;
  doc.setFontSize(9);

  for (const [label, value] of rows) {
    const labelLines = cellLines(doc, label, labelW);
    doc.setFont("helvetica", "bold");
    const valueLines = cellLines(doc, value, valueW);
    const rowH = Math.max(labelLines.length, valueLines.length) * lineH;
    if (y + rowH > box.contentBottom) {
      doc.addPage();
      y = box.top + 8;
    }
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 70, 85);
    doc.text(labelLines, box.left, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 24, 33);
    doc.text(valueLines, valueX, y);
    y += rowH + 1.2;
  }
  return y;
}

/**
 * Table that wraps cells and stays inside A4 side margins.
 * `colXs` is optional; when omitted, column widths follow content.
 */
export function writeTable(
  ctx: TenantPdfDoc,
  startY: number,
  headers: string[],
  rows: string[][],
  colXs?: number[]
) {
  const { doc, brandColor } = ctx;
  const box = pdfContentBox();
  const [r, g, b] = hexToRgb(brandColor);
  const gap = 2.4;
  const fontSize = headers.length > 5 ? 7 : 8;
  const lineH = fontSize === 7 ? 3.6 : 4.1;

  doc.setFontSize(fontSize);
  const laidOut = colXs && colXs.length
    ? columnsFromXs(colXs, headers.length, box, gap)
    : { xs: [] as number[], widths: layoutColumnWidths(doc, headers, rows, box.width, gap) };
  if (!laidOut.xs.length) {
    let x = box.left;
    for (const w of laidOut.widths) {
      laidOut.xs.push(x);
      x += w + gap;
    }
  }

  let y = startY;

  const paintHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    const headerLines = headers.map((h, i) => cellLines(doc, h, laidOut.widths[i] ?? 12));
    const headerH = Math.max(...headerLines.map((l) => l.length), 1) * lineH + 2;
    if (y + headerH > box.contentBottom) {
      doc.addPage();
      y = box.top + 8;
    }
    doc.setFillColor(246, 248, 251);
    doc.rect(box.left, y - 4, box.width, headerH + 1.5, "F");
    doc.setTextColor(r, g, b);
    headerLines.forEach((lines, i) => {
      doc.text(lines, laidOut.xs[i] ?? box.left, y);
    });
    y += headerH;
    doc.setDrawColor(217, 225, 236);
    doc.setLineWidth(0.25);
    doc.line(box.left, y, box.right, y);
    y += 4;
  };

  paintHeader();
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 35, 45);

  for (const row of rows) {
    const wrapped = headers.map((_, i) => cellLines(doc, String(row[i] ?? ""), laidOut.widths[i] ?? 12));
    const rowH = Math.max(...wrapped.map((l) => l.length), 1) * lineH + 1.6;
    if (y + rowH > box.contentBottom) {
      doc.addPage();
      y = box.top + 8;
      paintHeader();
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 35, 45);
    }
    wrapped.forEach((lines, i) => {
      doc.text(lines, laidOut.xs[i] ?? box.left, y);
    });
    y += rowH;
  }
  return y;
}
