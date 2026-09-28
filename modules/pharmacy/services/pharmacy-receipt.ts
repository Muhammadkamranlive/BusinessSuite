import { formatMoneyAmount, formatNationalIdDisplay, formatPhoneDisplay } from "@/lib/locale/contact-formats";
import { resolveTenantContactFormat, resolveTenantCountry } from "@/lib/locale/resolve-tenant-country";
import { getSystemSettings } from "@/modules/admin/services/admin.store";
import { getTenantBranding } from "@/modules/reporting/services/tenant-branding";
import type { PharmacySale } from "@/modules/pharmacy/services/pharmacy.store";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shop name for thermal receipts — tenant letterhead / demo tenant. */
export function getPharmacyShopName(tenantId: string) {
  const branding = getTenantBranding(tenantId);
  if (tenantId === "alpha" && !/pharmacy/i.test(branding.legalName)) {
    return "Alpha Pharmacy";
  }
  return branding.title?.trim() || branding.legalName;
}

export type PharmacyReceiptOptions = {
  tenantId: string;
  sale: PharmacySale;
  /** Optional override (defaults from tenant branding). */
  pharmacyName?: string;
};

/**
 * Epson TM-T series style ~80mm thermal receipt: opens a print window,
 * renders a compact monospace table + QR, calls window.print(), then closes.
 */
export function printPharmacyReceipt(opts: PharmacyReceiptOptions) {
  if (typeof window === "undefined") return;

  const branding = getTenantBranding(opts.tenantId);
  const pharmacyName = opts.pharmacyName?.trim() || getPharmacyShopName(opts.tenantId);
  const sale = opts.sale;
  const country = resolveTenantCountry(opts.tenantId);
  const contact = resolveTenantContactFormat(opts.tenantId);
  const currency = getSystemSettings().currency || contact.currencyCode;
  const money = (n: number) => formatMoneyAmount(n, country, currency);
  const when = new Date(sale.sold_at);
  const dateStr = when.toLocaleDateString(contact.moneyLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const timeStr = when.toLocaleTimeString(contact.moneyLocale, {
    hour: "2-digit",
    minute: "2-digit"
  });

  const qrPayload = encodeURIComponent(
    `ALIF|${sale.sale_no}|${sale.total.toFixed(2)}|${sale.tenant_id}`
  );
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrPayload}`;

  const addressLine = [branding.address, branding.phone].filter(Boolean).join(" · ");

  const phoneDisplay = sale.customer_phone
    ? formatPhoneDisplay(country, sale.customer_phone)
    : "";
  const idDisplay = sale.customer_national_id
    ? formatNationalIdDisplay(country, sale.customer_national_id)
    : "";

  const customerBits: string[] = [];
  if (sale.customer_name && sale.customer_name !== "Walk-in") {
    customerBits.push(`<div class="row"><span>Customer</span><span>${escapeHtml(sale.customer_name)}</span></div>`);
  }
  if (phoneDisplay) {
    customerBits.push(`<div class="row"><span>Phone</span><span>${escapeHtml(phoneDisplay)}</span></div>`);
  }
  if (idDisplay) {
    customerBits.push(
      `<div class="row"><span>${escapeHtml(contact.nationalId.label)}</span><span>${escapeHtml(idDisplay)}</span></div>`
    );
  }

  const itemRows = sale.lines
    .map(
      (line, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td>${escapeHtml(line.name)}${line.batch_no ? `<br/><span class="muted">${escapeHtml(line.batch_no)}</span>` : ""}</td>
      <td class="r">${line.qty}</td>
      <td class="r">${line.unit_price.toFixed(0)}</td>
      <td class="r">${line.line_total.toFixed(0)}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(sale.sale_no)}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Courier New", Courier, monospace;
      font-size: 11px;
      color: #111;
      width: 72mm;
      max-width: 72mm;
      margin: 0 auto;
      padding: 2mm;
      line-height: 1.35;
    }
    .center { text-align: center; }
    .shop {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .muted { color: #444; font-size: 10px; }
    .rule {
      border: none;
      border-top: 1px dashed #333;
      margin: 6px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      margin: 1px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    th, td {
      padding: 2px 0;
      vertical-align: top;
      font-size: 10px;
    }
    th {
      border-bottom: 1px solid #333;
      text-align: left;
      font-weight: 700;
    }
    .r { text-align: right; white-space: nowrap; }
    .c { text-align: center; width: 14px; }
    .totals .row { font-size: 11px; }
    .totals .grand { font-size: 13px; font-weight: 700; margin-top: 3px; }
    .qr { margin-top: 8px; }
    .qr img { width: 28mm; height: 28mm; }
    .foot { margin-top: 6px; }
    @media print {
      body { width: 72mm; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="shop">${escapeHtml(pharmacyName)}</div>
    ${addressLine ? `<div class="muted">${escapeHtml(addressLine)}</div>` : ""}
  </div>
  <hr class="rule" />
  <div class="row"><span>Bill #</span><span>${escapeHtml(sale.sale_no)}</span></div>
  <div class="row"><span>Date</span><span>${escapeHtml(dateStr)} ${escapeHtml(timeStr)}</span></div>
  <div class="row"><span>Cashier</span><span>${escapeHtml(sale.cashier || "—")}</span></div>
  ${customerBits.length ? `<hr class="rule" />${customerBits.join("")}` : ""}
  <hr class="rule" />
  <table>
    <thead>
      <tr>
        <th class="c">#</th>
        <th>Item</th>
        <th class="r">Qty</th>
        <th class="r">Rate</th>
        <th class="r">Amt</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <hr class="rule" />
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${escapeHtml(money(sale.subtotal))}</span></div>
    ${sale.discount > 0 ? `<div class="row"><span>Discount</span><span>- ${escapeHtml(money(sale.discount))}</span></div>` : ""}
    <div class="row grand"><span>TOTAL</span><span>${escapeHtml(money(sale.total))}</span></div>
    <div class="row"><span>Paid (${escapeHtml(sale.tender)})</span><span>${escapeHtml(money(sale.amount_paid))}</span></div>
    <div class="row"><span>Change</span><span>${escapeHtml(money(sale.change_due))}</span></div>
  </div>
  <div class="center qr">
    <img src="${qrUrl}" alt="QR" width="120" height="120" />
    <div class="muted">${escapeHtml(sale.sale_no)}</div>
  </div>
  <hr class="rule" />
  <div class="center foot">
    Thank you for your purchase.<br/>
    Medicines once sold are non-returnable unless defective.<br/>
    Keep this bill for your records.
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.focus();
        window.print();
        setTimeout(function () { window.close(); }, 400);
      }, 250);
    };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer,width=360,height=720");
  if (!win) {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
