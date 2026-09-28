"use client";

import { useEffect, useMemo, useState } from "react";
import { PharmacyShell } from "@/components/pharmacy/pharmacy-shell";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { Button } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import {
  formatMoneyAmount,
  formatNationalIdDisplay,
  formatPhoneDisplay
} from "@/lib/locale/contact-formats";
import { resolveTenantContactFormat, resolveTenantCountry } from "@/lib/locale/resolve-tenant-country";
import { getSystemSettings } from "@/modules/admin/services/admin.store";
import { printPharmacyReceipt } from "@/modules/pharmacy/services/pharmacy-receipt";
import {
  listPharmacySales,
  subscribePharmacy,
  type PharmacySale
} from "@/modules/pharmacy/services/pharmacy.store";

export default function PharmacySalesPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const country = resolveTenantCountry(tenantId);
  const contact = resolveTenantContactFormat(tenantId);
  const currency = getSystemSettings().currency || contact.currencyCode;
  const money = (n: number) => formatMoneyAmount(n, country, currency);
  const [rows, setRows] = useState<PharmacySale[]>([]);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  function refresh() {
    setRows(listPharmacySales(tenantId));
  }

  useEffect(() => {
    refresh();
    return subscribePharmacy(refresh);
  }, [tenantId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.sale_no, r.customer_name, r.customer_phone, r.customer_national_id, r.tender, r.cashier]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const open = filtered.find((r) => r.id === openId) ?? null;

  return (
    <PharmacyShell title="Sales history" description="Completed counter invoices from Alif POS.">
      <DataListToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search sale no, phone, or customer…" />
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-[color:var(--bs-cloud)] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Sale #</th>
              <th className="px-3 py-2.5">Customer</th>
              <th className="px-3 py-2.5">Phone</th>
              <th className="px-3 py-2.5">{contact.nationalId.label}</th>
              <th className="px-3 py-2.5">Tender</th>
              <th className="px-3 py-2.5">Total</th>
              <th className="px-3 py-2.5">When</th>
              <th className="px-3 py-2.5"> </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-teal/5"
                onClick={() => setOpenId(row.id)}
              >
                <td className="px-3 py-2.5 font-semibold text-ink">{row.sale_no}</td>
                <td className="px-3 py-2.5">{row.customer_name}</td>
                <td className="px-3 py-2.5 tabular-nums text-slate-700">
                  {row.customer_phone ? formatPhoneDisplay(country, row.customer_phone) : "—"}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {row.customer_national_id
                    ? formatNationalIdDisplay(country, row.customer_national_id)
                    : "—"}
                </td>
                <td className="px-3 py-2.5 capitalize">{row.tender}</td>
                <td className="px-3 py-2.5 font-semibold">{money(row.total)}</td>
                <td className="px-3 py-2.5 text-slate-600">{new Date(row.sold_at).toLocaleString()}</td>
                <td className="px-3 py-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-9 px-2.5 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      printPharmacyReceipt({ tenantId, sale: row });
                    }}
                  >
                    Reprint
                  </Button>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-slate-500">
                  No sales yet — complete a sale in Point of sale.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {open ? (
        <div className="mt-4 rounded-xl border border-line bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-ink">{open.sale_no}</p>
              <p className="text-xs text-slate-500">
                {open.customer_name}
                {open.customer_phone ? ` · ${formatPhoneDisplay(country, open.customer_phone)}` : ""}
                {open.customer_national_id
                  ? ` · ${contact.nationalId.label} ${formatNationalIdDisplay(country, open.customer_national_id)}`
                  : ""}
                {" · "}
                {open.cashier} · {open.tender}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="min-h-10"
                onClick={() => printPharmacyReceipt({ tenantId, sale: open })}
              >
                Reprint bill
              </Button>
              <p className="text-lg font-bold text-ink">{money(open.total)}</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {open.lines.map((l) => (
              <li key={`${l.batch_id}-${l.qty}`} className="flex justify-between gap-3 border-b border-line/60 py-1.5">
                <span>
                  {l.name}{" "}
                  <span className="text-slate-500">
                    ×{l.qty} · {l.batch_no}
                  </span>
                </span>
                <span className="font-semibold">{money(l.line_total)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PharmacyShell>
  );
}
