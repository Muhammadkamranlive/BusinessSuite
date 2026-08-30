export type SortDir = "asc" | "desc";

export function matchesSearch(row: unknown, query: string, fields: string[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const obj = row as Record<string, unknown>;
  return fields.some((field) => String(obj[field] ?? "").toLowerCase().includes(q));
}

export function sortByField<T>(rows: T[], field: string, dir: SortDir = "asc"): T[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[field];
    const bv = (b as Record<string, unknown>)[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }) * mul;
  });
}

export function filterAndSort<T extends Record<string, unknown>>(
  rows: T[],
  opts: {
    search?: string;
    searchFields: string[];
    statusField?: string;
    statusValue?: string;
    sortField?: string;
    sortDir?: SortDir;
  }
) {
  let next = rows;
  if (opts.search) next = next.filter((r) => matchesSearch(r, opts.search!, opts.searchFields));
  if (opts.statusField && opts.statusValue && opts.statusValue !== "all") {
    next = next.filter((r) => String(r[opts.statusField!]) === opts.statusValue);
  }
  if (opts.sortField) next = sortByField(next, opts.sortField, opts.sortDir ?? "asc");
  return next;
}

export function rowsToExportRecords<T extends Record<string, unknown>>(rows: T[], columns: Array<{ key: keyof T | string; header: string }>) {
  return rows.map((row) => {
    const out: Record<string, string | number> = {};
    for (const col of columns) {
      const raw = row[col.key as string];
      out[col.header] = raw == null ? "" : typeof raw === "number" ? raw : String(raw);
    }
    return out;
  });
}
