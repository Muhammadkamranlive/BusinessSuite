"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { FileDropzone } from "@/components/common/file-dropzone";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { Badge, Button, Field, Panel, TextArea, TextInput } from "@/components/ui";
import { getSelfServiceContext } from "@/lib/auth/current-employee";
import { findAccountByEmail, setAccountPassword, updateAccountProfile } from "@/lib/auth/public-auth";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { automateProfileUpdated } from "@/lib/notifications/automate";
import { getRoleLabel } from "@/lib/permissions";
import { listLoginSessions } from "@/lib/auth/login-sessions";
import { persistExtraFields, getExtraFieldValues } from "@/modules/forms/services/extra-fields.store";
import { getOrCreateDirectoryUser, updateUser } from "@/modules/admin/services/admin.store";
import { getDepartmentName, getDesignationName } from "@/modules/hrm/services/hrm.store";

export default function ProfilePage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const session = getSessionProfile();
  const { employee } = getSelfServiceContext(tenantId);
  const { askSave, dialog } = useConfirm();
  const [tick, setTick] = useState(0);

  const row = useMemo(
    () =>
      getOrCreateDirectoryUser({
        name: session.name,
        email: session.email,
        role: session.role,
        title: session.title,
        tenantId
      }),
    [session.email, session.name, session.role, session.title, tenantId, tick]
  );

  const [name, setName] = useState(row.name);
  const [title, setTitle] = useState(row.title);
  const [phone, setPhone] = useState(row.phone ?? "");
  const [location, setLocation] = useState(row.location ?? "");
  const [timezone, setTimezone] = useState(row.timezone ?? "Asia/Dubai");
  const [bio, setBio] = useState(row.bio ?? "");
  const [avatar, setAvatar] = useState(row.avatar_data_url ?? "");
  const [extraJson, setExtraJson] = useState("");
  const [notice, setNotice] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const recentLogins = useMemo(() => listLoginSessions(session.email).slice(0, 5), [session.email, tick]);

  useEffect(() => {
    setName(row.name);
    setTitle(row.title);
    setPhone(row.phone ?? "");
    setLocation(row.location ?? "");
    setTimezone(row.timezone ?? "Asia/Dubai");
    setBio(row.bio ?? "");
    setAvatar(row.avatar_data_url ?? "");
    setExtraJson(getExtraFieldValues(tenantId, "dashboard.profile", row.id));
  }, [row, tenantId]);

  function doSave() {
    updateUser(row.id, {
      name: name.trim(),
      title: title.trim(),
      phone: phone.trim() || undefined,
      location: location.trim() || undefined,
      timezone: timezone.trim() || undefined,
      bio: bio.trim() || undefined,
      avatar_data_url: avatar || null
    });
    updateAccountProfile(session.email, { name: name.trim(), title: title.trim() });
    persistExtraFields(tenantId, "dashboard.profile", row.id, extraJson);
    automateProfileUpdated({
      email: session.email,
      name: name.trim() || session.name,
      tenantId,
      summary: "Name, title, contact, and profile photo settings were saved."
    });
    setNotice("Profile saved. A confirmation was queued to your email.");
    setTick((n) => n + 1);
  }

  function doChangePassword() {
    if (newPassword.length < 8) {
      setNotice("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice("New password and confirmation do not match.");
      return;
    }
    try {
      const account = findAccountByEmail(session.email);
      if (!account || account.password !== currentPassword) {
        setNotice("Current password is incorrect.");
        return;
      }
      setAccountPassword(session.email, newPassword, { byAdmin: false });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Password changed. A security email was queued.");
      setTick((n) => n + 1);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not change password.");
    }
  }

  async function onAvatar(file: File) {
    if (file.size > 600_000) {
      setNotice("Please keep the photo under 600KB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    setAvatar(dataUrl);
  }

  return (
    <AppShell activeModule="dashboard">
      <PageHeader title="My profile" description="Your account details for this company. Colleagues see this name in chat and assignments." />
      <ModuleBreadcrumbs trail={[{ label: "My profile" }]} />

      {notice ? <p className="mb-4 text-sm font-semibold text-emerald-700">{notice}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <Panel className="p-5">
          <div className="flex flex-col items-center text-center">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="size-24 rounded-full object-cover ring-2 ring-line" />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full bg-[color:var(--bs-teal)] text-2xl font-bold text-white">
                {name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </div>
            )}
            <p className="mt-3 font-bold text-ink">{name}</p>
            <p className="text-sm text-slate-500">{session.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              <Badge tone="info">{getRoleLabel(session.role)}</Badge>
              {title ? <Badge tone="neutral">{title}</Badge> : null}
            </div>
          </div>
          {employee ? (
            <div className="mt-5 rounded-[var(--bs-radius)] border border-line bg-cloud p-3 text-left text-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Linked employee</p>
              <p className="mt-1 font-semibold text-ink">{employee.full_name}</p>
              <p className="text-slate-500">{employee.employee_no}</p>
              <p className="text-slate-500">
                {getDepartmentName(employee.department_id)} · {getDesignationName(employee.designation_id)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button href={`/hrm/employees/${employee.id}`} className="!min-h-8 !px-3 !text-xs">Worker profile</Button>
                <Button href="/hrm/organization" variant="secondary" className="!min-h-8 !px-3 !text-xs">Organization</Button>
                <Button href="/hrm/my-pay" variant="ghost" className="!min-h-8 !px-3 !text-xs">My Pay</Button>
              </div>
            </div>
          ) : null}
        </Panel>

        <Panel className="p-5">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: true, entityLabel: "profile", onConfirm: doSave });
            }}
          >
            <Field label="Full name">
              <TextInput required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Job title">
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Email">
              <TextInput readOnly value={session.email} className="bg-cloud" />
            </Field>
            <Field label="Phone">
              <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Location">
              <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, country" />
            </Field>
            <Field label="Timezone">
              <TextInput value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </Field>
            <Field label="About" className="md:col-span-2">
              <TextArea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short professional bio for colleagues" />
            </Field>
            <div className="md:col-span-2">
              <FileDropzone
                label="Profile photo"
                hint="Square image, under 600KB"
                accept=".png,.jpg,.jpeg,.webp"
                previewUrl={avatar || undefined}
                fileName={avatar ? "Photo" : undefined}
                onFile={(file) => void onAvatar(file)}
                onClear={() => setAvatar("")}
              />
            </div>
            <ExtraFieldsBlock formKey="dashboard.profile" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2">
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-base font-bold text-ink">Change password</h2>
          <p className="mt-1 text-sm text-slate-500">
            Changing your password sends a security email and an in-app notification automatically.
          </p>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              askSave({ editing: true, entityLabel: "password", onConfirm: doChangePassword });
            }}
          >
            <Field label="Current password">
              <TextInput
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field label="New password">
              <TextInput
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirm new password">
              <TextInput
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>
            <Button type="submit">Update password</Button>
          </form>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-base font-bold text-ink">Recent sign-ins</h2>
          <p className="mt-1 text-sm text-slate-500">
            Device and browser fingerprints captured on each login.
          </p>
          {recentLogins.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No sign-ins recorded yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {recentLogins.map((s) => (
                <li key={s.id} className="py-3 text-sm">
                  <p className="font-semibold text-ink">{s.label}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(s.at).toLocaleString()} · {s.device.timezone}
                    {s.is_new_device ? " · New device" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      {dialog}
    </AppShell>
  );
}
