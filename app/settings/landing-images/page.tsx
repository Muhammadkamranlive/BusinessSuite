"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageIcon, RotateCcw, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { useConfirm } from "@/components/common/use-confirm";
import { Button, Field, Panel, TextInput } from "@/components/ui";
import { getSessionProfile } from "@/lib/auth/session-profile";
import {
  LANDING_MEDIA_SLOTS,
  defaultLandingMedia,
  fetchLandingMedia,
  mergeLandingMedia,
  resetLandingMedia,
  saveLandingMedia,
  uploadLandingMediaImage,
  type LandingMediaMap,
  type LandingMediaSlot
} from "@/lib/marketing-media";
import { canMenu } from "@/modules/admin/services/acl.store";

export default function LandingImagesAdminPage() {
  const actor = getSessionProfile();
  const allowed = canMenu(actor.role, actor.email, "settings.landing_images", "view");
  const canUpdate = canMenu(actor.role, actor.email, "settings.landing_images", "update");
  const { askSave, ask, dialog } = useConfirm();
  const [draft, setDraft] = useState<LandingMediaMap>(() => ({ ...defaultLandingMedia }));
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<LandingMediaSlot | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    void (async () => {
      const media = await fetchLandingMedia();
      setDraft(media);
      try {
        const res = await fetch("/api/landing-media", { cache: "no-store" });
        const json = (await res.json()) as { source?: string };
        setSource(json.source ?? "");
      } catch {
        setSource("");
      }
    })();
  }, []);

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const slots = LANDING_MEDIA_SLOTS.filter(
      (s) => !q || s.label.toLowerCase().includes(q) || s.key.includes(q) || s.group.toLowerCase().includes(q)
    );
    const map = new Map<string, typeof slots>();
    for (const slot of slots) {
      const list = map.get(slot.group) ?? [];
      list.push(slot);
      map.set(slot.group, list);
    }
    return [...map.entries()];
  }, [filter]);

  function setSlot(key: LandingMediaSlot, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function doSave() {
    askSave({
      editing: true,
      entityLabel: "landing images",
      onConfirm: () => {
        void (async () => {
          try {
            setError("");
            const media = await saveLandingMedia(mergeLandingMedia(draft));
            setDraft(media);
            setStatus("Landing images saved. Public site will use the new images.");
          } catch (e) {
            setStatus("");
            setError(e instanceof Error ? e.message : "Save failed");
          }
        })();
      }
    });
  }

  function doReset() {
    ask({
      title: "Reset landing images?",
      message: "Restore every slot to the built-in default PublicImages / marketing paths.",
      confirmLabel: "Reset to defaults",
      onConfirm: () => {
        void (async () => {
          try {
            setError("");
            const media = await resetLandingMedia();
            setDraft(media);
            setStatus("Reset to defaults.");
          } catch (e) {
            setStatus("");
            setError(e instanceof Error ? e.message : "Reset failed");
          }
        })();
      }
    });
  }

  async function onUpload(slot: LandingMediaSlot, file: File | null) {
    if (!file || !canUpdate) return;
    setUploading(slot);
    setError("");
    try {
      const url = await uploadLandingMediaImage(file);
      setSlot(slot, url);
      setStatus(`Uploaded for ${slot}. Click Save to publish.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  if (!allowed) {
    return (
      <AppShell activeModule="settings">
        <ModuleBreadcrumbs />
        <PageHeader title="Landing images" description="You do not have access to this page." />
        <AdminSubnav active="/settings/landing-images" />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Landing images"
        description="Update homepage and product marketing screenshots without changing code. Changes apply to the public site after Save."
      />
      <AdminSubnav active="/settings/landing-images" />
      {dialog}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {canUpdate ? (
          <>
            <Button onClick={doSave}>Save images</Button>
            <Button variant="secondary" onClick={doReset}>
              <RotateCcw className="size-4" />
              Reset to defaults
            </Button>
          </>
        ) : null}
        {source ? <p className="text-xs text-slate-500">Source: {source}</p> : null}
      </div>
      {status ? <p className="mb-3 text-sm font-semibold text-teal">{status}</p> : null}
      {error ? <p className="mb-3 text-sm font-semibold text-rose-600">{error}</p> : null}

      <Panel className="mb-5 p-4">
        <Field label="Filter slots">
          <TextInput value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="hero, CRM, testimonials…" />
        </Field>
      </Panel>

      <div className="space-y-6">
        {groups.map(([group, slots]) => (
          <section key={group}>
            <h2 className="mb-3 text-lg font-bold text-ink">{group}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {slots.map((slot) => (
                <Panel key={slot.key} className="p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--bs-radius)] bg-cloud text-teal">
                      <ImageIcon className="size-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{slot.label}</p>
                      <p className="text-xs text-slate-500">{slot.hint}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">{slot.key}</p>
                    </div>
                  </div>
                  <div className="mb-3 overflow-hidden rounded-[var(--bs-radius)] border border-line bg-cloud">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={draft[slot.key]} alt="" className="mx-auto max-h-40 w-full object-contain" />
                  </div>
                  <Field label="Image URL">
                    <TextInput
                      value={draft[slot.key]}
                      disabled={!canUpdate}
                      onChange={(e) => setSlot(slot.key, e.target.value)}
                      placeholder="/PublicImages/… or https://…"
                    />
                  </Field>
                  {canUpdate ? (
                    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-teal">
                      <Upload className="size-4" />
                      {uploading === slot.key ? "Uploading…" : "Upload image"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        disabled={uploading === slot.key}
                        onChange={(e) => void onUpload(slot.key, e.target.files?.[0] ?? null)}
                      />
                    </label>
                  ) : null}
                </Panel>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
