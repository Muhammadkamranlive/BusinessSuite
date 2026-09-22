"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Button, Field, Panel, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { exportListCsv } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { persistExtraFields } from "@/modules/forms/services/extra-fields.store";
import {
  createDutyRoster,
  createStaff,
  listDutyRosters,
  listStaff,
  pullHmsClinicalFromSupabase,
  subscribeHmsClinical,
  updateStaff,
  type HmsDutyRoster,
  type HmsStaff
} from "@/modules/healthcare/services/hms-clinical.store";

export default function HmsRostersPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [tab, setTab] = useState<"staff" | "roster">("staff");
  const [staffRows, setStaffRows] = useState<HmsStaff[]>([]);
  const [rosterRows, setRosterRows] = useState<HmsDutyRoster[]>([]);
  const [search, setSearch] = useState("");
  const [openStaff, setOpenStaff] = useState(false);
  const [openRoster, setOpenRoster] = useState(false);
  const [editingStaff, setEditingStaff] = useState<HmsStaff | null>(null);
  const [staffForm, setStaffForm] = useState({ full_name: "", email: "", role_title: "", department: "", license_no: "" });
  const [rosterForm, setRosterForm] = useState({ staff_id: "", staff_name: "", shift_date: "", shift_type: "day" as const, ward_name: "" });
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setStaffRows(listStaff(tenantId));
    setRosterRows(listDutyRosters(tenantId));
  }
  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    return subscribeHmsClinical(() => refresh());
  }, [tenantId]);

  const staffFiltered = useMemo(
    () =>
      filterAndSort(staffRows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["staff_no", "full_name", "role_title", "department"],
        sortField: "full_name",
        sortDir: "asc"
      }) as unknown as HmsStaff[],
    [staffRows, search]
  );

  const rosterFiltered = useMemo(
    () =>
      filterAndSort(rosterRows as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["staff_name", "ward_name", "shift_date"],
        sortField: "shift_date",
        sortDir: "asc"
      }) as unknown as HmsDutyRoster[],
    [rosterRows, search]
  );

  function doSaveStaff() {
    if (!staffForm.full_name.trim()) return;
    if (editingStaff) {
      updateStaff(editingStaff.id, {
        full_name: staffForm.full_name.trim(),
        email: staffForm.email || null,
        role_title: staffForm.role_title || null,
        department: staffForm.department || null,
        license_no: staffForm.license_no || null
      });
      persistExtraFields(tenantId, "healthcare.hms.staff", editingStaff.id, extraJson);
    } else {
      const row = createStaff(tenantId, {
        full_name: staffForm.full_name.trim(),
        email: staffForm.email || null,
        role_title: staffForm.role_title || null,
        department: staffForm.department || null,
        license_no: staffForm.license_no || null,
        license_expiry: null
      });
      persistExtraFields(tenantId, "healthcare.hms.staff", row.id, extraJson);
    }
    setOpenStaff(false);
    refresh();
  }

  function doSaveRoster() {
    if (!rosterForm.staff_name.trim() || !rosterForm.shift_date) return;
    const row = createDutyRoster(tenantId, {
      staff_id: rosterForm.staff_id || null,
      staff_name: rosterForm.staff_name.trim(),
      shift_date: rosterForm.shift_date,
      shift_type: rosterForm.shift_type,
      ward_name: rosterForm.ward_name || null
    });
    persistExtraFields(tenantId, "healthcare.hms.roster", row.id, extraJson);
    setOpenRoster(false);
    refresh();
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Staff & duty rosters"
        description="Clinical staff registry and shift scheduling."
        actionLabel={tab === "staff" ? "Add staff" : "Add shift"}
        onAction={() => {
          if (tab === "staff") {
            setEditingStaff(null);
            setStaffForm({ full_name: "", email: "", role_title: "", department: "", license_no: "" });
            setOpenStaff(true);
          } else {
            const s = staffRows[0];
            setRosterForm({ staff_id: s?.id ?? "", staff_name: s?.full_name ?? "", shift_date: new Date().toISOString().slice(0, 10), shift_type: "day", ward_name: "" });
            setOpenRoster(true);
          }
        }}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button type="button" variant={tab === "staff" ? "primary" : "secondary"} onClick={() => setTab("staff")}>
          Staff ({staffRows.length})
        </Button>
        <Button type="button" variant={tab === "roster" ? "primary" : "secondary"} onClick={() => setTab("roster")}>
          Rosters ({rosterRows.length})
        </Button>
      </div>
      {openStaff ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: Boolean(editingStaff), entityLabel: "staff", onConfirm: doSaveStaff });
            }}
          >
            <Field label="Full name">
              <TextInput required value={staffForm.full_name} onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })} />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
            </Field>
            <Field label="Role">
              <TextInput value={staffForm.role_title} onChange={(e) => setStaffForm({ ...staffForm, role_title: e.target.value })} />
            </Field>
            <Field label="Department">
              <TextInput value={staffForm.department} onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })} />
            </Field>
            <Field label="License no">
              <TextInput value={staffForm.license_no} onChange={(e) => setStaffForm({ ...staffForm, license_no: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.staff" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Save</Button>
              <Button type="button" variant="ghost" onClick={() => setOpenStaff(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {openRoster ? (
        <Panel className="mb-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: false, entityLabel: "duty roster", onConfirm: doSaveRoster });
            }}
          >
            <Field label="Staff">
              <SelectInput
                value={rosterForm.staff_id}
                onChange={(e) => {
                  const s = staffRows.find((x) => x.id === e.target.value);
                  setRosterForm({ ...rosterForm, staff_id: e.target.value, staff_name: s?.full_name ?? rosterForm.staff_name });
                }}
              >
                <option value="">Select…</option>
                {staffRows.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.staff_no} · {s.full_name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Shift date">
              <TextInput type="date" required value={rosterForm.shift_date} onChange={(e) => setRosterForm({ ...rosterForm, shift_date: e.target.value })} />
            </Field>
            <Field label="Shift type">
              <SelectInput value={rosterForm.shift_type} onChange={(e) => setRosterForm({ ...rosterForm, shift_type: e.target.value as typeof rosterForm.shift_type })}>
                <option value="day">Day</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </SelectInput>
            </Field>
            <Field label="Ward">
              <TextInput value={rosterForm.ward_name} onChange={(e) => setRosterForm({ ...rosterForm, ward_name: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <ExtraFieldsBlock formKey="healthcare.hms.roster" valueJson={extraJson} onChange={setExtraJson} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Save shift</Button>
              <Button type="button" variant="ghost" onClick={() => setOpenRoster(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <Panel>
        <DataListToolbar
          search={search}
          onSearchChange={setSearch}
          onExportCsv={() =>
            exportListCsv({
              tenantId,
              module: "healthcare",
              filename: tab === "staff" ? "hms-staff" : "hms-rosters",
              rows:
                tab === "staff"
                  ? staffFiltered.map((r) => ({ StaffNo: r.staff_no, Name: r.full_name, Role: r.role_title ?? "", Dept: r.department ?? "" }))
                  : rosterFiltered.map((r) => ({ Date: r.shift_date, Staff: r.staff_name, Shift: r.shift_type, Ward: r.ward_name ?? "" }))
            })
          }
        />
        <div className="mt-3 overflow-x-auto">
          {tab === "staff" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Staff</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {staffFiltered.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-3 py-3">
                      <div className="font-semibold">{row.full_name}</div>
                      <div className="text-xs text-slate-500">{row.staff_no}</div>
                    </td>
                    <td>{row.role_title ?? "—"}</td>
                    <td>{row.department ?? "—"}</td>
                    <td>
                      <RecordRowActions
                        onEdit={() => {
                          setEditingStaff(row);
                          setStaffForm({
                            full_name: row.full_name,
                            email: row.email ?? "",
                            role_title: row.role_title ?? "",
                            department: row.department ?? "",
                            license_no: row.license_no ?? ""
                          });
                          setOpenStaff(true);
                        }}
                        onTrash={() => undefined}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Date</th>
                  <th>Staff</th>
                  <th>Shift</th>
                  <th>Ward</th>
                </tr>
              </thead>
              <tbody>
                {rosterFiltered.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-3 py-3">{row.shift_date}</td>
                    <td>{row.staff_name}</td>
                    <td>{row.shift_type}</td>
                    <td>{row.ward_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </AppShell>
  );
}
