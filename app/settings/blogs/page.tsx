"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { RecordRowActions } from "@/components/common/record-row-actions";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Badge, Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId, getStoredUserEmail } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { filterAndSort } from "@/lib/list-query";
import { canMenu } from "@/modules/admin/services/acl.store";
import { deleteBlog, ensureProductionSiteContent, listBlogs, saveBlog, type BlogPost, type CmsStatus } from "@/modules/cms/services/cms.store";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";

const emptyForm = {
  title: "",
  excerpt: "",
  content: "",
  coverEmoji: "📰",
  coverImage: "",
  author: "",
  status: "draft" as CmsStatus,
  tags: ""
};

export default function AdminBlogsPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const actor = getSessionProfile();
  const allowed = canMenu(actor.role, actor.email, "settings.blogs", "view");
  const { askSave, askTrash, dialog } = useConfirm();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [extraJson, setExtraJson] = useState("");

  function refresh() {
    setPosts(listBlogs(true));
  }

  useEffect(() => {
    ensureProductionSiteContent();
    refresh();
    const email = getStoredUserEmail();
    if (email) setForm((f) => ({ ...f, author: f.author || email.split("@")[0] }));
  }, []);

  const filtered = useMemo(
    () =>
      filterAndSort(posts as unknown as Array<Record<string, unknown>>, {
        search,
        searchFields: ["title", "excerpt", "author"],
        statusField: "status",
        statusValue: statusFilter,
        sortField,
        sortDir
      }) as unknown as BlogPost[],
    [posts, search, statusFilter, sortField, sortDir]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, author: getStoredUserEmail()?.split("@")[0] || "Admin" });
    setExtraJson("");
    setError("");
    setOpen(true);
  }

  function openEdit(post: BlogPost) {
    setEditing(post);
    setForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverEmoji: post.coverEmoji,
      coverImage: post.coverImage ?? "",
      author: post.author,
      status: post.status,
      tags: post.tags.join(", ")
    });
    setExtraJson(getExtraFieldValues(tenantId, "settings.blog", post.id));
    setError("");
    setOpen(true);
  }

  function doSave() {
    setError("");
    try {
      const row = saveBlog({
        id: editing?.id,
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        coverEmoji: form.coverEmoji,
        coverImage: form.coverImage.trim() || undefined,
        author: form.author,
        status: form.status,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean)
      });
      persistExtraFields(tenantId, "settings.blog", row.id, extraJson);
      setExtraJson("");
      setOpen(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editing),
      entityLabel: "blog post",
      onConfirm: doSave
    });
  }

  if (!allowed) {
    return (
      <AppShell activeModule="settings">
        <AdminSubnav active="/settings/blogs" />
        <PageHeader title="Blogs" description="Public blog publishing is a platform Super Admin tool. It is not included in a company package." />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader title="Blogs" description="Create and publish public blog posts from Administration." actionLabel="New post" onAction={openCreate} />
      <AdminSubnav active="/settings/blogs" />

      <DataListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search posts…"
        filterLabel="statuses"
        filterValue={statusFilter}
        filterOptions={[
          { value: "draft", label: "draft" },
          { value: "published", label: "published" }
        ]}
        onFilterChange={setStatusFilter}
        sortValue={sortField}
        sortOptions={[
          { value: "title", label: "Title" },
          { value: "author", label: "Author" },
          { value: "status", label: "Status" }
        ]}
        onSortChange={setSortField}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
        onExportCsv={() =>
          exportListCsv({
            tenantId,
            module: "settings",
            filename: "blogs",
            rows: filtered.map((p) => ({
              Title: p.title,
              Author: p.author,
              Status: p.status,
              Tags: p.tags.join(", ")
            }))
          })
        }
        onExportPdf={() =>
          exportListPdf({
            tenantId,
            module: "settings",
            title: "Blogs",
            filename: "blogs",
            columns: ["Title", "Author", "Status"],
            rows: filtered.map((p) => [p.title, p.author, p.status])
          })
        }
        rightSlot={<Button onClick={openCreate}>New post</Button>}
      />

      {open ? (
        <Panel className="mb-5 p-5">
          <h2 className="mb-4 text-lg font-bold text-ink">{editing ? "Edit post" : "New blog post"}</h2>
          <form onSubmit={onSave} className="grid gap-4 md:grid-cols-2">
            {error ? <p className="md:col-span-2 text-sm text-[color:var(--bs-coral)]">{error}</p> : null}
            <Field label="Title" className="md:col-span-2"><TextInput required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Excerpt" className="md:col-span-2"><TextInput required value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></Field>
            <Field label="Cover emoji"><TextInput value={form.coverEmoji} onChange={(e) => setForm({ ...form, coverEmoji: e.target.value })} /></Field>
            <Field label="Cover image URL" className="md:col-span-2"><TextInput value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Author"><TextInput required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CmsStatus })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </SelectInput>
            </Field>
            <Field label="Tags (comma separated)"><TextInput value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
            <Field label="Content" className="md:col-span-2"><TextArea required rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field>
            <ExtraFieldsBlock formKey="settings.blog" valueJson={extraJson} onChange={setExtraJson} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Save post</Button>
              <Button type="button" variant="secondary" onClick={() => { setExtraJson(""); setOpen(false); }}>Cancel</Button>
              {editing?.status === "published" ? <Link href={`/blog/${editing.slug}`} className="ml-auto"><Button type="button" variant="ghost">View public</Button></Link> : null}
            </div>
          </form>
        </Panel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((post) => (
          <Panel key={post.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl">{post.coverEmoji}</p>
                <h3 className="mt-2 font-bold text-ink">{post.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{post.excerpt}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={post.status} />
                  {post.tags.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
                </div>
                <ExtraFieldsReadout tenantId={tenantId} formKey="settings.blog" recordId={post.id} />
              </div>
            </div>
            <div className="mt-4">
              <RecordRowActions
                onEdit={() => openEdit(post)}
                onTrash={() =>
                  askTrash({
                    entityLabel: "blog post",
                    name: post.title,
                    onConfirm: () => {
                      deleteBlog(post.id);
                      refresh();
                    }
                  })
                }
              />
            </div>
          </Panel>
        ))}
      </div>

      {dialog}
    </AppShell>
  );
}
