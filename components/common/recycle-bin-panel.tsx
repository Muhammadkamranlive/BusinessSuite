"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Panel, StatTile } from "@/components/ui";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import {
  clearFromModuleBin,
  emptyModuleTrash,
  emptyTrash,
  listTrash,
  purgeTrashItem,
  restoreTrashItem,
  trashStats,
  type TrashAudience,
  type TrashItem
} from "@/modules/core/services/trash.store";

// Ensure module restore handlers are registered.
import "@/modules/crm/services/crm.store";
import "@/modules/sales/services/sales.store";
import "@/modules/purchase/services/purchase.store";
import "@/modules/inventory/services/inventory.store";
import "@/modules/finance/services/finance.store";
import "@/modules/projects/services/projects.store";
import "@/modules/hrm/services/hrm.store";

export function RecycleBinPanel({
  tenantId,
  audience,
  moduleKey,
  title = "Recycle bin",
  description,
  canPurgeForever = false
}: {
  tenantId: string;
  audience: TrashAudience;
  /** When set, only that module’s items are shown (module bins). */
  moduleKey?: string;
  title?: string;
  description?: string;
  /** Admin can permanently destroy; module users only clear from their bin. */
  canPurgeForever?: boolean;
}) {
  const { askRestore, askPurge, ask, dialog } = useConfirm();
  const [rows, setRows] = useState<TrashItem[]>([]);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [sortField, setSortField] = useState("deleted_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [message, setMessage] = useState("");

  function refresh() {
    setRows(listTrash(tenantId, { module: moduleKey, audience }));
  }

  useEffect(() => {
    refresh();
  }, [tenantId, moduleKey, audience]);

  const stats = useMemo(
    () => trashStats(tenantId, { module: moduleKey, audience }),
    [tenantId, moduleKey, audience, rows]
  );
  const modules = useMemo(() => [...new Set(rows.map((r) => r.module))].sort(), [rows]);

  const filtered = useMemo(() => {
    return filterAndSort(rows.map((r) => ({ ...r }) as Record<string, unknown> & TrashItem), {
      search,
      searchFields: ["label", "module", "entity_name", "entity_id"],
      statusField: moduleKey ? undefined : "module",
      statusValue: moduleKey ? undefined : moduleFilter,
      sortField,
      sortDir
    }) as TrashItem[];
  }, [rows, search, moduleFilter, sortField, sortDir, moduleKey]);

  function doExportCsv() {
    exportListCsv({
      tenantId,
      module: moduleKey ?? "settings",
      filename: `recycle-bin-${moduleKey ?? "admin"}-${tenantId}`,
      rows: filtered.map((r) => ({
        Module: r.module,
        Entity: r.entity_name,
        Label: r.label,
        DeletedAt: r.deleted_at,
        DeletedBy: r.deleted_by ?? "",
        ModuleCleared: r.module_cleared_at ?? ""
      }))
    });
  }

  function doExportPdf() {
    exportListPdf({
      tenantId,
      module: moduleKey ?? "settings",
      title,
      filename: `recycle-bin-${moduleKey ?? "admin"}-${tenantId}`,
      columns: ["Module", "Entity", "Label", "Deleted"],
      rows: filtered.map((r) => [r.module, r.entity_name, r.label, new Date(r.deleted_at).toLocaleString()])
    });
  }

  return (
    <>
      {description ? <p className="mb-4 text-sm text-slate-500">{description}</p> : null}
      {message ? <p className="mb-4 text-sm font-semibold text-teal">{message}</p> : null}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <StatTile label="In this bin" value={String(stats.total)} detail={audience === "admin" ? "Admin view" : "Module view"} icon={Trash2} tone="coral" />
        {!moduleKey ? (
          <StatTile label="Modules" value={String(Object.keys(stats.byModule).length)} detail="With trash items" icon={Trash2} tone="amber" />
        ) : (
          <StatTile label="Showing" value={String(filtered.length)} detail="After search" icon={Trash2} tone="amber" />
        )}
        {audience === "admin" ? (
          <StatTile
            label="Cleared by modules"
            value={String(stats.adminOnly)}
            detail="Gone from module bins"
            icon={Trash2}
            tone="teal"
          />
        ) : (
          <StatTile label="Showing" value={String(filtered.length)} detail="After search / filter" icon={Trash2} tone="teal" />
        )}
      </div>

      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search label, entity…"
          filterLabel={!moduleKey ? "modules" : undefined}
          filterValue={!moduleKey ? moduleFilter : undefined}
          filterOptions={!moduleKey ? modules.map((m) => ({ value: m, label: m })) : undefined}
          onFilterChange={!moduleKey ? setModuleFilter : undefined}
          sortValue={sortField}
          sortOptions={[
            { value: "deleted_at", label: "Deleted date" },
            { value: "label", label: "Label" },
            { value: "module", label: "Module" },
            { value: "entity_name", label: "Entity" }
          ]}
          onSortChange={setSortField}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          onExportCsv={doExportCsv}
          onExportPdf={doExportPdf}
          rightSlot={
            <Button
              variant="danger"
              disabled={!stats.total}
              onClick={() =>
                ask({
                  title: canPurgeForever ? "Empty admin recycle bin?" : "Empty module recycle bin?",
                  message: canPurgeForever
                    ? `Permanently delete all ${stats.total} trashed records for this company? This cannot be undone.`
                    : `Remove all ${stats.total} items from this module bin? They will remain in the Administration recycle bin until an admin deletes them forever.`,
                  confirmLabel: canPurgeForever ? "Empty bin forever" : "Clear module bin",
                  tone: "danger",
                  onConfirm: () => {
                    if (canPurgeForever) {
                      const n = emptyTrash(tenantId);
                      setMessage(`Permanently emptied ${n} records.`);
                    } else if (moduleKey) {
                      const n = emptyModuleTrash(tenantId, moduleKey);
                      setMessage(`Cleared ${n} items from this module bin (kept for admin).`);
                    }
                    refresh();
                  }
                })
              }
            >
              {canPurgeForever ? "Empty forever" : "Clear bin"}
            </Button>
          }
        />

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cloud">
                {["Label", "Module", "Entity", "Deleted", "By", audience === "admin" ? "Status" : "", ""].map((h, i) => (
                  <th key={`${h}-${i}`} className="px-3 py-3 font-semibold text-slate-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    Recycle bin is empty.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-line">
                    <td className="px-3 py-3 font-medium">{r.label}</td>
                    <td className="px-3 py-3 capitalize">{r.module}</td>
                    <td className="px-3 py-3">{r.entity_name}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{new Date(r.deleted_at).toLocaleString()}</td>
                    <td className="px-3 py-3">{r.deleted_by ?? "-"}</td>
                    {audience === "admin" ? (
                      <td className="px-3 py-3 text-xs">
                        {r.module_cleared_at ? (
                          <span className="rounded bg-amber-50 px-2 py-1 font-semibold text-amber-800">Admin only</span>
                        ) : (
                          <span className="rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">In module bin</span>
                        )}
                      </td>
                    ) : (
                      <td className="px-3 py-3" />
                    )}
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          className="!min-h-8 !px-3 !text-xs"
                          onClick={() =>
                            askRestore({
                              entityLabel: r.entity_name,
                              name: r.label,
                              onConfirm: () => {
                                const result = restoreTrashItem(r.id);
                                setMessage(result.ok ? `Restored ${r.label}.` : result.error);
                                refresh();
                              }
                            })
                          }
                        >
                          Restore
                        </Button>
                        <Button
                          variant="danger"
                          className="!min-h-8 !px-3 !text-xs"
                          onClick={() => {
                            if (canPurgeForever) {
                              askPurge({
                                entityLabel: r.entity_name,
                                name: r.label,
                                onConfirm: () => {
                                  purgeTrashItem(r.id);
                                  setMessage(`Permanently deleted ${r.label}.`);
                                  refresh();
                                }
                              });
                              return;
                            }
                            ask({
                              title: `Remove from ${moduleKey ?? "module"} recycle bin?`,
                              message: `${r.label} will disappear from this module bin but stay in the Administration recycle bin until an admin deletes it forever.`,
                              confirmLabel: "Remove from module",
                              tone: "danger",
                              onConfirm: () => {
                                clearFromModuleBin(r.id);
                                setMessage(
                                  `Removed ${r.label} from this module bin. It remains in Administration recycle bin.`
                                );
                                refresh();
                              }
                            });
                          }}
                        >
                          {canPurgeForever ? "Delete forever" : "Delete from module"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog}
    </>
  );
}
